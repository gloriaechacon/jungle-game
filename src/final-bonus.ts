/** Final-only bonus. Matching all three symbols earns bananas, never letters. */
export const BONUS_SYMBOLS = ['banana','coconut','star','barrel'] as const;
export const BONUS_REWARD = 20;
export function isBonusResult(symbols:readonly (number|null)[]) {
  return symbols.length===3&&symbols.every(s=>s!==null&&Number.isInteger(s)&&s>=0&&s<BONUS_SYMBOLS.length);
}
export function bonusReward(symbols:readonly (number|null)[]) {
  return isBonusResult(symbols)&&symbols.every(s=>s===symbols[0])?BONUS_REWARD:0;
}
export const BONUS_X = [56,96,136] as const;
export const BONUS_SPAWN_X = 18;
export const BONUS_READ_MS = 1000;
export const BONUS_TIME_MS = 20000;
export const BONUS_BOTTOM = 80;
export const BONUS_STATE = 'berto:final-bonus';
export class FinalBonusRound {
  elapsed=0;
  readonly locked:(number|null)[]=[null,null,null];
  private readonly offsets:number[];
  completedAt?:number;
  expired=false;
  constructor(random:()=>number=Math.random) {
    this.offsets=BONUS_X.map(()=>Math.floor(random()*BONUS_SYMBOLS.length));
  }
  symbol(index:number) {
    return this.locked[index]??(this.offsets[index]+Math.floor(this.elapsed/(300+index*35)))%BONUS_SYMBOLS.length;
  }
  get remainingMs(){return Math.max(0,BONUS_TIME_MS-this.elapsed);}
  advance(ms:number) {
    if(this.completedAt!==undefined)return;
    this.elapsed=Math.min(BONUS_TIME_MS,this.elapsed+Math.max(0,ms));
    if(this.remainingMs===0){this.expired=true;this.completedAt=this.elapsed;}
  }
  hit(index:number) {
    if(this.completedAt!==undefined||index<0||index>=3||this.locked[index]!==null)return false;
    this.locked[index]=this.symbol(index);
    if(this.locked.every(s=>s!==null))this.completedAt=this.elapsed;
    return true;
  }
  /** Swept head contact catches a rising jump even on a slow display. */
  contact(x:number,previousHead:number,head:number,vy:number) {
    if(vy>=0||previousHead<BONUS_BOTTOM||head>BONUS_BOTTOM)return -1;
    return BONUS_X.findIndex(bx=>Math.abs(x-bx)<17);
  }
  get stars() {
    if(this.completedAt===undefined||this.expired)return 0;
    return 4-new Set(this.locked).size;
  }
  get reward() {return this.completedAt===undefined||this.expired?0:bonusReward(this.locked);}
}
