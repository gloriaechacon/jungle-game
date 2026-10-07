"""Trim/level the supplied bonus theme; keep the original recording intact.

FFmpeg is only needed to rebuild. No changed notes, tempo, added effects or
source separation. The repeat point is measured, with human approval pending.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT/'docs/audio/bonus-soundtrack-original.m4a'
OUTPUT = ROOT/'public/audio/soundtrack/bonus.m4a'
START, PERIOD, GAIN_DB = 2.3105, 26.42725, -7.0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', default='ffmpeg')
    args = parser.parse_args()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    # The opening recurs at +26.42725 s: waveform correlation .81053
    # for an 8 s window and .71671 over the overlapping recording.
    # Preserve ~6 ms before the first captured attack, not the recording delay.
    subprocess.run([args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y',
        '-i', str(SOURCE), '-map', '0:a:0', '-vn', '-map_metadata', '-1',
        '-af', f'atrim=start={START}:end={START+PERIOD},asetpts=PTS-STARTPTS,'
               f'volume={GAIN_DB}dB,afade=t=in:d=0.002,afade=t=out:st={PERIOD-.004}:d=0.004',
        '-ar', '44100', '-ac', '2', '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart', str(OUTPUT)], check=True)
    manifest = {
        'source': 'docs/audio/bonus-soundtrack-original.m4a',
        'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'outputSha256': hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
        'sourceSeconds': 64.128, 'start': START, 'end': START+PERIOD,
        'firstCapturedAttackSeconds': 2.316625, 'fadeInSeconds': .002,
        'fadeOutSeconds': .004, 'gainDb': GAIN_DB, 'loop': True,
        'loopSeconds': PERIOD, 'sourceSeparation': False,
        'notes': 'Supplied bonus recording. Opening trimmed to the first captured attack; ending chosen by waveform/spectral recurrence. Constant attenuation only, with tiny anticlick ramps. No melody, tempo, effects or celebration changes. Musical seam and any embedded noises need human listening approval.'
    }
    OUTPUT.with_suffix('.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    print(f'Built bonus soundtrack: {PERIOD} s loop candidate, {GAIN_DB} dB gain.')


if __name__ == '__main__':
    main()
