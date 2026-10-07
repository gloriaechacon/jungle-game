// Enemies, pickups, barrels, signs, effects and HUD pieces (original art, GBC-inspired).
// ASCII sources are the editable master for small sprites: one char = one logical pixel.
import { Pix, hex } from './pixel.mjs';

// Neutral placeholder: turquoise keepsake card, distinct from bananas and checkpoints.
export function comodin() {
  const p=new Pix(12,14);
  p.rect(1,1,10,12,hex('#112d30'));
  p.rect(2,2,8,10,hex('#37988c'));
  p.rect(2,2,1,9,hex('#b8edcf')); p.rect(2,2,7,1,hex('#b8edcf'));
  p.rect(8,4,1,7,hex('#21615e'));
  p.polygon([[6,4],[8,7],[6,10],[4,7]],hex('#fff0b6'));
  return p;
}

export const C = {
  K: hex('#1c0604'),
  // Gnawty-like beaver (grey in the reference video)
  g1: hex('#34302e'), g2: hex('#6e6964'), g3: hex('#a8a198'), g4: hex('#d2cbc0'), w: hex('#fff4e6'), n: hex('#c0706a'),
  // banana
  y1: hex('#d9922a'), y2: hex('#f4cc4a'), y3: hex('#fff09a'), bt: hex('#5a2a10'),
  // gold letter tile
  o1: hex('#b0741e'), o2: hex('#e8b440'), o3: hex('#ffe08a'), ol: hex('#5a2a10'),
  // wood barrel
  b1: hex('#6a3418'), b2: hex('#a4582a'), b3: hex('#d68a4c'), b4: hex('#f0b878'), h1: hex('#3c3434'), h2: hex('#7a7270'),
  // star
  s1: hex('#e8a020'), s2: hex('#ffe060'), s3: hex('#fffbe0'),
  // sign
  r1: hex('#b8282c'), r2: hex('#e85a50'),
};

const pal = {
  K: C.K, '1': C.g1, '2': C.g2, '3': C.g3, '4': C.g4, w: C.w, n: C.n,
  a: C.y1, b: C.y2, c: C.y3, t: C.bt,
  o: C.o1, p: C.o2, q: C.o3, l: C.ol,
  d: C.b1, e: C.b2, f: C.b3, g: C.b4, h: C.h1, i: C.h2,
  s: C.s1, u: C.s2, v: C.s3, r: C.r1, x: C.r2,
};
export const art = (w, h, rows) => new Pix(w, h).ascii(0, 0, rows, pal);

// --- Gnawty-style beaver, 22x16, faces right, feet on the bottom row.
const gnawtyBody = [
  '......................',
  '......................',
  '..........KKKK........',
  '........KK2222KK......',
  '...KK..K222222223K.K..',
  '..K11KK2222222223KK3K.',
  '..K111K222222222333w3K',
  '.K1111K22222222333K33K',
  '.K111K2222222223333n3K',
  '.K11K222222222K3334KK.',
  '..KKK222222222K33KwwK.',
  '....K2222222223K4KwwK.',
  '....K12222222K44KKKK..',
];
const gnawtyFeetA = ['....KK1KK..K2KK4K.....', '...K111K...KK2KK......', '...KKKK.....KKK.......'];
const gnawtyFeetB = ['.....K1KK.K2KK4K......', '.....K11K.K22KK.......', '.....KKK..KKK.........'];
export const gnawty = [art(22, 16, [...gnawtyBody, ...gnawtyFeetA]), art(22, 16, [...gnawtyBody, ...gnawtyFeetB])];

