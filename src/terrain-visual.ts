import type { Rect } from './jungle-layout';

/** Visual union only. Physics keeps every authored collider unchanged.
 * Connected rock columns get one exposed top, not a false path where a wall
 * meets its supporting floor. One-way facades and tires must not be included. */
export function solidFaces(rects:readonly Rect[]):Rect[] {
  const valid=rects.filter(([, ,w,h])=>w>0&&h>0);
  const cuts=[...new Set(valid.flatMap(([x,,w])=>[x,x+w]))].sort((a,b)=>a-b);
  const faces:Rect[]=[];
  const last=new Map<string,number>();
  for(let i=0;i<cuts.length-1;i++) {
    const x=cuts[i],w=cuts[i+1]-x;
    const intervals=valid.filter(([rx,,rw])=>rx<=x&&rx+rw>=x+w)
      .map(([,y,,h])=>[y,y+h]).sort((a,b)=>a[0]-b[0]);
    const joined:number[][]=[];
    for(const [top,bottom] of intervals) {
      const previous=joined.at(-1);
      if(previous&&top<=previous[1])previous[1]=Math.max(previous[1],bottom);
      else joined.push([top,bottom]);
    }
    for(const [y,bottom] of joined) {
      const h=bottom-y,key=`${y}:${bottom}`,at=last.get(key),previous=at===undefined?undefined:faces[at];
      if(previous&&previous[0]+previous[2]===x)faces[at!]=[previous[0],y,previous[2]+w,h];
      else {last.set(key,faces.length);faces.push([x,y,w,h]);}
    }
  }
  return faces;
}

/** Exposed vertical boundary; no outlined seams inside joined earth. */
export function exposedSide([x,y,w,h]:Rect,side:'left'|'right',solids:readonly Rect[]):[number,number][] {
  const probe=side==='left'?x-.5:x+w+.5;
  let spans:[number,number][]=[[y,y+h]];
  for(const [sx,sy,sw,sh] of solids) {
    if(probe<sx||probe>=sx+sw)continue;
    spans=spans.flatMap(([a,b]):[number,number][]=>{
      if(sy>=b||sy+sh<=a)return [[a,b]];
      const rest:[number,number][]=[];
      if(sy>a)rest.push([a,sy]);
      if(sy+sh<b)rest.push([sy+sh,b]);
      return rest;
    });
  }
  return spans;
}
