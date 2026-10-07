import assert from 'node:assert/strict';
import {PlatformDrop,moundBase} from '../src/platforms.ts';
import {JUNGLE_PHASE6 as J} from '../src/jungle-layout.ts';
import {ROPEY} from '../src/ropey-layout.ts';
import {REPTILE} from '../src/reptile-layout.ts';
import {LevelRules} from '../src/gameplay.ts';
import {readableStep,readableTarget,cameraTopAt} from '../src/camera.ts';
import {MOVEMENT as T} from '../src/tuning.ts';
import {letterTile} from '../tools/art/props.mjs';
const top=[20,40,80,8],lower=[20,80,80,8],floor=[0,124,160,68];
const level={...J,solids:[floor],platforms:[top,lower]};
const player=(feet=40,x=60)=>({x,feet,height:16,halfWidth:6,grounded:true});
{
  const d=new PlatformDrop();d.input(true);assert(d.step(level,player()));
  assert(d.ignores(top)&&!d.ignores(lower)&&!d.ignores(floor));
  assert(!d.step(level,player(80)),'Holding S stops on the next ledge');
  assert(!d.ignores(top),'Collider restored after whole body clears');
  d.input(false);d.input(true);assert(d.step(level,player(80)));assert(d.ignores(lower));
  d.input(false);d.input(true);assert(!d.step(level,player(124)),'Never through a solid');
}
for(const [name,geometry,p] of [
  ['pit',{...level,solids:[],platforms:[top]},player()],
  ['floor edge',{...level,solids:[[62,124,40,68]],platforms:[top]},player()],
  ['airborne',level,{...player(),grounded:false}],
  ['solid overlap',{...level,solids:[floor,[20,40,80,84]]},player()],
]){const d=new PlatformDrop();d.input(true);assert(!d.step(geometry,p),name);}
{
  const d=new PlatformDrop();d.input(true,false);assert(!d.step(level,player()),'Paused key not replayed');
  d.input(false);d.input(true);d.sync(true);assert(!d.step(level,player()),'Focus sync clears pending drop');
  d.input(false);d.input(true);assert(d.step(level,player()));d.reset(true);
  assert(!d.ignores(top)&&!d.step(level,player()),'Respawn clears collision exceptions/held S');
  d.input(false);d.input(true);assert(!d.step(level,player(),false),'No dropping while on a rope/rolling');
}
{
  const right=[60,40,40,8],left=[20,40,40,8],l={...level,platforms:[left,right]};
  const d=new PlatformDrop();d.input(true);assert(d.step(l,player()));
  assert(d.ignores(left)&&d.ignores(right),'A seam is one supporting ledge');
}
for(const l of [J,ROPEY,REPTILE])for(const r of l.platforms){
  assert(moundBase(l,r)>r[1]+r[3],'A full facade continues to underlying terrain');
}
for(const l of [J,ROPEY,REPTILE])for(const b of l.barrels){
  const supports=[...l.solids,...l.platforms];
  assert(supports.some(([x,y,w])=>b.x-8>=x&&b.x+8<=x+w&&b.y+8===y),`${l.id} barrel ${b.x}: no floating barrel, entire base supported`);
  assert(!l.solids.some(([x,y,w,h])=>b.x+8>x&&b.x-8<x+w&&b.y+8>y&&b.y-8<y+h),'No barrel embedded in solid terrain');
}
for(const [x,y] of ROPEY.bananas)for(const [px,py,pw,ph] of ROPEY.platforms)
  assert(!(x>=px&&x<px+pw&&y+4>py&&y-4<py+ph),`Banana ${x}/${y} must not intersect a ledge lip`);
