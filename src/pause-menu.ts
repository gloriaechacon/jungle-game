import Phaser from 'phaser';
import type { InputController, InputSnapshot } from './input';
import { FONTS } from './art-spec';

export const PAUSE_MENU='berto:pause-menu';
type Choice='continue'|'skip'|'map';

/** Edge-triggered navigation, shared by the tutorial, levels, cart and extra. */
export class PauseNavigation {
  open=false;
  confirming=false;
  selected=0;
  leaving=false;
  readonly choices:Choice[];
  private previous:InputSnapshot;
  constructor(previous:InputSnapshot,canSkip:boolean){
    this.previous=previous;
    this.choices=canSkip?['continue','skip','map']:['continue','map'];
  }
  input(state:InputSnapshot,active:boolean):{consumed:boolean;action?:Choice} {
    const prior=this.previous;this.previous={...state};
    if(!active)return {consumed:this.open};
    if(this.leaving)return {consumed:true};
    const start=state.start&&!prior.start,a=state.a&&!prior.a,b=state.b&&!prior.b;
    if(start){this.open=!this.open;this.confirming=false;this.selected=0;return {consumed:true};}
    if(!this.open)return {consumed:false};
    if(b){if(this.confirming)this.confirming=false;else this.open=false;return {consumed:true};}
    if(this.confirming){
      if(a){this.leaving=true;return {consumed:true,action:'map'};}
      return {consumed:true};
    }
    const direction=state.down&&!prior.down?1:state.up&&!prior.up?-1:0;
    if(direction)this.selected=(this.selected+direction+this.choices.length)%this.choices.length;
    if(a){
      const action=this.choices[this.selected];
      if(action==='map')this.confirming=true;
      else if(action==='continue')this.open=false;
      else {this.leaving=true;return {consumed:true,action};}
    }
    return {consumed:true};
  }
}

export class PauseMenu {
  private navigation:PauseNavigation;
  private panel:Phaser.GameObjects.Container;
  private heading:Phaser.GameObjects.BitmapText;
  private rows:Phaser.GameObjects.BitmapText[];
  private note:Phaser.GameObjects.BitmapText;
  private footer:Phaser.GameObjects.BitmapText;
  private selection:Phaser.GameObjects.Rectangle;
  private last='';
  private scene:Phaser.Scene;
  private controls:InputController;
  private onMap:()=>void;
  private onSkip?:()=>void;
  get open(){return this.navigation.open;}
  constructor(scene:Phaser.Scene,controls:InputController,onMap:()=>void,onSkip?:()=>void){
    this.scene=scene;this.controls=controls;this.onMap=onMap;this.onSkip=onSkip;
    this.navigation=new PauseNavigation(controls.snapshot(),!!onSkip);
    const text=(y:number,value:string,size=8)=>scene.add.bitmapText(80,y,FONTS.ink,value,size).setLetterSpacing(-1).setOrigin(.5,0);
    this.heading=text(29,'PAUSA',12);
    this.rows=this.navigation.choices.map((_,i)=>text(52+i*16,''));
    this.note=text(52,'');this.footer=text(109,'');
    this.selection=scene.add.rectangle(80,57,140,15,0xc3d4ca).setStrokeStyle(1,0x7e9892);
    this.panel=scene.add.container(0,0,[scene.add.rectangle(80,78,154,116,0xe5ede7,1).setStrokeStyle(1,0x7e9892),this.selection,this.heading,...this.rows,this.note,this.footer]).setScrollFactor(0).setDepth(1000).setVisible(false);
    this.paint();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>scene.game.events.emit(PAUSE_MENU,{open:false}));
  }
  input(state:InputSnapshot){
    const result=this.navigation.input(state,this.controls.isActive);this.paint();
    if(result.action==='map')this.onMap();
    if(result.action==='skip')this.onSkip?.();
    return result.consumed;
  }
  private paint(){
    const n=this.navigation,touch=this.controls.touchLayout;
    this.panel.setVisible(n.open);
    this.selection.setY(57+n.selected*16).setVisible(!n.confirming);
    this.heading.setText(n.confirming?'VOLVER AL MAPA?':'PAUSA').setFontSize(n.confirming?9:12);
    const labels={continue:'SEGUIR',skip:'OMITIR TUTORIAL',map:'VOLVER AL MAPA'};
    this.rows.forEach((row,i)=>row.setText(`${i===n.selected?'> ':'  '}${labels[n.choices[i]]}`).setVisible(!n.confirming));
    this.note.setText('SE DESCARTA\nESTE INTENTO.\nLO GUARDADO SIGUE.').setVisible(n.confirming).setLineSpacing(4);
    this.footer.setText(n.confirming?(touch?'A: SI   B: ATRAS':'K: SI   J: ATRAS'):(touch?'ARRIBA/ABAJO: ELEGIR\nA: OK   START: SEGUIR':'W/S: ELEGIR  K: OK\nESPACIO: SEGUIR')).setLineSpacing(3);
    const state={open:n.open,confirming:n.confirming,choice:n.choices[n.selected],choices:n.choices};
    const key=JSON.stringify(state);if(key!==this.last){this.last=key;this.scene.game.events.emit(PAUSE_MENU,state);}
  }
}
