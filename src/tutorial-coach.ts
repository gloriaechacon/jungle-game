import type { BarrelLessonPhase } from './tutorial';
/** Plain-language presentation only; completion still comes from real gameplay. */
export interface PracticeHint {step:number;instruction:string;complete:boolean;retrying?:boolean;barrelPhase?:BarrelLessonPhase}
export interface CoachHint {title:string;action:string;detail:string;target:string;targets?:string[]}

export function tutorialCoach(screen:string,practice:PracticeHint|undefined,touch:boolean,completed:readonly string[]=[]):CoachHint|undefined {
  const key=(desktop:string,mobile:string)=>touch?`el botón ${mobile}`:`la tecla ${desktop}`;
  if(screen==='title')return {title:'',action:`${touch?'Toca':'Pulsa'} ${key('K','A')} para empezar`,detail:'',target:'a'};
  if(screen==='map')return completed.includes('jungle')?undefined:{title:'',action:`${touch?'Toca':'Presiona'} ${key('K','A')} para entrar`,detail:'',target:'a'};
  if(screen!=='level'||!practice)return;
  const {step,instruction,complete,retrying}=practice;
  // Public UI uses these targets for rings only; all lesson words live in LCD.
  const title='';
  if(complete)return; // Success already appears inside the LCD.
  if(retrying)return {title,action:step===4?'Inténtalo otra vez: salta sobre el rival.':step===5?'Inténtalo otra vez: rueda contra el rival.':'Inténtalo otra vez: usa el barril contra el rival.',detail:'',target:''};
  const hints:[string,string,string][]=[
    [touch?'Mantén la flecha → para caminar':'Mantén la tecla D para caminar','','right'],
    [`${touch?'Toca':'Presiona'} ${key('K','A')} para saltar; mantenlo para subir más`,'','a'],
    [`${touch?'Toca':'Presiona'} ${key('J','B')} una vez para rodar`,'','b'],
    [touch?'Para correr, mantén → y el botón B':'Para correr, mantén las teclas D y J','','b'],
    [touch?'Mantén → y toca el botón A para saltar. Cae encima del rival para derrotarlo.':'Mantén la tecla D y pulsa K para saltar. Cae encima del rival para derrotarlo.','','a'],
    [`Acércate al rival y ${touch?'toca':'presiona'} ${key('J','B')} para rodar`,'','b'],
    [`Mantén presionado ${key('J','B')}`,'Acércate al barril. Suelta el botón cuando lo levantes para lanzarlo.','b'],
    [`Mantén ${key('K','A')} al caer en la llanta para rebotar alto`,'','a'],
    [touch?'Mantén la flecha ↑ junto a la liana para subir':'Mantén la tecla W junto a la liana para subir','','up'],
    [touch?'Toca la flecha ↓ para bajar de la repisa':'Presiona la tecla S para bajar de la repisa','','down'],
  ];
  let hint=hints[step];if(!hint)return;
  if(step===8&&instruction.includes('SUELTA'))hint=[`${touch?'Toca':'Presiona'} ${key('K','A')} para soltarte y saltar`,'','a'];
  if(step===9&&instruction.includes('SUBE A'))hint=[`Salta a la repisa con ${key('K','A')}`,'','a'];
  if(step===6){
    const phase=practice.barrelPhase??'approach';
    if(phase==='approach')hint=[touch?'Acércate al barril con la flecha →':'Acércate al barril con la tecla D','','right'];
    if(phase==='grab')hint=[`Mantén ${key('J','B')} para agarrarlo`,'','b'];
    if(phase==='throw')hint=[`Suelta ${key('J','B')} para lanzarlo`,'','b'];
    if(phase==='flight')hint=['El barril va hacia el rival','',''];
  }
  const result:CoachHint={title,action:hint[0],detail:hint[1],target:hint[2]};
  if(step===3||step===4)result.targets=[hint[2],'right'];
  return result;
}