// --- Banana 10x12: 3 frames (turning glint). Collect shine is an effect.
export const banana = [
  art(10, 12, ['......KK..', '......Kt..', '.....KbK..', '....KbbK..', '...KbbcK..', '..KabbcK..', '..KabbcK..', '..KabbbK..', '...KabbK..', '....KaabKK', '.....KKKtK', '.........K']),
  art(10, 12, ['.....KK...', '.....Kt...', '....KbbK..', '....KbcK..', '...KbbcK..', '...KabcK..', '...KabcK..', '...KabbK..', '...KabbK..', '....KabK..', '....KKtK..', '.....KK...']),
  art(10, 12, ['...KK.....', '...tK.....', '...KbK....', '...KbbK...', '...KcbbK..', '...KcbbaK.', '...KcbbaK.', '...KbbbaK.', '...KbbaK..', 'KKbaaK....', 'KtKKK.....', 'K.........']),
];

// --- Bevelled gold letters on a dark recessed plaque. Generic edition: BONUS.
const L5 = {
  B: ['1110', '1001', '1110', '1001', '1110'], E: ['1111', '1000', '1110', '1000', '1111'], R: ['1110', '1001', '1110', '1010', '1001'],
  T: ['11111', '00100', '00100', '00100', '00100'], O: ['0110', '1001', '1001', '1001', '0110'],
  N: ['10001', '11001', '10101', '10011', '10001'],
  U: ['1001', '1001', '1001', '1001', '0110'],
  S: ['0111', '1000', '0110', '0001', '1110'],
};
const L7={
  B:['11110','01001','01001','01110','01001','01001','11110'],
  O:['01110','10001','10001','10001','10001','10001','01110'],
  N:['10001','11001','11001','10101','10011','10011','10001'],
  U:['10001','10001','10001','10001','10001','10001','01110'],
  S:['01111','10000','10000','01110','00001','00001','11110'],
};
export function letterTile(ch, size = 12) {
  const p = new Pix(size, size);
  p.rect(1,1,size-2,size-2,hex('#392014'));
  p.rect(2,2,size-4,size-4,hex('#4e2c18'));
  p.rect(1, 1, size - 2, 1, C.o3); p.rect(1, 1, 1, size - 2, C.o3);
  p.rect(1, size - 2, size - 2, 1, C.o1); p.rect(size - 2, 1, 1, size - 2, C.o1);
  for (let i = 0; i < size; i++) { p.set(i, 0, C.K); p.set(i, size - 1, C.K); p.set(0, i, C.K); p.set(size - 1, i, C.K); }
  p.clear(0, 0); p.clear(size - 1, 0); p.clear(0, size - 1); p.clear(size - 1, size - 1);
  const g = size>=12?(L7[ch]??L5[ch]):L5[ch];
  const gw = g[0].length, ox = Math.floor((size - gw) / 2), oy = Math.floor((size - g.length) / 2);
  if(size>=12)g.forEach((row,y)=>[...row].forEach((b,x)=>{if(b==='1')p.set(ox+x+1,oy+y+1,C.K);}));
  g.forEach((row, y) => [...row].forEach((b, x) => { if (b === '1') p.set(ox + x, oy + y, y<2?C.s3:y<g.length-2?C.o3:C.o2); }));
  return p;
}
export function letterSlot(size = 9) {
  const p = new Pix(size, size);
  for (let i = 1; i < size - 1; i++) { p.set(i, 0, C.o1); p.set(i, size - 1, C.o1); p.set(0, i, C.o1); p.set(size - 1, i, C.o1); }
  return p;
}

