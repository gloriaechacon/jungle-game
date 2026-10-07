import type { Point, Rect } from './jungle-layout';

// Phase 8 bouncy tires. Own parameters, separate from B-01 (src/tuning.ts is not
// touched): the bounce replaces the vertical speed, exactly like the Phase 4
// stomp rebound, and never changes walk/run/jump/gravity values.
//
// - Landing on a tire always bounces (DK cannot stand on it).
// - Holding K at the moment of contact gives the high bounce; otherwise the low
//   one. Releasing K while rising cuts the rise with the normal B-01 jump cut,
//   so the height stays under the player's control.
// Heights with B-01 gravity 640: low 250 → ≈49 px, high 320 → 80 px (feet on
// the tire top). A normal B-01 jump rises ≈43 px.
export const TIRE = Object.freeze({ halfW: 12, height: 12, bounce: 250, boost: 320, squashMs: 160 });

/** Solid rectangle of a tire standing on the ground at (x, y). */
export const tireRect = (t: Point): Rect => [t.x - TIRE.halfW, t.y - TIRE.height, TIRE.halfW * 2, TIRE.height] as const;

/** Index of the tire DK is standing on (grounded, feet on its top), or -1. */
export function tireUnder(tires: readonly Point[], p: { x: number; feet: number; grounded: boolean }, bodyHalfW: number) {
  if (!p.grounded) return -1;
  return tires.findIndex(t => Math.abs(p.feet - (t.y - TIRE.height)) < 1 && Math.abs(p.x - t.x) < TIRE.halfW + bodyHalfW);
}

/** Bounce speed for a contact: high while K is held. */
export const tireSpeed = (jumpHeld: boolean) => jumpHeld ? TIRE.boost : TIRE.bounce;

/** Presentation state: simulation time of each tire's last bounce (for the squash frame). */
export class TireState {
  lastBounce: number[] = [];
  count = 0;
  lastSpeed = 0;
  reset() { this.lastBounce = []; this.count = 0; this.lastSpeed = 0; }
  hit(i: number, now: number, speed: number) { this.lastBounce[i] = now; this.count++; this.lastSpeed = speed; }
}
