import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COLLECTIBLE_WORD} from '../src/collectibles.ts';
import {Campaign,STAGES} from '../src/campaign.ts';
import {LevelRules} from '../src/gameplay.ts';
import {JUNGLE_PHASE6} from '../src/jungle-layout.ts';
import {ROPEY} from '../src/ropey-layout.ts';
import {REPTILE} from '../src/reptile-layout.ts';
import {celebration} from '../tools/art/celebration.mjs';
import {letterTile} from '../tools/art/props.mjs';

assert.equal(COLLECTIBLE_WORD,'BONUS');
const levels=[JUNGLE_PHASE6,ROPEY,REPTILE],campaign=new Campaign();
assert.equal(levels.flatMap(l=>l.letters.map(p=>p.letter)).join(''),COLLECTIBLE_WORD);
const atlas=JSON.parse(readFileSync(new URL('../public/assets/jungle-atlas.json',import.meta.url),'utf8')).frames;
for(const l of COLLECTIBLE_WORD){
  assert(atlas[`letter-${l}`]&&atlas[`hud-letter-${l}`],`World and HUD art for ${l}`);
  assert.equal(letterTile(l).w,12);assert.equal(letterTile(l,9).w,9);
}
for(const l of 'ERT')assert(!atlas[`letter-${l}`],`No obsolete letter ${l} in runtime atlas`);
assert.equal(new Set([...COLLECTIBLE_WORD].map(l=>Buffer.from(letterTile(l).d).toString('base64'))).size,5);
levels.forEach((level,i)=>{
  const r=new LevelRules(level,{gravity:640,playerWidth:12,playerHeight:16});
  for(const letter of level.letters)r.step(16,{x:letter.x,y:letter.y,vy:0,grounded:true,previousFeet:letter.y+8});
  assert.equal(r.letters,['BO---','--NU-','----S'][i]);
  campaign.complete(STAGES[i],r.pickups);
  assert.equal(campaign.summary().letters,['BO---','BONU-','BONUS'][i]);
  const restored=r.pickups.map(p=>({...p,collected:false}));campaign.restore(STAGES[i],restored);
  assert(restored.filter(p=>p.letter).every(p=>p.collected),'Replay restores the new letter identities');
});
assert(campaign.summary().finished);
const withoutLetters=new Campaign();for(const stage of STAGES)withoutLetters.complete(stage,[]);
assert(withoutLetters.summary().finished);assert.equal(withoutLetters.summary().letters,'-----','Finishing never grants missing BONUS letters');
const poses=Array.from({length:8},(_,i)=>celebration(i));
assert.equal(new Set(poses.map(p=>Buffer.from(p.d).toString('base64'))).size,8);
for(const p of poses){assert.equal(p.w,48);assert.equal(p.h,48);assert(p.colors().includes('#d8383a'));assert.equal(p.bbox().y+p.bbox().h,48);}
console.log('PASS BONUS: shared word, stage allocation, distinct world/HUD glyphs, progress/restoration, optional completion, eight celebratory poses.');
