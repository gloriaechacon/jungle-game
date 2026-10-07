// Level rules, independent of Phaser and rendering. All times are active
// simulation milliseconds: the scene advances them only in fixed physics steps,
// so pause, focus loss and completion freeze them by construction.
// Pure data imports only: node unit tests load this file directly.
import { COLLECTIBLE_WORD } from './collectibles';
import type { LevelData, Rect, EnemyKind } from './jungle-layout';

export type PlayerFrame = { x: number; y: number; vy: number; grounded: boolean; previousFeet: number };
export type ActionFrame = { left: boolean; right: boolean; b: boolean };
export type Solid = Rect;
export type Pickup = { id: string; x: number; y: number; letter?: string; special?: string; value?:number; collected: boolean; collectedAt?: number };
export type Enemy = { x: number; y: number; homeY:number; min: number; max: number; direction: number; speed?: number; kind?:EnemyKind; phase?:number; alive: boolean; defeatedAt?: number; defeatedBy?: 'stomp' | 'roll' | 'barrel' };
/** Two distinct, deterministic hazards. No timers outside the simulation clock. */
export function enemyHeight(kind:EnemyKind|undefined,homeY:number,now:number,phase=0){
  if(kind==='bee')return homeY+Math.sin((now+phase)*Math.PI*2/2400)*6;
  if(kind==='lizard'){
    // Higher/faster hops, with an 800ms grounded window for a fair counterattack.
    const t=(now+phase)%1400;
    return homeY-(t<600?36*4*(t/600)*(1-t/600):0);
  }
  return homeY;
}
export type Barrel = { origin: number; originY: number; x: number; y: number; vx: number; vy: number; state: 'ready' | 'carried' | 'thrown' | 'spent'; expires: number; thrownAt?: number; spentAt?: number };

/**
 * Collision/interaction envelopes in logical pixels (half extents unless noted).
 * These are gameplay sizes, deliberately independent of the art (see art-spec.ts).
 * Values are the Phase 4 numbers, centralised without changes.
 */
export const HITBOX = Object.freeze({
  enemy: { halfW: 7, halfH: 6 },
  /** A stomp counts if the feet were at most this far below the enemy top in the previous step. */
  stompTolerance: 3,
  pickup: { rangeX: 11, rangeY: 14 },
  barrel: { half: 8 },
  barrelGrab: { rangeX: 22, rangeY: 20 },
  barrelHit: { rangeX: 15, rangeY: 14 },
  /** Logical position of a carried barrel relative to the player centre (not the drawing anchor). */
  carryOffset: { x: 12, y: -14 },
  throwOffset: { x: 15, y: -6 },
});

/** Phase 4 action values (own choices, not measurements of the original). */
export const ACTION = Object.freeze({
  rollMs: 300,
  stompBounce: 150,
  enemySpeed: 18,
  throwVx: 190,
  throwVy: -60,
  barrelLifeMs: 2500,
  invulnerableMs: 1500,
  hudMs: 2500,
  hudInitialMs: 3000,
  /** Guard for a single rules step; the scene always passes one fixed physics step. */
  maxStepMs: 1000 / 30,
});

export interface RulesOptions {
  /** Gravity for thrown barrels: the scene passes the shared B-01 gravity (MOVEMENT.gravity). */
  readonly gravity: number;
  /** Player body size (B-01 width/height). */
  readonly playerWidth: number;
  readonly playerHeight: number;
}

export class LevelRules {
  now = 0;
  hudUntil: number = ACTION.hudInitialMs;
  rollUntil = 0;
  rollStartedAt = -Infinity;
  invulnerableUntil = 0;
  facing = 1;
  checkpoint = false;
  checkpointIndex = -1;
  checkpointAt?: number;
  finished = false;
  finishedAt?: number;
  deaths = 0;
  lastThrowAt = -Infinity;
  lastPickupAt = -Infinity;
  hurtAt: number | undefined;
  private hurtUntil = 0;
  kills = { stomp: 0, roll: 0, barrel: 0 };
  readonly level: LevelData;
  private previousB = false;
  private readonly options: RulesOptions;
  pickups: Pickup[];
  enemies: Enemy[];
  barrels: Barrel[];

  constructor(level: LevelData, options: RulesOptions) {
    this.level = level;
    this.options = options;
    this.pickups = [
      ...level.bananas.map(([x, y], i) => ({ id: `banana-${i}`, x, y, collected: false })),
      ...(level.bunches??[]).map(({x,y},i)=>({id:`bunch-${i}`,x,y,value:10,collected:false})),
      ...level.letters.map(l => ({ id: l.letter, x: l.x, y: l.y, letter: l.letter, collected: false })),
      ...(level.comodines ?? []).map(c => ({id:`comodin-${c.id}`,x:c.x,y:c.y,special:c.id,collected:false})),
    ];
    this.enemies = level.enemies.map(e => ({ ...e, homeY:e.y, alive: true }));
    this.barrels = level.barrels.map(b => ({ origin: b.x, originY: b.y, x: b.x, y: b.y, vx: 0, vy: 0, state: 'ready' as const, expires: 0 }));
  }

