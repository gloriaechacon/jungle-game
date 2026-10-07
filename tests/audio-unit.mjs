import assert from 'node:assert/strict';
import {requestPlaybackSession} from '../src/audio-session.ts';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { SoundObserver, SOUND_NAMES } from '../src/audio-events.ts';
import { RATE, musicScores, effectScores, render, wav, MUSIC_RMS } from '../tools/audio/score.mjs';
import { INTRO_TRACK, MAP_TRACK, LEVEL_TRACK, BONUS_TRACK, TUTORIAL_ENDING_TRACK, audioAssetPath, MUSIC_TRACKS, PLAYBACK_TRACKS, trackFor } from '../src/audio-events.ts';
import { pulseHz, waveHz, DUTY } from '../tools/audio/gb.mjs';

const frame={jumpAt:-Infinity,vy:0,tires:0,deaths:0,dying:false,finished:false,
  rollAt:-Infinity,liftAt:-Infinity,throwAt:-Infinity,checkpoint:-1,bananas:0,letters:'-----',
  stomp:0,defeat:0,broken:0,lesson:0};
assert.equal(requestPlaybackSession({}),undefined,'Unsupported AudioSession keeps Web Audio working');
assert.equal(requestPlaybackSession({get audioSession(){throw new Error('restricted');}}),undefined);
assert.equal(requestPlaybackSession({audioSession:{get type(){return 'ambient';},set type(_){throw new Error('denied');}}}),undefined);
assert.equal(requestPlaybackSession({audioSession:{get type(){return 'ambient';},set type(_){}}}),undefined,'Do not report success when setter is ignored');
const session={type:'auto'},restore=requestPlaybackSession({audioSession:session});
assert.equal(session.type,'playback');restore();assert.equal(session.type,'auto');
const release=requestPlaybackSession({audioSession:session});session.type='ambient';release();assert.equal(session.type,'ambient','Do not overwrite a later owner');
const observer=new SoundObserver();
let current={...frame};
const step=(patch,expected)=>{
  current={...current,...patch};assert.deepEqual(observer.read(current),expected);
  assert.deepEqual(observer.read(current),[],'Unchanged/frozen step does not repeat sound');
};
assert.deepEqual(observer.read(current),[]);
step({jumpAt:10},['jump']);
step({vy:-220},[]); // Holding jump / changing velocity is not a new jump.
step({jumpAt:20,tires:1},['tire']); // Tire dominates ordinary jump in same step.
step({rope:'a'},['rope']);
step({rope:undefined,vy:-235},['jump']);
step({rollAt:30},['roll']);step({liftAt:40},['lift']);step({throwAt:50},['throw']);
step({broken:1,defeat:1},['defeat','break']);step({stomp:1},['stomp']);
step({bananas:2},['banana']);step({letters:'B----',bananas:3},['letter']);
step({checkpoint:0},['checkpoint']);step({checkpoint:1},['checkpoint']);
step({dying:true,rope:undefined,vy:-100},['hit']);
step({dying:false,deaths:1,tires:0,broken:0},['respawn']);
step({deaths:2},['fall']);step({lesson:100},['lesson']);step({finished:true},['victory']);
current={...frame};observer.reset(current);assert.deepEqual(observer.read(current),[],'Manual restart is silent');
current={...frame,letters:'BONUS',bananas:50};observer.reset(current);
assert.deepEqual(observer.read(current),[],'Restored campaign collectibles do not replay');

