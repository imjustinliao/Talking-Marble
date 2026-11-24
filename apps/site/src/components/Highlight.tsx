import type { ReactNode } from 'react';

/**
 * A tiny highlighter for the site's own snippets (a shell command, imports, JSX, the docs' recipes), tinted with
 * the marble's pigments by CSS (F-28, F-34). Not a general parser: it knows comments, strings, keywords, tags and props.
 */
const TOKEN = new RegExp([
  /(\/\/[^\n]*)/.source,
  /('[^'\n]*'|"[^"\n]*"|`[^`]*`)/.source,
  /\b(import|from|export|const|let|function|return|async|await|type|switch|case|break|if|new|npm|i)\b(?=[\s(])/.source,
  /(<\/?[A-Z][\w.]*|\/?>)/.source,
  /\b([a-z][\w-]*)(?==[{'"])/.source,
  /(\{|\})/.source,
].join('|'), 'g');
const KINDS = ['comment', 'str', 'kw', 'tag', 'attr', 'punct'] as const;

export function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0, k = 0;
  for (const m of code.matchAll(TOKEN)) {
    if (m.index! > last) out.push(code.slice(last, m.index));
    const kind = KINDS[m.slice(1).findIndex(g => g !== undefined)]!;
    out.push(<span key={k++} className={`tok tok--${kind}`}>{m[0]}</span>);
    last = m.index! + m[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}
