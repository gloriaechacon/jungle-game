import assert from 'node:assert/strict';
import { LevelRules,HITBOX } from '../src/gameplay.ts';
import { JUNGLE_PHASE6 } from '../src/jungle-layout.ts';
import { ROPEY } from '../src/ropey-layout.ts';
import { REPTILE } from '../src/reptile-layout.ts';
import { LESSONS,practiceLevel,lessonDone,lessonNeedsRetry,lessonRetryInstruction } from '../src/tutorial.ts';
import { TOUCH_LESSONS } from '../src/control-labels.ts';
assert.deepEqual(LESSONS[0],['TECLA A: IZQUIERDA','TECLA D: DERECHA','MANTEN D PARA AVANZAR']);
assert(LESSONS[0].every(line=>line.length<=21),'Left/right keyboard explanation fits the existing LCD card');
assert.deepEqual(TOUCH_LESSONS[0],['MANTEN FLECHA DERECHA','PARA CAMINAR'],'Phone A remains jump/confirm, never left');
const options={gravity:640,playerWidth:12,playerHeight:16};
for(const level of [JUNGLE_PHASE6,ROPEY,REPTILE]) {
  const r=new LevelRules(level,options);
  assert(!r.pickups.some(p=>p.special),'No active comodines');
  assert(level.platforms.length>0,'Optional overhead routes');
  for(const [x,y,w,h] of level.platforms) {
    assert(h<=8,'Thin ledge');
    assert(level.solids.some(([sx,sy,sw])=>sx<=x&&sx+sw>=x+w&&sy-y-h>=32),'Walk below with sprite clearance');
  }
}
const r=new LevelRules(ROPEY,options),p=cp=>({x:cp.spawn.x,y:cp.spawn.y,vy:0,grounded:true,previousFeet:cp.spawn.y+8});
r.step(16,p(ROPEY.checkpoint));assert.equal(r.checkpointIndex,0);
r.step(16,p(ROPEY.extraCheckpoints[0]));assert.equal(r.checkpointIndex,1);
r.respawn();assert.deepEqual(r.spawn,ROPEY.extraCheckpoints[0].spawn);
r.step(16,p(ROPEY.checkpoint));assert.equal(r.checkpointIndex,1,'Backtracking cannot lose later checkpoint');
assert.equal(new LevelRules(ROPEY,options).checkpointIndex,-1,'Restart resets checkpoints');
const idle={x:36,y:116,vy:0,vx:0,rolling:false,stomp:0,roll:0,barrel:0,tires:0,rope:false,dropped:false,grounded:true};
assert(!lessonDone(0,{...idle,x:20,vx:-60},false),'Trying left is allowed without completing the rightward task');
assert(lessonDone(0,{...idle,x:80,vx:60},false),'Walking right still completes the first lesson');
for(let i=0;i<LESSONS.length;i++){
  assert(!lessonDone(i,idle,false),'Idle never completes a lesson');
  assert.equal(practiceLevel(i).width,160,'Practice is one screen');
}
assert(lessonDone(8,idle,true),'Climb and release finishes rope practice');
assert(!lessonDone(8,{...idle,rope:true},true),'Still attached is not completion');
assert.equal(LESSONS.length,10);
assert(!lessonDone(9,idle,false),'Walking off is not a drop-through lesson');
assert(!lessonDone(9,{...idle,dropped:true,grounded:false},false),'Wait for safe landing');
assert(lessonDone(9,{...idle,dropped:true},false),'Actual drop and landing completes');
for(const step of [4,5,6]){
  const required=['stomp','roll','barrel'][step-4];
  for(const attack of ['stomp','roll','barrel']){
    const rules=new LevelRules(practiceLevel(step),options);
    assert(!lessonNeedsRetry(step,rules),'Fresh encounter is playable');
    rules.enemies[0].alive=false;rules.kills[attack]++;
    assert.equal(lessonDone(step,{...idle,...rules.kills},false),attack===required,'Only the requested attack completes');
    assert.equal(lessonNeedsRetry(step,rules),attack!==required,'Wrong attack retries; correct attack never retries');
  }
  assert(lessonRetryInstruction(step).split('\n').every(line=>line.length<=21),'Retry instructions fit the LCD');
}
{
  const rules=new LevelRules(practiceLevel(6),options);
  for(const state of ['ready','carried','thrown']){
    rules.barrels[0].state=state;assert(!lessonNeedsRetry(6,rules),'Usable or flying barrel must not reset');
  }
  rules.barrels[0].state='spent';assert(lessonNeedsRetry(6,rules),'Missed barrel gives another attempt');
  rules.kills.barrel=1;assert(!lessonNeedsRetry(6,rules),'A successful hit wins over a spent barrel');
}
for(const step of [0,1,2,3,7,8])assert(!lessonNeedsRetry(step,new LevelRules(practiceLevel(step),options)),'Other lessons never retry combat');
{
  const level={...practiceLevel(6),enemies:[],platforms:[[48,84,90,6]]};
  const rules=new LevelRules(level,options),b=rules.barrels[0];
  const player={x:20,y:116,vy:0,grounded:true,previousFeet:124};
  Object.assign(b,{x:80,y:60,vx:0,vy:60,state:'thrown',expires:2000});
  for(let i=0;i<30;i++)rules.step(16,player);
  assert.equal(b.state,'thrown');assert.equal(b.y,84-HITBOX.barrel.half,'Barrel lands on ledge');
  Object.assign(b,{y:105,vy:-200});
  for(let i=0;i<18;i++)rules.step(16,player);
  assert.equal(b.state,'thrown');assert(b.y<84-HITBOX.barrel.half,'Barrel passes up through underside');
}
console.log('PASS phase 10: no comodines, underpasses, two forward-only checkpoints, practice gates.');
