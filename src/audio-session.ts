export interface AudioSessionHost {readonly audioSession?:{type:string}}

/** Optional media route, requested only after the player's sound gesture.
 * Unsupported/restricted implementations keep the existing Web Audio path.
 */
export function requestPlaybackSession(host:AudioSessionHost):(()=>void)|undefined {
  try {
    const session=host.audioSession;if(!session)return;
    const previous=session.type;
    session.type='playback';
    if(session.type!=='playback')return;
    return ()=>{try{if(session.type==='playback')session.type=previous;}catch{/* optional API */}};
  }catch{return;}
}
