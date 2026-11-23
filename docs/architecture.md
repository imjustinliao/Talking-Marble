# Architecture

> **Status: approved** (2026-11-23). From here it is current truth: rewrite it in place when it changes (git keeps the history). The dated decision log lives in `docs/progress.md` › Decisions.

## Shape

One repository, a pnpm workspace with three parts:

```text
packages/core/             platform-neutral: the contract every port reuses (private package `@talking-marble/core`)
  shader/orb.frag.glsl     the orb fragment shader (GLSL ES 3.0), the single source of the look
  presets/palettes.json    the six palettes (ground + three pigments, sRGB hex)
  presets/states.json      the six built-in states, as parameter values
  presets/examples.json    the example presets / emotions (muted, happy, calm)
  spec.md                  how parameters map to uniforms, the easing rates, the audio-level math
packages/react/            the npm package `talking-marble` (TypeScript, React)
  src/render/              WebGL2 renderer, framework-free (built from packages/core)
  src/audio/               audio source → smoothed 0–1 level (Web Audio)
  src/TalkingMarble.tsx    the React component
apps/site/                 the site: showcase, playground, install, docs (Vite + React), deployed to GitHub Pages
```

The renderer and audio code know nothing about React, so a later vanilla or Vue entry is a thin wrapper. Each later port (SwiftUI, React Native, Compose, Flutter) is a small renderer: it translates `orb.frag.glsl` to its shader language and reads the same JSON; `packages/core/spec.md` keeps the behavior identical.

`packages/core/spec.md` is the one extra Markdown file allowed outside `docs/`: it ships with the core as its contract.

## Stack

| Part | Choice | Why (source) |
|------|--------|--------------|
| Language | TypeScript 7 | Current stable (npm `latest`, 2026-11-23); types are part of the library's API |
| Package manager | pnpm 11 workspace | Already installed; workspaces link the site to the package |
| Rendering | Raw WebGL2, one quad, no 3D library | The existing renderer already is; zero runtime dependencies, small bundle |
| Render loop | Main thread, `requestAnimationFrame` capped at 30 fps | The original orb's OffscreenCanvas worker is hard to ship inside a library (bundlers, CSP); the shader is cheap. Worker mode: Later, if profiling asks for it |
| Audio | Web Audio `AnalyserNode`, RMS → smoothed level | Built into every browser; no dependency |
| Component | React, peer dependency `>=18` | Covers today's apps; React 19.3 for development |
| Library build | tsdown (ESM, `.d.ts`) | Current standard for TS libraries (0.23, active 2026-11) |
| Site | Vite 8 + React | The playground is all React; one tool for dev and build |
| Unit tests | Vitest 5 | Level math, easing, preset validation, prop handling |
| Browser tests | Playwright 1.65 | Renders in a real browser, canvas not blank, a screenshot per state and theme |
| Package checks | publint, `@arethetypeswrong/cli` | Catch broken exports and types before publishing |
| Releases | Changesets | Versioning and the changelog |
| CI and hosting | GitHub Actions; GitHub Pages; npm trusted publishing (OIDC) | Free; no npm token stored anywhere |

## Data

None. No server, no storage, no analytics. Microphone audio is analyzed in the browser and never leaves it; the site says so next to the mic button.

## Interfaces

