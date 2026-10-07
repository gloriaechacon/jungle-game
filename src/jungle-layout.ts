// Jungle Hijinxs (short adaptation) — single source of level data.
// Authored logical pixels (160x144 screen), not an extraction of the original map.
// Pure data, also loaded directly by node unit tests.
import { COLLECTIBLE_WORD } from './collectibles';
// Coordinates: solids are [x, y, width, height] from the top-left; entities use
// their centre (the player's centre is its 12x16 body centre, feet = y + 8).

export type Rect = readonly [number, number, number, number];
export interface Point { readonly x: number; readonly y: number }
export type EnemyKind = 'snake' | 'bee' | 'lizard';
export interface CheckpointData { readonly x:number; readonly spawn:Point; readonly minX:number; readonly maxX:number; readonly centerY:number; readonly rangeY:number }
export interface RopeData {
  /** Highest body-centre position reachable; may be below the visual anchor. */
  readonly climbTop?: number;
  readonly id: string; readonly x: number; readonly top: number; readonly bottom: number;
  readonly amplitude: number; readonly periodMs: number; readonly phase: number;
}

export interface LevelData {
  readonly id: string;
  readonly title: string;
  readonly width: number;
  readonly height: number;
  /** Player centre y beyond which a fall counts as lost. */
  readonly fallY: number;
  readonly hurtMs?: number;
  readonly theme?: 'night' | 'cave';
  /** Lowest camera scroll Y (keeps landings readable in tall levels). */
  readonly cameraTop?: number;
  /** 'readable': vertical camera keeps the lower landing in view (src/camera.ts). */
  readonly camera?: 'readable';
  /** Optional tall terraces: allow the camera above its normal rope-safe bound. */
  readonly cameraZones?: readonly {minX:number;maxX:number;top:number}[];
  /** Bouncy tires (Phase 8): bottom-centre on the ground; also listed in `solids`. */
  readonly tires?: readonly Point[];
  readonly ropes?: readonly RopeData[];
  readonly spawn: Point;
  readonly checkpoint: {
    readonly x: number;
    readonly spawn: Point;
    /** Activation zone for the player centre. */
    readonly minX: number; readonly maxX: number; readonly centerY: number; readonly rangeY: number;
  };
  readonly exit: { readonly x: number; readonly minY: number; readonly maxY: number };
  readonly solids: readonly Rect[];
  /** Thin ledges: collide only when landing from above. */
  readonly platforms?: readonly Rect[];
  /** Walkable palm crowns use the same one-way collision as ledges, not a rock facade. */
  readonly palms?: readonly { readonly platform: Rect; readonly base: number }[];
  readonly extraCheckpoints?: readonly CheckpointData[];
  readonly bananas: readonly (readonly [number, number])[];
  /** Optional upper-route reward; each bunch counts as ten ordinary bananas. */
  readonly bunches?: readonly Point[];
  /** Optional personal collectibles; provisional designs carry no powers. */
  readonly comodines?: readonly { readonly id: string; readonly x: number; readonly y: number }[];
  readonly letters: readonly { readonly letter: string; readonly x: number; readonly y: number; readonly recover: Point }[];
  /** Player x beyond which missed letters move to their recovery spot. */
  readonly letterRecoveryFromX: number;
  readonly enemies: readonly { readonly x: number; readonly y: number; readonly min: number; readonly max: number; readonly direction: 1 | -1; readonly speed?: number; readonly kind?: EnemyKind; readonly phase?:number }[];
  readonly barrels: readonly Point[];
  readonly markers: readonly { readonly x: number; readonly y: number; readonly label: string }[];
}

export const JUNGLE: LevelData = {
  id: 'jungle-hijinxs',
  title: 'JUNGLE HIJINXS',
  width: 2560, height: 192, fallY: 234,
  spawn: { x: 40, y: 108 },
  checkpoint: { x: 1264, spawn: { x: 1264, y: 116 }, minX: 1252, maxX: 1312, centerY: 110, rangeY: 36 },
  exit: { x: 2420, minY: 78, maxY: 130 },
  solids: [
    [0,124,320,68], [344,124,360,68], [736,124,448,68],
    [1212,124,388,68], [1632,124,928,68],
    [176,106,48,18], [248,90,48,34],
    [480,104,64,20], [584,88,64,36],
    [864,108,48,16], [944,92,56,32], [1016,108,24,16], [1040,76,64,48],
    [1376,104,56,20], [1472,88,64,36],
    [1808,108,64,16], [1904,92,64,32], [1984,108,32,16], [2016,76,80,48],
    [2144,92,64,32], [2240,108,64,16],
  ],
  bananas: [
    [80,112],[104,112],[128,112],[198,92],[274,76],[330,90],
    [450,112],[508,90],[612,74],[720,92],[886,94],[972,78],[1072,62],
    [1198,92],[1300,112],[1400,90],[1500,74],[1616,92],
    [1840,94],[1936,78],[2054,62],[2180,78],[2272,94],[2380,112],
  ],
  letters: [
    { letter: COLLECTIBLE_WORD[0], x: 400, y: 112, recover: { x: 2344, y: 112 } },
    { letter: COLLECTIBLE_WORD[1], x: 1720, y: 112, recover: { x: 2372, y: 112 } },
  ],
  letterRecoveryFromX: 2300,
  enemies: [
    { x: 812, y: 118, min: 792, max: 832, direction: -1 },
    { x: 1340, y: 118, min: 1320, max: 1352, direction: 1 },
    { x: 1772, y: 118, min: 1756, max: 1788, direction: -1 },
  ],
  barrels: [{ x: 756, y: 116 }, { x: 1288, y: 116 }, { x: 1680, y: 116 }],
  // Phase 3 greybox labels (the Phase 3 route still shows them).
  markers: [
    { x: 32, y: 64, label: 'CASA / INICIO' },
    { x: 400, y: 48, label: 'B / RESERVA' },
    { x: 752, y: 48, label: 'ENCUENTRO' },
    { x: 1264, y: 56, label: 'CHECKPOINT / RESERVA' },
    { x: 1720, y: 48, label: `${COLLECTIBLE_WORD[1]} / RESERVA` },
    { x: 1952, y: 28, label: 'TRAMO ALTO' },
    { x: 2420, y: 70, label: 'SALIDA' },
  ],
};

