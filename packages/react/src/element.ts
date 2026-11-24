import { connectAudio, type AudioTap, type OrbAudioSource } from './audio/source';
import { resolvePalette, type OrbPalette } from './colors';
import { fallbackFor, haloStrengthOf, haloStyles, sizeOf, stableKey, warnUnknown } from './common';
import { orbLabel } from './label';
import { createOrb, type OrbController } from './render/orb';
import type { OrbPreset } from './state';

export type { OrbAudioSource };

/** A palette attribute: a palette name, or up to four hex colours separated by commas or spaces. */
export function paletteFromAttribute(value: string | null): OrbPalette | undefined {
  const parts = value?.split(/[\s,]+/).filter(Boolean) ?? [];
  if (!parts.length) return undefined;
  return parts.length === 1 && !parts[0]!.startsWith('#') ? (parts[0] as OrbPalette) : parts;
}

/** A halo attribute: absent, empty or "true" is the standard halo; "false" (or "none", "off") none; a number a strength. */
export function haloFromAttribute(value: string | null): boolean | number {
  const v = value?.trim().toLowerCase();
  if (v === undefined || v === '' || v === 'true') return true;
  if (v === 'false' || v === 'none' || v === 'off') return false;
  const n = Number(v);
  return Number.isFinite(n) ? n : true;
}

/** A number attribute (`size`, `level`); anything else is absent. */
export function numberFromAttribute(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** A presets attribute: JSON, the same shape as the `presets` property. Invalid JSON is ignored. */
export function presetsFromAttribute(value: string | null): Record<string, OrbPreset> | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, OrbPreset>) : undefined;
  } catch {
    return undefined;
  }
}

const STYLE = `
:host { position: relative; display: inline-block; vertical-align: middle; aspect-ratio: 1; width: var(--talking-marble-size, 100%); max-width: 100%; height: auto; }
:host([hidden]) { display: none; }
.marble { position: absolute; inset: 0; display: block; }
.halo-strength { position: absolute; inset: 0; pointer-events: none; }
.halo { position: absolute; inset: 1%; border-radius: 50%; pointer-events: none; display: block; }
.fallback { position: absolute; inset: 0.75%; border-radius: 50%; display: block; }
canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; opacity: 0; }
:host([data-ready="true"]) canvas { opacity: 1; }
:host([data-ready="true"]) .fallback { visibility: hidden; }
`;

const ATTRIBUTES = ['state', 'emotion', 'palette', 'size', 'label', 'decorative', 'halo', 'paused', 'level', 'presets'] as const;

// Importing this module on a server (no DOM) must not throw: there the class extends nothing and is never defined.
const Base = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

/**
 * `<talking-marble>`: the marble as a Web Component (PLAT-01), for any web framework or none: plain HTML, Vue,
 * Svelte, Angular, Astro, Solid. The same renderer, states, emotions, palettes and presets as the React component.
 *
 * Attributes: `state`, `emotion`, `palette` (a name, or hex colours separated by commas), `size` (CSS px),
 * `label`, `decorative`, `halo` (true, false or a strength 0–1.5), `paused`, `level` (0–1), `presets` (JSON).
 * Properties: the same, plus `audio` (a MediaStream, an audio or video element, or a Web Audio node), and
 * `presets` and `palette` as objects and arrays.
 */
export class TalkingMarbleElement extends Base {
  static observedAttributes = [...ATTRIBUTES];

