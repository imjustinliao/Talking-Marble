import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, PauseIcon, PlayIcon } from './icons';

/**
 * The launch film (F-114). The file lives in the GitHub repository and is streamed from jsDelivr, the free CDN for
 * public GitHub repositories (raw GitHub links do not play in a <video>); the site's own copy on Vercel is the
 * fallback the browser tries next.
 */
const FILE = 'film/launch.mp4';
const SOURCES = [`https://cdn.jsdelivr.net/gh/imjustinliao/Talking-Marble@main/apps/site/public/${FILE}`, `${import.meta.env.BASE_URL}${FILE}`];
const POSTER = `${import.meta.env.BASE_URL}film/launch-poster.jpg`;

/** The hero's button: it opens the film over the page. */
export function FilmButton() {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={button} type="button" className="btn btn--link film-btn" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <PlayIcon />Watch the film
      </button>
      {open && <Film onClose={() => { setOpen(false); button.current?.focus(); }} />}
    </>
  );
}

/**
 * The film over the page: plays with sound as it opens (it was asked for with a click), one button to play and pause
 * (a click on the picture or Space does the same), a thin line for where it is, and × or Esc to close.
 */
function Film({ onClose }: { onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const toggle = () => { const v = video.current; if (!v) return; if (v.paused || v.ended) void v.play().catch(() => {}); else v.pause(); };

  useEffect(() => {
    close.current?.focus();
    void video.current?.play().catch(() => {});
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === ' ' && !(e.target as HTMLElement).closest('button')) { e.preventDefault(); toggle(); }
    };
    addEventListener('keydown', onKey);
    const html = document.documentElement, overflow = html.style.overflow;
    html.style.overflow = 'hidden'; // the page does not scroll (and the camera does not move) behind the film
    return () => { removeEventListener('keydown', onKey); html.style.overflow = overflow; };
  }, [onClose]);

  return createPortal(
    <div className="film" role="dialog" aria-modal="true" aria-label="Talking Marble launch film" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="film__frame">
        <video
          ref={video} className="film__video" poster={POSTER} playsInline preload="auto" onClick={toggle}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
          onTimeUpdate={e => { const v = e.currentTarget; setProgress(v.duration ? v.currentTime / v.duration : 0); }}
        >
          {SOURCES.map(src => <source key={src} src={src} type="video/mp4" />)}
        </video>
        <div className="film__bar">
          <button type="button" className="film__play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <span className="film__track" aria-hidden="true"><span className="film__done" style={{ transform: `scaleX(${progress})` }} /></span>
        </div>
      </div>
      <button ref={close} type="button" className="film__close" onClick={onClose} aria-label="Close the film"><CloseIcon /></button>
    </div>,
    document.body,
  );
}
