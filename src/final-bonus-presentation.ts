/** Presentation only: contact height, symbol timing and payout stay in final-bonus.ts. */
export const BONUS_BARREL={width:34,height:36,turns:8,turnMs:55} as const;
export function bonusTurn(reelMs:number,index:number,locked:boolean){
  return locked?0:Math.floor(reelMs/BONUS_BARREL.turnMs+index*2)%BONUS_BARREL.turns;
}
export function bonusOopsFrame(resultMs:number){
  return resultMs<650?0:resultMs<1300?1:resultMs<2200?2:3;
}
export const BONUS_NO_PRIZE='SIN PREMIO\nBUEN INTENTO!';
