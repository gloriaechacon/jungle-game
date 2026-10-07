import type { InputController } from './input';
import { INTRO_TRACK, audioAssetPath, PLAYBACK_TRACKS, SOUND_NAMES, type MusicTrack, type SoundName } from './audio-events';
import { mountPanel } from './ui-panel';
import { requestPlaybackSession, type AudioSessionHost } from './audio-session';
import './audio.css';

type Settings = { muted:boolean; music:number; effects:number };
const DEFAULTS:Settings={muted:false,music:.35,effects:.65};
const STORE='berto-audio-v1';
function preferences():Settings {
  try {
    const p=JSON.parse(localStorage.getItem(STORE)||'null');
    if(p&&typeof p.muted==='boolean'&&Number.isFinite(p.music)&&Number.isFinite(p.effects))
      return {muted:p.muted,music:Math.max(0,Math.min(1,p.music)),effects:Math.max(0,Math.min(1,p.effects))};
  } catch { /* Storage can be disabled; audio still works for this visit. */ }
  return {...DEFAULTS};
}

/** One Web Audio context, independent of Phaser's disabled sound manager.
 * Pause suspends the audio clock, preserving both loop position and short cues.
 * Unlock is attempted only inside a trusted user gesture. No autoplay bypass.
 */
export class GameAudio {
  private context?:AudioContext;
  private musicGain?:GainNode;
  private effectsGain?:GainNode;
  private master?:GainNode;
  private loop?:AudioBufferSourceNode;
  private buffers=new Map<string,AudioBuffer>();
  private voices=new Set<AudioBufferSourceNode>();
  private lastPlayed=new Map<SoundName,number>();
  private played:Partial<Record<SoundName,number>>={};
  private settings=preferences();
  private abort=new AbortController();
  private load?:Promise<void>;
  private stateChange?:Promise<void>;
  private loaded=false;
  private unlocked=false;
  private error=false;
  private destroyed=false;
  private paused=false;
  private settingsOpen=false;
  private finished=false;
  private scene='';
  private duckUntil=0;
  private raf=0;
  private lastMeter=0;
  private lastMusic=-1;
  private loopStart=0;
  private track:MusicTrack=INTRO_TRACK;
  private loopTrack?:MusicTrack;
  private button:HTMLButtonElement;
  private quickMute:HTMLButtonElement;
  private dialog:HTMLDivElement;
  private status:HTMLParagraphElement;
  private panelUI:ReturnType<typeof mountPanel>;
  private storageUnavailable=false;
  private releaseSession?:()=>void;

