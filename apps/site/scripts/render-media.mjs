#!/usr/bin/env node
// Renders the site's icons, link-preview image and link-preview video from the real <TalkingMarble>
// component, into site/public/. Re-run after the orb's look changes:  pnpm --filter site media
//
// Needs: the workspace installed (Vite, Playwright's Chromium) and ffmpeg on PATH (or FFMPEG=/path/to/ffmpeg).
// How: starts Vite on site/media.html (a dev-only page that lays the orb out), drives it with Playwright
// (a fake clock, so video frames are exact), and encodes with ffmpeg.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const site = fileURLToPath(new URL('..', import.meta.url));
const repo = join(site, '..', '..');
const out = join(site, 'public');
const port = Number(process.env.MEDIA_PORT ?? 5176);
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
const { chromium } = createRequire(join(repo, 'package.json'))('@playwright/test');

/** The site's stage colour (site/src/styles/base.css). */
const DARK = '#000000';

// Video: a seamless loop through the agent lifecycle (see docs/milestones/site.md › Link previews).
const VIDEO = { width: 1200, height: 630, fps: 30, seconds: 6, fade: 0.5 };
const TIMELINE = [ // [start second, state]; the clip is recorded for seconds + fade
  [0, 'idle'], [1.0, 'listening'], [2.2, 'thinking'], [3.2, 'speaking'], [5.2, 'idle'],
];

/** The site's simulated voice (site/src/simulated.ts › voiceLevel), duplicated because this is plain JS. */
function voiceLevel(t) {
  const syllable = Math.max(0, Math.sin(t * 7.3) * 0.6 + Math.sin(t * 3.1) * 0.4);
  const phrase = Math.sin(t * 0.9) > -0.3 ? 1 : 0;
  return Math.min(1, syllable * phrase * (0.7 + 0.3 * Math.sin(t * 13.7)));
}

const run = (args) => execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });

/** Downscales a PNG with Lanczos, keeping alpha. */
function resize(src, dest, px) {
  run(['-i', src, '-vf', `scale=${px}:${px}:flags=lanczos`, dest]);
}

/** An .ico holding PNG images (supported by every current browser and Windows since Vista). */
function writeIco(dest, pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ px, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(px >= 256 ? 0 : px, e); header.writeUInt8(px >= 256 ? 0 : px, e + 1);
    header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8); header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  writeFileSync(dest, Buffer.concat([header, ...pngs.map(p => p.data)]));
}

execFileSync('pnpm', ['--filter', 'talking-marble', 'gen'], { cwd: repo, stdio: 'inherit' });
const server = await createServer({ root: site, configFile: join(site, 'vite.config.ts'), server: { port, strictPort: true, host: '127.0.0.1' }, logLevel: 'warn' });
await server.listen();
const browser = await chromium.launch();
const tmp = mkdtempSync(join(tmpdir(), 'talking-marble-media-'));

/** Opens the media page and waits until the orb draws. With `clock`, time only moves when told to. */
async function open(query, viewport, { clock = false } = {}) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  if (clock) await page.clock.install({ time: 0 });
  await page.goto(`http://127.0.0.1:${port}/media.html?${query}`);
  await page.locator('[data-talking-marble][data-ready="true"]').waitFor();
  if (clock) await page.clock.runFor(1500); else await page.waitForTimeout(1500);
  return page;
}

try {
  // 1. Icons. The orb alone, transparent, at the renderer's full resolution (512 px).
  const page = await open('mode=orb&size=512', { width: 512, height: 512 }, { clock: true });
  const master = join(tmp, 'orb-512.png');
  await page.locator('#frame').screenshot({ path: master, omitBackground: true });
  await page.close();

  const icons = [];
  for (const px of [16, 32, 48, 128, 192]) {
    const file = join(tmp, `orb-${px}.png`);
    resize(master, file, px);
    icons.push({ px, file });
  }
  const png = px => readFileSync(icons.find(i => i.px === px).file);
  writeIco(join(out, 'favicon.ico'), [16, 32, 48].map(px => ({ px, data: png(px) })));
  // The shader cannot be expressed as vector art, so the SVG favicon wraps a 128 px render (crisp in tabs and bookmarks).
  writeFileSync(join(out, 'favicon.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><image width="128" height="128" href="data:image/png;base64,${png(128).toString('base64')}"/></svg>\n`);
  writeFileSync(join(out, 'icon-192.png'), png(192));
  writeFileSync(join(out, 'icon-512.png'), readFileSync(master));

  // Opaque tiles: Apple touch icon (iOS rounds the corners itself) and the maskable icon (orb inside the 80% safe zone).
  for (const [name, size, scale] of [['apple-touch-icon.png', 180, 0.78], ['icon-maskable-512.png', 512, 0.66]]) {
    const tile = await open(`mode=tile&size=${size}&scale=${scale}&bg=${encodeURIComponent(DARK)}`, { width: size, height: size }, { clock: true });
    await tile.locator('#frame').screenshot({ path: join(out, name) });
    await tile.close();
  }

  // 2. Link-preview image, 1200 × 630 JPEG (small enough for every platform's limit).
  const card = await open('mode=card', { width: 1200, height: 630 }, { clock: true });
  const cardPng = join(tmp, 'card.png');
  await card.locator('#frame').screenshot({ path: cardPng });
  run(['-i', cardPng, '-q:v', '3', join(out, 'og-image.jpg')]);

  // 3. Link-preview video: frames on a fake clock, then a crossfade of the tail into the head for a seamless loop.
  const { fps, seconds, fade } = VIDEO;
  const loopFrames = seconds * fps, fadeFrames = Math.round(fade * fps);
  const set = (next) => card.evaluate(n => window.media.set(n), next);
  let current = '';
  for (let i = 0; i < loopFrames + fadeFrames; i++) {
    const t = i / fps;
    const state = TIMELINE.filter(([start]) => t >= start).at(-1)[1];
    if (state !== current) { await set({ state }); current = state; }
    await set({ level: state === 'speaking' || state === 'listening' ? voiceLevel(t) : 0 });
    await card.clock.runFor(1000 / fps);
    await card.locator('#frame').screenshot({ path: join(tmp, `f${String(i).padStart(4, '0')}.png`) });
  }
  await card.close();
  run([
    '-framerate', String(fps), '-i', join(tmp, 'f%04d.png'),
    '-filter_complex',
    `[0]fps=${fps},format=yuv444p,split[x][y];[x]trim=start_frame=${fadeFrames},setpts=PTS-STARTPTS,fps=${fps}[a];[y]trim=end_frame=${fadeFrames},setpts=PTS-STARTPTS,fps=${fps}[b];` +
    `[a][b]xfade=transition=fade:duration=${fade}:offset=${seconds - fade},format=yuv420p[v]`,
    '-map', '[v]', '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0', '-preset', 'slow', '-crf', '24',
    '-movflags', '+faststart', '-an', join(out, 'og-video.mp4'),
  ]);

  for (const f of ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'og-image.jpg', 'og-video.mp4']) {
    console.log(`${f.padEnd(24)} ${(statSync(join(out, f)).size / 1024).toFixed(1)} kB`);
  }
} finally {
  await browser.close();
  await server.close();
  rmSync(tmp, { recursive: true, force: true });
}
