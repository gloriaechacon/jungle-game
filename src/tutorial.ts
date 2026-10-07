import type { LevelData } from './jungle-layout';
import { HITBOX, type LevelRules } from './gameplay';

export const PRACTICE_RETRY_MS=1200;

export const LESSONS = [
  ['MANTEN LA TECLA D', 'CAMINA A LA DERECHA'],
  ['TECLA K PARA SALTAR', 'MANTEN K: MAS ALTO'],
  ['PULSA LA TECLA J', 'PARA RODAR'],
  ['MANTEN TECLAS D Y J', 'PARA CORRER'],
  ['PULSA D Y K: SALTA', 'SOBRE EL RIVAL'],
  ['ACERCATE AL RIVAL', 'PULSA J PARA RODAR'],
  ['ACERCATE AL BARRIL', 'CON LA TECLA D'],
  ['SALTA A LA LLANTA', 'MANTEN LA TECLA K'],
  ['MANTEN LA TECLA W', 'PARA AGARRAR Y SUBIR'],
  ['PULSA LA TECLA S', 'PARA BAJAR LA REPISA'],
] as const;

export type BarrelLessonPhase='approach'|'grab'|'throw'|'flight';
/** Read the real grab range/state, without introducing another completion gate. */
export function barrelLessonPhase(x:number,y:number,barrels:readonly {x:number;y:number;state:string}[]):BarrelLessonPhase {
  if(barrels.some(b=>b.state==='carried'))return 'throw';
  if(barrels.some(b=>b.state==='thrown'))return 'flight';
  return barrels.some(b=>b.state==='ready'&&Math.abs(b.x-x)<HITBOX.barrelGrab.rangeX&&Math.abs(b.y-y)<HITBOX.barrelGrab.rangeY)?'grab':'approach';
}

export function barrelLessonInstruction(phase:BarrelLessonPhase,touch:boolean):string {
  if(phase==='approach')return touch?'ACERCATE AL BARRIL\nCON FLECHA DERECHA':'ACERCATE AL BARRIL\nCON LA TECLA D';
  if(phase==='grab')return touch?'MANTEN EL BOTON B\nPARA AGARRARLO':'MANTEN LA TECLA J\nPARA AGARRARLO';
  if(phase==='throw')return touch?'SUELTA EL BOTON B\nPARA LANZAR':'SUELTA LA TECLA J\nPARA LANZAR';
  return 'BARRIL EN CAMINO\nHACIA EL RIVAL';
}

export function practiceLevel(step:number):LevelData {
  const enemy=step===4||step===5||step===6;
  return {
    id:`practice-${step}`,title:'PRACTICA',width:160,height:144,fallY:190,
    spawn:step===9?{x:80,y:80}:{x:36,y:116},checkpoint:{x:-100,spawn:{x:36,y:116},minX:-110,maxX:-90,centerY:116,rangeY:10},
    exit:{x:10000,minY:0,maxY:200},solids:step===7?[[0,124,160,20],[76,112,24,12]]:[[0,124,160,20]],
    platforms:step===9?[[44,88,72,8]]:undefined,
    bananas:[],letters:[],letterRecoveryFromX:10000,
    enemies:enemy?[{x:114,y:118,min:108,max:120,direction:-1,speed:0}]:[],
    barrels:step===6?[{x:62,y:116}]:[],markers:[],
    tires:step===7?[{x:88,y:124}]:undefined,
    // Anchor/tuft ends at the highest hand grip (body 84 - grip offset 14).
    // Nothing visibly climbable continues above that point beneath the banner.
    ropes:step===8?[{id:'practice',x:90,top:60,bottom:116,climbTop:84,amplitude:0,periodMs:3000,phase:0}]:undefined,
  };
}

export interface PracticeObservation {x:number;y:number;vy:number;vx:number;rolling:boolean;stomp:number;roll:number;barrel:number;tires:number;rope:boolean;dropped:boolean;grounded:boolean}
/** Completion depends on the actual mechanics, not merely pressing the suggested key. */
export function lessonDone(step:number,p:PracticeObservation,climbed:boolean) {
  return [p.x>=80,p.vy < -150,p.rolling,p.vx>85&&p.x>75,p.stomp>0,p.roll>0,p.barrel>0,p.tires>0,climbed&&!p.rope,p.dropped&&p.grounded&&p.y>=115][step]??false;
}

/** Only practice retries exhausted encounters; real levels keep their defeated enemies. */
export function lessonNeedsRetry(step:number,r:Pick<LevelRules,'kills'|'enemies'|'barrels'>) {
  const required=(['stomp','roll','barrel'] as const)[step-4];
  if(!required||r.kills[required]>0)return false;
  const noTarget=r.enemies.length>0&&r.enemies.every(e=>!e.alive);
  const noBarrel=required==='barrel'&&r.barrels.every(b=>b.state==='spent');
  return noTarget||noBarrel;
}

export function lessonRetryInstruction(step:number) {
  return `OTRA VEZ!\n${step===4?'CAE SOBRE EL RIVAL':step===5?'RUEDA CONTRA EL RIVAL':'USA EL BARRIL'}`;
}
