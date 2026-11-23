// DES-01: the orb at rest keeps the original look. Each palette's frame (t = 2.5 s, 240 px) is compared
// with a reference image in e2e/fixtures/fidelity/, rendered by this package on 2026-11-23 after it was
// verified pixel-identical to the original orb. Run with UPDATE_REFERENCE=1 to rewrite the references,
// only after deliberately changing the look at rest (and say so in the commit).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '../packages/react/test/page/fixture';

const dir = 'e2e/fixtures/fidelity';
const update = process.env.UPDATE_REFERENCE === '1';

for (const palette of ['pearl', 'ember', 'lagoon', 'ink', 'rose', 'aurora']) {
  test(`keeps the original look at rest: ${palette}`, async ({ page, testPage }) => {
    await page.goto(`${testPage}?view=fidelity&palette=${palette}&t=2.5&size=240`);
    await expect(page.locator('body')).toHaveAttribute('data-done', 'true');
    const shot = await page.locator('#ours').screenshot({ omitBackground: true });
    const file = `${dir}/${palette}.png`;
    if (update || !existsSync(file)) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, shot);
      test.skip(!update, `wrote missing reference ${file}`);
      return;
    }
    const diff = await page.evaluate(async ([now, ref]) => {
      const read = async (data: string) => {
        const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, c.width, c.height).data;
      };
      const [a, b] = [await read(now!), await read(ref!)];
      if (a.length !== b.length) return { mean: 255, overShare: 1, spread: 0 };
      let sum = 0, over = 0, l = 0, l2 = 0;
      for (let i = 0; i < a.length; i++) {
        const d = Math.abs(a[i]! - b[i]!);
        sum += d;
        if (d > 2) over++;
        if (i % 4 === 1) { l += a[i]!; l2 += a[i]! * a[i]!; }
      }
      const n = a.length / 4;
      return { mean: sum / a.length, overShare: over / a.length, spread: Math.sqrt(l2 / n - (l / n) ** 2) };
    }, [shot.toString('base64'), readFileSync(file).toString('base64')]);
    console.log(palette, JSON.stringify(diff));
    // A blank or failed render has no spread.
    expect(diff.spread).toBeGreaterThan(8);
    // The same shader at rest: identical up to float rounding (GPU differences allowed a little room).
    expect(diff.mean).toBeLessThan(0.5);
    expect(diff.overShare).toBeLessThan(0.001);
  });
}
