import { isLowPower } from '../perf';
import { isScrolling } from './scrolling';
/**
 * Fog with real airflow (F-54): a small 2D fluid simulation behind the scene. The pointer is a hand moving through
 * mist: it pushes the air, the air stays incompressible (so it flows around and curls), small swirls are kept alive,
 * and the fog is carried along by it, then slowly settles back into its resting shape. 2D, with depth only as an
 * illusion: the mist lies low, denser toward the horizon, its texture finer with distance.
 *
 * Cheap by design: the simulation runs on a grid about 128 cells wide, the fog is drawn at half the screen's size
 * and scaled up (it is soft), at 30 frames a second (20 on low-power devices), only while visible.
 */

const VERT = `#version 300 es
in vec2 a; out vec2 uv;
void main() { uv = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`;

const HEAD = `#version 300 es
precision highp float; precision highp sampler2D;
in vec2 uv; out vec4 o;
`;

/** Semi-Lagrangian advection: each cell takes what the flow carried from upstream. */
const ADVECT = HEAD + `uniform sampler2D uVel, uSrc; uniform vec2 uTexel; uniform float uDt, uKeep;
void main() { vec2 back = uv - uDt * texture(uVel, uv).xy * uTexel; o = uKeep * texture(uSrc, back); }`;

/**
 * The hand's push (F-56): a thin streak along the path the pointer travelled this frame (not a round patch), its
 * edge ragged with noise, strongest behind the hand and fading toward where it started.
 */
const SPLAT = HEAD + `uniform sampler2D uSrc, uNoise; uniform vec2 uFrom, uTo; uniform vec3 uAdd; uniform float uWidth, uAspect, uTime;
void main() {
  vec2 a = uFrom, b = uTo, p = uv;
  a.x *= uAspect; b.x *= uAspect; p.x *= uAspect;
  vec2 ab = b - a; float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  float dist = length(p - a - ab * h);
  float rag = texture(uNoise, uv * vec2(uAspect, 1.0) * 9.0 + uTime * 0.05).z;   // uneven, like real air
  float w = uWidth * (0.55 + rag * 0.9);
  float k = exp(-dist * dist / (w * w)) * (0.35 + 0.65 * h);
  o = texture(uSrc, uv) + vec4(uAdd * k, 0.0);
}`;

const CURL = HEAD + `uniform sampler2D uVel; uniform vec2 uTexel;
void main() {
  float l = texture(uVel, uv - vec2(uTexel.x, 0)).y, r = texture(uVel, uv + vec2(uTexel.x, 0)).y;
  float b = texture(uVel, uv - vec2(0, uTexel.y)).x, t = texture(uVel, uv + vec2(0, uTexel.y)).x;
  o = vec4(0.5 * (r - l - t + b), 0, 0, 1);
}`;

/** Vorticity confinement: keeps the small swirls a hand leaves in mist from smearing away. */
const VORTICITY = HEAD + `uniform sampler2D uVel, uCurl; uniform vec2 uTexel; uniform float uStrength, uDt;
void main() {
  float l = abs(texture(uCurl, uv - vec2(uTexel.x, 0)).x), r = abs(texture(uCurl, uv + vec2(uTexel.x, 0)).x);
  float b = abs(texture(uCurl, uv - vec2(0, uTexel.y)).x), t = abs(texture(uCurl, uv + vec2(0, uTexel.y)).x);
  float c = texture(uCurl, uv).x;
  vec2 f = vec2(t - b, r - l); f /= length(f) + 1e-4; f *= uStrength * c * vec2(1, -1);
  o = vec4(texture(uVel, uv).xy + f * uDt, 0, 1);
}`;

const DIVERGENCE = HEAD + `uniform sampler2D uVel; uniform vec2 uTexel;
void main() {
  float l = texture(uVel, uv - vec2(uTexel.x, 0)).x, r = texture(uVel, uv + vec2(uTexel.x, 0)).x;
  float b = texture(uVel, uv - vec2(0, uTexel.y)).y, t = texture(uVel, uv + vec2(0, uTexel.y)).y;
  o = vec4(0.5 * (r - l + t - b), 0, 0, 1);
}`;

