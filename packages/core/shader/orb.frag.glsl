#version 300 es
// Talking Marble orb. MIT, (c) Justin Liao.
// A lit sphere of flowing pigment on one quad:
// - Pigment: domain-warped fBm, q = fbm(p), r = fbm(p + q) (Quilez, "Domain Warping").
// - Globe: analytic sphere; normal (x, y, sqrt(1 - x^2 - y^2)); edge antialiased with fwidth.
// - Water: the pattern rolls in swells, ripples out or in from the centre, drains in a whirlpool or turns choppy.
// - Search: a lens magnifies the centre and the pattern streams out of it, with a ping of light travelling outward.
// - Output: ACES filmic fit (Narkowicz), sRGB encode, interleaved gradient noise dither (Jimenez 2014).
// One material in every state: states change only energy, motion and brightness (core/spec.md).
// With every uniform at its resting value (spec.md › Parameters) this is the reference orb: the original's
// pigment and form under softer white light (F-104), so the pattern and its veins read through a subtle glow.
// Uniforms are defined in core/spec.md › Uniforms. Colors arrive in linear light.
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform float uTime;        // seconds of flow, already scaled by speed
uniform float uSwirl;       // extra flow the voice has run ahead
uniform float uSpin;        // radians the pattern has turned about the vertical axis
uniform float uLevel;       // 0..1, smoothed voice level after reactivity
uniform float uWarp;        // pigment fold depth, 2.2 at rest
uniform float uVoiceWarp;   // extra fold depth at full voice
uniform float uVoiceBright; // extra light at full voice
uniform float uScale;       // pattern scale, 1.2 at rest (larger is finer veins)
uniform float uSoftness;    // vein edge width multiplier, 1 at rest
uniform float uDetail;      // fine detail 0..1, 0.5 at rest
uniform float uGrain;       // film grain amount, 1 at rest
uniform float uContrast;    // 1 at rest; small sizes raise it a little
uniform float uGlow;        // light from within, 0 at rest
uniform float uBrightness;  // overall light, 1 at rest
uniform float uWaveAmp;     // swells rolling across
uniform float uWaveFreq;
uniform float uWaveTime;
uniform float uWaveAngle;   // radians
uniform float uRippleAmp;   // rings travelling out (or in)
uniform float uRippleFreq;
uniform float uRipplePhase;
uniform float uVortex;      // whirlpool twist toward the centre
uniform float uChop;        // short crossing waves
uniform float uScan;        // search: the pattern streams out of a magnified centre
uniform float uScanPhase;   // the search's clock
uniform vec3 uBase;         // ground, linear
uniform vec3 uColor1;       // pigments, linear
uniform vec3 uColor2;
uniform vec3 uColor3;

float hash(vec3 p) { p = fract(p * .1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
const mat3 ROT = mat3(.00,.80,.60, -.80,.36,-.48, -.60,-.48,.64);
// Each octave is k of the last: detail .5 gives .38 (the original); lower is smoother, higher is richer.
float fbm(vec3 p) {
  float result = 0.0, amplitude = .62, k = mix(.2, .56, uDetail);
  for (int i = 0; i < 3; i++) { result += noise(p) * amplitude; p = ROT * p * 2.03 + 7.19; amplitude *= k; }
  return result;
}
// A vein's edge: at softness 1 these are the original's smoothstep bounds.
float vein(float v, float center, float width) { float w = width * uSoftness; return smoothstep(center - w, center + w, v); }
vec3 pigment(vec3 p, float t, float warp) {
  vec3 drift = vec3(sin(t * .73), cos(t * .57), sin(t * .41)) * .38;
  vec3 q = vec3(fbm(p + drift + vec3(t * .19, 0, 0)), fbm(p + vec3(4.7, 1.3, 8.1) - drift), fbm(p + vec3(9.2, 5.8, 2.3) + vec3(0, t * .23, 0)));
  vec3 r = p + (q - .45) * warp;
  float a = fbm(r + vec3(0, 0, t * .24));
  float b = fbm(r * 1.14 + vec3(6.2, -t * .21, 3.5));
  float c = fbm(r * .83 + vec3(t * .16, 8.4, 1.9));
  vec3 color = mix(uBase, uColor1, vein(a, .49, .16) * .95);
  color = mix(color, uColor2, vein(b, .56, .13) * .9);
  return mix(color, uColor3, vein(c, .585, .115) * .86);
}
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0.0, 1.0); }
vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - .055, step(.0031308, c)); }
float ign(vec2 pixel) { return fract(52.9829189 * fract(dot(pixel, vec2(.06711056, .00583715)))); }

