import type { RopeData } from './jungle-layout';
import type { InputSnapshot } from './input';

// Isolated extension: no edits to the B-01 movement values. Active time only.
//
// Grab rules (revised in the Phase 8 review after playtest feedback):
// - On the ground, W next to a rope grabs it (explicit, so walking past a rope
//   never catches DK).
// - In the air, touching a rope grabs it automatically, W is not needed (as in
//   the original: you jump INTO a rope). Holding S in the air lets DK drop past.
// - The rope DK just let go of is not auto-grabbed again until DK touches the
//   ground (otherwise a straight-up release would re-catch the same rope).
//   W still grabs it deliberately once the short release lock has expired.
export const ROPE = Object.freeze({ grabX:14, climbSpeed:48, releaseLockMs:300, minBelowAnchor:24 });
export const ropeTop = (r: RopeData) => Math.max(r.top+ROPE.minBelowAnchor,r.climbTop ?? -Infinity);
export function ropeX(r: RopeData, y: number, now: number) {
  return r.x + Math.sin(now * Math.PI * 2 / r.periodMs + r.phase) * r.amplitude
    * (y-r.top)/(r.bottom-r.top);
}
export type RopeProbe = { x: number; y: number; grounded?: boolean };
export class RopeController {
  attached?: RopeData;
  y = 0;
  lockUntil = 0;
  /** Rope released most recently; not auto-grabbed again until DK lands. */
  lastReleased?: string;
  private previousJump = false;
  private jumpPending = false;
  input(s: InputSnapshot) { if(s.a && !this.previousJump) this.jumpPending=true; this.previousJump=s.a; }
  sync(s: InputSnapshot) { this.previousJump=s.a; this.jumpPending=false; }
  reset(s: InputSnapshot) { this.attached=undefined; this.lockUntil=0; this.lastReleased=undefined; this.sync(s); }
  cancel(now: number) { this.lastReleased=this.attached?.id; this.attached=undefined; this.lockUntil=now+ROPE.releaseLockMs; }
  step(now: number, dt: number, p: RopeProbe, s: InputSnapshot, ropes: readonly RopeData[], allowed=true) {
    const jump=this.jumpPending; this.jumpPending=false;
    if(!allowed) { this.attached=undefined; return undefined; }
    if(p.grounded) this.lastReleased=undefined;
    if(this.attached && jump) {
      this.lastReleased=this.attached.id;
      this.attached=undefined; this.lockUntil=now+ROPE.releaseLockMs;
      return { release:true as const, x:p.x, y:p.y };
    }
    if(!this.attached && now>=this.lockUntil && !jump) {
      const air = p.grounded===false;
      const wants = s.up || (air && !s.down);
      if(wants) this.attached=ropes.find(r=>(s.up || r.id!==this.lastReleased) &&
        p.y>=ropeTop(r) && p.y<=r.bottom+4 && Math.abs(p.x-ropeX(r,p.y,now))<=ROPE.grabX);
      if(this.attached) { this.y=Math.min(this.attached.bottom,p.y); this.lastReleased=undefined; }
    }
    if(!this.attached) return undefined;
    const r=this.attached;
    this.y=Math.max(ropeTop(r),Math.min(r.bottom,this.y+(Number(s.down)-Number(s.up))*ROPE.climbSpeed*dt/1000));
    return { release:false as const, x:ropeX(r,this.y,now), y:this.y };
  }
}
