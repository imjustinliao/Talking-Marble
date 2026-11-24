/**
 * The scroll camera. Scrolling moves a camera through one CSS 3D scene along keyframed shots, B-roll style
 * (dolly, truck, push in, pull back), never a plain centre zoom. The page scroll only says where along the path
 * we are; a critically damped spring makes the camera glide there.
 *
 * World units are CSS pixels. The floor is y = 0, up is −y, the marble stands at the origin.
 */

export interface Pose { x: number; y: number; z: number; yaw: number; pitch: number; roll: number }

export const MARBLE = 360; // the marble's diameter in world px
export const PERSPECTIVE = 1000;
/** The marble's centre in the world (it stands on the floor with a 3 px gap). */
const CENTRE_Y = -MARBLE / 2 - 3;
const CENTRE = { x: 0, y: CENTRE_Y, z: 0 };

/** The shots, in order (F-22, F-60): the intro, the walk along the palettes, all six at once, Create your own, the Guide. */
export type ShotId = 'top' | 'palettes' | 'all' | 'create' | 'guide';
export const SHOTS: { id: ShotId; label: string }[] = [
  { id: 'top', label: 'Talking Marble' },
  { id: 'palettes', label: 'Palettes' },
  { id: 'all', label: 'All palettes' },
  { id: 'create', label: 'Create your own' },
  { id: 'guide', label: 'Guide' },
];

/** Scroll length of the walk along the palette gallery, in screens. */
// 0.6 screens of scroll per marble (F-105): room enough that one flick of a trackpad lands on the next marble, not past it.
export const WALK_SCREENS = 3;
/** Where each shot sits along the scroll, in screens; the walk spans [palettes, palettes + WALK_SCREENS]. */
export const STOPS: Record<ShotId, number> = {
  top: 0, palettes: 1, all: 2 + WALK_SCREENS, create: 3 + WALK_SCREENS, guide: 4 + WALK_SCREENS,
};
export const TOTAL = STOPS.guide;
export const stopOf = (id: ShotId) => STOPS[id];
const W0 = STOPS.palettes, W1 = STOPS.palettes + WALK_SCREENS;

/**
 * The palette gallery: "parallel universe" marbles along a curve that starts exactly where the marble stands (the
 * first takes its place, so the walk grows out of it) and recedes to the right.
 */
export const CURVE_SIZE = MARBLE;
let SPACING = 1050;
let NARROW_NOW = false;
/** Far apart, one in focus at a time (F-36); a little closer on narrow screens. */
export const setGallerySpacing = (narrow: boolean) => { const s = narrow ? 700 : 1050; NARROW_NOW = narrow; if (s !== SPACING) { SPACING = s; cache.key = ''; } };
/** The walk: one straight line at one depth, so every marble sits at the same height on screen (F-59). */
export const curvePoint = (k: number) => ({ x: k * SPACING, y: 0, z: 0 });
/** Where Create your own and the Guide stand: the middle of the gallery, where all six gather (F-60, F-61). */
export const stageHome = () => ({ x: curvePoint((GALLERY - 1) / 2).x, z: 0 });
/**
 * All six at once (F-60): two rows of three, the first three above, the last three below, centred where the walk's
 * middle is. The marbles gather here from the line as the camera pulls back.
 */
export function gridPoint(k: number) {
  const col = k % 3, row = Math.floor(k / 3);
  const gap = NARROW_NOW ? 470 : 600, rowH = NARROW_NOW ? 640 : 600;
  return { x: stageHome().x + (col - 1) * gap, y: row === 0 ? -rowH : 0, z: 0 };
}

/** Wide screens frame the marble beside a panel; narrow ones (phones, portrait) above a bottom sheet. */
export const NARROW = '(max-width: 719px), (max-aspect-ratio: 1/1)';

/** Short screens see the same framing, smaller: the projected scene scales with the viewport's height. */
export const viewZoom = (h = typeof window === 'undefined' ? 800 : innerHeight) => Math.max(0.5, Math.min(1, h / 760));

const rad = (d: number) => (d * Math.PI) / 180;