assert(new Set(J.platforms.map(p=>p[1])).size>=5,'Varied Jungle exploration heights');
assert(new Set(ROPEY.platforms.map(p=>p[1])).size>=6,'Varied Ropey exploration heights');
assert(180-ROPEY.platforms.find(p=>p[0]===2110)[1]<=T.jumpSpeed**2/(2*T.gravity),'Final barrel shelf reachable directly from lower route');
assert(J.solids.some(p=>p[0]===1808)&&J.solids.some(p=>p[0]===1848),'Continuous two-step mountain');
assert(J.solids.some(r=>r[0]===864&&r[1]===108),'Real continuous obstacle, not a one-way facade');
assert(J.platforms.some(r=>r[0]===248),'Start still demonstrates walking in front');
// Each rise in the new climb is a normal jump, with a generous horizontal edge.
const stairs=[[1300,156,80],[1332,132,48],[1332,108,48],[1388,76,48],[1444,44,56],[1388,12,48]];
for(const [x,y,w] of stairs)assert([...ROPEY.solids,...ROPEY.platforms].some(r=>r[0]===x&&r[1]===y&&r[2]===w),'Test climb matches authored geometry');
for(let i=1;i<stairs.length;i++){
  const [x,y,w]=stairs[i],[px,py,pw]=stairs[i-1];
  assert(py-y<=32&&py-y<T.jumpSpeed**2/(2*T.gravity)-8);
  assert(Math.max(x-(px+pw),px-(x+w))<=8,'No running leap required between terraces');
}
assert(180-stairs.at(-1)[1]>144,'Route climbs above the initial viewport');
assert.equal(cameraTopAt(ROPEY,360),48,'Original ropes keep safe camera floor');
for(const x of [144,360,786,1836])assert.equal(cameraTopAt(ROPEY,x),48,'All original rope camera floors preserved');
assert(cameraTopAt(J,1936)<0,'Jumping on the raised eastern ridge cannot clip the head');
assert(cameraTopAt(ROPEY,1170)<0,'No camera jump when leaving the high shelf over the small gap');
assert(cameraTopAt(ROPEY,1412)<0,'Upper clearing can scroll above the original view');
for(const l of [J,ROPEY,REPTILE]){
  const x=l===J?1036:l===ROPEY?1412:1484,topY=l===J?-12:l===ROPEY?12:4;
  let camera=readableTarget(l,x,topY);
  for(let t=0;t<.75;t+=1/60){
    const feet=topY-T.jumpSpeed*t+T.gravity*t*t/2;
    camera=readableStep(l,camera,x,feet);
    assert(feet-32-camera>=-.1&&feet-camera<=144,'Whole sprite remains visible on high-route jumps');
  }
}
// A direction entered while dying used to be consumed by syncInput; without
// another key event the next life then moved left with the old right-facing sprite.
for(const direction of [-1,1]){
  const rules=new LevelRules(J,{gravity:T.gravity,playerWidth:T.width,playerHeight:T.height});
  const spawn=J.checkpoint.spawn;
  rules.step(16,{x:spawn.x,y:spawn.y,grounded:true,vy:0,previousFeet:spawn.y+8});
  assert(rules.checkpoint,'Exercise held direction on a checkpoint return');
  rules.facing=-direction;rules.beginHurt();
  const input={left:direction<0,right:direction>0,b:true};
  rules.syncInput(input);rules.faceInput(input);assert.equal(rules.facing,-direction,'Do not turn hurt pose');
  rules.respawn();rules.syncInput(input);rules.faceInput(input);assert.equal(rules.facing,direction);
  assert.deepEqual(rules.spawn,spawn);
  assert(!rules.rolling&&!rules.carried&&rules.lastThrowAt===-Infinity,'Resync direction cannot replay B');
  rules.faceInput({left:false,right:false,b:false});assert.equal(rules.facing,direction,'Idle keeps last side');
  rules.faceInput({left:direction>0,right:direction<0,b:false});assert.equal(rules.facing,-direction);
}
for(const ch of 'BONUS')for(const size of [9,12]){
  const p=letterTile(ch,size);assert.equal(p.w,size);assert.equal(p.h,size);
  assert(p.colors().length>=6,'Distinct recess, bevel and gold glyph');
}
console.log('PASS terrain: solid/front-pass distinction, safe single-edge drops, seams/focus/reset, facades, reachable high climb/camera, held direction after damage, BONUS plaque sizes.');
