import {Pix} from './pixel.mjs';
import {PAL as C} from './dk.mjs';

// Bonus-only "oops / oh well". Approved celebration/gameplay poses untouched.
// Feet anchor (24,48), front-facing expression and open upturned palms.
export function bonusOops(frame){
  const p=new Pix(48,48),lift=[0,3,4,1][frame],hx=24+[0,-1,1,0][frame];
  for(const side of [-1,1]){
    const shoulder=24+side*10,elbow=24+side*14,hand=24+side*18;
    p.capsule(shoulder,28-lift/2,elbow,36-lift,4,C.K).capsule(elbow,36-lift,hand,33-lift*2,3,C.K);
    p.capsule(shoulder,28-lift/2,elbow,35-lift,3,C.F2).capsule(elbow,35-lift,hand,32-lift*2,2,C.F3);
    p.ellipse(hand,32-lift*2,4,2,C.S1).ellipse(hand,31-lift*2,3.5,1.2,C.S3);
    p.capsule(hand-side*2,31-lift*2,hand-side*3,28-lift*2,.65,C.S3);
    for(let f=-1;f<=1;f++)p.set(hand+f*2,30-lift*2,C.M1);
    p.capsule(24+side*7,36,24+side*8,44,4,C.K).capsule(24+side*7,36,24+side*8,44,3,C.F2);
    p.ellipse(24+side*9,46,5,2,C.S1).ellipse(23+side*9,45,4,1.5,C.S3);
  }
  p.ellipse(24,32,12,11,C.K).ellipse(24,31,11,10,C.F2);
  p.ellipse(21,28,8,6,C.F3).ellipse(24,36,8,5,C.F1);
  p.ellipse(hx-11,20,3,4,C.F1).ellipse(hx+11,20,3,4,C.F1);
  p.ellipse(hx,20,10,12,C.K).ellipse(hx,19,9,11,C.F2);
  p.polygon([[hx-6,11],[hx-2,4],[hx+1,7],[hx+4,6],[hx+7,13]],C.F2);
  p.capsule(hx-4,10,hx-2,7,1,C.F3);
  p.ellipse(hx,21,8,8,C.M1);
  for(const dx of [-4,4]){
    p.ellipse(hx+dx,19,4,5,C.M2).rect(hx+dx-2,18,4,3,C.W);
    p.rect(hx+dx+(frame===2?-1:0),18,2,3,C.K);
  }
  p.capsule(hx-7,16,hx-2,14,.6,C.F1).capsule(hx+2,15,hx+7,16,.6,C.F1);
  p.ellipse(hx,25,8,4.8,C.S2).ellipse(hx-1,24,7,3.7,C.M2);
  p.ellipse(hx,22,4,1.8,C.S1);p.set(hx-2,22,C.K);p.set(hx+2,22,C.K);
  if(frame===0)p.ellipse(hx,27,2,1.7,C.K);
  else p.capsule(hx-3,27,hx+3,frame===3?26:27,.65,C.S1);
  p.polygon([[21,31],[27,31],[25,34],[28,40],[24,43],[20,40],[23,34]],C.R);
  p.rect(23,37,2,3,C.Y);p.set(25,39,C.Y);
  return p;
}
