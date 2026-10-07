import assert from 'node:assert/strict';
import { LevelRules, HITBOX } from '../src/gameplay.ts';
import { JUNGLE_PHASE6 as level } from '../src/jungle-layout.ts';
import { MOVEMENT as T } from '../src/tuning.ts';
import {cameraTopAt,readableStep,readableTarget} from '../src/camera.ts';
import {palmCrown,jungleEntrance} from '../tools/art/jungle-landmarks.mjs';
const dt = 1000 / 60;
const opts = { gravity: T.gravity, playerWidth: T.width, playerHeight: T.height };
const p = (x, y = 116) => ({ x, y, vy: 0, grounded: true, previousFeet: y + 8 });
const r = new LevelRules(level, opts);
assert.equal(r.enemies.length, 11);
assert.deepEqual(level.bunches.slice(0,4),[{x:274,y:68},{x:612,y:68},{x:2054,y:60},{x:1036,y:-28}],'Existing reward IDs stay stable');
assert.equal(level.palms.length,3,'Two introductory crowns and a later optional reuse');
for(const {platform,base} of level.palms){
  assert(level.platforms.includes(platform),'Visual and collider share the exact same rectangle');
  const [x,y,w]=platform;
  assert.equal(w,48,'Broad forgiving landings');
  assert(level.solids.some(([sx,sy,sw])=>sy===base&&sx<=x&&sx+sw>=x+w),'Safe ground below each palm');
  assert(!level.letters.some(l=>l.x>=x&&l.x<=x+w&&l.y<y),'No BONUS letters on palms');
  let camera=readableTarget(level,x+w/2,y);
  for(let t=0;t<.75;t+=1/60){
    const feet=y-T.jumpSpeed*t+T.gravity*t*t/2;
    camera=readableStep(level,camera,x+w/2,feet);
    assert(feet-32-camera>=0,'Full player visible on optional palm jumps');
  }
}
for(const route of [[[176,84,48],[120,56,48],[64,28,48]],[[1904,60,64],[1964,28,48]]]){
  for(let i=1;i<route.length;i++){
    const [x,y,w]=route[i],[px,py,pw]=route[i-1];
    assert(py-y<=32&&py-y>0,'Easy rises, never a new jump tuning');
    assert(Math.max(x-px-pw,px-x-w)<=8,'Walking-speed ascent, not a running precision jump');
  }
}
assert.equal(cameraTopAt(level,88),-64);
assert.equal(cameraTopAt(level,400),0,'New camera clearance remains local');
assert.deepEqual([palmCrown().w,palmCrown().h],[64,36]);
for(const night of [false,true]){
  const cave=jungleEntrance(night);
  assert.deepEqual([cave.w,cave.h],[80,80]);
  assert(cave.colors().length>12,'Separate rock facets, recess and moss');
  assert(cave.get(40,55)[0]<20,'Dark recessed aperture at exit centre');
}
assert.notDeepEqual(jungleEntrance().d,jungleEntrance(true).d,'Night exit matches Ropey palette');
const ground = level.solids.filter(([,y,,h]) => y === 124 && h === 68).sort((a, b) => a[0] - b[0]);
const gap4 = ground.find(([x, , w]) => x + w === 1600) && ground.find(([x]) => x > 1600);
assert.equal(gap4[0] - 1600, 20, 'Post-checkpoint gap allows an early walking takeoff');
assert.equal(level.enemies.filter(e=>e.kind==='lizard').length,4,'Two more lizards after the easy opening');
// Final stretch regression: upper rewards must not leave a walk-only finish.
const ridge=level.solids.find(([x,y])=>x===2112&&y===96);
assert.deepEqual(ridge,[2112,96,48,28],'Mandatory ridge is fused to the floor');
assert(2216-(ridge[0]+ridge[2])>=56,'Room to land and prepare the next jump at running speed');
assert(ridge[3]<T.jumpSpeed**2/(2*T.gravity)-10,'Normal jump clears the ridge with headroom');
assert(ground.some(([x,,w])=>x+w===2216)&&ground.some(([x])=>x===2248),'Final gap is 32px, not a long precision leap');
assert(!level.solids.some(([x,,w])=>x<2248&&x+w>2216),'No hidden floor beneath the gap');
const tailPatrols=level.enemies.filter(e=>e.x>1888&&e.y===118);
assert.equal(tailPatrols.length,2,'Two real lower-path encounters');
assert(tailPatrols.some(e=>e.kind==='lizard'),'A different final attack rhythm');
assert(tailPatrols.every(e=>e.max<2216||e.min-7>=2248+40),'No enemy on the blind landing edge');
assert(tailPatrols.every(e=>e.max+7<level.letters[0].recover.x),'Letter recovery remains a calm clearing');
assert(level.barrels.some(b=>b.x===1918&&b.y===116),'A supported barrel offers an alternative to jumping');
assert(level.platforms.some(([x])=>x===1904)&&level.platforms.some(([x])=>x===2016),'Keep optional upper routes and their reward');
for (const e of r.enemies.filter(e=>e.kind!=='bee')) {
  assert([...level.solids,...level.platforms].some(([x,y,w]) => y === e.y + HITBOX.enemy.halfH && e.min - HITBOX.enemy.halfW >= x && e.max + HITBOX.enemy.halfW <= x+w), 'Ground patrol fully supported by its platform');
}
r.step(dt, p(80));
const bananas = r.bananas;
r.step(dt, p(level.checkpoint.x));
r.input({ left:false, right:true, b:true }, p(1288));
assert(r.carried);
const hit = r.step(dt, p(r.enemies[3].x));
assert(hit.hurt && r.dying && r.deaths === 0);
const positions = r.enemies.map(e => e.x);
r.input({ left:true, right:false, b:false }, p(1288));
assert(r.carried, 'Release during impact cannot throw');
let elapsed = 0, result;
do { result = r.step(dt, p(level.exit.x+1)); elapsed += dt; } while (!result.respawn && elapsed < 1000);
assert(elapsed >= 600 - 1e-6 && elapsed <= 600 + dt, '600ms active impact');
assert(!r.finished && r.bananas === bananas, 'No exit/pickups during impact');
assert.deepEqual(r.enemies.map(e => e.x), positions);
r.respawn();
assert(!r.dying && r.deaths === 1 && r.checkpoint && !r.carried);
assert(r.barrels.every(b => b.state === 'ready'));
assert.equal(r.invulnerableUntil-r.now, 1500);
r.step(dt, p(level.exit.x+1));
assert(r.finished && r.letters === '-----', 'Letters do not gate Phase 6 exit');
console.log('PASS phase 6 rules: supported patrols, 600ms damage, input lock, persistence, checkpoint and ungated exit.');
