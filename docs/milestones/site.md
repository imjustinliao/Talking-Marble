# M4 Site: showcase, playground, docs: report

Branch: `milestone/site` (cut from local `main` at `98a565a 0.1.2`) · Commits: `0.4.0 - Site hero, playground, docs and recipes with e2e and axe tests` · `0.4.1 - Deploy the site to GitHub Pages from main` · `0.4.2 - Fix phone-width overflow, top bar and slider layout` · `0.4.3 - Fix review findings and add the site milestone report` · `0.4.4 - Add orb icons, link-preview image and video, SEO and llms.txt` · `0.4.5` (F-4 redesign) · `0.4.6` (F-5 experience) · `0.4.7`–`0.4.8` (review fixes) · `0.4.9` (owner feedback: palettes flow, liquid glass, color picker) · `0.4.10` (`orbProps`, every screen size)

## Built (requirement IDs)

- **SITE-01**: one page, anchors `#playground`, `#docs` (plus `#install`, `#quick-start`, `#props`, `#audio-sources`, `#states`, `#recipes`, `#recipe-*`). Hero: large decorative orb cycling the six states (3.2 s each; simulated voice level in listening and speaking), pitch, `npm i talking-marble` with copy, "Try with your mic" (scrolls to the playground and asks for the mic). Docs: install, quick start, props table (from architecture › Interfaces), audio sources, states and custom presets (with the parameter table from `core/spec.md`), recipes for OpenAI Realtime (Agents SDK + plain WebRTC), ElevenLabs Agents and LiveKit Agents. Footer: GitHub, npm, MIT © Justin Liao. Sticky top bar with skip link and theme toggle (System → Light → Dark, remembered in `localStorage`, applied before first paint).
- **SITE-02**: playground with state (six built-ins + `muted`, `happy`, `calm` via `presets`), six palettes + four `<input type="color">` pickers (editing one switches to custom colors), size 48–400 px, audio source (None / Microphone / Simulated voice / Level slider), halo toggle. Outputs: generated JSX and the current state's full preset JSON (`resolveState`), each with a copy button ("Copied", announced). Mic is requested only on click; denied / no device / no `mediaDevices` / the track ending later show a specific message (always-present `role="alert"` live region) and switch to the level slider; a request that resolves after the visitor picked another source or left is stopped and ignored; "audio never leaves the browser" sits next to the buttons. Picking a source that moves the orb while a still state is selected switches to `speaking`. The accent token follows the playground palette's pigment 1.
- **SITE-03**: `.github/workflows/pages.yml`: on push to `main` (and manual dispatch), pnpm install (frozen lockfile), `pnpm build` with `GITHUB_PAGES=1`, `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5` (`site/dist`), `actions/deploy-pages@v5`; checkout@v7, pnpm/action-setup@v6, setup-node@v7 (Node 26). Majors checked with `gh api repos/<action>/releases/latest` on 2026-11-23.

## Defaults chosen (ambiguity → choice)

- Playground starts on `speaking` + simulated voice, Pearl, 280 px, halo on, so it is alive on arrival.
- Hero orb follows the playground palette; it is decorative (`aria-hidden`), so the playground orb is the page's only `role="img"` orb (keeps Main's `e2e/render.spec.ts` working unchanged).
- Theme toggle cycles three values (System, Light, Dark) rather than a two-way switch, so "follow the system" can be restored.
- Light tokens: background `#f6f4ee`, surface `#efece4`, foreground `#1b1c20`, muted `#55555b` (6.3:1), border `#c9c5ba` (dividers), control `#85827a` (control borders, ≥3:1), destructive `#b0261b`. Dark: `#0d0e11`, `#16171b`, `#ecebe6`, `#a3a29c` (7:1), `#393a40`, control `#6b6c73`, `#ff8f84`. Added token beyond design.md: `--control`, `--surface`, `--focus`. `--accent` is set at runtime from the palette and used only for decoration (dots, halo toggle), never for text or control boundaries; sliders and focus rings use the foreground color.
- Preset JSON shows every parameter of the current state, keyed by its name, ready for `presets`.
- No syntax highlighter (plain `<pre>`), to keep the site lean.
- The simulated voice is the prototype's formula (`site/src/simulated.ts`), driven into `level` at up to 30 fps by a small hook.