  constructor(private panel:HTMLElement,private controls:InputController) {
    const options={signal:this.abort.signal};
    this.button=document.createElement('button');this.button.type='button';this.button.id='audio-toggle';
    this.button.setAttribute('aria-haspopup','dialog');this.button.setAttribute('aria-expanded','false');
    const toolbar=document.querySelector('.console-toolbar');
    if(toolbar)toolbar.append(this.button);else document.querySelector('.control-card')!.append(this.button);
    this.quickMute=document.createElement('button');this.quickMute.type='button';this.quickMute.id='quick-mute';
    this.quickMute.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/><path class="sound-waves" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/><path class="sound-off" d="m15 9 6 6m0-6-6 6"/></svg>';
    document.body.append(this.quickMute);
    this.quickMute.addEventListener('click',()=>{
      this.settings.muted=!this.settings.muted;this.save();this.controls.focus();
      if(!this.settings.muted)void this.unlock();
    },options);
    this.dialog=document.createElement('div');this.dialog.id='audio-panel';this.dialog.hidden=true;
    this.dialog.innerHTML=`<div class="panel-body">
      <p id="audio-status" role="status"></p>
      <label class="audio-mute"><input id="audio-muted" type="checkbox"> Silenciar todo</label>
      <label for="audio-music">Música <output id="audio-music-value"></output></label>
      <input id="audio-music" type="range" min="0" max="100" step="1">
      <label for="audio-effects">Efectos <output id="audio-effects-value"></output></label>
      <input id="audio-effects" type="range" min="0" max="100" step="1">
      <p id="audio-save-note" class="panel-note">Los cambios se guardan automáticamente.</p>
      <p class="panel-note">Escucha la música mientras ajustas el volumen; el juego queda pausado. ¿No suena en tu iPhone? Revisa el volumen multimedia y, si hace falta, desactiva el modo Silencio.</p></div>`;
    document.body.append(this.dialog);
    this.status=this.dialog.querySelector('#audio-status')!;
    this.panelUI=mountPanel(this.dialog,this.button,this.controls,{title:'Sonido',closeId:'audio-close',onChange:open=>{
      this.settingsOpen=open;
      if(open){this.clearEffects();this.duckUntil=0;}
      this.sync();
    },onClose:()=>{void this.unlock();}});
    // Opening settings during an already started game is an explicit preview
    // gesture, not permission to play before the console has been switched on.
    this.button.addEventListener('click',e=>{
      if(e.isTrusted&&this.settingsOpen&&document.querySelector<HTMLElement>('#console-shell')?.dataset.power==='ready')void this.unlock();
    },options);
    this.dialog.querySelector<HTMLInputElement>('#audio-muted')!.addEventListener('change',e=>{
      this.settings.muted=(e.target as HTMLInputElement).checked;this.save();
    },options);
    for(const name of ['music','effects'] as const) {
      this.dialog.querySelector<HTMLInputElement>(`#audio-${name}`)!.addEventListener('input',e=>{
        this.settings[name]=Number((e.target as HTMLInputElement).value)/100;this.save();
      },options);
    }
    // Before power-on, settings remain silent. Gameplay gestures unlock audio.
    window.addEventListener('keydown',e=>{
      if(e.isTrusted&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&this.controls.isActive&&
        /^(Key[WASDJK]|Arrow(Up|Down|Left|Right)|Space)$/.test(e.code))void this.unlock();
    },options);
    this.panel.addEventListener('pointerdown',e=>{if(e.isTrusted&&document.querySelector<HTMLElement>('#console-shell')?.dataset.power!=='off')void this.unlock();},options);
    // Touch activation is granted on release, unlike mouse pointerdown. Capture
    // also works when the D-pad owns the pointer and cancels synthetic clicks.
    const releaseGesture=(e:Event)=>{
      if(e.isTrusted&&(this.panel.contains(e.target as Node)||e.target===document.getElementById('power-start'))&&
        document.querySelector<HTMLElement>('#console-shell')?.dataset.power!=='off')void this.unlock();
    };
    for(const event of ['pointerup','touchend'])window.addEventListener(event,releaseGesture,{...options,capture:true,passive:true});
    document.getElementById('activate-input')?.addEventListener('click',e=>{if(e.isTrusted)void this.unlock();},options);
    for(const name of ['blur','focus'] as const)window.addEventListener(name,()=>this.sync(),options);
    document.addEventListener('visibilitychange',()=>this.sync(),options);
    this.renderSettings();
    this.meter();
    const tick=(time:number)=>{
      if(this.destroyed)return;
      this.sync();
      if(time-this.lastMeter>100){this.lastMeter=time;this.meter();}
      this.raf=requestAnimationFrame(tick);
    };
    this.raf=requestAnimationFrame(tick);
  }

  /** Called synchronously by the console's explicit power-on gesture. */
  activate(){void this.unlock();}
  private async unlock() {
    if(this.destroyed||this.settings.muted)return;
    if(document.querySelector<HTMLElement>('#console-shell')?.dataset.power==='off')return;
    this.releaseSession??=requestPlaybackSession(navigator as Navigator&AudioSessionHost);
    if(this.loaded&&this.unlocked&&!this.error&&this.context?.state==='running'){this.sync();return;}
    try {
      if(!this.context) {
        this.context=new AudioContext();
        this.musicGain=this.context.createGain();this.effectsGain=this.context.createGain();
        this.master=this.context.createGain();this.master.gain.value=0;
        // Headroom and a gentle safety limiter for overlapping pickups/impacts.
        const limiter=this.context.createDynamicsCompressor();
        limiter.threshold.value=-6;limiter.knee.value=8;limiter.ratio.value=8;
        limiter.attack.value=.003;limiter.release.value=.10;
        this.musicGain.connect(limiter);this.effectsGain.connect(limiter);limiter.connect(this.master);this.master.connect(this.context.destination);
      }
      // Call resume synchronously within the event before awaiting file fetches.
      await this.context.resume();
      if(this.destroyed)return;
      this.unlocked=this.context.state==='running';
      this.error=false;this.renderSettings();
      if(!this.load)this.load=this.loadBuffers();
      await this.load;
      if(this.error)this.load=undefined; // allow a later retry of the failed files
      this.sync();
    } catch {
      if(this.destroyed)return;
      this.error=true;this.load=undefined;this.renderSettings();
      // Failed/missing audio never prevents playing the game. Button can retry.
    }
  }

