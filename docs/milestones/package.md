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

---

# M7 The orb to spec: report

Branch: `milestone/orb-spec` (from local `main` at `f510995 0.6.2`). Commits: `b94e441 0.7.0 - The orb to spec: one material, emotions, plain presets, shared renderer, sizes, labels` and `0.7.1 - M7 report` (this section).

## Built (requirement IDs)

- **ORB-08 (one material):** the prototype's model is ported into `packages/core/shader/orb.frag.glsl` and the new `packages/react/src/render/motion.ts`. That covers speed, turbulence, veins, softness, detail, spin, waves, ripples (in or out), whirl, chop, glow, brightness, breath, beat, bounce, sway, wobble (voice jelly), shake, size and reactivity. The voice speeds the flow, deepens the folds, brightens the marble, pushes ripples and swells it.
  - Every colour change is removed: no tint, no saturation. `error` reads through restless chop, backward spin, a hard beat, a shake on entry and a dimmer glow (brightness 0.85, halo 0.4).
  - Idle is still the original, pixel for pixel. `e2e/package-fidelity.spec.ts` (unchanged) passes against `e2e/fixtures/fidelity/`: mean difference 0 on five palettes and 0.000004 on Ember.
  - Whole-marble motion (bounce, sway, jelly, shake, beat, breath, size) is a CSS transform on the inner span. Layout and the user's `style` never move (e2e).
- **EMO-01:** new `emotion` prop. An emotion moves each value it sets 65 % of the way from the state's value. New `emotions` export (`muted`, `happy`, `calm`), and custom emotions work through `presets`. `muted`, `happy` and `calm` are still exported one by one; the site imports them.
- **CUST-01:** the plain preset format from Interfaces. Ranges, base values, resolution and every formula are in `packages/core/spec.md` (Parameters, Resolution, Uniforms, Motion, Small sizes). Validation and clamping work as before. `colors` (the only way a preset changes colour) and `label` (its spoken name) work per preset.
- **ORB-06 (sharp at every size):**
  - Backing store is CSS size × DPR (at most 3) within 4096² per marble and the GPU's limits; the 512 cap is gone. E2E at DPR 2: 20 px → 40 px backing, full viewport → 2 × the CSS size.
  - Small-size profile, scaled by `k = clamp((48 − size)/16, 0, 1)`: broader veins, half the detail, no grain, 12 % more contrast, no whole-marble movement, a tighter halo, and no halo at 32 px and under.
  - A device-pixel-ratio change (zoom, another display) resizes the backing.
- **One shared renderer:** every marble draws through one WebGL2 context (`src/render/shared.ts`).
  - Preferred path: an `OffscreenCanvas` sized to the marble renders it, and `transferToImageBitmap()` hands the frame to the marble's `bitmaprenderer` canvas. That's a zero-copy GPU handoff.
  - Fallback where OffscreenCanvas WebGL2 is missing: a hidden canvas plus `drawImage` into a 2D canvas.
  - One frame loop at 30 fps for all marbles, grouped by size in alternating order, so each distinct size resizes the surface at most once per frame.
  - An exception in one marble never stops the others.
  - Offscreen and hidden pausing, context-loss recovery (shared, with the fallback meanwhile, plus an `isContextLost` guard) and the reduced-motion still frame are kept. A settled still marble stops asking for frames.
  - E2E: 30 marbles draw and animate, exactly one WebGL context is created, and there are no context warnings.
- **ORB-07:**
  - **Labels:** default `role="img"` named "Assistant, <state>", plus ", <emotion>" when one is set. `label` sets the name; custom states and emotions use their preset `label`, else their name; unknown states read as "idle". `aria-label` overrides, and `decorative` hides it. Covered by unit tests (`label.test.ts`) and e2e.
  - **SSR:** `test/ssr.test.ts` runs `renderToString` in a Node environment with no `window` or `document`. The output is the labelled fallback picture with `data-ready="false"`.
- **DES-02:** `e2e/package-states.spec.ts` measures the six states at 20, 48 and 240 px on dark and light, over 3.2 s.
  - Features: brightness, flicker, detail, pattern motion, whole-marble bounce, shake, sway, pulse and squash, diameter, and halo contrast.
  - Every pair passes by a visible margin at every size, with no exceptions (stable across a 3× run).
  - The closest pairs are thinking/speaking at 48 and 240 px (2× margin: sway vs bounce/squash, plus halo) and idle/connecting at 20 px (pattern motion 58 %, Δluma 6.5).
- **Bundle:** 13.93 kB gzipped (budget 15). The shipped GLSL is stripped of comments; `packages/core` keeps them.

## Defaults chosen

- **Mapping from the prototype to the plain fields:**
  - `warp = 1 + 2.4·turbulence`, `scale = 1.2·2^(1−2·veins)`, `softness ×= 2^(2·softness−1)`. At 0.5 each gives the original.
  - The prototype's `energy` is folded into `speed` (×1.45) and `brightness` (×1.055).
  - Secondary rates are derived rather than exposed: wave speed, frequency and angle; ripple speed (6/s) and frequency (8); breath period from speed; beat rate 0.9 Hz; bounce rate from bounce.
  - Voice strengths are fixed at the prototype's speaking values (flow 4, folds 2, brightness 0.45, size 0.12, ripples 0.22), and `reactivity` scales the voice level (listening 0.6, speaking 1).
