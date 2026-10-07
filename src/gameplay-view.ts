import Phaser from 'phaser';
import { COLLECTIBLE_WORD } from './collectibles';
import { controlText } from './control-labels';
import type { LevelRules } from './gameplay';
import { HITBOX } from './gameplay';
import type { LevelData } from './jungle-layout';
import type { PlayerController } from './player';
import { ATLAS, DEPTH, DK, FONT_CHARS, FONTS, PARALLAX, TIMING } from './art-spec';
import { MOVEMENT } from './tuning';
import { TIRE, type TireState } from './tires';
import { VINE_DEPTH } from './rope-view';
import { moundBase } from './platforms';
import { solidFaces, exposedSide } from './terrain-visual';

// Phase 5 presentation of Jungle: sprites, tiles, parallax, HUD and overlays.
// Every animation is a pure function of simulation time (rules.now) or of distance
// travelled, so pause/focus loss/completion freeze it and resuming continues it.
// Nothing here writes to physics or rules.

export interface ViewState {
  menuOpen?: boolean;
  paused: boolean;       // Start pause
  mapOption?: boolean;   // adventure: the pause menu offers J to go back to the map
  mapConfirm?: boolean;  // adventure: J pressed once, waiting for confirmation
  focusLost: boolean;    // keyboard not active
  showSprites: boolean;  // "Sprites" toggle
  showBodies: boolean;   // collision toggle
  hurt?: { x: number; feet: number; at: number; facing: number };
  onRope?: boolean;
  ropeGrip?: { x: number; y: number; angle: number };
  campaign?: { bananas: number; comodines: number; letters: string; finished: boolean };
  demoEnding?: boolean;
  finalBonusAvailable?: boolean;
  minecartExit?: boolean;
  minecartLaunchMs?: number;
  touch?: boolean;
}

type Sprite = Phaser.GameObjects.Image;
/** World y of the canopy strip's top edge (its hanging edge is ~42 px lower, y≈91-101). */
export const CANOPY_Y = 54;

export class JungleView {
  private scene: Phaser.Scene;
  private rules!: LevelRules;
  private player: PlayerController;
  private level: LevelData;
  private far: Phaser.GameObjects.TileSprite;
  private near: Phaser.GameObjects.TileSprite;
  private practiceShade?: Phaser.GameObjects.Rectangle;
  private statics: Phaser.GameObjects.GameObject[] = [];
  private dk: Sprite;
  /** Climbing: hands (and pressing foot) drawn in front of the vine; DK's body hangs just behind it. */
  private grip!: Sprite;
  private ghost: Sprite;
  private carried: Sprite;
  private dust: Sprite;
  private pickups = new Map<string, { sprite: Sprite; shine: Sprite }>();
  private enemies: { sprite: Sprite; hit: Sprite }[] = [];
  private barrels: Sprite[] = [];
  private tireSprites: Sprite[] = [];
  private tireState?: TireState;
  private star!: Sprite;
  private exitArt!: Sprite;
  private extraStars: Sprite[] = [];
  private starFx!: Sprite;
  private debug: Phaser.GameObjects.Graphics;
  private hud: Phaser.GameObjects.Container;
  private hudDigits: Sprite[] = [];
  private hudLetters: Sprite[] = [];
  private overlay: Phaser.GameObjects.Container;
  private overlayBox: Phaser.GameObjects.Graphics;
  private overlayLines: Phaser.GameObjects.BitmapText[] = [];
  private overlayIcons: Sprite[] = [];
  private overlayKey = '';
  private odometer = 0;
  private dkFrame = '';
  private lastX = 0;
  private climbDistance = 0;
  private lastClimbY?: number;
  private wasGrounded = true;
  private landedAt = -Infinity;
  private landedX = 0;
  private landedFeet = 0;

