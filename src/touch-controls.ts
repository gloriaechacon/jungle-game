import { ACTIONS, type Action, type InputController } from './input';

/** Four-way D-pad: dominant axis wins, neutral centre, never a diagonal. */
export function padActions(x:number,y:number):Action[] {
  if(x<0||x>1||y<0||y>1)return [];
  const dx=(x-.5)*2,dy=(y-.5)*2,ax=Math.abs(dx),ay=Math.abs(dy);
  if(Math.max(ax,ay)<.18)return [];
  return [ax>=ay?(dx<0?'left':'right'):(dy<0?'up':'down')];
}

/** Invisible generous hit targets on the photo; existing photo-key layers show
 * pressure. Pointer capture keeps holds reliable across fast finger movements.
 * No synthetic keyboard events, no gameplay/physics hooks.
 */
export function mountTouchControls(shell:HTMLElement,controls:InputController) {
  const root=document.createElement('div');root.className='touch-controls';
  root.setAttribute('aria-label','Controles de la consola');shell.append(root);
  const abort=new AbortController(),options={signal:abort.signal};
  const pad=document.createElement('div');pad.className='touch-pad';pad.id='touch-pad';root.append(pad);
  const buttons=new Map<Action,HTMLButtonElement>();
  const names:Record<Action,string>={up:'Arriba: agarrar y trepar / elegir',down:'Abajo: bajar / elegir',left:'Izquierda',right:'Derecha',a:'A: saltar / confirmar',b:'B: rodar, correr y barril / atrás',start:'START: pausa y opciones / mapa'};
  for(const action of ACTIONS){
    const b=document.createElement('button');b.type='button';b.id=`touch-${action}`;
    b.className=`touch-hit touch-${action}`;b.setAttribute('aria-label',names[action]);
    b.setAttribute('aria-pressed','false');b.dataset.touchAction=action;
    (['up','down','left','right'].includes(action)?pad:root).append(b);buttons.set(action,b);
    // Keyboard / assistive activation of a native button still uses shared input.
    b.addEventListener('click',e=>{
      e.preventDefault();
      if(e.detail!==0)return;
      controls.focus();const id=-1-ACTIONS.indexOf(action);controls.setPointer(id,[action]);
      setTimeout(()=>controls.releasePointer(id),90);
    },options);
  }
  const track=(target:HTMLElement,action?:Action)=>{
    const held=new Map<number,string>();
    const releaseId=(id:number)=>{
      if(!held.delete(id))return;
      controls.releasePointer(id);
      if(target.hasPointerCapture(id))target.releasePointerCapture(id);
    };
    const at=(e:PointerEvent)=>{
      const r=target.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
      return action?(x>=-.15&&x<=1.15&&y>=-.15&&y<=1.15?[action]:[]):padActions(x,y);
    };
    target.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;
      e.preventDefault();controls.focus();if(!controls.isActive)return;
      held.set(e.pointerId,e.pointerType);
      // Capture can be unavailable after native gesture cancellation. Global
      // release listeners below still clean up a contact in that case.
      try { target.setPointerCapture(e.pointerId); } catch { releaseId(e.pointerId);return; }
      controls.setPointer(e.pointerId,at(e));
    },options);
    target.addEventListener('pointermove',e=>{
      if(!held.has(e.pointerId))return;
      // A blur/rotation cleared this hold: don't resurrect it on a later move.
      if(!controls.isActive||!controls.hasPointer(e.pointerId)||e.buttons===0){releaseId(e.pointerId);return;}
      e.preventDefault();controls.setPointer(e.pointerId,at(e));
    },options);
    const release=(e:PointerEvent)=>releaseId(e.pointerId);
    for(const event of ['pointerup','pointercancel','lostpointercapture'] as const)target.addEventListener(event,release,options);
    for(const event of ['pointerup','pointercancel'] as const)window.addEventListener(event,release,{...options,capture:true});
    // Safety net for mobile browsers: native touch identifiers are NOT pointer
    // IDs. Only use touches.length===0 to release this target's touch contacts;
    // lifting A while another finger holds direction/B must not release them.
    window.addEventListener('touchend',e=>{
      if(e.touches.length===0)for(const [id,type] of held)if(type==='touch')releaseId(id);
    },{...options,capture:true,passive:true});
    window.addEventListener('touchcancel',()=>{
      for(const [id,type] of held)if(type==='touch')releaseId(id);
    },{...options,capture:true,passive:true});
    // Input clear (blur, dialog, power replay) also discards captures/held IDs.
    const off=controls.subscribe(()=>{
      for(const id of held.keys())if(!controls.isActive||!controls.hasPointer(id))releaseId(id);
    });
    return off;
  };
  const cleanup=[track(pad),...(['a','b','start'] as const).map(action=>track(buttons.get(action)!,action))];
  const off=controls.subscribe(state=>buttons.forEach((button,action)=>button.setAttribute('aria-pressed',String(state[action]))));
  root.addEventListener('contextmenu',e=>e.preventDefault(),options);
  const cancel=()=>{
    controls.clear();
  };
  // Native cancel/lost capture normally handle these; clearing all input is also
  // necessary when the browser resizes/reorients without cancelling contacts.
  window.addEventListener('orientationchange',cancel,options);
  window.addEventListener('pagehide',()=>controls.clear(),options);
  return {cancel,destroy(){abort.abort();cleanup.forEach(fn=>fn());off();controls.clear();root.remove();}};
}