  #orb: OrbController | null = null;
  #tap: AudioTap | null = null;
  #audio: OrbAudioSource | null = null;
  #presets: Record<string, OrbPreset> | undefined;
  #palette: OrbPalette | undefined;
  #level: number | undefined;
  #internals: ElementInternals | null = null;
  #parts: { marble: HTMLElement; haloStrength: HTMLElement; halo: HTMLElement; fallback: HTMLElement; canvas: HTMLCanvasElement } | null = null;
  #shownKey = '';
  #colorKey = '';
  /** The presets attribute's text and its parse, so the JSON is parsed once per change. */
  #presetsAttr: { text: string | null; value: Record<string, OrbPreset> | undefined } = { text: null, value: undefined };

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${STYLE}</style><span class="marble" part="marble"><span class="halo-strength"><span class="halo" part="halo"></span></span><span class="fallback"></span><canvas></canvas></span>`;
    const q = <T extends Element>(s: string) => root.querySelector<T>(s)!;
    this.#parts = { marble: q('.marble'), haloStrength: q('.halo-strength'), halo: q('.halo'), fallback: q('.fallback'), canvas: q('canvas') };
    // Its role and name as default semantics: an author's own role or aria-label still wins.
    this.#internals = typeof this.attachInternals === 'function' ? this.attachInternals() : null;
  }

  /** A built-in state or one of your presets. Default `idle`. */
  get state(): string { return this.getAttribute('state') || 'idle'; }
  set state(v: string) { this.setAttribute('state', v); }
  /** An emotion layered on the state, or null. */
  get emotion(): string | null { return this.getAttribute('emotion') || null; }
  set emotion(v: string | null) { if (v) this.setAttribute('emotion', v); else this.removeAttribute('emotion'); }
  /** A palette name or four colours. */
  get palette(): OrbPalette | undefined { return this.#palette ?? paletteFromAttribute(this.getAttribute('palette')); }
  set palette(v: OrbPalette | undefined) { this.#palette = v; this.#sync(); }
  /** Your own states and emotions, merged over the built-ins by name. */
  get presets(): Record<string, OrbPreset> | undefined {
    if (this.#presets) return this.#presets;
    const text = this.getAttribute('presets');
    if (text !== this.#presetsAttr.text) this.#presetsAttr = { text, value: presetsFromAttribute(text) };
    return this.#presetsAttr.value;
  }
  set presets(v: Record<string, OrbPreset> | undefined) { this.#presets = v; this.#sync(); }
  /** Audio to react to, in states that listen. The marble never stops your stream's tracks. */
  get audio(): OrbAudioSource | null { return this.#audio; }
  set audio(v: OrbAudioSource | null) {
    if (v === this.#audio) return;
    this.#audio = v;
    this.#tap?.dispose();
    this.#tap = v && this.isConnected ? connectAudio(v) : null;
  }
  /** Audio level 0–1; overrides `audio` when set. */
  get level(): number | undefined { return this.#level ?? numberFromAttribute(this.getAttribute('level')); }
  set level(v: number | undefined) { this.#level = v; this.#orb?.setLevelSource(this.#levelSource); }
  /** Width and height in CSS px; absent (or not a number above 0) fills the container's width. */
  get size(): number | undefined { return sizeOf(numberFromAttribute(this.getAttribute('size'))); }
  set size(v: number | undefined) { if (v === undefined) this.removeAttribute('size'); else this.setAttribute('size', String(v)); }
  /** The halo: true, false, or a strength 0–1.5. */
  get halo(): boolean | number { return haloFromAttribute(this.getAttribute('halo')); }
  set halo(v: boolean | number) { this.setAttribute('halo', String(v)); }
  get paused(): boolean { return this.hasAttribute('paused'); }
  set paused(v: boolean) { this.toggleAttribute('paused', v); }
  get decorative(): boolean { return this.hasAttribute('decorative'); }
  set decorative(v: boolean) { this.toggleAttribute('decorative', v); }
  get label(): string | undefined { return this.getAttribute('label') ?? undefined; }
  set label(v: string | undefined) { if (v === undefined) this.removeAttribute('label'); else this.setAttribute('label', v); }

  #levelSource = () => this.level ?? this.#tap?.read() ?? 0;

  connectedCallback() {
    const p = this.#parts!;
    this.setAttribute('data-talking-marble', '');
    if (!this.#orb) {
      this.#shownKey = this.#colorKey = '';
      this.#orb = createOrb(
        { host: p.marble, canvas: p.canvas, halo: p.halo, fallback: p.fallback },
        { state: this.state, emotion: this.emotion, colors: resolvePalette(this.palette), presets: this.presets, onReady: ready => this.setAttribute('data-ready', String(ready)) },
      );
      this.#orb.setLevelSource(this.#levelSource);
      this.setAttribute('data-ready', String(this.#orb.ready));
    }
    if (this.#audio && !this.#tap) this.#tap = connectAudio(this.#audio);
    this.#sync();
  }

  disconnectedCallback() {
    this.#orb?.dispose();
    this.#orb = null;
    this.#tap?.dispose();
    this.#tap = null;
  }

  attributeChangedCallback(name: string) {
    // The level is read every frame; only the loop needs waking.
    if (name === 'level') { this.#orb?.setLevelSource(this.#levelSource); return; }
    this.#sync();
  }

  /** Brings the drawing, the halo, the fallback picture and the accessible name in line with the attributes. */
  #sync() {
    if (!this.#parts || !this.isConnected) return;
    const { state, emotion, presets } = this;
    const colors = resolvePalette(this.palette);
    const p = this.#parts;
    const shownKey = JSON.stringify([state, emotion]) + stableKey(presets);
    if (shownKey !== this.#shownKey) {
      this.#shownKey = shownKey;
      warnUnknown(state, emotion, presets);
      this.#orb?.setState(state, presets, emotion);
    }
    if (colors.join() !== this.#colorKey) {
      this.#colorKey = colors.join();
      this.#orb?.setColors(colors);
    }
    this.#orb?.setPaused(this.paused);
    this.#orb?.setLevelSource(this.#levelSource);

    const size = this.size;
    if (size === undefined) this.style.removeProperty('--talking-marble-size');
    else this.style.setProperty('--talking-marble-size', `${size}px`);
    const halo = haloStyles(haloStrengthOf(this.halo));
    p.haloStrength.style.opacity = halo.opacity;
    p.haloStrength.style.filter = halo.filter;
    p.halo.style.display = halo.display;
    p.fallback.style.background = fallbackFor(state, presets, emotion, colors);

    this.setAttribute('data-state', state);
    if (emotion) this.setAttribute('data-emotion', emotion); else this.removeAttribute('data-emotion');
    this.#label();
  }

  /** "Assistant, speaking" as its accessible name, or hidden when decorative (ElementInternals where supported). */
  #label() {
    const name = orbLabel(this.label, this.state, this.emotion, this.presets);
    const i = this.#internals;
    if (i && 'role' in i) {
      i.role = this.decorative ? null : 'img';
      i.ariaLabel = this.decorative ? null : name;
      i.ariaHidden = this.decorative ? 'true' : null;
      return;
    }
    if (this.decorative) { this.setAttribute('aria-hidden', 'true'); this.removeAttribute('role'); this.removeAttribute('aria-label'); }
    else { this.removeAttribute('aria-hidden'); this.setAttribute('role', 'img'); this.setAttribute('aria-label', name); }
  }
}

/** Registers the element under `tag` (default `talking-marble`), once; safe to call on a server, where it does nothing. */
export function defineTalkingMarble(tag = 'talking-marble'): void {
  if (typeof customElements === 'undefined' || customElements.get(tag)) return;
  customElements.define(tag, tag === 'talking-marble' ? TalkingMarbleElement : class extends TalkingMarbleElement {});
}

defineTalkingMarble();

declare global {
  interface HTMLElementTagNameMap { 'talking-marble': TalkingMarbleElement }
}