// Phase 6 keeps the original course available for regression/comparison.
// An opening lesson, a barrel encounter, then patrols on raised landings.
const JUNGLE_PALMS = [
  {platform:[120,56,48,8] as const,base:124},
  {platform:[64,28,48,8] as const,base:124},
  {platform:[1964,28,48,8] as const,base:124},
];
export const JUNGLE_PHASE6: LevelData = {
  ...JUNGLE,
  letters:JUNGLE.letters.map((l,i)=>({...l,x:i===1?1104:l.x,y:i===1?4:84})),
  id: 'jungle-phase6',
  hurtMs: 600,
  camera:'readable',cameraTop:0,
  cameraZones:[{minX:0,maxX:320,top:-64},{minX:860,maxX:1220,top:-112},{minX:1788,maxX:2140,top:-64}],
  palms:JUNGLE_PALMS,
  // Post-checkpoint gap 1600–1620 (20px): room for an early walking takeoff,
  // without changing B-01 or removing the need to jump.
  solids: [...JUNGLE.solids.filter(s=>s[1]===124).flatMap(s => s[0] === 1632 ?
    // Final crossing: a short, visible gap, with safe ground on both sides.
    [[1620,124,596,68],[2248,124,312,68]] as const : [s]),
    [864,108,48,16],[1376,92,56,32],
    // Continuous mountain: a broad first step, then a second 24px rise.
    [1808,100,80,24],[1848,76,40,24],
    // This ridge joins the floor visually and physically: walking cannot bypass it.
    [2112,96,48,28]],
  platforms: [...JUNGLE.solids.filter(s=>s[1]<124 && ![864,1376,1016,1040,1808,2144].includes(s[0])).map(([x,y,w])=>
    [x===2240?2248:x,x===1904?60:Math.min(y,84),x===2240?56:w,8] as const),
    // A sheltered lower path and an optional four-storey lookout above it.
    [1008,52,56,8],[1068,20,56,8],[1008,-12,56,8],
    // A first discovery above the house, then a later reuse above the final patrol.
    ...JUNGLE_PALMS.map(p=>p.platform)],
  bananas: JUNGLE.bananas.filter(([x])=>![274,612,2054].includes(x)).map(([x,y]) => x===1616 ? [1610,84] as const :
    [x===2180?2144:x,x===2180?82:x===1072?6:x===886?94:x===1400?78:x===1840?86:x===1936?46:JUNGLE.solids.some(([sx,sy,w])=>sy<124&&x>=sx&&x<sx+w)?Math.min(y,70):y] as const).concat([[1036,38],[1868,62],[2232,88],[144,42],[1988,14]]),
  // Append rewards so existing campaign pickup IDs keep their meaning.
  bunches:[{x:274,y:68},{x:612,y:68},{x:2054,y:60},{x:1036,y:-28},{x:88,y:12}],
  enemies: [
    { x: 144, y: 118, min: 126, max: 154, direction: -1, speed: 24 },
    { x: 508, y: 78, min: 494, max: 528, direction: 1, speed: 28 },
    ...JUNGLE.enemies.map((e, i) => ({ ...e, speed: i === 0 ? 24 : i===2?46:34, kind:i===2?'lizard' as const:undefined })),
    // The lower route now has encounters too. Upper shelves remain an alternative.
    { x: 1980, y: 118, min: 1960, max: 2004, direction: -1, speed: 32 },
    // Leave >40px of landing space after the gap, and a calm letter/exit clearing.
    { x: 2310, y: 118, min: 2298, max: 2322, direction: -1, speed: 48, kind:'lizard', phase:900 },
    { x:628,y:52,min:568,max:688,direction:-1,speed:28,kind:'bee' },
    { x:2058,y:44,min:1976,max:2100,direction:1,speed:30,kind:'bee',phase:700 },
    // Introduce hopping rivals gradually, on supported ground with room to react.
    // Append so existing enemy identities stay stable across retries/tests.
    { x:1006,y:118,min:976,max:1032,direction:-1,speed:42,kind:'lizard',phase:350 },
    { x:1506,y:118,min:1470,max:1528,direction:1,speed:44,kind:'lizard',phase:950 },
  ],
  barrels: [...JUNGLE.barrels,{x:1918,y:116}],
};
