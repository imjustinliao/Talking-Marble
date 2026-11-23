# Design

> **Status: approved** (2026-11-23), including the sections from the owner's 2026-11-23 spec (approved the same day with the default answers: no colour shifts in built-in states, palette editing kept in the playground, no display face). Rewrite in place when it changes (git keeps the history).

Two things are designed here: **the orb** (the product, what developers ship) and **the site** (showcase, docs, playground).

## Feel

- **Orb**: alive, tactile, calm. A lit sphere of flowing pigment that never visibly loops or jumps. It reacts to voice without twitching. Never: a jittery audio visualiser, a neon "AI" glow, bars or waveforms.
- **Site**: clean, dark by default with a light mode, generous spacing, plain and literal copy; the marble is the hero. Never: a generic AI landing page (gradient blobs, taglines, emoji headings).

## The orb

Source of truth for the look: the original orb from the owner's earlier, private work (its WebGL2 shader), with the voice `level` and swirl from its native version. Reference frames of its look at rest live in `e2e/fixtures/fidelity/`. Ported faithfully: domain-warped fBm pigment on an analytic sphere, key light, softbox and ribbon highlights, rim and back light, ACES, sRGB, film grain, dithering.

### Anatomy

- **Sphere**: the shader, drawn in a WebGL2 canvas. Four colors: ground and three pigments.
- **Halo**: a soft radial light behind the sphere in pigments 1 and 2 (CSS, as the original orb's halo). Grows with level and activity. On by default, `halo={false}` turns it off.
- **Fallback**: a CSS radial-gradient picture of the orb in its own colors, shown until the shader is ready and when WebGL2 is unavailable.
- **Glass shell** (from the SwiftUI version): not in web v1; Apple Liquid Glass belongs to the SwiftUI port (Later).

### States and emotions (2026-11-23 spec)

**One material in every state.** The marble's pigment, colors and lighting never change between states (idle is the original orb, exactly). A state only changes three things, and the voice drives them:

- **Energy**: how fast the pigment flows, how deep it folds (turbulence), how fine or broad its veins are.
- **Motion**: how the pattern moves like water (swells rolling across, ripples travelling out or in, a slow whirlpool) and how the whole marble moves (turning, breathing, a beat, a bounce, a jelly swell with the voice, a short shake).
- **Brightness**: glow from within and overall brightness, rising with the voice.

| State | Energy | Motion | Brightness | Voice |
|-------|--------|--------|------------|-------|
| `idle` | the original flow | none | the original | no |
| `connecting` | slow | a slow whirlpool, ripples gathering inward to a steady beat, a little smaller | slightly dim | no |
| `listening` | calm, broad veins | slow swells; the user's voice pulls ripples inward and draws it closer | a little light from within | the user's voice, gently |
| `thinking` | fast, fine, deeply folded | a churning whirlpool, turning, rocking slowly | steady glow | no |
| `speaking` | lively, crisp | each syllable sends a wave out, surges the flow and swells it like jelly; a light bounce | flashes brighter with the voice | the agent's voice, fully |
| `error` | restless, turbulent | choppy, turning backwards, a hard beat and a short shake on entry | dimmer | no |

Emotions layer on a state (`emotion` prop) and shift the same three dials: `muted` (nearly still, dim, ignores audio), `happy` (quicker, brighter, bouncing), `calm` (slow long swells, softer). No colour shifts in built-in states or emotions (owner, Q-1): colours change only when a developer's preset sets them.

Every change springs from where the marble is now (critically damped, no overshoot), never jumps. Reduced motion: a still frame; states show through brightness only.

### Presets (2026-11-23 spec)

A preset is plain data with plain names and documented ranges, the same in every port: `speed`, `turbulence`, `veins` (size), `softness`, `detail`, `spin`, `waves`, `ripples` (+ direction), `whirl`, `chop`, `glow`, `brightness`, `breath`, `beat`, `bounce`, `wobble` (voice jelly), `shake`, `size`, `reactivity` (how strongly it answers audio), and optional `colors`. States, emotions and a developer's own states are all presets. The playground exports exactly this object.

### Sizes (2026-11-23 spec)

- **Sharp everywhere**: the canvas renders at the element's CSS size × device pixel ratio (up to 3×), within a total-pixel budget sized for a full-screen hero, not today's 512-pixel cap.
- **Small sizes have their own tuning** (below about 48 px): broader veins, less fine detail, no grain, no whole-marble movement (no bob, shake or swell that would jog the line of text), a tighter halo or none below 32 px, and slightly more contrast so a 20 px marble still reads as itself.
- **Many marbles on one page** (the state grid, chat messages): browsers allow only about 16 WebGL contexts per page, so every marble on a page shares one renderer and one context, each still drawn into its own element.

### Palettes

The six existing palettes, each ground plus three pigments: Pearl (default), Ember, Lagoon, Ink, Rose, Aurora. Developers can pass any four colors instead.

### Motion and performance

- Renders at up to 30 fps on every display (as the existing orbs), only while on screen and the tab is visible; still and costless otherwise.
- Audio level is smoothed (rate 10/s, as in the SwiftUI version) so the orb swells with speech instead of flickering.
- `prefers-reduced-motion`: the orb is still; states show through color, brightness and halo only, and audio moves the halo, not the flow.

### Accessibility

- Decorative by default (`aria-hidden`). With `aria-label`, it becomes `role="img"` with that label.
- **(2026-11-23 spec)**: a correct label for each state, by default: with a `label` (e.g. the agent's name, default "Assistant"), the orb reads "Assistant, listening", "Assistant, speaking" and so on, updated as the state changes (custom states use their preset's name or `ariaLabel`).
- No flashing: brightness changes stay well under three flashes a second.

## The site

> **2026-11-23 spec (approved)**, replacing the scroll-camera "experience" (F-4 to F-8, see `docs/product.md` › Superseded). Model: libraries.dev/orbs, for its structure and quality bar, not its look.

One site in `apps/site`, two static pages: `/` and `/docs/`.

### Language

- **Themes**: dark by default, a light mode (follows the system, with a toggle). Tokens: background, surface, raised surface, text, secondary text, hairline, focus, in both themes. The marble's colours are the only saturated colour on the page.
- **Type**: the system UI font for everything; a monospace for code. Large, light headings; plain body text.
- **Layout**: generous spacing (section padding ~120 px on desktop, ~72 px on phones), content centred in a column of ~1120 px, cards with a hairline and 16 px radius. Looks as considered on a phone as on desktop.
- **Copy**: plain and literal. Say what it is and what it does. No taglines ("spin the words"), no repeated labels, buttons of a word or two (or one icon with an accessible name), one action per control.
- **Motion**: restrained: hover and press feedback, sections fading in once. The marble is the only thing that moves on its own.

### `/`

1. **Hero**: the live marble, one plain line ("An audio-reactive orb for voice AI apps. React, open source."), `npm i talking-marble` with a copy button, links to GitHub and the docs.
2. **States**: a grid of cards, one per state and emotion, each animating live and labelled. Each card shows the marble at its own size and, like the libraries.dev grid, small inline pills too: a 20 px marble beside "Listening…", "Thinking…", "Speaking…".
3. **In context**: the marble inside three realistic UIs, live: a chat input bar with a voice button (as in ChatGPT's voice mode), a full-screen call view, and an inline chat message.
4. **Playground**: the marble (preview pane, light/dark background switch) beside the controls from the prototype: state, emotion, palette plus a custom colour picker (each palette editable, with Reset), size (20, 32, 64, 240 px and full), audio source (simulated voice, your mic, level slider), and the preset dials for designing your own state. Below it, the exact code for the current settings, live, with Copy, and **Export preset** (JSON).
5. **Install**: tabs for React, React Native, SwiftUI, Android, Flutter. React: the install command, minimal usage, and how to connect LiveKit, ElevenLabs and OpenAI Realtime, each in a few lines. The others: "Coming soon", honestly, nothing else.
6. **Footer**: GitHub, npm, MIT © Justin Liao.

### `/docs/`

A props table, the preset format (every field, its range and default), the audio options, accessibility notes (labels, reduced motion, no flashing) and performance notes (pausing, the shared renderer, sizes). A slim index on the side (top on phones), one column of text.

### States every screen handles

Mic asked only on click; denied or missing → a one-line note and the simulated voice. WebGL2 missing → the package's fallback picture and a one-line note. Copy → "Copied" for a moment.

## Requirements

### DES-01: Faithful port
- [ ] Side by side with the original orb at the same palette and time, the web orb is visually indistinguishable

### DES-02: States read at a glance
- [ ] Each of the six states is distinguishable at 20, 48 and 240 px, in both site themes, while the material stays the same

### DES-03: Reacts like a voice, not a meter
- [ ] With real speech, the orb swells and settles smoothly, with no visible flicker

## References

- The original orb (the owner's earlier, private work): the shader, palettes, fallback and halo, ported in M1–M3; its look at rest is pinned by `e2e/fixtures/fidelity/`.
- Its native version: the voice level and swirl behavior (ported), and a glass shell (for the later SwiftUI port).
