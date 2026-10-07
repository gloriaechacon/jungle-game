import type { Point } from './jungle-layout';
import type { CoachHint } from './tutorial-coach';

export const TIRE_GUIDE='Mantén la tecla K para saltar más alto';

/** Teach only the first tire, including retries; later tires need no reminder. */
export function nearTire(tires:readonly Point[]|undefined,x:number,feet:number):boolean {
  const t=tires?.[0];
  return !!t&&Math.abs(x-t.x)<=90&&feet>=t.y-50&&feet<=t.y+12;
}

export function tireCoach(touch:boolean):CoachHint {
  return {title:'',action:touch?'Mantén A para saltar más alto':TIRE_GUIDE,detail:'',target:'a'};
}
