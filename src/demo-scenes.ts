import Phaser from 'phaser';
import { COLLECTIBLE_WORD } from './collectibles';
import { TITLE_EDITION } from './branding';
import { ATLAS, FONTS } from './art-spec';
import { Campaign } from './campaign';
import { InputController } from './input';
import { ensureFonts } from './gameplay-view';
import { controlText } from './control-labels';
import { CELEBRATION_MS, celebrationFrame } from './celebration';
import { PauseMenu } from './pause-menu';

export type EndingChoice='map'|'replay';
export const ENDING_MENU='berto:ending-menu',ENDING_ACTION='berto:ending-action';

// Presentation only. These scenes never create a player or advance level rules.
// Timelines freeze with input focus and the photographic power-on sequence.
abstract class DemoScene extends Phaser.Scene {
  protected clock=0;
  protected controls!:InputController;
  protected campaign!:Campaign;
  protected paint:(time:number)=>void=()=>{};
  protected confirm:()=>void=()=>{};
  protected pauseMenu?:PauseMenu;
  protected setup(screen:string,guide:string) {
    this.clock=0;this.paint=()=>{};this.confirm=()=>{};this.pauseMenu=undefined;
    this.controls=this.registry.get('controls');this.campaign=this.registry.get('campaign');
    ensureFonts(this);
    this.game.events.emit('berto:scene-changed',this.scene.key);
    this.game.events.emit('berto:campaign',{...this.campaign.summary(),selected:this.campaign.selected,screen});
    this.game.events.emit('berto:guide',guide);
    let previous=this.controls.snapshot();
    const off=this.controls.subscribe(state=>{
      const pressed=state.a&&!previous.a;previous=state;
      if(this.pauseMenu?.input(state))return;
      if(pressed&&this.controls.isActive&&(this.scene.key==='TitleScene'||this.clock>300))this.confirm();
    });
    const toMap=()=>{
      if(this.scene.key==='TitleScene')return;
      if(this.registry.get('practiceStep')!==undefined){
        this.registry.remove('practiceStep');
      }
      this.scene.start('WorldMapScene');
    };
    this.game.events.on('berto:to-map',toMap);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      off();this.game.events.off('berto:to-map',toMap);this.paint=()=>{};this.confirm=()=>{};
    });
  }
  update(_time:number,delta:number) {
    if(!this.controls?.isActive||this.pauseMenu?.open)return;
    this.clock+=Math.min(delta,50);this.paint(this.clock);
  }
  protected text(y:number,text:string,size=10,gold=false,ink=false) {
    return this.add.bitmapText(80,y,ink?FONTS.ink:gold?FONTS.gold:FONTS.plain,controlText(text,this.controls.touchLayout),size)
      .setLetterSpacing(-1).setOrigin(.5,0).setDepth(20);
  }
  protected jungle() {
    this.add.tileSprite(0,0,160,144,'bg-far').setOrigin(0);
    this.add.tileSprite(0,36,160,108,'bg-near').setOrigin(0);
    const g=this.add.graphics();
    g.fillStyle(0x081e20,.42).fillRect(0,0,160,144);
    // Lit clearing: top plane, projecting rim, dark cliff and contact shadow.
    g.fillStyle(0x0b1716).fillEllipse(83,133,139,26);
    g.fillStyle(0x49382b).fillEllipse(80,128,136,24);
    g.fillStyle(0x8b6440).fillEllipse(80,122,136,23);
    g.fillStyle(0xd5b478).fillEllipse(77,117,132,22);
    g.fillStyle(0xe9cb91).fillEllipse(75,113,117,13);
    for(let i=0;i<18;i++)g.fillStyle(i%2?0x665337:0xf1d8a3).fillRect(21+(i*29)%118,114+(i*7)%9,2,1);
    // Side foliage frames the clearing without obscuring the character or text.
    for(const x of [-4,164]) {
      g.fillStyle(0x123a2c).fillEllipse(x,99,37,61);
      g.fillStyle(0x336543).fillEllipse(x-3,80,31,23);
      g.fillStyle(0x769151).fillEllipse(x-7,74,19,7);
    }
    return g;
  }
}

export class TitleScene extends DemoScene {
  constructor(){super('TitleScene');}
  create() {
    this.setup('title','Pulsa la tecla K para comenzar.');
    this.jungle();
    this.add.rectangle(80,TITLE_EDITION?35:31,148,TITLE_EDITION?59:51,0x10251f,.92);
    this.text(8,'GOING',18,true);this.text(29,'BANANAS',18,true);
    if(TITLE_EDITION)this.text(51,TITLE_EDITION.toUpperCase(),10);
    this.add.ellipse(80,115,32,6,0x302c20,.55);
    const dk=this.add.image(80,116,ATLAS,'dk-idle-0').setOrigin(.5,1).setScale(1.5);
    const button=this.add.rectangle(80,130,154,20,0xe5ede7).setStrokeStyle(1,0x7e9892);
    this.text(125,this.controls.touchLayout?'PRESIONA A: COMENZAR':'PRESIONA K: COMENZAR',8,false,true);
    const leaves=this.add.graphics();
    this.paint=t=>{
      dk.setFrame(`dk-idle-${Math.floor(t/520)%2}`);
      button.setStrokeStyle(1,Math.floor(t/800)%2?0xccb677:0xffe3a1);
      leaves.clear();
      for(let i=0;i<5;i++){
        const y=56+((t/140+i*13)%58),x=9+i*33+Math.sin(t/1400+i)*3;
        leaves.fillStyle(i%2?0xa6b969:0x679552,.65).fillEllipse(x,y,3,1);
      }
    };
    this.confirm=()=>this.scene.start('WorldMapScene');
  }
}