  get bananas() { return this.pickups.filter(p => !p.letter && !p.special && p.collected).reduce((n,p)=>n+(p.value??1),0); }
  get totalBananas() { return this.pickups.filter(p => !p.letter && !p.special).reduce((n,p)=>n+(p.value??1),0); }
  get comodines() { return this.pickups.filter(p => p.special && p.collected).length; }
  get letters() { return COLLECTIBLE_WORD.split('').map(l => this.pickups.some(p => p.letter === l && p.collected) ? l : '-').join(''); }
  get rolling() { return this.now < this.rollUntil; }
  get dying() { return this.hurtAt !== undefined; }
  get carried() { return this.barrels.find(b => b.state === 'carried'); }
  get checkpoints() { return [this.level.checkpoint,...(this.level.extraCheckpoints ?? [])]; }
  get spawn() { return this.checkpointIndex >= 0 ? this.checkpoints[this.checkpointIndex].spawn : this.level.spawn; }
  get hudVisible() { return this.now < this.hudUntil || this.finished; }
  private notify() { this.hudUntil = this.now + ACTION.hudMs; }

  // Resync after pause/focus loss: never throw or roll from a cleared key.
  syncInput(state: ActionFrame) { this.previousB = state.b; }

  /** Continuous direction, separate from B edges. Held input after a respawn,
   * pause or rope must turn the sprite without replaying an attack/throw. */
  faceInput(state:ActionFrame) {
    if(!this.finished && !this.dying && state.left!==state.right)this.facing=state.right?1:-1;
  }

  input(state: ActionFrame, player: PlayerFrame) {
    if (this.finished || this.dying) { this.syncInput(state); return; }
    this.faceInput(state);
    if (state.b && !this.previousB) {
      const g = HITBOX.barrelGrab;
      const nearby = this.barrels.find(b => b.state === 'ready' && Math.abs(b.x - player.x) < g.rangeX && Math.abs(b.y - player.y) < g.rangeY);
      if (!this.carried && nearby) { nearby.state = 'carried'; this.rollUntil = 0; this.lastPickupAt = this.now; this.notify(); }
      else if (!this.carried && player.grounded && !this.rolling) { this.rollUntil = this.now + ACTION.rollMs; this.rollStartedAt = this.now; }
    }
    if (!state.b && this.previousB && this.carried) {
      const b = this.carried;
      Object.assign(b, {
        state: 'thrown', x: player.x + this.facing * HITBOX.throwOffset.x, y: player.y + HITBOX.throwOffset.y,
        vx: this.facing * ACTION.throwVx, vy: ACTION.throwVy, expires: this.now + ACTION.barrelLifeMs, thrownAt: this.now,
      });
      this.lastThrowAt = this.now;
      this.notify();
    }
    this.previousB = state.b;
  }

  respawn() {
    this.hurtAt = undefined;
    this.hurtUntil = 0;
    this.deaths++;
    this.rollUntil = 0;
    this.invulnerableUntil = this.now + ACTION.invulnerableMs;
    // Pickups and defeated enemies persist; barrels replenish for another attempt.
    for (const b of this.barrels) Object.assign(b, { x: b.origin, y: b.originY, vx: 0, vy: 0, state: 'ready', expires: 0, thrownAt: undefined, spentAt: undefined });
    this.notify();
  }

  /** Advance one simulation step. Returns interaction results for the scene. */
  beginHurt() {
    if (this.dying || this.finished) return;
    this.hurtAt = this.now;
    this.hurtUntil = this.now + (this.level.hurtMs ?? 0);
    this.rollUntil = 0;
  }