The public API, the contract developers build against (changes need the owner's approval; breaking changes need a major version once published). **Updated for M7 (2026-11-23 spec, approved)**: the additions below are what M7 builds and M8–M10 code against. Not published yet, so the preset names change without aliases.

```tsx
import { TalkingMarble } from 'talking-marble';

<TalkingMarble
  state="speaking"            // 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error' | any preset name
  emotion="happy"             // M7: optional; 'muted' | 'happy' | 'calm' | any preset name; layers on the state
  audio={remoteStream}        // MediaStream | HTMLMediaElement | AudioNode, optional
  level={0.4}                 // 0–1, optional; overrides audio when given
  palette="pearl"             // a palette name, or four colors: ['#f6f5ee', '#ef9fc5', '#61d9d0', '#f3c76f']
  size={160}                  // px; default fills its container (square)
  presets={{ thinking: { speed: 2 }, wow: { bounce: 1 } }}  // your states and emotions, over the built-ins
  label="Assistant"           // M7: who the orb is; it reads "Assistant, speaking" (role="img"), default "Assistant"
  aria-label="…"              // overrides the label entirely
  decorative                  // M7: hide from assistive tech (aria-hidden) when the state is shown elsewhere
  halo                        // default true
  paused={false}              // stop animating without unmounting
/>
```

Also exported: `palettes`, `states`, `emotions` (M7: `muted`, `happy`, `calm`), `resolveState`, `resolvePalette`, and the types `OrbState`, `BuiltInState`, `OrbEmotion`, `OrbPreset`, `OrbPalette`, `OrbColors`, `PaletteName`, `OrbAudioSource`, `TalkingMarbleProps`.

**Preset format (M7)**: plain data, the same in every port; every field optional, each with a range and default in `packages/core/spec.md`. Resolution: built-in base → the state → the emotion (if any) mixed in at a fixed weight → the developer's presets of the same names.

```json
{
  "speed": 1, "turbulence": 0.5, "veins": 0.5, "softness": 0.5, "detail": 0.5,
  "spin": 0, "waves": 0, "ripples": 0, "rippleDirection": "out", "whirl": 0, "chop": 0,
  "glow": 0, "brightness": 1, "breath": 0, "beat": 0, "bounce": 0, "wobble": 0, "shake": 0, "size": 1,
  "reactivity": 0, "colors": null, "label": null
}
```

- `reactivity` is how strongly the orb answers audio (0 ignores it). `colors` (four hex) is the only way a preset changes colour; built-in states and emotions never do (owner, Q-1). `label` names a custom state for assistive tech ("Assistant, wow").
- Values ease toward the active preset (critically damped springs; no jumps). Unknown names fall back to `idle` with one console warning in development.
- Sizes: the canvas backs the element at CSS size × device pixel ratio (≤ 3×) within a pixel budget; below ~48 px a small-size profile applies (`docs/design.md` › Sizes).
- **One shared renderer**: every marble on a page draws through one WebGL context (browsers allow ~16), each into its own element; no API surface.
- `audio` with an `HTMLMediaElement`: the element keeps playing through the speakers. One element feeds one orb at a time.
- One shared `AudioContext`, started on the first audio prop; if the browser blocks it until a user gesture, the orb waits and resumes on the next one.
- Server rendering: renders the still fallback picture; nothing touches `window` before mount.

In the workspace, the site imports the package's TypeScript source through the `talking-marble-source` export condition (instant reloads; the dev server also regenerates from `packages/core/` on change). Published consumers get `dist/`.

## Environments and secrets

| Name | Used by | Where the value lives (dev / prod) |
|------|---------|------------------------------------|
| none | | npm publishing uses trusted publishing (OIDC) from GitHub Actions, so no token exists |

## Run, test, deploy

- Commands (set in M1): `pnpm dev` (site), `pnpm build`, `pnpm test`, `pnpm test:e2e`, `pnpm check` (lint, types, publint, attw).
- CI on every push: build, tests, package checks.
- Site: on push to `main`, an Action builds `apps/site/` and deploys to GitHub Pages (`imjustinliao.github.io/Talking-Marble`).
- Release: before publishing, the site is built against the packed tarball (`pnpm pack`), proving the playground runs on the real package (PKG-01). Then a Changesets release Action publishes to npm.
- **Monthly cost: $0.** GitHub Pages, Actions (public repo) and npm are free.
- Accounts the owner needs: an npm account (free) to own the `talking-marble` name and allow trusted publishing; GitHub Pages turned on for the repo (Settings › Pages › Source: GitHub Actions). Both come at the Ship milestone, with steps.

## Limits and risks

| Risk | Plan |
|------|------|
| WebGL2 missing or context lost (old devices, too many canvases) | The CSS fallback picture; recreate the context on restore. Each orb has its own context; pages with more than ~8 orbs are out of scope for v1 |
| Autoplay policy blocks the `AudioContext` | Resume on the next user gesture; the `level` prop always works |
| Battery on phones | 30 fps cap, pause off screen and in hidden tabs, `paused` prop, `powerPreference: 'low-power'` |
| Port drift between platforms | `packages/core/` holds the one shader and the preset values; ports are checked against screenshots of the web orb |
| Bundle size | Budget: under 15 kB gzipped for the package, checked in CI |