export class StageIntroScene extends DemoScene {
  constructor(){super('StageIntroScene');}
  create() {
    const practice=this.registry.get('practiceStep')!==undefined,index=this.registry.get('campaign').selected as number;
    const label=practice?'TUTORIAL':`NIVEL ${index+1}`;
    const names=['JUNGLE HIJINXS','ROPEY RAMPAGE','REPTILE RUMBLE'];
    this.setup('intro','');
    if(index===2){this.add.tileSprite(0,0,160,144,'cave-far').setOrigin(0);this.add.tileSprite(0,0,160,144,'cave-near').setOrigin(0);}
    else {this.add.tileSprite(0,0,160,144,'bg-far').setOrigin(0);this.add.tileSprite(0,36,160,108,'bg-near').setOrigin(0);}
    if(index===1)this.add.rectangle(80,72,160,144,0x081731,.4);
    this.add.tileSprite(0,122,160,12,index===2?'cave-top':'ground-top').setOrigin(0);
    this.add.tileSprite(0,134,160,10,index===2?'cave-fill':'ground-fill').setOrigin(0);
    const home=!practice&&index===0;
    if(home)this.add.image(36,124,ATLAS,'treehouse').setOrigin(.5,1);
    this.add.rectangle(80,24,154,43,0x091d19,.96).setDepth(10);
    this.text(5,label,16,true);this.text(27,practice?'APRENDE JUGANDO':names[index],9);
    const dk=this.add.image(home?24:80,home?88:124,ATLAS,'dk-idle-0').setOrigin(.5,1).setDepth(2);
    const shadow=this.add.ellipse(home?40:80,124,17,3,0x211a16,.4).setDepth(1);
    this.text(133,'K: COMENZAR',8);
    this.add.rectangle(80,73,154,42,0xe5ede7,1).setStrokeStyle(1,0x7e9892).setDepth(10);
    this.text(58,this.controls.touchLayout?'START: PAUSA / MAPA':'ESPACIO: PAUSA / MAPA',8,false,true);
    this.text(72,practice?'Y OMITIR TUTORIAL':'PAUSA / VOLVER AL MAPA',8,false,true);
    let leaving=false;
    const next=()=>{
      if(leaving)return;leaving=true;
      this.game.events.emit('berto:campaign',{...this.campaign.summary(),selected:index,screen:'level'});
      this.scene.start('JungleGreyboxScene');
    };
    this.confirm=next;
    this.pauseMenu=new PauseMenu(this,this.controls,()=>{
      this.registry.remove('practiceStep');this.scene.start('WorldMapScene');
    },practice?()=>{
      this.registry.remove('practiceStep');this.registry.set('practiceDone',true);
      this.scene.restart();
    }:undefined);
    this.paint=t=>{
      if(home){
        const u=Math.max(0,Math.min(1,(t-700)/1050));
        dk.setPosition(Math.round(24+16*u),Math.round(88+36*u-32*Math.sin(Math.PI*u)));
        dk.setFrame(u===0?'dk-idle-0':u===1?'dk-idle-0':u<.4?'dk-jump-up':'dk-jump-down');
        shadow.setScale(.6+.4*u);
      }
      if(!practice&&t>2600)next();
    };
  }
}

