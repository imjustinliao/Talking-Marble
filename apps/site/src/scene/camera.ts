/**
 * The scroll camera. Scrolling moves a camera through one CSS 3D scene along keyframed shots, B-roll style
 * (dolly, truck, crane, push-in), never a plain centre zoom. The page scroll only says where along the path
 * we are; a critically damped spring makes the camera glide there.
 *
 * World units are CSS pixels. The floor is y = 0, up is −y, the main marble stands at the origin.
 */

export interface Pose { x: number; y: number; z: number; yaw: number; pitch: number }

export const MARBLE = 360; // the main marble's diameter in world px
export const PERSPECTIVE = 1000;

export type ShotId = 'intro' | 'colors' | 'pick' | 'talk' | 'install';
export const SHOTS: { id: ShotId; label: string }[] = [
  { id: 'intro', label: 'Marble' },
  { id: 'colors', label: 'Colors' },
  { id: 'pick', label: 'Pick' },
  { id: 'talk', label: 'Talk' },
  { id: 'install', label: 'Install' },
];

/** Scroll length of the walk along the palette curve, in screens. */
export const WALK_SCREENS = 2.4;
/** Where each shot sits along the scroll, in screens; the colors walk spans [1, 1 + WALK_SCREENS]. */
export const STOPS: Record<ShotId, number> = { intro: 0, colors: 1, pick: 2 + WALK_SCREENS, talk: 3 + WALK_SCREENS, install: 4 + WALK_SCREENS };
export const TOTAL = STOPS.install;
const W0 = STOPS.colors, W1 = STOPS.colors + WALK_SCREENS;

/** The palette marbles: along a curve that starts beside the main marble and recedes to the right. */
export const CURVE_SIZE = 280;
export function curvePoint(k: number) {
  return { x: 760 + k * 420, z: -260 - k * 150 - k * k * 6 };
}

const intro = (narrow: boolean): Pose => (narrow
  ? { x: 0, y: -520, z: 2250, yaw: 0, pitch: 9 }
  : { x: -300, y: -360, z: 2050, yaw: 0, pitch: 5 });
/** Zooming in on the marble before the camera trucks over to its sisters. */
const approach = (narrow: boolean): Pose => (narrow
  ? { x: 120, y: -220, z: 1200, yaw: 0, pitch: 7 }
  : { x: 260, y: -240, z: 900, yaw: 2, pitch: 3 });
/** Looking at palette marble `t` (fractional), which sits left of the panel (above the sheet on phones). */
function colorPose(t: number, narrow: boolean): Pose {
  const p = curvePoint(t);
  return narrow
    ? { x: p.x, y: -150, z: p.z + 1350, yaw: 0, pitch: 12 }
    : { x: p.x + 300, y: -260, z: p.z + 1000, yaw: 0, pitch: 4 };
}
/** Pulled back over the whole curve, to pick one. */
const pick = (narrow: boolean): Pose => (narrow
  ? { x: 2050, y: -1100, z: 6200, yaw: 0, pitch: 11 }
  : { x: 1720, y: -560, z: 1950, yaw: 0, pitch: 9 });
/** From the curve back to the marble, high enough to keep both in frame. */
const returning = (narrow: boolean): Pose => (narrow
  ? { x: 700, y: -700, z: 3000, yaw: -8, pitch: 10 }
  : { x: 1000, y: -620, z: 2700, yaw: -10, pitch: 8 });
const talk = (narrow: boolean): Pose => (narrow
  ? { x: 60, y: -180, z: 1000, yaw: -2, pitch: 11 }
  : { x: 360, y: -240, z: 470, yaw: -6, pitch: 0 });
const install = (narrow: boolean): Pose => (narrow
  ? { x: -60, y: -180, z: 2300, yaw: -2, pitch: 15 }
  : { x: -820, y: -150, z: 1900, yaw: 7, pitch: 1 });

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
/** Holds still near each shot (so its words can be read), moves smoothly between them. */
const dwell = (f: number) => { const g = clamp((f - 0.16) / 0.68); return g * g * g * (g * (g * 6 - 15) + 10); };
const mix = (a: Pose, b: Pose, f: number): Pose => ({
  x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f,
  yaw: a.yaw + (b.yaw - a.yaw) * f, pitch: a.pitch + (b.pitch - a.pitch) * f,
});
/** Through a middle pose, so the marble never leaves the frame on the way. */
const via = (a: Pose, m: Pose, b: Pose, f: number) => (f < 0.5 ? mix(a, m, f * 2) : mix(m, b, f * 2 - 1));

