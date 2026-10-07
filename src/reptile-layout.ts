import type { LevelData, Point, Rect } from './jungle-layout';
import { tireRect } from './tires';
import { COLLECTIBLE_WORD } from './collectibles';

// Phase 8: Reptile Rumble, short GBC-style cave adaptation. Authored logical
// pixels, not an extraction of the original map. Floor top y=180 (DK centre 172).
//
// Staged route (each idea first appears over safe ground, with a nearby return).
// Each tire touches the next higher ground, so a short bounce never leaves DK in
// a pocket between tire and wall: he falls back onto the tire and bounces again.
//   1. Flat start, one slow snake.
//   2. First tire (x=356) on safe floor: any bounce reaches the 48 px ledge.
//      The optional S floats right above it and needs the high bounce (hold K).
//   3. Snake on the ledge, barrel + snake on the floor.
//   4. Second tire (x=744) before a 64 px wall: the low bounce does not clear
//      it, the high one does. Failing only drops DK back next to the tire.
//   5. Checkpoint, one 32 px gap (easy at walking speed), barrel + snake.
//   6. Final ascent: third tire → 48 px step → two 32 px normal jumps → exit
//      on a clear plateau.
// No low tunnels: crouching is not needed and was not implemented.
export const REPTILE_TIRES: readonly Point[] = [{ x: 356, y: 180 }, { x: 744, y: 180 }, { x: 1176, y: 180 }, { x: 1844, y: 180 }];

const ground: Rect[] = [
  [0, 180, 940, 76], [972, 180, 1332, 76],
  [756, 116, 48, 64],                      // wall right against the second tire
  [1272, 100, 64, 80], [1336, 68, 264, 112], // final ascent + exit plateau
  [1428,36,36,32], [1464,4,40,64],          // rock wall with a narrow projecting step
  // Descending gallery followed by a rebound and a second, guarded ascent.
  [1856,132,88,48], [1944,100,64,80], [2008,68,296,112],
];

export const REPTILE: LevelData = {
  id: 'reptile-rumble', title: 'REPTILE RUMBLE', theme: 'cave',
  width: 2304, height: 256, fallY: 296, hurtMs: 600, cameraTop: -96, camera: 'readable',
  platforms: [[368,132,192,8],[600,132,112,8],[1188,132,84,8],[1600,100,80,8],[1680,132,96,8]],
  bunches:[{x:520,y:116},{x:664,y:116},{x:1230,y:116},{x:1636,y:84},{x:1484,y:-12}],
  spawn: { x: 40, y: 172 },
  checkpoint: { x: 880, spawn: { x: 880, y: 172 }, minX: 865, maxX: 912, centerY: 166, rangeY: 30 },
  exit: { x: 2240, minY: 40, maxY: 76 },
  tires: REPTILE_TIRES,
  solids: [...ground, ...REPTILE_TIRES.map(tireRect)],
  bananas: [[70,168],[90,168],[110,168],[235,150],[384,120],[440,124],[470,124],
    [575,150],[630,168],[700,150],[764,104],[800,100],[850,168],[956,150],[1000,168],[1075,150],
    [1130,168],[1304,92],[1370,60],[1410,60],[1450,22],
    [1550,60],[1720,120],[1794,168],[1856,110],[1900,120],[1976,88],[2040,56],[2150,56],[2200,56]],
  letters: [
    { letter: COLLECTIBLE_WORD[4], x: 356, y: 80, recover: { x: 2190, y: 60 } },
  ],
  letterRecoveryFromX: 2160,
  enemies: [
    { x: 240, y: 174, min: 200, max: 270, direction: -1, speed: 28, kind: 'snake' },
    { x: 500, y: 126, min: 430, max: 540, direction: 1, speed: 30, kind: 'snake' },
    { x: 680, y: 174, min: 640, max: 710, direction: -1, speed: 32, kind: 'snake' },
    { x: 1080, y: 174, min: 1040, max: 1120, direction: 1, speed: 44, kind: 'lizard' },
    // Leave a clear landing after the descent before the next patrol begins.
    { x: 1750, y: 126, min: 1736, max: 1762, direction: -1, speed: 32, kind: 'snake' },
    { x: 2110, y: 62, min: 2072, max: 2140, direction: -1, speed: 34, kind: 'snake' },
    // The insect guards an OPTIONAL gallery, never the third tire's forced landing.
    { x:672,y:104,min:604,max:724,direction:-1,speed:30,kind:'bee',phase:300},
    // More encounters, with 44px to land after the ascent and no spawn overlap.
    { x:1398,y:62,min:1380,max:1414,direction:1,speed:42,kind:'lizard',phase:650},
    { x:1650,y:174,min:1620,max:1670,direction:-1,speed:32,kind:'snake'},
  ],
  barrels: [{ x: 600, y: 172 }, { x: 1010, y: 172 }, {x:1540,y:60}, {x:2044,y:60}],
  markers: [
    { x: 282, y: 118, label: 'SALTA EN' }, { x: 282, y: 126, label: 'LA LLANTA' },
    { x: 676, y: 110, label: 'MANTENE K' }, { x: 676, y: 118, label: 'AL REBOTAR' },
    {x:1784,y:118,label:'OTRA SUBIDA'},
  ],
};