export class DemoEndingScene extends DemoScene {
  constructor(){super('DemoEndingScene');}
  create() {
    // A replay can only celebrate a genuinely finished campaign.
    const campaign=this.registry.get('campaign') as Campaign;
    if(!campaign.summary().finished){this.scene.start('WorldMapScene');return;}
    this.setup('ending','¡Demo completada! Un momento para celebrar…');
    const summary=campaign.summary();this.jungle();
    const complete=summary.letters===COLLECTIBLE_WORD;
    const headingPanel=this.add.rectangle(80,19,152,36,0x0c271f,.95);
    const heading=this.text(4,'GANASTE!',18,true);
    const result=this.registry.get('finalBonusResult') as {reward:number;awarded:number}|undefined;
    const outcome=this.text(27,result?.reward?(result.awarded?'+20 BANANAS!':'PREMIO YA CONSEGUIDO'):'3 NIVELES COMPLETADOS',8);
    const shadow=this.add.ellipse(80,118,36,6,0x211b19,.6);
    const dk=this.add.image(80,117,ATLAS,'demo-cheer-0').setOrigin(.5,1);
    // Optional letters are never silently awarded by the cinematic.
    const letters=[...COLLECTIBLE_WORD].map((letter,i)=>this.add.image(46+i*17,48,ATLAS,`letter-${letter}`).setAlpha(.2));
    const letterCount=this.text(60,complete?'5/5 LETRAS!':`${[...summary.letters].filter(c=>c!=='-').length}/5 LETRAS ENCONTRADAS`,8,true);
    const totalCaption=this.text(130,`TOTAL: ${summary.bananas} BANANAS`,8);
    const totals=this.add.container(0,0,[
      this.add.rectangle(80,64,152,45,0x0c271f,.95),
      this.text(45,`BANANAS: ${summary.levelBananas}`,8).setX(10).setOrigin(0),
      this.text(57,`EXTRA: +${summary.bonusBananas}`,8,true).setX(10).setOrigin(0),
      this.text(71,`TOTAL: ${summary.bananas}`,10,true).setX(10).setOrigin(0),
      this.add.image(107,76,ATLAS,'banana-0'),
    ]).setDepth(10).setVisible(false);
    const menu=this.add.container(0,0).setDepth(30).setVisible(false);
    const rows=(['map','replay'] as const).map((action,i)=>{
      const y=90+i*26;
      const box=this.add.rectangle(80,y+12,146,24,0x102b25).setStrokeStyle(1,0x607c63);
      const label=this.text(y+3,action==='map'?'VOLVER AL MAPA':'VOLVER A JUGAR',9,true);
      const note=this.text(y+14,action==='map'?'CONSERVAR PARTIDA':'EMPEZAR DE CERO',8);
      const marker=this.text(y+6,'>',10,true).setX(14);
      menu.add([box,label,note,marker]);return {action,box,marker};
    });
    let menuReady=false,choice:EndingChoice='map',leaving=false;
    const updateMenu=()=>{
      this.game.events.emit(ENDING_MENU,{ready:menuReady,choice});
      rows.forEach(row=>{row.box.setStrokeStyle(1,row.action===choice?0xffdb86:0x607c63);row.marker.setVisible(row.action===choice);});
      this.game.events.emit('berto:guide',this.controls.touchLayout?
        'Cruceta: elegir · A: confirmar. También puedes tocar una opción.':
        'A/D o W/S: elegir · K: confirmar. También puedes hacer clic en una opción.');
    };
    const choose=(action:EndingChoice)=>{
      if(!menuReady||leaving||(action!=='map'&&action!=='replay'))return;
      leaving=true;this.controls.clear();
      if(action==='map'){this.scene.start('WorldMapScene');return;}
      // Only a deliberate new-game choice resets progress. Audio preferences and
      // the approved console presentation are not part of the campaign save.
      this.registry.set('campaign',new Campaign());
      this.registry.remove('finalBonusResult');
      this.registry.remove('practiceDone');this.registry.remove('practiceStep');
      this.registry.set('ropey',false);this.registry.set('reptile',false);
      this.scene.start('TitleScene');
    };
    let previous=this.controls.snapshot();
    const off=this.controls.subscribe(state=>{
      const back=(state.left&&!previous.left)||(state.up&&!previous.up);
      const next=(state.right&&!previous.right)||(state.down&&!previous.down);previous=state;
      if(!menuReady||leaving||!this.controls.isActive||(!back&&!next))return;
      choice=back?'map':'replay';updateMenu();
    });
    this.game.events.on(ENDING_ACTION,choose);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      off();this.game.events.off(ENDING_ACTION,choose);this.game.events.emit(ENDING_MENU,{ready:false,choice:'map'});
    });
    const sparkles=this.add.graphics();
    this.paint=t=>{
      if(!menuReady&&t>=CELEBRATION_MS){
        menuReady=true;menu.setVisible(true);totals.setVisible(true);outcome.setVisible(false);totalCaption.setVisible(false);
        headingPanel.setPosition(80,12).setSize(152,24);heading.setText('RESULTADOS').setFontSize(12).setY(2);
        letterCount.setY(33);shadow.setVisible(false);dk.setScale(.65).setY(85).setDepth(15);
        updateMenu();
      }
      dk.setFrame(`demo-cheer-${menuReady?3:celebrationFrame(t)}`);
      dk.setX(menuReady?132:80+(t>400&&t<CELEBRATION_MS?Math.round(Math.sin(t/190)):0));
      letters.forEach((sprite,i)=>{
        const earned=summary.letters[i]!=='-',appear=t>850+i*220;
        sprite.setAlpha(earned&&appear?1:.2).setY(menuReady?25:48-(earned&&appear&&t<1100+i*220?2:0));
      });
      sparkles.clear();
      if(t>750&&!menuReady)for(let i=0;i<12;i++){
        const x=18+(i*29)%128,y=69+((t/80+i*19)%49);
        sparkles.fillStyle(i%3?0xf2cc76:0x91c29a,.8).fillRect(x,y,1,2);
      }
    };
    this.confirm=()=>choose(choice);
  }
}
