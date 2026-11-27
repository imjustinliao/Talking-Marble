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
      <button ref={button} type="button" className="film-btn" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label="Watch the film" title="Watch the film">
        <PlayIcon />
      </button>
      {open && <Film onClose={() => { setOpen(false); button.current?.focus(); }} />}
    </>
  );
}

/** m:ss */
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * The film over the page: plays with sound as it opens (it was asked for with a click). One button plays and pauses
 * (a click on the picture or Space does the same); a scrubber to drag or step with the arrow keys, with the time beside
 * it; × or Esc closes it, fading and settling away rather than vanishing (F-115).
 */
function Film({ onClose }: { onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(0);
  const [closing, setClosing] = useState(false);
  const toggle = () => { const v = video.current; if (!v) return; if (v.paused || v.ended) void v.play().catch(() => {}); else v.pause(); };
  // Closing plays its exit (0.3 s), then leaves; with reduced motion it leaves at once.
  const leave = () => {
    if (closing) return;
    video.current?.pause();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { onClose(); return; }
    setClosing(true);
    setTimeout(onClose, 300);
  };

  useEffect(() => {
    close.current?.focus();
    void video.current?.play().catch(() => {});
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); leaveRef.current(); }
      else if (e.key === ' ' && !(e.target as HTMLElement).closest('button, input')) { e.preventDefault(); toggle(); }
    };
    addEventListener('keydown', onKey);
    const html = document.documentElement, overflow = html.style.overflow;
    html.style.overflow = 'hidden'; // the page does not scroll (and the camera does not move) behind the film
    return () => { removeEventListener('keydown', onKey); html.style.overflow = overflow; };
  }, []);
  const leaveRef = useRef(leave);
  leaveRef.current = leave;

  return createPortal(
    <div className="film" data-closing={closing || undefined} role="dialog" aria-modal="true" aria-label="Talking Marble launch film" onClick={e => { if (e.target === e.currentTarget) leave(); }}>
      <div className="film__frame">
        <video
          ref={video} className="film__video" poster={POSTER} playsInline preload="auto" onClick={toggle}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
          onTimeUpdate={e => setTime(e.currentTarget.currentTime)} onLoadedMetadata={e => setLength(e.currentTarget.duration || 0)}
        >
          {SOURCES.map(src => <source key={src} src={src} type="video/mp4" />)}
        </video>
        <div className="film__bar">
          <button type="button" className="film__play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <input
            type="range" className="film__seek" aria-label="Seek" min={0} max={length || 0} step={0.05} value={Math.min(time, length || 0)}
            style={{ ['--p' as string]: length ? `${(time / length) * 100}%` : '0%' }}
            aria-valuetext={`${clock(time)} of ${clock(length)}`}
            onChange={e => { const v = video.current; if (v) { v.currentTime = +e.target.value; setTime(+e.target.value); } }}
          />
          <span className="film__time mono" aria-hidden="true">{clock(time)} / {clock(length)}</span>
        </div>
      </div>
      <button ref={close} type="button" className="film__close" onClick={leave} aria-label="Close the film"><CloseIcon /></button>
    </div>,
    document.body,
  );
}
