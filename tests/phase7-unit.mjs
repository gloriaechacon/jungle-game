import assert from 'node:assert/strict';
import { RopeController, ropeX } from '../src/ropes.ts';
import { ROPEY, ROPEY_CAMERA_TOP } from '../src/ropey-layout.ts';
import { MOVEMENT } from '../src/tuning.ts';
import { LevelRules, HITBOX } from '../src/gameplay.ts';
import { ropeTop } from '../src/ropes.ts';
const off={up:false,down:false,left:false,right:false,a:false,b:false,start:false};
const c=new RopeController(), r=ROPEY.ropes[0];
const step=(s,now=100,p={x:144,y:172},allowed=true)=>{c.input(s);return c.step(now,1000/60,p,s,ROPEY.ropes,allowed);};
assert.equal(step(off),undefined);
assert.equal(step({...off,up:true},100,{x:170,y:172}),undefined);
assert.equal(step({...off,up:true},100,{x:144,y:172},false),undefined,'Cannot attach while carrying/rolling/dying');
let pos=step({...off,up:true}); assert.equal(c.attached.id,'practice');assert(pos.y<172);
for(let i=0;i<500;i++)pos=step({...off,up:true},120+i*17,pos);
assert.equal(pos.y,r.climbTop,'Top clamp preserves landing visibility');
for(let i=0;i<500;i++)pos=step({...off,down:true},10000+i*17,pos);
assert.equal(pos.y,172,'Bottom clamp');
pos=step({...off,a:true},20000,pos);assert(pos.release);assert(!c.attached);
assert.equal(step({...off,up:true},20100),undefined,'Release cooldown');
assert(!step({...off,up:true},20400).release);
c.sync({...off,a:true});
assert(!step({...off,a:true},20417).release,'Held K after focus sync cannot release');
step(off,20434);assert(step({...off,a:true},20451).release,'Fresh press releases');
c.reset(off);assert(!c.attached && c.lockUntil===0);
for(const rope of ROPEY.ropes) assert(Math.abs(ropeX(rope,rope.bottom,0)-ropeX(rope,rope.bottom,rope.periodMs))<1e-8);
for(const rope of ROPEY.ropes) {
  const fullJumpRise=MOVEMENT.jumpSpeed**2/(2*MOVEMENT.gravity);
  assert(rope.climbTop-fullJumpRise+MOVEMENT.height/2-32>=ROPEY_CAMERA_TOP,'Entire sprite fits at full jump apex');
  assert(180-ROPEY_CAMERA_TOP<=144-12,'Landing floor has visible margin');
}
const rules=new LevelRules(ROPEY,{gravity:640,playerWidth:12,playerHeight:16});
const p=(x,y)=>({x,y,vy:0,grounded:true,previousFeet:y+8});
rules.step(16,p(578,168));assert.equal(rules.letters,'-----','Raised N cannot be collected by walking below');
rules.step(16,{...p(578,140),grounded:false,vy:-50});assert.equal(rules.letters,'--N--');
rules.step(16,p(650,172));assert(rules.checkpoint);rules.respawn();
assert.equal(rules.letters,'--N--');assert.deepEqual(rules.spawn,ROPEY.checkpoint.spawn);
rules.step(16,p(ROPEY.letterRecoveryFromX+1,172));rules.step(16,p(ROPEY.letters[1].recover.x,168));assert.equal(rules.letters,'--NU-');
rules.step(16,p(ROPEY.exit.x+2,172));assert(rules.finished);
assert.deepEqual(ROPEY.letters.map(l=>l.letter),['N','U']);
{
  const u=ROPEY.letters[1],bee=ROPEY.enemies.find(e=>e.kind==='bee');
  assert.deepEqual([u.x,u.y],[1020,92],'U rewards the first bee ledge, not the later tower');
  assert(u.x>bee.min&&u.x<bee.max,'U lies along the bee encounter');
  assert(ROPEY.platforms.some(([x,y,w])=>u.x>x&&u.x<x+w&&y-u.y===16),'U sits visibly above a safe ledge, not in empty air');
  assert(ROPEY.bananas.every(([x,y])=>Math.hypot(x-u.x,y-u.y)>=20));
  assert(ROPEY.bunches.every(b=>Math.hypot(b.x-u.x,b.y-u.y)>=24),'Keep U separate from the banana bunch');
  const reward=new LevelRules(ROPEY,{gravity:640,playerWidth:12,playerHeight:16});
  reward.step(0,p(u.x,172));assert.equal(reward.letters,'-----','Walking under the bee does not collect U');
  reward.step(0,p(u.x,100));assert.equal(reward.letters,'---U-','The upper ledge actually reaches U');
  reward.respawn();assert.equal(reward.letters,'---U-','Collected U survives a retry');
  const item=reward.pickups.find(p=>p.id==='U');
  reward.step(0,p(ROPEY.letterRecoveryFromX+1,172));
  assert.deepEqual([item.x,item.y],[u.x,u.y],'Collected U does not spawn a duplicate at the exit');
}
assert.equal(ROPEY.width,2400);
assert.equal(ROPEY.ropes.length,4);
// Mandatory lower-route actions without changing gaps, rope sweeps or rewards.
const climbs=[[[888,156,76,24],[924,140,40,16]],[[1300,156,80,24],[1332,132,48,24]],[[1660,156,64,24]],[[1940,156,64,24],[1972,132,32,24]]];
for(const steps of climbs){
  let previousTop=180;
  for(const rect of steps){
    assert(ROPEY.solids.some(r=>JSON.stringify(r)===JSON.stringify(rect)),'Required rise is actually solid');
    assert.equal(previousTop-rect[1],rect[0]===924?16:24,'Approach steps stay comfortably below a normal jump');
    assert(rect[1]+rect[3]===previousTop,'Continuous earth, no misleading gap beneath');
    previousTop=rect[1];
  }
}
assert.equal(180-climbs[0][1][1],40,'First beaver wall is also reachable from the lower floor on its right');
assert.equal(climbs[0][1][1]-ROPEY.platforms.find(([x])=>x===964)[1],32,'Return climb still connects to the banana shelf');
assert(!ROPEY.platforms.some(([x])=>[888,1300,1660,1940].includes(x)),'Do not leave old floating lips over the solid base');
for(const cp of [ROPEY.checkpoint,...ROPEY.extraCheckpoints])
  assert(!ROPEY.solids.some(([x,y,w,h])=>y<180&&cp.spawn.x+12>x&&cp.spawn.x-12<x+w&&cp.spawn.y+8>y&&cp.spawn.y-8<y+h),'No solid mountain at respawn');
