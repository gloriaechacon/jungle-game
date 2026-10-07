import { Pix } from './pixel.mjs';
import { PAL as C } from './dk.mjs';

// Front-facing presentation poses, separate from every approved gameplay pose.
// Same palette, pale facial mask, broad muzzle and red tie. Feet anchor (24,48).
export function celebration(frame) {
  const p=new Pix(48,48),bob=[0,1,0,-1,0,-1,-1,0][frame];
  // Each pose has elbows and wrists of its own. Hands rise from the chest,
  // open beside the head, then meet overhead for a readable clap.
  const poses=[
    [[8,34,7,40],[40,34,41,40]],
    [[10,31,22,30],[39,29,38,23]],
    [[9,29,10,23],[38,31,26,30]],
    [[5,24,8,14],[43,24,40,14]],
    [[6,18,10,6],[42,18,38,6]],
    [[10,13,18,5],[38,13,30,5]],
    [[12,12,22,5],[36,12,26,5]],
    [[7,18,11,7],[41,18,37,7]],
  ];
  const arms=()=>{for(const [j,side] of [-1,1].entries()) {
    const [elbow,ey,hand,hy]=poses[frame][j],shoulder=24+side*10;
    p.capsule(shoulder,29+bob,elbow,ey+bob,4.5,C.K).capsule(elbow,ey+bob,hand,hy+bob,3.8,C.K);
    p.capsule(shoulder,28+bob,elbow,ey-1+bob,3.5,C.F2).capsule(elbow,ey-1+bob,hand,hy+bob,2.8,C.F2);
    p.capsule(shoulder-1,27+bob,elbow-1,ey-2+bob,1,C.F3);
    p.ellipse(hand,hy+bob,3.5,3.6,C.S1).ellipse(hand-1,hy-1+bob,2.7,2.4,C.S3);
    if(frame>=4){
      for(let finger=-1;finger<=1;finger++)p.capsule(hand+finger*2,hy+bob,hand+finger*2,hy-2+bob+Math.abs(finger),.65,C.S3);
      p.set(hand+side*2,hy+1+bob,C.S1);
    }else for(let finger=-1;finger<=1;finger++)p.set(hand+finger*2,hy+2+bob,C.S1);
  }};
  arms();
  for(const side of [-1,1]) {
    p.capsule(24+side*7,36,24+side*8,44,4,C.K);
    p.capsule(24+side*7,36,24+side*8,44,3,C.F2);
    p.ellipse(24+side*9,46,5,2,C.S1).ellipse(23+side*9,45,4,1.5,C.S3);
  }
  p.ellipse(24,32+bob,12,11,C.K).ellipse(24,31+bob,11,10,C.F2);
  p.ellipse(21,28+bob,8,6,C.F3).ellipse(24,36+bob,8,5,C.F1);
  // Small crest, heavy brow ridge, ears set back behind the mask.
  p.ellipse(13,20+bob,3,4,C.F1).ellipse(35,20+bob,3,4,C.F1);
  p.ellipse(24,20+bob,10,12,C.K).ellipse(24,19+bob,9,11,C.F2);
  p.polygon([[18,11+bob],[22,4+bob],[25,7+bob],[28,6+bob],[31,13+bob]],C.F2);
  p.capsule(20,10+bob,22,7+bob,1,C.F3);
  p.ellipse(24,21+bob,8,8,C.M1);
  p.ellipse(20,19+bob,4,5,C.M2).ellipse(28,19+bob,4,5,C.M2);
  if(frame>1){
    // Happy closed eyes, raised brows and lifted cheeks, not the combat scowl.
    for(const x of [20,28]){
      p.capsule(x-2,20+bob,x,18+bob,.65,C.F1).capsule(x,18+bob,x+2,20+bob,.65,C.F1);
      p.capsule(x-2,15+bob,x+1,14+bob,.6,C.F2);
    }
  }else{
    p.rect(18,18+bob,4,3,C.W).rect(26,18+bob,4,3,C.W);
    p.rect(20,18+bob,2,3,C.K).rect(26,18+bob,2,3,C.K);
    p.capsule(17,16+bob,22,15+bob,.6,C.F1).capsule(26,15+bob,31,16+bob,.6,C.F1);
  }
  p.ellipse(24,25+bob,8,4.8,C.S2).ellipse(23,24+bob,7,3.7,C.M2);
  p.ellipse(24,22+bob,4,1.8,C.S1);p.set(22,22+bob,C.K);p.set(26,22+bob,C.K);
  if(frame>0){p.ellipse(24,26.5+bob,5,3,C.K);p.rect(20,24+bob,8,2,C.W);p.rect(22,28+bob,4,1,C.S2);}
  else {p.capsule(20,26+bob,23,28+bob,.5,C.S1);p.capsule(23,28+bob,28,26+bob,.5,C.S1);}
  p.polygon([[21,31+bob],[27,31+bob],[25,34+bob],[28,40+bob],[24,43+bob],[20,40+bob],[23,34+bob]],C.R);
  p.rect(23,37+bob,2,3,C.Y);p.set(25,39+bob,C.Y);
  // Crossed hands and claps must be in front of the chest/head, never hidden.
  if(frame===1||frame===2||frame===5||frame===6)arms();
  return p;
}
