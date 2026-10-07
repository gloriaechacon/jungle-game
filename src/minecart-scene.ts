import Phaser from 'phaser';
import {ATLAS,FONTS} from './art-spec';
import {Campaign,type Collected} from './campaign';
import {InputController} from './input';
import {ensureFonts} from './gameplay-view';
import {GAME_SOUND} from './audio-events';
import {CART,CART_STATE,MinecartRun,railHeight,railAt} from './minecart';
import {PauseMenu} from './pause-menu';

/** Continuation of Reptile, not a fourth map level. Commit only at the far cave. */
export class MinecartScene extends Phaser.Scene {
  private run!:MinecartRun;private controls!:InputController;private campaign!:Campaign;
  private base:Collected[]=[];private paused=false;private leaving=false;private committed=false;private accumulator=0;
  private pendingJump=false;
  private pauseMenu!:PauseMenu;
  private cart!:Phaser.GameObjects.Image;private actor!:Phaser.GameObjects.Image;private cannon!:Phaser.GameObjects.Image;
  private far!:Phaser.GameObjects.TileSprite;private near!:Phaser.GameObjects.TileSprite;
  private label!:Phaser.GameObjects.BitmapText;private box!:Phaser.GameObjects.Rectangle;private counter!:Phaser.GameObjects.BitmapText;
  private pauseText!:Phaser.GameObjects.BitmapText;private pickups:Phaser.GameObjects.Image[]=[];private guideKey='';
  constructor(){super('MinecartScene');}
  create(data:{pickups?:Collected[];launched?:boolean}={}){
    this.campaign=this.registry.get('campaign');
    if(!this.campaign?.unlocked(2)||!data.pickups){this.scene.start('WorldMapScene');return;}
    this.base=data.pickups.map(p=>({...p}));this.controls=this.registry.get('controls');this.run=new MinecartRun();
    // The visible barrel entry/shot already happened on the existing cave screen.
    if(data.launched)this.run.phaseMs=1700;
    this.campaign.restore('reptile',this.run.pickups);this.run.sync(this.controls.snapshot().a);
    this.paused=false;this.leaving=false;this.committed=false;this.accumulator=0;this.pendingJump=false;this.guideKey='';
    ensureFonts(this);this.game.events.emit('berto:scene-changed',this.scene.key);this.progress();
    this.cameras.main.setBounds(0,-64,CART.width,288).setRoundPixels(true);
    this.far=this.add.tileSprite(0,0,160,144,'cave-far').setOrigin(0).setScrollFactor(0).setTint(0x8b969e);
    this.near=this.add.tileSprite(0,0,160,144,ATLAS,'mine-wall').setOrigin(0).setScrollFactor(0);
    for(let x=110;x<CART.width;x+=192)this.add.image(x,12,ATLAS,'mine-beam').setOrigin(0).setDepth(1).setAlpha(.65);
    const g=this.add.graphics().setDepth(2);
    // Dock/cannon stands on the cliff; the cart is visible on a separate rail.
    g.fillStyle(0x3b2a25).fillRect(0,108,98,120).fillStyle(0xbd936d).fillRect(0,108,98,4);
    for(let x=224;x<CART.width;x+=4){
      const y=railAt(x);if(y===undefined||railAt(x+3)===undefined)continue;
      if(x%16===0){g.lineStyle(3,0x463f37).lineBetween(x,y+3,x-4,y+13);g.lineStyle(1,0x987c53).lineBetween(x,y+3,x-4,y+13);}
      if(x%128===0){g.fillStyle(0x34292d).fillRect(x-6,y+12,12,160);g.fillStyle(0x61514a).fillRect(x-6,y+12,2,160);g.lineStyle(3,0x4d3a30).lineBetween(x,y+65,x+43,y+14);}
      const next=railHeight(x+4);
      g.lineStyle(3,0x26323b).lineBetween(x,y,x+4,next).lineBetween(x,y+7,x+4,next+7);
      g.lineStyle(1,0xc5c9b0).lineBetween(x,y-1,x+4,next-1).lineBetween(x,y+6,x+4,next+6);
    }
    this.add.image(CART.exit,107,ATLAS,'mine-entrance').setOrigin(.5,1).setDepth(3);
    this.cannon=this.add.image(67,110,ATLAS,'mine-cannon').setOrigin(.5,1).setDepth(4);
    this.actor=this.add.image(24,108,ATLAS,'dk-idle-0').setOrigin(.5,1).setDepth(5);
    this.cart=this.add.image(CART.start,112,ATLAS,'minecart-0').setOrigin(.5,1).setDepth(6);
    this.pickups=this.run.pickups.map(p=>this.add.image(p.x,p.y,ATLAS,'banana-0').setDepth(5));
    this.box=this.add.rectangle(80,30,156,43,0x10251f,.96).setScrollFactor(0).setDepth(10);
    this.label=this.add.bitmapText(80,11,FONTS.plain,'',8).setLetterSpacing(-1).setLineSpacing(1).setOrigin(.5,0).setScrollFactor(0).setDepth(11);
    this.counter=this.add.bitmapText(5,132,FONTS.gold,'',8).setLetterSpacing(-1).setScrollFactor(0).setDepth(11);
    this.pauseText=this.add.bitmapText(80,69,FONTS.gold,'PAUSA',12).setOrigin(.5,0).setScrollFactor(0).setDepth(20).setVisible(false);
    const toMap=()=>{if(!this.leaving){this.leaving=true;this.controls.clear();this.scene.start('WorldMapScene');}};
    this.pauseMenu=new PauseMenu(this,this.controls,toMap);
    let previous=this.controls.snapshot();
    const off=this.controls.subscribe(state=>{
      const confirm=state.a&&!previous.a;previous=state;
      const consumed=this.pauseMenu.input(state);this.paused=this.pauseMenu.open;
      if(consumed){this.run.sync(state.a);this.accumulator=0;this.pendingJump=false;return;}
      if(this.paused||!this.controls.isActive){this.run.sync(state.a);this.accumulator=0;this.pendingJump=false;}
      else if(confirm)this.pendingJump=true;
      if(confirm&&this.controls.isActive&&!this.paused&&this.committed&&!this.leaving){
        this.leaving=true;this.controls.clear();this.scene.start(this.campaign.completionScene());
      }
    });
    this.game.events.on('berto:to-map',toMap);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{off();this.game.events.off('berto:to-map',toMap);this.game.events.emit(CART_STATE,null);});
    this.paint();
  }
  private progress(){this.game.events.emit('berto:campaign',{...this.campaign.summary('reptile',[...this.base,...this.run.pickups]),selected:2,screen:'minecart'});}
  update(_time:number,delta:number){
    if(!this.run||this.leaving)return;
    const held=this.controls.snapshot().a;
    if(this.paused||!this.controls.isActive){this.run.sync(held);this.accumulator=0;this.pendingJump=false;this.paint();return;}
    this.accumulator+=Math.min(delta,150);
    while(this.accumulator>=CART.step){
      const prev=this.run.phase,launchTime=this.run.phaseMs;this.run.step(CART.step,held||this.pendingJump);this.pendingJump=false;this.accumulator-=CART.step;
      if(prev==='launch'&&launchTime<650&&this.run.phaseMs>=650)this.game.events.emit(GAME_SOUND,'throw');
      if(this.run.jumped)this.game.events.emit(GAME_SOUND,'jump');
      if(this.run.collectedNow){this.game.events.emit(GAME_SOUND,'banana');this.progress();}
      if(prev!==this.run.phase){
        if(this.run.phase==='falling')this.game.events.emit(GAME_SOUND,'fall');
        if(this.run.phase==='riding')this.game.events.emit(GAME_SOUND,prev==='retry'?'respawn':'checkpoint');
      }
      if(this.run.phase==='complete'&&!this.committed){
        this.campaign.complete('reptile',[...this.base,...this.run.pickups]);this.committed=true;this.progress();this.game.events.emit(GAME_SOUND,'victory');
      }
    }
    this.paint();
  }
  private paint(){
    const r=this.run,key=this.controls.touchLayout?'A':'K',frozen=this.paused||!this.controls.isActive;
    let x=r.x,feet=r.feet,actorX=x,actorFeet=feet-22,scale=.78,frame='dk-idle-0',actorVisible=true;
    if(r.phase==='launch'){
      const t=r.phaseMs;
      if(t<400){const u=t/400;actorX=24+43*u;actorFeet=108-18*u-26*Math.sin(Math.PI*u);scale=1;frame='dk-jump-up';}
      else if(t<650){actorX=67;actorFeet=90;actorVisible=false;}
      else if(t<1050){const u=(t-650)/400;actorX=67+130*u;actorFeet=75-125*u;scale=1;frame='dk-jump-up';}
      else if(t<1700){actorVisible=false;}
      else {const u=Math.min(1,(t-1700)/800);actorX=CART.start;actorFeet=-30+120*u*u;frame='dk-jump-down';}
    }
    if(r.phase==='retry'){x=CART.start;feet=112;actorX=x;actorFeet=feet-22;}
    const pan=Math.max(0,Math.min(1,(r.phaseMs-1250)/450));
    const scroll=r.phase==='launch'?(CART.start-70)*pan*pan*(3-2*pan):Math.max(0,Math.min(CART.width-160,x-70));
    // Let the cart travel vertically within the LCD, following only when its
    // head or the lower rail would leave the frame on the more pronounced hills.
    const cameraY=r.phase==='riding'?Math.max(-64,Math.min(40,feet<74?feet-74:Math.max(0,feet-126))):0;
    this.cameras.main.setScroll(Math.round(scroll),Math.round(cameraY));this.far.tilePositionX=scroll*.08;this.near.tilePositionX=scroll*.24;
    this.actor.setPosition(Math.round(actorX),Math.round(actorFeet)).setFrame(frame).setScale(scale).setVisible(actorVisible&&(r.phase!=='falling'||r.phaseMs<320));
    this.cannon.setScale(r.phase==='launch'&&r.phaseMs>650&&r.phaseMs<780?.90:1);
    const slope=(railHeight(x+4)-railHeight(x-4))/8;
    const tilt=r.phase==='riding'&&r.grounded?Math.atan(slope):0;
    this.cart.setPosition(Math.round(x),Math.round(feet)).setFrame(`minecart-${Math.floor(r.x/5)%2}`).setRotation(tilt).setVisible(r.phase!=='falling'||r.phaseMs<320);
    this.actor.setRotation(tilt);
    if(tilt)this.actor.setPosition(Math.round(x+Math.sin(tilt)*22),Math.round(feet-Math.cos(tilt)*22));
    this.pickups.forEach((sprite,i)=>sprite.setVisible(!r.pickups[i].collected).setFrame(`banana-${Math.floor(r.elapsed/160)%3}`));
    let text='',guide='';
    if(r.phase==='launch'){guide='';}
    else if(r.phase==='retry'){text=`OTRA OPORTUNIDAD\nPULSA ${key}: REINTENTAR`;guide=`Vuelve a pulsar ${key} para reintentar desde el carrito. Conservas las bananas de este intento y no repites la cueva.`;}
    else if(r.phase==='complete'){
      const destination=this.campaign.completionScene();
      text=`MINA COMPLETADA!\nPULSA ${key}: ${destination==='WorldMapScene'?'VOLVER AL MAPA':destination==='FinalBonusScene'?'NIVEL EXTRA':'VER RESUMEN'}`;
      guide=`Nivel 3 completado · Presiona ${key} para ${destination==='WorldMapScene'?'volver al mapa':destination==='FinalBonusScene'?'jugar el nivel extra de barriles':'ver el resumen'}.`;
    }
    else if(r.phase==='riding'&&x>340&&x<630){guide='SALTO: primeras bananas';}
    if(guide!==this.guideKey){this.guideKey=guide;this.game.events.emit('berto:guide',guide);}
    // Keep the airborne rider and bananas visible; the external guide remains.
    if(r.phase==='riding'&&!r.grounded)text='';
    const panelHeight=text.split('\n').length*11+6;
    this.label.setText(text).setY(6);this.box.setPosition(80,4+panelHeight/2).setSize(156,panelHeight).setVisible(!!text);this.label.setVisible(!!text);
    this.counter.setText(`MINA  ${r.pickups.filter(p=>p.collected).length}/${r.pickups.length}`);
    this.pauseText.setVisible(frozen&&!this.pauseMenu.open);
    this.game.events.emit(CART_STATE,{phase:r.phase,elapsed:r.elapsed,phaseMs:r.phaseMs,x:r.x,feet:r.feet,vy:r.vy,grounded:r.grounded,paused:frozen,
      deaths:r.deaths,jumps:r.jumps,bananas:r.pickups.filter(p=>p.collected).length,committed:this.committed,guide:text,cameraX:scroll,cameraY,railY:railHeight(x),cartTilt:tilt,
      cartOriginY:this.cart.originY,cartBottom:this.cart.y+this.cart.displayHeight*(1-this.cart.originY)});
  }
}
