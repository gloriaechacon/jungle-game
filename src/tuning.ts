// Phase B B-01 approved by the user on 2026-09-25. Units: logical pixels and seconds.
// Future art and levels must not modify these values without explicit approval.
export const MOVEMENT = Object.freeze({
  version: 'B-01',
  walkSpeed: 60,
  runSpeed: 102,
  acceleration: 650,
  braking: 850,
  gravity: 640,
  jumpSpeed: 235,
  jumpCutSpeed: 105,
  maxFallSpeed: 280,
  coyoteMs: 100,
  bufferMs: 110,
  width: 12,
  height: 16,
});
