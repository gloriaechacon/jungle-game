import assert from 'node:assert/strict';
import { PauseNavigation } from '../src/pause-menu.ts';
import { tutorialCoach } from '../src/tutorial-coach.ts';
const neutral={up:false,down:false,left:false,right:false,a:false,b:false,start:false};
const press=(n,key)=>{n.input(neutral,true);return n.input({...neutral,[key]:true},true);};
for(const practice of [true,false]){
  const n=new PauseNavigation(neutral,practice);
  assert.deepEqual(n.choices,practice?['continue','skip','map']:['continue','map']);
  assert.equal(press(n,'a').consumed,false,'A outside pause belongs to gameplay');
  assert(press(n,'start').consumed);assert(n.open);
  n.input({...neutral,start:true},true);assert(n.open,'Holding START does not toggle');
  assert(press(n,'a').consumed);assert(!n.open,'A resumes without becoming a jump');
  press(n,'start');press(n,'up');assert.equal(n.choices[n.selected],'map');
  assert(!press(n,'a').action);assert(n.confirming,'Map requires deliberate confirmation');
  press(n,'b');assert(n.open&&!n.confirming,'B cancels without losing the attempt');
  press(n,'a');assert.equal(press(n,'a').action,'map');
  assert(!press(n,'a').action,'Leaving is dispatched only once');
}
{
  const n=new PauseNavigation(neutral,true);press(n,'start');press(n,'down');
  assert.equal(press(n,'a').action,'skip');
  const held=new PauseNavigation({...neutral,start:true},false);
  held.input({...neutral,start:true},true);assert(!held.open,'Held entry key is not a new press');
  held.input(neutral,false);held.input({...neutral,start:true},false);assert(!held.open,'Inactive input cannot open menu');
}
for(const touch of [true,false]){
  assert.equal(tutorialCoach('level',{step:0,instruction:'BIEN!',complete:true},touch),undefined,'Success stays inside LCD');
  assert.match(tutorialCoach('level',{step:1,instruction:'',complete:false},touch).action,touch?/botón A/:/tecla K/);
}
console.log('PASS START navigation: confirm, cancel, explicit skip, focus/held-edge safety, LCD success and high-jump cue.');
