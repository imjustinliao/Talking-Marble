import { CopyButton } from './CopyButton';
import { highlight } from './Highlight';

/** A code block: a glass panel whose top edge carries the marble's pigments, a title, Copy, and tinted code. */
export function Code({ code, title, lang }: { code: string; title: string; lang?: string }) {
  return (
    <figure className="code">
      <figcaption>
        <span className="code__title">{title}</span>
        <CopyButton text={code} what={title} />
      </figcaption>
      {/* Focusable so keyboard users can scroll long lines. */}
      <pre tabIndex={0} role="region" aria-label={title} data-lang={lang}><code>{highlight(code)}</code></pre>
    </figure>
  );
}
