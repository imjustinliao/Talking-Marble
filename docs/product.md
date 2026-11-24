# Product

> The owner's words, 2026-11-23. Keep their wording and order; interpretations go in Open questions, never into a requirement.
>
> **Re-scoped 2026-11-23 by the owner's overall spec** ("Here is what I want overall"). Status: **approved by the owner 2026-11-23, with the default answers to Q-1 to Q-3** (plan: `docs/progress.md` › Milestones, M6–M11). Items the spec replaced are under "Superseded" at the end, with the reason.

## Pitch

Talking Marble is an open-source (MIT, © Justin Liao) audio-reactive orb for voice AI apps, similar to the orb ChatGPT shows in voice mode. Developers drop it into their own apps, commercial or not. It is only the visual component and never includes the voice AI itself: developers pass in a state and an audio source.

The model to follow is libraries.dev/orbs (thinking-orbs), but for voice. Take its structure and quality bar, not its look or its states.

Talking Marble is Justin Liao's personal project; nothing about other projects appears in the repo (owner, 2026-11-23).

## Users and the core workflow

Developers building voice AI apps (OpenAI Realtime, ElevenLabs, LiveKit and so on) who wire in their own voice AI. They pass their SDK's state straight in, and an audio source: a microphone stream, an audio element or stream, or a raw level from 0 to 1.

## Goals

- v1: the web/React component on npm, and one site in `apps/site` (showcase, playground, install, docs) deployed on Vercel (owner, F-81), running on the real package.
- Platforms (owner, F-78: "all possible devices, web or app, phone or laptop or anything… this is for voice interface applications"): cover as many as possible. v1 is web/React. Electron and Tauri apps get it for free because they run on web tech. Later ports: SwiftUI (iOS, macOS, visionOS, plus a simplified watchOS version), React Native, Android Compose and Flutter. Keep the shader and the presets in a platform-neutral `packages/core` so each port only needs a small renderer.
- Design bar: clean, dark only (owner, F-77), generous spacing, and copy that's plain and literal (no taglines like "spin the words"). It has to look good on a phone as well as desktop.

## MVP features

Stable IDs by area. The boxes are acceptance items: tick one only after it was checked. Never reword or drop a requirement without the owner. ✓ = built and checked on `main` before the re-scope.

### CORE-01: Platform-neutral core
- [x] The shader and the presets live in a platform-neutral `packages/core`, so each port only needs a small renderer ✓
- [x] Developers can add their own states through presets ✓

### ORB-03: Seven built-in states
- [x] `idle`, `connecting`, `listening`, `thinking`, `speaking`, `error`, named the way voice SDKs name them (LiveKit, Deepgram, Stream) ✓
- [x] `searching` for tool calls and lookups: a lens magnifies the centre and the pattern streams out of it (F-83) ✓
- [x] These exact names, so a developer can pass their SDK's state straight in ✓

### EMO-01: Emotions layer on a state
- [x] Emotions (`happy`, `excited`, `calm`, `curious`, `surprised`, `concerned`, `sad`, `muted`) layer on top of a state (an `emotion` prop; eight since F-87) ✓
- [x] They are themselves examples of custom presets (exported today as presets) ✓

### ORB-08: One material in every state
- [ ] The material never changes between states. Only energy, motion and brightness change, and those come from the audio

### CUST-01: Fully customizable
- [x] Colors: any colors, not only the built-in palettes ✓ (`palette` takes four colors)
- [ ] Custom states and emotions defined through a preset object (speed, turbulence, glow, how strongly it reacts to audio, and so on), with plain names and documented ranges

### ORB-02: Audio input
- [x] A microphone stream ✓
- [x] An audio element or stream ✓
- [x] A raw level from 0 to 1 ✓

### ORB-06: Sharp at every size
- [ ] Sharp at every size and screen density, from a 20px inline icon to a full-screen hero (M7: the backing size follows CSS size × device pixel ratio, up to 2×)
- [ ] Small sizes get their own tuning, not just scaling down

### ORB-07: Polish
- [x] A still frame for reduced motion ✓
- [x] Pausing when off screen or when the tab is hidden ✓
- [ ] SSR-safe (renders the fallback on the server today; needs a test that keeps it so)
- [x] A correct accessible name for each state ("Assistant, speaking"; `label` names who it is) ✓

### ORB-01 / ORB-05: The React component, colors and size
- [x] A reusable React component, `<TalkingMarble />`, with colors and size ✓

### SITE-01: Hero
- [ ] The live marble, one plain line saying what it is, the install command with a copy button, and links to GitHub and the docs

### SITE-02: State showcase
- [ ] A grid of every state and emotion animating live, each labeled
- [ ] Like the libraries.dev grid, but with the marble at different sizes, including small inline pills (for example "Listening…" next to a 20px marble)

### SITE-03: In context
- [ ] The marble inside realistic UIs: a chat input bar (like ChatGPT voice mode), a full-screen call view, and an inline chat message

### SITE-04: Playground
- [ ] The controls from the localhost:4173 prototype, moved into the site: state, emotion, palette plus a custom color picker, size, the audio source (simulated voice, your mic, level slider) (superseded by Create your own, F-22)
- [ ] Shows the exact code for the current settings live and can export a preset
- [ ] Developers can design their own state here and copy it out

