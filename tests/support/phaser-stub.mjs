// Math for controller tests; scene identity/lifecycle for presentation unit tests.
const Phaser = { Math: { Clamp: (v, min, max) => Math.max(min, Math.min(max, v)) },
  Scene:class {constructor(key){this.scene={key};}},Scenes:{Events:{SHUTDOWN:'shutdown'}},
  Physics:{Arcade:{Events:{WORLD_STEP:'worldstep'}}} };
export default Phaser;
