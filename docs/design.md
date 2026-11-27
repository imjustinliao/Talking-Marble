# Design

> **Status: approved** (2026-11-23), including the sections from the owner's 2026-11-23 spec (approved the same day with the default answers: no colour shifts in built-in states, palette editing kept in the playground, no display face). Rewrite in place when it changes (git keeps the history).

Two things are designed here: **the orb** (the product, what developers ship) and **the site** (showcase, docs, playground).

## Feel

- **Orb**: alive, tactile, calm. A lit sphere of flowing pigment that never visibly loops or jumps. It reacts to voice without twitching. Never: a jittery audio visualiser, a neon "AI" glow, bars or waveforms.
- **Site**: clean, dark only (F-77), generous spacing, plain and literal copy; the marble is the hero. Never: a generic AI landing page (gradient blobs, taglines, emoji headings).

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
| `searching` | lively, a little finer | a lens magnifies the centre and the pattern streams out of it, rings travelling out, a ping of light sweeping outward (F-83) | a touch brighter, the ping | no |
| `speaking` | lively, crisp | each syllable sends a wave out, surges the flow and swells it like jelly; a light bounce | flashes brighter with the voice | the agent's voice, fully |
| `error` | restless, turbulent | choppy, turning backwards, a hard beat and a short shake on entry | dimmer | no |

Emotions layer on a state (`emotion` prop) and shift the same three dials (F-87: kept, eight in all): `happy` (quicker, brighter, bouncing), `excited` (fast, bright, bouncing to a quick beat), `calm` (slow long swells, softer), `curious` (tilting side to side and turning), `surprised` (grows, brightens, one jolt), `concerned` (slower, softer, a little dim, rocking gently), `sad` (small, dim, slow), `muted` (nearly still, dim, ignores audio). No colour shifts in built-in states or emotions (owner, Q-1): colours change only when a developer's preset sets them.

Every change springs from where the marble is now (critically damped, no overshoot), never jumps. Reduced motion: a still frame; states show through brightness only.

### Presets (2026-11-23 spec)

A preset is plain data with plain names and documented ranges, the same in every port: `speed`, `turbulence`, `veins` (size), `softness`, `detail`, `spin`, `waves`, `ripples` (+ direction), `whirl`, `chop`, `scan`, `glow`, `brightness`, `halo`, `breath`, `beat`, `bounce`, `wobble` (voice jelly), `shake`, `size`, `reactivity` (how strongly it answers audio), and optional `colors`. States, emotions and a developer's own states are all presets. The playground exports exactly this object.

### Sizes (2026-11-23 spec)

- **Sharp everywhere**: the canvas renders at the element's CSS size × device pixel ratio (up to 2×), within a total-pixel budget sized for a full-screen hero, not today's 512-pixel cap.
- **Small sizes have their own tuning** (below about 48 px): broader veins, less fine detail, no grain, no whole-marble movement (no bob, shake or swell that would jog the line of text), a tighter halo or none below 32 px, and slightly more contrast so a 20 px marble still reads as itself.
- **Many marbles on one page** (the state grid, chat messages): browsers allow only about 16 WebGL contexts per page, so every marble on a page shares one renderer and one context, each still drawn into its own element.

### Palettes

The six existing palettes, each ground plus three pigments: Pearl (default), Ember, Lagoon, Ink, Rose, Aurora. Developers can pass any four colors instead.

### Motion and performance

- Renders at up to 30 fps on every display (as the existing orbs), only while on screen and the tab is visible; still and costless otherwise.
- Audio level is smoothed (rate 10/s, as in the SwiftUI version) so the orb swells with speech instead of flickering.
- `prefers-reduced-motion`: the orb is still; states show through brightness and size only, and audio moves the halo, not the flow.

### Accessibility

- Decorative by default (`aria-hidden`). With `aria-label`, it becomes `role="img"` with that label.
- **(2026-11-23 spec)**: a correct label for each state, by default: with a `label` (e.g. the agent's name, default "Assistant"), the orb reads "Assistant, listening", "Assistant, speaking" and so on, updated as the state changes (custom states use their preset's name or `label`).
- No flashing: brightness changes stay well under three flashes a second.

