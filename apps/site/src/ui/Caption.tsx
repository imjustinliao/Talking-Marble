import { useEffect, useState } from 'react';

/**
 * A word under a marble (F-66, F-73): plain type, no box. A new word crossfades in over the old one (each slightly
 * blurred and spaced on its way), so the change is a dissolve, not a switch. The intro's state, and the demo's (F-99).
 */
export function Caption({ word, className = '' }: { word?: string; className?: string }) {
  const [words, setWords] = useState<{ cur?: string; prev?: string; n: number }>({ cur: word, n: 0 });
  useEffect(() => { setWords(w => (w.cur === word ? w : { cur: word, prev: w.cur, n: w.n + 1 })); }, [word]);
  return (
    <span className={`stage-caption ${className}`} aria-hidden="true" data-on={word ? '' : undefined}>
      {words.prev && <span key={`p${words.n}`} className="stage-caption__word stage-caption__word--out">{words.prev}</span>}
      <span key={`c${words.n}`} className="stage-caption__word" data-in={words.n ? '' : undefined}>{words.cur ?? ''}</span>
    </span>
  );
}
