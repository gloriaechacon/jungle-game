import {Pix,hex as c} from './pixel.mjs';

export function minecart(frame=0){
  const p=new Pix(36,28),ink=c('#18191c'),dark=c('#383d42'),mid=c('#626b70'),light=c('#b6b9ac');
  p.polygon([[1,3],[31,1],[35,6],[32,22],[4,21]],ink);
  p.polygon([[3,5],[28,4],[28,19],[6,19]],mid);
  p.polygon([[28,4],[33,7],[30,20],[28,19]],dark);
  p.polygon([[3,5],[6,7],[8,19],[6,19]],c('#4a5155'));
  p.capsule(2,3,30,2,.8,light).capsule(30,2,34,6,.8,c('#858e8a'));
  p.rect(4,20,28,2,dark).rect(5,19,23,1,c('#92988f'));
  for(let i=0;i<23;i++){const x=7+(i*7)%20,y=7+(i*11)%10;p.rect(x,y,i%3===0?2:1,1,i%2?dark:c('#82877e'));}
  for(const x of [7,15,26,30]){p.set(x,7,light);p.set(x,8,ink);p.set(x-1,16,ink);}
  p.capsule(16,11,19,13,.6,dark);p.capsule(24,15,27,13,.6,light);
  for(const x of [9,27]){
    p.ellipse(x,23,5,5,ink).ellipse(x,23,4,4,mid).ellipse(x,23,2,2,dark);
    const a=frame*Math.PI/2;
    p.capsule(x-3*Math.cos(a),23-3*Math.sin(a),x+3*Math.cos(a),23+3*Math.sin(a),.5,light);
    p.set(x,23,light);
  }
  return p;
}

export function mineCannon(){
  const barrel=new Pix(32,40),p=new Pix(44,44),ink=c('#24170f'),dark=c('#63371f'),mid=c('#a66a3a'),lit=c('#e4b675');
  // Coopered cylinder: bowed wooden staves, curved metal hoops and an open lip.
  barrel.ellipse(16,21,14,18,ink);
  barrel.polygon([[6,7],[26,7],[29,17],[28,30],[25,36],[7,36],[4,30],[3,17]],mid);
  barrel.polygon([[5,10],[9,9],[7,23],[9,35],[6,32],[4,22]],dark);
  barrel.polygon([[23,8],[26,8],[29,20],[27,32],[24,36],[22,26]],dark);
  for(const x of [10,16,22]){
    barrel.capsule(x,9,x-1,24,.5,ink).capsule(x-1,24,x,35,.5,ink);
    barrel.capsule(x+1,10,x,23,.5,lit);
  }
  for(const y of [13,30]){
    barrel.ellipse(16,y,14,5,ink).ellipse(16,y-1,13,4,c('#667174'));
    barrel.ellipse(16,y-2,12,2,c('#adb8b2'));
    barrel.rect(4,y-4,24,3,mid);
    for(const x of [6,13,24]){barrel.set(x,y,c('#e2e1c2'));barrel.set(x,y+1,ink);}
  }
  barrel.ellipse(16,7,12,6,ink).ellipse(16,6,11,5,lit);
  barrel.ellipse(16,6,8,3,dark).ellipse(16,5,7,2,c('#100e0d'));
  barrel.capsule(10,9,22,9,.5,c('#f4d8a1'));
  // A simple pale arrow reads as a launch barrel, without obscuring the wood.
  barrel.polygon([[12,23],[16,18],[20,23],[17,23],[17,27],[15,27],[15,23]],c('#f1d185'));
  // Nearest-neighbour rotation keeps the approved 44px atlas slot and mouth.
  const co=Math.cos(Math.PI/6),si=Math.sin(Math.PI/6);
  for(let y=0;y<44;y++)for(let x=0;x<44;x++){
    const dx=x-22,dy=y-22,sx=Math.round(16+dx*co+dy*si),sy=Math.round(20-dx*si+dy*co);
    if(sx>=0&&sx<32&&sy>=0&&sy<40)p.set(x,y,barrel.get(sx,sy));
  }
  return p;
}

export function mineWall(){
  const p=new Pix(160,144).fill(c('#100e12'));
  // Jagged strata and recessed crevices, not a flat wall behind the rails.
  for(let row=0;row<7;row++)for(let col=0;col<6;col++){
    const n=(row*37+col*19)%29,x=col*30-(row%2)*14,y=row*22;
    if((row>2&&col>1&&col<5)||n%7===0)continue;
    const w=24+n%8,h=17+n%6;
    p.polygon([[x,y+4],[x+w-5,y],[x+w,y+h-4],[x+w-6,y+h],[x+2,y+h-2]],c(row%2?'#352b29':'#45342d'));
    p.capsule(x+3,y+4,x+w-7,y+1,1,c('#66503d'));
    p.capsule(x+4,y+h-3,x+w-5,y+h-1,1,c('#201b1d'));
    for(let i=0;i<6;i++)p.rect(x+3+(i*7+n)%(w-5),y+5+(i*3)%(h-6),2,1,c(i%2?'#514030':'#231d1c'));
  }
  return p;
}

export function mineBeam(){
  const p=new Pix(64,128),ink=c('#1d1514'),wood=c('#513728'),lit=c('#886446');
  for(const x of [3,51]){
    p.rect(x,0,10,128,ink).rect(x+2,0,6,128,wood).rect(x+2,0,1,128,lit);
    for(let y=8;y<128;y+=19)p.capsule(x+3,y,x+6,y+9,.6,ink);
  }
  p.rect(0,0,64,10,ink).rect(0,2,64,6,wood).rect(0,2,64,1,lit);
  for(const x of [6,54]){p.rect(x,4,2,2,c('#9e9d86'));p.rect(x,117,2,2,c('#9e9d86'));}
  return p;
}

export function mineEntrance(){
  const p=new Pix(88,88),ink=c('#131518'),dark=c('#343841'),mid=c('#666b6c'),lit=c('#9da391');
  p.polygon([[1,87],[6,42],[18,17],[40,3],[55,6],[73,25],[85,64],[87,88]],dark);
  for(const [x,y,w,h] of [[8,44,15,25],[16,24,17,19],[31,10,18,20],[48,11,17,21],[63,31,17,25],[67,58,17,28]]){
    p.polygon([[x,y+4],[x+w-4,y],[x+w,y+h-3],[x+3,y+h]],mid);
    p.capsule(x+2,y+4,x+w-5,y+1,.8,lit);
    p.capsule(x+3,y+h-2,x+w-2,y+h-4,.8,ink);
  }
  p.polygon([[22,88],[22,40],[32,26],[52,25],[66,40],[68,88]],ink);
  p.polygon([[26,85],[28,42],[36,32],[50,32],[59,45],[60,85]],c('#292b2b'));
  p.polygon([[35,84],[36,47],[44,39],[54,46],[58,84]],c('#090f12'));
  for(const x of [22,62])p.rect(x,39,5,49,c('#69492e')).rect(x,39,1,49,c('#c5a476'));
  p.rect(22,35,45,6,c('#69492e')).rect(22,35,45,1,c('#c5a476'));
  p.polygon([[23,87],[39,75],[54,75],[70,87]],c('#7e6d50'));
  p.capsule(0,85,45,80,1,lit).capsule(4,88,49,84,1,mid);
  // Small lamp, not fire mechanics; a welcoming readable final doorway.
  p.rect(13,47,8,13,ink).rect(15,49,4,8,c('#efb64d')).rect(16,49,2,6,c('#fff1ac'));
  p.rect(13,47,8,1,lit).rect(13,59,8,1,mid);
  return p;
}
