// The orb's motion model (packages/core/spec.md › Motion, Uniforms, Small sizes). Pure and framework-free:
// it turns springing parameters, a voice level and time into shader uniforms and a whole-marble transform.
import { approach, easeToward, type Eased, type NumericKey, type OrbParams } from '../state';
import type { UniformValue } from './renderer';

const TAU = Math.PI * 2;

/** One orb's clocks and live values. */
export interface Motion {
  time: number; swirl: number; spin: number; waveTime: number; ripplePhase: number; scanPhase: number;
  breathPhase: number; beatPhase: number; bouncePhase: number; jellyPhase: number; clock: number;
  level: number; pulse: number; burst: number; lastShake: number;
}

export function createMotion(): Motion {
  return {
    time: 0, swirl: 0, spin: 0, waveTime: 0, ripplePhase: 0, scanPhase: 0, breathPhase: 0, beatPhase: 0, bouncePhase: 0,
    jellyPhase: 0, clock: 0, level: 0, pulse: 0, burst: 0, lastShake: 0,
  };
}

/** The small-size factor: 0 at 48 CSS px and up, 1 at 32 and under. */
export function smallness(cssSize: number): number {
  return Math.min(1, Math.max(0, (48 - cssSize) / 16));
}

/** Advances springs, level and clocks by `dt` seconds (capped at 0.1 by the caller). */
export function stepMotion(m: Motion, eased: Eased, target: OrbParams, rawLevel: number, dt: number, still: boolean): void {
  easeToward(eased, target, dt);
  const x = eased.x;
  const goal = Math.min(1, Math.max(0, rawLevel || 0)) * target.reactivity;
  m.level = approach(m.level, goal, 1 - Math.exp(-dt * (goal > m.level ? 16 : 6)));
  // A shake bursts when the target's shake rises sharply (entering a shaking state).
  if (target.shake > m.lastShake + 0.5) m.burst = 1;
  m.lastShake = target.shake;
  m.burst = Math.max(0, m.burst - dt * 1.8);
  if (still) { m.pulse = 0; return; }
  const L = m.level;
  m.time += dt * x.speed;
  m.swirl += dt * L * 4;
  m.spin += dt * x.spin * 0.5;
  m.waveTime += dt * 1.8 * x.speed * (1 + 1.2 * L);
  m.ripplePhase += dt * 6 * (1 + 3 * L) * (target.rippleDirection === 'in' ? -1 : 1);
  // The search's clock runs only while searching, at its strength (F-107): entering or leaving `searching` eases the
  // stream in and out, instead of a long-run clock sweeping the pattern as the strength springs.
  m.scanPhase += dt * (0.8 + 0.4 * x.speed) * x.scan;
  m.breathPhase += (dt * TAU) / (1.6 + 2.4 * (1 - Math.min(x.speed, 1)));
  m.beatPhase += dt * TAU * 0.9;
  m.bouncePhase += dt * TAU * (0.25 + 1.55 * Math.pow(Math.max(0, x.bounce), 1.5));
  m.jellyPhase += dt * TAU * 4.5;
  m.clock += dt;
  const f = (m.beatPhase / TAU) % 1;
  m.pulse = x.beat * (Math.exp(-(((f - 0.12) * 12) ** 2)) + 0.5 * Math.exp(-(((f - 0.32) * 12) ** 2)));
}

/** The shader uniforms for this frame (spec › Uniforms); `k` is the small-size factor. */
export function uniformsOf(m: Motion, x: Record<NumericKey, number>, k: number, still: boolean, out: Record<string, UniformValue> = {}) {
  const scale = 1.2 * Math.pow(2, 1 - 2 * x.veins) * (1 - 0.3 * k);
  const level = still ? 0 : m.level;
  out.uTime = m.time;
  out.uSwirl = m.swirl;
  out.uSpin = m.spin;
  out.uLevel = level;
  out.uWarp = 1 + 2.4 * x.turbulence;
  out.uVoiceWarp = 2;
  out.uVoiceBright = 0.45;
  out.uScale = scale;
  out.uSoftness = Math.pow(2, 2 * x.softness - 1);
  out.uDetail = x.detail * (1 - 0.5 * k);
  out.uGrain = 1 - k;
  out.uContrast = 1 + 0.12 * k;
  out.uGlow = x.glow * (1 + 1.5 * m.pulse);
  out.uBrightness = x.brightness * (1 + 0.1 * m.pulse);
  out.uWaveAmp = 0.1 * x.waves;
  out.uWaveFreq = (2.2 * scale) / 1.2;
  out.uWaveTime = m.waveTime;
  out.uWaveAngle = 0.35;
  out.uRippleAmp = 0.1 * x.ripples + 0.22 * level;
  out.uRippleFreq = 8;
  out.uRipplePhase = m.ripplePhase;
  out.uVortex = x.whirl;
  out.uChop = x.chop;
  out.uScan = x.scan;
  out.uScanPhase = m.scanPhase;
  return out;
}

/** The whole marble's movement as a CSS transform on the inner layer (spec › Motion 5). */
export function transformOf(m: Motion, x: Record<NumericKey, number>, k: number, still: boolean): string {
  const move = still ? 0 : 1 - k;
  const L = m.level;
  const scale = x.size * (move
    ? (1 - 0.03 * x.breath * move * (0.5 + 0.5 * Math.cos(m.breathPhase))) * (1 + 0.035 * m.pulse * move) * (1 + 0.12 * L * move)
    : 1);
  const jelly = 0.06 * x.wobble * L * Math.sin(m.jellyPhase) * move;
  const tx = x.shake * (m.burst + 0.5 * m.pulse) * 0.025 * Math.sin(m.clock * 61) * Math.sin(m.clock * 23) * move;
  const b = Math.min(1, Math.max(0, (x.bounce - 0.3) / 0.5));
  const ty = -0.03 * x.bounce * (b * 1.6 * Math.abs(Math.sin(m.bouncePhase / 2)) + (1 - b) * Math.sin(m.bouncePhase)) * move;
  const rot = 4 * x.sway * Math.sin(0.7 * m.bouncePhase) * move;
  if (Math.abs(scale - 1) < 1e-5 && !jelly && !tx && !ty && !rot) return '';
  const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
  return `translate(${pct(tx)}, ${pct(ty)}) rotate(${rot.toFixed(3)}deg) scale(${(scale * (1 + jelly)).toFixed(5)}, ${(scale * (1 - jelly)).toFixed(5)})`;
}

/** The halo's opacity (spec › Motion 6). */
export function haloOpacityOf(m: Motion, x: Record<NumericKey, number>): number {
  return Math.min(1, x.halo * (1 + 0.5 * m.pulse) + 0.4 * m.level);
}