const PRESSURE = HEAD + `uniform sampler2D uP, uDiv; uniform vec2 uTexel;
void main() {
  float l = texture(uP, uv - vec2(uTexel.x, 0)).x, r = texture(uP, uv + vec2(uTexel.x, 0)).x;
  float b = texture(uP, uv - vec2(0, uTexel.y)).x, t = texture(uP, uv + vec2(0, uTexel.y)).x;
  o = vec4((l + r + b + t - texture(uDiv, uv).x) * 0.25, 0, 0, 1);
}`;

/** Removes what would compress the air, so it flows around instead. Plus a slow, wandering breeze. */
const PROJECT = HEAD + `uniform sampler2D uVel, uP, uNoise; uniform vec2 uTexel; uniform float uTime;
void main() {
  float l = texture(uP, uv - vec2(uTexel.x, 0)).x, r = texture(uP, uv + vec2(uTexel.x, 0)).x;
  float b = texture(uP, uv - vec2(0, uTexel.y)).x, t = texture(uP, uv + vec2(0, uTexel.y)).x;
  vec2 v = texture(uVel, uv).xy - 0.5 * vec2(r - l, t - b);
  vec2 breeze = (texture(uNoise, uv * 0.6 + vec2(uTime * 0.004, 0.0)).xy - 0.5) * vec2(1.2, 0.4) + vec2(0.35, 0.0);
  o = vec4(mix(v, breeze, 0.012), 0, 1);
}`;

/**
 * The fog itself: carried by the air, and slowly settling back toward its resting shape: a low bank of mist lying
 * toward the horizon, its billows drifting. Perspective is an illusion: the texture is finer near the horizon.
 */
const FOG = HEAD + `uniform sampler2D uVel, uFog, uNoise; uniform vec2 uTexel; uniform float uDt, uTime, uHorizon, uAspect;
float rest(vec2 p) {
  float below = p.y < uHorizon ? (uHorizon - p.y) / uHorizon : 0.0;      // 0 at the horizon, 1 at the bottom
  float depth = 1.0 / (below + 0.08);                                     // far near the horizon
  vec2 q = vec2((p.x - 0.5) * uAspect * depth * 0.22 + uTime * 0.006, depth * 0.11 - uTime * 0.002);
  // Its shapes morph as they drift, never just sliding (F-82): the field is bent by a slower noise of its own.
  q += (texture(uNoise, q * 0.35 + vec2(uTime * 0.0021, -uTime * 0.0017)).xy - 0.5) * 0.35;
  float n = texture(uNoise, q).z * 0.65 + texture(uNoise, q * 2.3 + 0.4).z * 0.35;
  float band = smoothstep(0.0, 0.1, below) * (1.0 - smoothstep(0.35, 0.95, below)) + exp(-max(p.y - uHorizon, 0.0) * 12.0) * 0.35;
  return band * smoothstep(0.35, 0.75, n);
}
void main() {
  vec2 back = uv - uDt * texture(uVel, uv).xy * uTexel;
  float f = texture(uFog, back).x;
  o = vec4(mix(f, rest(uv), 0.015), 0, 0, 1);
}`;

