/** Raw audio level (0–1) from time-domain samples in -1..1 (packages/core/spec.md › Audio level). */
export function levelFromSamples(samples: ArrayLike<number>): number {
  const n = samples.length;
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const s = samples[i]!;
    sum += s * s;
  }
  const rms = Math.sqrt(sum / n);
  const level = (rms - 0.01) * 7;
  return level > 0 ? (level < 1 ? level : 1) : 0;
}
