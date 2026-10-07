import type { InputController } from './input';
import { mountTouchControls } from './touch-controls';
import { controlText } from './control-labels';
import { mountPanel } from './ui-panel';
import { mountRestartDialog } from './restart-dialog';
import { tutorialCoach, type PracticeHint, type CoachHint } from './tutorial-coach';
import { TIRE_GUIDE, tireCoach } from './level-hints';
import type { EndingChoice } from './demo-scenes';
import './console.css';

// Measured coordinates on the photo-derived asset, 981 x 1604. The LCD is live.
const PHOTO={width:981,height:1604,lcdX:247,lcdY:183,lcdWidth:486};
const LCD_H=PHOTO.lcdWidth*144/160;
const ZOOM_MS=1800,READY_MS=3400;

export function mountConsole(panel:HTMLElement,controls:InputController,onEndingAction:(choice:EndingChoice)=>void,onPowerStart:()=>void) {
  document.body.classList.add('cinematic-console');
  document.title='Going Bananas';
  const shell=document.querySelector<HTMLElement>('#console-shell')!;
  const space=document.querySelector<HTMLElement>('#screen-space')!;
  const image=document.createElement('img');image.className='console-photo';image.src='/assets/console-teal.png';
  image.alt='Consola Game Boy Color teal, vista frontal con botones y carcasa de textura realista';image.draggable=false;
  shell.prepend(image);
  const led=document.createElement('span');led.className='power-led';led.setAttribute('aria-hidden','true');shell.append(led);
  const boot=document.createElement('div');boot.className='lcd-boot';boot.setAttribute('aria-hidden','true');
  const logo=document.createElement('div');logo.className='boot-logo';
  // Display the very same lettering as the bezel: a CSS viewport on the existing
  // photograph, not a substitute font or a newly generated logo asset.
  const logoImage=document.createElement('img');logoImage.className='boot-logo-image';
  logoImage.src=image.src;logoImage.alt='GAME BOY COLOR';logoImage.draggable=false;
  logo.append(logoImage);boot.append(logo);space.append(boot);
  const toolbar=document.createElement('nav');toolbar.className='console-toolbar';toolbar.setAttribute('aria-label','Vista de consola');
  const button=(id:string,label:string,action:()=>void)=>{const b=document.createElement('button');b.id=id;b.type='button';b.textContent=label;b.addEventListener('click',action);toolbar.append(b);return b;};
  let closeup=false,ready=false,started=false,elapsed=0,last=0,raf=0,destroyed=false;
  let screenName='',practice:PracticeHint|undefined;
  let completedStages:readonly string[]=[];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const abort=new AbortController();
  const bootKeys=new Set<string>();
  const welcome=document.createElement('button');welcome.id='power-start';welcome.type='button';
  welcome.innerHTML='<strong>Toca el Game Boy para iniciar</strong><span>Haz clic o toca la consola · Con sonido</span>';
  panel.append(welcome);
  const coach=document.createElement('div');coach.id='console-coach';coach.hidden=true;
  coach.setAttribute('role','status');coach.setAttribute('aria-live','polite');panel.append(coach);
  const coachTitle=document.createElement('small'),coachAction=document.createElement('strong'),coachDetail=document.createElement('span');
  coach.append(coachTitle,coachAction,coachDetail);
  const ring=document.createElement('div');ring.className='coach-ring';ring.hidden=true;ring.setAttribute('aria-hidden','true');panel.append(ring);
  const secondRing=ring.cloneNode() as HTMLDivElement;panel.append(secondRing);
  let coachTarget:HTMLElement|undefined;
  let coachTargets:string[]=[];
  const coarse=matchMedia('(any-pointer: coarse)');
  const touch=mountTouchControls(shell,controls);
  const helpCard=document.querySelector<HTMLElement>('.control-card')!;
  helpCard.id='controls-panel';helpCard.classList.add('game-help');
  const helpSummary=document.createElement('section');helpSummary.className='help-summary';
  helpSummary.innerHTML=`<p class="help-device"><span class="help-touch">Toca los botones de la consola.</span><span class="help-keyboard">Usa las teclas de tu teclado.</span></p><dl>
    <div><dt>Caminar</dt><dd><span class="help-touch">Mantén ← o → en la cruceta.</span><span class="help-keyboard">Mantén la tecla <kbd class="control-key">A</kbd> o <kbd class="control-key">D</kbd>.</span></dd></div>
    <div><dt>Saltar</dt><dd><span class="help-touch">Toca el botón <b class="control-key console-button">A</b>. Mantén A para saltar más alto.</span><span class="help-keyboard">Presiona la tecla <kbd class="control-key">K</kbd>. Mantén K para saltar más alto.</span></dd></div>
    <div><dt>Rodar / correr</dt><dd><span class="help-touch">Toca <b class="control-key console-button">B</b> para rodar. Mantén B y una flecha para correr.</span><span class="help-keyboard">Presiona <kbd class="control-key">J</kbd> para rodar. Mantén J y una dirección para correr.</span></dd></div>
    <div><dt>Barriles</dt><dd><span class="help-touch">Mantén el botón B cerca del barril. Suéltalo para lanzar.</span><span class="help-keyboard">Mantén la tecla J cerca del barril. Suéltala para lanzar.</span></dd></div>
    <div><dt>Lianas</dt><dd><span class="help-touch">Mantén ↑ para agarrarte y subir; ↓ para bajar. Toca A para soltarte.</span><span class="help-keyboard">Mantén W para agarrarte y subir; S para bajar. Presiona K para soltarte.</span></dd></div>
    <div><dt>Bajar repisas</dt><dd><span class="help-touch">Toca ↓ si hay suelo debajo.</span><span class="help-keyboard">Presiona la tecla S si hay suelo debajo.</span></dd></div>
    <div><dt>Pausa / mapa</dt><dd><span class="help-touch">Toca START. Elige con ↑ / ↓ y confirma con A. B vuelve atrás.</span><span class="help-keyboard">Presiona Espacio (START). Elige con W / S y confirma con K. J vuelve atrás.</span> Aquí puedes seguir, volver al mapa u omitir el tutorial.</dd></div>
    </dl><p class="panel-note"><span class="help-touch">Puedes mantener una flecha y A/B con varios dedos.</span><span class="help-keyboard">Las teclas se pueden combinar: dirección + J + K.</span></p>`;
  helpCard.prepend(helpSummary);
  let guideText='';
  const skip=button('skip-power','Saltar encendido',()=>finish());
  const help=button('console-help','Controles y ayuda',()=>{});
  const helpPanel=mountPanel(helpCard,help,controls,{title:'Cómo jugar',closeId:'console-help-close',onChange:open=>document.body.classList.toggle('console-help-open',open)});
  const restart=button('restart-game','Reiniciar Game Boy',()=>{});restart.hidden=true;
  helpCard.append(restart);
  const restartDialog=mountRestartDialog(restart,controls,()=>ready&&!document.body.classList.contains('touch-landscape'));
  const rotate=document.createElement('div');rotate.className='rotate-phone';rotate.textContent='Gira el teléfono en vertical para jugar con la consola completa.';panel.append(rotate);
  const hint=document.createElement('p');hint.className='console-caption';hint.id='console-caption';hint.textContent='Una pequeña máquina. Toda una aventura.';
  panel.after(toolbar,hint);
  const guide=document.createElement('p');guide.className='console-guide';guide.hidden=true;panel.after(guide);
  const ending=document.createElement('section');ending.id='ending-actions';ending.hidden=true;
  ending.setAttribute('aria-label','Opciones al completar la aventura');
  // Pixel labels are drawn by Phaser; transparent native buttons give the same
  // LCD rows touch, mouse, Tab/Enter and screen-reader access without a footer.
  ending.innerHTML='<div class="ending-options"><button id="ending-map" type="button" aria-label="Volver al mapa. Conservar partida"></button><button id="ending-replay" type="button" aria-label="Volver a jugar. Empezar de cero"></button></div>';
  space.append(ending);
  for(const choice of ['map','replay'] as const)ending.querySelector(`#ending-${choice}`)!.addEventListener('click',()=>{
    controls.focus();onEndingAction(choice);
  },{signal:abort.signal});
  shell.querySelectorAll<HTMLElement>('[data-action]').forEach(node=>node.classList.add('photo-key'));

  function layout(){
    const mobile=coarse.matches&&window.innerWidth<=1000;
    const landscape=mobile&&window.innerWidth>window.innerHeight;
    const changed=controls.touchLayout!==mobile||document.body.classList.contains('touch-landscape')!==landscape;
    controls.touchLayout=mobile;
    document.body.classList.toggle('touch-console',mobile);
    document.body.classList.toggle('touch-landscape',landscape);
    // The only help action resets the console; game navigation lives on START.
    if(changed){touch.cancel();if(ready)controls.setEnabled(!landscape&&!restartDialog.open);}
    updateCoach();
    const w=panel.clientWidth,h=panel.clientHeight;
    const welcomeSpace=!started&&!ready?96:0;
    const baseHeight=Math.max(180,Math.min(h-(mobile?8:24)-welcomeSpace,(w-(mobile?8:20))*PHOTO.height/PHOTO.width,790));
    const baseWidth=baseHeight*PHOTO.width/PHOTO.height;
    shell.style.width=`${baseWidth}px`;shell.style.height=`${baseHeight}px`;
    // Fixed framing: showing, hiding or wrapping a hint must NEVER move the LCD.
    const scale=Math.max(1,Math.min(4,Math.floor(Math.min((w-48)/160,(h-112)/144))));
    let zoom=closeup&&!mobile?(160*scale)/(baseWidth*PHOTO.lcdWidth/PHOTO.width):1;
    const lcdCenterY=(PHOTO.lcdY+LCD_H/2)/PHOTO.height;
    let shift=closeup&&!mobile?(0.5-lcdCenterY)*baseHeight*zoom:welcomeSpace/2;
    if(closeup&&mobile&&!landscape){
      // Frame the bezel through START, cropping spare case/speaker, not the
      // controls. Keep the minimum 110px D-pad target inside even on short phones.
      const cropWidth=2*Math.max(.44,.5-.238+55/baseWidth+.01);
      const cropTop=.045,cropBottom=.87;
      zoom=Math.max(1,Math.min((w-8)/(baseWidth*cropWidth),(h-8)/(baseHeight*(cropBottom-cropTop))));
      shift=(.5-(cropTop+cropBottom)/2)*baseHeight*zoom;
    }
    shell.style.setProperty('--camera-zoom',String(zoom));shell.style.setProperty('--camera-y',`${shift}px`);
    shell.dataset.view=closeup?(!mobile?'screen':landscape?'whole':'controls'):'whole';
    panel.dataset.scale=String(baseWidth*zoom*PHOTO.lcdWidth/PHOTO.width/160);
    document.querySelector('#display-size')!.textContent=`160 × 144 · ${closeup&&!mobile?`${scale}×`:shell.dataset.view==='controls'?'vista táctil ampliada':'vista completa'}`;
    updateGuide();
    if(ready)hint.textContent=mobile?'Toca los botones de la consola para jugar.':'Usa tu teclado para jugar. Abre «Controles y ayuda» para ver las teclas.';
    positionCoach();
  }
  function stage(name:string){
    if(shell.dataset.power===name)return;
    shell.dataset.power=name;
    if(name==='off')hint.textContent='Toca o haz clic en el Game Boy para encenderlo. También puedes pulsar Espacio.';
    if(name==='logo')hint.textContent=controls.touchLayout?'GAME BOY COLOR · prepara los pulgares.':'GAME BOY COLOR · el acercamiento es automático.';
    if(name==='zoom')hint.textContent='Entrando en la aventura...';
  }
  function updateGuide(){
    // Tutorial actions live in one card, never repeated below the console.
    guide.textContent=practice||guideText.startsWith('TUTORIAL ·')?'':controlText(guideText.startsWith('SALTO:')||guideText===TIRE_GUIDE?'':guideText,controls.touchLayout);
    guide.hidden=!guide.textContent||!ready||!!practice?.complete||(!controls.touchLayout&&!!practice)||screenName==='title'||screenName==='map'||screenName==='intro';
  }
  function finish(){
    cancelAnimationFrame(raf);started=true;ready=true;closeup=true;welcome.hidden=true;stage('ready');layout();
    skip.hidden=true;restart.hidden=false;controls.setEnabled(!document.body.classList.contains('touch-landscape'));
    if(document.hasFocus())controls.focus();
  }
  function frame(time:number){
    if(destroyed)return;
    // After the explicit gesture, hidden time does not advance the cinematic.
    if(last&&!document.hidden)elapsed+=time-last;
    last=time;
    if(elapsed>=(reduced.matches?ZOOM_MS:READY_MS)){finish();return;}
    stage(elapsed<ZOOM_MS?'logo':'zoom');
    if(elapsed>=ZOOM_MS&&!closeup){closeup=true;layout();}
    raf=requestAnimationFrame(frame);
  }
  function prepare(){
    cancelAnimationFrame(raf);started=false;ready=false;closeup=false;elapsed=0;last=0;welcome.hidden=false;
    controls.setEnabled(false);controls.clear();stage('off');layout();
    skip.hidden=true;restart.hidden=true;
  }
  function begin(){
    if(started||ready)return;
    started=true;welcome.hidden=true;controls.clear();controls.focus();stage('logo');layout();
    skip.hidden=false;onPowerStart();
    raf=requestAnimationFrame(frame);
  }
  // Capture consumes the first touch, even on A/START: it powers on only.
  const beginPointer=(e:PointerEvent)=>{if(e.button!==0||started||ready)return;e.preventDefault();e.stopImmediatePropagation();begin();};
  shell.addEventListener('pointerdown',beginPointer,{capture:true,signal:abort.signal});
  welcome.addEventListener('pointerdown',beginPointer,{signal:abort.signal});
  welcome.addEventListener('click',begin,{signal:abort.signal});
  function updateCoach(){
    const mobile=controls.touchLayout;
    const tireHint=screenName==='level'&&!practice&&guideText===TIRE_GUIDE;
    const mineJump=screenName==='minecart'&&guideText.startsWith('SALTO:');
    const hint:CoachHint|undefined=ready?(screenName==='minecart'&&guideText.startsWith('SALTO:')?
      {title:'',action:mobile?'Toca el botón A para saltar':'Presiona la tecla K para saltar',detail:'',target:'a'}:
      screenName==='level'&&!practice&&guideText===TIRE_GUIDE?tireCoach(mobile):
      tutorialCoach(screenName,practice,mobile,completedStages)):undefined;
    // Only contextual jump reminders have external words. Title/map/tutorial
    // use the LCD and rings, including after restarting the entire Game Boy.
    const target=hint?.target??'',label=tireHint||mineJump?hint?.action??'':'';
    coachTargets=hint?.targets??(target?[target]:[]);
    coachTarget=target?shell.querySelector<HTMLElement>(`#touch-${target}`)??undefined:undefined;
    coach.hidden=!label;coach.dataset.target=target;coach.dataset.mode=mobile?'touch':'keyboard';
    coach.dataset.hint=tireHint?'tire':mineJump?'minecart':'rings';
    if(coachAction.textContent!==label){
      coachAction.replaceChildren();
      for(const part of label.split(/(\b(?:K|J|W|S|A|D|B)\b|[←→↑↓])/)){
        if(/^(?:K|J|W|S|A|D|B|[←→↑↓])$/.test(part)){
          const cap=document.createElement(mobile?'b':'kbd');cap.className=`control-key${mobile?' console-button':''}`;cap.textContent=part;coachAction.append(cap);
        }else coachAction.append(document.createTextNode(part));
      }
    }
    if(coachTitle.textContent!==hint?.title)coachTitle.textContent=hint?.title??'';
    if(coachDetail.textContent!==hint?.detail)coachDetail.textContent=hint?.detail??'';
    positionCoach();
  }
  function positionCoach(){
    const mobile=controls.touchLayout;
    const visible=ready&&(!coach.hidden||coachTargets.length>0)&&!document.body.classList.contains('touch-landscape')&&
      !document.querySelector('.game-panel:not([hidden])');
    coach.style.visibility=visible&&!coach.hidden?'visible':'hidden';
    ring.hidden=!visible||!mobile||!coachTargets[0];secondRing.hidden=!visible||!mobile||!coachTargets[1];
    if(!visible)return;
    if(!mobile){coach.style.left='50%';coach.style.top='16px';coach.style.removeProperty('--arrow-x');return;}
    const p=panel.getBoundingClientRect();
    // The D-pad's accessible hit areas are larger than the photographed keys.
    // Point at the actual plastic, not the centre of that invisible padding.
    const direction:Record<string,[number,number]>={right:[.306,.65],left:[.166,.65],up:[.238,.609],down:[.238,.69]};
    const bounds=(action:string)=>{
      const point=direction[action];
      if(point){const s=shell.getBoundingClientRect();return new DOMRect(s.x+(point[0]-.0525)*s.width,s.y+(point[1]-.032)*s.height,.105*s.width,.064*s.height);}
      return shell.querySelector<HTMLElement>(`#touch-${action}`)!.getBoundingClientRect();
    };
    for(const [i,marker] of [ring,secondRing].entries()){
      const action=coachTargets[i];marker.dataset.action=action??'';if(!action)continue;
      const rect=bounds(action);
      marker.style.left=`${rect.x-p.x-3}px`;marker.style.top=`${rect.y-p.y-3}px`;
      marker.style.width=`${rect.width+6}px`;marker.style.height=`${rect.height+6}px`;
    }
    if(coach.hidden)return;
    if(coach.dataset.hint==='tire'){
      // A compact top-left reminder leaves the mute button, LCD and all touch
      // targets clear, without shifting or rescaling the console for a hint.
      const lcd=space.getBoundingClientRect();
      coach.style.left='10px';coach.style.top=`${Math.max(4,Math.min(16,lcd.top-p.top-coach.offsetHeight-6))}px`;
      coach.style.removeProperty('--arrow-x');return;
    }
    const b=coachTarget?bounds(coach.dataset.target!):undefined;
    const width=coach.offsetWidth,cx=b?b.x+b.width/2-p.x:p.width/2;
    // Anchor every lesson to the same clear bezel area, not each target's height.
    const lcd=space.getBoundingClientRect(),firstKey=Math.min(bounds('up').top,bounds('a').top);
    const left=Math.max(10,(p.width-width)/2);
    const top=Math.max(lcd.bottom-p.top+8,firstKey-p.top-100);
    coach.style.left=`${left}px`;coach.style.top=`${top}px`;
    coach.style.setProperty('--arrow-x',`${cx-left}px`);
  }
  let coachRAF=0;
  const follow=()=>{if(destroyed)return;positionCoach();coachRAF=requestAnimationFrame(follow);};
  coachRAF=requestAnimationFrame(follow);
  const resizeObserver=new ResizeObserver(layout);resizeObserver.observe(panel);
  coarse.addEventListener('change',layout,{signal:abort.signal});
  window.addEventListener('resize',layout,{signal:abort.signal});
  // Exclude time in a hidden tab, but never gate this timer on keyboard focus.
  document.addEventListener('visibilitychange',()=>{last=0;},{signal:abort.signal});
  window.addEventListener('keydown',e=>{if(!ready&&e.code==='Escape'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();e.stopImmediatePropagation();finish();}},{signal:abort.signal});
  window.addEventListener('keydown',e=>{
    if(bootKeys.has(e.code)){e.preventDefault();e.stopImmediatePropagation();return;}
    if(!started&&!ready&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&['Space','KeyK'].includes(e.code)&&
      (document.activeElement===panel||document.activeElement===welcome||document.activeElement===document.body)){
      e.preventDefault();e.stopImmediatePropagation();bootKeys.add(e.code);begin();
    }
  },{capture:true,signal:abort.signal});
  window.addEventListener('keyup',e=>bootKeys.delete(e.code),{capture:true,signal:abort.signal});
  window.addEventListener('blur',()=>bootKeys.clear(),{signal:abort.signal});
  prepare();
  image.decode().catch(()=>{if(!destroyed){finish();hint.textContent='No se pudo cargar la carcasa. Recarga para volver a intentarlo.';}});
  return {
    resize:layout,
    guide(text:string){guideText=text;updateGuide();updateCoach();},
    screen(name:string,completed:readonly string[]=[]){screenName=name;completedStages=completed;practice=undefined;layout();},
    practice(value:PracticeHint|undefined){
      const changed=practice?.step!==value?.step||practice?.instruction!==value?.instruction||practice?.complete!==value?.complete||practice?.retrying!==value?.retrying||practice?.barrelPhase!==value?.barrelPhase;
      practice=value;if(changed)layout();
    },
    endingMenu(state:{ready:boolean;choice:EndingChoice}){
      ending.hidden=!state.ready;document.body.classList.toggle('ending-menu-open',state.ready);
      for(const choice of ['map','replay'])ending.querySelector<HTMLElement>(`#ending-${choice}`)!.dataset.selected=String(state.choice===choice);
    },
    destroy(){destroyed=true;cancelAnimationFrame(raf);cancelAnimationFrame(coachRAF);abort.abort();restartDialog.destroy();helpPanel.destroy();touch.destroy();resizeObserver.disconnect();toolbar.remove();hint.remove();guide.remove();ending.remove();welcome.remove();coach.remove();ring.remove();secondRing.remove();document.body.classList.remove('ending-menu-open');rotate.remove();helpSummary.remove();},
  };
}
