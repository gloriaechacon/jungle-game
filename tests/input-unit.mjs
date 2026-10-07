import assert from 'node:assert/strict';
import {InputController} from '../src/input.ts';
import {padActions} from '../src/touch-controls.ts';
import {controlText,TOUCH_LESSONS} from '../src/control-labels.ts';
import {tutorialCoach} from '../src/tutorial-coach.ts';
import {nearTire,tireCoach,TIRE_GUIDE} from '../src/level-hints.ts';
import {REPTILE} from '../src/reptile-layout.ts';
import {LESSONS,barrelLessonPhase,barrelLessonInstruction} from '../src/tutorial.ts';
import {Campaign,STAGES} from '../src/campaign.ts';

const scope=new EventTarget(),doc=new EventTarget(),win=new EventTarget();
doc.activeElement=scope;doc.hidden=false;doc.hasFocus=()=>true;
globalThis.document=doc;globalThis.window=win;
scope.focus=()=>{doc.activeElement=scope;scope.dispatchEvent(new Event('focus'));};
const controls=new InputController(scope,()=>{});
const key=(type,code)=>{const e=new Event(type,{cancelable:true});Object.assign(e,{code});win.dispatchEvent(e);};
controls.setPointer(1,['right']);controls.setPointer(2,['b']);controls.setPointer(3,['a']);
assert(controls.snapshot().right&&controls.snapshot().b&&controls.snapshot().a);
controls.releasePointer(3);assert(!controls.snapshot().a&&controls.snapshot().right&&controls.snapshot().b);
key('keydown','KeyD');controls.releasePointer(1);assert(controls.snapshot().right);
key('keyup','KeyD');assert(!controls.snapshot().right);
controls.setPointer(4,['b']);controls.releasePointer(2);assert(controls.snapshot().b);
controls.setPointer(4,['left','up']);assert(!controls.snapshot().b&&!controls.snapshot().left&&controls.snapshot().up);
controls.setPointer(4,[]);assert(controls.hasPointer(4));assert(Object.values(controls.snapshot()).every(v=>!v));
controls.setPointer(4,['right']);win.dispatchEvent(new Event('blur'));
assert(!controls.isActive&&!controls.hasPointer(4));assert(Object.values(controls.snapshot()).every(v=>!v));
controls.setPointer(5,['a']);assert(!controls.snapshot().a);
controls.focus();controls.setPointer(6,['start']);controls.setEnabled(false);
assert(!controls.isActive&&Object.values(controls.snapshot()).every(v=>!v));
controls.setEnabled(true);controls.setPointer(7,['b']);doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));
assert(!controls.isActive&&!controls.snapshot().b);doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));
controls.clear();
const directions=['up','down','left','right'];
for(const first of directions)for(const second of directions){
  controls.setPointer(1,[first]);controls.setPointer(2,[second]);
  assert.equal(directions.filter(d=>controls.snapshot()[d]).length,1);
  assert(controls.snapshot()[second],'Latest pressed direction wins');
  controls.setPointer(3,['a','b']);assert(controls.snapshot().a&&controls.snapshot().b);
  controls.releasePointer(2);assert(controls.snapshot()[first],'Remaining real contact stays active');
  controls.releasePointer(1);assert(!directions.some(d=>controls.snapshot()[d]));controls.clear();
}
key('keydown','KeyD');key('keydown','KeyS');assert(controls.snapshot().down&&!controls.snapshot().right);
controls.setPointer(11,['up']);assert(controls.snapshot().up&&!controls.snapshot().down);
key('keydown','KeyA');assert(controls.snapshot().left&&!controls.snapshot().up);
key('keyup','KeyA');assert(controls.snapshot().up);controls.releasePointer(11);assert(controls.snapshot().down);
key('keyup','KeyS');assert(controls.snapshot().right);key('keyup','KeyD');assert(!controls.snapshot().right);
controls.setPointer(8,['a']);controls.destroy();assert(Object.values(controls.snapshot()).every(v=>!v));
assert.deepEqual(padActions(1,.5),['right']);assert.deepEqual(padActions(0,.5),['left']);
assert.deepEqual(padActions(.5,0),['up']);assert.deepEqual(padActions(.5,1),['down']);
assert.deepEqual(padActions(.85,.7),['right']);assert.deepEqual(padActions(.7,.85),['down']);assert.deepEqual(padActions(.5,.5),[]);
for(let x=0;x<=20;x++)for(let y=0;y<=20;y++)assert(padActions(x/20,y/20).length<=1,'No pad location emits two arrows');
assert.deepEqual(padActions(-.1,.5),[]);assert.deepEqual(padActions(.5,1.1),[]);
assert.equal(controlText('K / ESPACIO: MAPA',true),'A / START: MAPA');
assert.equal(controlText('A/D ELEGIR - K ENTRAR',true),'IZQ/DER ELEGIR - A ENTRAR');
assert.equal(controlText('A/D ELEGIR - K ENTRAR',false),'A/D ELEGIR - K ENTRAR');
assert.equal(TOUCH_LESSONS.length,10);assert(TOUCH_LESSONS.flat().every(s=>s.length<=21));
assert(LESSONS.flat().every(s=>s.length<=21));
assert.deepEqual(LESSONS[4],['MANTEN D Y PULSA K','SALTA SOBRE EL RIVAL','CAE ENCIMA Y VENCELO']);
assert.deepEqual(TOUCH_LESSONS[4],['MANTEN DER Y TOCA A','SALTA SOBRE EL RIVAL','CAE ENCIMA Y VENCELO']);
assert(LESSONS.every(lines=>lines.length<=3)&&TOUCH_LESSONS.every(lines=>lines.length<=3),'Copy stays within the existing LCD card');
for(const touch of [false,true]){
  assert.deepEqual(tutorialCoach('title',undefined,touch),{title:'',action:touch?'Toca el botón A para empezar':'Pulsa la tecla K para empezar',detail:'',target:'a'});
  assert.deepEqual(tireCoach(touch),{title:'',action:touch?'Mantén A para saltar más alto':TIRE_GUIDE,detail:'',target:'a'});
  assert.equal(tutorialCoach('intro',undefined,touch),undefined,'No redundant A ring on Aprende jugando card');
  assert.deepEqual(tutorialCoach('map',undefined,touch),{title:'',action:touch?'Toca el botón A para entrar':'Presiona la tecla K para entrar',detail:'',target:'a'});
  const campaign=new Campaign();
  assert(tutorialCoach('map',undefined,touch,campaign.summary().completed),'First visit still teaches map controls');
  for(const stage of STAGES){
    campaign.complete(stage,[]);
    assert.equal(tutorialCoach('map',undefined,touch,campaign.summary().completed),undefined,'No menu coaching after the first completed level, including replay');
  }
  assert(tutorialCoach('map',undefined,touch,new Campaign().summary().completed),'New campaign restores onboarding');
  for(let step=0;step<10;step++){
    const state={step,instruction:'',complete:false};
    const hint=tutorialCoach('level',state,touch);
    assert(hint.action&&hint.target);
    assert.equal(hint.detail,'','All information belongs to the one main action, not a second strip');
    if(step===3){
      assert.equal(hint.action,touch?'Para correr, mantén → y el botón B':'Para correr, mantén las teclas D y J','Running must be explicit in the main instruction');
      assert.equal(hint.detail,'','No redundant footnote or two-finger instruction');
    }
    if([3,4].includes(step))assert.deepEqual(hint.targets,[step===3?'b':'a','right']);
    if(step===4)assert.match(hint.action,/Cae encima del rival para derrotarlo/,'Explain why to land on top, not simply jump past');
    assert.equal(hint.title,'','Progress remains on the LCD, not repeated on the card');
    assert.doesNotMatch(hint.action,/^[A-Z]:/,'No cryptic key-colon instructions');
    assert.match(hint.action,touch?/botón|flecha/:/tecla/,'Explicit input device');
    assert.equal(tutorialCoach('level',{...state,complete:true},touch),undefined,'Success stays in the LCD');
    assert.match(tutorialCoach('level',{...state,retrying:true},touch).action,/^Inténtalo otra vez:/);
  }
  assert.equal(tutorialCoach('level',{step:8,instruction:'SUELTA',complete:false},touch).target,'a');
  assert.match(tutorialCoach('level',{step:1,instruction:'',complete:false},touch).action,/saltar; mantenlo para subir más/,'High jump explanation stays in the single visible card');
  assert.equal(tutorialCoach('level',{step:9,instruction:'SUBE A',complete:false},touch).target,'a');
  for(const [barrelPhase,target,verb] of [['approach','right','Acércate'],['grab','b','Mantén'],['throw','b','Suelta'],['flight','','El barril']]){
    const hint=tutorialCoach('level',{step:6,instruction:'',complete:false,barrelPhase},touch);
    assert.equal(hint.target,target);assert(hint.action.startsWith(verb));assert.equal(hint.detail,'');
    assert(barrelLessonInstruction(barrelPhase,touch).split('\n').every(t=>t.length<=21));
  }
}
const barrel={x:62,y:116,state:'ready'};
assert.equal(barrelLessonPhase(36,116,[barrel]),'approach');
assert.equal(barrelLessonPhase(40,116,[barrel]),'approach','Exactly22px is not in the real grab range');
assert.equal(barrelLessonPhase(41,116,[barrel]),'grab');
assert.equal(barrelLessonPhase(47,96,[barrel]),'approach','Respect vertical grab range too');
assert.equal(barrelLessonPhase(47,116,[{...barrel,state:'carried'}]),'throw');
assert.equal(barrelLessonPhase(47,116,[{...barrel,state:'thrown'}]),'flight');
assert.equal(tutorialCoach('level',undefined,false),undefined);
for(const [index,tire] of REPTILE.tires.entries()){
  for(const dx of [-80,0,80])assert.equal(nearTire(REPTILE.tires,tire.x+dx,tire.y),index===0,'Only the first tire teaches holding jump, including both approaches/retries');
  assert(!nearTire(REPTILE.tires,tire.x,tire.y-70),'Do not distract on the upper route');
  assert(!nearTire(REPTILE.tires,tire.x,tire.y+20),'No tire hint while falling into a pit');
}
assert(!nearTire(REPTILE.tires,40,180));
assert(!nearTire(undefined,356,180));
console.log('PASS input: single direction across fingers/keyboard, independent A+B, four-way pad, neutral, blur/hidden/power lock, labels and ten touch lessons.');
