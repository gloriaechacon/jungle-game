"""Prepare the supplied shared tutorial/ending theme; never alter its source.

Signal-based loop candidate, not a claim of auditory approval or separation.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT/'docs/audio/tutorial-ending-soundtrack-original.m4a'
OUTPUT = ROOT/'public/audio/soundtrack/tutorial-ending.m4a'
START, PERIOD, GAIN_DB = 3.4105, 62.575125, -8.0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', default='ffmpeg')
    args = parser.parse_args()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    # First captured attack 3.416625; recurring opening at +62.575125
    # correlates .856 over 2 s and .599 over 4 s. Preserve the intervening
    # phrases instead of repeating just a short motif. Human listening pending.
    subprocess.run([args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y',
        '-i', str(SOURCE), '-map', '0:a:0', '-vn', '-map_metadata', '-1',
        '-af', f'atrim=start={START}:end={START+PERIOD},asetpts=PTS-STARTPTS,'
               f'volume={GAIN_DB}dB,afade=t=in:d=0.002,afade=t=out:st={PERIOD-.004}:d=0.004',
        '-ar', '44100', '-ac', '2', '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart', str(OUTPUT)], check=True)
    manifest = {
        'source': 'docs/audio/tutorial-ending-soundtrack-original.m4a',
        'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'outputSha256': hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
        'sourceSeconds': 79.27475, 'start': START, 'end': START+PERIOD,
        'firstCapturedAttackSeconds': 3.416625, 'fadeInSeconds': .002,
        'fadeOutSeconds': .004, 'gainDb': GAIN_DB, 'loop': True,
        'loopSeconds': PERIOD, 'sourceSeparation': False,
        'notes': 'Supplied shared tutorial and ending recording. Preserves captured notes/tempo; trims delay and selects a recurring opening for a loop candidate. No source separation or new layers. Human listening must approve the musical seam and any embedded noises.'
    }
    OUTPUT.with_suffix('.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    print(f'Built tutorial/ending soundtrack: {PERIOD} s loop candidate, {GAIN_DB} dB gain.')


if __name__ == '__main__':
    main()