// --- Wooden barrel 16x18: 4 rolling frames (staves/hoops rotate), 1 upright frame.
export function barrel(frame) {
  const p = new Pix(16, 18);
  const steel=[hex('#282c30'),hex('#555f65'),hex('#a6b1b0'),hex('#dae0c9')];
  p.ellipse(8,10,7,7.5,C.b1);p.rect(2,4,12,10,C.b2);
  // Curved staves, a fixed upper-left light source and moving wood grain.
  for(let y=4;y<17;y++)for(let x=1;x<15;x++)if(p.alpha(x,y)){
    const lit=x<5?C.b3:x<10?C.b2:C.b1;
    const groove=(x+frame*2+Math.round((y-9)**2/35))%4===0;
    p.set(x,y,groove?C.b1:lit);
  }
  p.ellipse(8,4,6.5,3,C.b1);p.ellipse(7.5,3.5,5.5,2,C.b3);
  p.capsule(3,3,11,4,.5,C.b4);p.capsule(6,2,6,4,.5,C.b1);
  for(const y of [6,13]){
    p.ellipse(8,y,7,2,steel[0]);p.ellipse(8,y-.5,6.5,1.3,steel[1]);
    p.capsule(2,y-1,8,y,.5,steel[2]);p.set(3,y-1,steel[3]);
    p.set(12,y,steel[0]); // rivet shadow
  }
  p.set(4,9,C.b4);p.set(4,10,C.b4);p.set(9,11,C.b1);
  p.outline(C.K);
  return p;
}
// Barrel debris: 2 frames of planks flying apart (drawn around the centre).
export function debris(frame) {
  const p = new Pix(24, 20);
  const d = frame === 0 ? 3 : 7;
  const plank = (x, y, w, h) => { p.rect(x, y, w, h, C.b3); p.rect(x, y + h - 1, w, 1, C.b1); };
  plank(12 - d - 3, 8 - d, 4, 3); plank(12 + d, 8 - d + 1, 4, 3); plank(12 - d - 2, 10 + d / 2, 3, 4); plank(12 + d - 1, 11 + d / 2, 4, 3);
  p.rect(12 - 2, 9, 4, 1, C.h1);
  p.outline(C.K);
  return p;
}

// --- Star barrel (mid-level checkpoint), 18x20, 2 frames (star glint).
export function starBarrel(frame) {
  const p = new Pix(18, 20);
  p.blit(barrel(0),1,1);
  star(p, 9, 10, 5.2, 2.2, frame ? C.s3 : C.s2, C.s1);
  p.outline(C.K);
  return p;
}
export function star(p, cx, cy, R, r, fill, edge) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? r : R; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  p.polygon(pts, edge);
  const inner = pts.map(([x, y]) => [cx + (x - cx) * 0.72, cy + (y - cy) * 0.72]);
  p.polygon(inner, fill);
}
export function starIcon(frame) { const p = new Pix(12, 12); star(p, 6, 6.3, 5.6, 2.4, frame ? C.s3 : C.s2, C.s1); p.outline(C.K); return p; }

// --- Effects
export function sparkle(frame) { // 9x9, 3 frames
  const p = new Pix(9, 9); const c = frame === 1 ? C.s3 : C.s2; const r = [1, 3, 2][frame];
  for (let i = -r; i <= r; i++) { p.set(4 + i, 4, c); p.set(4, 4 + i, c); }
  if (frame === 1) { p.set(3, 3, C.s2); p.set(5, 5, C.s2); p.set(5, 3, C.s2); p.set(3, 5, C.s2); }
  p.set(4, 4, C.s3);
  return p;
}
export function hitStar(frame) { // 16x16 impact burst, 2 frames
  const p = new Pix(16, 16);
  const R = frame ? 7.4 : 5.2;
  star(p, 8, 8, R, R * 0.45, C.s3, C.s2);
  p.outline(C.K);
  return p;
}
export function dust(frame) { // 10x6 puff, 3 frames
  const p = new Pix(10, 6); const g = [hex('#f4d0b8'), hex('#e0b69a'), hex('#c89a80')][frame];
  const r = [1.6, 2.4, 2][frame];
  p.ellipse(3, 3.5, r, r * 0.8, g); p.ellipse(7, 3, r * 0.9, r * 0.7, g);
  return p;
}

