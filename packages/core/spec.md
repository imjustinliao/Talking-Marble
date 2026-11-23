# Talking Marble core spec

The platform-neutral contract. Every port (web, SwiftUI, React Native, Compose, Flutter) reads the files in `packages/core/` and follows this spec, so the orb looks and moves the same everywhere. Changes here need the owner's approval.

## Files

| File | Holds |
|------|-------|
| `shader/orb.frag.glsl` | The orb, GLSL ES 3.0. Ports translate it line for line (Metal, SkSL/AGSL, Flutter fragment shaders). |
| `shader/orb.vert.glsl` | A full-screen quad: `vUv` from -1 to 1 across the orb's square. |
| `presets/palettes.json` | Named palettes: four sRGB hex colors each, ground then three pigments. |
| `presets/states.json` | `base` (every parameter's resting value) and the six built-in `states`, each only the parameters it changes. |
| `presets/examples.json` | Example presets (`muted`, `happy`, `calm`) that ship with the package. Not built-in states: developers pass them in `presets`. |

## Colors

- A palette is exactly four colors: ground, pigment 1, pigment 2, pigment 3. Fewer are filled out with the ground; extra are dropped.
- Hex is sRGB. Convert to linear light before the shader: `c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ^ 2.4`.

## Parameters

A state or preset is a partial set of these. Resolve it as `base`, then the named state's values, then any custom preset with the same name on top.

| Parameter | Range | Meaning | Goes to |
|-----------|-------|---------|---------|
| `flow` | 0–2 | Speed of the pigment's flow | clock (below) |
| `energy` | 0–1 | Activity: speeds the flow up to +45%, brightens 5.5% | clock, `uEnergy` |
| `warp` | 1–3.5 | How deeply the pigment folds | `uWarp` |
| `brightness` | 0.5–1.5 | Overall light | `uBrightness` |
| `saturation` | 0–1.5 | 0 is grey, 1 is the palette | `uSaturation` |
| `tint` | hex | A color mixed into the pigment | `uTint` (linear) |
| `tintAmount` | 0–1 | How much tint | `uTintAmount` |
| `breath` | 0–1 | Scale pulse depth: scale = 1 - breath * 0.03 * (0.5 + 0.5 cos(phase)), phase advancing 2π every 1.6 s | the view's scale |
| `halo` | 0–1 | Halo opacity at rest | the halo layer |
| `levelResponse` | 0–1 | How much audio level reaches the orb | level (below) |

Unknown state names resolve to `idle` (web: one console warning in development).

## Motion

Run per frame with `dt` in seconds, capped at 0.1. Draw at most 30 frames a second.

1. **Ease** every numeric parameter (and each channel of `tint`, in linear light) toward the target: `value += (target - value) * (1 - exp(-dt * 4))`.
2. **Level**: `target = clamp(rawLevel, 0, 1) * levelResponse`; `level += (target - level) * (1 - exp(-dt * 10))`.
3. **Clock**: `time += dt * flow * (1 + energy * 0.45)`; `swirl += dt * level * 1.4`; `breathPhase += dt * 2π / 1.6`.
4. **Halo opacity**: `min(1, halo + level * 0.4)`.
5. **Draw**: `uTime = time`, `uSwirl = swirl`, `uLevel = level`, the rest from the eased parameters.

Easing snaps: when an eased value (steps 1 and 2) ends a step within 0.0001 of its target, it becomes the target, so a settled orb draws exactly the same frame.

Reduced motion: the clock, swirl and breath stop and `uLevel` is 0; parameters still ease, and the halo still follows level.

## Audio level

`rawLevel` from audio samples (-1..1): `rms = sqrt(mean(sample²))`, then `clamp((rms - 0.01) * 7, 0, 1)`. A developer-supplied level (0–1) replaces it.

## Rendering

- Render size: the view's size × device pixel ratio, capped at 3× and at 512 device pixels a side.
- Transparent background, premultiplied alpha; the shader writes `color * coverage, coverage`.
- Animate only while visible on screen; still otherwise.
