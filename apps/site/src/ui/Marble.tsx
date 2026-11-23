import { TalkingMarble, type TalkingMarbleProps } from 'talking-marble';

/**
 * The marble standing on a glossy black floor: a pool of its own light falls on the floor and a faint,
 * blurred reflection sits below it. The reflection is the browser mirroring the live canvas
 * (-webkit-box-reflect: no second WebGL context), blurred by a thin glass layer; browsers without
 * box-reflect (Firefox) show the floor and light pool only.
 */
export function Marble({ size, light, className = '', backdrop = 'dark', ...props }: Omit<TalkingMarbleProps, 'size'> & {
  size: number | string; light?: string; backdrop?: 'dark' | 'light';
}) {
  const width = typeof size === 'number' ? `${size}px` : size;
  return (
    <div className={`marble ${className}`} data-backdrop={backdrop} style={{ ['--size' as string]: width, ['--light' as string]: light ?? 'var(--marble)' }}>
      <div className="marble__pool" aria-hidden="true" />
      <TalkingMarble {...props} className="marble__orb" />
      <div className="marble__floor" aria-hidden="true" />
    </div>
  );
}
