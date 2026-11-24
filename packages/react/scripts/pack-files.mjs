#!/usr/bin/env node
// Before `pnpm pack` / `pnpm publish`: copies the repo's README and LICENSE into the package, with the README's links
// and pictures made absolute (they are relative to the repo root, which npm does not have). Both copies are git-ignored,
// so the repo keeps one README (AGENTS.md: no other Markdown files); `--clean` removes them.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = fileURLToPath(new URL('..', import.meta.url));
const repo = fileURLToPath(new URL('../../..', import.meta.url));
const RAW = 'https://raw.githubusercontent.com/imjustinliao/Talking-Marble/main/';
const BLOB = 'https://github.com/imjustinliao/Talking-Marble/blob/main/';

if (process.argv.includes('--clean')) {
  rmSync(`${pkg}README.md`, { force: true });
  rmSync(`${pkg}LICENSE`, { force: true });
} else {
  const readme = readFileSync(`${repo}README.md`, 'utf8')
    .replace(/(src|href)="(?!https?:|#|mailto:)([^"]+)"/g, (_, attr, path) => `${attr}="${(/\.(png|webp|jpe?g|gif|mp4|svg)$/i.test(path) ? RAW : BLOB) + path}"`)
    .replace(/\]\((?!https?:|#|mailto:)([^)]+)\)/g, (_, path) => `](${(/\.(png|webp|jpe?g|gif|mp4|svg)$/i.test(path) ? RAW : BLOB) + path})`);
  writeFileSync(`${pkg}README.md`, readme);
  writeFileSync(`${pkg}LICENSE`, readFileSync(`${repo}LICENSE`, 'utf8'));
}
