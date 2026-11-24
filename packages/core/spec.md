# Talking Marble core spec

The platform-neutral contract. Every port (web, SwiftUI, React Native, Compose, Flutter) reads the files in `packages/core/` and follows this spec, so the orb looks and moves the same everywhere. Changes here need the owner's approval.

## Files

| File | Holds |
|------|-------|
| `shader/orb.frag.glsl` | The orb, GLSL ES 3.0. Ports translate it line for line (Metal, SkSL/AGSL, Flutter fragment shaders). |
| `shader/orb.vert.glsl` | A full-screen quad: `vUv` from -1 to 1 across the orb's square. |
| `presets/palettes.json` | Named palettes: four sRGB hex colors each, ground then three pigments. |
| `presets/states.json` | `base` (every parameter's resting value: the reference orb) and the seven built-in `states`, each only the parameters it changes. |
| `presets/emotions.json` | The eight built-in emotions (`muted`, `happy`, `calm`, `excited`, `curious`, `surprised`, `concerned`, `sad`), which layer on a state. |

## One material

The marble's pigment, colors and lighting never change between states or emotions. A preset changes only energy (speed, folds, vein size), motion (the pattern moving like water, the whole marble moving) and brightness. `idle` is the reference orb exactly: every parameter at its `base` value gives the reference frame (the original orb's pigment and form under the softer light of F-104: less white highlight, sheen, rim and lift, so the pattern and its veins read through a subtle glow), pixel for pixel. The only way a preset changes color is its own `colors`.

## Colors

- A palette is exactly four colors: ground, pigment 1, pigment 2, pigment 3. Fewer are filled out with the ground; extra are dropped.
- Hex is sRGB. Convert to linear light before the shader: `c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ^ 2.4`.

## Parameters

A preset is plain data: any subset of these, plus optional `colors` (four hex colors, ground first) and `label` (a short name for assistive technology, e.g. "celebrating"). Values outside the range are clamped; non-finite numbers and invalid colors are ignored.