## Deviations from the docs or contracts

- design.md lists "sample clip" as an audio source; the task asked for "simulated voice", which is what is built (no audio file shipped).
- None to the API: the site uses only `TalkingMarble`, `palettes`, `states`, `resolveState`, `muted`, `happy`, `calm` and types.

## Integration steps for the coordinator

1. Merge `milestone/site`. Files outside Site's area that it touches: none committed. `pnpm-lock.yaml` is **not** committed (Main owns it): after merging, run `pnpm install` to add `@axe-core/playwright` (site devDependency, `^4.14.0`) to the lockfile and commit it; the Pages workflow uses `--frozen-lockfile`.
2. The axe spec resolves `@axe-core/playwright` from `site/` with `createRequire` (root dev tools are Main's). If Main prefers, move it to the root devDependencies and replace that line with a plain import.
3. `prototype/` can be deleted now that the playground replaces it (Main's call). `.claude/launch.json` › site still points at 5173 and works unchanged.
4. Owner, before the first deploy: Settings › Pages › Source: GitHub Actions; the workflow runs on the next push to `main`.

## Waiting on Package (`audio`, `halo`)

- **Microphone**: the stream is passed to `audio` (and stopped when switching away or leaving). Until M2 merges, the orb does not react to the mic; the UI still works (permission, messages, state switch). Simulated voice and the slider drive `level` and work today.
- **Halo**: the toggle passes `halo` and updates the generated code; nothing visible changes until M3 draws the halo.
- **WebGL2 unavailable**: the playground shows a note when the component reports `data-ready="false"` (it does today); the fallback picture itself comes with M3.
- The recipes and docs describe the post-M2 behavior (audio reacts, AudioContext resumes on a gesture).

## Review

A fresh-eyes review subagent found 9 issues; fixed in `0.4.3`: mic request race and stream leak, live regions that could be missed, a flaky clipboard assertion, a browser-dependent denial test, an untested release, an untyped quick-start sample, the workflow deploying without typecheck/tests (now runs `pnpm typecheck && pnpm test`; `deploy` only on `main`), the missing WebGL2 note, and low-contrast control borders and slider accent. Not fixable here: the mic and halo do nothing visible until Package's M2/M3 merge (above).

## Contract changes requested

None.

## External dependencies found

- `@axe-core/playwright` (site devDependency) for the axe checks.
- Recipes cite these SDKs (docs only, not dependencies): `@openai/agents-realtime` 0.22, `@elevenlabs/react` 1.23, `@livekit/components-react` 2.9 — checked against their GitHub source and official docs on 2026-11-23:
  - OpenAI: https://developers.openai.com/api/docs/guides/realtime-webrtc, https://developers.openai.com/api/docs/guides/realtime-conversations, https://github.com/openai/openai-agents-js/tree/main/packages/agents-realtime/src
  - ElevenLabs: https://github.com/elevenlabs/packages/tree/main/packages/react/src/conversation, https://elevenlabs.io/docs/agents-platform/libraries/react
  - LiveKit: https://github.com/livekit/components-js/blob/main/packages/react/src/hooks/useVoiceAssistant.ts, https://github.com/livekit/components-js/blob/main/packages/react/src/hooks/useAgent.ts, https://docs.livekit.io/frontends/build/agent-state.md
- **Unverified / caveats** (the recipes were not run against live services, no keys):
  - OpenAI `output_audio_buffer.started` / `.stopped` / `.cleared` are not in the current official docs; OpenAI staff on the community forum and the openai-java types say they still fire over WebRTC. The docs page adds a fallback (`response.created` / `response.done`).
  - Over WebRTC the Agents SDK's own `audio_start` / `audio_interrupted` do not fire (read from source), hence `transport_event`.
  - ElevenLabs 1.x needs `<ConversationProvider>` (README and source; its docs page does not mention it). No public output `MediaStream`, so the recipe polls `getOutputVolume()` / `getInputVolume()` into `level`.
  - LiveKit `useVoiceAssistant` is called "legacy" in a doc comment in favor of `useAgent` (track field `microphoneTrack`); the recipe uses `useVoiceAssistant` because it needs only the room context and was verified; the `useAgent` + `useSession` wiring was not.
  - `changePeerConnection` on `OpenAIRealtimeWebRTC` is read from source; its exact return-type requirement was not compiled against.

## Follow-up: icons, link previews, SEO and AI-SEO (0.4.4, owner request 2026-11-23)

### What was added

- **One render script**: `pnpm --filter site media` (`site/scripts/render-media.mjs`). It starts Vite on a dev-only page (`site/media.html` + `site/src/media.tsx`, not in the build) that lays out the real `<TalkingMarble>`, drives it with Playwright on a fake clock (frame-exact) and encodes with ffmpeg. It writes into `site/public/` (committed, so the site works without running it). Needs ffmpeg on PATH (or `FFMPEG=`); uses port 5176 (or `MEDIA_PORT=`). **Re-run it after the orb redesign lands**: everything below is rendered from the current component (Pearl palette, no halo yet).
- **Icons**: `favicon.ico` (16/32/48, PNG entries), `favicon.svg` (wraps a 128 px render: the shader cannot be vector art), `apple-touch-icon.png` (180, opaque dark), `icon-192.png`, `icon-512.png` (transparent), `icon-maskable-512.png` (orb at 66% inside the 80% safe zone), `site.webmanifest`. `theme-color` for light (`#f6f4ee`) and dark (`#0d0e11`).
- **Link previews**: Open Graph (`type`, `site_name`, `locale`, `url`, `title`, `description`, `image` + `secure_url`/`type`/`width`/`height`/`alt`, `video` + `secure_url`/`type`/`width`/`height`) and X (`summary_large_image`, title, description, image, alt). `og-image.jpg` 1200×630, 45 kB: the orb, name, tagline and install line on the site's dark background. `og-video.mp4` 1200×630, H.264 High, yuv420p, faststart, no audio, 30 fps, 6 s seamless loop (idle → listening → thinking → speaking → idle; the last 0.5 s crossfades into the start), 226 kB. Same aspect as the image (iMessage letterboxes otherwise).
- **SEO**: title, description, self-referencing absolute canonical, JSON-LD `@graph` with `WebSite` and `SoftwareSourceCode` (repository, language, license, author), `sitemap.xml`, a `<noscript>` summary. All tags are static in `index.html` (unfurlers do not run JS). Absolute URLs from the one base `https://imjustinliao.github.io/Talking-Marble/`; Vite rewrites the icon/manifest links to `/Talking-Marble/…` in the Pages build.
- **AI-SEO**: `llms.txt` per llmstxt.org (H1, summary, key API facts inline, linked docs sections, an `Optional` section), linked from the head with `rel="alternate"`. `robots.txt` allows all, including AI crawlers.

### Defaults and deviations

- The card image carries the name and tagline as the brief asked, although Apple's guidance prefers images without text (the title shows anyway). The video uses the same composition.
- No `llms-full.txt`: it is a community convention, not part of the llmstxt.org spec, and a second copy of the docs would drift; `llms.txt` carries the key API facts instead.
- No `SoftwareApplication` markup: Google's rich result requires `offers` and a rating/review, which a free library without reviews does not have. `SoftwareSourceCode` is not a Google rich result either; it is there for other consumers. No FAQ block: Google no longer shows FAQ rich results for most sites, and the docs already answer the questions directly.
- Stable file names (`og-image.jpg`, `og-video.mp4`). Facebook and others cache by URL; if a re-render must show up in already-cached previews, rename the files (and the tags) or use each platform's re-scrape tool.

### Needs attention from Main or the owner

- **robots.txt has no effect at `/Talking-Marble/robots.txt`**: crawlers read it only at a host's root (`imjustinliao.github.io/robots.txt`, i.e. the owner's user-site repo). With no robots.txt there, everything is already allowed. It is shipped as documentation and works if the site moves to its own domain. Submit `https://imjustinliao.github.io/Talking-Marble/sitemap.xml` in Google Search Console after the first deploy.
- The npm link in the JSON-LD and footer 404s until `talking-marble` is published (M5).
- Online validators (Facebook Sharing Debugger, LinkedIn Post Inspector, opengraph.xyz, Google Rich Results Test) need the public URL, so they were not run; run them after the first Pages deploy. iMessage inline video was not tried on a device.

### Sources (checked 2026-11-23)

- Open Graph: https://ogp.me/
- X cards: https://developer.x.com/cards/markup (blocked to automated fetches; facts from archived https://dev.twitter.com/cards/types/summary-large-image: 2:1, min 300×157, under 5 MB). UNVERIFIED: X's fallback to `og:*` for title/description/image.
- Apple rich links: https://developer.apple.com/videos/play/tech-talks/205 (static tags, og:video as a direct file plays inline muted and looped, icon fallback, 10 MB total). UNVERIFIED (secondary sources): H.264 MP4 with faststart, matching the image's aspect ratio.
- Slack: https://docs.slack.dev/messaging/unfurling-links-in-messages · Discord: https://docs.discord.com/developers/link-previews/overview · LinkedIn: https://www.linkedin.com/help/linkedin/answer/a521928 (1200×627, 5 MB) · WhatsApp: https://developers.facebook.com/documentation/business-messaging/whatsapp/link-previews/ (absolute URL, under 600 kB; UNVERIFIED reports of 300 kB, so the test enforces 300 kB) · Facebook: https://developers.facebook.com/docs/sharing/webmasters/images (1200×630, 8 MB)
- Icons: https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs · https://web.dev/articles/maskable-icon · https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/theme-color
- Google: https://developers.google.com/search/docs/appearance/title-link · https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls · https://developers.google.com/search/docs/appearance/structured-data/software-app · https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt · https://developers.google.com/search/docs/appearance/ai-features (no special markup or files needed for AI Overviews)
- AI crawlers: https://llmstxt.org/ · https://developers.openai.com/api/docs/bots · https://support.claude.com/en/articles/8896518 · https://docs.perplexity.ai/guides/bots · https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers · https://support.apple.com/en-us/119829 · https://commoncrawl.org/ccbot

### Verification

- `pnpm --filter site media`: renders all eight files (sizes above); frames 0 and 179 of the video match (seamless).
- New `e2e/site-meta.spec.ts`: builds with `GITHUB_PAGES=1` into a temp folder and serves it under `/Talking-Marble/` on a free port (so it never takes a fixed port), then checks every head tag and its absolute URL, the JSON-LD, that every icon/manifest/llms/robots/sitemap/image/video URL returns 200, real pixel sizes against `og:image:*`, `og:video:*` (MP4 `tkhd`), the manifest `sizes` and the ICO entries, the image under 300 kB, and that `media.html` is not shipped. `E2E_PORT=5177 pnpm test:e2e`: 18 passed. Both builds, typecheck and unit tests pass.

## F-4 + F-5: the site as an experience (0.4.5–0.4.6, owner requests 2026-11-23)

### What was built

- **`/`: one continuous CSS 3D scene and a scroll camera** (`site/src/scene/`, `site/src/home/`). A fixed perspective viewport; the camera is the inverse transform on the world. Inside the world: a black stage, a glossy floor sheen, the marble's light pool, a horizon glow, dust motes at three depths (canvas-drawn textures drifting slowly), the main marble (the real `TalkingMarble`, billboarded to face the camera, with a `-webkit-box-reflect` reflection), and the gallery curve. Over everything: an animated film grain and a vignette.
- **Camera** (`scene/camera.ts`): keyframed poses (position, yaw, pitch) per shot. Scroll position (in screens) maps to the path with a dwell easing, so each shot holds still while its words are on screen. A critically damped spring follows in real time with sub-steps (no slow motion on slow frames, no overshoot). Phones get their own gentler poses.
- **Shots**:
  1. Wide hero: name, line, install pill (copy) and a "Usage" two-line snippet on request, **Talk to it**.
  2. Dolly in and truck: the marble large on the left; a glass dials panel on the right with a word drum (state and emotion), Flow / Energy / Glow / Size sliders, a palette, and **Copy code**. Touched dials become a preset of the same name merged over the built-in. On phones it is a bottom sheet.
  3. Macro push-in: the guided conversation (speech, captions word by word, mic or simulated voice) and the word drum.
  4. Crane up and track: the gallery curve of 15 marbles (6 states, 3 emotions, 6 palettes). The nearest 1–3 are live once the walk settles; the rest are webp stills. Enter or click brings one forward in a modal with **Copy preset** and **Open in the dials**.
  5. Pull back low and to one side: install and three lines of usage, **Read the docs →**, GitHub, npm, footer.
- **Intro on every load** (about 2.5 s): a point of light swells into the marble (connecting, then idle), the name's letters arrive one by one, and the camera draws back into the wide shot. Any click, key, wheel or touch skips it. Reduced motion: no intro, no camera moves; shots change in place with a short fade, and the gallery steps.
- **Text and controls belong to a shot**: each overlay fades with how present its shot is, and inactive shots are `inert` and `aria-hidden`. Keyboard: Page Up / Page Down, Home / End and a minimal index (01–05) at the right edge; a thin progress line at the left edge.
- **`/docs/`**: the same reference (install, quick start, props, audio sources, states and presets, **Customize** (new), recipes) as a calm reading page on the same stage with grain, and no camera. Real HTML with its own canonical URL, Open Graph tags and JSON-LD (`TechArticle`, `BreadcrumbList`). It is a second Vite input; the sitemap and `llms.txt` list it.
- **Identity**: Talking Marble's own.
  - System type, no web fonts (SF Pro / Segoe UI / Roboto). The Arimo files were removed.
  - Capsule buttons: the primary is a white "lamp" that throws a soft halo when pointed at; the ghost carries a small light that follows the pointer.
  - Small labels: a mono index number plus spaced capitals.
  - Glass panels with a fine grain.
- **Review fixes folded in** (from a fresh-eyes review of the F-4 version):
  - The mic is stopped if it is granted after End.
  - Focus returns to the start button when a conversation ends, and to the marble when the dialog closes.
  - The dialog makes the rest of the page inert.
  - The speech voice list is preloaded, speech is primed inside the click for iOS, and a voice that is still talking is no longer cut off.
  - Drum words keep their contrast.
  - Gallery marbles go live only once the walk settles, so no new WebGL context is made per step passed, and the gallery's live region announces only where the walk settles.

### Defaults chosen

- Shot order and labels: Marble, Adjust, Talk, Gallery, Install. URL hashes `#wide`, `#adjust`, `#talk`, `#gallery`, `#install` open at a shot.
- Dials apply to the marble in shot 2. The palette carries to every shot; size applies in shot 2 only.
- "Glow" maps to the `halo` parameter and also brightens the light pool on the floor, so it is visible before the package draws the halo (M3).
- Leaving the talk shot ends the conversation. The main marble fades out in the gallery so the curve has the frame.
- The playground's audio-source tabs (mic, slider) were folded into the talk shot, as the F-5 spec has no separate playground.

### Deviations and things to know

- **`e2e/render.spec.ts` (Main's) updated with Main's approval**: only how it reaches the controls changed. It skips the intro with a key press and moves to the adjust shot with Page Down, as a visitor would, then waits 2 s for the camera to settle. Every assertion is unchanged: six states clicked, `data-ready`, coverage > 0.6, spread > 8, the "it flows" frame comparison, and zero console errors from page load (the intro included). The marble is fully in frame in the adjust shot, so no threshold needed changing. The duplicate state loop in `site-page.spec.ts` was trimmed.
- `docs/design.md` still says "Arimo for UI". I used system fonts per Main's later correction ("choose type on its own merits").
- Macro shot sharpness: the package caps the canvas at 512 backing pixels (`MAX_PIXELS` in `render/orb.ts`), so the marble is soft when it fills most of the frame. Raising that cap is Package's call.
- Live WebGL contexts in the worst case: the main marble + 3 in the gallery (0 while the close look is open) + 1 in the close look. Never more than 4 at once.
- Implementation notes for anyone touching the scene:
  - Giant 3D planes are drawn small and scaled, because huge layers exhausted the raster tiles and other layers lost theirs.
  - Opacity is never set on a 3D wrapper, because it flattens the scene.
  - The intro animations stay attached after the intro, because removing them left stale frames.
- Not checked: Safari and Firefox (`-webkit-box-reflect` is missing in Firefox, which shows no reflection), real phones, a real voice (headless has none, so tests use the captions-only path), and a screen reader beyond axe.

### Main's review fixes (0.4.8)

1. **Index on the wrong shot:** the index now marks the shot nearest the camera everywhere, including between shots (`nearestShot` in `scene/camera.ts`), instead of the shot with the most presence, which was zero for all of them between shots.
2. **Empty frame between Talk and Gallery:** the camera now passes through a rising pull-back with the marble in frame. A matching far overlook carries the move from the gallery's end to Install.
3. **Square boxes around stills (and the favicon):** the stage CSS painted `html` black under the "transparent" renders. The render page now forces a transparent `html`/`body`, and every still and icon was re-rendered with real alpha (checked: alpha 0 at the corners).
4. **No marble in Shot 5:** the install camera's yaw had the wrong sign. The marble now sits about 270 px right of centre, beside the words, at any width (the perspective is in px).
5. **Page Down at load:** it works with focus on `<body>` right after the intro in Playwright (new test). It could not be reproduced; most likely the app's browser pane had not given the page keyboard focus. Nothing in the page needs a click first.
- New `e2e/site-path.spec.ts`: walks the whole page in half-screen steps at 1024×768 and 375×812. At every step it asserts a visible marble on screen (effective opacity ≥ 0.3, ≥ 40×40 px in view), that the index marks the nearest shot (computed independently in the test), and no console errors. It also checks Page Down from load.

### Camera path (screenshots)

`test-results/site/` (gitignored), also copied to the shared notes folder `site-camera-path/`:
- intro frames `1280-0-intro-{300,900,1500,2200}ms.png`
- shots `1280-1-wide`, `-2-adjust`, `-3-talk`, `-4a-gallery-start`, `-4b-gallery-mid`, `-4c-gallery-end`, `-5-install`
- in-between frames `1280-path-{0.5,1.5,2.5}`
- the same set at `375-*`
- reduced motion: `1280-reduced-{1-wide,2-adjust,4-gallery}`
- docs: `1280-docs`, `375-docs`

### Verification

- `pnpm build` and `GITHUB_PAGES=1 pnpm build`: pass. `pnpm typecheck`: pass. `pnpm --filter site media`: re-rendered (icons, card, video, 15 gallery stills).
- `E2E_PORT=5177 pnpm test:e2e`: **31 passed** (`render.spec.ts` and `site-path.spec.ts` included). Site specs cover:
  - intro and skip;
  - one live shot at a time;
  - scroll, camera, index and progress;
  - Page Up / Page Down and the index;
  - install copy and usage;
  - the dials (drum, sliders, palette, size, Copy code);
  - reduced motion (no intro, no glide);
  - axe in all five shots and on `/docs/`;
  - the drum by click, keyboard and wheel;
  - the conversation without speech or a mic (state sequence, captions, focus return), End, Esc and leaving the shot;
  - Talk to it from the hero;
  - the mic stream to the marble and its release, including a late grant after End;
  - a real fake-device mic;
  - the gallery: ≤3 live, walk by keys and buttons, the modal with focus and inert, Copy preset, Open in the dials;
  - the docs page;
  - metadata and files in the Pages build.
- No horizontal scroll at 375 px (`scrollWidth` 375) or 1280 px.

## Owner feedback (0.4.9, 2026-11-23)

- **New progression**, with each move passing through a pose that keeps a marble in frame:
  1. **Marble** (intro and hero).
  2. **Colors**: the camera zooms in, then trucks along a curve of the six palettes plus **Yours**. The one in front is recolored in a glass panel (Ground and three pigments); an edited built-in offers **Reset**.
  3. **Pick**: pulled back over the whole curve; choose one (click or arrow keys); **Try it**.
  4. **Talk**: the demo, with your pick, and states and emotions on the drum.
  5. **Install**: the code carries your pick (`palette="name"`, or the four colors when edited or your own).
- **The hero, reorganized** into one column with one rhythm: name, one line (no orphan word), then a single row of **Talk to it** and an install pill holding the command, a copy icon and a usage icon. The usage snippet opens at once; before, it waited on the intro's 2 s animation delay, so it looked dead. The marble is a little larger.
- **No repeated labels**: the "02 ADJUST"-style kickers are gone; the index is the only shot label.
- **A bigger top-left brand**: a 26 px marble and 19 px name.
- **Buttons**: short text, short text with an icon (Docs →, Talk to it ▷, Reset ↺), or an icon alone (copy, usage, steppers).
- **Liquid glass** on panels, code blocks, pills and secondary buttons: a heavy saturated blur of the scene behind, a faint frost, a bright top edge and a dark bottom edge, a sheen, and a soft light that follows the pointer. The primary button stays a white lamp.
- **Our own color picker**, since the browser's popup can't be styled: a saturation/brightness field (a 2D slider with arrow keys, Shift for big steps), a hue rail and a hex field. It is glass, opens upward when there is no room below, and Esc closes it and returns focus.
- **Background texture**: a slow, cloudy low-frequency noise far behind the scene, under the fine grain and the dust. The interactive curve field tried at first was removed on the owner's call.
- **Removed**: the state gallery (and its 15 webp stills), the dials panel and the old playground.
- **Not checked yet**:
  - The demo now shows states and emotions only on the drum. Per-state colors wait on CUST-01 in the package.
  - Live WebGL contexts: up to 8 at once while the curve is on screen (7 palettes plus the main marble). This works in Chromium; old phones may hit their limit.
- **E2E**: 29 passed. New and updated coverage:
  - the colors walk, recolor and reset, and the picker by mouse and keyboard;
  - pick by click and arrows, carried into the install code;
  - `site-path.spec.ts` on the new path;
  - `render.spec.ts` reaches the states through the talk shot with Page Down (Main approved updating it). Quick Page Down presses now chain from the shot the camera is heading to.

## 0.4.10: one place for the selection, every screen size

- **`orbProps(selection)`** (`site/src/palettes.ts`) is the one function that turns the visitor's choice (palette + edits) into TalkingMarble props and the JSX to copy. Both the live marble and the install code use it, so per-state colors and an `emotion` prop (CUST-01) are a one-place change.
- **Curve field**: not included. The owner tried it and asked for it to be removed ("too fake … buggy … actually remove it"). The background texture is the slow nebula noise, the grain and the dust instead.
- **Responsive on all devices**:
  - The phone bottom sheet was shifted right and cut off: `justify-self: end` shrinks an absolutely positioned grid item even with `left: 0; right: 0`. It now stretches.
  - Portrait screens of any width (tablets held upright) use the phone framing and the bottom sheet.
  - Short landscape screens get a compact scale and narrower columns.
  - The projected scene scales with the viewport height (`viewZoom`), so short screens see the same framing, smaller.
- **`site-path.spec.ts`** now walks the whole page at 1024×768, 375×812, 820×1180, 812×375 and 1440×900. At every step it asserts: a marble in frame, the index on the nearest shot, the live shot's content inside the viewport on every edge, no sideways scroll, and no console errors.
- **E2E: 32 passed.** Both builds and typecheck pass.

## Open questions for the owner

- Keep the hero's cycle through `error` (it shows the full lifecycle) or stop at the happy path?

## Verification

- `pnpm build`: pass (package + site, 258 kB JS / 82 kB gzip for the site). `GITHUB_PAGES=1 pnpm build`: pass, assets under `/Talking-Marble/assets/`. Only warnings are the package's existing tsdown notices (`external` deprecated, `tsgo` on TS 7.0), not from the site.
- `pnpm typecheck`: pass. `pnpm test`: 11 unit tests pass (package, unchanged).
- `E2E_PORT=5177 pnpm test:e2e`: 16 passed — Main's `render.spec.ts` plus `site-page.spec.ts` (sections and no console errors/warnings, hero cycles, every state and example preset, palette + color picker, size, sim/slider/none audio, halo, copy buttons with clipboard read-back, theme toggle and persistence, keyboard-only with visible focus, axe WCAG 2.2 AA in light and dark), `site-mic.spec.ts` (denied via Playwright's default, denied stub from the hero button, no device), `site-mic-allowed.spec.ts` (fake mic device: stream to `audio`, state switch, every track `ended` after switching away). The page test ignores Chromium's own "GL Driver Message … GPU stall due to ReadPixels" warnings, which come from the GPU driver, not the page.
- Checked by eye at 1280 and 375 px, both themes, keyboard only; no horizontal scroll at 375 (`scrollWidth` 375). Screenshots (gitignored, regenerate with a Playwright run of the dev server on 5176): `test-results/site/desktop-1280-{light,dark}-{hero,full}.png`, `test-results/site/mobile-375-{light,dark}-{hero,full}.png`, `test-results/site/{desktop-1280,mobile-375}-keyboard-focus.png`.
- Not checked: Safari and Firefox; a real microphone (fake device only); the Pages workflow itself (runs only after Main pushes); a screen reader beyond axe.

## M8 Hero, states, in context (0.8.x, 2026-11-23)

Branch `milestone/site-sections`, cut from `main` at 0.6.2. It replaces the scroll-camera experience; the 0.4.11–0.4.12 experience work stays on `milestone/site` (ffcbb19) and is superseded.

### Built
- **Hero**: the live marble (speaking, simulated voice), "Talking Marble", the plain line "An audio-reactive orb for voice AI apps. React, open source.", the install command as one control (the whole pill copies; the icon turns into a check and screen readers hear "Copied"), and Docs and GitHub links. Centred, roomy.
- **States** (SITE-01/02 slot): a grid of nine cards (six states and three emotions as presets), each with its own live marble (72 px). A card is a button that shows its state in a large preview (220 px, the page's one labelled marble, with `state="…"` and one plain line). Below the grid are the inline pills: a 20 px marble beside "Listening…", "Thinking…", "Speaking…".
- **In context**: three pictures of everyday UIs with live marbles: a chat input bar with a Voice button (32 px, listening), a full-screen call (168 px, speaking) and an inline chat reply (24 px, thinking). They are `aria-hidden` pictures with plain captions; nothing in them is interactive.
- **Footer**: GitHub, npm, MIT © Justin Liao.
- **Themes**: dark by default (`#0b0b0d`); light when the system asks (`#f6f6f4`); a sun/moon toggle in the top bar, remembered and applied before first paint. Tokens: bg, surface, raised, text, text-2, text-3, hairlines, focus and primary, in both themes. System fonts only; the Instrument Serif face was dropped (Q-2).
- **Slots**: `home/main.tsx` marks where `<Playground />` (M9) and `<Install />` (M10) go. `/docs/` still builds (M10 rewrites it).

### Removed
The scroll camera, intro, dust, floor, palette curve, word drum and conversation demo, liquid glass and the pointer light (the `scene/`, `demo/`, `gallery/`, `home/Shots`, `useExperience` and `ui/Marble` code). Their tests went too: `site-demo`, `site-path` and `site-mic-allowed`.

### Kept for later
- `CopyButton`, `Code` and the icons.
- `ColorPicker` (for M9's palette editing).
- `palettes.ts` with `orbProps()` (the code generator).
- `Docs`/`Recipes`.
- The media script and `media.html`, re-rendered.
- The SEO files and the Pages workflow.

### Defaults chosen
- **States**: the cards select into one large preview. That keeps a single labelled marble on the page and gives `render.spec.ts` its six exact-name buttons.
- **Copy**: one line per state, for screen readers (`aria-describedby`) and under the preview.
- **Live marbles mount only near the screen** (`ui/LiveMarble`, an IntersectionObserver with a 120 px margin); offscreen ones are a still CSS gradient in their palette. At most ~13 are live at once (preview, 9 cards, 3 pills), under the browser's ~16 WebGL contexts, and the hero unmounts when scrolled away. M7's shared renderer will lift this.

### Tests (`E2E_PORT=5177 pnpm test:e2e`, 4 workers): **40 passed**
- **`render.spec.ts`**: Main's assertions are unchanged. Only how it reaches the controls changed: it clicks "States" in the nav, as a visitor would.
- **`site-page.spec.ts`**:
  - sections in order;
  - hero copy and links;
  - the install pill with one control;
  - every card live, and choosing one fills the preview;
  - the pills at 20 px;
  - the three in-context UIs with their states;
  - offscreen marbles are not live;
  - themes (default, system light, toggle, remembered);
  - keyboard (skip link, cards, visible focus);
  - axe in both themes on `/` and `/docs/`.
- `site-docs` and `site-meta` pass unchanged.

### Checked
- Both builds and typecheck pass.
- 375 and 1280 px in both themes, reduced motion, keyboard focus and `/docs/`: screenshots in `test-results/site/`.
- No horizontal scroll.

### Waiting on M7
The `emotion` prop and `label`, the new preset names, and the shared renderer (more live marbles at once).
