import { CopyButton } from '../components/CopyButton';
import { highlight } from '../components/Highlight';

/** One block of code on the home page (the Guide, Create's Code): a label, the code inset and tinted, its own Copy. */
export function CodeBlock({ label, code, what }: { label: string; code: string; what: string }) {
  return (
    <div className="block">
      <p className="block__label">{label}</p>
      <div className="block__code">
        <pre className="mono" tabIndex={0} aria-label={what}><code>{highlight(code)}</code></pre>
        <CopyButton text={code} what={what} />
      </div>
    </div>
  );
}
