// Copies the platform-neutral core (packages/core/) into src/generated/core.ts, so the package ships it
// without needing raw-file imports in every bundler. Run before build, test and dev.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../core');
const read = file => readFileSync(join(root, file), 'utf8');
/** GLSL without comments, indentation or blank lines: the package ships the code, packages/core/ keeps the commentary. */
const glsl = file => read(file)
  .split('\n')
  .map(line => line.replace(/\/\/.*$/, '').trim())
  .filter(Boolean)
  .join('\n');
const out = join(dirname(fileURLToPath(import.meta.url)), '../src/generated/core.ts');

const body = `// Generated from packages/core/ by scripts/gen-core.mjs. Do not edit.
export const vertexSource = ${JSON.stringify(glsl('shader/orb.vert.glsl'))};
export const fragmentSource = ${JSON.stringify(glsl('shader/orb.frag.glsl'))};
export const paletteData = ${read('presets/palettes.json').trim()} as const;
export const stateData = ${read('presets/states.json').trim()} as const;
export const emotionData = ${read('presets/emotions.json').trim()} as const;
`;
mkdirSync(dirname(out), { recursive: true });
// Only when it changed: a rewrite would reload every dev server (and test page) that imports it.
if (!existsSync(out) || readFileSync(out, 'utf8') !== body) writeFileSync(out, body);
