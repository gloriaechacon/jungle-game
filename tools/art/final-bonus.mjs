import { Pix, hex } from './pixel.mjs';
import { banana, barrel, starIcon } from './props.mjs';
import { BONUS_BARREL } from '../../src/final-bonus-presentation.ts';

// Upright cask: staves/top grain turn under a fixed light, with a readable symbol.
export function bonusSlot(symbol,turn=0) {
  const p=new Pix(BONUS_BARREL.width,BONUS_BARREL.height),c=hex;
  const edge=c('#23170f'),wood=[c('#56321e'),c('#87502c'),c('#b8793d'),c('#dca05a')];
  const angle=turn*Math.PI/4;
  p.polygon([[6,3],[27,3],[30,7],[32,14],[32,25],[29,32],[25,35],[9,35],[4,31],[1,24],[2,12]],edge);
  for(let y=5;y<34;y++)for(let x=2;x<32;x++)if(p.alpha(x,y)){
    const bend=Math.round((y-19)**2/85),left=3+bend,right=30-bend;
    if(x<left||x>right)continue;
    const u=(x-17)/15,lit=x<7?1:x<13?3:x<22?2:1;
    const groove=Math.abs(Math.sin(Math.asin(Math.max(-1,Math.min(1,u)))*3+angle))<.18;
    p.set(x,y,groove?wood[0]:wood[lit]);
    if(!groove&&(x*7+y*3+turn*5)%37===0)p.set(x,y,wood[Math.max(0,lit-1)]);
  }
  p.ellipse(17,5,12.5,4,edge).ellipse(17,4.5,11,2.5,wood[2]);
  for(const shift of [-5,0,5]){
    const x=17+shift*Math.cos(angle),y=4.5+shift*Math.sin(angle)*.22;
    p.capsule(x-5*Math.sin(angle),y+Math.cos(angle),x+5*Math.sin(angle),y-Math.cos(angle),.5,wood[0]);
  }
  p.capsule(8,3,16,2,.5,wood[3]);
  for(const y of [9,29]){
    p.ellipse(17,y,14.5,3.4,c('#232b2c'));
    p.ellipse(17,y-.7,14,2.2,c('#657778'));
    p.capsule(4,y-1,18,y,.7,c('#c4c9b4'));
    p.capsule(19,y,29,y-1,.6,c('#8e9b91'));
    for(const x of [6,26]){p.set(x,y,c('#263133'));p.set(x,y-1,c('#d9d7bc'));}
  }
  // Inset directly in the wood: no rectangular gold picture frame.
  const face=new Pix(18,18);
  face.ellipse(9,9,8.5,8.8,c('#49321e')).ellipse(9,9,7.5,8,c('#302819'));
  if(symbol===0)face.blit(banana[0],4,3);
  if(symbol===1){
    face.ellipse(9,10,6,5,c('#3e271d')).ellipse(8,9,5,4,c('#ad7744'));
    face.capsule(5,9,9,5,.7,c('#e7bc7a'));
    face.set(10,8,edge);face.set(12,10,edge);face.set(9,11,edge);
  }
  if(symbol===2)face.blit(starIcon(0),3,3);
  if(symbol===3){
    const b=barrel(0);
    for(let y=0;y<13;y++)for(let x=0;x<11;x++)face.set(4+x,3+y,b.get(Math.floor(x*b.w/11),Math.floor(y*b.h/13)));
  }
  const width=Math.round(18*(.7+.3*Math.abs(Math.cos(angle)))),cx=17+Math.round(Math.sin(angle)*3);
  for(let y=0;y<18;y++)for(let x=0;x<width;x++){
    const pixel=face.get(Math.floor(x*18/width),y);
    if(pixel[3])p.set(cx-Math.floor(width/2)+x,11+y,pixel);
  }
  return p;
}