/** Draws the fog: soft, with a fine grain of detail so it reads as mist, not a smear. */
const DRAW = HEAD + `uniform sampler2D uFog, uNoise; uniform vec3 uMist; uniform vec3 uBack; uniform float uTime, uAspect;

// Light from the top (F-57, F-72, F-74, F-76): sunlight mixed with white, from a source just above the top edge
// where the logo is, lighting the mist the way real light does, and subtle. Layers, each wider and dimmer than the
// last (core, halo, bloom, haze), thin into the dark with no edge and reach only a little way down. A few soft
// shafts fall from it, each its own direction, width and brightness, wavering and broken along their length as mist
// drifts through them (never a fan of straight, ruled lines), and they show mostly where there is mist to scatter
// them, so the fog gives the light its depth. Tone-mapped, never flat white.
vec3 topLight(vec2 p, float mist) {
  vec2 s = vec2(0.5 + 0.025 * sin(uTime * 0.05), 1.04);
  vec2 d = vec2((p.x - s.x) * uAspect, p.y - s.y);           // in screen heights from the source
  float r = length(d);
  float wave = (texture(uNoise, vec2(r * 0.9 - uTime * 0.004, 0.27)).y - 0.5) * 0.35;
  float ang = atan(d.x, -d.y) + wave * r;                     // 0 straight down; the shafts waver as they fall
  float glow = exp(-r / 0.03) * 0.85 + exp(-r / 0.085) * 0.36 + exp(-r / 0.21) * 0.26 + exp(-r / 0.45) * 0.1;
  // A faint band of sky-light along the whole top edge: about even at the left and right, stronger in the middle.
  float across = (p.x - 0.5) * uAspect;
  glow += exp(-(1.0 - p.y) / 0.09) * (0.3 + 0.7 * exp(-across * across / 0.5)) * 0.16;
  float n1 = texture(uNoise, vec2(ang * 0.5 + uTime * 0.0015, 0.13 + uTime * 0.002)).x;
  float n2 = texture(uNoise, vec2(ang * 1.1 - uTime * 0.0025, 0.61)).y;
  float rays = smoothstep(0.45, 0.95, n1 * 0.7 + n2 * 0.3);
  float broken = 0.25 + 0.75 * texture(uNoise, vec2(ang * 0.7 + 0.3, r * 2.2 - uTime * 0.01)).z;
  float shafts = rays * broken * smoothstep(1.1, 0.1, abs(ang)) * exp(-r * 2.6);
  float scatter = 0.55 + 1.0 * mist;   // the air scatters a little; mist far more
  float breath = 0.95 + 0.05 * sin(uTime * 0.4);
  vec3 sun = vec3(1.0, 0.92, 0.78);                          // sunlight mixed with white: not pure white, not orange
  vec3 col = mix(sun, vec3(1.0), 0.35) * glow * (0.75 + 0.4 * mist) + sun * shafts * 0.9 * scatter;
  return (1.0 - exp(-col * 1.5)) * 0.85 * breath;
}

void main() {
  float f = texture(uFog, uv).x;
  float grain = texture(uNoise, uv * vec2(uAspect, 1.0) * 3.0 + vec2(uTime * 0.01, 0.0)).z;
  float a = clamp(f * (0.75 + grain * 0.5), 0.0, 1.0);
  vec3 col = mix(uBack, uMist, a * 0.46);
  col += topLight(uv, a);
  o = vec4(col, 1.0);
}`;

/** A tileable noise texture (three channels: two for the breeze, one for the fog's shape), made once. */
function noiseTexture(gl: WebGL2RenderingContext, seed: number, N = 256): WebGLTexture {
  const L = 16;
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const lattices = [0, 1, 2].map(() => Float32Array.from({ length: L * L }, rand));
  const sm = (t: number) => t * t * (3 - 2 * t);
  const sample = (lat: Float32Array, x: number, y: number, period: number) => {
    const fx = x * period, fy = y * period, ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy);
    const at = (i: number, j: number) => lat[(((j % period) + period) % period) * L + (((i % period) + period) % period)]!;
    return (1 - ty) * ((1 - tx) * at(ix, iy) + tx * at(ix + 1, iy)) + ty * ((1 - tx) * at(ix, iy + 1) + tx * at(ix + 1, iy + 1));
  };
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, k = (y * N + x) * 4;
    for (let c = 0; c < 3; c++) {
      const val = sample(lattices[c]!, u, v, 4) * 0.55 + sample(lattices[c]!, u, v, 8) * 0.3 + sample(lattices[c]!, u, v, 16) * 0.15;
      data[k + c] = Math.round(val * 255);
    }
    data[k + 3] = 255;
  }
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return t;
}

