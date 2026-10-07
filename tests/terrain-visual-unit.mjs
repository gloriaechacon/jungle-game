import assert from 'node:assert/strict';
import {solidFaces,exposedSide} from '../src/terrain-visual.ts';
import {JUNGLE_PHASE6} from '../src/jungle-layout.ts';
import {ROPEY} from '../src/ropey-layout.ts';
import {REPTILE} from '../src/reptile-layout.ts';
import {TIRE} from '../src/tires.ts';
const land=l=>l.solids.filter(([x,y])=>!l.tires?.some(t=>x===t.x-TIRE.halfW&&y===t.y-TIRE.height));
const inside=(rects,x,y)=>rects.some(([sx,sy,w,h])=>x>=sx&&x<sx+w&&y>=sy&&y<sy+h);
const hasTop=(faces,x,y)=>faces.some(([sx,sy,w])=>x>=sx&&x<sx+w&&sy===y);
assert.deepEqual(solidFaces([]),[]);
const block=[[0,100,100,80],[40,60,20,40]];
assert.deepEqual(solidFaces(block),[[0,100,40,80],[40,60,20,120],[60,100,40,80]],'Rock continues through its former floor seam');
assert.deepEqual(exposedSide([40,60,20,120],'left',block),[[60,100]],'Side ends where neighbouring earth begins');
assert.deepEqual(solidFaces([[0,100,20,20],[30,100,20,20]]),[[0,100,20,20],[30,100,20,20]],'Do not bridge gaps');
assert.deepEqual(solidFaces([[0,100,20,20],[0,40,20,10]]),[[0,40,20,10],[0,100,20,20]],'Never fill an actual vertical opening');
assert.deepEqual(solidFaces([...block,...block]),solidFaces(block),'Duplicate coverage adds no seams');
for(const l of [JUNGLE_PHASE6,ROPEY,REPTILE]){
  const before=JSON.stringify(l),solids=land(l),faces=solidFaces(solids);
  const xs=[...new Set(solids.flatMap(([x,,w])=>[x,x+w]))].sort((a,b)=>a-b);
  const ys=[...new Set(solids.flatMap(([,y,,h])=>[y,y+h]))].sort((a,b)=>a-b);
  // Each cell is uniform. The union must be neither larger nor smaller than
  // the authored collision terrain, including pits and overlapping stairs.
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){
    const x=(xs[i]+xs[i+1])/2,y=(ys[j]+ys[j+1])/2;
    assert.equal(inside(faces,x,y),inside(solids,x,y),`${l.id}: exact union at ${x}/${y}`);
  }
  for(const f of faces){
    const [x,y,w,h]=f;
    for(let px=x+.5;px<x+w;px++)assert(!inside(solids,px,y-.5),'No internal path on covered ground');
    for(const side of ['left','right'])for(const [a,b] of exposedSide(f,side,solids)){
      const px=side==='left'?x-.5:x+w+.5;
      assert(a>=y&&b<=y+h&&a<b);
      for(let py=a+.5;py<b;py++)assert(!inside(solids,px,py),'No side outline buried inside solid rock');
    }
  }
  for(const [x,,w] of l.platforms??[]){
    const px=x+w/2,ground=solids.filter(([sx,,sw])=>px>=sx&&px<sx+sw).map(([,sy])=>sy);
    assert(hasTop(faces,px,Math.min(...ground)),'Bright foreground floor retained below a pass-through facade');
  }
  assert.equal(JSON.stringify(l),before,'Rendering cannot mutate gameplay data');
}
const cave=solidFaces(land(REPTILE));
for(const x of [780,1304,1370,1450,1484,1880,1976,2110]){
  assert(!hasTop(cave,x,180),`No fake lower walkway inside cave mountain at ${x}`);
  assert(inside(cave,x,180)&&inside(cave,x,200),'Solid rock joins the lower floor');
}
assert(hasTop(cave,1230,180)&&hasTop(cave,664,180),'Actual front-pass galleries keep their lower path');
console.log('PASS terrain visuals: exact solid union, exposed tops/sides only, fused cave/Jungle walls, pass-through walkways retained, no mutations/pit bridges.');
