// Code-native pixel art: authored silhouettes, no reference-video pixels used.
import {Pix,hex} from './pixel.mjs';
import {E,rng} from './env.mjs';

export function palmCrown(){
  const p=new Pix(64,36);
  // A broad, almost flat crown: the collision lip spans x8..56 at y4.
  // The hanging leaves are below that lip, never a false higher landing.
  for(const [tip,bottom] of [[1,26],[9,34],[18,30],[28,36],[38,32],[50,35],[62,25]]){
    p.polygon([[25,5],[37,5],[tip+4,15],[tip+2,bottom],[tip-3,bottom-7],[tip-5,16]],E.f0);
    p.polygon([[29,5],[35,6],[tip+2,16],[tip,bottom-5],[tip-3,17]],E.f3);
    p.capsule(31,7,tip,20,.8,E.f4);
    p.capsule(tip-1,18,tip-1,bottom-9,.6,E.f2);
  }
  p.polygon([[4,12],[8,6],[16,3],[27,1],[37,1],[48,3],[56,6],[60,12],[44,16],[24,14]],E.f2);
  for(const tip of [8,16,24,34,44,54]){
    p.polygon([[30,2],[35,2],[tip+4,9],[tip,18],[tip-3,10]],E.f3);
    p.capsule(32,2,tip,10,.8,E.f4);
    p.capsule(32,2,(32+tip)/2,4,.5,E.f5);
  }
  p.ellipse(30,15,3,3,E.w1);p.ellipse(36,15,3,3,E.c1);
  p.set(28,14,E.c3);p.set(34,14,E.c3);
  return p;
}

export function palmTrunk(){
  const p=new Pix(16,32);
  for(let y=0;y<32;y++){
    const bend=Math.round(Math.sin(y*Math.PI/16));
    for(let x=3;x<13;x++)p.set(x+bend,y,x<5?E.t0:x<7?E.t3:x<10?E.t2:E.t1);
    if(y%8<2)p.capsule(4+bend,y,11+bend,y+2,.6,E.t0);
    if(y%8===3)p.capsule(5+bend,y,9+bend,y+1,.5,E.c3);
  }
  return p;
}

export function jungleFern(){
  const p=new Pix(32,22);
  for(const [x,y] of [[1,9],[5,2],[11,5],[20,1],[27,5],[31,13]]){
    p.capsule(16,21,x,y,1,E.f1);
    for(let i=1;i<6;i++){
      const t=i/6,cx=16+(x-16)*t,cy=21+(y-21)*t;
      p.polygon([[cx,cy+2],[cx-5,cy-3],[cx,cy-1],[cx+4,cy-4]],i%2?E.f3:E.f2);
      p.set(cx,cy-1,E.f4);
    }
  }
  return p;
}

/** Asymmetrical eroded outcrop, inset tunnel, moss and a receding threshold.
 * The aperture is centred at x40, exactly where the level exit triggers.
 * Keep the legacy exit-cave for the unrequested third-level/practice scenery. */
export function jungleEntrance(night=false){
  const p=new Pix(80,80),r=rng(741);
  const C=(day,dusk)=>hex(night?dusk:day);
  const ink=C('#16140d','#111820'),dark=C('#343426','#29383c'),shade=C('#555340','#425155'),
    rock=C('#78725a','#65736f'),lit=C('#a59b79','#8b9b8c'),edge=C('#c1b590','#afbcaa');
  p.polygon([[1,80],[3,53],[9,32],[20,17],[37,4],[48,2],[63,15],[72,36],[79,80]],dark);
  const stones=[
    [[4,78],[6,53],[21,48],[20,72],[16,79]],
    [[7,51],[11,32],[24,26],[30,35],[22,48]],
    [[14,29],[23,15],[38,6],[40,25],[29,33]],
    [[40,5],[48,4],[62,16],[57,29],[42,25]],
    [[61,18],[70,36],[61,49],[52,33],[57,29]],
    [[64,47],[72,40],[77,64],[73,78],[62,73]],
  ];
  stones.forEach((s,i)=>{
    p.polygon(s,i<3?rock:shade);
    const [a,b,c]=s;p.polygon([a,b,[c[0]-2,c[1]+2],[a[0]+4,a[1]+3]],i<4?lit:rock);
    p.capsule(a[0]+1,a[1]+1,b[0]-1,b[1]+1,.7,i<4?edge:lit);
  });
  // Texture is confined to the rock mask, with fixed seed for reproducibility.
  for(let i=0;i<160;i++){
    const x=Math.floor(r()*80),y=Math.floor(r()*76);
    if(p.alpha(x,y)&&p.alpha(x+2,y))p.rect(x,y,1+(i%3===0?1:0),1,i%3?shade:lit);
  }
  p.polygon([[19,80],[21,50],[28,36],[39,28],[51,32],[61,49],[63,80]],ink);
  p.polygon([[22,77],[25,51],[33,37],[42,33],[52,40],[57,55],[59,78]],C('#363427','#243339'));
  p.polygon([[29,77],[30,53],[37,41],[46,40],[54,53],[57,78]],C('#0d1815','#09151c'));
  // Lit left return and a thick shadowed right return show the arch's depth.
  p.polygon([[21,72],[23,50],[30,37],[37,33],[32,45],[29,71]],shade);
  p.capsule(24,52,30,40,.7,lit);
  p.polygon([[54,42],[60,51],[62,78],[57,78],[54,55]],dark);
  p.polygon([[22,78],[37,68],[50,68],[62,78]],C('#75664b','#536763'));
  p.polygon([[27,78],[39,71],[47,71],[56,78]],C('#968266','#738177'));
  for(const [x,y] of [[33,76],[45,73],[53,77]])p.rect(x,y,2,1,lit);
  // Moss follows upper facets, with two short roots and small ferns at the foot.
  for(const [x,y,w] of [[16,23,12],[28,13,11],[40,7,13],[55,21,10]]){
    p.capsule(x,y,x+w,y-3,2,E.f1);p.capsule(x,y-1,x+w-2,y-4,1,E.f3);
    for(let k=0;k<3;k++)p.rect(x+k*4,y,2,3+k%2,E.f2);
  }
  p.capsule(19,25,15,43,.7,E.f2);p.capsule(60,26,66,49,.7,E.f1);
  p.blit(jungleFern(),-7,58);p.blit(jungleFern(),58,58,true);
  p.outline(ink);
  return p;
}