/** Where a world point lands on screen (px from the viewport's centre) and its scale, for a camera pose. */
export function project(c: Pose, p: { x: number; y: number; z: number }, zoom = 1) {
  // The same order as worldTransform: translate(−c), rotateY(yaw), rotateX(−pitch), rotateZ(roll), translateZ(P), scale.
  let x = p.x - c.x, y = p.y - c.y, z = p.z - c.z;
  const ay = rad(c.yaw), ax = rad(-c.pitch), az = rad(c.roll);
  [x, z] = [x * Math.cos(ay) + z * Math.sin(ay), -x * Math.sin(ay) + z * Math.cos(ay)];
  [y, z] = [y * Math.cos(ax) - z * Math.sin(ax), y * Math.sin(ax) + z * Math.cos(ax)];
  [x, y] = [x * Math.cos(az) - y * Math.sin(az), x * Math.sin(az) + y * Math.cos(az)];
  z += PERSPECTIVE;
  const s = PERSPECTIVE / (PERSPECTIVE - z);
  return { x: x * zoom * s, y: y * zoom * s, scale: s * zoom };
}

/**
 * A framing, as a director would give it: where the marble's centre sits on screen (fractions of the viewport
 * from its centre), how tall it is (a fraction of the viewport's height), and the camera's angles.
 */
interface Framing { fx: number; fy: number; size: number; yaw?: number; pitch?: number; roll?: number }

/** Solves the camera position for a framing of a marble at `at` (a few rounds of correction converge, the angles are small). */
export function frame(f: Framing, w: number, h: number, at = CENTRE): Pose {
  const zoom = viewZoom(h);
  const want = { x: f.fx * w, y: f.fy * h, d: f.size * h };
  const c: Pose = { x: at.x, y: at.y, z: at.z + (MARBLE * PERSPECTIVE * zoom) / want.d, yaw: f.yaw ?? 0, pitch: f.pitch ?? 0, roll: f.roll ?? 0 };
  for (let i = 0; i < 24; i++) {
    const p = project(c, at, zoom);
    c.z *= (MARBLE * p.scale) / want.d;
    c.x += (p.x - want.x) / p.scale;
    c.y += (p.y - want.y) / p.scale;
  }
  return c;
}

/**
 * The shots. The marble and the shot's words read as one group: wide screens put the words beside the marble,
 * narrow ones under it. `open` is the playground with its strip of settings up: the camera cranes up to make room.
 */
type Framed = Exclude<ShotId, 'palettes' | 'all'>;
/**
 * Distance is the main sense of travel (F-17): the first shot is wide and far (the marble a fifth of the screen),
 * the walk pushes in, all six pull back to wide, Create your own pushes in close on one marble,
 * and the Guide pulls back to wide. No two neighbouring shots share a framing.
 */
const WIDE: Record<Framed, Framing> = {
  top: { fx: 0.16, fy: 0.06, size: 0.2, yaw: 2, pitch: 9, roll: -1.2 }, // far: the name left, a small marble right
  create: { fx: -0.2, fy: 0, size: 0.5, yaw: -3, pitch: 6, roll: 1 }, // close, pushed in: its steps to the right
  guide: { fx: 0.2, fy: -0.03, size: 0.24, yaw: 6, pitch: 4, roll: -1 }, // pulled back to wide: the words left
};
const NARROW_FRAMES: Record<Framed, Framing> = {
  top: { fx: 0, fy: -0.16, size: 0.13, pitch: 12 },
  create: { fx: 0, fy: -0.24, size: 0.3, pitch: 9 },
  guide: { fx: 0, fy: -0.34, size: 0.13, pitch: 13 },
};
/**
 * Walking the gallery: the marble in front right of its words, the ones still to come receding further right,
 * away from the words (wide); above the words (narrow). The camera keeps pushing in as it walks.
 */
const walkFraming = (narrow: boolean, k: number, n: number): Framing => {
  const t = n > 1 ? k / (n - 1) : 0;
  return narrow
    ? { fx: 0, fy: -0.25, size: 0.19 + 0.06 * t, pitch: 12 }
    : { fx: 0.13, fy: 0.02, size: 0.3 + 0.1 * t, yaw: 3, pitch: 7, roll: -1.2 };
};
/** Moving in on the marble, the same marble in the same colours, before its sisters appear beside it. */
const APPROACH_WIDE: Framing = { fx: 0.13, fy: 0.04, size: 0.25, yaw: 2, pitch: 8, roll: -1 };
const APPROACH_NARROW: Framing = { fx: 0, fy: -0.17, size: 0.18, pitch: 12 };

