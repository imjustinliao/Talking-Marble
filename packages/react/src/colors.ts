import { paletteData } from './generated/core';

/** A built-in palette name. */
export type PaletteName = keyof typeof paletteData;
/** Four sRGB hex colors: ground, then three pigments. */
export type OrbColors = readonly [string, string, string, string];
/** A palette name, or your own colors (ground first; fewer than four are filled out with the ground). */
export type OrbPalette = PaletteName | readonly string[];
export type Linear = [number, number, number];

/** The six built-in palettes. */
export const palettes: Record<PaletteName, OrbColors> = paletteData;

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
/** A palette color must be written as CSS hex (`#rgb` or `#rrggbb`). */
const CSS_HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** sRGB hex to 0–255 channels. Invalid input is white. */
export function hexToRgb(hex: string): [number, number, number] {
  const match = HEX.exec(hex.trim());
  if (!match) return [255, 255, 255];
  let digits = match[1]!;
  if (digits.length === 3) digits = [...digits].map(d => d + d).join('');
  const n = parseInt(digits, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** sRGB hex to linear-light RGB (0–1). Invalid input is white. */
export function hexToLinear(hex: string): Linear {
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const [r, g, b] = hexToRgb(hex);
  return [toLinear(r / 255), toLinear(g / 255), toLinear(b / 255)];
}

/** A CSS rgba() color from hex and an alpha. */
export function rgba(hex: string, alpha: number): string {
  return `rgba(${hexToRgb(hex).join(',')},${alpha})`;
}

/** Resolves a palette prop to exactly four colors (packages/core/spec.md › Colors). Unknown names and anything else are Pearl. */
export function resolvePalette(palette: OrbPalette | null | undefined): OrbColors {
  if (typeof palette === 'string') return Object.hasOwn(palettes, palette) ? palettes[palette as PaletteName] : palettes.pearl;
  if (!Array.isArray(palette)) return palettes.pearl;
  // Keep each color in its slot; an invalid or missing one takes the ground.
  const slots = palette.slice(0, 4).map(c => (typeof c === 'string' && CSS_HEX.test(c.trim()) ? c.trim() : undefined));
  const ground = slots[0];
  if (!ground) return palettes.pearl;
  return [ground, slots[1] ?? ground, slots[2] ?? ground, slots[3] ?? ground];
}
