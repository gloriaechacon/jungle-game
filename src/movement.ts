import Phaser from 'phaser';
import { InputController } from './input';
import { PlayerController } from './player';
import { MOVEMENT } from './tuning';
import { pixelText } from './pixels';
import { JUNGLE as BASE_JUNGLE, JUNGLE_PHASE6, type LevelData, type Rect } from './jungle-layout';
import { ACTION, LevelRules, type PlayerFrame } from './gameplay';
import { CANOPY_Y, JungleView, type ViewState } from './gameplay-view';
import { ROPEY } from './ropey-layout';
import { RopeController, ropeX } from './ropes';
import { RopeView } from './rope-view';
import { REPTILE } from './reptile-layout';
import { TireState, tireSpeed, tireUnder } from './tires';
import { readableStep, readableTarget, horizontalStart, horizontalStep, cameraBoundsTop } from './camera';
import { PlatformDrop } from './platforms';
import { Campaign, STAGES, type Stage } from './campaign';
import { LESSONS, practiceLevel, lessonDone, lessonNeedsRetry, lessonRetryInstruction, PRACTICE_RETRY_MS, barrelLessonPhase, barrelLessonInstruction, type BarrelLessonPhase } from './tutorial';
import { DK, FONTS } from './art-spec';
import { GAME_SOUND, SoundObserver, type SoundFrame } from './audio-events';
import { controlText, TOUCH_LESSONS } from './control-labels';
import { nearTire, TIRE_GUIDE, VINE_GRAB_GUIDE, VINE_CLIMB_GUIDE } from './level-hints';
import { PauseMenu } from './pause-menu';

export const RESTART_LAB = 'berto:restart-lab';
/** Adventure only: leave the current stage and go back to the map (attempt not saved). */
export const TO_MAP = 'berto:to-map';
export const TELEMETRY = 'berto:movement';
export const VISUAL_OPTIONS = 'berto:visual-options';
export interface MovementTelemetry {
  x: number; y: number; vx: number; vy: number;
  grounded: boolean; paused: boolean; cameraX: number; resets: number;
  finished?: boolean;
  minecartLaunch?: number;
  cameraY?: number;
  rope?: string;
  ropes?: {id:string;x:number;y:number}[];
  /** Phase 8: tire bounces since the last restart/return and the last bounce speed. */
  tires?: { bounces: number; lastSpeed: number };
  /** Active simulation time (ms): advances only in fixed physics steps. */
  simTime: number;
  /** Physics steps executed in the last rendered frame. */
  steps: number;
  practice?: {step:number;total:number;instruction:string;complete:boolean;retrying:boolean;barrelPhase?:BarrelLessonPhase};
  guide?: {text:string;x:number;y:number;width:number;height:number;visible:boolean};
  gameplay?: ReturnType<LevelRules['snapshot']>;
  view?: ReturnType<JungleView['describe']>;
}

// One scene class serves three routes: the B-01 lab (/?lab=1), the Phase 3
// greybox (/?greybox=1) and Jungle with systems and art (/).
//
// Simulation timing (Phase 5 fix): player movement, level rules and Arcade
// physics advance together, once per fixed Arcade step (WORLD_STEP, 60 Hz).
// Arcade accumulates render-frame time and runs as many steps as needed, so at
// 24 fps DK, enemies, barrels and timers all run at real-time speed. While
// paused/unfocused/completed the world is paused and accumulates nothing.
export class MovementLabScene extends Phaser.Scene {
  private player!: PlayerController;
  private controls!: InputController;
  private pausedByUser = false;
  private previousStart = false;
  private resets = 0;
  private overlay!: Phaser.GameObjects.Graphics;
  private silhouette!: Phaser.GameObjects.Graphics;
  private showSilhouette = true;
  private showBody = true;
  private finished = false;
  private rules?: LevelRules;
  private view?: JungleView;
  private gameTime = 0;
  private previousFeet = 0;
  private frozen = false;
  private stepsThisFrame = 0;
  private hurt?: ViewState['hurt'];
  private level: LevelData = BASE_JUNGLE;
  private ropes = new RopeController();
  private ropeView?: RopeView;
  private tires = new TireState();
  private platformDrop = new PlatformDrop();
  private cameraY = 0;
  private horizontalCamera = horizontalStart(160,40);
  private practiceStep?:number;
  private practiceSuccess=0;
  private practiceRetryAt?:number;
  private climbed=false;
  private practiceDropped=false;
  private sounds=new SoundObserver();
  private guide?:Phaser.GameObjects.BitmapText;
  private guideBox?:Phaser.GameObjects.Rectangle;
  private pauseMenu?:PauseMenu;

  constructor(private jungle = false) { super(jungle ? 'JungleGreyboxScene' : 'MovementLabScene'); }

  private campaign?: Campaign;
  private stage: Stage = 'jungle';
  private previousConfirm = false;
  private previousMapKey = false;
  /** Pause menu: first J asks "IR AL MAPA?", a second J confirms; Space cancels. */
  private mapConfirm = false;
  private committed = false;
  private minecartExit = false;
  private minecartLaunchMs = 0;
  private newRules() {
    const rules = new LevelRules(this.level, { gravity: MOVEMENT.gravity, playerWidth: MOVEMENT.width, playerHeight: MOVEMENT.height });
    if(this.practiceStep===undefined) this.campaign?.restore(this.stage, rules.pickups);
    return rules;
  }