## The site

> **2026-11-23 spec (approved)**, with the owner's later call (F-11, 2026-11-23: "Bring camera back"): the spec's sections are the content, and the scroll camera from the earlier experience carries them as shots. Model: libraries.dev/orbs for structure and quality bar, not its look.

One site in `apps/site`, two static pages: `/` and `/docs/`.

### Language

- **Theme** (owner, F-77: "remove light mode and the switcher, keep the dark"): dark only, for every visitor; no switch. Tokens: background, surface, raised surface, text, secondary text, hairline, focus. The marble's colours are the only saturated colour on the page.
- **Type** (owner, F-73: "like MoMA… a fashion magazine"): two faces. Libre Franklin, a Franklin Gothic in the museum-poster style, for headlines (bold, tightly set) and for small labels (uppercase, widely tracked kickers: group names, the overview's names, the intro's state); the system UI font for reading and controls; a monospace for code.
- **Layout**: generous spacing (section padding ~120 px on desktop, ~72 px on phones), content centred in a column of ~1120 px, cards with a hairline and 16 px radius. Looks as considered on a phone as on desktop.
- **Copy**: plain and literal. Say what it is and what it does. No taglines ("spin the words"), no repeated labels, buttons of a word or two (or one icon with an accessible name), one action per control.
- **Motion**: the scroll camera (below) moves between shots; within a shot, motion is restrained (hover and press feedback, content arriving once). Only transform and opacity animate.

**The launch film** (F-114, F-115): a round glass play key (icon only, named Watch the film for screen readers) beside Docs and GitHub in the intro opens the film over the page: a dark glass veil, the picture rounded, a glass bar with a round play/pause key, a scrubber to drag or step with the arrow keys, and the time (0:12 / 0:34); × or Esc closes it, fading and settling away as it came in. It plays with sound when opened.

**Chrome** (owner, 2026-11-23, F-25 to F-32): the top bar holds only the logo (a small live marble in your colours) and the name, larger, centred. No links or toggle up there: the shot index at the edge is the navigation, its hover label plain text with no pill. Docs and GitHub are buttons (icon and text) in the intro and the Guide. The footer, at the end of the Guide and on `/docs/`, is one calm line spread across the width (F-33): MIT © Justin Liao on one side; on the other, Follow @imjustinliao with the X and GitHub icons. No theme switch (F-77). One text size, icons a touch larger, generous space between groups. No cue to scroll.

**Two button families, for balance** (owner, 2026-11-23, F-35, F-37): choices on the walk are **switch bars**, not lines of words: a glass track (dark, translucent, a fine inner highlight) holding rounded-square options; the chosen one is a lit key, white with black text and a soft white glow around it, like a backlit control. The halo is a **toggle** in the same language: a glass track, lit white with a black knob when on. Black and white, high contrast, light from the control itself. The other buttons stay in the marble's family (below).

**The marble's own texture** (owner, 2026-11-23, F-44: "the text with colour gotta have the same textures as the marble, animated similarly"): where the UI takes the marble's colour, it takes its texture. The intro's word "Marble" wears the live marble itself: each frame the middle of the stage marble is copied into the letters, so it moves with it. Thin accents (the chosen word's ink stroke, the pigment rings on the install command and Talk, the index marker, the Guide panel's top edge) carry the pigments as soft pools that flow slowly. Code keeps flat tints so it stays readable.

