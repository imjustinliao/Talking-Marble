// The docs page's reference tables, generated at build time from the sources they describe, so they cannot drift:
// the props from `TalkingMarbleProps` (packages/react/src/TalkingMarble.tsx: names, types, JSDoc, defaults), and the
// preset format from packages/core (spec.md › Parameters for ranges and meanings, presets/states.json for defaults).
// Served to the site as the virtual module `virtual:docs-data` (types in src/docs/docs-data.d.ts).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const file = (path: string) => fileURLToPath(new URL(`../../../packages/${path}`, import.meta.url));
const SOURCES = {
  component: file('react/src/TalkingMarble.tsx'),
  audio: file('react/src/audio/source.ts'),
  spec: file('core/spec.md'),
  states: file('core/presets/states.json'),
  emotions: file('core/presets/emotions.json'),
  palettes: file('core/presets/palettes.json'),
};
const read = (path: string) => readFileSync(path, 'utf8');
const json = (path: string) => JSON.parse(read(path)) as Record<string, unknown>;
const quoted = (names: string[]) => names.map(n => `'${n}'`).join(' | ');

export interface PropDoc { name: string; type: string; default: string; description: string }
export interface FieldDoc { name: string; range: string; default: string; description: string }

/** `TalkingMarbleProps`, one row per prop, in source order. */
export function propsDoc(): PropDoc[] {
  const src = read(SOURCES.component);
  const body = /export interface TalkingMarbleProps \{\n([\s\S]*?)\n\}/.exec(src)?.[1];
  if (!body) throw new Error('docs-data: TalkingMarbleProps not found in TalkingMarble.tsx');
  // Defaults written in the component's parameter list (`state = 'idle'`).
  const params = /export function TalkingMarble\(\{([\s\S]*?)\}: TalkingMarbleProps\)/.exec(src)?.[1] ?? '';
  const defaults = new Map([...params.matchAll(/(\w+) = ([^,\n]+)/g)].map(m => [m[1]!, m[2]!.trim()]));

  // The aliases spelled out, from the data they come from.
  const states = Object.keys((json(SOURCES.states).states as object));
  const emotions = Object.keys(json(SOURCES.emotions));
  const palettes = Object.keys(json(SOURCES.palettes));
  const audio = /export type OrbAudioSource = ([^;]+);/.exec(read(SOURCES.audio))?.[1];
  const aliases: Record<string, string> = {
    OrbState: `${quoted(states)} | string`,
    OrbEmotion: `${quoted(emotions)} | string`,
    OrbPalette: `${quoted(palettes)} | string[]`,
    OrbAudioSource: audio ?? 'OrbAudioSource',
  };

  const rows: PropDoc[] = [];
  let doc = '';
  const lines = body.split('\n').map(l => l.trim());
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.startsWith('/**')) {
      const parts = [line];
      while (!lines[i]!.endsWith('*/')) parts.push(lines[++i]!);
      doc = parts.join(' ').replace(/^\/\*\*|\*\/$/g, '').replace(/\s\*\s/g, ' ').replace(/\s+/g, ' ').trim();
      continue;
    }
    const m = /^'?([\w-]+)'?\??: (.+);$/.exec(line);
    if (!m) continue;
    const [, name, rawType] = m as unknown as [string, string, string];
    const type = rawType.replace(/ \| null$/, '').split(' | ').map(t => aliases[t] ?? t).join(' | ');
    // "Default `idle`." / "Default true." / "Default: fills its container's width (square)." in the JSDoc.
    const said = /\s*Default:? ([^.]+(?:\.\w[^.]*)?)\./.exec(doc);
    const description = (said ? doc.replace(said[0], '') : doc).trim();
    const def = defaults.get(name) ?? said?.[1]?.replace(/^`|`$/g, '').trim() ?? '';
    rows.push({ name, type, default: def, description });
    doc = '';
  }
  return rows;
}

/** The preset format: every field with its range, default and meaning. */
export function presetDoc(): { fields: FieldDoc[]; base: Record<string, unknown> } {
  const spec = read(SOURCES.spec);
  const table = /## Parameters\n[\s\S]*?\n(\| Parameter[\s\S]*?)\n\n/.exec(spec)?.[1];
  if (!table) throw new Error('docs-data: the Parameters table was not found in packages/core/spec.md');
  const base = json(SOURCES.states).base as Record<string, unknown>;
  const fields: FieldDoc[] = table.split('\n').slice(2).map(row => {
    const [name, range, specBase, meaning] = row.split('|').slice(1, -1).map(c => c.trim().replace(/`/g, '')) as [string, string, string, string];
    if (!(name in base)) throw new Error(`docs-data: spec.md lists "${name}", which states.json's base lacks`);
    if (String(base[name]).replace(/"/g, '') !== specBase.replace(/"/g, '')) {
      throw new Error(`docs-data: "${name}" rests at ${specBase} in spec.md but ${String(base[name])} in states.json`);
    }
    return { name, range, default: JSON.stringify(base[name]), description: `${meaning}.` };
  });
  const missing = Object.keys(base).filter(k => !fields.some(f => f.name === k));
  if (missing.length) throw new Error(`docs-data: spec.md's Parameters table lacks ${missing.join(', ')}`);
  // The two optional fields the spec describes in prose.
  fields.push(
    { name: 'colors', range: 'four hex colors, ground first', default: 'none', description: 'The only way a preset changes colour; without it the orb wears its palette. Built-in states and emotions never set it.' },
    { name: 'label', range: 'text', default: 'its name', description: 'Its name for assistive technology, e.g. "celebrating".' },
  );
  return { fields, base };
}

const ID = 'virtual:docs-data';

/** `import { props, preset } from 'virtual:docs-data'`; reloads when a source changes in dev. */
export function docsData(): Plugin {
  return {
    name: 'talking-marble-docs-data',
    resolveId: id => (id === ID ? `\0${ID}` : undefined),
    load(id) {
      if (id !== `\0${ID}`) return;
      for (const path of Object.values(SOURCES)) this.addWatchFile(path);
      return `export const props = ${JSON.stringify(propsDoc())};\nexport const preset = ${JSON.stringify(presetDoc())};\n`;
    },
  };
}
