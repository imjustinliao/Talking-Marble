#!/usr/bin/env node
// Renders the README's pictures from the real <TalkingMarble> component, into docs/media/. Re-run after the orb's
// look, its states or its emotions change:  pnpm --filter site readme-media
//
// Needs: the workspace installed (Vite, Playwright's Chromium) and ffmpeg with libwebp on PATH (or FFMPEG=...).
// How: as scripts/render-media.mjs: Vite serves media.html, Playwright drives it on a fake clock (exact frames),
// ffmpeg encodes. Writes: demo.webp (animated, plays in the README), demo.mp4 (the same clip), states.png,
// emotions.png, palettes.png and site.png (the website's palettes walk).
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
// The site's simulated voice, the same one the page uses (Node runs the TypeScript directly).
import { voiceLevel } from '../src/simulated.ts';

const site = fileURLToPath(new URL('..', import.meta.url));
const repo = join(site, '..', '..');
const out = join(repo, 'docs', 'media');
const port = Number(process.env.MEDIA_PORT ?? 5177);
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
const { chromium } = createRequire(join(repo, 'package.json'))('@playwright/test');

// The clip: one conversation turn, looping seamlessly (the tail crossfades into the head).
const CLIP = { fps: 25, seconds: 10, fade: 0.6, size: 250 };
const TIMELINE = [ // [start second, state, caption]
  [0, 'idle', 'idle'], [1.2, 'listening', 'listening'], [3.0, 'thinking', 'thinking'],
  [4.6, 'searching', 'searching'], [6.4, 'speaking', 'speaking'], [9.0, 'idle', 'idle'],
];


const run = (args) => execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });

execFileSync('pnpm', ['--filter', 'talking-marble', 'gen'], { cwd: repo, stdio: 'inherit' });
mkdirSync(out, { recursive: true });
const server = await createServer({ root: site, configFile: join(site, 'vite.config.ts'), server: { port, strictPort: true, host: '127.0.0.1' }, logLevel: 'warn' });
await server.listen();
const browser = await chromium.launch();
const tmp = mkdtempSync(join(tmpdir(), 'talking-marble-readme-'));

/** Opens a media page on a fake clock and waits until every orb draws. */
async function open(query, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  await page.clock.install({ time: 0 });
  await page.goto(`http://127.0.0.1:${port}/media.html?${query}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const orbs = [...document.querySelectorAll('[data-talking-marble]')];
    return orbs.length > 0 && orbs.every(o => o.getAttribute('data-ready') === 'true');
  });
  await page.clock.runFor(1800);
  return page;
}

try {
  // 1. Stills: every state, every emotion, every palette, named.
  for (const [set, size] of [['states', 120], ['emotions', 130], ['palettes', 120]]) {
    const page = await open(`mode=grid&set=${set}&size=${size}&level=0`, { width: 1400, height: 900 });
    const png = join(tmp, `${set}.png`);
    await page.locator('#frame').screenshot({ path: png });
    await page.close();
    // Half the 2× render: sharp on retina screens, light to load.
    run(['-i', png, '-vf', 'scale=iw/2*1.5:-1:flags=lanczos', join(out, `${set}.png`)]);
  }

  // 2. The clip, frame by frame.
  const { fps, seconds, fade, size } = CLIP;
  const page = await browser.newPage({ viewport: { width: 800, height: 450 }, deviceScaleFactor: 1 });
  await page.clock.install({ time: 0 });
  await page.goto(`http://127.0.0.1:${port}/media.html?mode=hero&size=${size}`);
  await page.locator('[data-talking-marble][data-ready="true"]').waitFor();
  await page.clock.runFor(1500);
  const set = next => page.evaluate(n => window.media.set(n), next);
  const loopFrames = seconds * fps, fadeFrames = Math.round(fade * fps);
  let current = '';
  for (let i = 0; i < loopFrames + fadeFrames; i++) {
    const t = (i / fps) % seconds;
    const [, state, caption] = TIMELINE.filter(([start]) => t >= start).at(-1);
    if (state !== current) { await set({ state, caption }); current = state; }
    await set({ level: state === 'speaking' || state === 'listening' ? voiceLevel(t) : 0 });
    await page.clock.runFor(1000 / fps);
    await page.locator('#frame').screenshot({ path: join(tmp, `f${String(i).padStart(4, '0')}.png`) });
  }
  await page.close();
  const loop = `[0]fps=${fps},format=yuv444p,split[x][y];[x]trim=start_frame=${fadeFrames},setpts=PTS-STARTPTS,fps=${fps}[a];` +
    `[y]trim=end_frame=${fadeFrames},setpts=PTS-STARTPTS,fps=${fps}[b];[a][b]xfade=transition=fade:duration=${fade}:offset=${seconds - fade}`;
  const frames = ['-framerate', String(fps), '-i', join(tmp, 'f%04d.png')];
  run([...frames, '-filter_complex', `${loop},format=yuv420p[v]`, '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-movflags', '+faststart', '-an', join(out, 'demo.mp4')]);
  run([...frames, '-filter_complex', `${loop},scale=640:-1:flags=lanczos,format=yuv420p[v]`, '-map', '[v]', '-c:v', 'libwebp_anim', '-quality', '72', '-loop', '0', '-an', join(out, 'demo.webp')]);

  // 3. The website: the palettes walk, where you try every state and emotion.
  const web = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await web.goto(`http://127.0.0.1:${port}/#palettes`);
  await web.waitForTimeout(3500);
  await web.screenshot({ path: join(out, 'site.png') });
  await web.close();

  for (const f of ['demo.webp', 'demo.mp4', 'states.png', 'emotions.png', 'palettes.png', 'site.png']) {
    console.log(`${f.padEnd(14)} ${(statSync(join(out, f)).size / 1024).toFixed(1)} kB`);
  }
} finally {
  await browser.close();
  await server.close();
  rmSync(tmp, { recursive: true, force: true });
}
