export const CELEBRATION_MS=5800;
/** Front settle, alternating arms, raised fists, then three overhead claps. */
export function celebrationFrame(time:number) {
  if(time<400)return 0;
  if(time<1040)return 1+Math.floor((time-400)/160)%2;
  if(time<1260)return 3;
  if(time>=CELEBRATION_MS)return 0;
  const sequence=[4,5,6,5,4,7,5,6,5,7];
  return sequence[Math.floor((time-1260)/170)%sequence.length];
}