// --- EXIT sign 26x22 (post + board), after the reference's wooden EXIT sign.
export function exitSign() {
  const p = new Pix(26, 22);
  p.rect(11, 9, 4, 13, C.b2); p.rect(11, 9, 1, 13, C.b3); p.rect(14, 9, 1, 13, C.b1);
  p.rect(1, 1, 24, 10, C.r1); p.rect(1, 1, 24, 1, C.r2); p.rect(1, 10, 24, 1, hex('#7a1418'));
  const txt = { E: ['111', '100', '110', '100', '111'], X: ['101', '101', '010', '101', '101'], I: ['111', '010', '010', '010', '111'], T: ['111', '010', '010', '010', '010'] };
  [...'EXIT'].forEach((ch, i) => txt[ch].forEach((row, y) => [...row].forEach((b, x) => { if (b === '1') p.set(4 + i * 5 + x, 3 + y, C.o3); })));
  p.outline(C.K);
  return p;
}

// --- HUD digits 7x9 (gold with dark outline, DKC-like counters)
const D5 = {
  0: ['0110', '1001', '1001', '1001', '1001', '1001', '0110'], 1: ['0010', '0110', '0010', '0010', '0010', '0010', '0111'],
  2: ['0110', '1001', '0001', '0010', '0100', '1000', '1111'], 3: ['1110', '0001', '0001', '0110', '0001', '0001', '1110'],
  4: ['0010', '0110', '1010', '1010', '1111', '0010', '0010'], 5: ['1111', '1000', '1110', '0001', '0001', '1001', '0110'],
  6: ['0110', '1000', '1000', '1110', '1001', '1001', '0110'], 7: ['1111', '0001', '0010', '0010', '0100', '0100', '0100'],
  8: ['0110', '1001', '1001', '0110', '1001', '1001', '0110'], 9: ['0110', '1001', '1001', '0111', '0001', '0001', '0110'],
};
export function digit(n) {
  const p = new Pix(7, 9);
  D5[n].forEach((row, y) => [...row].forEach((b, x) => { if (b === '1') { p.set(1 + x, 1 + y, y < 3 ? C.o3 : C.o2); p.set(2 + x, 1 + y, y < 3 ? C.o2 : C.o1); } }));
  p.outline(C.K);
  return p;
}

// --- Phase 8: snake enemy (original "Slippa-like" snake), 22x12, 2 frames, faces right.
// Green body with a pale belly so it reads against the purple cave backdrop.
const SN = { K: C.K, a: hex('#1e4a26'), b: hex('#3a8a3a'), c: hex('#74c25a'), d: hex('#e8d070'), w: C.w, r: hex('#e0484a') };
const snakeRows = [
  ['......................', '................KKK...', '...............KcccK..', '..............KcbbwKK.', '..............KbbbbbK.', '..KKK.....KKKKbbbbKKrr',
   '.KcccK...KcccbbbbbK..r', 'KcbbbbKKKcbbbbbbbK....', 'Kbbbbbbbbbbbbbbbd.....', 'KabbbbbbbbabbddK......', '.KaadddddddddKK.......', '..KKKKKKKKKKK.........'],
  ['......................', '................KKK...', '...............KcccK..', '..............KcbbwKK.', '..............KbbbbbK.', '.KKK......KKKKbbbbKK..',
   'KcccKK..KKcccbbbbbKrr.', 'KbbbbbKKcbbbbbbbbK..r.', '.Kbbbbbbbbbbbbbbd.....', '..KabbbbbbabbbddK.....', '...KaaddddddddKK......', '....KKKKKKKKKK........'],
];
export const snake = snakeRows.map(rows => new Pix(22, 12).ascii(0, 0, rows, SN));

