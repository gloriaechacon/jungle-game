"""Build playback excerpts from the user's preserved WAVs, never overwrite originals.
These remain captured mixes, NOT separated music stems. Python + numpy only.
"""
from pathlib import Path
import hashlib
import json
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SOURCES = ROOT / 'docs/referencias-cuatro-videos/audio'
OUT = ROOT / 'public/audio/recordings'
RATE = 22050
# Scene boundaries checked against the reference sheets; not claimed to be bars.
CUTS = {
    'intro': ('intro', .60, 8.80, True),
    'map': ('mapa', 1.84, 3.04, True),
    'level': ('nivel', 6.16, 44.88, True),
    'bonus': ('bonus', .92, 9.10, True),
    'celebration': ('bonus', 11.68, 17.12, False),
}

def build():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {'source': 'User-supplied gameplay recordings',
                'limitation': 'Music + captured effects. No source separation or auditory approval. Map is a short provisional excerpt.',
                'files': {}}
    for name, (source, start, end, loop) in CUTS.items():
        path = SOURCES / f'{source}-mezcla-original.wav'
        with wave.open(str(path), 'rb') as f:
            assert f.getsampwidth() == 2 and f.getframerate() == 44100
            samples = np.frombuffer(f.readframes(f.getnframes()), '<i2').reshape(-1, f.getnchannels()).mean(axis=1) / 32768
        pcm = samples[round(start*44100):round(end*44100)]
        # Low-pass before 2:1 decimation; retain pitches and original tempo.
        kernel = np.sinc(np.arange(-24,25)*.48) * np.hamming(49)
        kernel /= kernel.sum()
        pcm = np.convolve(pcm, kernel, mode='same')[::2]
        if loop:
            n = round(.06*RATE)
            blend = np.linspace(0,1,n)
            seam = pcm[-n:]*(1-blend) + pcm[:n]*blend
            pcm = np.concatenate((pcm[n:-n], seam))
        else:
            n = round(.025*RATE)
            pcm[:n] *= np.linspace(0,1,n)
            pcm[-n:] *= np.linspace(1,0,n)
        rms = np.sqrt(np.mean(pcm*pcm))
        gain = min(.085/max(rms,1e-9), .75/max(np.max(np.abs(pcm)),1e-9))
        data = np.round(pcm*gain*32767).astype('<i2').tobytes()
        dest = OUT / f'{name}.wav'
        with wave.open(str(dest),'wb') as f:
            f.setnchannels(1); f.setsampwidth(2); f.setframerate(RATE); f.writeframes(data)
        manifest['files'][name] = {'source': path.name, 'start': start, 'end': end,
            'loop': loop, 'seconds':len(pcm)/RATE, 'gain':float(gain),
            'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),
            'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    (OUT / 'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n', encoding='utf-8')
    print('Built 5 captured excerpts; generated Claude tracks preserved unchanged.')

if __name__ == '__main__':
    build()
