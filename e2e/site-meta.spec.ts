import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

// The GitHub Pages build (base /Talking-Marble/), served from a temp folder on a free port, as Pages would serve it.
const SITE = 'https://imjustinliao.github.io/Talking-Marble/';
const siteDir = fileURLToPath(new URL('../apps/site', import.meta.url));
const TYPES: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.txt': 'text/plain', '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.woff2': 'font/woff2',
};

let dist = '';
let server: Server;
let origin = '';
/** A production URL (https://imjustinliao.github.io/Talking-Marble/x) on the local server. */
const local = (url: string) => url.replace('https://imjustinliao.github.io', origin);

test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);

test.beforeAll(async () => {
  dist = mkdtempSync(join(tmpdir(), 'talking-marble-pages-'));
  execFileSync('pnpm', ['exec', 'vite', 'build', '--outDir', dist, '--emptyOutDir'], { cwd: siteDir, env: { ...process.env, GITHUB_PAGES: '1' }, stdio: 'pipe' });
  server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url!, 'http://x').pathname);
    if (!path.startsWith('/Talking-Marble/')) { res.writeHead(404).end(); return; }
    let rel = normalize(path.slice('/Talking-Marble/'.length) || 'index.html');
    if (rel.endsWith('/')) rel += 'index.html'; // as Pages serves /docs/
    if (rel.startsWith('..')) { res.writeHead(403).end(); return; }
    try {
      const body = readFileSync(join(dist, rel));
      res.writeHead(200, { 'content-type': TYPES[extname(rel)] ?? 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.afterAll(() => {
  server?.close();
  if (dist) rmSync(dist, { recursive: true, force: true });
});

/** Width and height of a PNG, JPEG or MP4 (first video track) file. */
function dimensions(file: Buffer): [number, number] {
  if (file.readUInt32BE(0) === 0x89504e47) return [file.readUInt32BE(16), file.readUInt32BE(20)];
  if (file[0] === 0xff && file[1] === 0xd8) {
    for (let i = 2; i < file.length;) {
      const marker = file[i + 1]!;
      if (marker >= 0xc0 && marker <= 0xc3) return [file.readUInt16BE(i + 7), file.readUInt16BE(i + 5)];
      i += 2 + file.readUInt16BE(i + 2);
    }
  }
  // MP4: the video track's tkhd box ends with width and height as 16.16 fixed point.
  for (let i = file.indexOf('tkhd'); i > 0; i = file.indexOf('tkhd', i + 4)) {
    const size = file.readUInt32BE(i - 4), end = i - 4 + size;
    const [w, h] = [file.readUInt32BE(end - 8) >>> 16, file.readUInt32BE(end - 4) >>> 16];
    if (w && h) return [w, h];
  }
  throw new Error('unknown format');
}

test('the head has complete, absolute link-preview and SEO tags', async ({ page }) => {
  await page.goto(`${origin}/Talking-Marble/`);
  const meta = (key: string) => page.locator(`meta[property="${key}"], meta[name="${key}"]`).first().getAttribute('content');

  await expect(page).toHaveTitle(/Talking Marble/);
  expect(await meta('description')).toMatch(/audio-reactive orb/);
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(SITE);
  for (const key of ['og:type', 'og:site_name', 'og:locale', 'og:title', 'og:description', 'og:image:alt', 'twitter:title', 'twitter:description', 'twitter:image:alt']) {
    expect(await meta(key), key).toBeTruthy();
  }
  expect(await meta('og:url')).toBe(SITE);
  expect(await meta('twitter:card')).toBe('summary_large_image');
  for (const key of ['og:image', 'og:image:secure_url', 'og:video', 'og:video:secure_url', 'twitter:image']) {
    expect(await meta(key), key).toMatch(/^https:\/\/imjustinliao\.github\.io\/Talking-Marble\/\S+$/);
  }
  expect(await meta('og:image:type')).toBe('image/jpeg');
  expect(await meta('og:video:type')).toBe('video/mp4');
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);

  // Structured data parses and points at the repository.
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  const code = ld['@graph'].find((n: { '@type': string }) => n['@type'] === 'SoftwareSourceCode');
  expect(code.codeRepository).toBe('https://github.com/imjustinliao/Talking-Marble');
});

test('the docs page is real HTML with its own canonical, title and cards', async ({ page }) => {
  await page.goto(`${origin}/Talking-Marble/docs/`);
  await expect(page).toHaveTitle(/^Docs/);
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(`${SITE}docs/`);
  expect(await page.locator('meta[property="og:url"]').getAttribute('content')).toBe(`${SITE}docs/`);
  expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe(`${SITE}og-image.jpg`);
  // Linked assets carry the Pages base path.
  for (const href of await page.locator('link[rel="icon"], link[rel="manifest"], script[type="module"]').evaluateAll(els => els.map(e => (e as HTMLLinkElement).href || (e as HTMLScriptElement).src))) {
    expect(new URL(href).pathname, href).toMatch(/^\/Talking-Marble\//);
  }
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld['@graph'].map((n: { '@type': string }) => n['@type'])).toEqual(['TechArticle', 'BreadcrumbList']);
  // The page renders its content from the built bundle.
  await expect(page.getByRole('heading', { level: 1, name: 'Docs' })).toBeVisible();
});

test('every referenced file resolves, with sizes that match the tags and platform limits', async ({ page, request }) => {
  await page.goto(`${origin}/Talking-Marble/`);
  const meta = async (key: string) => (await page.locator(`meta[property="${key}"]`).getAttribute('content'))!;
  const get = async (url: string) => {
    const res = await request.get(url);
    expect(res.status(), url).toBe(200);
    return res;
  };

  // Icons and manifest, as the page links them (base-prefixed).
  const links = await page.locator('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"], link[rel="alternate"]').evaluateAll(
    els => els.map(el => (el as HTMLLinkElement).href),
  );
  expect(links.length).toBe(5);
  for (const href of links) expect(new URL(href).pathname, href).toMatch(/^\/Talking-Marble\//);
  for (const href of links) await get(href);

  const touch = await get(await page.locator('link[rel="apple-touch-icon"]').evaluate(el => (el as HTMLLinkElement).href));
  expect(dimensions(await touch.body())).toEqual([180, 180]);

  const ico = await (await get(`${origin}/Talking-Marble/favicon.ico`)).body();
  expect(ico.readUInt16LE(2)).toBe(1); // icon type
  expect([...Array(ico.readUInt16LE(4)).keys()].map(i => ico[6 + 16 * i])).toEqual([16, 32, 48]);

  const manifest = await (await get(`${origin}/Talking-Marble/site.webmanifest`)).json();
  expect(manifest.name).toBe('Talking Marble');
  for (const icon of manifest.icons as { src: string; sizes: string }[]) {
    const file = await (await get(new URL(icon.src, `${origin}/Talking-Marble/site.webmanifest`).href)).body();
    expect(dimensions(file).join('x'), icon.src).toBe(icon.sizes);
  }
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);

  // Link-preview image: tagged size, under WhatsApp's 300 kB guidance (the strictest limit found).
  const image = await (await get(local(await meta('og:image')))).body();
  expect(dimensions(image)).toEqual([Number(await meta('og:image:width')), Number(await meta('og:image:height'))]);
  expect(image.length).toBeLessThan(300 * 1024);

  // Link-preview video: tagged size, MP4, and with icon and image well under iMessage's 10 MB total.
  const videoRes = await get(local(await meta('og:video')));
  expect(videoRes.headers()['content-type']).toBe('video/mp4');
  const video = await videoRes.body();
  expect(video.subarray(4, 8).toString()).toBe('ftyp');
  expect(dimensions(video)).toEqual([Number(await meta('og:video:width')), Number(await meta('og:video:height'))]);
  expect(video.length + image.length).toBeLessThan(5 * 1024 * 1024);

  // Crawler and AI files at the site root.
  expect(await (await get(`${origin}/Talking-Marble/robots.txt`)).text()).toContain(`Sitemap: ${SITE}sitemap.xml`);
  expect(await (await get(`${origin}/Talking-Marble/sitemap.xml`)).text()).toContain(`<loc>${SITE}</loc>`);
  const llms = await (await get(`${origin}/Talking-Marble/llms.txt`)).text();
  expect(llms.startsWith('# Talking Marble\n')).toBe(true);
  expect(llms).toContain('npm i talking-marble');
  expect(await (await get(`${origin}/Talking-Marble/sitemap.xml`)).text()).toContain(`<loc>${SITE}docs/</loc>`);
  expect(llms).toContain(`${SITE}docs/#props`);
  // The dev-only render page is not shipped.
  expect((await request.get(`${origin}/Talking-Marble/media.html`)).status()).toBe(404);
  expect(statSync(join(dist, 'index.html')).size).toBeGreaterThan(0);
});
