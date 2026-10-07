import type { LevelData } from './jungle-layout';

/** Directional look-ahead: ~40% from the left when moving right, mirrored left.
 * Fixed-step smoothing keeps this independent of monitor refresh and freezes
 * with gameplay. No drift/recentering when standing still. Bounds still win. */
export const HORIZONTAL = Object.freeze({lead:26, lerp:.22, turnLerp:.08});
export type HorizontalCamera = {scroll:number;lead:number};
const clampX=(width:number,x:number)=>Math.max(0,Math.min(Math.max(0,width-160),x));
export function horizontalStart(width:number,x:number):HorizontalCamera {
  return {scroll:clampX(width,x-80+HORIZONTAL.lead),lead:HORIZONTAL.lead};
}
export function horizontalStep(width:number,current:HorizontalCamera,x:number,vx:number):HorizontalCamera {
  const wanted=Math.abs(vx)>4?Math.sign(vx)*HORIZONTAL.lead:current.lead;
  const lead=current.lead+(wanted-current.lead)*HORIZONTAL.turnLerp;
  const target=clampX(width,x-80+lead);
  return {lead,scroll:clampX(width,current.scroll+(target-current.scroll)*HORIZONTAL.lerp)};
}

// Phase 8 "readable" vertical camera (used by Reptile Rumble, opt-in per level).
// Pure presentation math, no Phaser: the scene advances it in fixed steps so it
// freezes with pause/focus and does not depend on the display frame rate.
//
// Rule: keep the lowest walkable surface near DK (±look px) at screen y
// FLOOR_ROW, so landings below are visible before DK drops; move up only as
// much as needed to keep DK's whole 32 px sprite on screen (tire bounces,
// high ledges). Falling into a pit is followed downwards.
export const READABLE = Object.freeze({ look: 80, floorRow: 128, topMargin: 2, bottomMargin: 4, lerp: 0.15, cell: 32 });

/** Top of the walkable surface in column x (the highest solid top covering x), or undefined over a pit. */
export function surfaceTop(level: LevelData, x: number) {
  let top: number | undefined;
  for (const [sx, sy, w] of level.solids) if (x >= sx && x < sx + w && (top === undefined || sy < top)) top = sy;
  return top;
}

/** Target scroll Y for DK at (x, feet). */
export function readableTarget(level: LevelData, x: number, feet: number) {
  let lowest: number | undefined;
  for (let cx = x - READABLE.look; cx <= x + READABLE.look; cx += 4) {
    const t = surfaceTop(level, cx);
    if (t !== undefined && (lowest === undefined || t > lowest)) lowest = t;
  }
  let target = (lowest ?? feet) - READABLE.floorRow;
  target = Math.min(target, feet - READABLE.cell - headMargin(level,x,feet)); // whole sprite visible
  target = Math.max(target, feet - 144 + READABLE.bottomMargin);             // follow a fall
  return clampScroll(level, target,x);
}
export const cameraTopAt = (level:LevelData,x:number) => Math.min(level.cameraTop??0,
  ...(level.cameraZones??[]).filter(z=>x>=z.minX&&x<=z.maxX).map(z=>z.top));
export const cameraBoundsTop = (level:LevelData) => Math.min(level.cameraTop??0,...(level.cameraZones??[]).map(z=>z.top));
// At the new summits there is room to keep DK below the HUD as well. Ordinary
// ropes/tires retain their landing-first framing, including the first S hint.
const headMargin=(level:LevelData,x:number,feet:number)=>feet<80&&cameraTopAt(level,x)<0?16:READABLE.topMargin;
export const clampScroll = (level: LevelData, y: number,x?:number) => Math.max(x===undefined?level.cameraTop??0:cameraTopAt(level,x), Math.min(level.height - 144, y));

/** One fixed step of smoothing; the sprite-visibility bound is enforced immediately. */
export function readableStep(level: LevelData, current: number, x: number, feet: number) {
  const target = readableTarget(level, x, feet);
  let next = current + (target - current) * READABLE.lerp;
  if (Math.abs(target - next) < 0.5) next = target;
  next = Math.min(next, feet - READABLE.cell - headMargin(level,x,feet));
  next = Math.max(next, feet - 144 + READABLE.bottomMargin);
  return clampScroll(level, next,x);
}