const effects=effectScores();assert.deepEqual(Object.keys(effects),[...SOUND_NAMES]);
const manifest=JSON.parse(await readFile(new URL('../docs/audio/manifest.json',import.meta.url),'utf8'));
const music=musicScores();assert.deepEqual(Object.keys(music),[...MUSIC_TRACKS],'One loop per place');
for(const [name,score] of [...Object.entries(music),...Object.entries(effects)]){
  const pcm=render(score),bytes=wav(pcm);
  assert(pcm.some(x=>Math.abs(x)>.01),`${name}: audible signal, not empty`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.files[name].sha256,`${name}: deterministic regeneration`);
  assert.deepEqual(bytes,await readFile(new URL(`../public/audio/${name}.wav`,import.meta.url)),`${name}: shipped asset matches source`);
  assert.equal(bytes.readUInt32LE(24),RATE);assert.equal(bytes.readUInt32LE(40),pcm.length*2);
  if(score.loop){
    // Square waves have hard edges everywhere, so a fixed threshold is meaningless.
    // The loop is rendered circularly: playing it twice in a row must be identical
    // to a render of two back-to-back copies (no seam artefact, tails wrap around).
    const L=Math.round(score.length*RATE)/RATE;
    const twice=render({...score,length:L*2,events:[...score.events,...score.events.map(e=>({...e,at:e.at+L}))]});
    const n=pcm.length;let worst=0;
    for(let i=0;i<twice.length;i+=7)worst=Math.max(worst,Math.abs(twice[i]-pcm[i%n]));
    assert(worst<1e-2,`${name}: seamless loop join (max difference ${worst})`);
  }
  else {assert(Math.abs(pcm[0])<.001);assert(Math.abs(pcm.at(-1))<.001);}
}
// Second pass: tracks per place, levelled to the same loudness; Game Boy constraints.
for(const flags of [{},{ropey:true},{reptile:true}])assert.equal(trackFor('JungleGreyboxScene',flags),LEVEL_TRACK);
assert.equal(trackFor('TitleScene',{}),INTRO_TRACK);
for(const [track,gain] of [[INTRO_TRACK,-7.5],[MAP_TRACK,-6.5],[LEVEL_TRACK,-8.3],[BONUS_TRACK,-7],[TUTORIAL_ENDING_TRACK,-8]]){
  assert.equal(audioAssetPath(track),`${track}.m4a`);
  const entry=JSON.parse(await readFile(new URL(`../public/audio/${track}.json`,import.meta.url),'utf8'));
  assert.equal(entry.gainDb,gain);
  assert(entry.firstCapturedAttackSeconds>=entry.start&&entry.firstCapturedAttackSeconds-entry.start<.01,'No recording delay before the first captured note');
  assert(entry.fadeInSeconds<=.003,'Preserve first-note attack');
  assert.equal(createHash('sha256').update(await readFile(new URL(`../public/audio/${track}.m4a`,import.meta.url))).digest('hex'),entry.outputSha256);
  assert.equal(createHash('sha256').update(await readFile(new URL(`../${entry.source}`,import.meta.url))).digest('hex'),entry.sourceSha256);
}
const level=JSON.parse(await readFile(new URL('../public/audio/soundtrack/level.json',import.meta.url),'utf8'));
assert(level.loop&&level.loopSeconds>100&&level.loopSeconds<110,'Two complete captured passages, not just the opening motif');
assert.deepEqual(level.preservedSourceRange,[2.468,53.802]);
assert.deepEqual(level.laterSectionIncluded,[35,50],'Later rhythm explicitly preserved');
assert(level.periodSeconds>51&&level.periodSeconds<52,'Full sample in every pass');
assert(Math.abs(level.periodSeconds*level.repetitions-level.loopSeconds)<1e-6,'Crossfades never shorten the rhythm');
assert.equal(level.repetitions,level.variantOrder.length);assert(new Set(level.variantOrder).size>1,'Subtle EQ/gain variants');
assert.equal(level.generatedNotes,false);assert.equal(level.sourceSeparation,false,'Do not claim music isolation');
assert(level.pcmPeak>.05&&level.pcmPeak<.6);assert(level.joinMaxSteps.every(x=>x<.02),'No hard jumps at arrangement joins');
assert.equal(createHash('sha256').update(await readFile(new URL(`../${level.basePreview}`,import.meta.url))).digest('hex'),level.baseSha256);
for(const scene of ['WorldMapScene','StageIntroScene'])assert.equal(trackFor(scene,{}),MAP_TRACK);
assert.equal(trackFor('FinalBonusScene',{}),BONUS_TRACK);
assert.equal(trackFor('DemoEndingScene',{}),TUTORIAL_ENDING_TRACK);
for(const scene of ['StageIntroScene','JungleGreyboxScene'])assert.equal(trackFor(scene,{practice:true}),TUTORIAL_ENDING_TRACK);
assert.equal(trackFor('WorldMapScene',{practice:true}),MAP_TRACK,'Stale practice flags cannot replace map music');
assert.equal(trackFor('FinalBonusScene',{practice:true}),BONUS_TRACK);
const shared=JSON.parse(await readFile(new URL('../public/audio/soundtrack/tutorial-ending.json',import.meta.url),'utf8'));
assert(shared.loop&&Math.abs(shared.loopSeconds-62.575125)<.001);assert.equal(shared.sourceSeparation,false);
const bonus=JSON.parse(await readFile(new URL('../public/audio/soundtrack/bonus.json',import.meta.url),'utf8'));
assert(bonus.loop&&Math.abs(bonus.loopSeconds-26.42725)<.001,'Bonus preserves the measured full repeat');
assert.equal(bonus.sourceSeparation,false);
const captured=JSON.parse(await readFile(new URL('../public/audio/recordings/manifest.json',import.meta.url),'utf8'));
for(const name of PLAYBACK_TRACKS){
  if(name.startsWith('soundtrack/'))continue;
  const bytes=await readFile(new URL(`../public/audio/${name}.wav`,import.meta.url));
  const entry=captured.files[name.split('/')[1]];
  assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
  assert.equal(bytes.readUInt32LE(24),22050);assert.equal(bytes.readUInt16LE(22),1);
  assert.equal(entry.loop,name!=='recordings/celebration');
  assert.equal(createHash('sha256').update(await readFile(new URL(`../docs/referencias-cuatro-videos/audio/${entry.source}`,import.meta.url))).digest('hex'),entry.sourceSha256);
}
for(const name of MUSIC_TRACKS){const pcm=render(music[name]);const rms=Math.sqrt(pcm.reduce((n,x)=>n+x*x,0)/pcm.length);
  assert(rms<=MUSIC_RMS*1.01&&rms>MUSIC_RMS*.6,`${name}: comparable loudness (${rms.toFixed(3)})`);}
assert(Math.abs(pulseHz(440)-440)<1.5&&pulseHz(440)!==440,'Pulse pitch quantized to an 11-bit register');
assert(Math.abs(waveHz(110)-110)<0.5,'Wave pitch register');assert.deepEqual(Object.keys(DUTY),['12','25','50','75']);
for(const [name,score] of Object.entries(music))for(const e of score.events){
  assert(['p1','p2','w','n'].includes(e.ch),`${name}: only the four console channels`);
  if(e.vol!==undefined)assert(Number.isInteger(e.vol)&&e.vol>=0&&e.vol<=15,`${name}: 4-bit volume`);
}
const hash=createHash('sha256').update(await readFile(new URL('../src/tuning.ts',import.meta.url))).digest('hex');
assert.equal(hash,'87f02c4b43fdde42e00c80839ab5d9cfc1b91ed92b39dfc7f1912315f0f6c9f9');
console.log('PASS audio: actual-event edges, reset/pause deduplication, 21 deterministic PCM assets (4 loops + 17 effects), Game Boy channel/volume/pitch constraints, equal loop loudness, nonzero/nonclipping signals, loop boundary, B-01 intact.');
