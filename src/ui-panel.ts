import type { InputController } from './input';
import './ui-panel.css';

const OPEN='berto:panel-open';

/** Shared, modeless panels: explicit close, one open at a time, no save action. */
export function mountPanel(panel:HTMLElement,trigger:HTMLButtonElement,controls:InputController,
  options:{title:string;closeId:string;onChange?:(open:boolean)=>void;onClose?:()=>void}) {
  const abort=new AbortController(),events={signal:abort.signal};
  panel.classList.add('game-panel');panel.hidden=true;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby',`${panel.id}-title`);
  trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls',panel.id);
  trigger.setAttribute('aria-expanded','false');
  const header=document.createElement('header');header.className='panel-heading';
  const title=document.createElement('h2');title.id=`${panel.id}-title`;title.textContent=options.title;
  const closeButton=document.createElement('button');closeButton.type='button';closeButton.id=options.closeId;
  closeButton.className='panel-close';closeButton.setAttribute('aria-label',`Cerrar ${options.title.toLowerCase()}`);
  closeButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  header.append(title,closeButton);panel.prepend(header);
  const close=(restoreFocus=true)=>{
    if(panel.hidden)return;
    panel.hidden=true;trigger.setAttribute('aria-expanded','false');options.onChange?.(false);
    if(restoreFocus){controls.focus();options.onClose?.();}
  };
  trigger.addEventListener('click',()=>{
    if(!panel.hidden){close();return;}
    window.dispatchEvent(new CustomEvent(OPEN,{detail:panel.id}));
    panel.hidden=false;panel.scrollTop=0;trigger.setAttribute('aria-expanded','true');options.onChange?.(true);
    closeButton.focus({preventScroll:true});
  },events);
  closeButton.addEventListener('click',()=>close(),events);
  // Capture before the game's Escape-to-map handler; closing a panel must not
  // accidentally abandon the current level in the same keyboard event.
  window.addEventListener('keydown',e=>{
    if(panel.hidden||e.code!=='Escape')return;
    e.preventDefault();e.stopImmediatePropagation();close();
  },{...events,capture:true});
  window.addEventListener(OPEN,e=>{if((e as CustomEvent<string>).detail!==panel.id)close(false);},events);
  return {close,destroy(){close(false);abort.abort();header.remove();}};
}
