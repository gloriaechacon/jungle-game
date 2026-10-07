import Phaser from 'phaser';
import { ATLAS, FONTS } from './art-spec';
import { Campaign } from './campaign';
import { InputController, type InputSnapshot } from './input';
import { PlayerController } from './player';
import { ensureFonts } from './gameplay-view';
import { GAME_SOUND } from './audio-events';
import { celebrationFrame } from './celebration';
import { BONUS_BOTTOM, BONUS_READ_MS, BONUS_TIME_MS, BONUS_SPAWN_X, BONUS_STATE, BONUS_X, FinalBonusRound } from './final-bonus';
import { BONUS_BARREL, BONUS_NO_PRIZE, bonusTurn, bonusOopsFrame } from './final-bonus-presentation';
import { PauseMenu } from './pause-menu';

const NEUTRAL:InputSnapshot={up:false,down:false,left:false,right:false,a:false,b:false,start:false};

export class FinalBonusScene extends Phaser.Scene {
  private controls!:InputController;
  private player!:PlayerController;
  private round!:FinalBonusRound;
  private elapsed=0;
  private paused=false;
  private pauseMenu!:PauseMenu;
  private frozen=false;
  private leaving=false;
  private lastHead=96;
  private resultAt?:number;
  private awarded=0;
  private distance=0;
  private lastX:number=BONUS_SPAWN_X;
  private phase:'instructions'|'release'|'playing'='instructions';
  private released=false;
  private intro!:Phaser.GameObjects.Container;
  private introPrompt!:Phaser.GameObjects.BitmapText;
  private facing=1;
  private actor!:Phaser.GameObjects.Image;
  private slots:Phaser.GameObjects.Image[]=[];
  private marks:Phaser.GameObjects.BitmapText[]=[];
  private instruction!:Phaser.GameObjects.BitmapText;
  private instructionPanel!:Phaser.GameObjects.Rectangle;
  private pauseText!:Phaser.GameObjects.BitmapText;
  private bumpAt=[-Infinity,-Infinity,-Infinity];
  constructor(){super('FinalBonusScene');}
  create() {
    const campaign=this.registry.get('campaign') as Campaign;
    if(!campaign?.summary().finished){this.scene.start('WorldMapScene');return;}
    // Defensive entry guard: a completed losing round counts just like a win.
    if(!campaign.canPlayFinalBonus()){this.scene.start('DemoEndingScene');return;}
    this.controls=this.registry.get('controls');
    this.round=new FinalBonusRound();this.elapsed=0;this.paused=false;this.frozen=false;this.leaving=false;
    this.resultAt=undefined;this.awarded=0;this.distance=0;this.lastX=BONUS_SPAWN_X;this.lastHead=96;this.facing=1;
    this.phase='instructions';this.released=false;
    this.slots=[];this.marks=[];this.bumpAt=[-Infinity,-Infinity,-Infinity];
    ensureFonts(this);
    this.game.events.emit('berto:scene-changed',this.scene.key);
    this.game.events.emit('berto:campaign',{...campaign.summary(),selected:campaign.selected,screen:'bonus'});
    this.guide();
    this.add.tileSprite(0,0,160,144,'bg-far').setOrigin(0);
    this.add.tileSprite(0,32,160,112,'bg-near').setOrigin(0);
    this.add.rectangle(80,72,160,144,0x082821,.5);
    this.add.tileSprite(0,124,160,12,'ground-top').setOrigin(0);
    this.add.tileSprite(0,136,160,8,'ground-fill').setOrigin(0);
    this.add.rectangle(80,13,156,24,0x10251f,.95);
    this.add.bitmapText(80,4,FONTS.gold,'NIVEL EXTRA',14).setLetterSpacing(-1).setOrigin(.5,0);
    const ropes=this.add.graphics();
    BONUS_X.forEach((x,i)=>{
      ropes.lineStyle(3,0x263022).lineBetween(x,26,x,48);
      ropes.lineStyle(1,0xbfaa72).lineBetween(x-1,26,x-1,48);
      this.slots.push(this.add.image(x,BONUS_BOTTOM-BONUS_BARREL.height/2,ATLAS,`bonus-slot-${this.round.symbol(i)}`));
      this.marks.push(this.add.bitmapText(x,32,FONTS.gold,'',8).setOrigin(.5,0));
    });
    this.instructionPanel=this.add.rectangle(80,137,160,14,0x10251f,.95).setDepth(7);
    this.instruction=this.add.bitmapText(80,132,FONTS.plain,'SALTA BAJO CADA BARRIL',8).setLetterSpacing(-1).setOrigin(.5,0).setDepth(8);
    this.introPrompt=this.add.bitmapText(80,97,FONTS.gold,'',8).setLetterSpacing(-1).setOrigin(.5,0);
    this.intro=this.add.container(0,0,[
      this.add.rectangle(80,69,154,80,0x10251f,.98).setStrokeStyle(1,0xb8bd88),
      this.add.bitmapText(80,35,FONTS.gold,'3 IGUALES',12).setLetterSpacing(-1).setOrigin(.5,0),
      ...[52,80,108].map(x=>this.add.image(x,60,ATLAS,'banana-0')),
      this.add.bitmapText(80,75,FONTS.plain,'PREMIO: 20 BANANAS',8).setLetterSpacing(-1).setOrigin(.5,0),
      this.introPrompt,
    ]).setDepth(9);
    this.pauseText=this.add.bitmapText(80,112,FONTS.gold,'PAUSA',12).setOrigin(.5,0).setDepth(10).setVisible(false);
    const world=this.physics.world;
    world.setBounds(0,0,160,144);world.setBoundsCollision(true,true,true,true);world.resume();
    const floor=this.add.rectangle(80,134,160,20,0,0);
    this.physics.add.existing(floor,true);
    this.player=new PlayerController(this,NEUTRAL,{x:BONUS_SPAWN_X,y:116});
    this.player.shape.setVisible(false);
    this.physics.add.collider(this.player.shape,floor);
    this.actor=this.add.image(BONUS_SPAWN_X,124,ATLAS,'dk-idle-0').setOrigin(.5,1).setDepth(4);
    const toMap=()=>{if(this.leaving)return;this.leaving=true;this.controls.clear();this.scene.start('WorldMapScene');};
    this.pauseMenu=new PauseMenu(this,this.controls,toMap);
    let previous=this.controls.snapshot();
    const off=this.controls.subscribe(state=>{
      const confirm=state.a&&!previous.a;previous=state;
      const consumed=this.pauseMenu.input(state);this.paused=this.pauseMenu.open;
      this.freeze();
      if(consumed){this.player.syncInput(state);return;}
      if(this.phase!=='playing'){
        const neutral=!Object.values(state).some(Boolean);
        if(neutral)this.released=true;
        if(!this.frozen&&this.phase==='instructions'&&this.released&&confirm&&this.elapsed>=BONUS_READ_MS){
          // The confirming press is consumed. All fingers/keys must come up
          // before movement or a NEW jump can reach the minigame.
          this.phase='release';this.guide();
        } else if(!this.frozen&&this.phase==='release'&&neutral){
          this.phase='playing';this.guide();
        }
        this.player.syncInput(NEUTRAL);return;
      }
      if(this.frozen||this.resultAt!==undefined)this.player.syncInput(state);
      else this.player.input(state,this.elapsed);
    });
    const step=(seconds:number)=>this.step(seconds);
    world.on(Phaser.Physics.Arcade.Events.WORLD_STEP,step);
    this.game.events.on('berto:to-map',toMap);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      off();world.off(Phaser.Physics.Arcade.Events.WORLD_STEP,step);this.game.events.off('berto:to-map',toMap);
      this.game.events.emit(BONUS_STATE,null);
    });
    this.freeze();this.paint();
  }
  private guide(){
    // The compact card and play-time strip are enough; no duplicate paragraph.
    this.game.events.emit('berto:guide','');
  }
  private freeze() {
    const value=this.paused||!this.controls.isActive;
    if(value!==this.frozen){
      this.frozen=value;
      if(value)this.physics.world.pause();else this.physics.world.resume();
      this.player.syncInput(this.phase==='playing'&&this.resultAt===undefined?this.controls.snapshot():NEUTRAL);
    }
  }
  private step(seconds:number) {
    this.freeze();
    if(this.frozen||this.leaving)return;
    const dt=seconds*1000;this.elapsed+=dt;
    if(this.phase!=='playing'){
      this.player.syncInput(NEUTRAL);this.player.update(this.elapsed,dt);
      this.lastHead=this.player.feet-28;return;
    }
    this.round.advance(dt);
    const head=this.player.feet-28;
    const hit=this.round.contact(this.player.centerX,this.lastHead,head,this.player.body.velocity.y);
    if(hit!==-1){
      this.bumpAt[hit]=this.elapsed;
      // A small downward deflection separates the head from the selected barrel.
      this.player.body.setVelocityY(35);
      if(this.round.hit(hit)){
        this.game.events.emit(GAME_SOUND,'checkpoint');
      }
    }
    if(this.resultAt===undefined&&this.round.completedAt!==undefined){
      this.resultAt=this.elapsed;
      const campaign=this.registry.get('campaign') as Campaign;
      if(this.round.expired)campaign.expireFinalBonus();
      else this.awarded=campaign.awardFinalBonus(this.round.locked);
      this.registry.set('finalBonusResult',{symbols:[...this.round.locked],stars:this.round.stars,reward:this.round.reward,awarded:this.awarded,expired:this.round.expired});
      this.game.events.emit('berto:campaign',{...campaign.summary(),selected:campaign.selected,screen:'bonus'});
    }
    this.lastHead=head;
    if(this.resultAt!==undefined)this.player.syncInput({...this.controls.snapshot(),left:false,right:false,a:false,b:false});
    const jump=this.player.lastJumpAt;
    this.player.update(this.elapsed,dt);
    if(this.player.lastJumpAt!==jump)this.game.events.emit(GAME_SOUND,'jump');
    this.distance+=Math.abs(this.player.centerX-this.lastX);this.lastX=this.player.centerX;
    if(Math.abs(this.player.body.velocity.x)>1)this.facing=Math.sign(this.player.body.velocity.x);
    if(this.resultAt!==undefined&&this.elapsed-this.resultAt>3000&&this.player.grounded){
      this.leaving=true;
      this.controls.clear();this.scene.start('DemoEndingScene');
    }
  }
  private paint() {
    this.intro.setVisible(this.phase!=='playing');
    this.introPrompt.setText(this.phase==='release'?'SUELTA LOS BOTONES':
      this.elapsed<BONUS_READ_MS?'':`${this.controls.touchLayout?'A':'K'} PARA EMPEZAR`);
    if(this.resultAt===undefined)this.instruction.setText(this.phase==='playing'?`${this.controls.touchLayout?'A':'K'}: SALTA    ${Math.ceil(this.round.remainingMs/1000)} S`:`TIENES ${BONUS_TIME_MS/1000} SEGUNDOS`);
    this.slots.forEach((sprite,i)=>{
      const turn=bonusTurn(this.round.elapsed,i,this.phase!=='playing'||this.round.completedAt!==undefined||this.round.locked[i]!==null);
      sprite.setFrame(`bonus-slot-${this.round.symbol(i)}-turn-${turn}`)
        .setY(BONUS_BOTTOM-BONUS_BARREL.height/2-(this.elapsed-this.bumpAt[i]<130?3:0));
      this.marks[i].setText(this.round.locked[i]===null?'':'OK');
    });
    const speed=Math.abs(this.player.body.velocity.x);
    const frame=!this.player.grounded?(this.player.body.velocity.y<0?'dk-jump-up':'dk-jump-down'):
      speed>2?`dk-${speed>75?'run':'walk'}-${Math.floor(this.distance/4.7)%6}`:'dk-idle-0';
    this.actor.setPosition(Math.round(this.player.centerX),Math.round(this.player.feet)).setFrame(frame).setFlipX(this.facing<0);
    if(this.resultAt!==undefined){
      this.instruction.setText(this.round.reward?(this.awarded?'+20 BANANAS!':'PREMIO YA CONSEGUIDO'):this.round.expired?'TIEMPO AGOTADO\nBUEN INTENTO!':BONUS_NO_PRIZE);
      if(!this.round.reward){
        this.instructionPanel.setPosition(80,134).setSize(160,20);
        this.instruction.setY(124).setLineSpacing(-1);
        if(this.player.grounded)this.actor.setFrame(`bonus-oops-${bonusOopsFrame(this.elapsed-this.resultAt)}`)
          .setFlipX(false).setX(Phaser.Math.Clamp(this.player.centerX,24,136));
      }
      if(this.player.grounded&&this.round.reward)this.actor.setFrame(`demo-cheer-${celebrationFrame(this.elapsed-this.resultAt+1040)}`).setFlipX(false);
    }
    this.pauseText.setVisible(this.frozen&&!this.pauseMenu.open);
    const bounds=(object:Phaser.GameObjects.Image|Phaser.GameObjects.BitmapText)=>{
      const {x,y,width,height}=object.getBounds();return {x,y,width,height};
    };
    this.game.events.emit(BONUS_STATE,{paused:this.frozen,phase:this.phase,elapsed:this.elapsed,reelElapsed:this.round.elapsed,remainingMs:this.round.remainingMs,expired:this.round.expired,x:this.player.centerX,head:this.player.body.top,
      presentation:{slots:this.slots.map(s=>({frame:s.frame.name,...bounds(s)})),message:this.instruction.text,messageBounds:bounds(this.instruction),actorBounds:bounds(this.actor)},
      grounded:this.player.grounded,locked:[...this.round.locked],symbols:BONUS_X.map((_,i)=>this.round.symbol(i)),stars:this.round.stars,reward:this.round.reward,awarded:this.awarded,frame:this.actor.frame.name,bottom:BONUS_BOTTOM});
  }
  update(){if(!this.player||this.leaving)return;this.freeze();this.paint();}
}
