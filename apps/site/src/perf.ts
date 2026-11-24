/**
 * How much the device can comfortably draw, decided once at start-up (F-54): "low" for devices that would struggle
 * (few cores, little memory, data saver on, or a phone-sized touch screen), "high" otherwise. Effects look right on
 * "low" first; "high" only adds. A device that turns out slower than its specs suggest is moved to "low" once the
 * page has settled (watchFrames), and effects started after that follow.
 */
let tier: 'low' | 'high' | undefined;

export function deviceTier(): 'low' | 'high' {
  if (tier) return tier;
  if (typeof window === 'undefined') return 'high';
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const cores = nav.hardwareConcurrency || 8;
  const memory = nav.deviceMemory || 8;
  const phone = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600;
  tier = nav.connection?.saveData || cores <= 4 || memory <= 4 || phone ? 'low' : 'high';
  document.documentElement.dataset.tier = tier;
  return tier;
}

export const isLowPower = () => deviceTier() === 'low';

/** Times frames once the page has settled; if most are slow (under ~40 a second), the device is treated as low. */
export function watchFrames() {
  if (typeof requestAnimationFrame === 'undefined' || isLowPower()) return;
  const gaps: number[] = [];
  let last = 0;
  const sample = (now: number) => {
    if (!document.hidden && last && now - last < 250) gaps.push(now - last);
    last = document.hidden ? 0 : now;
    if (gaps.length < 120) { requestAnimationFrame(sample); return; }
    gaps.sort((a, b) => a - b);
    if (gaps[gaps.length >> 1]! > 25) { tier = 'low'; document.documentElement.dataset.tier = 'low'; }
  };
  setTimeout(() => requestAnimationFrame(sample), 4000);
}
