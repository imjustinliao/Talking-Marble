#version 300 es
// Talking Marble orb. MIT, (c) Justin Liao.
// A lit sphere of flowing pigment on one quad:
// - Pigment: domain-warped fBm, q = fbm(p), r = fbm(p + q) (Quilez, "Domain Warping").
// - Globe: analytic sphere; normal (x, y, sqrt(1 - x^2 - y^2)); edge antialiased with fwidth.
// - Output: ACES filmic fit (Narkowicz), sRGB encode, interleaved gradient noise dither (Jimenez 2014).
// Uniforms are defined in packages/core/spec.md. Colors arrive in linear light.
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform float uTime;        // seconds of flow, already scaled by flow and energy
uniform float uEnergy;      // 0..1, eased
uniform float uLevel;       // 0..1, eased audio level after levelResponse
uniform float uSwirl;       // extra flow the voice has run ahead
uniform float uWarp;        // pigment fold depth, 2.2 at rest
uniform float uBrightness;  // 1 at rest
uniform float uSaturation;  // 1 at rest
uniform float uTintAmount;  // 0..1
uniform vec3 uTint;         // linear
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
float fbm(vec3 p) {
  float result = 0.0, amplitude = .62;
  for (int i = 0; i < 3; i++) { result += noise(p) * amplitude; p = ROT * p * 2.03 + 7.19; amplitude *= .38; }
  return result;
}
vec3 pigment(vec3 p, float t, float warp) {
  vec3 drift = vec3(sin(t * .73), cos(t * .57), sin(t * .41)) * .38;
  vec3 q = vec3(fbm(p + drift + vec3(t * .19, 0, 0)), fbm(p + vec3(4.7, 1.3, 8.1) - drift), fbm(p + vec3(9.2, 5.8, 2.3) + vec3(0, t * .23, 0)));
  vec3 r = p + (q - .45) * warp;
  float a = fbm(r + vec3(0, 0, t * .24));
  float b = fbm(r * 1.14 + vec3(6.2, -t * .21, 3.5));
  float c = fbm(r * .83 + vec3(t * .16, 8.4, 1.9));
  vec3 color = mix(uBase, uColor1, smoothstep(.33, .65, a) * .95);
  color = mix(color, uColor2, smoothstep(.43, .69, b) * .9);
  return mix(color, uColor3, smoothstep(.47, .70, c) * .86);
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
  vec3 color = pigment(n * 1.2, t, uWarp + uLevel * .9);
  color = mix(color, uTint, uTintAmount);
  vec3 key = normalize(vec3(-.65, .8, 1.2));
  float diffuse = max(dot(n, key), 0.0);
  float rim = pow(1.0 - max(n.z, 0.0), 3.0);
  vec3 reflected = reflect(vec3(0, 0, -1), n);
  float softbox = pow(max(dot(reflected, key), 0.0), 22.0);
  float ribbon = exp(-pow((reflected.x + .57) * 8.0, 2.0) - pow((reflected.y - .48) * 2.4, 2.0));
  float back = pow(max(dot(n, normalize(vec3(.9, -.25, .2))), 0.0), 6.0);
  vec3 lit = color * (.48 + diffuse * .62);
  lit += vec3(1.0, .97, .92) * (softbox * .65 + ribbon * .23);
  lit += mix(vec3(.83, .91, 1.0), uColor3, .22) * rim * (.22 + back * .34);
  lit += uColor1 * back * .075;
  lit *= uBrightness * (1.0 + uEnergy * .055 + uLevel * .14);
  // Fine stationary film grain gives the pigment its tactile, in-focus surface.
  lit += (hash(vec3(gl_FragCoord.xy, 19.7)) - .5) * .045;
  vec3 mapped = aces(lit);
  mapped = mix(vec3(dot(mapped, vec3(.2126, .7152, .0722))), mapped, uSaturation);
  vec3 display = srgb(mapped) + (ign(gl_FragCoord.xy) - .5) / 255.0;
  outColor = vec4(display * coverage, coverage);
}