  constructor(scene: Phaser.Scene, level: LevelData, rules: LevelRules, player: PlayerController, tires?: TireState) {
    this.scene = scene; this.level = level; this.player = player; this.tireState = tires;
    ensureFonts(scene);
    scene.cameras.main.setBackgroundColor('#86a7d4');
    const cave = level.theme === 'cave';
    this.far = scene.add.tileSprite(0, 0, 160, 144, cave ? 'cave-far' : 'bg-far').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.far);
    // Cave formations span the whole screen height so the columns reach the ceiling.
    this.near = scene.add.tileSprite(0, cave ? 0 : PARALLAX.nearY, 160, cave ? 144 : PARALLAX.nearHeight, cave ? 'cave-near' : 'bg-near').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.near);
    if (cave) scene.cameras.main.setBackgroundColor('#2e1610');
    if(level.theme==='night') {
      scene.cameras.main.setBackgroundColor('#172747');
      this.far.setTint(0x56698f); this.near.setTint(0x72837f);
    }
    this.buildDecor();
    this.buildGround();
    // Phase 8 tires: drawn on the solid rectangle the physics uses (bottom-centre anchor).
    this.tireSprites = (level.tires ?? []).map(t => this.img('tire-0', DEPTH.items).setOrigin(0.5, 1).setPosition(t.x, t.y));
    this.dk = this.img('dk-idle-0', DEPTH.player).setOrigin(0.5, 1);
    this.grip = this.img('dk-climb-grip-0', DEPTH.player).setVisible(false);
    this.ghost = this.img('dk-hurt', DEPTH.player).setOrigin(0.5, 1).setVisible(false);
    this.carried = this.img('barrel-0', DEPTH.carried).setVisible(false);
    this.dust = this.img('dust-0', DEPTH.fx).setOrigin(0.5, 1).setVisible(false);
    this.debug = scene.add.graphics().setDepth(DEPTH.debug);
    this.hud = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.hud);
    this.overlay = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.overlay);
    this.overlayBox = scene.add.graphics();
    this.overlay.add(this.overlayBox);
    this.buildHud();
    this.bind(rules);
    this.lastX = player.centerX;
  }

  /** Attach a (new) rules instance, e.g. after "Reiniciar Jungle". */
  bind(rules: LevelRules) {
    this.rules = rules;
    for (const { sprite, shine } of this.pickups.values()) { sprite.destroy(); shine.destroy(); }
    this.pickups.clear();
    this.enemies.forEach(e => { e.sprite.destroy(); e.hit.destroy(); });
    this.barrels.forEach(b => b.destroy());
    this.star?.destroy(); this.starFx?.destroy();
    this.extraStars.forEach(s=>s.destroy());this.extraStars=[];
    for (const p of rules.pickups) {
      const sprite = this.img(p.special ? 'comodin' : p.letter ? `letter-${p.letter}` : p.value===10?'banana-bunch':'banana-0', DEPTH.items);
      const shine = this.img('sparkle-0', DEPTH.fx).setVisible(false);
      this.pickups.set(p.id, { sprite, shine });
    }
    this.enemies = rules.enemies.map((_, i) => ({ sprite: this.img(`${this.enemyKind(i)}-walk-0`, DEPTH.enemies).setOrigin(0.5, 1), hit: this.img('hit-0', DEPTH.fx).setVisible(false) }));
    this.barrels = rules.barrels.map(() => this.img('barrel-0', DEPTH.items));
    const cp = this.level.checkpoint;
    this.star = this.img('star-barrel-0', DEPTH.items).setOrigin(0.5, 1).setPosition(cp.x, cp.spawn.y + MOVEMENT.height / 2);
    this.starFx = this.img('star-0', DEPTH.fx).setVisible(false);
    this.extraStars=(this.level.extraCheckpoints ?? []).map(c=>this.img('star-barrel-0',DEPTH.items).setOrigin(.5,1).setPosition(c.x,c.spawn.y+MOVEMENT.height/2));
    this.odometer = 0; this.wasGrounded = true; this.landedAt = -Infinity;
  }

  private enemyKind(i: number) { return this.level.enemies[i]?.kind ?? 'gnawty'; }

  private img(frame: string, depth: number) { return this.scene.add.image(0, 0, ATLAS, frame).setDepth(depth); }

  private buildDecor() {
    const L = this.level;
    // All lessons share the approved rope-practice backdrop. This is only
    // background contrast; it must not apply Ropey's night tint to the ground.
    if(L.id.startsWith('practice-')) {
      this.far.setTint(0x718889);
      this.practiceShade=this.scene.add.rectangle(0,0,L.width,124,0x0b2423,.55).setOrigin(0).setDepth(DEPTH.decor);
      this.statics.push(this.practiceShade);
    }
    // DK's treehouse behind the start and the exit cave + sign at the end (visual only).
    if(!L.theme&&!L.id.startsWith('practice-')) this.statics.push(this.scene.add.image(L.spawn.x - 4, 124, ATLAS, 'treehouse').setOrigin(0.5, 1).setDepth(DEPTH.decor));
    // Exit decor stands on the solid under the exit (Jungle 124, Ropey 180, Reptile plateau 68).
    const floor = Math.min(...L.solids.filter(([x, , w]) => L.exit.x >= x && L.exit.x < x + w).map(([, y]) => y), L.theme === 'night' ? 180 : 124);
    const refinedExit=L.id==='jungle-phase6'||L.id==='ropey-rampage';
    const cartExit=L.id==='reptile-rumble'&&this.scene.registry.get('campaign')&&this.scene.registry.get('cinematic');
    const entrance=cartExit?'mine-cannon':L.id==='reptile-rumble'?'mine-entrance':refinedExit?(L.theme==='night'?'night-entrance':'jungle-entrance'):'exit-cave';
    this.exitArt=this.scene.add.image(L.exit.x+(cartExit?22:refinedExit||L.id==='reptile-rumble'?0:26), floor+2, ATLAS, entrance).setOrigin(0.5, 1).setDepth(DEPTH.decor);
    this.statics.push(this.exitArt);
    this.statics.push(this.scene.add.image(L.exit.x-(refinedExit?38:12), floor, ATLAS, 'exit-sign').setOrigin(0.5, 1).setDepth(DEPTH.decor + 1));
    for(const {platform:[x,y,w],base} of L.palms??[]){
      this.statics.push(this.scene.add.tileSprite(x+w/2,y+12,16,base-y-12,ATLAS,'palm-trunk').setOrigin(.5,0).setDepth(DEPTH.decor+1));
      this.statics.push(this.img('palm-crown',DEPTH.ground-.5).setOrigin(.5,4/36).setPosition(x+w/2,y));
      this.statics.push(this.img('jungle-fern',DEPTH.decor+2).setOrigin(.5,1).setPosition(x+w/2,base));
    }
    if(L.id==='jungle-phase6')for(const [x,y] of [[382,124],[970,84],[1030,-12],[1240,124],[1880,76],[2080,76]]){
      this.statics.push(this.img('jungle-fern',DEPTH.ground+.2).setOrigin(.5,1).setPosition(x,y));
    }
    // Ropey: the ropes hang out of a night canopy. Its lower edge (y≈91-101) is
    // where DK's raised hands stop at the climb limit (body centre y=116), so the
    // limit reads as the rope entering the leaves, not as an invisible wall.
    if (L.ropes?.length&&!L.id.startsWith('practice-')) {
      const canopy=(x:number,w:number,y:number)=>{
        this.statics.push(this.scene.add.tileSprite(x,y,w,56,'canopy-night').setOrigin(0).setDepth(DEPTH.canopy));
        this.statics.push(this.scene.add.rectangle(x,-144,w,y+146,0x0d2126).setOrigin(0).setDepth(DEPTH.canopy));
      };
      // A clearing above the optional terraces, never above the existing ropes.
      // Otherwise the old foreground canopy would paint over the high ledges.
      let left=0;
      for(const z of [...(L.cameraZones??[])].sort((a,b)=>a.minX-b.minX)){
        if(z.minX>left)canopy(left,z.minX-left,CANOPY_Y);
        canopy(z.minX,z.maxX-z.minX,z.top-28);left=z.maxX;
      }
      if(left<L.width)canopy(left,L.width-left,CANOPY_Y);
    }
  }

  private buildGround() {
    // High facades first; lower terraces overlap their foot, like a stepped
    // rock formation. DK walks in FRONT of the facade, not through an arch.
    for(const [i,rect] of [...(this.level.platforms??[])].sort((a,b)=>a[1]-b[1]).entries()) {
      if(this.level.palms?.some(p=>p.platform===rect))continue;
      const [x,y,w]=rect;
      const prefix=this.level.theme==='cave'?'cave':'ground';
      const floor=moundBase(this.level,rect),h=floor-y,d=DEPTH.ground-1+i*.002;
      if(h>10){
        this.statics.push(this.scene.add.tileSprite(x,y+10,w,h-10,`${prefix}-fill`).setOrigin(0).setDepth(d)
          .setTilePosition(x%32,(y+10)%32).setTint(this.level.theme==='night'?0x8585a0:0x9cac9c));
        this.statics.push(this.scene.add.tileSprite(x,y+10,8,h-10,`${prefix}-side-l`).setOrigin(0).setDepth(d+.0001));
        this.statics.push(this.scene.add.tileSprite(x+w-8,y+10,8,h-10,`${prefix}-side-r`).setOrigin(0).setDepth(d+.0001));
        this.statics.push(this.scene.add.rectangle(x+8,y+12,w-16,3,0x14190f,.45).setOrigin(0).setDepth(d+.0001));
        // A recessed leafy patch emphasizes depth without covering the player.
        if(this.level.theme!=='cave'&&h>30&&w>=40){
          this.statics.push(this.img('vine-leaf',d+.0001).setPosition(x+w*.56,y+Math.min(h*.56,42)).setScale(2.2).setTint(0x74856d));
        }
      }
      this.statics.push(this.scene.add.tileSprite(x,y-2,w,Math.min(16,h+2),`${prefix}-top`).setOrigin(0).setDepth(d+.0001));
      this.statics.push(this.scene.add.image(x,y-2,`${prefix}-cap-l`).setOrigin(0).setCrop(0,0,12,h+2).setDepth(d+.0002));
      this.statics.push(this.scene.add.image(x+w-12,y-2,`${prefix}-cap-r`).setOrigin(0).setCrop(0,0,12,h+2).setDepth(d+.0002));
    }
    // Tires are solids for physics and barrels but are drawn as tires, not ground.
    const tireRects = new Set((this.level.tires ?? []).map(t => `${t.x - TIRE.halfW},${t.y - TIRE.height}`));
    const solids = this.level.solids.filter(([x, y]) => !tireRects.has(`${x},${y}`));
    const key = (name: string) => this.level.theme === 'cave' ? `cave-${name}` : `ground-${name}`;
    // Draw the UNION, not each collision box. A path line at an internal join
    // falsely advertised a walk-through lane under the solid cave staircase.
    // One-way facades above stay separate, behind the bright lower walkway.
    solidFaces(solids).forEach(face => {
      const [x,y,w,h]=face,d=DEPTH.ground;
      const fill = this.scene.add.tileSprite(x, y + 10, w, Math.max(0, h - 10), key('fill')).setOrigin(0).setDepth(d);
      fill.setTilePosition(x % 32, (y + 10) % 32);
      const top = this.scene.add.tileSprite(x, y - 2, w, Math.min(16, h + 2), key('top')).setOrigin(0).setDepth(d);
      if(this.level.theme==='night') { fill.setTint(0x9994bd); top.setTint(0xb0a4c9); }
      top.setTilePosition(x % 16, 0);
      this.statics.push(fill, top);
      for(const side of ['left','right'] as const) {
        const edge=exposedSide(face,side,solids),suffix=side==='left'?'l':'r';
        for(const [a,b] of edge) {
          const start=Math.max(y+10,a),width=Math.min(8,w);
          if(b>start)this.statics.push(this.scene.add.tileSprite(side==='left'?x:x+w-width,start,width,b-start,key(`side-${suffix}`))
            .setOrigin(0).setTilePosition(0,(start-y-10)%32).setDepth(d+.0001));
        }
        if(edge.some(([a])=>a===y)) {
          const cropWidth=Math.min(12,w),offset=side==='left'?0:12-cropWidth;
          this.statics.push(this.scene.add.image(side==='left'?x:x+w-12,y-2,key(`cap-${suffix}`))
            .setOrigin(0).setCrop(offset,0,cropWidth,Math.min(17,h+2)).setDepth(d+.0002));
        }
      }
    });
  }

  private buildHud() {
    const s = this.scene;
    this.hud.add(s.add.image(4, 3, ATLAS, 'hud-banana').setOrigin(0));
    for (let i = 0; i < 3; i++) { const d = s.add.image(15 + i * 7, 4, ATLAS, 'digit-0').setOrigin(0); this.hudDigits.push(d); this.hud.add(d); }
    for (let i = 0; i < 5; i++) { const l = s.add.image(160 - 5 * 10 - 3 + i * 10, 4, ATLAS, 'hud-letter-empty').setOrigin(0); this.hudLetters.push(l); this.hud.add(l); }
  }

  render(v: ViewState) {
    const r = this.rules, now = r.now, cam = this.scene.cameras.main;
    this.far.setTilePosition(Math.round(cam.scrollX * PARALLAX.far), 0);
    this.near.setTilePosition(Math.round(cam.scrollX * PARALLAX.near), 0);
    const spritesOn = v.showSprites;
    // pickups
    for (const p of r.pickups) {
      const view = this.pickups.get(p.id)!;
      view.sprite.setVisible(spritesOn && !p.collected).setPosition(Math.round(p.x), Math.round(p.y));
      if (!p.letter && !p.special && p.value!==10 && !p.collected) {
        const cycle = TIMING.bananaMsPerFrame * 4 + TIMING.bananaIdleMs;
        const t = (now + p.x * 7) % cycle; // staggered glint
        const f = t < TIMING.bananaIdleMs ? 0 : [1, 2, 1, 0][Math.min(3, Math.floor((t - TIMING.bananaIdleMs) / TIMING.bananaMsPerFrame))];
        view.sprite.setFrame(`banana-${f}`);
      }
      const since = p.collectedAt === undefined ? Infinity : now - p.collectedAt;
      view.shine.setVisible(spritesOn && since < TIMING.sparkleMs).setPosition(Math.round(p.x), Math.round(p.y));
      if (since < TIMING.sparkleMs) view.shine.setFrame(`sparkle-${Math.min(2, Math.floor(since / (TIMING.sparkleMs / 3)))}`);
    }
    // enemies
    r.enemies.forEach((e, i) => {
      const { sprite, hit } = this.enemies[i];
      const feet = e.y + HITBOX.enemy.halfH;
      if (e.alive) {
        const kind=this.enemyKind(i),period=kind==='bee'?70:kind==='lizard'?120:kind==='snake'?TIMING.snakeMsPerFrame:TIMING.gnawtyMsPerFrame;
        sprite.setVisible(spritesOn).setPosition(Math.round(e.x), feet).setFlipX(e.direction < 0).setFlipY(false).setAngle(0)
          .setFrame(`${kind}-walk-${kind==='lizard'&&e.y<e.homeY-2?2:Math.floor(now/period)%2}`);
        hit.setVisible(false);
      } else {
        const t = now - (e.defeatedAt ?? -1e9);
        const falling = t < TIMING.gnawtyDefeatMs;
        const s = t / 1000;
        sprite.setVisible(spritesOn && falling).setFlipY(true).setPosition(Math.round(e.x), Math.round(feet - 14 - 70 * s + 420 * s * s));
        hit.setVisible(spritesOn && t < TIMING.hitMs).setPosition(Math.round(e.x), Math.round(e.y - 4)).setFrame(`hit-${t < TIMING.hitMs / 2 ? 0 : 1}`);
      }
    });
    // tires: squash for a moment after each bounce (simulation time, frozen by pause)
    this.tireSprites.forEach((t, i) => {
      const at = this.tireState?.lastBounce[i];
      t.setVisible(spritesOn).setFrame(at !== undefined && now - at >= 0 && now - at < TIMING.tireSquashMs ? 'tire-1' : 'tire-0');
    });
    // barrels
    const feetX = Math.round(this.player.centerX), feetY = Math.round(this.player.feet);
    r.barrels.forEach((b, i) => {
      const s = this.barrels[i];
      if (b.state === 'ready') s.setVisible(spritesOn).setFrame('barrel-0').setPosition(Math.round(b.x), Math.round(b.y));
      else if (b.state === 'thrown') s.setVisible(spritesOn).setPosition(Math.round(b.x), Math.round(b.y))
        .setFrame(`barrel-${((Math.floor(Math.abs(b.x - b.origin) / TIMING.barrelRollPxPerFrame) % 4) + 4) % 4}`).setFlipX(b.vx < 0);
      else if (b.state === 'spent') { const t = now - (b.spentAt ?? -1e9); s.setVisible(spritesOn && t < TIMING.debrisMs).setFrame(`barrel-debris-${t < TIMING.debrisMs / 2 ? 0 : 1}`).setPosition(Math.round(b.x), Math.round(b.y)); }
      else s.setVisible(false); // carried: drawn above DK below
    });
    const carrying = !!r.carried;
    this.carried.setVisible(spritesOn && carrying && !r.dying && this.dkVisible(now)).setPosition(feetX + DK.carryOffset.x, feetY + DK.carryOffset.y);
    // checkpoint star barrel
    const cpT = r.checkpointAt === undefined ? -1 : now - r.checkpointAt;
    this.star.setVisible(spritesOn && !r.checkpoint).setFrame(`star-barrel-${Math.floor(now / TIMING.starBarrelMsPerFrame) % 2}`);
    this.extraStars.forEach((s,i)=>s.setVisible(spritesOn && r.checkpointIndex<i+1).setFrame(`star-barrel-${Math.floor(now/TIMING.starBarrelMsPerFrame)%2}`));
    const burst = r.checkpoint && cpT < TIMING.checkpointBurstMs;
    this.starFx.setVisible(spritesOn && burst);
    if (burst) { const cp=r.checkpoints[r.checkpointIndex]; this.starFx.setPosition(cp.x, Math.round(cp.spawn.y - 6 - cpT * 0.03)).setFrame(`star-${Math.floor(cpT / 80) % 2}`); }
    // DK
    this.renderDK(v, now, feetX, feetY);
    this.renderDebug(v.showBodies);
    this.renderHud(v);
    this.renderOverlay(v);
  }

  private dkVisible(now: number) { return this.rules.now >= this.rules.invulnerableUntil || Math.floor(now / 100) % 2 === 0; }

  private renderDK(v: ViewState, now: number, x: number, feet: number) {
    const r = this.rules, body = this.player.body;
    const grounded = this.player.grounded;
    const vx = body.velocity.x, vy = body.velocity.y;
    this.odometer += Math.abs(this.player.centerX - this.lastX);
    this.lastX = this.player.centerX;
    if (grounded && !this.wasGrounded) { this.landedAt = now; this.landedX = x; this.landedFeet = feet; }
    this.wasGrounded = grounded;
    let frame: string;
    if (r.dying) frame = now - r.hurtAt! < 140 ? 'dk-hurt' : 'dk-hurt-head';
    else if (r.finished) frame = v.minecartExit?'dk-idle-0':`dk-cheer-${Math.floor((now - (r.finishedAt ?? now)) / DK.cheerMsPerFrame) % 2}`;
    else if (v.onRope) {
      if (this.lastClimbY !== undefined) this.climbDistance += this.player.centerY - this.lastClimbY;
      this.lastClimbY = this.player.centerY;
      frame = `dk-climb-${((Math.floor(this.climbDistance / 4) % 4) + 4) % 4}`;
    }
    else if (r.rolling) frame = `dk-roll-${Math.floor((now - r.rollStartedAt) / DK.rollMsPerFrame) % DK.rollFrames}`;
    else if (r.carried) frame = grounded && Math.abs(vx) > 2 ? `dk-carry-walk-${Math.floor(this.odometer / DK.walkPxPerFrame) % DK.gaitFrames}` : 'dk-carry-0';
    else if (now - r.lastThrowAt < DK.throwPoseMs) frame = 'dk-throw';
    else if (!grounded) frame = vy < 0 ? 'dk-jump-up' : 'dk-jump-down';
    else if (Math.abs(vx) <= 2 && this.overLedge(x, feet)) frame = `dk-teeter-${Math.floor(now / 150) % 2}`;
    else if (Math.abs(vx) > 2) {
      const run = Math.abs(vx) > DK.runThreshold;
      frame = `dk-${run ? 'run' : 'walk'}-${Math.floor(this.odometer / (run ? DK.runPxPerFrame : DK.walkPxPerFrame)) % DK.gaitFrames}`;
    } else frame = `dk-idle-${Math.floor(now / DK.idleMsPerFrame) % 2}`;
    if (!v.onRope) { this.lastClimbY = undefined; this.climbDistance = 0; }
    this.dk.setFrame(frame).setOrigin(0.5, 1).setAngle(0).setPosition(x, feet).setFlipX(r.facing < 0).setVisible(v.showSprites && this.dkVisible(now));
    this.dk.setDepth(DEPTH.player);
    if(v.menuOpen){
      // The shared START menu is drawn above the level in LCD coordinates.
    } else if(r.finished&&v.minecartExit){
      const t=v.minecartLaunchMs??0,cx=this.exitArt.x,cy=this.exitArt.y-26;
      frame='dk-jump-up';this.dk.setFlipX(false).setFrame(frame);
      if(t<380){const u=t/380;this.dk.setPosition(x+(cx-x)*u,feet+(cy-feet)*u-20*Math.sin(Math.PI*u));}
      else if(t<620)this.dk.setVisible(false);
      else if(t<960){const u=(t-620)/340;this.dk.setPosition(cx+140*u,cy-100*u);}
      else this.dk.setVisible(false);
      this.exitArt.setScale(t>=620&&t<760?.90:1);
    }
    this.grip.setVisible(false);
    if (v.ropeGrip && v.onRope && !r.dying && !r.finished) {
      // Grip point (24,10) of the 32x32 climbing cell sits on the vine; DK hangs on
      // the side opposite to where he faces. Body behind the strand, hands in front.
      // Atlas custom pivots reflect around the origin. Do not mirror it a second time.
      const flip = r.facing < 0, ox = 24 / 32;
      this.dk.setOrigin(ox, 10 / 32).setFlipX(flip).setPosition(v.ropeGrip.x, v.ropeGrip.y).setAngle(v.ropeGrip.angle).setDepth(VINE_DEPTH.strand - 0.05);
      this.grip.setFrame(frame.replace('dk-climb-', 'dk-climb-grip-')).setOrigin(ox, 10 / 32).setFlipX(flip)
        .setPosition(v.ropeGrip.x, v.ropeGrip.y).setAngle(v.ropeGrip.angle).setVisible(this.dk.visible);
    }
    if (r.dying) {
      const t = (now - r.hurtAt!) / (r.level.hurtMs || 600);
      // Visual recoil only: the physical body stays at the contact point.
      this.dk.setPosition(x - r.facing * Math.round(Math.min(t * 18, 8)), feet - Math.round(Math.sin(t * Math.PI) * 13));
    }
    this.dkFrame = frame;
    // hurt feedback: a short ghost where DK was hit (the return itself is immediate)
    const h = v.hurt, ht = h ? now - h.at : Infinity;
    this.ghost.setVisible(v.showSprites && !r.level.hurtMs && !!h && ht < DK.hurtGhostMs && Math.floor(ht / 60) % 2 === 0);
    if (h) this.ghost.setPosition(Math.round(h.x), Math.round(h.feet)).setFlipX(h.facing < 0);
    // landing dust
    const lt = now - this.landedAt;
    this.dust.setVisible(v.showSprites && lt < 180).setPosition(this.landedX, this.landedFeet).setFrame(`dust-${Math.min(2, Math.floor(lt / 60))}`);
  }

  /** True when the feet centre has no ground under it (the 12 px body still rests on an edge). */
  private overLedge(x: number, feet: number) {
    return ![...this.level.solids,...(this.level.platforms ?? [])].some(([sx, sy, sw]) => x >= sx && x < sx + sw && Math.abs(feet - sy) < 1);
  }

  private renderDebug(on: boolean) {
    const g = this.debug.clear();
    if (!on) return;
    const b = this.player.body;
    g.lineStyle(1, 0x6dffff).strokeRect(Math.round(b.position.x) + 0.5, Math.round(b.position.y) + 0.5, b.width - 1, b.height - 1);
    g.lineStyle(1, 0xff5a6a);
    for (const e of this.rules.enemies) if (e.alive) g.strokeRect(Math.round(e.x - HITBOX.enemy.halfW) + 0.5, Math.round(e.y - HITBOX.enemy.halfH) + 0.5, HITBOX.enemy.halfW * 2 - 1, HITBOX.enemy.halfH * 2 - 1);
    g.lineStyle(1, 0xffb040);
    const bh = HITBOX.barrel.half;
    for (const br of this.rules.barrels) if (br.state === 'ready' || br.state === 'thrown') g.strokeRect(Math.round(br.x - bh) + 0.5, Math.round(br.y - bh) + 0.5, bh * 2 - 1, bh * 2 - 1);
  }

  private renderHud(v: ViewState) {
    const r = this.rules;
    const show = (r.hudVisible || v.paused) && !r.finished;
    this.hud.setVisible(show);
    if (!show) return;
    const digits=String(Math.min(999,v.campaign?.bananas??r.bananas));
    this.hudDigits.forEach((s,i)=>s.setVisible(i<digits.length).setFrame(`digit-${digits[i]??0}`).setX(15+i*7));
    const letters = v.campaign?.letters ?? r.letters;
    COLLECTIBLE_WORD.split('').forEach((ch, i) => this.hudLetters[i].setFrame(letters[i] === ch ? `hud-letter-${ch}` : 'hud-letter-empty'));
  }

  private renderOverlay(v: ViewState) {
    const r = this.rules;
    const g = this.overlayBox.clear();
    let lines: { text: string; y: number; font?: 'plain' | 'gold'; icon?: string }[] = [];
    let icons: { frame: string; x: number; y: number }[] = [];
    // Completion has priority over pause and focus messages.
    if(r.finished&&v.minecartExit){
      // The barrel takes over automatically, without a completion prompt.
      if(v.paused||v.focusLost){g.fillStyle(0x10251f,.92).fillRect(48,4,64,16);lines=[{text:'PAUSA',y:8}];}
    } else if (r.finished) {
      g.fillStyle(0x1c0604, 0.88).fillRect(8, 20, 144, 76).lineStyle(1, 0xe8b440).strokeRect(8.5, 20.5, 143, 75);
      lines = [
        { text: this.level.title, y: 26, font: 'gold' },
        { text: 'COMPLETADO!', y: 38 },
        { text: `${r.bananas}/${r.totalBananas}`, y: 54, icon: 'hud-banana' },
        { text: v.demoEnding?(v.finalBonusAvailable?'K: NIVEL EXTRA':'K: VER RESUMEN'):v.campaign ? 'K: VOLVER AL MAPA' : 'FIN DE LA PRUEBA', y: 82, font: 'gold' },
      ];
      COLLECTIBLE_WORD.split('').forEach((ch, i) => icons.push({ frame: (v.campaign?.letters ?? r.letters)[i] === ch ? `hud-letter-${ch}` : 'hud-letter-empty', x: 55 + i * 10, y: 67 }));
    } else if (v.paused || v.focusLost) {
      const menu = v.paused && v.mapOption;
      g.fillStyle(0x1c0604, 0.88).fillRect(12, 56, 136, menu ? 42 : 30).lineStyle(1, 0xe8b440).strokeRect(12.5, 56.5, 135, menu ? 41 : 29);
      lines = v.paused
        ? v.mapConfirm
          ? [{ text: 'IR AL MAPA?', y: 60, font: 'gold' }, { text: 'J: SI', y: 73 }, { text: 'ESPACIO: NO', y: 85 }]
          : [{ text: 'PAUSA', y: 60, font: 'gold' }, { text: 'ESPACIO: SEGUIR', y: 73 }, ...(menu ? [{ text: 'J: IR AL MAPA', y: 85 }] : [])]
        : [{ text: 'CLIC EN LA', y: 60 }, { text: 'PANTALLA', y: 72 }];
    }
    if(v.touch)lines=lines.map(line=>({...line,text:controlText(line.text,true).replace('CLIC EN LA','TOCA LA')}));
    const key = JSON.stringify([lines, icons]);
    if (key === this.overlayKey) return;
    this.overlayKey = key;
    this.overlayLines.forEach(t => t.destroy()); this.overlayIcons.forEach(i => i.destroy());
    this.overlayIcons = [];
    this.overlayLines = lines.map(l => {
      const t = this.scene.add.bitmapText(80, l.y, l.font === 'gold' ? FONTS.gold : FONTS.plain, l.text).setLetterSpacing(-1);
      const width = t.width + (l.icon ? 12 : 0);
      t.setX(Math.round(80 - width / 2) + (l.icon ? 12 : 0));
      if (l.icon) icons.push({ frame: l.icon, x: t.x - 12, y: l.y - 1 });
      this.overlay.add(t); return t;
    });
    this.overlayIcons = icons.map(i => { const s = this.scene.add.image(i.x, i.y, ATLAS, i.frame).setOrigin(0); this.overlay.add(s); return s; });
  }

  /** Observable presentation state for tests and review (no side effects). */
  describe() {
    return {
      dkFrame: this.dkFrame, dkVisible: this.dk.visible, dkFlip: this.dk.flipX, dkX: this.dk.x, dkFeet: this.dk.y,
      gripVisible:this.grip.visible, gripOriginX:this.grip.originX, gripX:this.grip.x,
      carriedVisible: this.carried.visible, carriedY: this.carried.y,
      enemyFrames: this.enemies.map(e => e.sprite.visible ? e.sprite.frame.name : null),
      bananaFrames: [...this.pickups.values()].slice(0, 3).map(p => p.sprite.frame.name),
      starBarrel: this.star.visible ? this.star.frame.name : null,
      hudVisible: this.hud.visible, overlay: this.overlayLines.map(t => t.text),
      farX: this.far.tilePositionX, nearX: this.near.tilePositionX,
      backdrop: {farTint:this.far.tintTopLeft,shadeColor:this.practiceShade?.fillColor??null,shadeAlpha:this.practiceShade?.fillAlpha??0},
      landmarks:{palms:this.level.palms?.map(p=>p.platform)??[],exit:this.exitArt.frame.name,exitX:this.exitArt.x},
      tireFrames: this.tireSprites.map(t => t.frame.name),
    };
  }

  destroy() { this.statics.forEach(s => s.destroy()); }
}

export function ensureFonts(scene: Phaser.Scene) {
  for (const key of Object.values(FONTS)) {
    if (scene.cache.bitmapFont.exists(key)) continue;
    const data = Phaser.GameObjects.RetroFont.Parse(scene, {
      image: key, width: 8, height: 10, chars: FONT_CHARS, charsPerRow: 16,
      'spacing.x': 0, 'spacing.y': 0, 'offset.x': 0, 'offset.y': 0, lineSpacing: 0,
    });
    scene.cache.bitmapFont.add(key, data);
  }
}
