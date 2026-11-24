# Progress

<!-- ignition-sequence-start: 0.5.0 -->
The handoff note for the next session, agent or account. Keep it short; newest entries first.

## Now

- **Phase**: Building <!-- Setup · Building · Shipping · Live · Paused -->
- **Milestone**: M13 Experience v2 in owner review; F-83 to F-89 built in 0.14.0 (searching state, eight emotions, Name step, docs spacing and glass bar); PLAT-01 step 1 (Web Component) built in 0.13.0
- **Next action**: npm publish (PKG-01, owner's npm account) so the site's install command works; then PLAT-01 step 2 needs CORE-01's shared core. The site is live on Vercel at https://talking-marble.vercel.app/ (owner deployed 2026-11-24; every push to `main` redeploys)
- **In flight**: nothing; preview: main site 5173. Kept after the tidy pass (their commits exist nowhere else): `milestone/site` (`ffcbb19`, the earlier experience), `milestone/site-sections`, and `milestone/orb-spec` and `milestone/camera` in the finished Site and Package sessions' worktrees

## Milestones

| ID | Title | Done when (the check) | Status |
|----|-------|-----------------------|--------|
| M1 | Thinnest slice: core + component renders | pnpm workspace with `core/` (shader GLSL, palettes and states JSON, spec), `packages/talking-marble` (WebGL2 renderer, `<TalkingMarble state palette size>`, no audio yet) and a bare `site/` page. `pnpm build` and `pnpm test` pass; a Playwright test shows a non-blank canvas in all six states; smoke, build, test and run commands filled in AGENTS.md. Owner sees: the real component on localhost. Features: CORE-01, ORB-01, ORB-03, ORB-05 | done |
| M2 | Audio | `level`, `MediaStream`, `HTMLMediaElement` and `AudioNode` all drive the orb; smoothing; autoplay-blocked `AudioContext` resumes on a gesture; unit tests for the level math; a browser test with a generated audio stream. Owner sees: the orb follows their mic on localhost. Features: ORB-02, DES-03 | done, merged 0.5.0 (owner sign-off pending) |
| M3 | Presets, polish, fidelity | Custom presets merge over built-ins; `muted`, `happy`, `calm` exported; halo, CSS fallback, reduced motion, `aria-label`, `paused`, off-screen pause, context-loss recovery; the look at rest matches the original orb; states told apart at 48 and 240 px (DES-02); bundle under 15 kB gzipped. Features: CORE-01, ORB-04 | done except DES-02 (waits for the new orb look, F-1), merged 0.5.0 |
| M4 | Site (first versions) | Built on `milestone/site` up to 0.4.10 (experience direction); reusable parts carried into M6 and M8 | superseded by the 2026-11-23 spec |
| M6 | Land and restructure | Merge `milestone/site` into main (carrying its reusable parts: docs and SDK recipes, copy button, colour picker, code generator, icons/cards/SEO/llms script, Pages workflow, e2e helpers); move `core/` → `packages/core`, `packages/talking-marble` → `packages/react` (still published as `talking-marble`), `site/` → `apps/site`; update workspace, scripts, Playwright and the Pages workflow. `pnpm build`, `pnpm test`, `pnpm typecheck`, `pnpm test:e2e` green at the new paths. Features: CORE-01, SITE-08 | done (0.6.0 merge, 0.6.1 restructure) |
| M7 | The orb to spec (package) | Port the prototype's motion into the package with one material in every state (energy, motion, brightness only; idle still pixel-identical: fidelity test); `emotion` prop layering on `state`; the plain preset format with documented ranges; one shared renderer for every marble on a page (an e2e draws 30 marbles at once); sharp at 20 px and full screen (backing size = CSS size × DPR within a budget, tested) with small-size tuning; a label per state; an SSR `renderToString` test. DES-02 measured at 20, 48 and 240 px in both themes. Features: ORB-08, EMO-01, CUST-01, ORB-06, ORB-07 | done: merged (0.7.0–0.7.2) and wired into the site (0.8.5); owner sign-off pending |
| M8 | Site: hero, states, in context | `apps/site` rebuilt as sections: hero (marble, one line, install with copy, GitHub, docs), the states grid with sizes and inline pills, the three in-context UIs (chat input bar, full-screen call, inline message), footer; dark default and light mode; plain copy; checked at 375 and 1280 px in both themes, keyboard, reduced motion, axe clean, screenshots. Features: SITE-01, SITE-02, SITE-03, SITE-07 | done: merged (0.8.0 + F-10 at 0.8.3); owner sign-off pending |
| M9 | Playground | Every control of the `prototype/` page works inside the site (checklist in the report), plus live code, Copy, Export preset, design-your-own-state, light/dark preview background; an export → import round-trip test. Then `prototype/` is deleted (only after this check). Features: SITE-04 | done: merged (0.9.1), verified in the browser, `prototype/` deleted (0.9.2); owner sign-off pending |
| M12 | Camera experience (runs before M10) | The scroll camera from `ffcbb19` restored over the current sections as shots (design.md › `/`): intro, scene, textures, keyframed B-roll moves, continuity (marble always in frame), index and keyboard, dark and light scenes, phones, reduced motion; every section stays fully interactive while settled; all existing section tests keep their assertions; a full-path e2e asserts the marble in frame and the right shot at every step, in both themes. Features: SITE-09 | done: merged 0.10.5 (83 e2e pass); owner sign-off pending |
| M13 | Experience v2 (owner's flow, F-22 to F-32) | `/` rebuilt as five shots: Intro; Palettes walk (six built-ins, fixed colours) with state, emotion, halo and Talk (mic + simulated reply, shown in a call screen / chat bar / message); Pick (See all); Create your own in four steps; Guide in numbered steps; the ink floor replaces dust and grain (F-23). States, In context, Playground and Install shots removed. Nothing jumps (the e2e guard), desktop and phone, both themes, reduced motion, axe clean, full e2e green. Features: SITE-10 | built 0.11.0 (86 e2e, 60 unit green); owner review pending |
| M10 | Install and docs | Install tabs (React working; React Native, SwiftUI, Android, Flutter "Coming soon"); install, minimal usage and LiveKit / ElevenLabs / OpenAI Realtime snippets checked against their current docs; `/docs/` with props, preset format, audio options, accessibility and performance; icons, link cards and video re-rendered from the new look; sitemap and `llms.txt` updated. Features: SITE-05, SITE-06, SITE-08 | done: merged 0.10.13 (its Install shot became M13's Guide) |
| M11 | Ship | History cleaned as the owner decides (squash proposed), pushed; GitHub Pages on (owner) and deployed; npm trusted publishing set up (owner's npm account) and `talking-marble@0.1.0` published with approval; README with a short clip. Features: PKG-01, SITE-08 | approved |

Parallel after M6 (approved): M7 (package) and M8 (site sections) touch different folders and can run at once, in the existing Package and Site sessions; M9 and M10 need M7's preset format and renderer. M11 last, in Main.

Statuses: proposed · approved · in progress · in review · done

## Feedback

| ID | Owner's request (short) | Status | Commit |
|----|-------------------------|--------|--------|
| F-92 | Paging glitches (the key jumps, the width snaps); instead a loop: five in focus, the next ones faint left and right, no obvious arrows | built 0.16.0: the loop; a frame-by-frame test checks fixed width, a still lit key and a one-way glide, wrapping included | |
| F-91 | A README with the latest: demo images and video, plain language, what it is, how it works, how to use it | built 0.15.0: README with an animated demo, state, emotion, palette and site pictures, quick start, SDK mapping, props; media rendered from the real component | |
| F-90 | Eight emotions wrap into an uneven second row with an awkward gap: keep five per bar, with a switch to the rest | built 0.14.1: five at a time on one row (most used first), an arrow at the end turns to the rest; fits a 375 px phone | |
| F-89 | Link previews show the title starting lowercase ("an audio-reactive orb…"); capitalise it | built 0.14.0: "Talking Marble: An audio-reactive orb…" (iMessage drops the site name, so the rest leads) | |
| F-88 | Nothing in the project may name the owner's company or anything tied to it: this is a personal project | checked 2026-11-24: no mention in tracked files or on GitHub (the published history was squashed clean at 0.13.1); old local branches `milestone/*` still hold earlier commits that do, never pushed | |
| F-87 | Are emotions needed? If yes, add more | built 0.14.0: kept (tone without a new state), eight now: happy, excited, calm, curious, surprised, concerned, sad, muted | |
| F-86 | Create your own: name your marble | built 0.14.0: a Name step first; the name is the `label` and, made plain, its state's preset name | |
| F-85 | Docs top bar: liquid glass, not black, with a subtle light along the bottom edge | built 0.14.0 | |
| F-84 | Docs page too condensed (no space between text and code…); update content where needed | built 0.14.0: more space throughout, code panels opened up; states, emotions and `scan` documented | |
| F-83 | A new state, searching: a magnifier-like effect, the pattern streaming out from the centre like a Doppler effect | built 0.14.0: `searching` and its parameter `scan` (lens, outward stream, a ping of light) | |
| F-82 | The fog's patterns random every time, moving naturally, so each visitor sees different ones | built 0.13.0: a fresh seed and clock per visit; its shapes morph as they drift | |
| F-81 | Make the marketing site live, on Vercel; is a plan needed? | built 0.13.1: `vercel.json`, address talking-marble.vercel.app, CI checks only; deployed by the owner 2026-11-24, checked live (home, docs, llms.txt, sitemap, robots; no console errors) | |
| F-80 | The magnet: smooth, not sudden; pull only when close to the overview or Create, not after a small scroll | built 0.13.0: within 0.28 screens of a place, an eased glide of 0.5–1 s; any input stops it | |
| F-79 | After F-76 there was barely any light at the top; turn it up | built 0.12.1 | |
| F-78 | Platforms: no "soon"; cover every device, web or app, phone or laptop | built 0.12.0: the Guide and docs list where it runs today (React, Phones, Tablets, Laptops, Desktop apps); native ports proposed as PLAT-01, waiting for approval | |
| F-77 | Remove light mode and the switch; dark only | built 0.12.0 | |
| F-76 | The top light: subtle, short, no fan of parallel lines; sunlight mixed with white | built 0.12.0 | |
| F-75 | The hero title back on one line | built 0.12.0 | |
| F-74 | The top light needs depth, like real light: layered, scattered, varied | built 0.12.0 (refined by F-76) | |
| F-73 | Type like MoMA's, a fashion-magazine mix: a Franklin Gothic for headlines and labels, the system font kept for reading | built 0.12.0: Libre Franklin (Google Fonts) as `--display`; small tracked uppercase kickers | |
| F-72 | The light at the top should glow | built 0.12.0: a bright source along the top edge, a soft bloom, a slow breath | |
| F-71 | Switch bars slide: the lit key moves left and right instead of switching on and off | built 0.12.0 | |
| F-70 | Create's switch bar always has one step chosen, Colours first | built 0.12.0 | |
| F-69 | Easy to scroll past Create to the Guide | built 0.12.0 (with F-67) | |
| F-68 | The overview sits too high; centre it | built 0.12.0 | |
| F-67 | Scrolling past the last marble should settle on the overview like a magnet, not stop between or overshoot | built 0.12.0: every shot and marble is a resting place | |
| F-66 | The intro's changing demo should show its current state under the marble | built 0.12.0: the state's name in plain tracked type, dissolving between words (no box, no dot) | |
| F-46 | Renovate the docs page: the latest updates, restyled clean with the home page's textures and lighting | built 0.11.4; owner review pending | |
| F-65 | A slider to adjust the halo | built 0.12.0: `halo` takes a strength (0–1.5); a Halo slider in Create › Try it | |
| F-64 | The glow, especially the halo, a little too strong, in the package too | built 0.12.0: the package's halo about a quarter softer | |
| F-63 | Create needs ways to try states, emotions and the rest, opened in two levels, not all at once | built 0.12.0 | |
| F-62 | Create's steps as a switch bar; "Name it" becomes "Code" | built 0.12.0 | |
| F-61 | Create starts as a plain globe, not a palette | built 0.12.0 | |
| F-60 | No "Pick one" or See all: the walk zooms out to all six in two rows of three with names, then zooms in to Create | built 0.12.0 | |
| F-59 | The gallery's marbles move up and down while walking; keep them aligned | built 0.12.0 | |
| F-58 | A little more space between the logo and name and the top of the page | built 0.11.9; owner review pending | |
| F-57 | Light from the top, aurora-like: even at the sides, stronger and reaching lower in the centre, strongest at the top, scattering downward | built 0.11.9; owner review pending | |
| F-56 | The push is circular and covers too much: realistic, less sensitive, smaller | built 0.11.8; owner review pending | |
| F-55 | The cursor feels like a strong fan: make it a natural hand through mist | built 0.11.7; owner review pending | |
| F-54 | 3D is laggy: back to a black stage with 2D fog (an illusion of depth) that moves like real air when the pointer passes through; optimise everything, marble included, for all devices | built 0.11.6; owner review pending | |
| F-53 | Remove the floor rings; textured ground fog instead | done in F-54 (rings removed, fog replaced) | |
| F-52 | Gallery scroll is magnetic: settle on the nearest marble | built 0.11.6; owner review pending | |
| F-51 | A horizontal cut under the marble's glow | fixed: the opaque ground that caused it is gone | |
| F-50 | Realistic volumetric fog, night sky, curved ground | built, then replaced by F-54 (too heavy) | |
| F-49 | The fog glitches (darts left and right), the mountains look fake and cut off, and they show through the middle of the ground | built 0.11.5; owner review pending | |
| F-48 | The intro's point of light to marble shows a hard cut | built 0.11.4; owner review pending | |
| F-47 | On refresh, scattered colour flashes on the floor to the right of the marble | built 0.11.4; owner review pending | |
| F-46 | No cursor light: the fog reacts like real fog; the marble's place in nature, a mountain at high elevation | built 0.11.4; owner review pending | |
| F-45 | Talk and the palette arrows in the middle of the page, not under the marble | built 0.11.4; owner review pending | |
| F-44 | Coloured text and accents carry the marble's own texture, animated like it, not flat colour | built 0.11.4; owner review pending | |
| F-43 | The floor under the marble is a 3D plane that extends from it | built 0.11.4; owner review pending | |
| F-42 | The slabs and beam look random and cheap: instead a subtle, mystical cloud fog, like an artist's | built 0.11.4; owner review pending | |
| F-41 | Switch bars and the toggle glitch (resize) when changed; the toggle a touch smaller; Talk and the palette stepper by the marble at the bottom, minimal and spaced | built 0.11.2; owner review pending | |
| F-40 | The background answers hover: lighting and contrast reveal more, rather than just appearing | carried into the fog (F-42) | |
| F-39 | The background gets texture and light with abstract depth | built 0.11.2, then replaced by the fog (F-42) | |
| F-38 | The floor rings sit off-centre from the marble | built 0.11.2; owner review pending | |
| F-37 | The walk's controls are too wordy and too regular: switch bars for state and emotion, a toggle for halo, in a black-and-white, contrasty, glass style with light (the owner's "spirit UI"); other buttons keep the marble touches | built 0.11.2; owner review pending | |
| F-36 | The walk's marbles are too close: wider apart, one in focus at a time | built 0.11.2; owner review pending | |
| F-35 | Most buttons flip white/black on hover; the pigment ring only on a few, for balance and difference | built 0.11.2; owner review pending | |
| F-34 | The code needs its own styling (not bare text): like libraries.dev/orbs' install (inspiration): a panel, Install and Usage blocks with Copy, platform words, Copy prompt | built 0.11.2; owner review pending | |
| F-33 | The footer is condensed: mixed text sizes, too much, text and icons out of balance | built 0.11.2; owner review pending | |
| F-32 | A footer: light/dark toggle, the copyright, follow on X and GitHub (@imjustinliao) with their icons | built 0.11.0 (M13); owner review pending | |
| F-31 | The logo and name bigger, centred at the top; nothing else in the top bar | built 0.11.0 (M13); owner review pending | |
| F-30 | No Docs/GitHub at the top right (the shot index is the nav): Docs and GitHub as buttons (icon + text) in the intro and the Guide | built 0.11.0 (M13); owner review pending | |
| F-29 | The Guide is super ugly: minimal, only what's needed, then a Docs button to the full docs | built 0.11.0 (M13); owner review pending | |
| F-28 | Theme the UI around the marble (its light, colours, textures) in some places, so it all feels like one thing | built 0.11.0 (M13); owner review pending | |
| F-27 | The index's hover label: plain text, no pill | built 0.11.0 (M13); owner review pending | |
| F-26 | The intro gets Docs and GitHub buttons | built 0.11.0 (M13); owner review pending | |
| F-25 | Never show "Scroll to try it" | built 0.11.0 (M13); owner review pending | |
| F-24 | The Install shot is a mess (tabs, boxed code, dropdown) | built 0.11.0 (M13); owner review pending | |
| F-23 | The background textures look like stains; use real textures, sound as ink around the marble | built 0.11.0 (M13); owner review pending | |
| F-22 | Rethink the flow: intro → walk the palettes trying states, emotions, halo and talking → zoom out → create your own → guide; the playground is too condensed, its popup bad | built 0.11.0 (M13); owner review pending | |
| F-21 | In context (and every other small marble) wears the palette picked in the gallery | built 0.10.9; owner review pending | |
| F-20 | Yours looks like Pearl; it should start unstyled | built 0.10.9; owner review pending | |
| F-19 (superseded by F-60) | After the walk (02), the scroll ends on a centred "Pick one" with a button; clicking it zooms out over every marble plus Yours | built 0.10.9; owner review pending | |
| F-18 | Colors shot styling: awkward empty gap right of the name; Edit (and any expanding) must not move things up or down; find the same elsewhere | built 0.10.9; owner review pending | |
| F-17 | Camera distance must change: start far (marble small), push in as you scroll, vary distance between shots; lost in the current build | built, merged 0.10.5; owner review pending | |
| F-16 | Far too much lighting; unnatural light at the bottom; remove the left edge light and every added light, keep only the marble's own (halo, its light pool and reflection) | in docs/design.md › `/` (F-14 withdrawn); built, merged 0.10.5; owner review pending | |
| F-15 | Restore the earlier `ffcbb19` experience (intro, camera tracking along the palette gallery of "parallel universe" marbles, pick carried through) first in the scroll, then the sections as later shots | built, merged 0.10.5; owner review pending | |
| F-14 | The lines at the left edge while scrolling become a soft edge light with real-world falloff | built (0.10.2), then withdrawn by the owner (F-16) | |
| F-13 | "Everything concentrated and disorganized, too much info": an information hierarchy per shot; show the necessary thing, the rest only on request | in docs/design.md › `/`; Site session (M12) | |
| F-12 | "This styling is horrible" (States shot: scene marble + framed panel with a second marble, boxed card grid, inner scrollbar): one marble, no boxes, states as words, small sizes as one line, balanced shots | in docs/design.md › `/`; Site session (M12) | |
| F-11 | "Bring camera back": the site felt like a flat marketing site; restore the scroll camera over the sections | M12, Site session | |
| F-10 | Dark by default for every visitor (the site followed the system), light mode by toggle | done, merged 0.8.3 | |
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
- **2026-11-23** (Main, owner asked Main to manage the sessions' questions): the hero's state cycle stops at the happy path (idle → speaking); `error` is shown where states are chosen. M7's derived motion rates (wave angle, ripple and beat rates) stay derived, not preset fields: fewer knobs, add later if developers ask. A moving marble is not hard-clipped to its box (that would crop the halo); the docs give the 20% edge-room note instead.
- **2026-11-23** (owner, F-54): The stage is plain black with a 2D fluid-simulated fog (pointer = moving air), not a 3D raymarched atmosphere: the 3D version was laggy on the owner's laptop. Considered: WebGL2 raymarching (built, too heavy), three.js (same shader plus weight), pre-rendered Blender video (can't follow the camera or the pointer), WebGPU (support still uneven). Performance tiers decide frame rates and resolutions; marbles render at most 2×.
- **2026-11-23** (owner): The site's flow is rebuilt as Intro → Palettes (try and talk) → Pick → Create your own → Guide (F-22). In context lives inside Talk; Talk uses the mic plus a simulated reply until a real voice model (backend, later); Create your own runs in steps; M10 merged first. Rejected: keeping States, In context and Playground as their own shots.
- **2026-11-23** (owner): First push to GitHub. Published as one clean commit (`415ac36`) on top of `Initial commit`, because the public repo must not mention other projects and the local history did; its full local history was kept on a local branch, deleted 2026-11-24 at the owner's request. The Pages deploy is gated behind the repository variable `DEPLOY_PAGES` (owner turns it on with Pages).
- **2026-11-23** (owner): Re-scope to the overall spec approved with defaults: no colour shifts in built-in states (Q-1); keep palette editing with Reset in the playground, centred roomy layout, short one-action buttons, drop the display face (Q-2); `packages/core`, `packages/react` (npm `talking-marble`), `apps/site` (Q-3). The scroll-camera site is superseded.
- **2026-11-23** (owner): npm package name `talking-marble`. Matches the repo and is distinctive. Rejected: `voice-orb` (generic), `marble-orb`, the scoped fallback.
- **2026-11-23** (owner): The orb shader and design (from the owner's earlier, private projects) are Justin Liao's own and may be released under MIT, © Justin Liao. Talking Marble is Justin Liao's personal project.
- **2026-11-23** (owner): Milestones M1–M5 approved with working defaults (auto-commit, `MAJOR.MINOR.PATCH - What` commits, work on `main`, push at milestone end after sign-off). Run in parallel after M1.
- **2026-11-23** (owner): Design and architecture approved with defaults: site follows system theme with a toggle; state looks as drafted, tuned live in the playground; React-only in v1 (renderer framework-free).
- **2026-11-23** (owner): MVP features approved as written in docs/product.md.

## Blockers and waiting on the owner


## Session log

<!-- - **YYYY-MM-DD** (agent, tool): one line. Keep the last ~10. -->
- **2026-11-24** (Claude Opus 5.5, Claude Code desktop): Picked up from "Repository review - v0" after the owner's Vercel deploy; checked the live site. Built F-83 to F-89 (0.14.0).
- **2026-11-23** (owner): Second push: 0.11.0 to 0.13.1 published as one clean commit on top of 0.8.5, because one local commit mentioned another project; the local archive branches of the step-by-step history were deleted 2026-11-24 at the owner's request (never pushed, not needed). Hosting moved to Vercel (F-81).
- **2026-11-23** (Claude Opus 5.5, Claude Code desktop): Took over after the other account stopped (Main `7c9abdb5` hit its limit; `17dfe1c4` merged M12 and launched M10, which never ran). Restarted M10 in a new Site session. Built M13 (new flow, Talk, Create your own, minimal Guide, ink floor, marble-themed chrome; F-22 to F-32) and F-18–F-21 on main (fixed layouts, pick prompt + See all, unpainted Yours, small marbles wear the pick); full e2e green after two fixes.
- **2026-11-23** (Claude Sonnet 5.5, Claude Code desktop): Resumed after the usage-limit stop; Site session had finished M12. Verified (60 unit, typecheck, build, 83 e2e) and merged `milestone/camera` at 0.10.5. Not pushed.
- **2026-11-23** (Claude Opus 5.5, Claude Code desktop): Fresh-eyes review of M1: fixed 7 bugs (stretching, dev warning, freeze on scroll, style.transform, invalid presets, context release, dt cap) + source condition rename + palette slots; halo and context-loss recovery handed to M3. Contracts frozen at 0.1.1.
- **2026-11-23** (Claude Opus 5.5, Claude Code desktop): M1 built: core/, package (6.4 kB gzip), bare site, 9 unit tests + Playwright render test green. Docs upgraded to skill 0.5.0 (live preview).
- **2026-11-23** (Claude Opus 5.5, Claude Code desktop): Setup done: docs, plan, throwaway prototype at localhost:4173. Starting M1.