### SITE-05: Install
- [ ] Where it runs today, by device (F-78): React, so every phone, tablet, laptop and desktop with a modern browser, and Electron and Tauri apps. A native platform is listed only once it ships, never as "soon"; the ports are PLAT-01
- [ ] The install command, minimal usage, and how to connect common voice SDKs (LiveKit, ElevenLabs, OpenAI Realtime), each in a few lines

### SITE-06: Docs
- [ ] A props table, the preset format, the audio options, accessibility and performance notes

### SITE-07: Footer
- [ ] GitHub, MIT © Justin Liao (npm once published)

### SITE-09: The camera experience (owner, 2026-11-23, F-11)
- [ ] The scroll camera, intro, scene and textures come back, carrying the sections (hero, states, in context, playground, install, footer) as shots, dark only (F-77), on phones, with reduced motion handled

### SITE-10: The experience, v2 (owner, 2026-11-23, F-22)
- [ ] Intro complete on its own; the scroll below is an optional experience
- [ ] Walk the six built-in palettes (colours fixed): try every state, emotion and halo on each, and see the marble in front on its own, in a chatbox or in a call (F-99)
- [ ] Pull back over all six and pick one to start from
- [ ] **Create your own** in steps: Name, Colours, Motion, Try it, Code, with Export preset (replaces SITE-04's playground; F-86)
- [ ] **Guide**: numbered steps for install, usage with your marble, voice SDK snippets and the docs (replaces SITE-05's tabs)
- [ ] The ink floor as the scene's texture (F-23)

### SITE-08: Deploy
- [ ] One site in `apps/site`, deployed on Vercel at talking-marble.vercel.app (F-81; GitHub Actions runs the checks)
- [x] Icons, link-preview image and video, SEO metadata, `robots.txt`, `sitemap.xml`, `llms.txt` (F-3) ✓ on the site branch; re-render for the new site

### PLAT-01: Every device (owner, 2026-11-23, F-78; approved 2026-11-23, step by step)
Voice interfaces live everywhere, so the marble should too. Each step is a small renderer over the shared core (CORE-01 first), shipped and listed on the site only when it works:
- [x] 1. A Web Component, `<talking-marble>`: any web framework or none (Vue, Svelte, Angular, Astro, plain HTML), same WebGL renderer ✓ 0.13.0
- [ ] 2. React Native / Expo: iOS and Android apps
- [ ] 3. SwiftUI with Metal: iPhone, iPad, Mac, Vision Pro (a simplified watchOS later)
- [ ] 4. Android Jetpack Compose
- [ ] 5. Flutter

### PKG-01: Publish to npm
- [ ] Publish to npm, but only after the site runs on the real package
- [ ] Package name: `talking-marble` (owner 2026-11-23; free on npm 2026-11-23, recheck before publishing)

## Later

- The native ports: now PLAT-01.
- Electron and Tauri: v1 is plain web, so it runs in both; a check there comes later.
- **Talk to it** (owner, 2026-11-23; removed from the site 2026-11-24, F-99, until it can be real): a Talk button on the walk and in Create that opens a real conversation with a voice model, shown in the Seen in interfaces (the chatbox's voice button, the call's keys). Needs a small backend (the model's key stays on a server, never in the site) and the mic. Direction, provider and cost to agree with the owner first. The package itself still brings no voice side.

## Not doing

- The voice side (speech in, AI, speech out): developers bring their own.

## Superseded by the 2026-11-23 spec

Built or specified earlier, replaced by the owner's overall spec (the spec's structure is libraries.dev-like sections, clean, with plain copy; its light mode was later removed, F-77):

- ~~The scroll-camera "experience" (F-5)~~ **brought back by the owner 2026-11-23 (F-11, "Bring camera back")**: the camera now carries the spec's sections as shots (SITE-09).
- The curved gallery hallway (old SITE-04) → the state showcase grid (SITE-02).
- The guided talk-to-it demo with speech synthesis and the word drum (old SITE-05) → the marble in realistic UIs (SITE-03) and the playground's audio sources (SITE-04).
- The palettes-first flow (old SITE-07, F-6) → palette and custom colors live in the playground (SITE-04).
- Dark only and "the marble is the only colour" (F-4) → dark by default plus a light mode → dark only again (F-77).
- The cursive display face and "customization as a game" (F-7) → open question Q-2.

## Open questions

| ID | Question or ambiguity | Default if unanswered |
|----|-----------------------|-----------------------|
| Q-1 (decided: default) | "The material never changes between states; only energy, motion and brightness change." Today's prototype also tints `error` red, drains `muted` to grey and warms/cools `happy`/`calm`. Keep those color shifts? | No color shifts in built-in states or emotions: `error` reads through motion (restless, a beat, a short shake) and a dimmer glow; colors change only when a developer's preset sets them |
| Q-2 (decided: default) | The earlier site feedback that isn't in the spec: the cursive display face for names (F-7), customization "like a game" (F-7), the editable palettes with Reset (F-6), centred shots (F-8). Keep any? | Keep: palette editing with Reset inside the playground, generous centred layout, short buttons with one action each, no repeated labels. Drop: the cursive display face (the spec asks for clean) |
| Q-3 (decided: default) | Where the packages live and what they're called | `packages/core` (shader, presets, spec; private, not published in v1) and `packages/react` published as `talking-marble`; the site in `apps/site` |
