import { createContext, useContext, type ReactNode } from 'react';
import { TalkingMarble, type TalkingMarbleProps } from 'talking-marble';
import { colorsOf } from '../palettes';
import type { ShotId } from './camera';
import { usePick } from './pick';

/** Whether the shot around a component is on screen at all. Outside the camera page (docs), always. */
const ShotLive = createContext(true);
export const useShotLive = () => useContext(ShotLive);

/**
 * A small marble that pauses while its shot is off screen (shots stack over one another, so the browser can't tell)
 * and, unless told otherwise, wears the palette picked in the gallery (F-21).
 */
export function Marble(props: TalkingMarbleProps) {
  const live = useShotLive();
  const { palette } = usePick();
  return <TalkingMarble palette={colorsOf(palette)} {...props} paused={props.paused || !live} />;
}

/**
 * One shot: a section fixed over the scene, its words and controls straight on the stage (no panel around them).
 * The camera page writes its opacity each frame; `live` pauses its small marbles while it can't be seen. Focus
 * moving into it brings the camera here, so keyboard order runs through the shots like a page.
 */
export function Shot({ id, live, register, children }: {
  id: ShotId; live: boolean; register: (id: ShotId, el: HTMLElement | null) => void; children: ReactNode;
}) {
  return (
    <section id={id} ref={el => register(id, el)} className={`shot shot--${id}`} aria-labelledby={`${id}-title`}>
      <div className="shot__panel"><ShotLive.Provider value={live}>{children}</ShotLive.Provider></div>
    </section>
  );
}
