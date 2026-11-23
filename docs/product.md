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

- v1: the web/React component on npm, and one site in `apps/site` (showcase, playground, install, docs) deployed to GitHub Pages through GitHub Actions, running on the real package.
- Platforms: v1 is web/React. Electron and Tauri apps get it for free because they run on web tech. Later ports: SwiftUI (iOS, macOS, visionOS, plus a simplified watchOS version), React Native, Android Compose and Flutter. Keep the shader and the presets in a platform-neutral `packages/core` so each port only needs a small renderer.
- Design bar: clean, dark by default, a light mode, generous spacing, and copy that's plain and literal (no taglines like "spin the words"). It has to look good on a phone as well as desktop.

## MVP features

Stable IDs by area. The boxes are acceptance items: tick one only after it was checked. Never reword or drop a requirement without the owner. ✓ = built and checked on `main` before the re-scope.

### CORE-01: Platform-neutral core
- [ ] The shader and the presets live in a platform-neutral `packages/core`, so each port only needs a small renderer (today: `core/` at the repo root, not a package)
- [x] Developers can add their own states through presets ✓

### ORB-03: Six built-in states
- [x] `idle`, `connecting`, `listening`, `thinking`, `speaking`, `error`, named the way voice SDKs name them (LiveKit, Deepgram, Stream) ✓
- [x] These exact names, so a developer can pass their SDK's state straight in ✓

### EMO-01: Emotions layer on a state
- [ ] Emotions (`muted`, `happy`, `calm`) layer on top of a state (an `emotion` prop)
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
- [ ] Sharp at every size and screen density, from a 20px inline icon to a full-screen hero (today the canvas is capped at 512 device pixels, so a large hero is soft)
- [ ] Small sizes get their own tuning, not just scaling down

### ORB-07: Polish
- [x] A still frame for reduced motion ✓
- [x] Pausing when off screen or when the tab is hidden ✓
- [ ] SSR-safe (renders the fallback on the server today; needs a test that keeps it so)
- [ ] A correct `aria-label` for each state (today one fixed label)

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
- [ ] The controls from the localhost:4173 prototype, moved into the site: state, emotion, palette plus a custom color picker, size, the audio source (simulated voice, your mic, level slider) and a light/dark background
- [ ] Shows the exact code for the current settings live and can export a preset
- [ ] Developers can design their own state here and copy it out

### SITE-05: Install
- [ ] Tabs for React, React Native, SwiftUI, Android and Flutter. Only React works for now; the others are labelled "coming soon" honestly
- [ ] The install command, minimal usage, and how to connect common voice SDKs (LiveKit, ElevenLabs, OpenAI Realtime), each in a few lines

### SITE-06: Docs
- [ ] A props table, the preset format, the audio options, accessibility and performance notes

### SITE-07: Footer
- [ ] GitHub, npm, MIT © Justin Liao

### SITE-08: Deploy
- [ ] One site in `apps/site`, deployed to GitHub Pages through GitHub Actions
- [x] Icons, link-preview image and video, SEO metadata, `robots.txt`, `sitemap.xml`, `llms.txt` (F-3) ✓ on the site branch; re-render for the new site

### PKG-01: Publish to npm
- [ ] Publish to npm, but only after the site runs on the real package
- [ ] Package name: `talking-marble` (owner 2026-11-23; free on npm 2026-11-23, recheck before publishing)

## Later

- React Native, SwiftUI (iOS, macOS, visionOS, simplified watchOS), Android Compose and Flutter ports, each a small renderer over `packages/core`.
- Electron and Tauri: v1 is plain web, so it runs in both; a check there comes later.

## Not doing

- The voice side (speech in, AI, speech out): developers bring their own.

## Superseded by the 2026-11-23 spec

Built or specified earlier, replaced by the owner's overall spec (the spec's structure is libraries.dev-like sections, clean, with a light mode and plain copy):

- The scroll-camera "experience" (F-5): intro on every load, camera shots, film-grain stage, dust, glossy floor. Replaced by plain sections.
- The curved gallery hallway (old SITE-04) → the state showcase grid (SITE-02).
- The guided talk-to-it demo with speech synthesis and the word drum (old SITE-05) → the marble in realistic UIs (SITE-03) and the playground's audio sources (SITE-04).
- The palettes-first flow (old SITE-07, F-6) → palette and custom colors live in the playground (SITE-04).
- Dark only and "the marble is the only colour" (F-4) → dark by default plus a light mode.
- The cursive display face and "customization as a game" (F-7) → open question Q-2.

## Open questions

| ID | Question or ambiguity | Default if unanswered |
|----|-----------------------|-----------------------|
| Q-1 (decided: default) | "The material never changes between states; only energy, motion and brightness change." Today's prototype also tints `error` red, drains `muted` to grey and warms/cools `happy`/`calm`. Keep those color shifts? | No color shifts in built-in states or emotions: `error` reads through motion (restless, a beat, a short shake) and a dimmer glow; colors change only when a developer's preset sets them |
| Q-2 (decided: default) | The earlier site feedback that isn't in the spec: the cursive display face for names (F-7), customization "like a game" (F-7), the editable palettes with Reset (F-6), centred shots (F-8). Keep any? | Keep: palette editing with Reset inside the playground, generous centred layout, short buttons with one action each, no repeated labels. Drop: the cursive display face (the spec asks for clean) |
| Q-3 (decided: default) | Where the packages live and what they're called | `packages/core` (shader, presets, spec; private, not published in v1) and `packages/react` published as `talking-marble`; the site in `apps/site` |
