"""Keep the ENTIRE captured musical passage, including its later variation.

Requires numpy + ffmpeg to rebuild only. No melody generation, pitch/tempo
change, added action noises or source separation. Keep the full source intact.
Listen to the exported candidate before treating the musical seam as approved.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import shutil
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT/'docs/audio/level-soundtrack-original.m4a'
OUTPUT = ROOT/'public/audio/soundtrack/level.m4a'
BASE = ROOT/'docs/audio/level-base-loop.m4a'
RATE = 44100
START = 2.468
END = 53.802
PERIOD = END - START
GAIN_DB = -8.3  # The full later phrase is louder; match the earlier ~-23 LUFS.
ORDER = ['original', 'warm']
FILTERS = {'original':'anull',
    'warm':'bass=g=0.8:f=180:w=0.6,treble=g=-1.5:f=2500:w=0.7,volume=-0.3dB',
    'soft':'treble=g=-0.7:f=3000:w=0.7,volume=-0.8dB'}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def encode(ffmpeg, pcm, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y',
        '-f', 'f32le', '-ar', str(RATE), '-ac', '2', '-i', 'pipe:0',
        '-map_metadata', '-1', '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart', str(path)],
        input=pcm.astype('<f4').tobytes(), check=True)


def arrangement(variants, order):
    n = round(PERIOD*RATE)
    fade=round(.002*RATE)
    pieces=[]
    for name in order:
        current=variants[name][:n].copy()
        # No early motif extraction, crossfade over notes, or added silence.
        # Preserve the full timing; only a 2ms anticlick on captured boundaries.
        # A natural musical resolution still needs listening approval.
        current[:fade]*=np.linspace(0,1,fade)[:,None]
        current[-fade:]*=np.linspace(1,0,fade)[:,None]
        pieces.append(current)
    result=np.concatenate(pieces)*10**(GAIN_DB/20)
    return result


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--ffmpeg',default='ffmpeg')
    args=parser.parse_args()
    # Preserve the version heard in the previous playtest, once only.
    for suffix in ['.m4a','.json']:
        previous=OUTPUT.with_suffix(suffix)
        backup=ROOT/f'docs/audio/level-short-motif-backup{suffix}'
        if previous.exists() and not backup.exists():
            shutil.copy2(previous,backup)
    variants={}
    for name,filters in FILTERS.items():
        raw=subprocess.check_output([args.ffmpeg,'-hide_banner','-loglevel','error',
            '-i',str(SOURCE),'-map','0:a:0','-af',
            f'{filters},atrim=start={START}:end={END+.002},asetpts=PTS-STARTPTS',
            '-f','f32le','-ar',str(RATE),'-ac','2','pipe:1'])
        variants[name]=np.frombuffer(raw,dtype='<f4').reshape(-1,2).copy()
    result=arrangement(variants,ORDER)
    base=arrangement(variants,['original'])
    # In particular, source seconds 35–50 survive unchanged in the first pass
    # (apart from common gain): protects the later rhythm from being omitted.
    lo,hi=round((35-START)*RATE),round((50-START)*RATE)
    assert np.allclose(result[lo:hi],variants['original'][lo:hi]*10**(GAIN_DB/20))
    assert np.isfinite(result).all() and np.max(np.abs(result))<.65
    encode(args.ffmpeg,result,OUTPUT)
    encode(args.ffmpeg,base,BASE)
    n=round(PERIOD*RATE)
    # Technical QA records continuity and energy, not a subjective listening verdict.
    joins=[float(np.max(np.abs(result[i*n]-result[i*n-1]))) for i in range(1,len(ORDER))]
    manifest={
        'source':'docs/audio/level-soundtrack-original.m4a','sourceSha256':digest(SOURCE),
        'outputSha256':digest(OUTPUT),'sourceSeconds':58.965333,
        'start':START,'end':START+PERIOD,'firstCapturedAttackSeconds':2.474,
        'periodSeconds':n/RATE,'loopSeconds':len(result)/RATE,'repetitions':len(ORDER),
        'variantOrder':ORDER,'filters':FILTERS,'gainDb':GAIN_DB,'fadeInSeconds':.002,
        'crossfadeSeconds':0,'boundaryRampSeconds':.002,'loop':True,'generatedNotes':False,'sourceSeparation':False,
        'preservedSourceRange':[START,END],'laterSectionIncluded':[35,50],
        'basePreview':'docs/audio/level-base-loop.m4a','baseSha256':digest(BASE),
        'pcmPeak':float(np.max(np.abs(result))),'joinMaxSteps':joins,
        'notes':'Full captured passage, including the later changing rhythm, twice with a subtle warm EQ on pass two. Only recording silence outside 2.468–53.802 s is removed. No rearranged notes, changed tempo or source separation. 2ms anticlick boundaries are not a guarantee of musical seam alignment; human listening pending. No gameplay effects changed.'}
    OUTPUT.with_suffix('.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'seconds':manifest['loopSeconds'],'baseSeconds':manifest['periodSeconds'],
        'peak':manifest['pcmPeak'],'joinMaxSteps':joins,'bytes':OUTPUT.stat().st_size}))


if __name__=='__main__':
    main()