- **Two fields beyond the Interfaces list:** `halo` (0–1, the halo at rest) and `sway` (0–1, rocking). Both are additive.
- **Starting values** are the prototype's with colour removed. Changes from it:
  - connecting brightness 0.94 (design: "slightly dim")
  - error brightness 0.85 and halo 0.4 (dimmer glow)
  - thinking glow 0.1 and brightness 1 (prototype 0.2 and 1.055 after the energy fold), so it stays apart from speaking at 20 px
- Springs: critically damped, 0.7 s response, sub-steps of at most 0.02 s, landing exactly within 1e-4. Level: rises at 16/s and falls at 6/s (the prototype's).
- The accessible name includes the emotion ("Nova, speaking, happy").
- Pixel budget: 4096² per marble.

## Deviations from the docs or contracts

- **A moving marble can paint past its box.** Scale up to about 1.2 (voice swell, `size` up to 1.2) plus bounce, shake and sway. At the very edge of the viewport this can widen the page's scroll area while it moves. Transforms count as scrollable overflow, and `overflow: clip` with `overflow-clip-margin` still counts in Chromium (tested), so clipping would crop the halo. Layout and `style` never move, and a resting marble adds no overflow (e2e). For the docs: give a moving marble about 20 % room at a viewport edge, or put `overflow-x: clip` on its container.
- `resolveState()` results keep a deprecated, non-enumerable `levelResponse` getter (= `reactivity`), because `apps/site/src/home/main.tsx:51` reads it. Remove it once M8 switches to `.reactivity`.
- The spec (`packages/core/spec.md`) is rewritten for the new model. Motion uses springs instead of 4/s easing, and the level rises at 16/s and falls at 6/s instead of 10/s.
- `presets/examples.json` is renamed `presets/emotions.json`.

## Integration steps for the coordinator

1. Merge `milestone/orb-spec`. No dependency changes and no lockfile change.
2. **Site (M8):**
   - Move preset code to the new names. `Docs.tsx` still shows `flow`, `energy`, `tint`, `levelResponse`, `saturation`; `sanitize` ignores unknown keys, so old presets do nothing rather than break.
   - Change `home/main.tsx:51` to `.reactivity`, then drop the alias in `packages/react/src/state.ts`.
   - Use `emotion` instead of passing emotions as states.
   - Note that marbles are now `role="img"` by default; pass `decorative` where the state is shown elsewhere.
   - The full suite already passes as-is (65/65), axe included.
3. `gen-core.mjs` now rewrites `src/generated/core.ts` only when it changes, so parallel test runs and dev servers no longer reload each other's pages.
4. The docs should state the edge-room note (Deviations) and that one media element feeds one orb.

## Contract changes requested

None breaking. Additive: preset fields `halo` and `sway`, and exports `ResolvedPreset` and `BuiltInEmotion`.

## Open questions for the owner

- Do the derived rates (fixed wave angle, ripple and beat rates) feel right, or should some become preset fields?
- Should a moving marble be hard-clipped to its box plus the halo instead (it would need a different halo technique)?

## Verification

- `pnpm test`: 61 passed. Covers the motion model, springs, emotion mixing, validation, labels, SSR without DOM globals, audio and onset.
- `pnpm typecheck` (package and site), `pnpm build`: pass. `dist/index.js` is 41.1 kB, 13.93 kB gzipped.
- `E2E_PORT=5175 pnpm test:e2e`: 65 passed (the whole suite with 4 workers, site specs and `render.spec.ts` included).
  - New `package-spec.spec.ts` (7):
    - 30 marbles through one context, all drawing and animating
    - backing size at DPR 2 for 20/32/48/240 px and a full-viewport hero
    - small sizes on dark and light, with no movement at 20 px
    - emotions: happy bounces, muted damps audio, a custom emotion works
    - layout and `style` stay fixed while moving
    - error shakes on entry
  - The fidelity, polish (default labels, shared-context loss), audio, mic and autoplay specs are updated to the new names and behaviour.
- **Headless note:** Chromium in Playwright renders WebGL with SwiftShader and composites in software. Any WebGL canvas, even a bare one, logs "GPU stall due to ReadPixels" there. The 30-marble test ignores only that one driver notice, with that evidence. On a real GPU the bitmap handoff needs no readback.
- **Screenshots:** `test-results/package/` holds `states-<bg>.png`, `emotions-<bg>.png`, `sizes-<state>-<bg>.png` (20/32/48/240 px at DPR 2), `many-30.png`, `halo-on.png` and `fallback-ember.png`. Copies are in the shared notes folder under `package-screenshots/m7/`.
- **Review:** a fresh-eyes review subagent found nothing serious. Eight of its ten smaller findings are fixed: spring sub-steps in the spec, the loop surviving exceptions, size-grouped resizing, the `isContextLost` guard, drawing the exact settled frame, stopping the loop when still, DPR changes, and a stale leftover folder. The other two are documented under Deviations: the `levelResponse` alias (which also disappears when a resolved preset is spread-cloned) and overflow while moving.
- **Not checked:** Safari and Firefox (Chromium only), a real GPU, and a person's eye on the motion feel against the prototype.