  create() {
    this.campaign = this.registry.get('campaign');
    this.stage = STAGES[this.campaign?.selected ?? 0];
    this.committed = false;
    this.minecartLaunchMs=0;
    this.time.paused = false;
    this.physics.world.resume();
    this.tweens.resumeAll();
    this.level = this.registry.get('reptile') ? REPTILE : this.registry.get('ropey') ? ROPEY : this.registry.get('greybox') || this.registry.get('phase5') ? BASE_JUNGLE : JUNGLE_PHASE6;
    this.practiceStep=this.registry.get('practiceStep');
    this.practiceSuccess=0;this.practiceRetryAt=undefined;this.climbed=false;this.practiceDropped=false;
    if(this.practiceStep!==undefined) this.level=practiceLevel(this.practiceStep);
    this.minecartExit=!!this.campaign&&!!this.registry.get('cinematic')&&this.stage==='reptile'&&this.practiceStep===undefined;
    const JUNGLE = this.level;
    this.pausedByUser = false;
    this.previousStart = false;
    this.resets = 0;
    this.finished = false;
    this.gameTime = 0;
    this.frozen = false;
    this.hurt = undefined;
    const initialVisuals = this.registry.get('visualOptions') as { silhouette: boolean; body: boolean } | undefined;
    this.showSilhouette = initialVisuals?.silhouette ?? true;
    this.showBody = initialVisuals?.body ?? true;
    const withArt = this.jungle && !this.registry.get('greybox');
    this.rules = withArt ? this.newRules() : undefined;
    this.game.events.emit('berto:scene-changed', this.scene.key);
    this.controls = this.registry.get('controls') as InputController;
    // A held Start used to skip the stage card is not a new pause press.
    this.previousStart = this.controls.snapshot().start;
    this.previousConfirm = this.controls.snapshot().a;
    this.previousMapKey = this.controls.snapshot().b;
    this.ropes.reset(this.controls.snapshot());
    this.platformDrop.reset(this.controls.snapshot().down);
    this.tires.reset();
    this.cameras.main.setBackgroundColor('#18272d');
    this.physics.world.setBounds(0, -80, this.jungle ? JUNGLE.width : 1024, this.jungle ? JUNGLE.fallY + 160 : 320);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.cameras.main.setBounds(0, 0, this.jungle ? JUNGLE.width : 1024, this.jungle ? JUNGLE.height : 144);
    if(this.level.cameraTop!==undefined) {
      const top=cameraBoundsTop(this.level);
      this.cameras.main.setBounds(0,top,JUNGLE.width,JUNGLE.height-top);
    }
    const solids = this.physics.add.staticGroup();
    const block = (x: number, y: number, width: number, height: number, visible = true) => {
      const shape = this.add.rectangle(x, y, width, height, 0x738580).setOrigin(0).setVisible(visible);
      solids.add(shape);
      (shape.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      if (visible) this.add.rectangle(x, y, width, 2, 0xb3c5b2).setOrigin(0);
    };
    if (this.jungle) {
      if (!withArt) {
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x26373c, 1);
        for (let x = 0; x < JUNGLE.width; x += 16) grid.lineBetween(x, 0, x, JUNGLE.height);
        for (let y = 16; y < JUNGLE.height; y += 16) grid.lineBetween(0, y, JUNGLE.width, y);
      }
      // Collision blocks are invisible on the art route; tiles draw the ground.
      JUNGLE.solids.forEach(([x,y,w,h]) => block(x,y,w,h,!withArt));
      for(const rect of JUNGLE.platforms ?? []) {
        const [x,y,w,h]=rect;
        const shape=this.add.rectangle(x,y,w,h,0x9b8557).setOrigin(0).setVisible(!withArt);
        shape.setData('platform',rect);
        solids.add(shape);
        const body=shape.body as Phaser.Physics.Arcade.StaticBody;body.updateFromGameObject();
        body.checkCollision.up=true;body.checkCollision.down=false;body.checkCollision.left=false;body.checkCollision.right=false;
      }
      if (!withArt) {
        // Phase 3 greybox: schematic backdrop, labels and exit frame (unchanged).
        const backdrop = this.add.graphics().setDepth(-1);
        for (let x = 8; x < JUNGLE.width; x += 120) {
          backdrop.fillStyle(0x263e3c).fillRect(x, 24, 12, 100);
          backdrop.fillStyle(0x304e46).fillRect(x-12, 16, 40, 26);
        }
        backdrop.fillStyle(0x685b47).fillRect(14, 78, 52, 40);
        backdrop.fillStyle(0x243832).fillRect(32, 92, 16, 26);
        backdrop.fillStyle(0x927659).fillRect(8, 74, 64, 6);
        const labels = this.add.graphics();
        JUNGLE.markers.forEach(m => pixelText(labels,m.label,m.x,m.y,0xb3c69b));
        labels.lineStyle(1,0xebc66a).strokeRect(JUNGLE.exit.x,86,28,38);
      }
    } else {
      const grid = this.add.graphics();
      grid.lineStyle(1, 0x26373c, 1);
      for (let x = 0; x < 1024; x += 16) grid.lineBetween(x, 0, x, 144);
      for (let y = 16; y < 144; y += 16) grid.lineBetween(0, y, 1024, y);
      block(0, 124, 704, 20);
      block(736, 124, 288, 20);
      block(192, 102, 40, 8);
      block(256, 82, 36, 8);
      block(320, 66, 48, 8);
      block(420, 108, 40, 16);
      block(468, 94, 36, 30);
      block(526, 108, 44, 16);
      const labels = this.add.graphics();
      pixelText(labels, '01 / CAMINAR', 16, 44, 0x94b579);
      pixelText(labels, 'J / CORRER', 16, 55, 0x94b579);
      pixelText(labels, 'K / SALTAR', 103, 88, 0xebc66a);
      pixelText(labels, '02 / ALTURA', 200, 28, 0x94b579);
      pixelText(labels, '03 / ESCALONES', 426, 42, 0x94b579);
      pixelText(labels, '04 / HUECO', 657, 52, 0x94b579);
      pixelText(labels, '32 PX', 711, 97, 0xebc66a);
      pixelText(labels, 'FIN DE PRUEBA', 915, 62, 0xebc66a);
      pixelText(labels, 'VUELVE O REINICIA', 915, 74, 0x94b579);
      this.add.rectangle(992, 100, 2, 48, 0xebc66a);
    }
    this.player = new PlayerController(this, this.controls.snapshot(), this.jungle ? JUNGLE.spawn : undefined);
    // K selected the level on the map: consume that held edge, not a jump.
    this.player.syncInput(this.controls.snapshot());
    this.physics.add.collider(this.player.shape, solids,undefined,(_player,terrain)=>
      !this.platformDrop.ignores((terrain as Phaser.GameObjects.Rectangle).getData('platform') as Rect|undefined));
    // Reptile: horizontal follow only; the vertical scroll is the readable camera below.
    this.cameras.main.startFollow(this.player.shape, true, this.jungle ? 0 : 1, this.level.camera === 'readable' ? 0 : 1);
    if (this.jungle) this.cameras.main.setFollowOffset(0, 44);
    this.cameras.main.setDeadzone(36, this.jungle ? 48 : 144);
    this.cameras.main.roundPixels = true;
    this.overlay = this.add.graphics().setScrollFactor(0).setDepth(10);
    this.silhouette = this.add.graphics().setDepth(2);
    // Vines: twisted strand, leaves, tuft at the canopy edge (y≈CANOPY_Y+40), curled tip.
    this.ropeView = this.level.ropes?.length ? new RopeView(this, this.level.ropes, this.practiceStep===undefined?CANOPY_Y+40:70) : undefined;
    if (!withArt && (JUNGLE.ropes || JUNGLE.tires)) {
      const hints=this.add.graphics().setDepth(3);
      JUNGLE.markers.forEach(m=>pixelText(hints,m.label,m.x,m.y,0xe8c978));
    }
    if (this.rules) {
      this.player.shape.setVisible(false);
      this.view = new JungleView(this, JUNGLE, this.rules, this.player, this.tires);
      this.guideBox=this.add.rectangle(3,17,154,36,0xe5ede7,1).setStrokeStyle(1,0x7e9892).setOrigin(0).setScrollFactor(0).setDepth(24);
      this.guide=this.add.bitmapText(7,20,FONTS.ink,'').setLetterSpacing(-1).setScrollFactor(0).setDepth(25);
      if(this.practiceStep!==undefined){
        this.add.rectangle(0,0,160,15,0x10251f).setOrigin(0).setScrollFactor(0).setDepth(24);
        this.add.bitmapText(5,2,FONTS.gold,`TUTORIAL ${this.practiceStep+1}/${LESSONS.length}`,10).setLetterSpacing(-1).setScrollFactor(0).setDepth(25);
      }
    } else this.view = undefined;
    this.previousFeet = this.player.feet;
    this.snapCamera();
    this.sounds.reset(this.soundFrame());
    const visualOptions = (options: { silhouette: boolean; body: boolean }) => {
      this.showSilhouette = options.silhouette; this.showBody = options.body;
    };
    this.game.events.on(VISUAL_OPTIONS, visualOptions);
    const toMap = () => { if (this.campaign && this.scene.isActive()) {
      if(this.practiceStep!==undefined){
        this.registry.remove('practiceStep');
        // The workbench retains its historical Esc shortcut; public play uses
        // an explicit skip option, so visiting the map never skips by accident.
        if(!this.registry.get('cinematic'))this.registry.set('practiceDone',true);
      }
      this.scene.start('WorldMapScene');
    } };
    this.pauseMenu=this.campaign&&this.registry.get('cinematic')?new PauseMenu(this,this.controls,toMap,
      this.practiceStep===undefined?undefined:()=>{
        this.registry.remove('practiceStep');this.registry.set('practiceDone',true);
        this.scene.start('StageIntroScene');
      }):undefined;
    const unsubscribe = this.controls.subscribe(state => {
      const confirm = state.a && !this.previousConfirm;
      this.previousConfirm = state.a;
      const mapKey = state.b && !this.previousMapKey;
      this.previousMapKey = state.b;
      if(this.pauseMenu){
        const consumed=this.pauseMenu.input(state);this.pausedByUser=this.pauseMenu.open;
        if(consumed){
          this.previousStart=state.start;
          this.freeze(this.pausedByUser||!this.controls.isActive||this.finished);
          this.platformDrop.sync(state.down);this.ropes.sync(state);this.player.syncInput(state);this.rules?.syncInput(state);
          return;
        }
      }
      // Pause menu (adventure): J asks to leave the stage for the map, a second J
      // confirms. Only while paused by the player, so running with J never triggers it.
      if (!this.pauseMenu && this.pausedByUser && !this.finished && this.campaign && mapKey && this.controls.isActive) {
        if (this.mapConfirm) { toMap(); return; }
        this.mapConfirm = true;
      }
      if (this.finished && this.committed && this.campaign && !this.minecartExit && confirm && this.controls.isActive) {
        this.scene.start(this.registry.get('cinematic')?this.campaign.completionScene():'WorldMapScene'); return;
      }
      // Completion is final until an explicit restart: Start cannot toggle pause.
      if (!this.pauseMenu && (!this.finished||this.minecartExit) && state.start && !this.previousStart) { this.pausedByUser = !this.pausedByUser; this.mapConfirm = false; }
      this.previousStart = state.start;
      const paused = this.pausedByUser || !this.controls.isActive || this.finished;
      this.freeze(paused);
      this.platformDrop.input(state.down,!paused&&!this.rules?.dying&&!this.ropes.attached);
      if (paused || this.rules?.dying) { this.ropes.sync(state); this.player.syncInput(state); this.rules?.syncInput(state); }
      else if (this.ropes.attached) { this.ropes.input(state); this.player.syncInput(state); this.rules?.syncInput(state); }
      else {
        this.ropes.input(state);
        this.rules?.input(state,this.frame());
        this.player.input(state, this.gameTime);
      }
    });
    const restart = () => {
      this.practiceSuccess=0;this.practiceRetryAt=undefined;this.climbed=false;this.practiceDropped=false;
      this.pausedByUser = false;
      this.finished = false;
      this.committed = false;
      this.minecartLaunchMs=0;
      this.hurt = undefined;
      this.ropes.reset(this.controls.snapshot());
      this.platformDrop.reset(this.controls.snapshot().down);
      this.tires.reset();
      this.player.body.setAllowGravity(true);
      this.player.body.moves = true;
      if (this.rules) { this.rules = this.newRules(); this.view?.bind(this.rules); }
      this.player.setSpawn(this.jungle ? JUNGLE.spawn : {x:24,y:108});
      this.player.reset(this.controls.snapshot());
      this.previousFeet = this.player.feet;
      this.snapCamera();
      this.freeze(!this.controls.isActive);
      this.resets++;
      this.sounds.reset(this.soundFrame());
    };
    this.game.events.on(RESTART_LAB, restart);
    // Leaving mid-stage keeps what was saved from completed stages; this attempt's
    // pickups are discarded, exactly like restarting the stage (Campaign.restore).
    this.game.events.on(TO_MAP, toMap);
    // Arcade shuts its plugin down before our handler and clears physics.world.
    // Capture this scene's world rather than looking it up during shutdown.
    const world = this.physics.world;
    world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, this.simStep, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe(); this.game.events.off(RESTART_LAB, restart); this.game.events.off(TO_MAP, toMap);
      this.game.events.off(VISUAL_OPTIONS, visualOptions);
      world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, this.simStep, this);
    });
  }

  /** Tire rises lift the Arcade speed cap; put B-01's max fall back once DK stops rising (or on any return). */
  private restoreFallCap(force = false) {
    const body = this.player?.body;
    if (body && body.maxVelocity.y !== MOVEMENT.maxFallSpeed && (force || body.velocity.y >= 0)) body.maxVelocity.y = MOVEMENT.maxFallSpeed;
  }

  /** Readable camera (opt-in per level): jump straight to the target, e.g. after a return. */
  private snapCamera() {
    this.restoreFallCap(true);
    if(this.jungle){
      this.horizontalCamera=horizontalStart(this.level.width,this.player.centerX);
      this.cameras.main.scrollX=Math.round(this.horizontalCamera.scroll);
    }
    if (this.level.camera !== 'readable' || !this.jungle) return;
    this.cameraY = readableTarget(this.level, this.player.centerX, this.player.feet);
    this.cameras.main.scrollY = Math.round(this.cameraY);
  }

  /** Player state read from the physics body (valid inside a step). */
  private frame(): PlayerFrame {
    return { x: this.player.centerX, y: this.player.centerY, vy: this.player.body.velocity.y,
      grounded: this.player.grounded, previousFeet: this.previousFeet };
  }

  private freeze(value: boolean) {
    if (this.frozen === value) return;
    this.frozen = value;
    this.time.paused = value;
    if (value) { this.physics.world.pause(); this.tweens.pauseAll(); }
    else { this.physics.world.resume(); this.tweens.resumeAll(); }
    // Scene update stays alive for the pause UI; simulation time does not advance.
    this.player.syncInput(this.controls.snapshot());
    this.platformDrop.sync(this.controls.snapshot().down);
    // On resume the first key may itself have restored focus. Do not consume
    // that fresh edge before the input subscriber can queue it.
    if(value) this.ropes.sync(this.controls.snapshot());
    this.rules?.syncInput(this.controls.snapshot());
  }

  /** One fixed simulation step, called by Arcade after integrating and colliding. */
  private simStep(stepSeconds: number) {
    this.advanceStep(stepSeconds);
    // Observe after every fixed step, including its early returns for damage and
    // respawn. At low render FPS, separate gameplay events are not lost.
    for(const sound of this.sounds.read(this.soundFrame()))this.game.events.emit(GAME_SOUND,sound);
  }

  private soundFrame():SoundFrame {
    const r=this.rules;
    return {jumpAt:this.player.lastJumpAt,rope:this.ropes.attached?.id,vy:this.player.body.velocity.y,tires:this.tires.count,
      deaths:r?.deaths??this.resets,dying:r?.dying??false,finished:this.finished&&!this.minecartExit,
      rollAt:r?.rollStartedAt??-Infinity,liftAt:r?.lastPickupAt??-Infinity,throwAt:r?.lastThrowAt??-Infinity,
      checkpoint:r?.checkpointIndex??-1,bananas:r?.bananas??0,letters:r?.letters??'',
      stomp:r?.kills.stomp??0,defeat:(r?.kills.roll??0)+(r?.kills.barrel??0),
      broken:r?.barrels.filter(b=>b.state==='spent').length??0,lesson:this.practiceSuccess};
  }

  private advanceStep(stepSeconds: number) {
    this.stepsThisFrame++;
    // Arcade may run remaining catch-up steps in a frame where we just froze
    // (completion). Rules and player input stop immediately in that case.
    if (this.frozen) return;
    const dt = stepSeconds * 1000;
    this.gameTime += dt;
    this.restoreFallCap();
    const result = this.rules?.step(dt, this.frame());
    const input = this.controls.snapshot();
    // Phase 8: DK standing on a tire after this step's collision bounces off it.
    const tireHit = this.level.tires ? tireUnder(this.level.tires, { x: this.player.centerX, feet: this.player.feet, grounded: this.player.grounded }, MOVEMENT.width / 2) : -1;
    if (result?.respawn && this.rules) {
      this.ropes.reset(input); this.tires.reset(); this.player.body.setAllowGravity(true);
      this.rules.respawn();
      this.platformDrop.reset(input.down);
      this.player.body.moves = true;
      this.player.setSpawn(this.rules.spawn);
      this.player.reset(input);
      this.rules.syncInput(input);
      this.rules.faceInput(input);
      this.hurt = undefined;
      this.previousFeet = this.player.feet;
      this.resets++;
      this.snapCamera();
      return;
    }
    if (this.rules?.dying) {
      this.platformDrop.reset(input.down);
      this.ropes.reset(input); this.player.body.setAllowGravity(true);
      if (result?.hurt) this.hurt = { x: this.player.centerX, feet: this.player.feet, at: this.rules.now, facing: this.rules.facing };
      this.player.body.setVelocity(0, 0);
      this.player.body.moves = false;
      this.player.syncInput(input);
      this.rules.syncInput(input);
      return;
    }
    this.rules?.faceInput(input);
    if(this.platformDrop.step(this.level,{x:this.player.centerX,feet:this.player.feet,height:MOVEMENT.height,
      halfWidth:MOVEMENT.width/2,grounded:this.player.grounded},!this.ropes.attached&&!this.rules?.rolling&&!this.rules?.finished)) {
      this.player.dropThrough();
      this.practiceDropped=true;
      this.player.syncInput(input);
    }
    let rope = this.ropes.step(this.gameTime,dt,{x:this.player.centerX,y:this.player.centerY,grounded:this.player.grounded},input,this.level.ropes ?? [],!this.rules?.carried && !this.rules?.rolling && !this.rules?.finished);
    // Kinematic rope motion must not place the body inside a solid. Let go at
    // the last safe position; ordinary Arcade collision resumes, without a boost.
    if(rope && !rope.release && this.level.solids.some(([x,y,w,h])=>
      rope!.x+MOVEMENT.width/2>x && rope!.x-MOVEMENT.width/2<x+w &&
      rope!.y+MOVEMENT.height/2>y+0.01 && rope!.y-MOVEMENT.height/2<y+h)) {
      this.ropes.cancel(this.gameTime); rope=undefined;
    }
    if (rope && !rope.release) {
      this.player.clearBuffer();
      this.player.syncInput(input);
      this.player.body.reset(rope.x,rope.y);
      this.player.body.setAllowGravity(false).setVelocity(0,0);
      this.player.body.moves=false;
    } else if (rope?.release) {
      this.player.body.moves=true;
      this.player.body.setAllowGravity(true);
      this.player.clearBuffer(); this.player.syncInput(input);
      this.player.bounce(input.a ? MOVEMENT.jumpSpeed : MOVEMENT.jumpCutSpeed,this.gameTime);
      const direction=Number(input.right)-Number(input.left);
      this.player.body.setVelocityX(direction*(input.b ? MOVEMENT.runSpeed : MOVEMENT.walkSpeed));
    } else {
      this.player.body.moves=true; this.player.body.setAllowGravity(true);
      if (this.rules?.rolling) {
        this.player.input({...input,b:true,left:this.rules.facing<0,right:this.rules.facing>0},this.gameTime);
      } else this.player.input(input,this.gameTime);
      this.player.update(this.gameTime, dt);
    }
    if (tireHit >= 0 && !rope) {
      // Own tire speeds (src/tires.ts), not B-01. If a jump was accepted in this
      // same step (K pressed on landing), the tire speed still replaces it.
      const speed = tireSpeed(input.a);
      // The body's symmetric Arcade speed cap is B-01's max fall (280). Raise it only
      // for this rise so the upward tire speed is not clipped; restored at the apex
      // (vy >= 0), so falling stays capped at 280 exactly as before.
      this.player.body.maxVelocity.y = Math.max(MOVEMENT.maxFallSpeed, speed);
      if (!this.player.bounce(speed, this.gameTime)) this.player.body.setVelocityY(-speed);
      this.tires.hit(tireHit, this.rules?.now ?? this.gameTime, speed); // view clock = rules.now
    }
    if (result?.bounce) this.player.bounce(ACTION.stompBounce, this.gameTime);
    if (result?.hurt && this.rules) {
      this.hurt = { x: this.player.centerX, feet: this.player.feet, at: this.rules.now, facing: this.rules.facing };
      this.rules.respawn(); this.player.setSpawn(this.rules.spawn);
      this.platformDrop.reset(input.down); this.rules.faceInput(input);
      this.player.reset(input); this.resets++;
    }
    if (this.player.centerY > (this.jungle ? this.level.fallY : 186)) {
      this.ropes.reset(input); this.tires.reset(); this.player.body.setAllowGravity(true); this.player.body.moves=true;
      if (this.rules) { this.rules.respawn(); this.player.setSpawn(this.rules.spawn); }
      this.platformDrop.reset(input.down);this.rules?.faceInput(input);
      this.player.reset(this.controls.snapshot());
      this.resets++;
      this.snapCamera();
    }
    if (this.rules) this.finished = this.rules.finished;
    else if (this.jungle && this.player.centerX >= this.level.exit.x) this.finished = true;
    if(this.practiceStep!==undefined && this.rules) {
      if(this.ropes.attached&&this.player.centerY<=86)this.climbed=true;
      const r=this.rules;
      if(!this.practiceSuccess&&lessonDone(this.practiceStep,{x:this.player.centerX,y:this.player.centerY,vy:this.player.body.velocity.y,vx:this.player.body.velocity.x,rolling:r.rolling,stomp:r.kills.stomp,roll:r.kills.roll,barrel:r.kills.barrel,tires:this.tires.count,rope:!!this.ropes.attached,dropped:this.practiceDropped,grounded:this.player.grounded},this.climbed))this.practiceSuccess=this.gameTime;
      if(this.practiceSuccess)this.practiceRetryAt=undefined;
      else {
        if(lessonNeedsRetry(this.practiceStep,r))this.practiceRetryAt??=this.gameTime;
        if(this.practiceRetryAt!==undefined&&this.gameTime-this.practiceRetryAt>=PRACTICE_RETRY_MS){
          // Same registry step: replenish the encounter and reset DK safely,
          // without awarding a lesson, losing earlier steps or changing campaign.
          // This uses active simulation time, so pause/focus also freeze retries.
          this.freeze(true);this.scene.restart();return;
        }
      }
      if(this.practiceSuccess&&this.gameTime-this.practiceSuccess>650){
        if(this.practiceStep+1<LESSONS.length)this.registry.set('practiceStep',this.practiceStep+1);
        else {
          this.registry.remove('practiceStep');this.registry.set('practiceDone',true);
          if(this.registry.get('cinematic')){this.freeze(true);this.scene.start('StageIntroScene');return;}
        }
        this.scene.restart();return;
      }
    }
    if (this.finished && this.campaign && this.rules && !this.committed && this.practiceStep===undefined) {
      // The cave route is only the first part of stage three now. Its pickups
      // stay in the current attempt until the cart reaches the final entrance.
      if(!this.minecartExit)this.campaign.complete(this.stage, this.rules.pickups);
      this.committed = true;
    }
    this.previousFeet = this.player.feet;
    if(this.jungle){
      this.horizontalCamera=horizontalStep(this.level.width,this.horizontalCamera,this.player.centerX,this.player.body.velocity.x);
      this.cameras.main.scrollX=Math.round(this.horizontalCamera.scroll);
    }
    if (this.level.camera === 'readable' && this.jungle) {
      this.cameraY = readableStep(this.level, this.cameraY, this.player.centerX, this.player.feet);
      this.cameras.main.scrollY = Math.round(this.cameraY);
    }
    if (this.finished) {
      this.player.body.setVelocity(0, 0);
      this.freeze(true);
    }
  }

  update(_time:number,delta:number) {
    if (!this.player) return;
    const steps = this.stepsThisFrame; this.stepsThisFrame = 0;
    const paused = this.pausedByUser || !this.controls.isActive;
    if(this.minecartExit&&this.finished&&!paused){
      const before=this.minecartLaunchMs;this.minecartLaunchMs+=Math.min(delta,150);
      if(before<620&&this.minecartLaunchMs>=620)this.game.events.emit(GAME_SOUND,'throw');
    }
    this.freeze(paused || this.finished);
    if (this.view && this.rules) {
      this.silhouette.clear();
      this.overlay.clear();
      const attached = this.ropes.attached;
      const gripY = this.player.centerY - 14;
      const slope = attached ? (ropeX(attached,attached.bottom,this.gameTime)-attached.x)/(attached.bottom-attached.top) : 0;
      this.view.render({ menuOpen: this.pauseMenu?.open, paused: this.pausedByUser && (!this.finished||this.minecartExit), mapOption: !!this.campaign, mapConfirm: this.mapConfirm && this.pausedByUser, focusLost: !this.controls.isActive, showSprites: this.showSilhouette, showBodies: this.showBody, hurt: this.hurt, onRope:!!attached,
        ropeGrip: attached ? {x:ropeX(attached,gripY,this.gameTime),y:gripY,angle:-Math.atan(slope)*180/Math.PI} : undefined,
        campaign: this.campaign?.summary(this.stage, this.rules?.pickups),demoEnding:!!this.registry.get('cinematic')&&!!this.campaign?.canShowEnding(),
        finalBonusAvailable:this.campaign?.canPlayFinalBonus(),minecartExit:this.minecartExit,minecartLaunchMs:this.minecartLaunchMs,touch:this.controls.touchLayout });
    } else this.renderPlaceholder(paused);
    this.ropeView?.render(this.gameTime, this.showSilhouette);
    let instruction='';
    const tireHint=this.level.id===REPTILE.id&&this.player.centerX>285&&this.player.centerX<435;
    const vineHint=!!this.registry.get('cinematic')&&this.practiceStep===undefined
      &&this.level.id===ROPEY.id&&this.player.centerX<250;
    if(this.practiceStep!==undefined)instruction=this.practiceSuccess?'BIEN!':LESSONS[this.practiceStep].join('\n');
    if(this.practiceStep===8&&!this.practiceSuccess)instruction=!this.ropes.attached?'ACERCATE A LA LIANA\nMANTEN LA TECLA W':this.climbed?'PULSA K: SUELTA\nY SALTA DE LA LIANA':'MANTEN LA TECLA W\nPARA SEGUIR SUBIENDO';
    else if(!vineHint&&this.level.id===ROPEY.id&&this.player.centerX<250)instruction=this.ropes.attached?'W / S: SUBE / BAJA\nK SUELTA Y SALTA':'SALTA A LA LIANA\nEN EL SUELO: W';
    else if(tireHint&&!this.registry.get('cinematic'))instruction='SALTA A LA LLANTA\nMANTEN K: MAS ALTO';
    if(this.controls.touchLayout){
      if(this.practiceStep!==undefined&&this.practiceStep!==8&&!this.practiceSuccess)instruction=TOUCH_LESSONS[this.practiceStep].join('\n');
      else if(this.practiceStep===8&&!this.practiceSuccess)instruction=!this.ropes.attached?'ACERCATE A LA LIANA\nMANTEN FLECHA ARRIBA':this.climbed?'TOCA A: SUELTA\nY SALTA DE LA LIANA':'MANTEN FLECHA ARRIBA\nPARA SEGUIR SUBIENDO';
      else if(!vineHint&&this.level.id===ROPEY.id&&this.player.centerX<250)instruction=this.ropes.attached?'ARRIBA / ABAJO: TREPA\nA SUELTA Y SALTA':'SALTA A LA LIANA\nEN EL SUELO: ARRIBA';
      else instruction=controlText(instruction,true);
    }
    if(this.practiceStep===9&&!this.practiceSuccess&&!this.practiceDropped&&this.player.grounded&&this.player.centerY>110)
      instruction=this.controls.touchLayout?'TOCA A: SUBE A\nLA REPISA OTRA VEZ':'PULSA K: SUBE A\nLA REPISA OTRA VEZ';
    const barrelPhase=this.practiceStep===6?barrelLessonPhase(this.player.centerX,this.player.centerY,this.rules?.barrels??[]):undefined;
    if(barrelPhase&&!this.practiceSuccess)instruction=barrelLessonInstruction(barrelPhase,this.controls.touchLayout);
    if(this.practiceStep!==undefined&&this.practiceRetryAt!==undefined)instruction=lessonRetryInstruction(this.practiceStep);
    if(this.practiceStep===undefined&&this.rules?.checkpointAt!==undefined&&this.rules.now-this.rules.checkpointAt<1600)
      instruction=`PUNTO DE CONTROL\n${this.rules.checkpointIndex+1} / ${this.rules.checkpoints.length}: GUARDADO`;
    // The S floats above the first tire. Put its hint below the letter while
    // approaching on the floor; clear the playfield during jumps/on the ledge.
    // Hide this panel while airborne so it cannot obscure the S or the landing.
    const guideY=tireHint?58:17,guideHeight=tireHint?26:36;
    const clearTireHint=!tireHint||(this.player.grounded&&Math.abs(this.player.body.velocity.y)<1
      &&this.player.feet-this.cameras.main.scrollY>=guideY+guideHeight+DK.cell+4&&!this.rules?.dying);
    // Instructions and success share one contrasting LCD panel. Outside it,
    // the presentation highlights the controls without repeating the wording.
    const guideVisible=!!instruction&&!paused&&!this.finished&&clearTireHint;
    this.guide?.setText(instruction).setY(guideY+3).setVisible(guideVisible);
    this.guideBox?.setY(guideY).setSize(154,guideHeight).setVisible(guideVisible);
    const encounterHint=this.rules?.enemies.some(e=>e.alive&&e.kind==='bee'&&Math.abs(e.x-this.player.centerX)<105)
      ?'Abejas: esquívalas o usa un barril. Los racimos grandes valen 10 bananas.':'';
    const onLedge=this.player.grounded&&this.level.platforms?.some(([x,y,w])=>this.player.centerX>=x&&this.player.centerX<x+w&&Math.abs(this.player.feet-y)<1);
    const terrainHint=onLedge?(this.controls.touchLayout?'Abajo: baja al siguiente suelo. A: salta para seguir subiendo.':'S / ↓: baja al siguiente suelo. K: salta para seguir subiendo.'):'';
    if(this.minecartExit&&this.finished)instruction='';
    const tireReminder=!this.finished&&!this.rules?.dying&&nearTire(this.level.tires,this.player.centerX,this.player.feet)?TIRE_GUIDE:'';
    const vineReminder=vineHint&&!this.finished&&!this.rules?.dying?(this.ropes.attached?VINE_CLIMB_GUIDE:VINE_GRAB_GUIDE):'';
    // Keep this first-encounter cue outside the tiny LCD, never over the hazard.
    this.game.events.emit('berto:guide',this.practiceStep!==undefined?(this.practiceSuccess?'':`TUTORIAL · Paso ${this.practiceStep+1}/${LESSONS.length}: ${instruction.replace('\n',' · ')}.`):tireReminder||instruction.replace('\n',' · ')||vineReminder||terrainHint||encounterHint);
    this.game.events.emit(TELEMETRY, {
      x: this.player.centerX, y: this.player.centerY,
      vx: this.player.body.velocity.x, vy: this.player.body.velocity.y,
      grounded: this.player.grounded, paused,
      cameraX: this.cameras.main.scrollX, resets: this.resets,
      cameraY:this.cameras.main.scrollY, rope:this.ropes.attached?.id,
      ropes:this.level.ropes?.map(r=>({id:r.id,x:ropeX(r,r.bottom,this.gameTime),y:r.bottom})),
      tires:this.level.tires ? { bounces:this.tires.count, lastSpeed:this.tires.lastSpeed } : undefined,
      finished: this.finished, simTime: Math.round(this.gameTime * 1000) / 1000, steps,
      minecartLaunch:this.minecartExit&&this.finished?this.minecartLaunchMs:undefined,
      gameplay: this.rules?.snapshot(),
      practice:this.practiceStep===undefined?undefined:{step:this.practiceStep,total:LESSONS.length,instruction,complete:!!this.practiceSuccess,retrying:this.practiceRetryAt!==undefined,barrelPhase},
      guide:this.guideBox?{text:instruction,x:3,y:guideY,width:154,height:guideHeight,visible:guideVisible}:undefined,
      view: this.view?.describe(),
    } satisfies MovementTelemetry);
    // Walking into the barrel is the trigger. No confirmation/completion card.
    if(this.minecartExit&&this.finished&&this.committed&&!paused&&this.minecartLaunchMs>=1250){
      this.scene.start('MinecartScene',{pickups:this.rules!.pickups.map(p=>({...p})),launched:true});
    }
  }

  /** Lab and Phase 3 greybox presentation (unchanged placeholders). */
  private renderPlaceholder(paused: boolean) {
    if (this.jungle) {
      const x = Math.round(this.player.shape.x), feet = Math.round(this.player.shape.y + MOVEMENT.height/2);
      this.player.shape.setVisible(false);
      this.silhouette.clear();
      if (this.showSilhouette) {
        this.silhouette.fillStyle(0xcba778).fillRect(x-6,feet-28,12,9)
          .fillRect(x-9,feet-20,18,14).fillRect(x-12,feet-16,5,16)
          .fillRect(x+7,feet-16,5,16).fillRect(x-7,feet-7,14,7);
      }
      if (this.showBody) this.silhouette.lineStyle(1,0x6dffff).strokeRect(x-6,feet-16,12,16);
    }
    this.overlay.clear().fillStyle(0x0c1418, 0.95).fillRect(0, 0, 160, 13);
    pixelText(this.overlay, (this.jungle ? 'JUNGLE / ' : 'PHASE B / ') + (paused ? 'PAUSA' : this.finished ? 'FIN' : this.player.grounded ? 'SUELO' : 'AIRE'), 5, 4, 0xc8dbac);
    if (this.jungle && this.finished) {
      this.overlay.fillStyle(0x0c1418,0.95).fillRect(6,36,148,28);
      pixelText(this.overlay,'FIN DEL RECORRIDO',17,43,0xebc66a);
      pixelText(this.overlay,'BLOQUES / SIN ARTE FINAL',11,54,0xc8dbac);
    }
    if (paused && !this.finished) {
      this.overlay.fillStyle(0x0c1418, 0.9).fillRect(18, 63, 124, 20);
      pixelText(this.overlay, this.pausedByUser ? 'ESPACIO / CONTINUAR' : 'ACTIVAR TECLADO', 29, 71, 0xebc66a);
    }
  }
}

export class JungleGreyboxScene extends MovementLabScene {
  constructor() { super(true); }
}

export const physicsConfig = {
  default: 'arcade',
  // Resolve side contact before the vertical axis so a jump next to a low
  // platform is not mistaken for a head collision against its underside.
  arcade: { gravity: { x: 0, y: MOVEMENT.gravity }, fps: 60, fixedStep: true, forceX: true, debug: false },
};
