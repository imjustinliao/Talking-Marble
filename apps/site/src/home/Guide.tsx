import { useState } from 'react';
import { CopyButton } from '../components/CopyButton';
import { DEVICES, FRAMEWORKS, type Framework } from '../platforms';
import { mineColors, mineHtml, mineJsx, minePreset, useMine, type Mine } from '../scene/mine';
import { useStageWish } from '../scene/stage';
import { LinkButtons } from '../ui/Chrome';
import { CodeBlock } from '../ui/CodeBlock';
import { useGlide } from '../ui/Controls';

const INSTALL = 'npm i talking-marble';
const DOCS_URL = 'https://talking-marble.vercel.app/docs/';

/** The usage for each framework, with your marble (`short`: the preset by name). */
function usageOf(fw: Framework, m: Mine, short: boolean): string {
  if (fw === 'React') return `import { TalkingMarble } from 'talking-marble';\n\n${mineJsx(m, short)}`;
  const sets = ['marble.state = agentState;', 'marble.audio = agentStream;', ...(minePreset(m) && short ? ['marble.presets = presets;'] : [])];
  return `import 'talking-marble/element';\n\n${mineHtml(m, short)}\n\n// marble: the element; on your voice SDK's events\n${sets.join('\n')}`;
}

/** A prompt for an AI coding agent: add this marble to my app (F-34), for the framework chosen. */
function prompt(fw: Framework, m: Mine): string {
  const preset = minePreset(m);
  const where = fw === 'React' ? 'my React app' : 'my web app (any framework or plain HTML) as the <talking-marble> Web Component';
  const how = fw === 'React'
    ? "`state` is my voice agent's state: idle, connecting, listening, thinking, searching (while it looks something up or calls a tool), speaking or error. `audio` is the agent's voice as a MediaStream, an HTMLMediaElement or a Web Audio node (or pass `level`, 0 to 1). Map my voice SDK's events to `state` and pass its audio."
    : "Set the element's `state` (attribute or property) to my voice agent's state: idle, connecting, listening, thinking, searching (while it looks something up or calls a tool), speaking or error. Set its `audio` property to the agent's voice as a MediaStream, an HTMLMediaElement or a Web Audio node (or `level`, 0 to 1). Map my voice SDK's events to `state` and pass its audio.";
  return [
    `Add Talking Marble, an audio-reactive orb for voice AI apps, to ${where}.`,
    '',
    `Install: ${INSTALL}`,
    '',
    'Usage:',
    usageOf(fw, m, !!preset),
    ...(preset ? ['', `where presets is ${JSON.stringify(preset)}`] : []),
    '',
    how,
    `Docs: ${DOCS_URL}`,
  ].join('\n');
}

/**
 * The Guide (F-24, F-29, F-34): only what is needed, with the code styled as code. A switch bar of what it works
 * with (React, the Web Component: PLAT-01) and Copy prompt above one panel holding Install and Usage (with your
 * marble), then where it runs (F-78), Docs and GitHub. Inspiration: libraries.dev/orbs' Install tab.
 */
export function Guide() {
  const mine = useMine();
  useStageWish('guide', { state: 'speaking', palette: [...mineColors(mine)], voice: { kind: 'sim' } });
  const [fw, setFw] = useState<Framework>('React');
  const { bar, glide } = useGlide(fw);
  const usage = usageOf(fw, mine, true);
  return (
    <div className="guide">
      <h2 id="guide-title" className="shot__title">Guide</h2>
      <div className="guide__bar">
        <div ref={bar} className="seg" role="group" aria-label="Framework">
          {glide}
          {FRAMEWORKS.map(f => <button key={f} type="button" className="seg__opt" aria-pressed={f === fw} onClick={() => setFw(f)}>{f}</button>)}
        </div>
        <CopyButton className="btn btn--small" text={prompt(fw, mine)} what="prompt for your AI agent" label="Copy prompt" />
      </div>
      <div className="panel">
        <CodeBlock label="Install" code={INSTALL} what="install command" />
        <CodeBlock label="Usage" code={usage} what="usage" />
        {mine.design && <p className="guide__note"><code>presets</code> is the preset you exported.</p>}
      </div>
      <ul className="platforms" aria-label="Runs on">{DEVICES.map(d => <li key={d}>{d}</li>)}</ul>
      <LinkButtons />
    </div>
  );
}
