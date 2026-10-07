import assert from 'node:assert/strict';
import {horizontalStart,horizontalStep} from '../src/camera.ts';
import {LevelRules,enemyHeight} from '../src/gameplay.ts';
import {JUNGLE_PHASE6} from '../src/jungle-layout.ts';
import {ROPEY} from '../src/ropey-layout.ts';
import {REPTILE} from '../src/reptile-layout.ts';
import {practiceLevel} from '../src/tutorial.ts';
import {ropeTop} from '../src/ropes.ts';
import {Campaign} from '../src/campaign.ts';
const opts={gravity:640,playerWidth:12,playerHeight:16};
const p=(x,y=116,extra={})=>({x,y,vy:0,grounded:true,previousFeet:y+8,...extra});
let x=400,c=horizontalStart(2560,x);
for(let i=0;i<120;i++){x+=102/60;c=horizontalStep(2560,c,x,102);}
assert(x-c.scroll>53&&x-c.scroll<64,'Running right leaves at least 96px ahead');
for(let i=0;i<120;i++){x-=60/60;c=horizontalStep(2560,c,x,-60);}
assert(x-c.scroll>96&&x-c.scroll<108,'Walking left mirrors the look-ahead');
for(let i=0;i<120;i++)c=horizontalStep(2560,c,x,0);
const stopped=c.scroll;
for(let i=0;i<120;i++)c=horizontalStep(2560,c,x,0);
assert(Math.abs(c.scroll-stopped)<.01,'No idle recentering');
assert.equal(horizontalStart(160,100).scroll,0,'One-screen practice stays fixed');
assert.equal(horizontalStart(2560,2560).scroll,2400,'World edge clamps');
for(const level of [JUNGLE_PHASE6,ROPEY,REPTILE]){
  assert(level.enemies.some(e=>e.kind==='bee')&&level.enemies.some(e=>e.kind==='lizard'));
  for(const e of level.enemies.filter(e=>e.kind!=='bee')){
    assert(e.speed>=24&&e.speed<=48,'Faster ground patrols still remain slower than ordinary walking');
    if(e.kind==='lizard')assert(e.speed>=42,'Lizards have their own visibly faster horizontal rhythm');
  }
  for(const b of level.bunches){
    assert([...level.solids,...level.platforms].some(([sx,sy,w])=>b.x>sx&&b.x<sx+w&&b.y<sy&&sy-b.y<=20),'Bunch rewards a reachable upper ledge');
    assert(Math.hypot(b.x-level.spawn.x,b.y-level.spawn.y)>100,'Reward stays far from the spawn; the new crown is reached by climbing, not proximity');
  }
  for(const e of level.enemies.filter(e=>e.kind==='bee')){
    assert([level.checkpoint,...(level.extraCheckpoints??[])].every(cp=>Math.abs(cp.spawn.x-e.x)>60),'No bee at a respawn');
    for(let t=0;t<2400;t+=16){
      const y=enemyHeight('bee',e.y,t,e.phase);
      for(const x of [e.min,e.max])assert(!level.solids.some(([sx,sy,w,h])=>x+7>sx&&x-7<sx+w&&y+6>sy&&y-6<sy+h),'Bee never hides inside solid terrain');
    }
  }
}
assert.equal(REPTILE.enemies.length,9,'Two additional cave encounters');
assert.equal(ROPEY.enemies.length,9,'One added patrol, not a crowd at every landing');
assert.equal(ROPEY.enemies.filter(e=>e.kind==='lizard').length,3,'New patrol and upgraded final rival');
for(const level of [JUNGLE_PHASE6,ROPEY])for(const e of level.enemies.filter(e=>e.kind==='lizard')){
  for(const cp of [level.checkpoint,...(level.extraCheckpoints??[])])assert(Math.min(Math.abs(e.min-cp.spawn.x),Math.abs(e.max-cp.spawn.x))>60,'Lizards cannot camp the respawn');
  for(const x of [e.min,e.max])assert([...level.solids,...level.platforms].some(([sx,sy,w])=>x-7>=sx&&x+7<=sx+w&&e.y+6===sy),'Lizard patrol is fully supported');
  for(let t=0;t<1400;t+=20){
    const y=enemyHeight('lizard',e.y,t,e.phase);
    for(const x of [e.min,e.max])assert(!level.solids.some(([sx,sy,w,h])=>x+7>sx&&x-7<sx+w&&y+6>sy&&y-6<sy+h),'New hop arcs do not pass through solid walls');
  }
}
for(const e of REPTILE.enemies.slice(7)){
  assert(Math.abs(e.x-REPTILE.checkpoint.spawn.x)>100,'New patrols never camp the checkpoint');
  for(const x of [e.min,e.max])assert([...REPTILE.solids,...REPTILE.platforms].some(([sx,sy,w])=>x-6>=sx&&x+6<=sx+w&&e.y+6===sy),'Added ground patrol has real floor under both ends');
}
const level={...practiceLevel(0),enemies:[{x:90,y:94,min:90,max:90,direction:1,speed:0,kind:'bee'}],barrels:[{x:40,y:116}]};
for(const mode of ['stomp','roll']){
  const r=new LevelRules(level,opts);
  if(mode==='roll')r.rollUntil=1000;
  const hit=r.step(0,p(90,94,mode==='stomp'?{vy:100,previousFeet:85}:{}));
  assert(hit.hurt&&!hit.bounce&&r.enemies[0].alive,'Stingers cannot be stomped/rolled');
}
{
  const r=new LevelRules(level,opts);
  Object.assign(r.barrels[0],{x:90,y:94,state:'thrown',vx:0,vy:0,expires:1000});
  r.step(0,p(20));assert(!r.enemies[0].alive&&r.kills.barrel===1,'Barrel defeats a bee');
}
assert.equal(enemyHeight('lizard',118,300),82,'Higher 36px lizard hop apex');
assert.equal(enemyHeight('lizard',118,1000),118,'Grounded opening to attack');
assert.equal(enemyHeight('lizard',118,1700),82,'1400ms period');
for(let t=600;t<1400;t+=16)assert.equal(enemyHeight('lizard',118,t),118,'800ms grounded counterattack opening');
for(const time of [300,800]){
  const r=new LevelRules({...level,barrels:[],enemies:[{x:90,y:118,min:90,max:90,speed:0,direction:1,kind:'lizard'}]},opts);
  const y=enemyHeight('lizard',118,time);
  for(let t=0;t<time;t+=20)r.step(Math.min(20,time-t),p(20));
  const hit=r.step(0,p(90,y-12,{vy:60,grounded:false,previousFeet:y-8}));
  assert(hit.bounce&&!hit.hurt&&!r.enemies[0].alive,'Lizard can be stomped in flight AND on ground');
}
{
  const r=new LevelRules({...level,enemies:[],bananas:[],bunches:[{x:80,y:90}]},opts);
  r.step(16,p(80,90));assert.equal(r.bananas,10);assert.equal(r.totalBananas,10);
  r.step(16,p(80,90));assert.equal(r.bananas,10,'Only once');r.respawn();assert.equal(r.bananas,10);
  const campaign=new Campaign();campaign.complete('jungle',r.pickups);campaign.complete('jungle',r.pickups);
  assert.equal(campaign.summary('jungle',r.pickups).bananas,10,'No farming on replay/current-stage summary');
  const fresh=new LevelRules(r.level,opts);campaign.restore('jungle',fresh.pickups);assert.equal(fresh.bananas,10);
  const lots=Array.from({length:12},(_,i)=>({id:`bunch-${i}`,value:10,collected:true}));
  campaign.complete('ropey',lots);assert.equal(campaign.summary().bananas,130,'Campaign keeps totals above 99');
}
const rope=practiceLevel(8).ropes[0];
assert.equal(ropeTop(rope)-14,70,'Practice hands reach the visible anchor');
assert(ropeTop(rope)-24>53,'Whole head stays below instruction panel');
console.log('PASS encounters: directional camera, uncluttered respawns, safe bee patrols, stingers/barrels, periodic lizard hop, ten-banana rewards/persistence, visible practice-rope limit.');