/** Where along the palette curve (0…count−1) the scroll position `u` (in screens) is. */
export function walkPosition(u: number, count: number) {
  return clamp((u - W0) / WALK_SCREENS) * (count - 1);
}

/** The camera pose for scroll position `u` (in screens). With `stepped` (reduced motion), the nearest shot only. */
export function poseAt(u: number, count: number, narrow: boolean, stepped = false): Pose {
  if (stepped) {
    if (u >= W0 - 0.5 && u <= W1 + 0.5) return colorPose(Math.round(walkPosition(u, count)), narrow);
    return nearestShot(u) === 'intro' ? intro(narrow) : nearestShot(u) === 'pick' ? pick(narrow) : nearestShot(u) === 'talk' ? talk(narrow) : install(narrow);
  }
  if (u <= W0) return via(intro(narrow), approach(narrow), colorPose(0, narrow), dwell(u));
  if (u <= W1) return colorPose(walkPosition(u, count), narrow);
  if (u <= STOPS.pick) return mix(colorPose(count - 1, narrow), pick(narrow), dwell(u - W1));
  if (u <= STOPS.talk) return via(pick(narrow), returning(narrow), talk(narrow), dwell(u - STOPS.pick));
  return mix(talk(narrow), install(narrow), dwell(u - STOPS.talk));
}

/** How present each shot is (0…1) at scroll position `u`: its words and controls fade with this. */
export function presence(id: ShotId, u: number): number {
  const fade = 0.34;
  if (id === 'colors') {
    if (u < W0) return clamp(1 - (W0 - u) / fade);
    if (u > W1) return clamp(1 - (u - W1) / fade);
    return 1;
  }
  return clamp(1 - Math.abs(u - STOPS[id]) / fade);
}

/** The intro's opening pose: low and close, before the camera settles back into the wide shot. */
export const introPose = (narrow: boolean): Pose => ({ ...intro(narrow), z: intro(narrow).z - 1200, y: -240, pitch: 2 });

/** A critically damped spring per axis: glides to the target and never overshoots or jerks. */
export function createSpring(start: Pose, stiffness = 7) {
  const p = { ...start };
  const v: Pose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
  const keys = ['x', 'y', 'z', 'yaw', 'pitch'] as const;
  return {
    pose: p,
    snap(to: Pose) { Object.assign(p, to); keys.forEach(k => { v[k] = 0; }); },
    /** Advances by dt seconds toward `to`; true while still moving. */
    step(to: Pose, dt: number, w = stiffness): boolean {
      // Real time, in small sub-steps: a slow frame never puts the camera in slow motion or makes it unstable.
      const n = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / n;
      let moving = false;
      for (const k of keys) {
        for (let i = 0; i < n; i++) {
          const a = w * w * (to[k] - p[k]) - 2 * w * v[k];
          v[k] += a * h;
          p[k] += v[k] * h;
        }
        if (Math.abs(to[k] - p[k]) > 0.5 || Math.abs(v[k]) > 1) moving = true; // within half a pixel: arrived
      }
      if (!moving) Object.assign(p, to);
      return moving;
    },
  };
}

/** The world's transform for a camera pose: the inverse of the camera (yaw > 0 looks right, pitch > 0 looks down). */
export function worldTransform(c: Pose, zoom = 1): string {
  return `scale(${zoom.toFixed(4)}) translateZ(${PERSPECTIVE}px) rotateX(${(-c.pitch).toFixed(3)}deg) rotateY(${c.yaw.toFixed(3)}deg) translate3d(${(-c.x).toFixed(2)}px, ${(-c.y).toFixed(2)}px, ${(-c.z).toFixed(2)}px)`;
}

/** A marble's own rotation so it always faces the camera (a sphere looks the same from every side). */
export const billboard = (c: Pose) => `rotateY(${(-c.yaw).toFixed(3)}deg) rotateX(${c.pitch.toFixed(3)}deg)`;

/** The shot nearest the camera at scroll position `u` (inside the colors walk, colors). */
export function nearestShot(u: number): ShotId {
  if (u >= W0 && u <= W1) return 'colors';
  let best: ShotId = 'intro', bestD = Infinity;
  for (const { id } of SHOTS) {
    const d = id === 'colors' ? Math.min(Math.abs(u - W0), Math.abs(u - W1)) : Math.abs(u - STOPS[id]);
    if (d < bestD) { bestD = d; best = id; }
  }
  return best;
}

/** Short screens see the same framing, smaller: the projected scene scales with the viewport's height. */
export const viewZoom = () => (typeof window === 'undefined' ? 1 : Math.max(0.5, Math.min(1, innerHeight / 760)));
