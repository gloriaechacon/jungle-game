/** Read-only observer: audio never writes to physics, input or level rules. */
export const GAME_SOUND = 'berto:sound';
export const SOUND_NAMES = ['jump','banana','letter','roll','hit','fall','respawn','checkpoint','victory','lift','throw','break','stomp','defeat','tire','rope','lesson'] as const;
export type SoundName = typeof SOUND_NAMES[number];
/** Preserved synthesized set (second audio pass), still reproducible as backup. */
export const MUSIC_TRACKS = ['jungle-loop','ropey-loop','reptile-loop','map-loop'] as const;
// Supplied recording excerpts are separate assets: npm run audio still rebuilds
// the earlier synthesized set without destroying either version.
export const INTRO_TRACK = 'soundtrack/intro' as const;
export const MAP_TRACK = 'soundtrack/map' as const;
export const LEVEL_TRACK = 'soundtrack/level' as const;
export const BONUS_TRACK = 'soundtrack/bonus' as const;
export const TUTORIAL_ENDING_TRACK = 'soundtrack/tutorial-ending' as const;
export const PLAYBACK_TRACKS = [INTRO_TRACK,MAP_TRACK,LEVEL_TRACK,BONUS_TRACK,TUTORIAL_ENDING_TRACK] as const;
export function audioAssetPath(name:string){return `${name}.${name.startsWith('soundtrack/')?'m4a':'wav'}`;}
export type MusicTrack = typeof MUSIC_TRACKS[number] | typeof PLAYBACK_TRACKS[number];
/** Supplied recording for each screen. All levels share the captured Jungle theme. */
export function trackFor(scene:string, level:{ropey?:boolean;reptile?:boolean;practice?:boolean}):MusicTrack {
  if(scene==='TitleScene')return INTRO_TRACK;
  if(scene==='FinalBonusScene')return BONUS_TRACK;
  if(scene==='DemoEndingScene'||(level.practice&&['StageIntroScene','JungleGreyboxScene'].includes(scene)))return TUTORIAL_ENDING_TRACK;
  if(scene==='JungleGreyboxScene'||scene==='MovementLabScene'||scene==='MinecartScene')return LEVEL_TRACK;
  return MAP_TRACK;
}
export interface SoundFrame {
  jumpAt: number; rope?: string; vy: number; tires: number;
  deaths: number; dying: boolean; finished: boolean;
  rollAt: number; liftAt: number; throwAt: number;
  checkpoint: number; bananas: number; letters: string;
  stomp: number; defeat: number; broken: number; lesson: number;
}
export class SoundObserver {
  private previous?: SoundFrame;
  reset(frame:SoundFrame) { this.previous=frame; }
  read(next:SoundFrame):SoundName[] {
    const prev=this.previous;this.previous=next;
    if(!prev)return [];
    // A death/reset is exclusive: resetting entities must not replay pickups,
    // throws, rope releases or tire bounces from the previous life.
    if(next.deaths>prev.deaths)return [prev.dying?'respawn':'fall'];
    if(next.dying&&!prev.dying)return ['hit'];
    if(next.dying)return [];
    if(next.finished&&!prev.finished)return ['victory'];
    const sounds:SoundName[]=[];
    if(next.tires>prev.tires)sounds.push('tire');
    else if(next.jumpAt>prev.jumpAt || (prev.rope&&!next.rope&&next.vy<0))sounds.push('jump');
    if(next.rope&&next.rope!==prev.rope)sounds.push('rope');
    if(next.letters!==prev.letters)sounds.push('letter');
    else if(next.bananas>prev.bananas)sounds.push('banana');
    if(next.checkpoint>prev.checkpoint)sounds.push('checkpoint');
    if(next.rollAt>prev.rollAt)sounds.push('roll');
    if(next.liftAt>prev.liftAt)sounds.push('lift');
    if(next.throwAt>prev.throwAt)sounds.push('throw');
    if(next.stomp>prev.stomp)sounds.push('stomp');
    else if(next.defeat>prev.defeat)sounds.push('defeat');
    if(next.broken>prev.broken)sounds.push('break');
    if(next.lesson>prev.lesson)sounds.push('lesson');
    return sounds;
  }
}