// --- Phase 8: tire (bouncy rubber ring, side view), 24x14; frame 1 is squashed.
const TR = { K: hex('#0c0c0e'), a: hex('#26262a'), b: hex('#46464c'), c: hex('#7c7c84'), d: hex('#b4b4bc') };
export function tire(frame) {
  const p = new Pix(24, 14);
  const ry = frame ? 5.2 : 6.4, cy = frame ? 8.4 : 7;
  p.ellipse(12,cy,11.4,ry,TR.K);
  p.ellipse(11.3,cy-.6,10.2,ry-1,TR.b);
  p.ellipse(12.4,cy+.7,9.4,ry-1.4,TR.a);
  // Sidewall bead and recessed hole: two nested rims establish thickness.
  p.ellipse(11,cy-.5,7.6,Math.max(2.5,ry-2),TR.c);
  p.ellipse(11.8,cy,6.8,Math.max(2,ry-2.6),TR.b);
  p.ellipse(12.3,cy+.2,5.1,Math.max(1.5,ry-3.4),TR.K);
  p.capsule(8,cy+1.5,15,cy+2,.5,TR.a);
  // Radial tread blocks retain dark rubber, rather than a flat grey doughnut.
  for(let i=0;i<14;i++){
    const a=i*Math.PI*2/14, x=12+Math.cos(a)*9.4,y=cy+Math.sin(a)*(ry-.8);
    p.capsule(x,y,x+Math.cos(a+.35)*1.8,y+Math.sin(a+.35)*1.1,.55,TR.K);
  }
  p.capsule(5,cy-ry+2,10,cy-ry+1,.5,TR.d);
  p.set(4,cy-2,TR.c);p.set(18,cy+3,TR.K);
  p.outline(TR.K);
  return p;
}

// A readable bunch, not a scaled single banana: shared stem, overlapping fruit.
export function bananaBunch(){
  const p=new Pix(22,22);
  for(const [x,y] of [[1,3],[11,3],[3,7],[9,7],[6,10]])p.blit(banana[0],x,y);
  p.capsule(9,5,12,1,1,C.bt);p.capsule(10,4,12,1,.6,hex('#9cac48'));
  p.set(4,10,C.y3);p.set(15,12,C.y3);
  return p;
}

// Hovering stinging insect, wings behind the striped abdomen; faces right.
export function bee(frame){
  const p=new Pix(24,20),k=hex('#20201d'),shadow=hex('#875322'),gold=hex('#df9d26'),light=hex('#ffe784');
  // Four narrow veined wings, two distinct beats; the waist separates the
  // pointed striped abdomen from the thorax/head instead of one round blob.
  const wy=frame?7:3.5,ry=frame?1.5:3;
  p.ellipse(7.5,wy+1,2.8,ry,hex('#668b9c'));
  p.ellipse(14,wy,2.4,ry,hex('#b3d6d5'));
  p.capsule(13,8,15,wy,0.55,hex('#eef4dd'));
  p.capsule(10,9,8,wy+1,.5,hex('#a1c3cd'));
  p.polygon([[1,13],[6,11],[6,15]],hex('#efe4bf'));
  p.ellipse(8,12,5.5,4.3,shadow);p.ellipse(8,11,5,3.3,gold);
  p.capsule(6,9,6,14,.9,k);p.capsule(10,8,11,15,1,k);
  p.capsule(7,8,8,8,.6,light);
  p.ellipse(14,11,2.8,3.2,k);p.set(13,9,shadow);
  p.ellipse(18,10,3.5,3.8,gold);p.rect(18,8,3,3,C.w);
  p.set(20,9,k);p.capsule(17,7,21,8,.7,k); // lowered brow
  p.capsule(17,6,18,4,.5,k);p.set(19,4,k);
  p.capsule(21,12,22,13,.5,shadow);
  p.capsule(13,14,11,17,.55,k);p.capsule(16,14,18,16,.55,k);
  p.set(10,17,gold);p.set(18,17,gold);p.outline(C.K);return p;
}