void main() {
  float radius = length(vUv);
  float edge = fwidth(radius) * 1.25;
  float coverage = 1.0 - smoothstep(.985 - edge, .985 + edge, radius);
  if (coverage <= 0.0) { outColor = vec4(0); return; }
  vec2 uv = vUv / .985;
  vec3 n = normalize(vec3(uv, sqrt(max(0.0, 1.0 - dot(uv, uv)))));
  float t = uTime * 1.1 + uSwirl;

  // The pattern's own coordinates: turned, then moved like water.
  float cs = cos(uSpin), sn = sin(uSpin);
  vec3 q = vec3(cs * n.x + sn * n.z, n.y, -sn * n.x + cs * n.z);
  float ang = uVortex * (1.15 - length(q.xy));                       // whirlpool: more twist toward the centre
  q.xy = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * q.xy;
  vec2 dir = vec2(cos(uWaveAngle), sin(uWaveAngle));                // swells rolling across
  float along = dot(q.xy, dir);
  q.xy += dir * uWaveAmp * sin(along * uWaveFreq * 3.1416 - uWaveTime);
  q.z += uWaveAmp * .6 * cos(along * uWaveFreq * 3.1416 - uWaveTime);
  q.xy *= 1.0 + uRippleAmp * sin(length(q.xy) * uRippleFreq * 3.1416 - uRipplePhase); // rings out or in
  q += uChop * .09 * (sin(q.yzx * 6.3 + t * 3.1) + .6 * sin(q.zxy * 9.7 - t * 4.3));  // chop
  float sr = length(q.xy);                                            // search:
  q.xy *= 1.0 - uScan * .42 * exp(-sr * sr * 4.5);                    //   a lens magnifies the centre
  q.z += uScan * (sr * 2.4 - uScanPhase);                             //   each ring of the pattern moves outward

  vec3 color = pigment(q * uScale, t, uWarp + uLevel * uVoiceWarp);
  vec3 key = normalize(vec3(-.65, .8, 1.2));
  float diffuse = max(dot(n, key), 0.0);
  float rim = pow(1.0 - max(n.z, 0.0), 3.0);
  vec3 reflected = reflect(vec3(0, 0, -1), n);
  float softbox = pow(max(dot(reflected, key), 0.0), 22.0);
  float ribbon = exp(-pow((reflected.x + .57) * 8.0, 2.0) - pow((reflected.y - .48) * 2.4, 2.0));
  float back = pow(max(dot(n, normalize(vec3(.9, -.25, .2))), 0.0), 6.0);
  // Softer than the original (F-104; was .48 + .62 diffuse, softbox .65, ribbon .23, rim .22 + .34 back).
  vec3 lit = color * (.38 + diffuse * .56);
  lit += color * uGlow * (1.0 - rim) * (.6 + .4 * n.z);              // a little light from within
  lit += vec3(1.0, .97, .92) * (softbox * .38 + ribbon * .12);
  lit += mix(vec3(.83, .91, 1.0), uColor3, .22) * rim * (.15 + back * .24);
  lit += uColor1 * back * .075;
  float ping = fract(uScanPhase * .42);                              // a ping of light travels out from the centre
  lit *= 1.0 + uScan * .16 * (1.0 - ping) * exp(-pow((length(uv) - ping * 1.15) * 9.0, 2.0));
  lit *= uBrightness * (1.0 + uLevel * uVoiceBright);
  // Fine stationary film grain gives the pigment its tactile, in-focus surface.
  lit += (hash(vec3(gl_FragCoord.xy, 19.7)) - .5) * .045 * uGrain;
  vec3 mapped = aces(lit);
  if (uContrast != 1.0) mapped = clamp((mapped - .5) * uContrast + .5, 0.0, 1.0);
  vec3 display = srgb(mapped) + (ign(gl_FragCoord.xy) - .5) / 255.0;
  outColor = vec4(display * coverage, coverage);
}