export interface Path { framed: Record<Framed, Pose>; walk: Pose[]; approach: Pose; all: Pose }
let cache = { key: '', path: null as Path | null };
/** Every keyframe for the current viewport (and whether the playground's strip is open). */
export function keyframes(narrow: boolean, w = innerWidth, h = innerHeight): Path {
  const key = `${narrow}:${w}:${h}`;
  if (cache.key !== key || !cache.path) {
    const frames = narrow ? NARROW_FRAMES : WIDE;
    // The intro frames the marble at the origin; Create and the Guide frame it at the middle of the gallery (F-61).
    const home = { ...stageHome(), y: CENTRE_Y };
    const framed = Object.fromEntries(Object.entries(frames).map(([id, f]) => [id, frame(f, w, h, id === 'top' ? CENTRE : home)])) as Record<Framed, Pose>;
    const walk = Array.from({ length: GALLERY }, (_, k) => frame(walkFraming(narrow, k, GALLERY), w, h, { ...curvePoint(k), y: CENTRE_Y }));
    // All six: pulled back, straight on, the two rows of three in the middle of the screen (F-60).
    const rowH = narrow ? 640 : 600;
    const all = frame({ fx: 0, fy: narrow ? -0.01 : 0.01, size: narrow ? 0.1 : 0.15, pitch: 3 }, w, h, { x: home.x, y: CENTRE_Y - rowH / 2, z: 0 });
    cache = { key, path: { framed, walk, approach: frame(narrow ? APPROACH_NARROW : APPROACH_WIDE, w, h), all } };
  }
  return cache.path!;
}
/** How many palettes the gallery holds (set by the page from its palette list). */
export let GALLERY = 6;
export const setGallerySize = (n: number) => { GALLERY = n; cache.key = ''; };

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
/** Holds still near each shot (so it can be used), moves smoothly between them. */
const dwell = (f: number) => { const g = clamp((f - 0.16) / 0.68); return g * g * g * (g * (g * 6 - 15) + 10); };
const mix = (a: Pose, b: Pose, f: number): Pose => ({
  x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f,
  yaw: a.yaw + (b.yaw - a.yaw) * f, pitch: a.pitch + (b.pitch - a.pitch) * f, roll: a.roll + (b.roll - a.roll) * f,
});

/** Through a middle pose, so the marble never leaves the frame on the way. */
const via = (a: Pose, m: Pose, b: Pose, f: number) => (f < 0.5 ? mix(a, m, f * 2) : mix(m, b, f * 2 - 1));

/** Where along the gallery (0…GALLERY−1) scroll position `u` (in screens) is. */
export const walkPosition = (u: number) => clamp((u - W0) / WALK_SCREENS) * (GALLERY - 1);
const walkPose = (k: Pose[], t: number) => { const i = Math.min(k.length - 2, Math.floor(t)); return mix(k[i]!, k[i + 1]!, t - i); };

/** The camera pose at scroll position `u` (in screens). With `stepped` (reduced motion), the nearest shot only. */
export function poseAt(u: number, narrow: boolean, stepped = false): Pose {
  const k = keyframes(narrow);
  const v = clamp(u, 0, TOTAL);
  if (stepped) {
    const id = nearestShot(v);
    if (id === 'palettes') return k.walk[Math.round(walkPosition(v))]!;
    return id === 'all' ? k.all : k.framed[id];
  }
  if (v <= W0) return via(k.framed.top, k.approach, k.walk[0]!, dwell(v));
  if (v <= W1) return walkPose(k.walk, walkPosition(v));
  if (v <= STOPS.all) return mix(k.walk[k.walk.length - 1]!, k.all, dwell(v - W1));
  if (v <= STOPS.create) return mix(k.all, k.framed.create, dwell(v - STOPS.all));
  return mix(k.framed.create, k.framed.guide, dwell(v - STOPS.create));
}

/** How far the marbles have gathered from the line into two rows (0 on the walk, 1 at all six); the camera's easing. */
export const gather = (u: number) => (u <= W1 ? 0 : u >= STOPS.all ? 1 : dwell(u - W1));

