# Architecture

> **Status: approved** (2026-11-23). From here it is current truth: rewrite it in place when it changes (git keeps the history). The dated decision log lives in `docs/progress.md` › Decisions.

## Shape

One repository, a pnpm workspace with three parts:

```text
packages/core/             platform-neutral: the contract every port reuses (private package `@talking-marble/core`)
  shader/orb.frag.glsl     the orb fragment shader (GLSL ES 3.0), the single source of the look
  presets/palettes.json    the six palettes (ground + three pigments, sRGB hex)
  presets/states.json      the seven built-in states, as parameter values
  presets/emotions.json    the eight built-in emotions (muted, happy, calm, excited, curious, surprised, concerned, sad)
  spec.md                  how parameters map to uniforms, the easing rates, the audio-level math
packages/react/            the npm package `talking-marble` (TypeScript, React)
  src/render/              WebGL2 renderer, framework-free (built from packages/core)
  src/audio/               audio source → smoothed 0–1 level (Web Audio)
  src/TalkingMarble.tsx    the React component
apps/site/                 the site: showcase, playground, install, docs (Vite + React), deployed on Vercel
```

The renderer and audio code know nothing about React, so other entries are thin wrappers: the Web Component (`talking-marble/element`) already is one. Each later port (SwiftUI, React Native, Compose, Flutter) is a small renderer: it translates `orb.frag.glsl` to its shader language and reads the same JSON; `packages/core/spec.md` keeps the behavior identical.

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
| Site type | Libre Franklin from Google Fonts (OFL), weights 300–800, `display=swap`; the system font for body text | The owner's MoMA-like, magazine type (F-73); the site only, never the package. Falls back to Franklin Gothic / Helvetica if blocked. Self-hosting is the alternative if a third-party request is unwanted |
| Unit tests | Vitest 5 | Level math, easing, preset validation, prop handling |
| Browser tests | Playwright 1.65 | Renders in a real browser, canvas not blank, a screenshot per state (the site is dark only, F-77) |
| Package checks | publint, `@arethetypeswrong/cli` | Catch broken exports and types before publishing |
| Releases | Changesets | Versioning and the changelog |
| CI and hosting | GitHub Actions for checks (Node 24); Vercel (Hobby, free) hosts the site; npm trusted publishing (OIDC) | Owner's choice, F-81: one host for this and later projects; Hobby is free and permanent for non-commercial, open-source use; no npm token stored anywhere |

## Data

None. No server, no storage, no analytics. The site asks for no microphone (Talk was removed, F-99); the package analyzes any audio it is given in the browser, and it never leaves it.

## Interfaces