export interface Fog {
  /** The pointer moved to (x, y) in viewport px. */
  move(x: number, y: number): void;
  destroy(): void;
}

/** Starts the fog on a canvas; null without WebGL2 and float render targets (the plain stage shows instead). */
export function createFog(canvas: HTMLCanvasElement, opts: { still: boolean; low: boolean }): Fog | null {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl || gl.isContextLost() || !gl.getExtension('EXT_color_buffer_float')) return null;
  gl.getExtension('OES_texture_float_linear');

  const compile = (frag: string) => {
    const p = gl.createProgram()!;
    for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, frag]] as const) {
      const sh = gl.createShader(type)!; gl.shaderSource(sh, src); gl.compileShader(sh); gl.attachShader(p, sh);
    }
    gl.bindAttribLocation(p, 0, 'a');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
    const u: Record<string, WebGLUniformLocation | null> = {};
    return { p, u: (n: string) => (u[n] ??= gl.getUniformLocation(p, n)) };
  };
  let P: Record<string, ReturnType<typeof compile>>;
  try {
    P = { advect: compile(ADVECT), splat: compile(SPLAT), curl: compile(CURL), vort: compile(VORTICITY), div: compile(DIVERGENCE), press: compile(PRESSURE), proj: compile(PROJECT), fog: compile(FOG), draw: compile(DRAW) };
  } catch { return null; }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.activeTexture(gl.TEXTURE3);
  // Every visit its own fog (F-82): a fresh seed for its shapes, and a clock that starts somewhere else.
  const noise = noiseTexture(gl, 1 + Math.floor(Math.random() * 2147483645));

  type Target = { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number };
  const target = (w: number, h: number): Target => {
    const tex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb, w, h };
  };
  const pair = (w: number, h: number) => { let a = target(w, h), b = target(w, h); return { get read() { return a; }, get write() { return b; }, swap() { [a, b] = [b, a]; } }; };

  let simW = 0, simH = 0, vel!: ReturnType<typeof pair>, fog!: ReturnType<typeof pair>, press!: ReturnType<typeof pair>, div!: Target, curl!: Target;
  const setup = () => {
    const aspect = innerWidth / Math.max(1, innerHeight);
    const w = opts.low ? 96 : 128, h = Math.max(16, Math.round(w / aspect));
    if (w === simW && h === simH) return;
    simW = w; simH = h;
    vel = pair(w, h); press = pair(w, h); div = target(w, h); curl = target(w, h);
    fog = pair(w * 2, h * 2);
  };

  const run = (prog: ReturnType<typeof compile>, out: Target | null, inputs: Record<string, WebGLTexture>, set?: (u: (n: string) => WebGLUniformLocation | null) => void) => {
    gl.useProgram(prog.p);
    let unit = 0;
    for (const [name, tex] of Object.entries(inputs)) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(prog.u(name), unit++); }
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, noise); gl.uniform1i(prog.u('uNoise'), unit);
    set?.(prog.u);
    if (out) { gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb); gl.viewport(0, 0, out.w, out.h); }
    else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  let px = -1, py = -1, lx = -1, ly = -1;
  let frame = 0, last = 0;
  const start = performance.now() - Math.random() * 600_000;
  const fps = opts.low ? 20 : 30;

  const step = (now: number) => {
    setup();
    const w = Math.max(1, Math.round(innerWidth * 0.5)), h = Math.max(1, Math.round(innerHeight * 0.5));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const t = (now - start) / 1000, dt = 1;
    const texel = [1 / simW, 1 / simH] as const, aspect = innerWidth / Math.max(1, innerHeight);
    if (!opts.still) {
      // The hand: air pushed along the way the pointer moved.
      if (lx >= 0 && (px !== lx || py !== ly)) {
        // A hand, not a fan: the push follows the pointer's motion, but a fast flick is capped (F-55).
        let dx = (px - lx) / innerWidth, dy = (ly - py) / innerHeight;
        const len = Math.hypot(dx, dy), cap = 0.01;
        if (len > cap) { dx *= cap / len; dy *= cap / len; }
        const force = Math.min(1, Math.hypot(dx, dy) / cap);
        run(P.splat!, vel.write, { uSrc: vel.read.tex }, u => {
          gl.uniform2f(u('uFrom'), lx / innerWidth, 1 - ly / innerHeight);
          gl.uniform2f(u('uTo'), px / innerWidth, 1 - py / innerHeight);
          gl.uniform3f(u('uAdd'), dx * 70, dy * 70, 0);
          gl.uniform1f(u('uWidth'), 0.012 + force * 0.008); // a narrow trail, a few fingers wide
          gl.uniform1f(u('uAspect'), aspect); gl.uniform1f(u('uTime'), t);
        });
        vel.swap();
      }
      lx = px; ly = py;
      run(P.curl!, curl, { uVel: vel.read.tex }, u => gl.uniform2f(u('uTexel'), ...texel));
      run(P.vort!, vel.write, { uVel: vel.read.tex, uCurl: curl.tex }, u => { gl.uniform2f(u('uTexel'), ...texel); gl.uniform1f(u('uStrength'), 2) /* a little: real air curls, but not into tidy circles */; gl.uniform1f(u('uDt'), 0.016); });
      vel.swap();
      run(P.div!, div, { uVel: vel.read.tex }, u => gl.uniform2f(u('uTexel'), ...texel));
      for (let i = 0; i < (opts.low ? 10 : 16); i++) {
        run(P.press!, press.write, { uP: press.read.tex, uDiv: div.tex }, u => gl.uniform2f(u('uTexel'), ...texel));
        press.swap();
      }
      run(P.proj!, vel.write, { uVel: vel.read.tex, uP: press.read.tex }, u => { gl.uniform2f(u('uTexel'), ...texel); gl.uniform1f(u('uTime'), t); });
      vel.swap();
      run(P.advect!, vel.write, { uVel: vel.read.tex, uSrc: vel.read.tex }, u => { gl.uniform2f(u('uTexel'), ...texel); gl.uniform1f(u('uDt'), dt); gl.uniform1f(u('uKeep'), 0.95); });
      vel.swap();
    }
    run(P.fog!, fog.write, { uVel: vel.read.tex, uFog: fog.read.tex }, u => { gl.uniform2f(u('uTexel'), ...texel); gl.uniform1f(u('uDt'), opts.still ? 0 : dt); gl.uniform1f(u('uTime'), opts.still ? 0 : t); gl.uniform1f(u('uHorizon'), 0.56); gl.uniform1f(u('uAspect'), aspect); });
    fog.swap();
    run(P.draw!, null, { uFog: fog.read.tex }, u => {
      gl.uniform3fv(u('uMist'), [0.62, 0.66, 0.74]);
      gl.uniform3fv(u('uBack'), [0, 0, 0]);
      gl.uniform1f(u('uTime'), opts.still ? 0 : t); gl.uniform1f(u('uAspect'), aspect);
    });
  };

  // Settle the resting fog before the first paint, so it never starts empty.
  for (let i = 0; i < 90; i++) step(start);
  const tick = (now: number) => {
    frame = 0;
    if (document.hidden) return;
    // On a low-power device the air holds still while the page scrolls (F-118): the frame goes to the move.
    if (now - last >= 1000 / fps - 2 && !(isLowPower() && isScrolling())) { last = now; step(now); }
    if (!opts.still) frame = requestAnimationFrame(tick);
  };
  const wake = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(tick); };
  document.addEventListener('visibilitychange', wake);
  addEventListener('resize', wake);
  wake();

  return {
    move(x, y) { px = x; py = y; if (lx < 0) { lx = x; ly = y; } },
    // Stops drawing only: React may mount the same canvas again.
    destroy() { cancelAnimationFrame(frame); frame = 0; document.removeEventListener('visibilitychange', wake); removeEventListener('resize', wake); },
  };
}
