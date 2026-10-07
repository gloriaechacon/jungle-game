export const ACTIONS = ['up', 'down', 'left', 'right', 'a', 'b', 'start'] as const;
export type Action = (typeof ACTIONS)[number];
export type InputSnapshot = Readonly<Record<Action, boolean>>;
const directions:readonly Action[]=['up','down','left','right'];

const bindings: Readonly<Record<string, Action>> = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyK: 'a', KeyJ: 'b', Space: 'start',
};

// One source of truth shared by Phaser and the HTML presentation.
// Track physical keys, not just actions: releasing D must not cancel ArrowRight.
export class InputController {
  private keys = new Map<string,number>();
  private pointers = new Map<number,{actions:readonly Action[];order:number}>();
  private pressOrder=0;
  touchLayout = false;
  private listeners = new Set<(state: InputSnapshot) => void>();
  private scope: HTMLElement;
  private controller = new AbortController();
  private active = false;
  private enabled = true;
  private refreshFocus = () => {};

  constructor(scope: HTMLElement, onFocus: (active: boolean) => void) {
    this.scope = scope;
    const options = { signal: this.controller.signal };
    const refreshFocus = () => {
      this.active = this.enabled && document.hasFocus() && !document.hidden && document.activeElement === scope;
      if (!this.active) this.clear();
      onFocus(this.active);
    };
    scope.addEventListener('focus', refreshFocus, options);
    this.refreshFocus = refreshFocus;
    scope.addEventListener('blur', refreshFocus, options);
    window.addEventListener('blur', () => { this.active = false; this.clear(); onFocus(false); }, options);
    window.addEventListener('focus', refreshFocus, options);
    document.addEventListener('visibilitychange', refreshFocus, options);
    window.addEventListener('keydown', (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) { this.clear(); return; }
      if (!this.active || !bindings[event.code]) return;
      event.preventDefault();
      if (!this.keys.has(event.code)) { this.keys.set(event.code,++this.pressOrder); this.emit(); }
    }, options);
    window.addEventListener('keyup', (event) => {
      if (this.keys.delete(event.code)) { event.preventDefault(); this.emit(); }
    }, options);
    scope.addEventListener('pointerdown', () => this.focus(), options);
    refreshFocus();
  }

  get isActive() { return this.active; }
  /** Presentation can lock gameplay during power-on without changing bindings. */
  setEnabled(value:boolean) { this.enabled=value; this.refreshFocus(); }
  focus() { this.scope.focus({ preventScroll: true }); }

  snapshot(): InputSnapshot {
    const state = Object.fromEntries(ACTIONS.map(action => [action, false])) as Record<Action, boolean>;
    // Only one direction may reach gameplay or the photographed keys. The most
    // recent direction wins; A/B/START remain independent, including multitouch.
    let direction:Action|undefined,directionOrder=-1;
    const add=(action:Action,order:number)=>{
      if(directions.includes(action)){
        if(order>=directionOrder){direction=action;directionOrder=order;}
      } else state[action]=true;
    };
    for (const [code,order] of this.keys) { const action = bindings[code]; if (action) add(action,order); }
    for (const {actions,order} of this.pointers.values()) for (const action of actions) add(action,order);
    if(direction)state[direction]=true;
    return Object.freeze(state);
  }

  subscribe(listener: (state: InputSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  /** Each finger owns its actions: releasing one never cancels another/key. */
  setPointer(id:number,actions:readonly Action[]) {
    if(!this.active)return;
    const before=this.snapshot();
    const previous=this.pointers.get(id);
    const changedDirection=previous?.actions.find(a=>directions.includes(a))!==actions.find(a=>directions.includes(a));
    this.pointers.set(id,{actions,order:!previous||changedDirection?++this.pressOrder:previous.order});
    const after=this.snapshot();
    if(ACTIONS.some(action=>before[action]!==after[action]))this.emit();
  }
  releasePointer(id:number) { if(this.pointers.delete(id))this.emit(); }
  hasPointer(id:number) { return this.pointers.has(id); }
  clear() { if (this.keys.size||this.pointers.size) { this.keys.clear(); this.pointers.clear(); this.pressOrder=0; this.emit(); } }
  private emit() { const state = this.snapshot(); this.listeners.forEach(listener => listener(state)); }
  destroy() { this.clear(); this.controller.abort(); this.listeners.clear(); }
}