for(const e of ROPEY.enemies.filter(e=>e.kind!=='bee'))
  assert(!ROPEY.solids.some(([x,y,w,h])=>e.max+7>x&&e.min-7<x+w&&e.y+6>y&&e.y-6<y+h),'No patrol embedded in a new mountain');
assert(ROPEY.platforms.some(([x,y])=>x===1388&&y===12),'High exploration reward remains optional');
assert.deepEqual(ROPEY.solids.filter(([,y])=>y===180),[[0,180,320,76],[400,180,340,76],[832,180,328,76],[1192,180,608,76],[1872,180,528,76]],'All existing ground gaps/rope landings unchanged');
for(const e of ROPEY.enemies.filter(e=>e.kind!=='bee')) for(const x of [e.min,e.max])
  assert([...ROPEY.solids,...ROPEY.platforms].some(([sx,sy,w])=>x>=sx&&x<sx+w&&sy===e.y+HITBOX.enemy.halfH),'All patrols supported, including extension');
for(const [x,y] of ROPEY.bananas)
  assert(!ROPEY.solids.some(([sx,sy,w,h])=>x>=sx&&x<sx+w&&y>=sy&&y<sy+h),'Bananas outside terrain');
assert(ROPEY.letters.every(l=>l.recover.x>2174&&l.recover.x<ROPEY.exit.x),'Letter recovery on final safe ground');
// --- Phase 8 review: grab consistency, no drop into the pit, practice bananas.
{ // In the air, touching a rope grabs it without W; on the ground W is still required.
  const g=new RopeController(), at=(s,now,p)=>{g.input(s);return g.step(now,1000/60,p,s,ROPEY.ropes);};
  assert.equal(at(off,100,{x:144,y:172,grounded:true}),undefined,'Standing next to a rope without W does not grab');
  assert.equal(at(off,117,{x:150,y:140,grounded:false}).release,false,'Jumping into a rope grabs it without W');
  assert.equal(g.attached.id,'practice');
  assert(at({...off,a:true},134,{x:144,y:140}).release,'K lets go');
  at(off,151,{x:144,y:130,grounded:false});
  assert.equal(at(off,600,{x:144,y:130,grounded:false}),undefined,'The rope just released is not auto-grabbed again in the air');
  assert.equal(at({...off,up:true},617,{x:144,y:130,grounded:false}).release,false,'W grabs it deliberately after the lock');
  g.reset(off);
  assert.equal(at({...off,down:true},700,{x:144,y:140,grounded:false}),undefined,'Holding S in the air passes a rope');
  at({...off,a:true},717,{x:144,y:172,grounded:true});at(off,734,{x:144,y:172,grounded:true});
  assert.equal(at(off,751,{x:144,y:140,grounded:false}).release,false,'Landing clears the released rope');
}
{ // Hanging anywhere on any rope, at any moment of the swing, never overlaps terrain
  // (the old crossing-1 bottom swung DK into the 400/152 step and dropped him).
  for(const rope of ROPEY.ropes) for(let y=ropeTop(rope);y<=rope.bottom;y+=2) for(let t=0;t<rope.periodMs;t+=25){
    const x=ropeX(rope,y,t);
    const hit=ROPEY.solids.find(([sx,sy,w,h])=>x+MOVEMENT.width/2>sx && x-MOVEMENT.width/2<sx+w && y+MOVEMENT.height/2>sy+0.01 && y-MOVEMENT.height/2<sy+h);
    assert(!hit,`${rope.id} at y=${y} t=${t} overlaps ${hit}`);
  }
  // Shortened swinging ropes keep the exact previous swing above their new bottom.
  const old={'crossing-1':{top:24,bottom:172,amplitude:50},'crossing-2':{top:8,bottom:172,amplitude:56}};
  for(const rope of ROPEY.ropes.filter(r=>old[r.id])) for(let y=ropeTop(rope);y<=rope.bottom;y+=4) for(let t=0;t<rope.periodMs;t+=100)
    assert(Math.abs(ropeX(rope,y,t)-ropeX({...rope,...old[rope.id]},y,t))<1e-9,'Swing geometry unchanged');
}
{ // The practice rope teaches climbing: every banana on it is reachable while hanging, none above the limit.
  const practice=ROPEY.ropes[0];
  const column=ROPEY.bananas.filter(([x])=>x===practice.x);
  assert(column.length>=3);
  for(const [,y] of column) assert(y>=ropeTop(practice)-HITBOX.pickup.rangeY && y<=practice.bottom,'Banana reachable on the rope');
  assert(column.some(([,y])=>Math.abs(y-ropeTop(practice))<=HITBOX.pickup.rangeY/2),'A banana marks the climb limit');
}
console.log('PASS phase 7 unit: attachment gates, climb bounds, detach edges/cooldown, focus sync, periodic swing, N/U persistence/recovery, checkpoint, exit; air auto-grab, S passes, no re-grab of the released rope, terrain clearance while hanging, unchanged swing geometry, practice bananas.');
