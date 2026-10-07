import Phaser from 'phaser';
import { type InputSnapshot } from './input';
import { MOVEMENT as T } from './tuning';

// B-01 movement controller. The movement rules below are unchanged from the
// approved Phase B code; Phase 4/5 only added spawn handling, input resync and a
// single entry point (bounce) for gameplay effects on the body.
export class PlayerController {
  readonly shape: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  private lastGrounded = -Infinity;
  private bufferedAt = -Infinity;
  private previousJump = false;
  private jumpAvailable = false;
  private jumped = false;
  private jumpedAt = -Infinity;
  private state: InputSnapshot;
  private spawn: { x: number; y: number };

  constructor(scene: Phaser.Scene, initial: InputSnapshot, spawn = { x: 24, y: 108 }) {
    this.spawn = spawn;
    this.state = initial;
    this.shape = scene.add.rectangle(spawn.x, spawn.y, T.width, T.height, 0xebc66a);
    scene.physics.add.existing(this.shape);
    this.body = this.shape.body as Phaser.Physics.Arcade.Body;
    this.body.setMaxVelocity(T.runSpeed, T.maxFallSpeed).setCollideWorldBounds(true);
    this.body.setSize(T.width, T.height);
  }

  input(state: InputSnapshot, now: number) {
    if (state.a && !this.previousJump) this.bufferedAt = now;
    if (!state.a && this.previousJump && this.body.velocity.y < -T.jumpCutSpeed) {
      this.body.setVelocityY(-T.jumpCutSpeed);
    }
    this.previousJump = state.a;
    this.state = state;
  }

  get grounded() { return this.body.blocked.down && this.body.velocity.y >= 0; }

  /** Read-only audio observation; rejected/buffered presses do not emit a jump. */
  get lastJumpAt() { return this.jumpedAt; }

  /** Body centre and feet read from the physics body, valid inside a physics step. */
  get centerX() { return this.body.position.x + this.body.halfWidth; }
  get centerY() { return this.body.position.y + this.body.halfHeight; }
  get feet() { return this.body.position.y + this.body.height; }

  update(now: number, delta: number) {
    if (this.grounded) {
      this.lastGrounded = now;
      this.jumpAvailable = true;
      this.jumped = false;
    }
    const direction = Number(this.state.right) - Number(this.state.left);
    const speed = this.state.b ? T.runSpeed : T.walkSpeed;
    const target = direction * speed;
    const step = (direction ? T.acceleration : T.braking) * Math.min(delta, 33.34) / 1000;
    const vx = this.body.velocity.x;
    this.body.setVelocityX(vx + Phaser.Math.Clamp(target-vx, -step, step));
    if (now-this.bufferedAt <= T.bufferMs && this.jumpAvailable && !this.jumped && now-this.lastGrounded <= T.coyoteMs) {
      this.body.setVelocityY(-T.jumpSpeed);
      this.bufferedAt = -Infinity;
      this.lastGrounded = -Infinity;
      this.jumpAvailable = false;
      this.jumped = true;
      this.jumpedAt = now;
      // A tap buffered before landing remains a short jump.
      if (!this.state.a) this.body.setVelocityY(-T.jumpCutSpeed);
    }
  }

  /**
   * Stomp rebound (fixed speed, Phase 4 value). Precedence: a jump accepted in
   * this same simulation step is kept and the rebound is ignored. Otherwise the
   * rebound replaces the vertical speed and consumes ground tolerance, so the
   * rebound cannot be followed by an extra coyote jump. Returns true if applied.
   */
  bounce(speed: number, now: number): boolean {
    if (this.jumpedAt === now) return false;
    this.body.setVelocityY(-speed);
    this.lastGrounded = -Infinity;
    this.jumpAvailable = false;
    this.jumped = true;
    return true;
  }

  /** Drop a pending buffered press (used on respawn). */
  clearBuffer() { this.bufferedAt = -Infinity; this.lastGrounded = -Infinity; this.jumpAvailable = false; }

  /** Deliberate drop is not walking off an edge: no coyote/buffered ghost jump. */
  dropThrough() {
    this.clearBuffer(); this.jumped=true;
    this.body.position.y+=1;
    this.body.blocked.down=false;
    this.body.touching.down=false;
    this.body.setVelocityY(Math.max(0,this.body.velocity.y));
  }

  /**
   * Resync after pause/focus loss/completion. Simulation time is frozen while
   * paused, so ground tolerance is preserved; a press buffered before the pause
   * is dropped so it cannot fire as a delayed "ghost" jump after resuming.
   */
  syncInput(state: InputSnapshot) { this.state = state; this.previousJump = state.a; this.bufferedAt = -Infinity; }

  setSpawn(spawn: { x: number; y: number }) { this.spawn = spawn; }

  reset(state: InputSnapshot) {
    this.body.reset(this.spawn.x, this.spawn.y);
    this.body.setVelocity(0, 0);
    this.state = state;
    this.previousJump = state.a;
    this.jumped = false;
    this.clearBuffer();
  }
}
