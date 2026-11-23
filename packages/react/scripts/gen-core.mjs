// Copies the platform-neutral core (packages/core/) into src/generated/core.ts, so the package ships it
// without needing raw-file imports in every bundler. Run before build, test and dev.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../core');
const read = file => readFileSync(join(root, file), 'utf8');
const out = join(dirname(fileURLToPath(import.meta.url)), '../src/generated/core.ts');

const body = `// Generated from packages/core/ by scripts/gen-core.mjs. Do not edit.
export const vertexSource = ${JSON.stringify(read('shader/orb.vert.glsl'))};
export const fragmentSource = ${JSON.stringify(read('shader/orb.frag.glsl'))};
export const paletteData = ${read('presets/palettes.json').trim()} as const;
export const stateData = ${read('presets/states.json').trim()} as const;
export const exampleData = ${read('presets/examples.json').trim()} as const;
`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, body);
