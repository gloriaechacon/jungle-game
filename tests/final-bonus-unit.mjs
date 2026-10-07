import assert from 'node:assert/strict';
import { FinalBonusRound, BONUS_TIME_MS, BONUS_X, BONUS_SYMBOLS, BONUS_SPAWN_X, bonusReward } from '../src/final-bonus.ts';
import { CELEBRATION_MS, celebrationFrame } from '../src/celebration.ts';
import { Campaign } from '../src/campaign.ts';
import { EventEmitter } from 'node:events';
import { FinalBonusScene } from '../src/final-bonus-scene.ts';
import { BONUS_BARREL, BONUS_NO_PRIZE, bonusTurn, bonusOopsFrame } from '../src/final-bonus-presentation.ts';
import { bonusSlot } from '../tools/art/final-bonus.mjs';
import { bonusOops } from '../tools/art/bonus-oops.mjs';
assert.equal(BONUS_SYMBOLS.length,4);
for(let symbol=0;symbol<4;symbol++){
  const frames=Array.from({length:8},(_,t)=>bonusSlot(symbol,t));
  assert.equal(new Set(frames.map(p=>Buffer.from(p.d).toString('base64'))).size,8,'Actual distinct turning art, not only changing symbols');
  for(const p of frames){assert.equal(p.w,34);assert.equal(p.h,36);assert(p.colors().length>10);}
}
for(const x of BONUS_X){assert(x-BONUS_BARREL.width/2>=0&&x+BONUS_BARREL.width/2<=160,'Larger barrels fit LCD');}
const poses=Array.from({length:4},(_,i)=>bonusOops(i));
assert.equal(new Set(poses.map(p=>Buffer.from(p.d).toString('base64'))).size,4);
assert(poses.every(p=>p.w===48&&p.h===48&&p.bbox().y+p.bbox().h===48));
assert.deepEqual(BONUS_NO_PRIZE.split('\n'),['SIN PREMIO','BUEN INTENTO!']);
for(let i=0;i<3;i++){
  const turns=new Set();for(let t=0;t<600;t+=5){turns.add(bonusTurn(t,i,false));assert.equal(bonusTurn(t,i,true),0);}
  assert.equal(turns.size,8,'Unlocked barrel turns; locked face stays front');
}
assert.deepEqual([0,800,1600,2500].map(bonusOopsFrame),[0,1,2,3]);
const round=new FinalBonusRound(()=>.2);
assert.equal(round.stars,0);
assert.equal(round.reward,0);
round.advance(400);assert.equal(round.symbol(0),1);
assert(round.hit(0));const first=round.symbol(0);
assert(!round.hit(0),'A held/second hit cannot change a selected symbol');
round.advance(1000);assert.equal(round.symbol(0),first);
assert.equal(round.contact(BONUS_X[0],85,75,-200),0,'Locked barrel remains solid');
assert(!round.hit(0),'Bumping a locked barrel cannot reselect its symbol');
assert.equal(round.contact(BONUS_X[1],85,75,-200),1);
assert.equal(round.contact(BONUS_X[1],75,85,200),-1,'Landing does not lock a barrel');
assert.equal(round.contact(BONUS_X[1],85,82,-200),-1,'Too low');
assert.equal(round.contact((BONUS_X[0]+BONUS_X[1])/2,85,75,-200),-1,'In between barrels');
assert.equal(round.contact(BONUS_SPAWN_X,85,75,-200),-1,'Jumping in place at spawn cannot select a barrel');
for(const combo of [[0,0,0],[0,0,1],[0,1,2]]){
  let n=0;const r=new FinalBonusRound(()=>combo[n++]/4);
  for(let i=0;i<3;i++)assert(r.hit(i));
  assert.equal(r.stars,4-new Set(combo).size);
  assert.equal(r.reward,new Set(combo).size===1?20:0);
  const t=r.elapsed;r.advance(10000);assert.equal(r.elapsed,t);
}
const frameSet=new Set();for(let t=0;t<CELEBRATION_MS;t+=10)frameSet.add(celebrationFrame(t));
{
  const r=new FinalBonusRound(()=>0);r.hit(0);r.hit(1);r.advance(BONUS_TIME_MS-1);
  assert.equal(r.remainingMs,1);assert(!r.expired);r.advance(100);
  assert(r.expired);assert.equal(r.remainingMs,0);assert.equal(r.reward,0);
  assert(!r.hit(2),'A late jump cannot rescue an expired round');
  assert.deepEqual(r.locked,[0,0,null],'Do not automatically choose missing symbols');
  const stopped=JSON.stringify(r);r.advance(1000);assert.equal(JSON.stringify(r),stopped);
}
assert.equal(frameSet.size,8);assert.equal(celebrationFrame(CELEBRATION_MS+1),0);
const campaign=new Campaign();for(const stage of ['jungle','ropey','reptile'])campaign.complete(stage,[]);
assert(campaign.summary().finished);assert.equal(campaign.summary().letters,'-----','Bonus eligibility does not award letters');
for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let c=0;c<4;c++){
  assert.equal(bonusReward([a,b,c]),a===b&&b===c?20:0,'All 64 combinations: only three identical symbols win');
}
for(const invalid of [[],[0,0],[null,null,null],[4,4,4],[-1,-1,-1],[1.5,1.5,1.5],[0,0,0,0]]){
  assert.equal(bonusReward(invalid),0);
  assert.equal(campaign.awardFinalBonus(invalid),0);
  assert(campaign.canPlayFinalBonus(),'Incomplete/invalid input must not consume a round');
}
assert.equal(new Campaign().awardFinalBonus([0,0,0]),0,'Cannot award before all levels completed');
assert.equal(campaign.awardFinalBonus([1,1,1]),20);
assert(!campaign.canPlayFinalBonus(),'Played bonus is not available again');
assert.equal(campaign.summary().bananas,20);assert.equal(campaign.summary().bonusBananas,20);
assert.equal(campaign.summary().letters,'-----','Reward never supplies missing letters');
assert.equal(campaign.awardFinalBonus([1,1,1]),0,'Reopening final does not duplicate reward');
assert.equal(campaign.awardFinalBonus([2,2,2]),0,'One final prize per campaign');
campaign.complete('jungle',[{id:'one',value:10,collected:true}]);
assert.equal(campaign.summary().levelBananas,10);assert.equal(campaign.summary().bananas,30,'Level pickups and bonus counted separately');
assert.equal(new Campaign().summary().bonusBananas,0,'New campaign clears bonus');
campaign.expireFinalBonus();assert.equal(campaign.summary().bonusBananas,20,'A stale timeout cannot erase an earned prize');
for(const result of [[0,0,0],[0,0,1],[0,1,2]]){
  const c=new Campaign();assert(!c.canPlayFinalBonus());
  for(const stage of ['jungle','ropey','reptile'])c.complete(stage,[]);
  assert(c.canPlayFinalBonus(),'First finish unlocks one round without requiring letters');
  const reward=c.awardFinalBonus(result);assert.equal(reward,bonusReward(result));
  assert(!c.canPlayFinalBonus(),'Zero-prize results also consume the round');
  for(const stage of ['jungle','ropey','reptile']){
    c.complete(stage,[]);
    assert(!c.canPlayFinalBonus(),`Replaying ${stage} cannot reopen the bonus`);
    assert.equal(c.awardFinalBonus([3,3,3]),0,'Re-entry cannot award a second result');
    assert.equal(c.summary().bonusBananas,reward,'Original win/loss remains settled');
  }
  const fresh=new Campaign();for(const stage of ['jungle','ropey','reptile'])fresh.complete(stage,[]);
  assert(fresh.canPlayFinalBonus(),'Only a new campaign gets a fresh bonus');
}
console.log('PASS final bonus: 4 symbols, rising contacts, 1 lock per barrel, no forced win, 3 outcomes, 8 celebration poses, optional letters.');

