import type { LevelData } from './jungle-layout';
import { COLLECTIBLE_WORD } from './collectibles';

// 180px landing floor stays at or above screen y=132. A full B-01 jump
// from centre y=116 peaks near y=73: the 32px sprite also remains visible.
export const ROPEY_CAMERA_TOP = 48;

// Phase 7: authored short route, not an extraction of the original map.
export const ROPEY: LevelData = {
  id: 'ropey-rampage', title: 'ROPEY RAMPAGE', theme: 'night',
  width: 2400, height: 256, fallY: 296, hurtMs: 600,
  camera:'readable',cameraTop:ROPEY_CAMERA_TOP,
  cameraZones:[{minX:860,maxX:1200,top:-64},{minX:1200,maxX:1620,top:-96},{minX:1920,maxX:2220,top:-32}],
  spawn: { x: 40, y: 172 },
  checkpoint: { x: 650, spawn: { x: 650, y: 172 }, minX: 635, maxX: 682, centerY: 166, rangeY: 30 },
  extraCheckpoints: [{x:1560,spawn:{x:1560,y:172},minX:1540,maxX:1580,centerY:166,rangeY:30}],
  platforms: [[510,140,56,6],[964,108,64,8],[1380,132,64,8],[2012,108,72,8],
    [1054,76,64,8],[1468,140,56,8],[2110,140,64,8],
    // Upper zigzag is optional; its base below is now a mandatory solid climb.
    [1332,108,48,8],[1388,76,48,8],[1444,44,56,8],[1388,12,48,8]],
  bunches:[{x:996,y:92},{x:2048,y:92},{x:1412,y:-4}],
  exit: { x: 2300, minY: 135, maxY: 185 },
  solids: [
    [0,180,320,76], [400,180,340,76], [832,180,328,76], [1192,180,608,76], [1872,180,528,76],
    [400,152,80,28],
    // Alternating solid climbs break up the formerly walk-only galleries.
    // The first summit is 40px above the floor: reachable again from the right
    // after missing the banana route (B-01 jump ~43px). Rope landings stay clear.
    [888,156,76,24],[924,140,40,16],
    [1300,156,80,24],[1332,132,48,24],
    [1660,156,64,24],
    [1940,156,64,24],[1972,132,32,24],
  ],
  ropes: [
    { id:'practice', x:144, top:28, bottom:172, climbTop:116, amplitude:0, periodMs:3200, phase:0 },
    // Phase 8 review: the swinging ropes end at y=140 instead of touching the
    // floor. Hanging at the old bottom (172) swung DK into the 400/152 step and
    // dropped him into the pit. Amplitudes are scaled (50*116/148, 56*132/164)
    // so every point from the anchor down to y=140 swings exactly as before.
    { id:'crossing-1', x:360, top:24, bottom:140, climbTop:116, amplitude:50*116/148, periodMs:3200, phase:0 },
    { id:'crossing-2', x:786, top:8, bottom:140, climbTop:116, amplitude:56*132/164, periodMs:3600, phase:1 },
    { id:'crossing-3', x:1836, top:24, bottom:140, climbTop:116, amplitude:30, periodMs:2600, phase:0.4 },
  ],
  bananas: [[80,168],[106,168],[144,150],[144,134],[144,118],[230,168],[284,148],
    [334,124],[372,112],[430,138],[536,126],[610,168],[704,146],
    [758,126],[802,116],[862,168],[908,142],[1080,62],
    [1176,143],[1240,168],[1316,142],[1410,118],[1496,126],[1590,168],
    [1688,142],[1760,160],[1810,126],[1848,114],[1904,160],[1956,142],[2136,126],[2240,168],
    [1356,94],[1412,62],[1472,30]],
  letters: [
    {letter:COLLECTIBLE_WORD[2],x:578,y:140,recover:{x:2250,y:168}},
    // Visible reward on the first bee's banana ledge, beyond the beaver wall.
    {letter:COLLECTIBLE_WORD[3],x:1020,y:92,recover:{x:2280,y:168}},
  ],
  letterRecoveryFromX:2240,
  enemies: [
    {x:544,y:134,min:524,max:552,direction:-1,speed:24},
    {x:948,y:134,min:936,max:952,direction:1,speed:28},
    {x:1264,y:174,min:1236,max:1280,direction:-1,speed:42,kind:'lizard'},
    {x:1412,y:126,min:1394,max:1430,direction:1,speed:28},
    {x:1988,y:126,min:1980,max:1996,direction:-1,speed:30},
    {x:2200,y:174,min:2190,max:2220,direction:1,speed:46,kind:'lizard',phase:900},
    {x:1008,y:84,min:968,max:1084,direction:-1,speed:26,kind:'bee'},
    {x:2050,y:82,min:2020,max:2150,direction:1,speed:30,kind:'bee',phase:500},
    // One extra lower-route encounter; the bee stays well above its hop arc.
    {x:1080,y:174,min:1052,max:1120,direction:-1,speed:44,kind:'lizard',phase:350},
  ],
  barrels:[{x:490,y:172},{x:684,y:172},{x:1210,y:172},{x:2158,y:132}],
  // Practice column: the last banana sits at the climb limit (y=116) so the
  // first rope teaches climbing to the top without asking for a jump.
  markers:[{x:74,y:112,label:'W AGARRA'},{x:74,y:120,label:'W S TREPA'},
    {x:74,y:128,label:'K SALTA'},{x:238,y:120,label:'SALTA A'},{x:238,y:128,label:'LA LIANA'},
    {x:624,y:128,label:'CHECKPOINT'},{x:1750,y:116,label:'OTRO BALANCEO'},{x:2250,y:128,label:'SALIDA'}],
};