/** How present each shot is (0…1) at scroll position `u`: its content fades with this. */
export function presence(id: ShotId, u: number): number {
  const fade = 0.34;
  if (id === 'palettes') return u < W0 ? clamp(1 - (W0 - u) / fade) : u > W1 ? clamp(1 - (u - W1) / fade) : 1;
  return clamp(1 - Math.abs(u - STOPS[id]) / fade);
}

/** The shot nearest scroll position `u` (anywhere on the walk, Palettes). */
export function nearestShot(u: number): ShotId {
  if (u >= W0 && u <= W1) return 'palettes';
  let best: ShotId = 'top', bestD = Infinity;
  for (const { id } of SHOTS) {
    const d = id === 'palettes' ? Math.min(Math.abs(u - W0), Math.abs(u - W1)) : Math.abs(u - STOPS[id]);
    if (d < bestD) { bestD = d; best = id; }
  }
  return best;
}

/** Every place the scroll settles on (F-67): each shot's stop and each of the walk's marbles. */
export const restingPlaces = (): number[] => [
  STOPS.top, ...Array.from({ length: GALLERY }, (_, k) => W0 + (k / (GALLERY - 1)) * WALK_SCREENS), STOPS.all, STOPS.create, STOPS.guide,
];
/** How close (in screens) a stop has to be for the magnet to pull (F-80): near, never a long jump. */
export const MAGNET_REACH = 0.28;
/** The resting place nearest to `u` screens, or null when none is within `reach`. */
export function magnet(u: number, reach = Infinity): number | null {
  const near = restingPlaces().reduce((a, b) => (Math.abs(b - u) < Math.abs(a - u) ? b : a));
  return Math.abs(near - u) <= reach ? near : null;
}

/** The intro's opening pose: low and close, before the camera settles back into the first shot. */
export const introPose = (narrow: boolean): Pose => {
  const p = keyframes(narrow).framed.top;
  return { ...p, z: p.z * 0.55, y: p.y + 40, pitch: 2 };
};

/** A critically damped spring per axis: glides to the target and never overshoots or jerks. */
export function createSpring(start: Pose) {
  const p: Pose = { ...start };
  const v: Pose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 };
  const keys = ['x', 'y', 'z', 'yaw', 'pitch', 'roll'] as const;
  return {
    pose: p,
    snap(to: Pose) { Object.assign(p, to); keys.forEach(k => { v[k] = 0; }); },
    /** Advances by dt seconds toward `to`; true while still moving. */
    step(to: Pose, dt: number, w: number): boolean {
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
  return `scale(${zoom.toFixed(4)}) translateZ(${PERSPECTIVE}px) rotateZ(${c.roll.toFixed(3)}deg) rotateX(${(-c.pitch).toFixed(3)}deg) rotateY(${c.yaw.toFixed(3)}deg) translate3d(${(-c.x).toFixed(2)}px, ${(-c.y).toFixed(2)}px, ${(-c.z).toFixed(2)}px)`;
}

/**
 * A slow, handheld-like drift laid over every shot (the camera is never quite still), as B-roll is shot.
 * A few px and a fraction of a degree, on unrelated slow periods so it never visibly loops.
 */
export function drift(c: Pose, t: number, narrow: boolean, amount = 1): Pose {
  const k = (narrow ? 0.4 : 1) * amount;
  return {
    x: c.x + k * (22 * Math.sin(t * 0.21) + 10 * Math.sin(t * 0.53 + 1.3)),
    y: c.y + k * (10 * Math.sin(t * 0.17 + 0.7)),
    z: c.z + k * (30 * Math.sin(t * 0.11 + 2.1)),
    yaw: c.yaw + k * 0.5 * Math.sin(t * 0.13 + 0.4),
    pitch: c.pitch + k * 0.25 * Math.sin(t * 0.19 + 2.6),
    roll: c.roll + k * 0.35 * Math.sin(t * 0.09 + 1.1),
  };
}

/**
 * A marble's own rotation so it faces the camera (a sphere looks the same from every side). The dutch tilt stays,
 * so its reflection keeps lining up with the tilted floor.
 */
export const billboard = (c: Pose) => `rotateY(${(-c.yaw).toFixed(3)}deg) rotateX(${c.pitch.toFixed(3)}deg)`;
