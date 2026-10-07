import type { Point } from './jungle-layout';
import type { CoachHint } from './tutorial-coach';

export const TIRE_GUIDE='Mantén la tecla K para saltar más alto';
export const VINE_GRAB_GUIDE='Mantén W para agarrar la liana';
export const VINE_CLIMB_GUIDE='W / S: trepa · K: suelta y salta';

/** Teach only the first tire, including retries; later tires need no reminder. */
export function nearTire(tires:readonly Point[]|undefined,x:number,feet:number):boolean {
  const t=tires?.[0];
  return !!t&&Math.abs(x-t.x)<=90&&feet>=t.y-50&&feet<=t.y+12;
}

export function tireCoach(touch:boolean):CoachHint {
  return {title:'',action:touch?'Mantén A para saltar más alto':TIRE_GUIDE,detail:'',target:'a'};
}

/** Contextual reminder at the first vine, not a second tutorial card. */
export function vineCoach(guide:string,touch:boolean):CoachHint|undefined {
  if(guide===VINE_GRAB_GUIDE)
    return {title:'',action:touch?'Mantén ↑ para agarrar la liana':guide,detail:'',target:'up'};
  if(guide===VINE_CLIMB_GUIDE)
    return {title:'',action:touch?'↑ / ↓: trepa · A: suelta y salta':guide,detail:'',target:'a',targets:['a','up']};
  return undefined;
}