| Parameter | Range | Base | Meaning |
|-----------|-------|------|---------|
| `speed` | 0–4 | 1 | How fast the pigment flows |
| `turbulence` | 0–1 | 0.5 | How deeply it folds |
| `veins` | 0–1 | 0.5 | Vein size: higher is broader, lower is finer |
| `softness` | 0–1 | 0.5 | Vein edges: higher is hazier, lower is crisper |
| `detail` | 0–1 | 0.5 | Fine detail inside the veins |
| `spin` | −2–2 | 0 | Turning about the vertical axis (negative turns backwards) |
| `waves` | 0–1 | 0 | Swells rolling across the pattern |
| `ripples` | 0–1 | 0 | Rings travelling through the pattern |
| `rippleDirection` | `"out"` or `"in"` | `"out"` | Which way the rings (and a voice's rings) travel |
| `whirl` | 0–3 | 0 | A whirlpool twisting the pattern toward the centre |
| `chop` | 0–1 | 0 | Short crossing waves |
| `scan` | 0–1 | 0 | Searching: a lens magnifies the centre, the pattern streams out of it, and a ping of light travels outward |
| `glow` | 0–1 | 0 | Light from within |
| `brightness` | 0.5–1.5 | 1 | Overall light |
| `halo` | 0–1 | 0.5 | The halo's opacity at rest |
| `breath` | 0–1 | 0 | A slow swell of the whole marble |
| `beat` | 0–1.5 | 0 | A heartbeat: a double pulse of size, glow and brightness |
| `bounce` | 0–1 | 0 | The whole marble floats (low) or bounces (high) |
| `sway` | 0–1 | 0 | The whole marble rocks side to side |
| `wobble` | 0–1 | 0 | Jelly: the voice squashes and stretches the marble |
| `shake` | 0–1 | 0 | A short shake on entering the state (and on hard beats) |
| `size` | 0.5–1.2 | 1 | Size within its box (never changes layout) |
| `reactivity` | 0–1 | 0 | How strongly it answers audio; 0 ignores audio |

The halo is drawn softer than the original orb's (F-64, then F-104: two layers of light, pigment 2 at 0.4 and pigment 1 at 0.24 alpha, a little over half the original strength), and the component's `halo` prop scales it: `true` is 1, `false` 0, a number from 0 to 1.5 a strength.

### Resolution

1. **State**: `base`, then the built-in state's values, then the developer's preset of the same name. Unknown names resolve to `idle` (web: one console warning in development).
2. **Emotion** (optional): the built-in emotion's values, then the developer's preset of the same name. Every number it sets moves the state's value 65 % of the way toward it: `value = state + (emotion − state) × 0.65`. `rippleDirection` and `colors` take the emotion's when it sets them.
3. `colors`: the emotion's, else the state's, else the palette.

## Uniforms

Each frame derives the shader's uniforms from the eased parameters (`k` is the small-size factor, below; 0 at 48 px and up):

| Uniform | Value | At base |
|---------|-------|---------|
| `uTime`, `uSwirl`, `uSpin`, `uWaveTime`, `uRipplePhase`, `uScanPhase` | the clocks (Motion) | |
| `uLevel` | `level` (0 with reduced motion) | 0 |
| `uWarp` | `1 + 2.4 × turbulence` | 2.2 |
| `uVoiceWarp`, `uVoiceBright` | 2, 0.45 | |
| `uScale` | `1.2 × 2^(1 − 2 × veins) × (1 − 0.3k)` | 1.2 |
| `uSoftness` | `2^(2 × softness − 1)` | 1 |
| `uDetail` | `detail × (1 − 0.5k)` | 0.5 |
| `uGrain` | `1 − k` | 1 |
| `uContrast` | `1 + 0.12k` | 1 |
| `uGlow` | `glow × (1 + 1.5 × pulse)` | 0 |
| `uBrightness` | `brightness × (1 + 0.1 × pulse)` | 1 |
| `uWaveAmp`, `uWaveFreq`, `uWaveAngle` | `0.1 × waves`, `2.2 × uScale / 1.2`, 0.35 rad | 0 |
| `uRippleAmp`, `uRippleFreq` | `0.1 × ripples + 0.22 × level`, 8 | 0 |
| `uVortex`, `uChop`, `uScan` | `whirl`, `chop`, `scan` | 0 |

## Motion

Run per frame with `dt` in seconds, capped at 0.1. Draw at most 30 frames a second.

1. **Spring** every numeric parameter toward the target with a critically damped spring (response 0.7 s, no overshoot): `ω = 2π / 0.7`, `v += (−ω²(x − target) − 2ωv) dt`, `x += v dt`. Integrate in sub-steps of at most 0.02 s (one explicit step is unstable near the 0.1 s cap). A change starts from where the marble is now and never jumps. When `|x − target| < 0.0001` and `|v| < 0.001`, `x` becomes the target and `v` 0, so a settled marble draws the identical frame.
2. **Level**: `goal = clamp(rawLevel, 0, 1) × reactivity`; `level += (goal − level)(1 − e^(−dt·r))`, `r` = 16 rising and 6 falling (snaps within 0.0001).
3. **Clocks** (stopped with reduced motion):
   - `time += dt × speed`; `swirl += dt × level × 4`; `spin += dt × spin × 0.5`
   - `waveTime += dt × 1.8 × speed × (1 + 1.2 × level)`
   - `ripplePhase += dt × 6 × (1 + 3 × level) × (+1 out, −1 in)`
   - `scanPhase += dt × (0.8 + 0.4 × speed)`
   - `breathPhase += dt × 2π / (1.6 + 2.4 × (1 − min(speed, 1)))`
   - `beatPhase += dt × 2π × 0.9`; `bouncePhase += dt × 2π × (0.25 + 1.55 × bounce^1.5)`; `jellyPhase += dt × 2π × 4.5`
4. **Pulse** (the beat): with `f` the fractional part of `beatPhase / 2π`, `pulse = beat × (e^(−((f − 0.12) × 12)²) + 0.5 e^(−((f − 0.32) × 12)²))`.
5. **The whole marble** (an inner layer's transform, so layout never moves; all but `size` are multiplied by `1 − k` and are 0 with reduced motion):
   - scale `size × (1 − 0.03 × breath × (0.5 + 0.5 cos breathPhase)) × (1 + 0.035 pulse) × (1 + 0.12 level)`, squashed by jelly `j = 0.06 × wobble × level × sin(jellyPhase)`: x × (1 + j), y × (1 − j)
   - shake: a burst (1, fading at 1.8/s) when the target `shake` rises by more than 0.5; offset x `= shake × (burst + 0.5 pulse) × 0.025 × sin(61c) sin(23c)` of the size (`c` the seconds since start)
   - bounce: `b = clamp((bounce − 0.3) / 0.5, 0, 1)`; offset y `= −0.03 × bounce × (b × 1.6 |sin(bouncePhase / 2)| + (1 − b) sin bouncePhase)` of the size
   - sway: rotate `4° × sway × sin(0.7 × bouncePhase)`
6. **Halo opacity**: `min(1, halo × (1 + 0.5 pulse) + 0.4 level)`.

Reduced motion: a still frame. Parameters still spring (so states show through brightness and size), the clocks stop, `uLevel` is 0, the whole marble does not move; the halo still follows level.

## Small sizes

Below 48 CSS pixels the marble gets its own tuning, by `k = clamp((48 − size) / 16, 0, 1)` (full at 32 px and under): broader veins, half the fine detail, no grain, 12 % more contrast, no whole-marble movement, and a tighter halo (gone at 32 px and under).

## Audio level

`rawLevel` from audio samples (-1..1): `rms = sqrt(mean(sample²))`, then `clamp((rms - 0.01) * 7, 0, 1)`. A developer-supplied level (0–1) replaces it.

## Rendering

- Render size: the view's CSS size × device pixel ratio (at most 2×; past that the eye gains nothing and the GPU pays), within 16.7 million pixels (4096²) per marble and the GPU's limits.
- Transparent background, premultiplied alpha; the shader writes `color * coverage, coverage`.
- Animate only while visible on screen; still otherwise.
- Web: every marble on a page renders through one shared WebGL2 context and is copied into its own element's canvas.
