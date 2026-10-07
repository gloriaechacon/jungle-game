import Phaser from 'phaser';
import './style.css';
import { ACTIONS, InputController } from './input';
import { BootScene, DiagnosticScene, SCENE_CHANGED } from './scenes';
import { MovementLabScene, JungleGreyboxScene, physicsConfig, RESTART_LAB, TELEMETRY, TO_MAP, VISUAL_OPTIONS, type MovementTelemetry } from './movement';
import { MOVEMENT } from './tuning';
import { Campaign } from './campaign';
import { WorldMapScene } from './world-map';
import { TitleScene, StageIntroScene, DemoEndingScene, ENDING_ACTION, ENDING_MENU, type EndingChoice } from './demo-scenes';
import { mountConsole } from './console-presentation';
import { GameAudio } from './audio';
import { FinalBonusScene } from './final-bonus-scene';
import { BONUS_STATE } from './final-bonus';
import {MinecartScene} from './minecart-scene';
import {CART_STATE} from './minecart';
import { GAME_SOUND, trackFor, type SoundName } from './audio-events';

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element: ${id}`);
  return node as T;
}

const panel = element('lab-panel');
const status = element('input-status');
const controls = new InputController(panel, active => {
  const touch=document.body.classList.contains('touch-console');
  status.textContent = active ? (touch?'● Controles activos':'● Teclado activo') : (touch?'○ Toca la pantalla para continuar':'○ Haz clic en la pantalla para probar');
  status.dataset.active = String(active);
});
const buttonIndicators = ACTIONS.map(action => ({ action, node: document.querySelector<HTMLElement>(`[data-action="${action}"]`)! }));
const unsubscribe = controls.subscribe(state => {
  buttonIndicators.forEach(({ action, node }) => {
    node.dataset.pressed = String(state[action]);
    node.setAttribute('aria-label', `${action}: ${state[action] ? 'pulsado' : 'liberado'}`);
  });
});
const activateButton = element<HTMLButtonElement>('activate-input');
const activate = () => controls.focus();
activateButton.addEventListener('click', activate);

const sceneHistory: string[] = [];
const params = new URLSearchParams(location.search);
const diagnostic = params.has('diagnostic');
const lab = params.has('lab');
const greybox = params.has('greybox');
const phase5 = params.has('phase5');
const levelParam = !diagnostic && !lab && !greybox && !phase5 ? params.get('level') : null;
const ropey = levelParam === 'ropey';
const reptile = levelParam === 'reptile';
const jungle = !diagnostic && !lab;
// The normal URL opens the complete console directly, without changing the URL.
// Explicit level/lab routes and the old adventure/workbench links remain usable.
const adventure = jungle && !greybox && !phase5 &&
  (params.has('adventure') || (!params.has('level') && !params.has('workbench')));
const cinematic=adventure&&!params.has('workbench');
let presentation:ReturnType<typeof mountConsole>|undefined;
document.body.classList.toggle('visual-validation', jungle);
if (jungle) {
  const shell = document.createElement('div');
  shell.id = 'console-shell';
  const brand = document.createElement('div');
  brand.className = 'console-brand';
  brand.textContent = 'AVENTURA / MAQUETA DE CONSOLA';
  shell.append(element('screen-space'), brand, document.querySelector('.controls')!, document.querySelector('.start-row')!);
  panel.append(shell);
  document.querySelector('h1')!.textContent = greybox ? 'Un primer paseo por Jungle.' : 'Jungle Hijinxs';
  document.querySelector('.phase-tag')!.textContent = greybox ? 'FASE 3 · BLOQUES' : phase5 ? 'FASE 5 · RECORRIDO ANTERIOR' : 'FASE 6 · PRUEBA JUGABLE';
  document.querySelector('.control-card .eyebrow')!.textContent = 'LAPTOP / TECLADO / NAVEGADOR';
  document.querySelector('.control-card > .footnote:not(#gameplay-stats)')!.textContent = greybox ? 'Recorrido de bloques de fase 3, sin sistemas.' : 'Bananas y B/O se conservan al caer. El barril estrella guarda el retorno. Pisa, rueda o lanza un barril: mantener J no repite el ataque. Tras el checkpoint, toma carrera para el salto largo. Reiniciar borra el progreso.';
  if (!greybox) {
    // Phase 5: sprites on, collision outlines off by default (toggle to review).
    element('label-sprites').textContent = 'Sprites · revisión visual';
    element('label-body').textContent = 'Colisiones (DK 12×16, enemigos, barriles)';
    element<HTMLInputElement>('show-body').checked = false;
    document.querySelector('.intro')!.textContent = 'A/D: mover · K: saltar · Espacio: pausa. J: pulsar para rodar, mantener para correr. Cerca de un barril, J recoge; soltar J lo lanza.';
    document.querySelector('.mapping div:nth-child(2) dd')!.textContent = 'Rodar / correr / barril';
    element('restart-lab').textContent = 'Reiniciar Jungle';
  }
}

if(ropey) {
  document.querySelector('h1')!.textContent='Ropey Rampage';
  document.querySelector('.phase-tag')!.textContent='FASE 7 · CUERDAS';
  document.querySelector('.intro')!.textContent='A/D: mover · K: saltar · Salta hacia una liana y se agarra sola (en el suelo: W) · W/S: trepar · K: soltarse saltando (con A/D eliges el lado) · J: correr / barril · Espacio: pausa.';
  document.querySelector('.control-card > .footnote:not(#gameplay-stats)')!.textContent='Prueba la primera liana sobre suelo seguro: W para agarrarla, W hasta arriba (las manos llegan a las hojas: ese es el tope), K para soltarte. En las lianas que se balancean, espera que se acerquen y salta; mantener S en el aire deja pasar una liana. No se agarra llevando barril ni rodando. N/U y bananas persisten al caer; Reiniciar borra este nivel. Sprite provisional.';
  element('restart-lab').textContent='Reiniciar Ropey';
}
if(reptile) {
  document.querySelector('h1')!.textContent='Reptile Rumble';
  document.querySelector('.phase-tag')!.textContent='FASE 8 · CUEVA';
  document.querySelector('.intro')!.textContent='A/D: mover · K: saltar · J: rodar / correr / barril · Espacio: pausa. Cae sobre una llanta para rebotar; con K presionado rebota más alto.';
  document.querySelector('.control-card > .footnote:not(#gameplay-stats)')!.textContent='La primera llanta está sobre suelo seguro. La S es opcional (arriba de la primera llanta); si la omites, vuelve antes de la salida. Bananas y S persisten al caer; Reiniciar borra este nivel. Sprite de DK provisional.';
  element('restart-lab').textContent='Reiniciar Reptile';
}
if(jungle && !greybox) {
  // Independent test routes (no map or shared progress: that is Phase 9).
  const links: [string, string][] = ropey ? [['/?level=jungle', 'Volver a Jungle (prueba independiente)'], ['/?level=reptile', 'Probar fase 8: Reptile Rumble']]
    : reptile ? [['/?level=jungle', 'Volver a Jungle (prueba independiente)'], ['/?level=ropey', 'Probar fase 7: Ropey Rampage']]
    : [['/?level=ropey', 'Probar fase 7: Ropey Rampage'], ['/?level=reptile', 'Probar fase 8: Reptile Rumble']];
  for (const [href, text] of links) {
    const link=document.createElement('a'); link.href=href; link.textContent=text; link.className='level-link';
    document.querySelector('.control-card')!.append(link);
  }
}
element('visual-options').hidden = !jungle;
if (jungle && !greybox) {
  const link = document.createElement('a'); link.href = '/';
  link.textContent = 'Jugar aventura completa · fase 9'; link.className = 'adventure-link';
  document.querySelector('.control-card')!.append(link);
}
if (adventure) {
  document.querySelector('h1')!.textContent = 'Aventura en la jungla';
  document.querySelector('.phase-tag')!.textContent = 'FASE 10 · APRENDER Y EXPLORAR';
  document.querySelector('.intro')!.textContent = 'Antes de Jungle: práctica breve jugando. A/D mover, K saltar, J rodar / correr / barril, Espacio pausar. Esc vuelve al mapa. Busca bananas y BONUS por las rutas altas, o sigue por debajo. Sin comodines adicionales.';
  document.querySelector('.control-card > .footnote:not(#gameplay-stats)')!.textContent = 'Tres etapas en orden. K vuelve al mapa tras completar cada una. Bananas y BONUS se acumulan sin duplicarse al repetir niveles. Las letras son opcionales. Recargar la página borra la aventura; reiniciar una etapa conserva lo guardado en las ya completadas.';
}
element('tuning-version').textContent = `${MOVEMENT.version} · caminar ${MOVEMENT.walkSpeed} / correr ${MOVEMENT.runSpeed} px/s`;
if(cinematic) presentation=mountConsole(panel,controls,choice=>game.events.emit(ENDING_ACTION,choice),()=>sound?.activate());
const sound=jungle&&!greybox?new GameAudio(panel,controls):undefined;
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 160,
  height: 144,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#182d2b',
  scale: { mode: Phaser.Scale.NONE, width: 160, height: 144 },
  input: { keyboard: false, mouse: false, touch: false },
  audio: { noAudio: true },
  physics: physicsConfig,
  scene: [BootScene, DiagnosticScene, TitleScene, StageIntroScene, MinecartScene, FinalBonusScene, DemoEndingScene, WorldMapScene, MovementLabScene, JungleGreyboxScene],
  callbacks: {
    preBoot: instance => {
      instance.events.on('berto:pause-menu',(state:{open:boolean})=>{
        panel.dataset.pauseMenu=JSON.stringify(state);
        document.body.classList.toggle('console-menu-open',state.open);
        sound?.setState(state.open,false);
      });
      instance.events.on(ENDING_MENU,(state:{ready:boolean;choice:EndingChoice})=>presentation?.endingMenu(state));
      instance.events.on(GAME_SOUND,(name:SoundName)=>sound?.play(name));
      instance.events.on(BONUS_STATE,(state:{paused:boolean}|null)=>{
        panel.dataset.bonus=JSON.stringify(state);
        if(state)sound?.setState(state.paused,false);
      });
      instance.events.on(CART_STATE,(state:{paused:boolean}|null)=>{
        panel.dataset.minecart=JSON.stringify(state);
        if(state)sound?.setState(state.paused,false);
      });
      instance.events.on(RESTART_LAB,()=>sound?.resetAttempt());
      instance.registry.set('controls', controls);
      instance.registry.set('cinematic',cinematic);
      instance.registry.set('diagnostic', diagnostic);
      instance.registry.set('lab', lab);
      instance.registry.set('greybox', greybox);
      instance.registry.set('phase5', phase5);
      instance.registry.set('ropey', ropey);
      instance.registry.set('reptile', reptile);
      if (adventure) instance.registry.set('campaign', new Campaign());
      instance.events.on('berto:campaign', (data: ReturnType<Campaign['summary']>&{selected:number;screen:string}) => {
        presentation?.screen(data.screen,data.completed);
        panel.dataset.campaign = JSON.stringify(data);
        element('restart-lab').hidden = data.screen !== 'level';
        toMapButton.hidden = !['level','intro','ending','bonus','minecart'].includes(data.screen);
        element('restart-lab').textContent = 'Reiniciar esta etapa';
        document.querySelector('h1')!.textContent = data.screen === 'map' ? 'Aventura en la jungla' : ['Jungle Hijinxs', 'Ropey Rampage', 'Reptile Rumble'][data.selected];
        element('gameplay-stats').textContent = `Aventura: ${data.bananas} bananas · ${data.letters}`;
        element('movement-stats').hidden = data.screen !== 'level';
        if (data.screen !== 'level') element('movement-stats').dataset.state = '{}';
      });
      instance.registry.set('visualOptions', {
        silhouette: element<HTMLInputElement>('show-silhouette').checked,
        body: element<HTMLInputElement>('show-body').checked,
      });
      instance.events.on(TELEMETRY, (data: MovementTelemetry) => {
        sound?.setState(data.paused,!!data.finished&&data.minecartLaunch===undefined);
        presentation?.practice(data.practice);
        const meter = element('movement-stats');
        meter.textContent = `${data.paused ? 'PAUSA' : data.gameplay?.dying ? 'GOLPE' : data.grounded ? 'SUELO' : 'AIRE'} · X ${Math.round(data.x)} · VX ${Math.round(data.vx)} · VY ${Math.round(data.vy)}`;
        // Observable diagnostic state used by the movement acceptance tests.
        meter.dataset.state = JSON.stringify(data);
        const progress = element('gameplay-stats');
        progress.hidden = !data.gameplay;
        if (data.gameplay) progress.textContent = `${adventure ? 'Esta etapa · ' : ''}Bananas ${data.gameplay.bananas} · ${data.gameplay.letters} · ${data.gameplay.checkpoint ? 'Checkpoint activo' : 'Sin checkpoint'}${data.gameplay.carrying ? ' · Barril en manos' : ''}${data.finished ? ' · Completado' : ''}`;
      });
      instance.events.on(SCENE_CHANGED, (name: string) => {
        sound?.setScene(name, trackFor(name, { ropey: instance.registry.get('ropey'), reptile: instance.registry.get('reptile'),practice:instance.registry.get('practiceStep')!==undefined }));
        sceneHistory.push(name);
        element('scene-name').textContent = name;
        element('scene-path').textContent = sceneHistory.join(' → ');
      });
    },
    postBoot: () => { requestAnimationFrame(() => { resize(); controls.focus(); }); },
  },
});

const select = element<HTMLSelectElement>('scale-select');
const space = element('screen-space');
function resize() {
  const canvas = game.canvas;
  if (!canvas) return;
  if(presentation){
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Aventura en la jungla, pantalla de juego 160 por 144');
    presentation.resize();game.scale.refresh();return;
  }
  const maxFit = Math.floor(Math.min((panel.clientWidth-(jungle ? 64 : 32))/160, (panel.clientHeight-(jungle ? 152 : 32))/144));
  const fit = Math.max(1, maxFit);
  const requested = select.value === 'auto' ? fit : Number(select.value);
  const scale = Math.max(1, Math.min(requested, fit, 5));
  canvas.style.width = `${160*scale}px`;
  canvas.style.height = `${144*scale}px`;
  canvas.style.imageRendering = 'pixelated';
  canvas.setAttribute('aria-label', diagnostic ? 'Patrón de píxeles y controles a 160 por 144' : jungle ? (greybox ? 'Jungle en bloques con silueta provisional a 160 por 144' : 'Jungle Hijinxs a 160 por 144') : 'Prototipo de movimiento: rectángulo, suelo y plataformas a 160 por 144');
  if(ropey) canvas.setAttribute('aria-label','Ropey Rampage a 160 por 144');
  if(reptile) canvas.setAttribute('aria-label','Reptile Rumble a 160 por 144');
  canvas.setAttribute('role', 'img');
  space.style.width = `${160*scale}px`;
  space.style.height = `${144*scale}px`;
  element('display-size').textContent = `160 × 144 · ${scale}× · ${160*scale} × ${144*scale} CSS px`;
  element('scale-note').textContent = requested > scale
    ? `${requested}× solicitado · ${scale}× aplicado para conservar la pantalla completa.`
    : `Escala ${scale}× · proporción 10:9 · sin suavizado`;
  panel.dataset.scale = String(scale);
  game.scale.refresh();
}
const observer = new ResizeObserver(resize);
observer.observe(panel);
select.addEventListener('change', resize);
window.addEventListener('resize', resize);
const restartButton = element<HTMLButtonElement>('restart-lab');
const restart = () => { game.events.emit(RESTART_LAB); controls.focus(); };
restartButton.addEventListener('click', restart);
// Adventure: leave the stage and return to the map (also J from the pause menu).
const toMapButton = document.createElement('button');
toMapButton.type = 'button'; toMapButton.id = 'to-map'; toMapButton.textContent = 'Volver al mapa'; toMapButton.hidden = true;
toMapButton.title = 'Se descarta el intento actual; se conservan las etapas completadas.';
restartButton.after(toMapButton);
const playGuide=document.createElement('p');playGuide.id='play-guide';playGuide.setAttribute('aria-live','polite');
playGuide.style.cssText='font:600 18px/1.5 system-ui;color:#fff4cf;background:#10251f;padding:12px;border:1px solid #b9c990;white-space:pre-line';
playGuide.hidden=true;toMapButton.after(playGuide);
game.events.on('berto:guide',(text:string)=>{if(playGuide.textContent!==text)playGuide.textContent=text;playGuide.hidden=!text;presentation?.guide(text);});
game.events.on('berto:scene-changed',(scene:string)=>{if(scene==='WorldMapScene'){playGuide.hidden=true;presentation?.guide('');}});
const practiceButton=document.createElement('button');practiceButton.type='button';practiceButton.textContent='Repetir práctica';practiceButton.id='practice-again';practiceButton.hidden=!adventure;
playGuide.after(practiceButton);
game.events.on('berto:campaign',(state:{screen:string})=>{practiceButton.hidden=!adventure||state.screen!=='map';});
practiceButton.addEventListener('click',()=>{
  if(!game.scene.isActive('WorldMapScene'))return;
  game.registry.get('campaign').selected=0;
  game.registry.set('practiceStep',0);game.registry.set('ropey',false);game.registry.set('reptile',false);
  game.scene.stop('WorldMapScene');game.scene.start(cinematic?'StageIntroScene':'JungleGreyboxScene');controls.focus();
  if(!cinematic)game.events.emit('berto:campaign',{...game.registry.get('campaign').summary(),screen:'level',selected:0});
});
toMapButton.addEventListener('click', () => { game.events.emit(TO_MAP); controls.focus(); });
const escapeToMap = (event: KeyboardEvent) => {
  if (event.code !== 'Escape' || event.repeat || !adventure || cinematic || !controls.isActive || event.ctrlKey || event.altKey || event.metaKey) return;
  event.preventDefault(); game.events.emit(TO_MAP);
};
window.addEventListener('keydown', escapeToMap);
if (adventure) {
  const hint = document.createElement('p'); hint.className = 'footnote';
  hint.textContent = 'Esc: volver al mapa en cualquier momento. Al salir se descarta el intento actual.';
  toMapButton.after(hint);
}
const visualOptions = element('visual-options');
const updateVisuals = () => {
  game.events.emit(VISUAL_OPTIONS, {
    silhouette: element<HTMLInputElement>('show-silhouette').checked,
    body: element<HTMLInputElement>('show-body').checked,
  });
};
visualOptions.addEventListener('change', updateVisuals);
if (diagnostic) {
  restartButton.hidden = true;
  element('movement-stats').textContent = 'Diagnóstico de Phase A';
}

// Reveal only after the final presentation is mounted. Unhide and measure in
// this same task so the browser never paints the legacy laboratory in between.
const app=element('app');
app.hidden=false;
app.inert=false;
presentation?.resize();
document.querySelector('#startup')?.remove();

if (import.meta.hot) import.meta.hot.dispose(() => {
  sound?.destroy();
  presentation?.destroy();
  window.removeEventListener('keydown', escapeToMap);
  observer.disconnect();
  visualOptions.removeEventListener('change', updateVisuals);
  restartButton.removeEventListener('click', restart);
  window.removeEventListener('resize', resize);
  select.removeEventListener('change', resize);
  activateButton.removeEventListener('click', activate);
  unsubscribe();
  controls.destroy();
  game.destroy(true);
});
