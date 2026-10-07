"""Level the user-supplied intro without changing notes, pitch or speed.
Requires ffmpeg only when rebuilding; the shipped game has no tool dependency.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/audio/intro-soundtrack-original.m4a'
OUTPUT = ROOT / 'public/audio/soundtrack/intro.m4a'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', default='ffmpeg')
    args = parser.parse_args()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    # Source measured at -15.84 LUFS / +0.25 dBTP. A constant -7.5 dB
    # attenuation preserves dynamics and gives about -23.3 LUFS before UI gain.
    # First captured attack at ~1.93977 s: leave only ~7 ms before it, not
    # the recording delay. A 2 ms anti-click ramp preserves the first note.
    # Only trim the measured leading/trailing recording silence. Keep fades:
    # no claim that the musical phrase forms a seamless loop.
    subprocess.run([args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y',
        '-i', str(SOURCE), '-map', '0:a:0', '-vn', '-map_metadata', '-1',
        '-af', 'atrim=start=1.933:end=125.08,asetpts=PTS-STARTPTS,volume=-7.5dB,afade=t=in:d=0.002,afade=t=out:st=122.947:d=0.2',
        '-ar', '44100', '-ac', '2', '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart', str(OUTPUT)], check=True)
    manifest = {
        'source': 'docs/audio/intro-soundtrack-original.m4a',
        'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'outputSha256': hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
        'sourceSeconds': 127.274667, 'start': 1.933, 'end': 125.08,
        'firstCapturedAttackSeconds': 1.93977, 'fadeInSeconds': 0.002,
        'gainDb': -7.5, 'sourceIntegratedLUFS': -15.84,
        'sourceTruePeakDb': 0.25,
        'notes': 'Start at the first captured note, not the recording margin. User-supplied soundtrack; no recomposition or source separation. Human listening and loop approval pending.'
    }
    OUTPUT.with_suffix('.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    print('Built intro soundtrack: 123.147 s, -7.5 dB gain, source unchanged.')


if __name__ == '__main__':
    main()