// Real scene lifecycle with inert rendering/physics adapter. Browser tests cover
// the actual Arcade collision/jumps; this fixture checks focus and exit cleanup.
const keys=(state={})=>({up:false,down:false,left:false,right:false,a:false,b:false,start:false,...state});
function fixture(finished=true,initial={},result,endingSeen=false){
  const campaign=new Campaign();if(finished)for(const stage of ['jungle','ropey','reptile'])campaign.complete(stage,[]);
  if(result)campaign.awardFinalBonus(result);
  if(endingSeen)campaign.markEndingSeen();
  const listeners=new Set();let current=keys(initial),telemetry;
  const controls={isActive:true,touchLayout:true,snapshot:()=>current,
    subscribe(fn){listeners.add(fn);fn(current);return()=>listeners.delete(fn);},
    set(state){current=keys(state);for(const fn of listeners)fn(current);},clear(){this.set({});}};
  const values=new Map([['campaign',campaign],['controls',controls]]),events=new EventEmitter(),world=new EventEmitter(),transitions=[];
  const chain=()=>{let object;object=new Proxy({getBounds:()=>({x:0,y:0,width:0,height:0})}, {get:(obj,key)=>key in obj?obj[key]:(...args)=>object});return object;};
  const body={position:{x:BONUS_SPAWN_X-6,y:108},halfWidth:6,halfHeight:8,width:12,height:16,velocity:{x:0,y:0},blocked:{down:true},
    get top(){return this.position.y;},setMaxVelocity(){return this;},setSize(){return this;},setCollideWorldBounds(){return this;},
    setVelocityX(x){this.velocity.x=x;return this;},setVelocityY(y){this.velocity.y=y;return this;}};
  let pauses=0;
  Object.assign(world,{setBounds(){},setBoundsCollision(){},pause(){pauses++;},resume(){}});
  const scene=new FinalBonusScene();scene.events=new EventEmitter();scene.game={events};scene.cache={bitmapFont:{exists:()=>true}};
  scene.registry={get:key=>values.get(key),set:(key,value)=>values.set(key,value)};
  scene.add=Object.fromEntries(['tileSprite','rectangle','bitmapText','graphics','image','container'].map(name=>[name,chain]));
  scene.physics={world,add:{existing(shape,staticBody){if(!staticBody)shape.body=body;},collider(){}}};
  scene.scene.start=name=>{transitions.push(name);scene.events.emit('shutdown');};
  events.on('berto:final-bonus',value=>telemetry=value);
  scene.create();
  const advance=()=>{for(let i=0;i<30;i++){world.emit('worldstep',1/60);scene.update();}};
  return {scene,controls,events,world,transitions,listeners,campaign,body,advance,telemetry:()=>telemetry,pauses:()=>pauses};
}
const intro=fixture(true,{a:true,right:true,b:true});
const symbols=intro.telemetry().symbols;
for(let i=0;i<8;i++)intro.advance();
assert.equal(intro.telemetry().phase,'instructions','Held input from prior scene cannot begin');
assert.deepEqual(intro.telemetry().symbols,symbols,'Reels wait while reading');
assert.deepEqual(intro.body.velocity,{x:0,y:0});
intro.controls.clear();intro.controls.set({a:true,right:true});intro.advance();
assert.equal(intro.telemetry().phase,'release');
assert.deepEqual(intro.body.velocity,{x:0,y:0},'Confirm and held direction cannot jump/move');
intro.controls.set({right:true});intro.advance();assert.equal(intro.telemetry().phase,'release','Release ALL fingers/keys');
intro.controls.clear();intro.advance();assert.equal(intro.telemetry().phase,'playing');
assert.deepEqual(intro.telemetry().locked,[null,null,null]);assert.deepEqual(intro.body.velocity,{x:0,y:0});
intro.controls.set({a:true});intro.advance();assert(intro.body.velocity.y<0,'Only a fresh play press jumps');
const early=fixture();early.controls.set({a:true});early.advance();early.advance();early.advance();
assert.equal(early.telemetry().phase,'instructions','An early tap is not queued until the reading guard ends');
early.controls.clear();early.controls.set({a:true});early.scene.update();assert.equal(early.telemetry().phase,'release');
console.log('PASS bonus onboarding: safe spawn, no timer pressure, held/early input ignored, confirm consumed, all keys released, fresh jump required.');
{
  const f=fixture();f.advance();f.advance();f.advance();
  f.controls.set({start:true});f.controls.clear();f.advance();const time=f.telemetry().elapsed;
  f.controls.set({a:true});f.advance();
  assert(f.telemetry().elapsed>time,'A resumes the extra from START');
  assert.equal(f.telemetry().phase,'instructions','Resuming cannot confirm the start card too');
  assert.deepEqual(f.body.velocity,{x:0,y:0},'Resume cannot jump');
  f.controls.clear();f.controls.set({a:true});f.scene.update();
  assert.equal(f.telemetry().phase,'release','A fresh A press starts normally after resume');
}
{
  const f=fixture();for(let i=0;i<50;i++)f.advance();
  assert.equal(f.telemetry().remainingMs,BONUS_TIME_MS,'Reading does not spend play time');
  f.controls.set({a:true});f.controls.clear();f.advance();
  const active=f.telemetry().remainingMs;assert(active<BONUS_TIME_MS);
  f.controls.set({start:true});f.controls.clear();for(let i=0;i<45;i++)f.advance();
  assert.equal(f.telemetry().remainingMs,active,'Pause freezes the deadline');
  f.controls.set({start:true});f.controls.clear();f.controls.isActive=false;
  for(let i=0;i<45;i++)f.advance();assert.equal(f.telemetry().remainingMs,active,'Lost focus freezes the deadline');
  f.controls.isActive=true;
  for(let i=0;i<41&&!f.telemetry().expired;i++)f.advance();
  assert(f.telemetry().expired);assert.equal(f.telemetry().reward,0);
  assert(!f.campaign.canPlayFinalBonus(),'Timeout consumes the one round even with no selections');
  assert.equal(f.campaign.summary().bonusBananas,0);
  f.events.emit('berto:to-map');f.campaign.complete('jungle',[]);
  assert(!f.campaign.canPlayFinalBonus(),'Returning to map/replaying cannot reset a timeout');
}
const blocked=fixture(false);assert.deepEqual(blocked.transitions,['WorldMapScene']);
const alreadyFinished=fixture(true,{},[0,0,0],true);
assert.deepEqual(alreadyFinished.transitions,['WorldMapScene'],'A stale extra entry cannot replay the finale');
for(const result of [[0,0,0],[0,0,1]]){
  const played=fixture(true,{},result);
  assert.deepEqual(played.transitions,['DemoEndingScene'],'Completed bonus is guarded even if the scene is entered directly');
  assert.equal(played.listeners.size,0);assert.equal(played.world.listenerCount('worldstep'),0);
}
const live=fixture();assert.deepEqual(live.transitions,[],'All levels without letters can enter');
live.advance();live.controls.set({start:true});assert.equal(live.pauses(),1);
live.scene.update();const t=live.telemetry().elapsed;live.advance();assert.equal(live.telemetry().elapsed,t);
live.controls.set({start:true});assert.equal(live.pauses(),1,'Held Start never toggles repeatedly');
live.controls.clear();live.controls.set({start:true});live.controls.clear();live.advance();assert(live.telemetry().elapsed>t);
live.controls.isActive=false;const before=live.telemetry().elapsed;live.advance();assert.equal(live.telemetry().elapsed,before,'Focus checked inside fixed step');
const progress=live.campaign.summary();live.events.emit('berto:to-map');assert.deepEqual(live.transitions,['WorldMapScene']);
assert.deepEqual(live.campaign.summary(),progress);assert.equal(live.listeners.size,0);assert.equal(live.world.listenerCount('worldstep'),0);
assert(live.campaign.canPlayFinalBonus(),'Leaving an unfinished round does not settle a result');
assert.equal(live.events.listenerCount('berto:to-map'),0);assert.equal(live.telemetry(),null);
console.log('PASS final bonus scene: unfinished guard, no-letter entry, Start edges, focus freezes fixed clock, map preserves progress, listener cleanup.');