**Themed around the marble** (F-28): some UI takes its look from the marble in focus, never all of it. Its colours are CSS variables that follow the marble (the walk's front marble, your pick, your own): the chosen word's underline is a short ink stroke in its pigments, most buttons simply flip to the text colour on hover (white on black, black on white; F-35) while only the marble's own actions, the install command and Talk, answer with a thin ring of its pigments (its light, not a light of their own), the logo is a live marble, and "Marble" in the intro's title carries its pigments.

### `/`: one scene, a scroll camera, the sections as shots (F-11)

The camera system from the earlier experience comes back (saved at `ffcbb19` on `milestone/site`), adapted to the current package and sections:

- **One scene** behind everything that never cuts away: a plain stage, a glossy floor with the marble's light pool and reflection, and the ink floor (below). Dark only (F-77).
- **The ink floor** (owner, 2026-11-23, F-23: "the background textures look like stains rather than actual textures"; inspiration: sound drawn as ink, not a copy of any look): the floor around the marble carries the texture. Faint range rings of fine engraved marks (hairline arcs, a few px long, varied width and brightness) circle the marble at doubling distances, always centred under the marble in focus (F-38, never between two), and turn very slowly, neighbours in opposite directions. When the marble listens or speaks, its sound spreads over the floor as ripples of broken ink strokes (many short arcs of varied length and weight, with a few broad faint washes under them, like pigment soaked into paper) in ivory and the marble's own pigments, fading with distance. No blotches, no dust, no blurred spots: every mark is a crisp stroke. Quiet when the marble is quiet.
- **Intro on every load** (about 2.5 s, skippable by click, key or scroll): a point of light forms into the marble, the name appears, the camera settles on the hero.
- **Scrolling drives the camera** along keyframed shots, B-roll style (dolly, truck, crane, push in; never a plain centre zoom), damped by a critically damped spring. Continuity: the marble is always in frame and each move starts on it in its current colours (F-8).
- **Each section below is one shot.** While a shot is settled its content is a normal, fully interactive page area (controls, scrolling inside long panels, keyboard); the camera only moves between shots. A slim index at the edge shows the shots; Page Up/Down and the index jump between them.
- **Phones**: the same shots with gentler moves; panels become bottom sheets. **Reduced motion**: no camera moves; shots cross-fade.
- Plain copy, short one-action buttons and no repeated labels still apply inside every shot.

**Styling inside the scene (owner, 2026-11-23, F-12: "this styling is horrible", on a States shot with the scene marble beside a framed panel holding a second preview marble, a grid of nine boxed cards and its own scrollbar):**

- **One marble.** The scene marble is the subject of every shot and the only large marble on screen. Choosing a state, emotion, palette or setting changes *that* marble; no shot has a second large preview marble.
- **No boxes.** No framed panels, no cards around things, no grid of boxed tiles, no scrollbar inside a section. Text and controls sit directly on the stage with generous space. Where a shot truly needs a dense control area (the playground's dials), one quiet glass strip at most, never boxes inside it.
- **Switch bars past three options are a loop** (F-90, F-92, F-94, F-96): one row of fixed width, like a dial seen edge-on. The chosen option sits in the middle under the lit key with one in focus on each side; the next ones show faintly at both ends, so you see what comes next; the list wraps round. Under the bar, apart from it, a slider-like track says where you are: one equal dot per option and a lit thumb that slides to yours (F-97; a dot chooses). Choosing glides the strip under the key (only the key's width eases); a faint option is one click away; swipe, sideways scroll and the arrow keys step. One Tab stop on the choice. This holds for every bar past three options: the walk's State and Emotion, Create's Try it and Create's steps. Order, most used first: states idle, listening, thinking, searching, speaking, connecting, error; emotions none, happy, calm, excited, curious, surprised, concerned, sad, muted. Groups (label, bar, dots) stand apart: 22 px between groups on desktop, 18 px on phones.
- **Typography, not tiles.** States and emotions are words you pick (the selected one bright, the rest dim), in one calm row or column beside or under the marble, with one plain line about the selected one. Group names ("States", "Emotions") appear once; no "state"/"emotion" under each item. System font for names; monospace only in code.
- **Small sizes as one line, not cards.** The inline pills ("Listening…" beside a 20 px marble) and a few small marbles show sizes in a single quiet line.
- **One balanced composition per shot.** The marble and its words read as one group with the camera's framing; nothing crammed to one side.
- The same applies to every shot: in context shows the three UIs as objects in the scene (no surrounding frames), the playground's preview is the scene marble itself.

**Camera distance changes from shot to shot** (owner, 2026-11-23, F-17: "it's gotta have different distance, like initially it's further so the marble is smaller, then you zoom in; you don't have this anymore"): the opening is a wide, distant shot where the marble is small in the frame; scrolling pushes the camera in, so the marble grows; later shots vary their distance (close, medium, pulling back) like B-roll, never all at the same framing. The change in distance is the main sense of travel, so it must be clearly visible.

**A black stage with fog that moves like air** (owner, 2026-11-23, F-54, replacing F-42 to F-53's skies, mountains, 3D atmosphere and floor rings: "it's now super laggy… keep it 2D with an illusion of 3D… start from black empty again, then add the fog"): the stage is plain black. Low over it lies fog, denser toward the horizon and finer with distance, an illusion of depth drawn in 2D, its billows drifting slowly and changing shape as they go, never just sliding; every visit draws its own fog, so no two visitors see the same (F-82). Moving the pointer is a hand passing through mist: a small fluid simulation carries the fog along the air you push, curls it into swirls behind your hand, and lets it settle back into its resting shape over a few seconds. Gentle, like a hand, not a fan (F-55, F-56): a thin, ragged streak of moving air along the path the pointer took (never a round patch), a few fingers wide, a fast flick capped, barely any curl, the air calming within a moment; never a hole or a light: the fog only moves. **Light from the top** (F-57, F-72, F-74, F-76): subtle, and lit the way real light lights mist. A source just above the top edge, where the logo is, in layers each wider and dimmer than the last (core, halo, bloom, haze), reaching only a little way down, with a faint band of sky-light along the whole top edge, about even at the left and right and stronger in the middle (F-79: bright enough to read as light, never a wash). A few soft shafts fall from it, each its own direction, width and brightness, wavering and broken as mist drifts through them, never a fan of straight parallel lines; they show mostly where there is mist to catch them, so the fog gives the light its depth. A slow breath. Sunlight mixed with white, neither pure white nor orange; faint, so the marble stays the only colour. No rings, mountains, sky or ground. **Performance first** (F-54): every effect looks right on a low-power device first. The fog simulates on a grid about 128 cells wide and draws at half the screen's size, at 30 frames a second (20 on low-power devices), only while visible. Marbles render at most 2× the screen's density; gallery marbles out of focus render small and are scaled up; no live backdrop blur over moving content; the camera rests when it arrives (no handheld drift on low-power devices); the word "Marble" copies the live marble at 20 frames a second and not at all on low-power devices. A device that proves slower than its specs is moved to low power after a few seconds.

**Hierarchy: show the necessary, the rest on request** (owner, 2026-11-23, F-13: "everything concentrated and disorganized, too much info, gotta have info hierarchy and show necessary things, only if asked it shows more"):

- Each shot has **one primary thing** (the marble plus one choice or one action), **at most one line** of text, and **one way to see more**. Everything else stays hidden until asked for (a "More" control, a click on an item, a tab), and closes again.
- Order of importance, per shot:
  - **Intro**: the marble, the name, one line, the install command (copy). GitHub and Docs live in the top bar only.
  - **Palettes**: the marble in front and its name; then state, emotion, where it is seen and halo, always in the same place.
  - **Pick**: "Pick one", then all six at once.
  - **Create your own**: one step at a time, one group of controls per step.
  - **Guide**: install, usage, Docs and GitHub. Nothing else.
- Nothing appears twice on screen (a name, a link, a label). Fewer, larger, calmer elements beat many small ones.
- **Nothing jumps** (owner, 2026-11-23, F-18: "when expanding, I don't want things to move up or down but fixed"): opening a second layer (Edit, More), stepping between in-context UIs or changing a palette never moves what is already on screen. Layers open below their control as an overlay; shots whose content changes size keep their top edge fixed and grow downward. No awkward empty gaps inside a row (a name never sits in a box wider than itself with its arrow far away).
- **Everything wears the pick** (owner, 2026-11-23, F-21): every marble on the page outside the gallery (the in-context UIs, the inline pills) wears the palette picked in the gallery, like the stage marble.

**The path is magnetic** (F-52, F-67, F-80): when scrolling stops close to a place (any shot, or a marble on the walk; within about a quarter of a screen), the page glides the rest of the way, slowly, easing in and out, never a jump. Stopped far from every place, in the middle of a long move, it stays put, so a small scroll never becomes a big sudden move. A finger on the screen is waited for; any wheel, touch, key or click stops a glide; past the Guide the page rests where it is.

The shots, in order (owner, 2026-11-23, F-22: "rethink the flow"; supersedes the F-15 order and the States, In context, Playground and Install shots):

1. **Intro** (wide, far): complete on its own. The live marble, cycling through a voice agent's states, with the state's name under it in small tracked type that dissolves from word to word, no box (F-66), the name, one plain line, `npm i talking-marble` with copy, and Docs and GitHub buttons. Everything below it is the experience, optional (no scroll cue, F-25).
2. **Palettes** (the walk, pushing in): the six built-in palettes one by one along the gallery, far enough apart that one is in focus at a time and the next shows only at the edge (F-36). Their colours are fixed here (no Edit, no Yours: making your own is shot 4). For the marble in front: its name as the title, then one fixed control block under it, the same for every palette:
   - **State** (all seven, searching included) and **Emotion** (none and all eight) as switch bars, loops past five options (F-90), changing the marble in front;
   - **Halo** as a toggle;
   - **Seen in** (F-99, F-101): Marble, Chatbox or Call, a three-option switch bar like the others. Marble, the state's word sits under the marble, as under the intro's (F-66), with room for bounces and growth; while the page scrolls or the camera glides it hides, and it fades back in centred under the marble the walk settles on (F-111). Chatbox and Call lay an everyday interface over the stage, around the marble in front, in the room beside the panel (above it on a phone): the scene's marble steps aside and one marble of the demo's own takes its place and flies between spots along a short arc (0.76 s, ease in and out), re-measuring its spot every frame so it can turn back mid-flight. **Chatbox**: a glass bar (plus, "Ask anything", a muted mic, and a close key in the marble's own pigment) under the marble, which sits open in the middle above it with its state's word; the close key flies it into the bar's voice button, and that button flies it back out. **Call**: a phone's voice-call screen, the name at the top (the palette's, or the name you gave your marble) with a running clock, the marble in the middle with its state under it, and a row of round glass keys (speaker, mute and End in red; icons only, F-103). Glass after the system materials: a light fill, a blurred and saturated backdrop, a bright inner top edge, a soft drop. Nothing in the panel moves when the interface changes, and nothing in the demo drifts: its layout is measured when it appears and held still (F-102; again only after a resize). On the walk, **Marble** is the scene's own marble, its caption held still under it (F-109); the walk's marbles show a little smaller, 0.84× (F-102), and all draw at one size so none is resized as you walk (F-109). In Chatbox and Call the whole gallery steps aside and pauses. Sizes kept modest (F-102): the open chatbox marble about half the scene marble, a 440 px bar 56 px tall; the call screen 272 × 520 at most nine tenths scale, its three keys icons only, 52 px, End in red (F-103). Talking to it (mic, a reply) is a later plan (needs a voice model, see product.md › Later).
   - **One path, back and forth** (F-116, F-117): the views are one continuous path, the first view's start to its end flowing into the next's start, through to the Guide. The whole scene (camera, fades, the marbles gathering into rows, the panels) follows one position that glides after the scroll (about 0.9 s, at most 1.2 views a second), so nothing leaps ahead of anything else. A click on the index (or Page Up/Down) travels along the path to the view, backward or forward, through what lies between, eased (0.7 to 2.6 s); no cut, no fade. It arrives at the view's near end: back from all six, the walk's last marble; from the intro, its first. Between the walk and all six, a marble that was out of view shows only as it nears its place in the rows.
   - **The magnet on the walk** (F-105): each marble has 0.6 screens of scroll (the walk is 3 screens), and anywhere on the walk a stop settles on the nearest marble, so a flick never skips one. Every other stop does the same (F-113): it glides to the nearest place (all six, Create your own, the Guide), never leaving you between two.
   - Your settings stay as you walk from marble to marble. **The dock** (F-41): previous, "3 / 6", next (round glass arrows, well spaced), at the bottom in the middle of the page (F-45), not with the controls on the left: the left side is what you try, the dock is how you move on. Switch bars and the toggle never change size when changed. The lit key is one light that glides along the track to the chosen option (F-71), never a sudden on and off.
3. **All palettes** (pull back, F-60): no prompt and no button. As the walk ends the camera pulls back while the six marbles gather from their line into two rows of three, the first three above, each with its palette's name under it, the group centred on screen (F-68). Scrolling on zooms in to Create your own; the walk's marbles stand on one straight line at one height, so nothing moves up or down as you walk (F-59).
4. **Create your own** (push in, F-61 to F-63; its words at full strength and a size up, never dimmed like captions, F-95): the marble here is a plain, unpainted globe, not one of the palettes. Two levels: the steps, a switch bar (Name, Colours, Motion, Try it, Code) with one always chosen, Name first (F-86), and below it only the chosen step. (0) **Name**: you name your marble ("Nova"); the name is its `label` (screen readers say "Nova, speaking") and, made plain (`nova`), its own state's name in the code. (1) **Colours**: four colour pickers and Reset (back to the plain globe). (2) **Motion**: a few dials, your own state. (3) **Try it**: the walk's State and Emotion switch bars (your own state among them), the halo's strength as a slider (F-65), and Talk. (4) **Code**: the code for your marble in the same code panel as the Guide (tinted, with its own Copy, F-95) with Copy, and Export preset. Your marble carries into the Guide.
5. **Guide** (pull back to wide; owner, F-24, F-29, F-34): minimal, with the code styled as code. Above one quiet panel: a switch bar of what it works with (React, Web Component; PLAT-01) and **Copy prompt**, which copies a short prompt for an AI coding agent to add your marble (install, usage with your colours and preset, what `state` and `audio` are, the docs link). The panel (a hairline, its top edge a thin line in the marble's pigments) holds **Install** and **Usage**, each code block inset with its own Copy, the code tinted with the marble's pigments. Then Docs and GitHub. Inspiration: libraries.dev/orbs' Install tab, not its look.

### `/docs/`

A props table, the palettes (the six built-ins as small live marbles you can choose, which re-tint the page; your own four colours; the halo), the preset format (every field, its range and default), the audio options, accessibility notes (labels, reduced motion, no flashing) and performance notes (pausing, the shared renderer, sizes). A slim numbered index on the side (top on phones), the section being read marked by a stroke of the marble's pigments; one column of text with numbered sections.

The look (owner, F-46) comes from the home stage: the same black ground with slow veils of cloud fog, the marble's own light washed faintly over the top in its pigments, and a soft light following the pointer. A live marble speaks beside the title in the visitor's palette. Code blocks and tables are glass panels (a hairline, a top edge in the marble's pigments, the code inset and tinted with its pigments); the install command is a glass pill under the platform words.

### States every screen handles

Mic asked only on click; denied or missing → a one-line note and the simulated voice. WebGL2 missing → the package's fallback picture and a one-line note. Copy → "Copied" for a moment.

## Requirements

### DES-01: Faithful port
- [ ] Side by side with the original orb at the same palette and time, the web orb is visually indistinguishable

### DES-02: States read at a glance
- [ ] Each of the seven states is distinguishable at 20, 48 and 240 px, on the dark stage, while the material stays the same

### DES-03: Reacts like a voice, not a meter
- [ ] With real speech, the orb swells and settles smoothly, with no visible flicker

## References

- The original orb (the owner's earlier, private work): the shader, palettes, fallback and halo, ported in M1–M3; its look at rest is pinned by `e2e/fixtures/fidelity/`.
- Its native version: the voice level and swirl behavior (ported), and a glass shell (for the later SwiftUI port).
