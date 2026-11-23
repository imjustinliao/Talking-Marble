import { useEffect, useRef, useState } from 'react';
import { TalkingMarble, resolvePalette, type TalkingMarbleProps } from 'talking-marble';

/**
 * A live marble that exists only while it is on (or near) the screen. Each live marble is a WebGL context and
 * browsers allow about 16 at once, so offscreen ones are unmounted and a still picture in their colours stands in.
 */
export function LiveMarble({ size, className = '', ...props }: TalkingMarbleProps & { size: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current!;
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const io = new IntersectionObserver(entries => setNear(!!entries[entries.length - 1]?.isIntersecting), { rootMargin: '120px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const [ground, p1, p2, p3] = resolvePalette(props.palette);
  return (
    <span ref={ref} className={`live-marble ${className}`} style={{ width: size, height: size }} data-live={near || undefined}>
      {near ? (
        <TalkingMarble {...props} size={size} />
      ) : (
        <span
          className="live-marble__still"
          aria-hidden="true"
          style={{ background: `radial-gradient(circle at 34% 30%, #fff 0 6%, ${ground} 22%, ${p1} 48%, ${p2} 72%, ${p3})` }}
        />
      )}
    </span>
  );
}