// Long snout, low shoulders, muscular rear leg and tapered tail. Three poses:
// two grounded strides and one airborne tuck (same gameplay envelope).
export function lizard(frame){
  const p=new Pix(28,22),dark=hex('#233d29'),mid=hex('#50784a'),lit=hex('#b0b966'),belly=hex('#e7cd90');
  p.polygon([[1,17],[8,12],[13,13],[10,17]],dark);
  p.ellipse(13,13,6,5,dark);p.ellipse(13,11,5,3.4,mid);
  p.capsule(17,12,19,7,3,mid);p.ellipse(21,7,5.5,3.2,lit);
  p.rect(20,8,7,2,dark);p.rect(21,10,5,1,mid);
  p.set(22,8,C.w);p.set(25,8,C.w); // exposed teeth, no bigger hitbox
  p.rect(19,5,3,2,hex('#eac65a'));p.set(21,6,C.K);
  p.capsule(18,4,22,5,.75,dark);p.set(25,6,dark);
  for(const [x,y] of [[8,10],[11,8],[14,7]])p.polygon([[x-1,y+2],[x,y-1],[x+2,y+2]],lit);
  p.capsule(15,14,19,10,1,belly);
  const step=frame===0?-2:2;
  if(frame===2){p.capsule(12,15,16,16,1.6,mid);p.capsule(17,13,21,14,1,lit);}
  else {p.capsule(11,15,10+step,19,1.8,mid);p.rect(8+step,19,5,1,belly);p.capsule(17,14,18-step,18,1,mid);p.rect(17-step,19,4,1,belly);}
  p.set(8,13,lit);p.set(12,11,lit);p.capsule(18,12,21,13,.9,mid);
  p.set(22,13,belly);p.outline(C.K);return p;
}

// --- Vine pieces for Ropey (post-Phase 9 visual pass). The strand itself is drawn by the
// view (it swings); these are the leaves along it, the leafy tuft where it comes out of
// the canopy, and the tip at its lower end. Lit from the upper left, dark outline.
export const VN = {
  K: hex('#12190a'), d: hex('#2c4118'), m: hex('#4f7026'), l: hex('#7fa23c'), h: hex('#b9cf6a'), s: hex('#6a4a22'), sl: hex('#9a7038'),
};
const vpal = { K: VN.K, d: VN.d, m: VN.m, l: VN.l, h: VN.h, s: VN.s, t: VN.sl };
export function vineLeaf() { // 9x6, stem on the left edge (flip for the other side)
  return new Pix(9, 6).ascii(0, 0, [
    '...KKKK..',
    '.KKhllmK.',
    'KsdllmmmK',
    '.KdmmmdK.',
    '..KKddK..',
    '....KK...',
  ], vpal);
}
export function vineTuft() { // 34x18 clump in the canopy's night greens: the vine hangs out of it
  const N = { K: hex('#060d14'), a: hex('#0d2126'), b: hex('#163a36'), c: hex('#245443'), d: hex('#3b7652') };
  const p = new Pix(34, 18);
  const blob = (cx, cy, rx, ry, body, lit) => {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++)
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) p.set(cx + x, cy + y, y < -ry * 0.3 ? lit : body);
  };
  blob(17, 4, 15, 4, N.a, N.b); blob(9, 7, 7, 4, N.b, N.c); blob(25, 7, 7, 4, N.b, N.c);
  blob(17, 9, 7, 4, N.b, N.c); blob(13, 11, 4, 3, N.a, N.b); blob(21, 11, 4, 3, N.a, N.b);
  for (const [x, y] of [[8, 5], [15, 7], [24, 5], [19, 9]]) p.set(x, y, N.d);
  // ragged drooping leaf tips so it reads as foliage, not a platform
  for (const [x, len] of [[4, 3], [7, 5], [11, 4], [23, 4], [27, 5], [30, 3]]) for (let k = 0; k < len; k++) p.set(x + (k > 2 ? 1 : 0), 9 + k, k === len - 1 ? N.c : N.b);
  p.outline(N.K);
  return p;
}
export function vineTip() { // 11x9: the vine ends in a small curl of leaves (last hand-hold)
  return new Pix(11, 9).ascii(0, 0, [
    '....KtK....',
    '...KstsK...',
    '.KKKstsKKK.',
    'KhlKssKlmmK',
    'KllmKKmmmdK',
    '.KmmdKdddK.',
    '..KddKKdK..',
    '...KK..K...',
    '...........',
  ], vpal);
}
