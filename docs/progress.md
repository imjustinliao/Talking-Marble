# Progress

<!-- ignition-sequence-start: 0.5.0 -->
The handoff note for the next session, agent or account. Keep it short; newest entries first.

## Now

- **Phase**: Building <!-- Setup · Building · Shipping · Live · Paused -->
- **Milestone**: M6 done (0.6.1). Wave 2: M7 (Package session) and M8 (Site session) in parallel per docs/parallel-plan.md › Wave 2
- **Next action**: wait for the M7 and M8 reports; merge M7 first, then M8; then M9 (playground) and M10 (install, docs)
- **In flight**: Package session (M7, `milestone/orb-spec`), Site session (M8, `milestone/site-sections`); previews: main site 5173, prototype 4173

## Milestones

| ID | Title | Done when (the check) | Status |
|----|-------|-----------------------|--------|
| M1 | Thinnest slice: core + component renders | pnpm workspace with `core/` (shader GLSL, palettes and states JSON, spec), `packages/talking-marble` (WebGL2 renderer, `<TalkingMarble state palette size>`, no audio yet) and a bare `site/` page. `pnpm build` and `pnpm test` pass; a Playwright test shows a non-blank canvas in all six states; smoke, build, test and run commands filled in AGENTS.md. Owner sees: the real component on localhost. Features: CORE-01, ORB-01, ORB-03, ORB-05 | done |
| M2 | Audio | `level`, `MediaStream`, `HTMLMediaElement` and `AudioNode` all drive the orb; smoothing; autoplay-blocked `AudioContext` resumes on a gesture; unit tests for the level math; a browser test with a generated audio stream. Owner sees: the orb follows their mic on localhost. Features: ORB-02, DES-03 | done, merged 0.5.0 (owner sign-off pending) |
| M3 | Presets, polish, fidelity | Custom presets merge over built-ins; `muted`, `happy`, `calm` exported; halo, CSS fallback, reduced motion, `aria-label`, `paused`, off-screen pause, context-loss recovery; the look at rest matches the original orb; states told apart at 48 and 240 px (DES-02); bundle under 15 kB gzipped. Features: CORE-01, ORB-04 | done except DES-02 (waits for the new orb look, F-1), merged 0.5.0 |
| M4 | Site (first versions) | Built on `milestone/site` up to 0.4.10 (experience direction); reusable parts carried into M6 and M8 | superseded by the 2026-11-23 spec |
| M6 | Land and restructure | Merge `milestone/site` into main (carrying its reusable parts: docs and SDK recipes, copy button, colour picker, code generator, icons/cards/SEO/llms script, Pages workflow, e2e helpers); move `core/` → `packages/core`, `packages/talking-marble` → `packages/react` (still published as `talking-marble`), `site/` → `apps/site`; update workspace, scripts, Playwright and the Pages workflow. `pnpm build`, `pnpm test`, `pnpm typecheck`, `pnpm test:e2e` green at the new paths. Features: CORE-01, SITE-08 | done (0.6.0 merge, 0.6.1 restructure) |
| M7 | The orb to spec (package) | Port the prototype's motion into the package with one material in every state (energy, motion, brightness only; idle still pixel-identical: fidelity test); `emotion` prop layering on `state`; the plain preset format with documented ranges; one shared renderer for every marble on a page (an e2e draws 30 marbles at once); sharp at 20 px and full screen (backing size = CSS size × DPR within a budget, tested) with small-size tuning; a label per state; an SSR `renderToString` test. DES-02 measured at 20, 48 and 240 px in both themes. Features: ORB-08, EMO-01, CUST-01, ORB-06, ORB-07 | approved |
| M8 | Site: hero, states, in context | `apps/site` rebuilt as sections: hero (marble, one line, install with copy, GitHub, docs), the states grid with sizes and inline pills, the three in-context UIs (chat input bar, full-screen call, inline message), footer; dark default and light mode; plain copy; checked at 375 and 1280 px in both themes, keyboard, reduced motion, axe clean, screenshots. Features: SITE-01, SITE-02, SITE-03, SITE-07 | approved |
| M9 | Playground | Every control of the `prototype/` page works inside the site (checklist in the report), plus live code, Copy, Export preset, design-your-own-state, light/dark preview background; an export → import round-trip test. Then `prototype/` is deleted (only after this check). Features: SITE-04 | approved |
| M10 | Install and docs | Install tabs (React working; React Native, SwiftUI, Android, Flutter "Coming soon"); install, minimal usage and LiveKit / ElevenLabs / OpenAI Realtime snippets checked against their current docs; `/docs/` with props, preset format, audio options, accessibility and performance; icons, link cards and video re-rendered from the new look; sitemap and `llms.txt` updated. Features: SITE-05, SITE-06, SITE-08 | approved |
| M11 | Ship | History cleaned as the owner decides (squash proposed), pushed; GitHub Pages on (owner) and deployed; npm trusted publishing set up (owner's npm account) and `talking-marble@0.1.0` published with approval; README with a short clip. Features: PKG-01, SITE-08 | approved |

Parallel after M6 (approved): M7 (package) and M8 (site sections) touch different folders and can run at once, in the existing Package and Site sessions; M9 and M10 need M7's preset format and renderer. M11 last, in Main.

Statuses: proposed · approved · in progress · in review · done

## Feedback

| ID | Owner's request (short) | Status | Commit |
|----|-------------------------|--------|--------|
| F-9 | Overall spec (2026-11-23): libraries.dev-like structure for voice; one material, states change energy/motion/brightness from audio; emotions layer on states; full customization via presets; sharp from 20 px to full screen; per-state labels, SSR; `packages/core`; site in `apps/site` with hero, states grid, in context, playground, install tabs, docs, footer; dark + light, plain copy; gap list and plan first | plan approved with defaults (2026-11-23); M6 in progress (Main) | |
| F-8 | Centre each shot with great padding and spacing (the hero leans left now); transitions start on the marble in its colour and zoom into it smoothly, never into empty space and back | in docs/design.md › Pages; Site session | |
| F-7 | Customization as simple as the colours panel (name, arrows, four swatches, Reset) everywhere, game-like, little text; type: the current font mixed with a slightly cursive, painting/art-feel display face | in docs/design.md › Language; Site session | |
| F-6 | Palette customization on the site (edit any built-in palette with Reset, make your own), flow: intro → palettes → pick → demo with the pick → install code with the pick; buttons: short text, short text + icon, or icon only, never long text + icon; no repeated labels | relayed by the Site session; in docs/design.md and SITE-07; Site session building | |
| F-5 | Make the site an experience: one continuous background with textures, a scroll-driven camera moving like B-roll (wide hero → directional push-ins), adjustable dials for states/emotions/values, install in the hero and again later, an intro animation on every load | design in docs/design.md › The site › Pages; build → Site session (amends F-4) | |
| F-4 | Complete site redesign (earlier work and reference images as inspiration only, owner 2026-11-23; minimal, contrast, animation, transitions, texture, info only when needed), with a gallery and a demo; reference images are inspiration for depth and focus on the marble only | design written in docs/design.md › The site; build → Site session | |
| F-3 | Site: real icon (not the default), rich link cards on every platform incl. iMessage video, SEO and AI-SEO metadata (research how) | in progress (Site session, branch milestone/site) | |
| F-2 | Let users customize: colors in any state, and add their own states and emotions | proposed as CUST-01 in docs/product.md, awaiting approval | |
| F-1 | States and emotions barely differ besides overall color; error doesn't feel urgent. Idle stays as is; every other state/emotion must differ in colors, textures (cymatics: like water on a drum when you hit it) and forms (the pattern inside) | in progress: v1 overlays rejected ("Temu cheap"); v3 Siri-like luminous glass rejected ("do NOT copy Siri": inspiration only). v4 = the owner's own marble (the original pigment), one look in every state; states change energy and motion only (flow, folds, vein size, haze, turn, inner light, breath/beat, voice swell); springs. Awaiting owner review in `prototype/` | |

Statuses: open · in progress · done · won't do (why). Remove done rows once the milestone is signed off.

## Decisions

<!-- - **YYYY-MM-DD** (owner): Decision. Why. Rejected: alternatives. Keep the ~15 most recent. -->
- **2026-11-23** (owner): Re-scope to the overall spec approved with defaults: no colour shifts in built-in states (Q-1); keep palette editing with Reset in the playground, centred roomy layout, short one-action buttons, drop the display face (Q-2); `packages/core`, `packages/react` (npm `talking-marble`), `apps/site` (Q-3). The scroll-camera site is superseded.
- **2026-11-23** (owner): npm package name `talking-marble`. Matches the repo and is distinctive. Rejected: `voice-orb` (generic), `marble-orb`, the scoped fallback.
- **2026-11-23** (owner): The orb shader and design (from the owner's earlier, private projects) are Justin Liao's own and may be released under MIT, © Justin Liao. Talking Marble is Justin Liao's personal project.
- **2026-11-23** (owner): Milestones M1–M5 approved with working defaults (auto-commit, `MAJOR.MINOR.PATCH - What` commits, work on `main`, push at milestone end after sign-off). Run in parallel after M1.
- **2026-11-23** (owner): Design and architecture approved with defaults: site follows system theme with a toggle; state looks as drafted, tuned live in the playground; React-only in v1 (renderer framework-free).
- **2026-11-23** (owner): MVP features approved as written in docs/product.md.

## Blockers and waiting on the owner

## Session log

<!-- - **YYYY-MM-DD** (agent, tool): one line. Keep the last ~10. -->
- **2026-11-23** (Claude Opus 5.5, Claude Code desktop): Fresh-eyes review of M1: fixed 7 bugs (stretching, dev warning, freeze on scroll, style.transform, invalid presets, context release, dt cap) + source condition rename + palette slots; halo and context-loss recovery handed to M3. Contracts frozen at 0.1.1.
- **2026-11-23** (Claude Opus 5.5, Claude Code desktop): M1 built: core/, package (6.4 kB gzip), bare site, 9 unit tests + Playwright render test green. Docs upgraded to skill 0.5.0 (live preview).
- **2026-11-23** (Claude Opus 5.5, Claude Code desktop): Setup done: docs, plan, throwaway prototype at localhost:4173. Starting M1.
