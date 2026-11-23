import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckIcon, CopyIcon } from '../ui/icons';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers and non-secure contexts: a hidden textarea and the legacy command.
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

/**
 * Copies `text`. Shows a copy icon (and `label`, if given) that turns into a check for a moment;
 * screen readers hear "Copy <what>", then "Copied".
 */
export function CopyButton({ text, what, className = 'icon-btn', label }: { text: string; what: string; className?: string; label?: ReactNode }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const onClick = async () => {
    const ok = await copyText(text);
    setStatus(ok ? 'copied' : 'failed');
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus('idle'), 1600);
  };
  return (
    <button type="button" className={className} onClick={onClick} data-status={status} title={status === 'idle' ? `Copy ${what}` : undefined}>
      {label}
      {status === 'copied' ? <CheckIcon /> : <CopyIcon />}
      <span className="sr-only" aria-live="polite">{status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : `Copy ${what}`}</span>
    </button>
  );
}
