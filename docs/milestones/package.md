# M2 Audio + M3 Presets, polish, fidelity: report

Branch: `milestone/package` (from local `main` at `ba6922c 0.1.1`) · Commits:
`dec0154 0.2.0 - Audio sources drive the orb; halo, fallback and context-loss layers` ·
`3212a13 0.3.0 - Halo, CSS fallback, context-loss recovery, still easing, fidelity and state checks` ·
`0956ccb 0.3.1 - Fix review findings in audio, map-based uniforms, onset helper, revert state tuning` ·
`0.3.2 - Package milestone report` (this file).

## Built (requirement IDs)

- **ORB-02** (M2): `audio` accepts `MediaStream` (mic or remote), `HTMLMediaElement`, `AudioNode`; `level` overrides `audio` when given. Framework-free `src/audio/`:
  - `level.ts`: RMS math (`core/spec.md` › Audio level).
  - `context.ts`: one shared `AudioContext`, made lazily on the first audio prop. If suspended, `resume()` is tried at once, then on every activation gesture (`pointerup`, `touchend`, `click`, `keydown`) until it runs (touch `pointerdown` does not grant activation). It re-arms if the browser suspends it later (`statechange` to `suspended`, or Safari's `interrupted`).
  - `source.ts`: `connectAudio(source)` → `{ read(), dispose() }`.
    - Media elements are wrapped once (WeakMap) and stay routed to the speakers. Cross-origin media without CORS is left alone, because wrapping would mute it.
    - A stream with no audio track yet is tapped when its first track arrives (`addtrack`, the WebRTC pattern).
    - Any Web Audio error returns `null` rather than throwing into React.
    - Analysers are disconnected on prop change and unmount; the developer's tracks are never stopped.
    - The analyser is read only while the state's `levelResponse > 0`.
  - `onset.ts` (for Main's redesign; not exported from the package yet): `createOnsetDetector()` → `(level, dt) => strength`, a "hit" when the smoothed level runs ahead of a 12/s envelope by 0.12, with hysteresis and a 0.15 s refractory time. Unit-tested on syllables, steady tones, slow swells and a smoothed step.
- **DES-03** (M2): smoothing at 10/s (existing). Listening reacts gently (`levelResponse` 0.5), speaking fully.
- **ORB-04 / CORE-01** (M3): custom presets merge over built-ins; `muted`, `happy`, `calm` are exported (M1 code; unit tests kept).
- **Extensible renderer** (Main's request): `renderer.draw(uniforms)` takes a map by GLSL name (number → `float`, triple → `vec3`) and looks up locations lazily. `state.ts` alone lists the parameters:
  - `NUMERIC` holds all of them.
  - `CONTROLLER_PARAMS` (`flow`, `breath`, `halo`, `levelResponse`) are the controller's own.
  - Every other numeric parameter goes to the shader as `u` + Name (`SHADER_PARAMS`, `uniformName`).
  - To add a shader parameter: one entry in `NUMERIC`, `paramRanges` and `states.json` › `base`, plus the uniform in the shader. The controller eases and passes it with no other change.
- **Halo** (M3): soft light behind the sphere in pigments 2 and 1 (as the original orb's halo, scaled to the orb), with opacity `min(1, halo + level*0.4)`. `halo={false}` hides it. It is drawn with `box-shadow`, so it never changes layout or adds scroll overflow (tested at the viewport edge).
- **CSS fallback** (M3): a radial-gradient picture in the palette (as the original orb's fallback).
  - Shown until the shader's first frame, and whenever WebGL2 is missing or lost.
  - Dimmed and desaturated to the state with a CSS `filter`; the halo keeps easing.
  - `data-ready="true|false"` is rendered by React on the outer element, so SSR shows the fallback.
- **Context loss** (M3): `webglcontextlost` → `preventDefault`, and the fallback shows (dimmed to the state at once, even when paused). `webglcontextrestored` → renderer and colors rebuilt, animation resumes.
- **Reduced motion** (M3): checked against `core/spec.md` › Motion. Clock, swirl and breath stop and `uLevel` is 0; parameters still ease and the halo follows level. Easing now snaps within 0.0001, so the settled frame is exactly still.
- **DES-01** (M3): pixel-identical to the original orb at idle for all six palettes (below).
- **DES-02**: **pending Main's redesign** (feedback F-1). The state look and shader state behavior are untouched. `e2e/package-states.spec.ts` is measure-only: it saves the grids and prints per-state numbers and pairs that are too close, without failing.
- **Bundle**: `dist/index.js` 10.29 kB gzipped (budget 15 kB; was 7 kB).

## Defaults chosen (ambiguity ID → choice)

- Analyser `fftSize` 2048 (≈43 ms at 48 kHz, which covers a 30 fps frame).
- An `AudioNode` is analysed on its own context; the shared context is not created for it.
- An element with no source yet, a `blob:`/`data:` source or a `srcObject` counts as readable; a cross-origin `src` needs the `crossOrigin` attribute.
- The shared `AudioContext` is never closed: one per page, and it keeps wrapped media elements audible.
- Halo geometry: `0 0 12% 3% pigment2/0.7, 0 0 30% 7% pigment1/0.45` of the orb size, as box-shadows from an element inset 1%.
- Without WebGL2 the loop still runs while visible (30 fps cap), so the halo and the fallback's dimming ease with state and level.
- Easing snaps to the target within 0.0001 (added to `core/spec.md` › Motion).
- The DES-02 grid shows `listening` and `speaking` with a steady voice level of 0.6.

## Deviations from the docs or contracts

- `core/spec.md` › Motion: added the snap rule (one paragraph). This is the only `core/` change.
- `core/presets/states.json`: unchanged. A `thinking.warp` 2.7 → 3.0 tweak was made in 0.3.0 and reverted in 0.3.1 per Main's scope change.
- No shader change. No public API removed or changed.

## Integration steps for the coordinator

1. Merge `milestone/package`, then run `pnpm install`. The lockfile is not committed on this branch (Main owns it); the only change is four dev dependencies of `packages/talking-marble`, and every version is already in the lockfile through `site`.
2. New dev dependencies in `packages/talking-marble/package.json`: `vite` 8.3.8, `react-dom` 19.3.1, `@types/react-dom` ^19.3.0, `@types/node` ^26.6.6. They serve the test page and its server. Runtime dependencies: still none.
3. Package e2e specs (`e2e/package-*.spec.ts`) start their own Vite server for `packages/talking-marble/test/page/` on a free ephemeral port (fixture `test/page/fixture.ts`). They do not use the site or `E2E_PORT`. `package-fidelity.spec.ts` compares against the reference frames in `e2e/fixtures/fidelity/` and runs everywhere.
4. Site (M4) can pass `audio={stream}` from `getUserMedia`, a sample `<audio>` element (same origin or with `crossOrigin`), or a node. It can read `data-ready` on `[data-talking-marble]` to show the "WebGL2 unavailable" note. One media element feeds one orb at a time.
5. For the redesign:
   - New shader parameters: follow `state.ts` › `CONTROLLER_PARAMS` / `SHADER_PARAMS`.
   - Ripples: feed `createOnsetDetector()` from `src/audio/onset.ts` with the controller's smoothed `level` in `orb.ts` › `step`, and pass the hit time or strength as a uniform through the map.
   - Restore the DES-02 assertion in `package-states.spec.ts`: where a pair is annotated `pair too close`, add `expect(told, text).toBe(true)`.
6. `tsdown.config.ts`: `external` → `deps.neverBundle` (removes a deprecation warning; output identical). The remaining build warning (`tsgo` on TypeScript 7.0) comes from the root TypeScript version, which is Main's.
7. README notes for M5:
   - `level` overrides `audio`.
   - A media element stays audible and can feed one orb; cross-origin media needs CORS (`crossOrigin="anonymous"`) to be analysed.
   - The orb never stops your tracks.
   - It starts listening after the first user gesture if the browser blocks audio.

## Contract changes requested

None. Additive only: `OrbAudioSource` now lives in `src/audio/source.ts` and is re-exported unchanged.

## External dependencies found

None at runtime. The original orb's source was read (never modified) to port the halo and fallback and to verify DES-01; the verified frames are now saved in `e2e/fixtures/fidelity/` and the test no longer needs the original.

## Open questions for the owner

- Halo strength was tuned by eye on Pearl and Ember (screenshots below): stronger or softer?

## Verification

- `pnpm test`: 37 passed. Covers level math; source handling with Web Audio fakes (shared context, element wrapped once and kept audible, cross-origin left alone, late tracks, node errors, tracks never stopped); gesture resume until running; onset detection; easing snap; CSS layers; and M1's core tests.
- `pnpm typecheck`, `pnpm build`: pass. `dist/index.js` is 28.7 kB, 10.29 kB gzipped.
- `E2E_PORT=5175 pnpm test:e2e`: 25 passed, including M1's `e2e/render.spec.ts`.
  - `package-audio.spec.ts` (8):
    - MediaStream, HTMLMediaElement (still playing) and AudioNode each raise the level. Sources are oscillators; halo opacity is the probe.
    - A quiet source gives a proportional level.
    - `level` overrides `audio`.
    - Idle ignores audio; listening reacts gently.
    - Removing audio and unmounting release it, and the track stays `live`.
    - Orbs share one context.
  - `package-mic.spec.ts` (1): a `getUserMedia` stream (Chromium's fake capture device) drives the orb, with a peak halo opacity of 0.115 from its beeps. The track stays `live` after unmount.
  - `package-autoplay.spec.ts` (1): under an emulated gesture-required policy (headless Chromium ignores the real one), the shared context stays suspended, then resumes on a key press.
  - `package-polish.spec.ts` (6):
    - Halo on and off with identical layout and no scroll overflow at the viewport edge.
    - WebGL2 missing → fallback in the palette, dimmed to the state, no console errors.
    - Context lost → fallback; restored → drawing and animating again.
    - Reduced motion: frames identical, states still show, halo follows level.
    - `paused` holds the frame.
    - `aria-label` makes it an image; otherwise it is hidden.
  - `package-fidelity.spec.ts` (6): this renderer at t = 2.5 s, 240 px, for every palette, against the reference frames in `e2e/fixtures/fidelity/` (verified identical to the original orb, max channel difference 1).
  - `package-states.spec.ts` (2, measure-only): numbers printed per run. Latest: every pair already differs by > 3 in lightness, chroma or halo, or by > 25 % in motion. `idle`/`listening`/`thinking` are closest and differ mostly in halo and motion. That is the F-1 complaint, left to Main.
- Screenshots: `test-results/package/` holds `states-dark.png`, `states-light.png`, `halo-on.png` and `fallback-ember.png`. Playwright clears `test-results/` on each run, so copies are kept in the shared notes folder `…/side-session-notes/local_3f9eb29d-…/package-screenshots/`.
- A fresh-eyes review subagent found six issues: touch-gesture resume, cross-origin muting, late tracks, node errors, fallback dimming on loss, and a stale resume listener. All six are fixed in 0.3.1 with tests.
- Not checked: a physical microphone (fake device only), Safari and Firefox (Chromium only), real autoplay blocking (emulated), and the halo look on every palette by a person.
