/** Short ending of stage three. Independent fixed-step rules; no B-01 changes. */
export const CART_STATE='berto:minecart';
export const CART={start:240,exit:2500,width:2612,speed:140,jump:210,gravity:640,launchMs:2500,step:1000/60} as const;
export const RAIL_POINTS:readonly (readonly [number,number])[]=[
  [224,112],[520,112],[650,44],[720,100],[738,128],[860,128],
  [1040,88],[1140,88],[1320,34],[1510,138],[1700,46],[1770,80],
  [1900,80],[2050,138],[2190,34],[2350,130],[2500,104],[2612,104],
];
export const RAIL_GAPS:readonly (readonly [number,number])[]=[[1080,1108],[1810,1844]];
// A broken, LOWER rail catches the cart naturally; this is not a jump gate.
export const RAIL_DROP:readonly [number,number]=[720,738];
export function railHeight(x:number){
  for(let i=1;i<RAIL_POINTS.length;i++){
    const [a,ay]=RAIL_POINTS[i-1],[b,by]=RAIL_POINTS[i];
    if(x<=b){const t=Math.max(0,(x-a)/(b-a));return ay+(by-ay)*t*t*(3-2*t);}
  }
  return 104;
}
export function railAt(x:number){return x>=224&&x<=CART.width&&![...RAIL_GAPS,RAIL_DROP].some(([a,b])=>x>a&&x<b)?railHeight(x):undefined;}
export const CART_BANANAS=[
  ...[290,320].map(x=>({x,y:railHeight(x)-23})),
  ...[430,452,474,600,622,644,1042,1064,1086,1370,1392,1414,1770,1792,1814,2060,2082,2104,2250,2272,2294,2400,2422,2444]
    .map(x=>({x,y:railHeight(x)-45})),
].map((p,i)=>({...p,id:`minecart-banana-${i}`,collected:false}));
export type CartPhase='launch'|'riding'|'falling'|'retry'|'complete';
export class MinecartRun {
  phase:CartPhase='launch';elapsed=0;phaseMs=0;x:number=CART.start;feet=112;vy=0;grounded=true;
  deaths=0;jumps=0;jumped=false;collectedNow=0;private previousA=false;private jumpBuffer=0;private coyote=0;
  pickups=CART_BANANAS.map(p=>({...p}));
  sync(a:boolean){this.previousA=a;this.jumpBuffer=0;}
  step(ms:number,a:boolean){
    if(this.phase==='complete')return;
    const dt=Math.min(Math.max(0,ms),CART.step),s=dt/1000,press=a&&!this.previousA;
    this.previousA=a;this.jumped=false;this.collectedNow=0;
    this.elapsed+=dt;this.phaseMs+=dt;
    if(this.phase==='launch'){
      if(this.phaseMs>=CART.launchMs){this.phase='riding';this.phaseMs=0;this.jumpBuffer=0;}
      return;
    }
    if(this.phase==='retry'){
      if(press&&this.phaseMs>300){
        this.phase='riding';this.phaseMs=0;this.x=CART.start;this.feet=railHeight(this.x);this.vy=0;
        this.grounded=true;this.coyote=0;this.jumpBuffer=0;
      }
      return;
    }
    if(this.phase==='falling'){
      this.feet+=this.vy*s;this.vy+=CART.gravity*s;
      if(this.phaseMs>=700){this.phase='retry';this.phaseMs=0;this.deaths++;}
      return;
    }
    this.jumpBuffer=press?110:Math.max(0,this.jumpBuffer-dt);
    this.coyote=this.grounded?75:Math.max(0,this.coyote-dt);
    if(this.jumpBuffer>0&&this.coyote>0){
      this.vy=-CART.jump;this.grounded=false;this.jumpBuffer=0;this.coyote=0;this.jumps++;this.jumped=true;
    }
    const oldFeet=this.feet,oldRail=railHeight(this.x);
    this.x+=CART.speed*s;
    const rail=railAt(this.x);
    if(this.grounded&&rail!==undefined)this.feet=rail;
    else {
      this.grounded=false;this.vy+=CART.gravity*s;this.feet+=this.vy*s;
      // Contact is relative to the rail, not world vertical speed. A steep
      // uphill rail can catch the wheels while the cart is still ascending.
      if(rail!==undefined&&oldFeet<=oldRail+1.5&&this.feet>=rail){this.feet=rail;this.vy=0;this.grounded=true;}
    }
    for(const p of this.pickups)if(!p.collected&&Math.abs(this.x-p.x)<13&&Math.abs(this.feet-24-p.y)<13){
      p.collected=true;this.collectedNow++;
    }
    if(this.feet>railHeight(this.x)+45){this.phase='falling';this.phaseMs=0;}
    if(this.x>=CART.exit&&this.grounded){this.phase='complete';this.phaseMs=0;}
  }
}