The public API, the contract developers build against (changes need the owner's approval; breaking changes need a major version once published). **Updated for M7 (2026-11-23 spec, approved)**: the additions below are what M7 builds and M8–M10 code against. Not published yet, so the preset names change without aliases.

```tsx
import { TalkingMarble } from 'talking-marble';

<TalkingMarble
  state="speaking"            // 'idle' | 'connecting' | 'listening' | 'thinking' | 'searching' | 'speaking' | 'error' | any preset name
  emotion="happy"             // optional; one of the eight built-in emotions or any preset name; layers on the state
  audio={remoteStream}        // MediaStream | HTMLMediaElement | AudioNode, optional
  level={0.4}                 // 0–1, optional; overrides audio when given
  palette="pearl"             // a palette name, or four colors: ['#f6f5ee', '#ef9fc5', '#61d9d0', '#f3c76f']
  size={160}                  // px; default fills its container (square)
  presets={{ thinking: { speed: 2 }, wow: { bounce: 1 } }}  // your states and emotions, over the built-ins
  label="Assistant"           // M7: who the orb is; it reads "Assistant, speaking" (role="img"), default "Assistant"
  aria-label="…"              // overrides the label entirely
  decorative                  // M7: hide from assistive tech (aria-hidden) when the state is shown elsewhere
  halo                        // default true; or a strength, 0 to 1.5 (1 the standard), F-65
  paused={false}              // stop animating without unmounting
/>
```

Also exported: `palettes`, `states`, `emotions` (and each built-in emotion by name), `resolveState`, `resolvePalette`, and the types `OrbState`, `BuiltInState`, `OrbEmotion`, `OrbPreset`, `OrbPalette`, `OrbColors`, `PaletteName`, `OrbAudioSource`, `TalkingMarbleProps`.

**The Web Component** (PLAT-01 step 1, owner-approved 2026-11-23): `import 'talking-marble/element'` registers `<talking-marble>` for any web framework or plain HTML, with no React (React is an optional peer). It drives the same framework-free orb controller (`src/render/orb.ts`) as the React component, inside a shadow root; the halo-strength rule and the unknown-name warnings are shared (`src/common.ts`).

```html
<talking-marble state="listening" emotion="happy" palette="#f6f5ee, #ef9fc5, #61d9d0, #f3c76f"
  size="160" halo="0.8" label="Nova" presets='{"wow":{"bounce":1}}'></talking-marble>
<!-- properties as well: el.state, el.audio = stream, el.level, el.presets = {...}, el.palette = [...] -->
```

- Attributes: `state`, `emotion`, `palette` (a name or comma-separated hex), `size`, `halo` (true, false or 0–1.5), `level`, `presets` (JSON), `label`, `decorative`, `paused`; `audio` is a property only. Its role and name ("Nova, listening, happy") come through `ElementInternals` (an author's own `role` or `aria-label` still wins), with attributes as the fallback where unsupported. It reflects `data-state`, `data-emotion` and `data-ready`.
- `defineTalkingMarble(tag)` registers it under another name. Importing it on a server is safe: nothing is defined there.
- Shipped as `dist/element.js` (about 3 kB gzipped plus the shared chunk), marked as a side effect so bundlers keep the registration.

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
- Sizes: the canvas backs the element at CSS size × device pixel ratio (≤ 2×) within a pixel budget; below ~48 px a small-size profile applies (`docs/design.md` › Sizes).
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

- Commands: `pnpm dev` (site on 5173), `pnpm build` (package, then site), `pnpm test` (unit), `pnpm typecheck`, `pnpm test:e2e` (Playwright on 5174). Media: `pnpm --filter site media` (icons, link card and video), `pnpm --filter site readme-media` (the README's pictures). Package checks before a release: publint and arethetypeswrong (run with npx).
- CI on every push: build, tests, package checks.
- Site: Vercel builds `main` on every push (`vercel.json`: Corepack for the repo's pnpm, `pnpm build`, output `apps/site/dist`) and serves it from the root at `https://talking-marble.vercel.app/`; pull requests get preview links. GitHub Actions (`.github/workflows/ci.yml`) runs typecheck, unit tests and the build on Node 24, Vercel's newest build image. Changing the address (another project name or a custom domain) means replacing it in the two HTML heads, `public/` (sitemap, robots, llms.txt), the Guide's docs link and the meta tests.
- Release: before publishing, the site is built against the packed tarball (`pnpm pack`), proving the playground runs on the real package (PKG-01). Then a Changesets release Action publishes to npm.
- **Monthly cost: $0.** Vercel Hobby (non-commercial), Actions (public repo) and npm are free. Commercial projects later need Vercel Pro.
- Accounts the owner needs: an npm account (free) to own the `talking-marble` name and allow trusted publishing; a Vercel account (Hobby, free; sign in with GitHub) with this repo imported as a project named `talking-marble`. Both are the owner's to create.

### Ports

5173 is the owner's live preview (`pnpm dev`), 5174 Main's e2e server; 5175–5177 are kept for side sessions (dev on 5176, e2e with `E2E_PORT`). Package page tests pick ephemeral ports outside that range.

### Link previews, SEO and AI-SEO (SITE-08)

- All tags are static in `apps/site/index.html` (unfurlers don't run JS), absolute from `https://talking-marble.vercel.app/`: Open Graph with `og-image.jpg` (1200×630) and `og-video.mp4` (1200×630, H.264, faststart, no audio, a 6 s seamless loop idle → listening → thinking → searching → speaking), X `summary_large_image`, a canonical, JSON-LD `WebSite` + `SoftwareSourceCode`, `sitemap.xml`, and `llms.txt` (llmstxt.org) linked as `rel="alternate"`. `apps/site/scripts/render-media.mjs` renders the icons, card and video from the live orb.
- The README's pictures live in `docs/media/` (an animated WebP that plays on GitHub, the same clip as MP4, stills of the states, emotions and palettes, and a shot of the site), rendered from the live orb by `apps/site/scripts/render-readme.mjs` (`pnpm --filter site readme-media`); re-run it when the look, states or emotions change.
- File names are stable; platforms cache by URL, so a re-render that must show in cached previews needs new names or each platform's re-scrape tool.
- `robots.txt` and `sitemap.xml` sit at the Vercel host's root; submit the sitemap in Google Search Console once. No page links to npm until `talking-marble` is published (PKG-01).

### Voice SDK recipes (docs › Recipes)

Checked on 2026-11-23 against each SDK's latest package types and official docs, and type-checked with `strict`: `@openai/agents-realtime` 0.22.0 (raw Realtime events via `transport_event`; `output_audio_buffer.*` are WebRTC-only), `@elevenlabs/react` 1.24.0 (`status` and `mode`; volume as `level`, no thinking signal), `@livekit/components-react` 2.9.26 with `livekit-client` 2.25.0 (`useSession`, `SessionProvider`, `useAgent()`; the older `useVoiceAssistant` still works). Sources: npm `latest` and the packages' `dist` types; developers.openai.com (realtime conversations, WebRTC), elevenlabs.io/docs (agents › React), docs.livekit.io (React quickstart, agent state, sessions). Known gap: an OpenAI response with no audio (a tool call only) stays on `thinking` until the next event. Recheck before each release.

## Limits and risks

| Risk | Plan |
|------|------|
| WebGL2 missing or context lost (old devices, too many canvases) | The CSS fallback picture; recreate the context on restore. Every orb on a page draws through one shared context (tested with 30), so the browser's context limit is never reached |
| Autoplay policy blocks the `AudioContext` | Resume on the next user gesture; the `level` prop always works |
| Battery on phones | 30 fps cap, pause off screen and in hidden tabs, `paused` prop, `powerPreference: 'low-power'` |
| Port drift between platforms | `packages/core/` holds the one shader and the preset values; ports are checked against screenshots of the web orb |
| Smoothness on every device (F-106, F-108) | Only marbles on screen draw; a marble hidden behind the demo pauses; large marbles at 1.5× density; the stage marble at its on-screen size; every scene marble holds its frame while the page scrolls; the renderer lowers its resolution in steps under sustained load and restores it with headroom; low-power devices (few cores, little memory, data saver, phones, or slow frames once settled) get the light effects only |
| Bundle size | Budget: about 15 kB gzipped for the React entry (measured 14.4 kB at 0.15.0; not yet enforced in CI) |
