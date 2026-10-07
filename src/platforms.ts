import type { LevelData, Rect } from './jungle-layout';

export interface PlatformPlayer { x:number; feet:number; height:number; halfWidth:number; grounded:boolean }
const overlaps = (r:Rect,p:PlatformPlayer) => p.x+p.halfWidth>r[0] && p.x-p.halfWidth<r[0]+r[2];

/** A fresh Down drops one ledge, never a solid or an unbacked ledge over a pit.
 * Only the supporting, coplanar pieces are ignored; the next terrace still catches DK.
 * No wall-clock timeout: pause and slow frames cannot restore a collider inside him. */
export class PlatformDrop {
  private previousDown=false;
  private pending=false;
  private ignored:readonly Rect[]=[];
  input(down:boolean,enabled=true) {
    if(enabled && down && !this.previousDown)this.pending=true;
    this.previousDown=down;
    if(!enabled)this.pending=false;
  }
  sync(down:boolean) { this.previousDown=down;this.pending=false; }
  reset(down:boolean) { this.sync(down);this.ignored=[]; }
  ignores(rect:Rect|undefined) { return !!rect && this.ignored.includes(rect); }
  step(level:LevelData,p:PlatformPlayer,enabled=true):boolean {
    this.ignored=this.ignored.filter(r=>overlaps(r,p)&&p.feet-p.height<r[1]+r[3]+.5);
    if(!enabled){this.pending=false;return false;}
    if(!this.pending)return false;
    this.pending=false;
    if(!p.grounded)return false;
    const supports=(level.platforms??[]).filter(r=>overlaps(r,p)&&Math.abs(r[1]-p.feet)<1);
    if(!supports.length || level.solids.some(r=>overlaps(r,p)&&Math.abs(r[1]-p.feet)<1))return false;
    // Require a whole-body landing underneath the current position. Pressing
    // Down at a cliff edge is not permission to drop DK into the gap.
    const below=[...level.solids,...(level.platforms??[])].some(([x,y,w])=>
      y>=p.feet+p.height+1 && y<level.fallY && x<=p.x-p.halfWidth && x+w>=p.x+p.halfWidth);
    if(!below)return false;
    this.ignored=[...this.ignored,...supports];
    return true;
  }
}

/** Full rocky facade, behind the walking plane. Visual depth is not collision. */
export function moundBase(level:LevelData,[x,y,w,h]:Rect) {
  const floors=level.solids.filter(([sx,sy,sw])=>sy>y+h&&sx<=x&&sx+sw>=x+w).map(([,sy])=>sy);
  return floors.length?Math.min(...floors):y+h;
}
