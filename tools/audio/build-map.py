"""Trim/level the supplied map recording; preserve melody, pitch and speed.

Requires ffmpeg only to rebuild, not to play the shipped game.
The entire unedited source stays in docs/audio.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/audio/map-soundtrack-original.m4a'
OUTPUT = ROOT / 'public/audio/soundtrack/map.m4a'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', default='ffmpeg')
    args = parser.parse_args()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    # First captured attack ~2.74967 s, with a few ms of pre-attack preserved.
    # End before a measured recurrence of that opening, rather than at the
    # arbitrary recording stop. 24 s waveform correlation at +96.375 s: 0.56.
    # This is a technical loop candidate, NOT a claim of human musical approval.
    # Constant gain gives ~-23.4 LUFS, comparable to the intro. No compression.
    subprocess.run([args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y',
        '-i', str(SOURCE), '-map', '0:a:0', '-vn', '-map_metadata', '-1',
        '-af', 'atrim=start=2.744:end=99.119,asetpts=PTS-STARTPTS,volume=-6.5dB,afade=t=in:d=0.002,afade=t=out:st=96.371:d=0.004',
        '-ar', '44100', '-ac', '2', '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart', str(OUTPUT)], check=True)
    manifest = {
        'source': 'docs/audio/map-soundtrack-original.m4a',
        'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'outputSha256': hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
        'sourceSeconds': 156.010667, 'start': 2.744, 'end': 99.119,
        'firstCapturedAttackSeconds': 2.74967, 'fadeInSeconds': 0.002,
        'gainDb': -6.5, 'sourceIntegratedLUFS': -16.95,
        'sourceTruePeakDb': -0.38, 'loop': True,
        'loopSeconds': 96.375,
        'notes': 'Start at the first captured note, not the recording margin. End aligned to a recurrence of the opening (waveform comparison). No recomposition, pitch/tempo change or source separation. Human listening and loop approval pending.'
    }
    OUTPUT.with_suffix('.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    print('Built map soundtrack: 96.375 s loop candidate, -6.5 dB gain, source unchanged.')


if __name__ == '__main__':
    main()