  step(deltaMs: number, p: PlayerFrame): { hurt: boolean; bounce: boolean; respawn: boolean } {
    const result = { hurt: false, bounce: false, respawn: false };
    if (this.finished) return result;
    const dt = Math.min(Math.max(deltaMs, 0), ACTION.maxStepMs);
    this.now += dt;
    // Impact is a simulation state, not a wall-clock timeout. Pausing freezes it.
    // During it there are no pickups, attacks or further hits.
    if (this.dying) { result.respawn = this.now >= this.hurtUntil; return result; }
    const seconds = dt / 1000;
    const halfW = this.options.playerWidth / 2, halfH = this.options.playerHeight / 2;
    for (const enemy of this.enemies) if (enemy.alive) {
      enemy.y=enemyHeight(enemy.kind,enemy.homeY,this.now,enemy.phase);
      enemy.x += enemy.direction * (enemy.speed ?? ACTION.enemySpeed) * seconds;
      if (enemy.x <= enemy.min || enemy.x >= enemy.max) {
        enemy.x = Math.max(enemy.min, Math.min(enemy.max, enemy.x)); enemy.direction *= -1;
      }
    }
    const bh = HITBOX.barrel.half;
    for (const b of this.barrels) {
      if (b.state === 'carried') { b.x = p.x + this.facing * HITBOX.carryOffset.x; b.y = p.y + HITBOX.carryOffset.y; }
      if (b.state !== 'thrown') continue;
      const oldBottom = b.y + bh;
      b.vy += this.options.gravity * seconds; b.x += b.vx * seconds; b.y += b.vy * seconds;
      for (const [x, y, w, h] of this.level.solids) {
        if (b.x + bh <= x || b.x - bh >= x + w || b.y + bh < y || b.y - bh >= y + h) continue;
        if (oldBottom <= y + 0.1 && b.vy >= 0) { b.y = y - bh; b.vy = 0; }
        else { this.spend(b); break; }
      }
      for (const [x,y,w] of this.level.platforms ?? []) {
        if (b.x+bh>x && b.x-bh<x+w && oldBottom<=y+0.1 && b.y+bh>=y && b.vy>=0) { b.y=y-bh; b.vy=0; }
      }
      if (b.state === 'thrown' && (this.now >= b.expires || b.y > this.level.height + 48 || b.x < 0 || b.x > this.level.width)) this.spend(b);
      if (b.state !== 'thrown') continue;
      const r = HITBOX.barrelHit;
      for (const e of this.enemies) if (e.alive && Math.abs(e.x - b.x) < r.rangeX && Math.abs(e.y - b.y) < r.rangeY) {
        this.defeat(e, 'barrel'); this.spend(b); break;
      }
    }
    const rec = this.level.letterRecoveryFromX;
    for (const item of this.pickups) {
      if (item.collected) continue;
      // Second opportunity on safe ground; exit is never gated by a letter.
      if (item.letter && p.x > rec) {
        const spot = this.level.letters.find(l => l.letter === item.letter)!.recover;
        item.x = spot.x; item.y = spot.y;
      }
      if (Math.abs(p.x - item.x) < HITBOX.pickup.rangeX && Math.abs(p.y - item.y) < HITBOX.pickup.rangeY) {
        item.collected = true; item.collectedAt = this.now; this.notify();
      }
    }
    this.checkpoints.forEach((cp,i)=>{
      if (i>this.checkpointIndex && p.x>=cp.minX && p.x<=cp.maxX && Math.abs(p.y-cp.centerY)<cp.rangeY) {
        this.checkpoint=true;this.checkpointIndex=i;this.checkpointAt=this.now;this.notify();
      }
    });
    const eh = HITBOX.enemy;
    for (const e of this.enemies) {
      if (!e.alive || Math.abs(p.x - e.x) >= halfW + eh.halfW || p.y + halfH < e.y - eh.halfH || p.y - halfH > e.y + eh.halfH) continue;
      if (e.kind!=='bee' && p.vy > 0 && p.previousFeet <= e.y - eh.halfH + HITBOX.stompTolerance) {
        this.defeat(e, 'stomp'); result.bounce = true;
      } else if (e.kind!=='bee' && this.rolling && p.grounded) {
        this.defeat(e, 'roll');
      } else if (this.now >= this.invulnerableUntil) { result.hurt = true; }
    }
    if (result.hurt && this.level.hurtMs) this.beginHurt();
    const ex = this.level.exit;
    if (!result.hurt && p.x >= ex.x && p.y > ex.minY && p.y < ex.maxY) {
      this.finished = true; this.finishedAt = this.now; this.rollUntil = 0; this.notify();
    }
    return result;
  }

  private defeat(e: Enemy, by: 'stomp' | 'roll' | 'barrel') {
    e.alive = false; e.defeatedAt = this.now; e.defeatedBy = by; this.kills[by]++; this.notify();
  }

  private spend(b: Barrel) { b.state = 'spent'; b.spentAt = this.now; }

  snapshot() {
    return { bananas: this.bananas, letters: this.letters, checkpoint: this.checkpoint, checkpointIndex:this.checkpointIndex, rolling: this.rolling,
      carrying: !!this.carried, finished: this.finished, deaths: this.deaths, kills: { ...this.kills }, time: Math.round(this.now * 1000) / 1000,
      facing: this.facing, invulnerable: this.now < this.invulnerableUntil, dying: this.dying,
      pickups: this.pickups.filter(p => p.letter).map(p => ({ id: p.id, x: p.x, y: p.y, collected: p.collected })),
      bunches:this.pickups.filter(p=>p.value===10).map(p=>({x:p.x,y:p.y,collected:p.collected})),
      enemies: this.enemies.map(e => ({ x: e.x, y:e.y, kind:e.kind??'gnawty', alive: e.alive, direction: e.direction })), barrels: this.barrels.map(b => ({ x: b.x, y: b.y, state: b.state })) };
  }
}

/** Kept for the Phase 4 name; Jungle is the only level implemented. */
export { LevelRules as JungleRules };
