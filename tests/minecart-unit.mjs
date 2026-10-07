import assert from 'node:assert/strict';
import {CART,RAIL_POINTS,RAIL_GAPS,railAt,railHeight,MinecartRun} from '../src/minecart.ts';
import {Campaign} from '../src/campaign.ts';
import {trackFor,LEVEL_TRACK} from '../src/audio-events.ts';
import {JUNGLE,JUNGLE_PHASE6} from '../src/jungle-layout.ts';
import {ROPEY} from '../src/ropey-layout.ts';
import {REPTILE} from '../src/reptile-layout.ts';
import {MinecartScene} from '../src/minecart-scene.ts';
import {EventEmitter} from 'node:events';

const ticks=(r,n,a=false)=>{for(let i=0;i<n;i++)r.step(CART.step,a);};
function ready(){const r=new MinecartRun();r.sync(true);ticks(r,151,true);assert.equal(r.phase,'riding','Landing starts cart automatically');assert.equal(r.jumps,0,'Held entry never becomes a jump');ticks(r,1);return r;}
assert.equal(trackFor('MinecartScene',{}),LEVEL_TRACK);
const fall=ready();ticks(fall,750);assert.equal(fall.phase,'retry','No jump falls at the first real gap');assert.equal(fall.deaths,1);
const kept=fall.pickups.filter(p=>p.collected).length;assert(kept>0);ticks(fall,30);ticks(fall,1,true);assert.equal(fall.x,CART.start);
assert.equal(fall.pickups.filter(p=>p.collected).length,kept,'Retry preserves attempt pickups');
const run=ready(),start=run.elapsed;let jumpEnds=[];
for(let i=0;i<2300&&run.phase==='riding';i++){
  const next=RAIL_GAPS.find(([a])=>a>run.x);
  const jump=!!next&&run.grounded&&next[0]-run.x<20;
  run.step(CART.step,jump);if(run.jumped)jumpEnds.push(run.x);
}
assert.equal(run.phase,'complete','Both gaps reachable with ordinary new presses');assert.equal(run.deaths,0);assert.equal(jumpEnds.length,2);
assert(run.elapsed-start>15000&&run.elapsed-start<17000,'Faster ride around 16 seconds');
assert(Math.max(...RAIL_POINTS.map(p=>p[1]))-Math.min(...RAIL_POINTS.map(p=>p[1]))>=100,'More pronounced crests and valleys');
assert.deepEqual(RAIL_GAPS,[[1080,1108],[1810,1844]],'Same two hazards, not a harder course');
for(const [from,to] of [[250,700],[745,980],[1110,1700],[1845,2390]])for(let x=from;x<=to;x+=5){
  const r=new MinecartRun();r.phase='riding';r.x=x;r.feet=railHeight(x);
  for(let i=0;i<50&&r.phase==='riding';i++){
    r.step(CART.step,i===0);
    const rail=railAt(r.x);
    assert(['riding','complete'].includes(r.phase),`Optional jump from ${x} must stay on continuous rail`);
    if(rail!==undefined)assert(r.feet<=rail+1.5,`Optional jump from ${x} cannot clip through a rising curve`);
  }
}
// Comfortable takeoff window, including the browser test's exact two jumps.
for(const [a] of RAIL_GAPS)for(let before=10;before<=35;before++){
  const r=new MinecartRun();r.phase='riding';r.x=a-before;r.feet=railHeight(r.x);
  for(let i=0;i<130;i++)r.step(CART.step,i===0);
  assert.equal(r.phase,'riding',`Gap ${a}: jump ${before}px before edge is safe`);
  assert(r.grounded,'Cart returns to the next rail');
}
{const r=ready();while(r.x<810)ticks(r,1);assert.equal(r.phase,'riding');assert(r.grounded);assert.equal(r.jumps,0,'Broken lower rail catches the cart without jumping');}
const ended=JSON.stringify(run);ticks(run,60,true);assert.equal(JSON.stringify(run),ended,'Completion stays frozen');
const hold=ready();ticks(hold,70,true);assert.equal(hold.jumps,1,'Holding does not bunny-hop');
const pause=ready();ticks(pause,1,true);const x=pause.x;pause.sync(true);assert.equal(pause.x,x);ticks(pause,60,true);assert.equal(pause.jumps,1,'Focus sync never invents a fresh jump');
for(const [a,b] of RAIL_GAPS){assert.equal(railAt((a+b)/2),undefined);assert(b-a<=34);assert.equal(railHeight(a),railHeight(b));}
const campaign=new Campaign();campaign.complete('jungle',[]);campaign.complete('ropey',[]);
assert(!campaign.canPlayFinalBonus());campaign.complete('reptile',run.pickups);
const total=campaign.summary().bananas;campaign.complete('reptile',run.pickups);assert.equal(campaign.summary().bananas,total,'Stable cart IDs cannot farm replays');
assert(campaign.canPlayFinalBonus());
assert.equal(JUNGLE_PHASE6.letters[0].x,JUNGLE.letters[0].x);assert.equal(JUNGLE_PHASE6.letters[0].y,84);
assert.equal(JUNGLE_PHASE6.letters[1].y,4);assert.deepEqual([ROPEY.letters[1].x,ROPEY.letters[1].y],[1020,92]);assert.equal(REPTILE.letters[0].y,80);
console.log('PASS minecart: automatic entry, 16s curved route, natural downward drop, 2 reachable gaps, held input, retry, stable rewards and bee-ledged U.');

