import type { InputController } from './input';

/** A real modal: background controls cannot restart/move the game accidentally. */
export function mountRestartDialog(trigger:HTMLButtonElement,controls:InputController,canResume:()=>boolean) {
  const abort=new AbortController(),events={signal:abort.signal};
  const dialog=document.createElement('dialog');dialog.id='restart-dialog';dialog.className='game-panel restart-dialog';dialog.hidden=true;
  dialog.setAttribute('aria-labelledby','restart-title');dialog.setAttribute('aria-describedby','restart-description');
  dialog.innerHTML=`<header class="panel-heading"><h2 id="restart-title">¿Empezar de cero?</h2><button type="button" id="restart-close" class="panel-close" aria-label="Cancelar reinicio">×</button></header>
    <div class="panel-body"><p id="restart-description">Perderás las bananas, las letras, los niveles completados y el progreso del bonus de esta partida.</p>
    <p class="panel-note">Volverás al encendido y al tutorial. Tus ajustes de sonido se conservarán.</p>
    <div class="restart-options"><button type="button" id="restart-cancel">Seguir jugando</button><button type="button" id="restart-confirm">Sí, empezar de cero</button></div></div>`;
  document.body.append(dialog);
  trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls',dialog.id);trigger.setAttribute('aria-expanded','false');
  const close=()=>{dialog.close();dialog.hidden=true;trigger.setAttribute('aria-expanded','false');controls.setEnabled(canResume());controls.focus();};
  trigger.addEventListener('click',()=>{
    window.dispatchEvent(new CustomEvent('berto:panel-open',{detail:dialog.id}));
    controls.setEnabled(false);controls.clear();dialog.hidden=false;dialog.showModal();trigger.setAttribute('aria-expanded','true');
    dialog.querySelector<HTMLButtonElement>('#restart-cancel')!.focus();
  },events);
  for(const id of ['restart-cancel','restart-close'])dialog.querySelector(`#${id}`)!.addEventListener('click',close,events);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();},events);
  window.addEventListener('keydown',e=>{
    if(!dialog.open||e.code!=='Escape')return;
    e.preventDefault();e.stopImmediatePropagation();close();
  },{...events,capture:true});
  dialog.querySelector('#restart-confirm')!.addEventListener('click',()=>{
    // Campaign, practice and bonus live only in memory. Reload resets all three,
    // while leaving the independently autosaved sound preferences untouched.
    controls.setEnabled(false);controls.clear();location.reload();
  },events);
  return {get open(){return dialog.open;},destroy(){abort.abort();dialog.close();dialog.remove();}};
}
