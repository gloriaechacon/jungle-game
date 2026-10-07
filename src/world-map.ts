import Phaser from 'phaser';
import { Campaign, STAGES } from './campaign';
import { InputController } from './input';
import { ATLAS,FONTS } from './art-spec';
import { ensureFonts } from './gameplay-view';

type Point = { x: number; y: number };
const NODES: Point[] = [{x:27,y:95},{x:91,y:73},{x:128,y:37}];
const PATHS = [
  [NODES[0],{x:104,y:110},{x:22,y:51},NODES[1]],
  [NODES[1],{x:154,y:95},{x:78,y:23},NODES[2]],
];
function pointOn(segment: number,t: number): Point {
  const [a,b,c,d]=PATHS[segment],u=1-t;
  return {x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,
    y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y};
}

export class WorldMapScene extends Phaser.Scene {
  private tick?: (delta:number)=>void;
  constructor() { super('WorldMapScene'); }
  update(_time:number,delta:number) { this.tick?.(delta); }
  create() {
    const campaign=this.registry.get('campaign') as Campaign;
    const controls=this.registry.get('controls') as InputController;
    this.game.events.emit('berto:scene-changed','WorldMapScene');
    const g=this.add.graphics(), hud=this.add.graphics().setDepth(300);
    ensureFonts(this);
    const mapTitle=this.add.bitmapText(5,118,FONTS.gold,'').setLetterSpacing(-1).setDepth(301);
    const mapHelp=this.add.bitmapText(5,132,FONTS.ink,'',9).setLetterSpacing(-1).setDepth(301);
    const mapBanner=this.add.bitmapText(7,3,FONTS.plain,'MAPA DE LA AVENTURA',9).setLetterSpacing(-1).setDepth(301);
    const selection=this.add.ellipse(0,0,20,9).setStrokeStyle(1,0xffe6a3).setDepth(1);
    const shadow=this.add.ellipse(0,0,12,4,0x101b14,0.65);
    const marker=this.add.image(0,0,ATLAS,'dk-idle-0').setOrigin(0.5,1);
    // Close oblique view with raised shelves, shaded cliff faces and layered forest.
    g.fillStyle(0x102a25).fillRect(0,0,160,144);
    for(let i=0;i<55;i++) {
      const x=(i*43+7)%170-5,y=(i*29+13)%108;
      g.fillStyle(i%3===0?0x254b34:0x1b3a2d).fillEllipse(x,y,19,12);
      g.fillStyle(0x35553a).fillEllipse(x-3,y-3,10,5);
    }
    const shelf=(x:number,y:number,w:number,h:number)=>{
      g.fillStyle(0x081b1c).fillEllipse(x+5,y+11,w+9,h+6);
      const top=[{x:x-w/2,y:y-3},{x:x-w*.28,y:y-h/2},{x:x+w*.22,y:y-h*.5},
        {x:x+w/2,y:y-h*.1},{x:x+w*.37,y:y+h*.28},{x:x-w*.14,y:y+h*.43},{x:x-w*.47,y:y+h*.17}];
      // Extrude the front edge instead of stacking flat oval platforms.
      for(let i=3;i<7;i++){
        const a=top[i],b=top[(i+1)%7];
        g.fillStyle(i%2?0x62503b:0x483e32).fillPoints([a,b,{x:b.x+1,y:b.y+10},{x:a.x+1,y:a.y+10}],true);
        g.lineStyle(1,0x2c3027).lineBetween(b.x,b.y+1,b.x+1,b.y+9);
        g.lineStyle(1,0x8e7551).lineBetween(a.x+1,a.y+5,b.x-1,b.y+5);
      }
      g.fillStyle(0x74834a).fillPoints(top,true);
      g.lineStyle(2,0xb4b26d).strokePoints(top,true);
      g.fillStyle(0x91a25d).fillEllipse(x-7,y-6,w*.5,h*.35);
      for(let i=0;i<12;i++)g.fillStyle(i%3?0x5e733d:0xc3bd7c).fillRect(x-w*.3+(i*17)%(w*.6),y-5+(i*3)%10,2,1);
    };
    shelf(37,89,77,36); shelf(90,70,73,35); shelf(124,32,66,39);
    g.fillStyle(0x313d38).fillTriangle(103,34,119,8,151,34);
    g.fillStyle(0xa29678).fillTriangle(103,34,119,8,122,34);
    g.fillStyle(0x606650).fillTriangle(119,8,144,19,151,34);
    // A recessed mouth, stone arch and projecting threshold make the cave legible.
    g.fillStyle(0x968c6c).fillEllipse(130,28,25,26);
    g.fillStyle(0x474739).fillEllipse(132,29,20,23);
    g.fillStyle(0x080e13).fillEllipse(130,30,13,19);
    g.fillStyle(0x111c22).fillTriangle(127,37,131,22,136,37);
    g.lineStyle(2,0xc0ad84).lineBetween(121,22,124,18).lineBetween(124,18,133,17);
    g.fillStyle(0xd3b98a).fillEllipse(130,38,22,5);
    // Water drops down the cliff in a different plane from the traversable path.
    g.fillStyle(0x183f46).fillEllipse(146,104,24,11);
    g.fillStyle(0x44847e).fillTriangle(142,84,150,87,147,106);
    g.lineStyle(2,0xb5d7be).lineBetween(143,85,145,103);
    g.lineStyle(1,0x7bb9ad).strokeEllipse(146,105,15,4);
    // Path strokes and walking animation share identical curves.
    for(let segment=0;segment<2;segment++) {
      for(const [width,color,dy] of [[10,0x172921,3],[8,0x8c6d44,1],[6,0xd6b77d,0],[2,0xefd29a,-1]]) {
        g.lineStyle(width,campaign.unlocked(segment+1)?color:width===6?0xa39673:color,width===2&&!campaign.unlocked(segment+1)?.45:1).beginPath();
        for(let i=0;i<=64;i++) { const p=pointOn(segment,i/64); if(i===0)g.moveTo(p.x,p.y+dy);else g.lineTo(p.x,p.y+dy); }
        g.strokePath();
      }
      for(let i=3;i<61;i+=5) {const p=pointOn(segment,i/64);g.fillStyle(0xb89566).fillRect(Math.round(p.x),Math.round(p.y),1,1);}
    }
    const tree=(x:number,y:number,s:number)=>{
      const t=this.add.graphics().setDepth(y);
      t.fillStyle(0x0c211d).fillEllipse(x+3,y+1,19*s,6*s);
      t.fillStyle(0x443d28).fillTriangle(x-2*s,y,x+2*s,y,x+4*s,y-24*s);
      t.lineStyle(2*s,0x9b8750).lineBetween(x-1*s,y-1,x+2*s,y-22*s);
      for(const [dx,dy,w,h,c] of [[0,-23,30,13,0x0b3025],[-8,-25,20,9,0x315d36],[8,-22,22,11,0x214c2e],[0,-28,22,8,0x608348],[-3,-30,13,4,0x90a45c]])
        t.fillStyle(c).fillEllipse(x+dx*s,y+dy*s,w*s,h*s);
      for(const dx of [-12,-6,7,13])t.fillStyle(0x1d442d).fillTriangle(x+dx*s,y-24*s,x+(dx+3)*s,y-17*s,x+(dx+5)*s,y-25*s);
    };
    [[8,45,.65],[35,36,.65],[63,35,.55],[83,26,.45],[157,52,.6],[3,77,.6],[62,57,.6],[160,90,.65],[-4,117,.8],[158,120,.75]].forEach(([x,y,s])=>tree(x,y,s));
    this.add.image(21,87,ATLAS,'treehouse').setOrigin(.5,1).setScale(.45).setDepth(2);
    // A rope bridge identifies the second destination at a glance.
    g.lineStyle(1,0x392d1e).lineBetween(78,67,100,66).lineBetween(78,59,100,58);
    for(let x=79;x<101;x+=3)g.lineStyle(1,0xc8a570).lineBetween(x,61,x,67);
    g.lineStyle(2,0x72543a).lineBetween(78,56,78,70).lineBetween(101,55,101,68);
    NODES.forEach((p,i)=>{
      g.fillStyle(0x293526).fillEllipse(p.x,p.y,14,7);
      g.fillStyle(campaign.completed(STAGES[i])?0xafd075:campaign.unlocked(i)?0xf6d18a:0x6b7164).fillEllipse(p.x,p.y-1,10,5);
      const badge=this.add.graphics().setDepth(240),bx=p.x+12,by=p.y+6;
      badge.fillStyle(0x142c26).fillRoundedRect(bx-5,by-4,11,12,2);
      this.add.bitmapText(bx-3,by-4,FONTS.gold,String(i+1),10).setDepth(241);
      if(!campaign.unlocked(i)){
        // Raised brass lock: dark extrusion, broad shackle and a bright bevel.
        const ly=by-20;
        badge.lineStyle(4,0x172a23).strokeRoundedRect(bx-5,ly-9,10,12,5);
        badge.lineStyle(2,0xffe4a1).strokeRoundedRect(bx-5,ly-9,10,12,5);
        badge.fillStyle(0x172a23).fillRoundedRect(bx-8,ly,19,16,3);
        badge.fillStyle(0x80542c).fillRect(bx-6,ly+2,16,12);
        badge.fillStyle(0xd7a24b).fillRect(bx-7,ly,16,12);
        badge.fillStyle(0xffdf8b).fillRect(bx-7,ly,16,2).fillRect(bx-7,ly,2,12);
        badge.fillStyle(0x403120).fillCircle(bx+1,ly+5,2).fillRect(bx,ly+6,2,4);
      }
    });
    let leaving=false, pendingEnter=false, elapsed=0,from=campaign.mapArrivalFrom ?? campaign.selected,to=campaign.selected;
    let moving=from!==to,blockedFor=0,blockedLevel=0;
    campaign.mapArrivalFrom=undefined;
    const names=['JUNGLE HIJINXS','ROPEY RAMPAGE','REPTILE RUMBLE'];
    const drawHud=()=>{
      const state=campaign.summary(); hud.clear();
      hud.fillStyle(0x10251f,0.92).fillRect(0,0,160,14).fillRect(0,115,160,29);
      mapBanner.setText(state.finished?'3/3 COMPLETADOS':'MAPA DE LA AVENTURA');
      mapTitle.setText(`${campaign.selected+1} / ${names[campaign.selected]}`).setFontSize(9);
      // Once Jungle is complete the player already knows how to enter a stage.
      const instruction=blockedFor>0?`COMPLETA EL NIVEL ${blockedLevel}`:moving?'CAMINANDO...':campaign.completed('jungle')?'':controls.touchLayout?'PRESIONA A: ENTRAR':'PRESIONA K: ENTRAR';
      if(blockedFor>0)mapBanner.setText('NIVEL BLOQUEADO');
      if(instruction)hud.fillStyle(0xe5ede7,1).fillRect(2,130,156,13);
      mapHelp.setText(instruction);
      selection.setPosition(NODES[campaign.selected].x,NODES[campaign.selected].y);
      this.game.events.emit('berto:campaign',{...state,selected:campaign.selected,screen:'map',moving,mapInstruction:instruction});
    };
    const place=(p:Point)=>{
      marker.setPosition(Math.round(p.x),Math.round(p.y)).setScale(.48+p.y*.0023).setDepth(p.y+.2);
      shadow.setPosition(p.x,p.y).setDepth(p.y+.1);
    };
    const enter=()=>{
      leaving=true;
      if(campaign.selected===0&&!this.registry.get('practiceDone')) this.registry.set('practiceStep',0);
      this.registry.set('ropey',campaign.selected===1);this.registry.set('reptile',campaign.selected===2);
      this.game.events.emit('berto:campaign',{...campaign.summary(),selected:campaign.selected,screen:'level'});
      this.scene.start(this.registry.get('cinematic')?'StageIntroScene':'JungleGreyboxScene');
    };
    place(NODES[from]);drawHud();
    let previous=controls.snapshot();
    const unsubscribe=controls.subscribe(state=>{
      const next=state.right&&!previous.right?1:state.left&&!previous.left?-1:0;
      const confirm=state.a&&!previous.a;previous=state;
      if(!controls.isActive||leaving)return;
      if(!moving&&next&&campaign.unlocked(campaign.selected+next)) {
        blockedFor=0;from=campaign.selected;to=from+next;campaign.selected=to;elapsed=0;moving=true;drawHud();
      } else if(!moving&&next&&campaign.selected+next>0&&campaign.selected+next<STAGES.length){
        blockedLevel=campaign.selected+next;blockedFor=1800;drawHud();
      }
      if(confirm) {if(moving)pendingEnter=true;else enter();}
    });
    this.tick=delta=>{
      if(!controls.isActive||leaving)return;
      if(blockedFor>0){blockedFor=Math.max(0,blockedFor-Math.min(delta,50));if(!blockedFor)drawHud();}
      if(!moving)return;
      elapsed+=Math.min(delta,50);
      const t=Math.min(1,elapsed/1100),segment=Math.min(from,to),u=from<to?t:1-t;
      const p=pointOn(segment,u),ahead=pointOn(segment,Math.max(0,Math.min(1,u+(from<to?.01:-.01))));
      marker.setFrame(`dk-walk-${Math.floor(elapsed/100)%6}`).setFlipX(ahead.x<p.x);place(p);
      if(t===1){moving=false;marker.setFrame('dk-idle-0');drawHud();if(pendingEnter)enter();}
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{unsubscribe();this.tick=undefined;});
  }
}