// Real scene lifecycle with inert drawing: no browser-side state injection.
function fixture(allowed=true){
  const c=new Campaign();if(allowed){c.complete('jungle',[]);c.complete('ropey',[]);}
  const listeners=new Set();let held={a:true,start:false};
  const input={isActive:true,touchLayout:false,snapshot:()=>held,subscribe(fn){listeners.add(fn);fn(held);return()=>listeners.delete(fn);},
    set(a=false,start=false){held={a,start};for(const fn of listeners)fn(held);},clear(){this.set();}};
  const events=new EventEmitter(),scene=new MinecartScene(),transitions=[];
  const chain=()=>{const o=new Proxy({},{get:(target,key)=>key==='then'?undefined:key in target?target[key]:()=>o});return o;};
  scene.registry={get:key=>key==='controls'?input:key==='campaign'?c:undefined};scene.game={events};scene.events=new EventEmitter();
  scene.cache={bitmapFont:{exists:()=>true}};scene.cameras={main:chain()};
  scene.add=Object.fromEntries(['bitmapText','graphics','tileSprite','rectangle','image','container'].map(n=>[n,chain]));
  scene.scene.start=name=>{transitions.push(name);scene.events.emit('shutdown');};
  scene.create({pickups:[{id:'from-cave',collected:true}]});
  const advance=(n=1)=>{for(let i=0;i<n;i++)scene.update(0,CART.step);};
  return {scene,c,input,events,listeners,transitions,advance};
}
{const f=fixture(false);assert.deepEqual(f.transitions,['WorldMapScene']);assert.equal(f.listeners.size,0);}
{
  const f=fixture();f.advance(151);assert.equal(f.scene.run.phase,'riding');assert.equal(f.scene.run.jumps,0);assert(!f.c.summary().finished);
  f.input.set();f.advance();f.input.set(true);f.input.set();f.advance();
  assert.equal(f.scene.run.jumps,1,'Short press between two frames is retained');
  const before=f.scene.run.elapsed;f.input.set(false,true);f.advance(60);assert.equal(f.scene.run.elapsed,before);
  f.input.set();const jumps=f.scene.run.jumps;f.input.set(true);f.advance();assert(f.scene.run.elapsed>before);
  assert.equal(f.scene.run.jumps,jumps,'A resumes the cart without adding a jump');f.input.set();
  f.input.isActive=false;const unfocused=f.scene.run.x;f.advance(60);assert.equal(f.scene.run.x,unfocused);f.input.isActive=true;
  f.events.emit('berto:to-map');assert.deepEqual(f.transitions,['WorldMapScene']);assert(!f.c.summary().finished);
  assert.equal(f.c.summary().bananas,0,'Leaving unfinished mine discards cave attempt too');assert.equal(f.listeners.size,0);
  assert.equal(f.events.listenerCount('berto:to-map'),0);
}
{
  const f=fixture();f.input.set();f.advance(180);f.input.set(true);f.advance();f.input.set();
  for(let i=0;i<2400&&!f.scene.committed;i++){
    const r=f.scene.run,next=RAIL_GAPS.find(([a])=>a>r.x);
    f.input.set(!!next&&r.grounded&&next[0]-r.x<20);f.advance();
  }
  assert(f.scene.committed);assert(f.c.summary().finished);assert(f.c.summary().bananas>1);
  const total=f.c.summary().bananas;f.advance(100);assert.equal(f.c.summary().bananas,total);
  f.input.set();f.input.set(true);assert.deepEqual(f.transitions,['FinalBonusScene']);assert.equal(f.listeners.size,0);
}
console.log('PASS minecart scene: guards, short press capture, held entry, pause/focus, map discards unfinished attempt, single commit, next scene and cleanup.');
