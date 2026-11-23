import { rgba, type OrbColors } from '../colors';

/**
 * The CSS picture of the orb, shown until the shader draws and wherever WebGL2 is missing:
 * a key-light highlight and the three pigments as radial gradients over the ground (as the original orb's fallback).
 */
export function fallbackBackground([ground, c1, c2, c3]: OrbColors): string {
  return [
    'radial-gradient(ellipse at 28% 20%, #fff9 0%, #fff3 12%, transparent 34%)',
    `radial-gradient(ellipse at 73% 72%, ${c3} 0%, transparent 55%)`,
    `radial-gradient(ellipse at 70% 30%, ${c2} 0%, transparent 62%)`,
    `radial-gradient(ellipse at 25% 55%, ${c1} 0%, transparent 63%)`,
    ground,
  ].join(',');
}

/** The fallback's shading: a soft inner light and shadow, scaled to the orb (the original's: 1/3 px and 8/10/20 px at 120 px). */
export function fallbackShadow(size: number): string {
  const px = (f: number) => `${(size * f).toFixed(1)}px`;
  return `inset ${px(0.008)} ${px(0.008)} ${px(0.025)} #fff8, inset ${px(-0.067)} ${px(-0.083)} ${px(0.167)} #0004`;
}

/**
 * The halo: soft light in pigments 2 and 1 around the sphere (as the original orb's halo, scaled to the orb).
 * Drawn as box-shadows, which are paint only: they never change layout or add scroll overflow.
 */
export function haloShadow([, c1, c2]: OrbColors, size: number): string {
  const px = (f: number) => `${(size * f).toFixed(1)}px`;
  return `0 0 ${px(0.12)} ${px(0.03)} ${rgba(c2, 0.7)}, 0 0 ${px(0.3)} ${px(0.07)} ${rgba(c1, 0.45)}`;
}
