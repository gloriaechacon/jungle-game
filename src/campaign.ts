// Session-only progress. Pickup identities are scoped to a level; replay cannot farm totals.
import { COLLECTIBLE_WORD } from './collectibles';
import { bonusReward, isBonusResult } from './final-bonus';
export const STAGES = ['jungle', 'ropey', 'reptile'] as const;
export type Stage = typeof STAGES[number];
export interface Collected { id: string; letter?: string; special?: string; value?:number; collected: boolean }
type SavedItem=Pick<Collected,'letter'|'special'|'value'>;
export class Campaign {
  selected = 0;
  /** Start of the automatic map walk after completing a stage. */
  mapArrivalFrom?: number;
  private done = new Set<Stage>();
  private items = new Map<Stage, Map<string, SavedItem>>();
  private bonus = 0;
  private finalBonusPlayed = false;
  canPlayFinalBonus() { return this.done.size===STAGES.length&&!this.finalBonusPlayed; }
  /** Running out of play time consumes the one round, without awarding a prize. */
  expireFinalBonus() {
    if(!this.canPlayFinalBonus())return;
    this.finalBonusPlayed=true;
  }
  /** Settle the round once, including a loss. Prize amount is NOT play history. */
  awardFinalBonus(symbols:readonly (number|null)[]) {
    if(!this.canPlayFinalBonus()||!isBonusResult(symbols))return 0;
    this.finalBonusPlayed=true;
    const reward=bonusReward(symbols);this.bonus=reward;return reward;
  }
  unlocked(index: number) { return index >= 0 && index < STAGES.length && (index === 0 || this.done.has(STAGES[index - 1])); }
  completed(stage: Stage) { return this.done.has(stage); }
  restore(stage: Stage, pickups: Collected[]) {
    for (const p of pickups) if (this.items.get(stage)?.has(p.id)) p.collected = true;
  }
  complete(stage: Stage, pickups: Collected[]) {
    if (!this.unlocked(STAGES.indexOf(stage))) return;
    const saved = this.items.get(stage) ?? new Map<string, SavedItem>();
    for (const p of pickups) if (p.collected) saved.set(p.id, {letter:p.letter,special:p.special,value:p.value});
    this.items.set(stage, saved); this.done.add(stage);
    this.mapArrivalFrom = STAGES.indexOf(stage);
    this.selected = Math.min(STAGES.indexOf(stage) + 1, 2);
  }
  summary(stage?: Stage, pickups: Collected[] = []) {
    const unique = new Map<string, SavedItem>();
    for (const [level, saved] of this.items) for (const [id, letter] of saved) unique.set(`${level}/${id}`, letter);
    if (stage) for (const p of pickups) if (p.collected) unique.set(`${stage}/${p.id}`, {letter:p.letter,special:p.special,value:p.value});
    const levelBananas=[...unique.values()].filter(p=>!p.letter&&!p.special).reduce((n,p)=>n+(p.value??1),0);
    return { bananas:levelBananas+this.bonus,levelBananas,bonusBananas:this.bonus,
      comodines: [...unique.values()].filter(p=>p.special).length,
      letters: [...COLLECTIBLE_WORD].map(l => [...unique.values()].some(p=>p.letter===l) ? l : '-').join(''),
      completed: STAGES.filter(s => this.done.has(s)), finished: this.done.size === 3 };
  }
}
