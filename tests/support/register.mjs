// Node unit-test loader: lets `node --experimental-strip-types` import the game's
// TypeScript sources directly. Extensionless relative imports resolve to .ts and
// 'phaser' resolves to a tiny stub (only Phaser.Math.Clamp is used by player.ts).
import { register } from 'node:module';
register('./resolve-hooks.mjs', import.meta.url);