// Actual final contact commits the prize immediately, even if the player
// chooses the map during the short result animation rather than the ending.
for(const win of [true,false]){
  const f=fixture();let n=0;
  f.scene.round=new FinalBonusRound(()=>[0,0,win?0:.25][n++]);
  f.scene.round.hit(0);f.scene.round.hit(1);f.scene.phase='playing';f.scene.lastHead=84;
  f.body.position.x=BONUS_X[2]-6;f.body.position.y=88;f.body.velocity.y=-100;f.body.blocked.down=false;
  f.advance();
  assert.equal(f.telemetry().reward,win?20:0);assert.equal(f.telemetry().awarded,win?20:0);
  assert.equal(f.campaign.summary().bananas,win?20:0);
  assert(!f.campaign.canPlayFinalBonus(),'The third contact consumes the bonus immediately, even on a loss');
  f.advance();assert.equal(f.campaign.summary().bananas,win?20:0,'Repeated frames cannot add the reward again');
  f.events.emit('berto:to-map');assert.deepEqual(f.transitions,['WorldMapScene']);
  assert.equal(f.campaign.summary().bananas,win?20:0,'Leaving during the result retains the settled prize');
  for(const stage of ['jungle','ropey','reptile']){
    f.campaign.complete(stage,[]);assert(!f.campaign.canPlayFinalBonus(),'Map during result and replay never reopens it');
  }
}
console.log('PASS final bonus prize: all 64 combinations, no early/invalid win, 20 bananas once, real scene contact commit, immediate map exit, new campaign resets.');
