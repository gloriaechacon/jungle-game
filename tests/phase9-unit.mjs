import assert from 'node:assert/strict';
import { Campaign } from '../src/campaign.ts';
import { buildDK, FRAMES, CLIMB_GRIP, CLIMB_GRIPS } from '../tools/art/dk-frames.mjs';
const c = new Campaign();
const banana = {id:'banana-0',collected:true};
assert(c.unlocked(0)); assert(!c.unlocked(1)); assert(!c.unlocked(-1)); assert(!c.unlocked(3));
c.complete('reptile',[banana]); assert.equal(c.summary().bananas,0);
c.complete('jungle',[banana,{id:'B',letter:'B',collected:true}]);
c.complete('jungle',[banana]); assert.equal(c.summary().bananas,1);
const pickups = [{...banana,collected:false}]; c.restore('jungle',pickups); assert(pickups[0].collected);
c.complete('ropey',[banana]); assert.equal(c.summary().bananas,2,'Same banana id in different levels counts separately');
c.complete('reptile',[]); assert(c.summary().finished,'Letters are never an exit gate');
assert.equal(c.summary('jungle',[banana]).bananas,2,'Live HUD cannot double count a restored pickup');
assert.equal(new Campaign().summary().bananas,0);
const frames = buildDK();
const climb = Array.from({length:4},(_,i)=>frames[`dk-climb-${i}`]);
assert.equal(new Set(climb.map(p=>Buffer.from(p.d).toString('base64'))).size,4);
for(let i=0;i<4;i++) {
  const p=FRAMES[`dk-climb-${i}`];
  // Revised climb (user: "parece colgado del cuello"): both hands on the vine ABOVE the
  // head, body hanging beside it, face clear of the vine, grip layer drawn over it.
  const vx = CLIMB_GRIP[0];
  assert(Math.abs(p.frontHand[0]-vx)<=1 && Math.abs(p.backHand[0]-vx)<=1,'Hands on the vine');
  assert(p.head[0]+7 < vx,'Vine passes outside the face, not through the neck');
  assert(p.frontHand[1] < p.head[1] && p.backHand[1] < p.head[1],'Hanging from the hands, above the head');
  assert.notEqual(p.frontHand[1],p.backHand[1],'Hands at alternating heights');
  const g = frames[`dk-climb-grip-${i}`];
  assert(g && g.bbox(),'Grip layer exists');
  for (const [x,y] of CLIMB_GRIPS[i].hands) { assert.equal(x,vx); assert(g.alpha(x,y),'Grip layer covers the vine at each hand'); }
}
{ const grips = Array.from({length:4},(_,i)=>frames[`dk-climb-grip-${i}`]);
  assert(new Set(grips.map(p=>Buffer.from(p.d).toString('base64'))).size>=3,'Hand-over-hand: grip layer changes');
}
const roll = Array.from({length:8}, (_,i)=>frames[`dk-roll-${i}`]);
assert.equal(new Set(roll.map(p=>Buffer.from(p.d).toString('base64'))).size,8,'Eight distinct somersault poses');
assert(new Set(roll.map(p=>p.bbox().h)).size > 2,'Articulated silhouette changes shape, not a rotating circle');
for(const p of roll) {
  assert.equal(p.bbox().y+p.bbox().h,32,'Roll stays anchored to ground');
  assert(p.colors().includes('#d8383a'),'Tie remains part of the rotating character');
}
for (const gait of ['walk','run','carry-walk']) {
  const poses = Array.from({length:6},(_,i)=>frames[`dk-${gait}-${i}`]);
  assert.equal(new Set(poses.map(p=>Buffer.from(p.d).toString('base64'))).size,6,`${gait}: every frame distinct`);
  for (const p of poses) { assert.equal(p.w,32); assert.equal(p.h,32); assert(p.bbox()); }
  // Regression: grounded feet/knuckles must sweep backward relative to the
  // right-facing body, while lifted limbs recover forward (not moonwalk).
  const limbs = gait === 'carry-walk' ? ['frontFoot','backFoot'] : ['frontFoot','backFoot','frontHand','backHand'];
  for (const limb of limbs) {
    const ground = limb.endsWith('Hand') ? 29 : 30;
    let supportSteps = 0, recoverySteps = 0;
    for (let i = 0; i < 6; i++) {
      const a = FRAMES[`dk-${gait}-${i}`][limb], b = FRAMES[`dk-${gait}-${(i+1)%6}`][limb];
      if (Math.abs(a[1]-ground) < 1e-6 && Math.abs(b[1]-ground) < 1e-6) {
        assert(b[0] < a[0], `${gait}/${limb}: planted limb must move back`); supportSteps++;
      } else {
        assert(b[0] > a[0], `${gait}/${limb}: lifted limb must move forward`); recoverySteps++;
      }
    }
    assert.equal(supportSteps,3); assert.equal(recoverySteps,3);
  }
}
console.log('PASS phase 9 unit: unlock order, unique per-level pickups, replay restoration, optional letters, session reset, six distinct gait frames.');