  private async loadBuffers() {
    // Preload the scene excerpts and existing responsive effects once per visit.
    // Each file is independent: one missing or undecodable file (a network error,
    // or a browser without AAC for the .m4a soundtracks) silences only that file,
    // never every effect. A retry (closing the Sound panel) fetches only what failed.
    const names=[...PLAYBACK_TRACKS,...SOUND_NAMES].filter(name=>!this.buffers.has(name));
    const results=await Promise.allSettled(names.map(async name=>[name,await this.fetchBuffer(name)] as const));
    if(this.destroyed)return;
    for(const r of results)if(r.status==='fulfilled')this.buffers.set(r.value[0],r.value[1]);
    this.loaded=true;
    this.error=results.some(r=>r.status==='rejected');
    this.startLoop();
    this.renderSettings();
  }
  private ensureTrack(name:MusicTrack) {
    if(!this.pendingTracks.has(name))this.pendingTracks.set(name,this.fetchBuffer(name).then(b=>{
      if(this.destroyed)return;this.buffers.set(name,b);this.startLoop();
    }).catch(()=>{this.pendingTracks.delete(name);/* music missing: the game and effects go on */}));
    return this.pendingTracks.get(name)!;
  }

  /** Start the scene's loop from its beginning when the place changes; the same
   * track keeps playing (a death or restart never restarts the music). */
  private async fetchBuffer(name:string) {
    const response=await fetch(`${import.meta.env.BASE_URL}audio/${audioAssetPath(name)}`,{signal:this.abort.signal});
    if(!response.ok)throw new Error('Audio asset unavailable');
    return this.context!.decodeAudioData(await response.arrayBuffer());
  }
  private pendingTracks=new Map<MusicTrack,Promise<void>>();
  private startLoop() {
    const ctx=this.context,buffer=this.buffers.get(this.track);
    if(!ctx||!this.loaded||this.loopTrack===this.track)return;
    if(!buffer) {
      // Silence the previous place's music while this one downloads.
      this.loop?.stop();this.loop?.disconnect();this.loop=undefined;this.loopTrack=undefined;
      void this.ensureTrack(this.track);
      return;
    }
    this.loop?.stop();this.loop?.disconnect();
    this.loop=ctx.createBufferSource();this.loop.buffer=buffer;this.loop.loop=true;
    this.loop.connect(this.musicGain!);this.loopStart=ctx.currentTime;this.loop.start();
    this.loopTrack=this.track;
  }

  setScene(name:string,track?:MusicTrack) {
    if(track)this.track=track;
    this.startLoop();
    this.scene=name;this.paused=false;this.finished=name==='DemoEndingScene';this.duckUntil=0;
    this.clearEffects();this.lastPlayed.clear();this.sync();
    // The supplied tutorial/ending theme continues behind the ending choices.
  }
  setState(paused:boolean,finished:boolean) {this.paused=paused;this.finished=finished;this.sync();}
  resetAttempt() {this.clearEffects();this.lastPlayed.clear();this.duckUntil=0;}

  play(name:SoundName) {
    const ctx=this.context,buffer=this.buffers.get(name);
    // Drop effects before unlocking/loading: never replay a backlog on activation.
    if(!ctx||!buffer||!this.loaded||!this.unlocked||!this.canRun()||this.settings.effects===0)return;
    const now=ctx.currentTime;
    if(now-(this.lastPlayed.get(name)??-Infinity)<.055)return;
    this.lastPlayed.set(name,now);
    if(name==='hit'||name==='fall'||name==='victory')this.clearEffects();
    if(this.voices.size>=8){const oldest=this.voices.values().next().value;if(oldest){oldest.stop();oldest.disconnect();this.voices.delete(oldest);}}
    const source=ctx.createBufferSource();source.buffer=buffer;source.connect(this.effectsGain!);
    this.voices.add(source);
    source.onended=()=>{source.disconnect();this.voices.delete(source);};source.start();
    this.played[name]=(this.played[name]??0)+1;
    if(['hit','fall','checkpoint','letter','victory'].includes(name))this.duckUntil=now+buffer.duration+.08;
    this.sync();this.meter();
  }

