import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Campaign } from '../src/campaign.ts';
import { DemoEndingScene, TitleScene, ENDING_ACTION, ENDING_MENU } from '../src/demo-scenes.ts';
import { GAME_TITLE } from '../src/branding.ts';
import { FONT_CHARS } from '../src/art-spec.ts';
import { FONT_CHARS as GENERATED_CHARS, fontSheet } from '../tools/art/env.mjs';
assert.equal(FONT_CHARS,GENERATED_CHARS);
for(const symbol of ['+','>']){
  const i=FONT_CHARS.indexOf(symbol);assert(i>=0);
  const font=fontSheet();let pixels=0;
  for(let y=0;y<10;y++)for(let x=0;x<8;x++)if(font.alpha(i%16*8+x,Math.floor(i/16)*10+y))pixels++;
  assert(pixels>5,`Visible ${symbol} glyph, not a silently dropped character`);
}

const empty=()=>({up:false,down:false,left:false,right:false,a:false,b:false,start:false});
function fixture(finished=true,Scene=DemoEndingScene,touch=false){
  const campaign=new Campaign();
  if(finished)for(const [stage,letters] of [['jungle','BO'],['ropey','NU'],['reptile','S']])
    campaign.complete(stage,[{id:'banana',collected:true},...[...letters].map(letter=>({id:letter,letter,collected:true}))]);
  if(finished)campaign.awardFinalBonus([2,2,2]);
  const store=new Map([['campaign',campaign],['practiceDone',true],['practiceStep',8],['ropey',true],['reptile',true],['audio-preference','untouched']]);
  const listeners=new Set();let snapshot=empty();
  const input={isActive:true,touchLayout:touch,snapshot:()=>snapshot,subscribe(fn){listeners.add(fn);fn(snapshot);return()=>listeners.delete(fn);},
    clear(){snapshot=empty();for(const fn of listeners)fn(snapshot);},set(state){snapshot={...empty(),...state};for(const fn of listeners)fn(snapshot);}};
  store.set('controls',input);
  // Rendering is deliberately inert: this suite checks REAL scene logic, not art.
  const display=()=>{const obj={};for(const method of ['setOrigin','setDepth','setLetterSpacing','setText','setScale','setAlpha','setFrame','setY','setX','fillStyle','fillRect','fillEllipse','clear','setStrokeStyle','setVisible','setPosition','setSize','setFontSize','add'])obj[method]=()=>obj;return obj;};
  const scene=new Scene(),events=new EventEmitter(),transitions=[],texts=[];let menu;
  scene.registry={get:key=>store.get(key),set:(key,value)=>store.set(key,value),remove:key=>store.delete(key)};
  scene.game={events};scene.events=new EventEmitter();scene.cache={bitmapFont:{exists:()=>true}};
  scene.add=Object.fromEntries(['bitmapText','graphics','tileSprite','rectangle','ellipse','image','container'].map(name=>[name,display]));
  scene.add.bitmapText=(_x,_y,_font,text)=>{texts.push(text);const o=display();o.setText=v=>{texts.push(v);return o;};return o;};
  scene.scene.start=name=>{transitions.push(name);scene.events.emit('shutdown');};
  events.on(ENDING_MENU,state=>menu=state);
  scene.create();
  const advance=()=>{for(let i=0;i<118;i++)scene.update(0,50);};
  return {scene,events,store,campaign,input,transitions,listeners,advance,texts,menu:()=>menu};
}
for(const touch of [false,true]){
  const f=fixture(false,TitleScene,touch);
  assert.equal(GAME_TITLE,'Going Bananas','Public browser title never includes a personal name');
  assert.deepEqual(f.texts,['GOING','BANANAS',touch?'PRESIONA A: COMENZAR':'PRESIONA K: COMENZAR'],
    'Public LCD title has exactly two name lines, with no personal subtitle');
  f.input.set({a:true});assert.deepEqual(f.transitions,['WorldMapScene']);
}
{
  const f=fixture(false);assert.deepEqual(f.transitions,['WorldMapScene']);assert.equal(f.events.listenerCount(ENDING_ACTION),0);
}
{
  const f=fixture();
  assert(!f.campaign.canShowEnding(),'Entering the finale records it in this campaign');
  f.scene.create();
  assert.deepEqual(f.transitions,['WorldMapScene'],'Direct stale finale entry is guarded too');
}
{
  const f=fixture(),before=f.campaign.summary();
  assert(f.texts.includes('GANASTE!')&&f.texts.includes('BANANAS: 3'));
  assert(!f.texts.some(t=>t==='BONUS!'||t?.startsWith('NIVELES:')),'No duplicate BONUS title or misleading levels count');
  assert.equal(before.bananas,23);assert.equal(before.bonusBananas,20);
  f.events.emit(ENDING_ACTION,'replay');assert.deepEqual(f.transitions,[],'No accidental reset during celebration');
  f.input.isActive=false;f.advance();assert.equal(f.menu(),undefined,'Lost focus freezes celebration');
  f.input.isActive=true;f.advance();assert.deepEqual(f.menu(),{ready:true,choice:'map'});
  assert(f.texts.includes('RESULTADOS'));
  f.events.emit(ENDING_ACTION,'invalid');assert.deepEqual(f.transitions,[]);
  f.events.emit(ENDING_ACTION,'map');assert.deepEqual(f.transitions,['WorldMapScene']);
  assert.equal(f.store.get('campaign'),f.campaign);assert.deepEqual(f.campaign.summary(),before);
  assert(!f.campaign.canPlayFinalBonus(),'Keeping the campaign also keeps the completed bonus');
  assert.equal(f.store.get('practiceDone'),true);assert.equal(f.listeners.size,0);assert.equal(f.events.listenerCount(ENDING_ACTION),0);
  f.events.emit(ENDING_ACTION,'replay');assert.equal(f.store.get('campaign'),f.campaign,'Stale ending command does nothing');
}
for(const mode of ['click','keyboard']){
  const f=fixture();f.advance();
  if(mode==='click')f.events.emit(ENDING_ACTION,'replay');
  else {
    f.input.set({right:true});assert.equal(f.menu().choice,'replay');f.input.clear();
    f.input.set({up:true});assert.equal(f.menu().choice,'map');f.input.clear();
    f.input.set({down:true});assert.equal(f.menu().choice,'replay');f.input.clear();
    f.input.set({start:true});assert.deepEqual(f.transitions,[],'START never confirms or restarts');f.input.clear();
    f.input.set({a:true});
  }
  assert.deepEqual(f.transitions,['TitleScene']);
  const fresh=f.store.get('campaign');assert.notEqual(fresh,f.campaign);
  assert.deepEqual(fresh.summary(),{bananas:0,levelBananas:0,bonusBananas:0,comodines:0,letters:'-----',completed:[],finished:false});
  assert.equal(fresh.selected,0);assert(!fresh.unlocked(1)&&!fresh.unlocked(2));assert.equal(fresh.mapArrivalFrom,undefined);
  for(const stage of ['jungle','ropey','reptile'])fresh.complete(stage,[]);
  assert(fresh.canPlayFinalBonus(),'New-game action restores bonus eligibility after completing the levels');
  assert(!f.store.has('practiceStep')&&!f.store.has('practiceDone'),'New game includes a fresh tutorial');
  assert.equal(f.store.get('ropey'),false);assert.equal(f.store.get('reptile'),false);
  assert.equal(f.store.get('audio-preference'),'untouched');assert.deepEqual(f.input.snapshot(),empty());
  assert.equal(f.listeners.size,0);assert.equal(f.events.listenerCount(ENDING_ACTION),0);
}
console.log('PASS ending scene: guard, timing/focus, map preserves all progress, replay resets campaign + tutorial, click/K selection, START cannot reset, input + listener cleanup.');