  private canRun() {
    const power=document.querySelector<HTMLElement>('#console-shell')?.dataset.power;
    // The explicit click starts title music during the cinematic; gameplay is
    // still input-locked. Replay from a level must not start that level's music.
    const boot=(power==='logo'||power==='zoom')&&this.scene==='TitleScene'&&document.activeElement===this.panel;
    if(boot)return !document.hidden&&document.hasFocus()&&!this.settings.muted;
    if(this.settingsOpen&&power==='ready')return !document.hidden&&document.hasFocus()&&!this.settings.muted;
    return this.controls.isActive&&!document.hidden&&document.hasFocus()&&!this.paused&&!this.settings.muted&&
      (!power||power==='ready')&&['JungleGreyboxScene','WorldMapScene','TitleScene','StageIntroScene','DemoEndingScene','FinalBonusScene','MinecartScene'].includes(this.scene);
  }
  private sync() {
    const ctx=this.context;if(!ctx||this.destroyed||!this.unlocked)return;
    const running=this.canRun();
    if(!this.stateChange && ((running&&(ctx.state==='suspended'||String(ctx.state)==='interrupted'))||(!running&&ctx.state==='running'))) {
      // Serialize resume/suspend to avoid out-of-order promises when focus changes.
      this.stateChange=(running?ctx.resume():ctx.suspend()).then(()=>{
        // Some browsers resolve without becoming running (e.g. a phone call).
        // Wait for another real gesture, never spin an interrupted resume loop.
        if(running&&ctx.state!=='running')this.unlocked=false;
      }).catch(()=>{
        this.unlocked=false;this.renderSettings();
      }).finally(()=>{this.stateChange=undefined;if(!this.destroyed)this.sync();});
    }
    const music=this.finished&&this.scene!=='DemoEndingScene'&&!this.settingsOpen?0:this.settings.music*(this.scene==='WorldMapScene' ? .70 : 1)*(ctx.currentTime<this.duckUntil ? .35 : 1);
    if(music!==this.lastMusic){this.musicGain!.gain.setTargetAtTime(music,ctx.currentTime,.06);this.lastMusic=music;}
    this.effectsGain!.gain.value=this.settings.effects;
    this.master!.gain.value=this.settings.muted?0:.9;
  }
  private clearEffects(){for(const source of this.voices){source.stop();source.disconnect();}this.voices.clear();}
  private save(){try{localStorage.setItem(STORE,JSON.stringify(this.settings));this.storageUnavailable=false;}catch{this.storageUnavailable=true;}this.renderSettings();this.sync();}
  private renderSettings() {
    this.quickMute.dataset.muted=String(this.settings.muted);
    this.quickMute.setAttribute('aria-label','Silenciar todo el sonido');
    this.quickMute.setAttribute('aria-pressed',String(this.settings.muted));
    this.quickMute.title=this.settings.muted?'Activar sonido':'Silenciar sonido';
    this.button.textContent='Sonido';
    this.button.dataset.muted=String(this.settings.muted);
    this.button.title=this.settings.muted?'Sonido silenciado · Ajustes':'Ajustes de sonido';
    this.status.textContent=this.error?'No se pudo cargar el audio. Puedes seguir jugando; cierra este panel para reintentar.':
      this.settings.muted?'Todo silenciado.':!this.unlocked?'Toca la consola para iniciar con sonido.':!this.loaded?'Preparando música y efectos…':'Música y efectos listos.';
    this.dialog.querySelector('#audio-save-note')!.textContent=this.storageUnavailable?'Ajustes aplicados. Este navegador no permite guardarlos al cerrar la página.':'Los cambios se guardan automáticamente.';
    this.dialog.querySelector<HTMLInputElement>('#audio-muted')!.checked=this.settings.muted;
    for(const name of ['music','effects'] as const){
      const value=Math.round(this.settings[name]*100);
      this.dialog.querySelector<HTMLInputElement>(`#audio-${name}`)!.value=String(value);
      this.dialog.querySelector<HTMLOutputElement>(`#audio-${name}-value`)!.textContent=`${value}%`;
    }
  }
  private meter() {
    // Read-only acceptance diagnostics (no audio controls or game mutation hooks).
    const ctx=this.context,buffer=this.loopTrack&&this.buffers.get(this.loopTrack);
    this.button.dataset.audio=JSON.stringify({state:ctx?.state??'locked',loaded:this.loaded,unlocked:this.unlocked,track:this.loopTrack??null,wantedTrack:this.track,
      ...this.settings,settingsOpen:this.settingsOpen,mediaSession:!!this.releaseSession,scene:this.scene,finished:this.finished,voices:this.voices.size,
      position:ctx&&buffer?(this.loop?.loop?(ctx.currentTime-this.loopStart)%buffer.duration:Math.min(buffer.duration,ctx.currentTime-this.loopStart)):0,
      playingMusic:!!(ctx&&buffer&&ctx.state==='running'&&(!this.finished||this.scene==='DemoEndingScene'||this.settingsOpen)&&(this.loop?.loop||ctx.currentTime-this.loopStart<buffer.duration)),
      played:this.played,error:this.error});
  }
  destroy(){
    this.destroyed=true;cancelAnimationFrame(this.raf);this.abort.abort();this.panelUI.destroy();this.clearEffects();
    this.loop?.stop();this.loop?.disconnect();void this.context?.close();this.releaseSession?.();this.button.remove();this.quickMute.remove();this.dialog.remove();
  }
}
