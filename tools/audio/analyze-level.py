"""Read-only waveform recurrence analysis (level recording by default).

Requires numpy and ffmpeg. This does NOT listen, identify instruments, or
separate incidental sounds from music; candidates still need human review.
"""
from pathlib import Path
import argparse
import json
import subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[2]


def decode(ffmpeg, source, rate=8000, channels=1):
    raw = subprocess.check_output([ffmpeg, '-hide_banner', '-loglevel', 'error',
        '-i', str(source), '-map', '0:a:0', '-f', 'f32le', '-ac', str(channels),
        '-ar', str(rate), 'pipe:1'])
    return np.frombuffer(raw, dtype='<f4').reshape(-1, channels).copy()


def peaks(values, lo, hi, rate, count=8):
    scores = values.copy()
    scores[:round(lo*rate)] = -1
    scores[round(hi*rate):] = -1
    result = []
    for _ in range(count):
        i = int(np.argmax(scores))
        result.append([round(i/rate, 5), round(float(scores[i]), 5)])
        scores[max(0, i-round(.4*rate)):i+round(.4*rate)] = -1
    return result


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--ffmpeg', default='ffmpeg')
    p.add_argument('--source', type=Path, default=ROOT/'docs/audio/level-soundtrack-original.m4a')
    args = p.parse_args()
    rate = 8000
    pcm = decode(args.ffmpeg, args.source, rate)[:, 0]
    active = np.flatnonzero(np.abs(pcm) > .008)
    start, end = active[0]/rate, active[-1]/rate
    print(json.dumps({'seconds': len(pcm)/rate, 'firstSignal':start,
        'lastSignal':end, 'peak':float(np.max(np.abs(pcm))) }))
    x = pcm[round(start*rate):round(end*rate)].astype(np.float64)
    for seconds in [1, 2, 4, 8]:
        n = round(seconds*rate)
        template = x[:n]
        size = 1 << (len(x)+n-1).bit_length()
        dot = np.fft.irfft(np.fft.rfft(x,size)*np.conj(np.fft.rfft(template,size)),size)[:len(x)-n+1]
        power = np.concatenate(([0.], np.cumsum(x*x)))
        score = dot/np.sqrt(np.maximum(1e-20, (power[n:]-power[:-n])*np.sum(template*template)))
        print(json.dumps({'templateSeconds':seconds, 'repeatLagCandidates':peaks(score,3,len(x)/rate-seconds,rate)}))
    n = len(x)
    size = 1 << (2*n-1).bit_length()
    dot = np.fft.irfft(np.abs(np.fft.rfft(x,size))**2,size)[:n]
    power = np.concatenate(([0.], np.cumsum(x*x)))
    score = dot/np.sqrt(np.maximum(1e-20, power[n-np.arange(n)]*(power[n]-power[np.arange(n)])))
    print(json.dumps({'wholeTrackRepeatLags':peaks(score,5,40,rate)}))
    # Spectral recurrence also tolerates phase differences in the recording.
    hop, window = 128, 1024
    frames = np.lib.stride_tricks.sliding_window_view(x, window)[::hop]
    magnitude = np.abs(np.fft.rfft(frames*np.hanning(window), axis=1))[:, 3:400]
    features = np.log1p(magnitude*10)
    features -= features.mean(axis=0)
    features /= np.maximum(.1, features.std(axis=0))
    features /= np.maximum(1e-8, np.linalg.norm(features, axis=1, keepdims=True))
    scores = np.zeros(len(features))
    for lag in range(round(3*rate/hop), round(40*rate/hop)):
        scores[lag] = np.mean(np.sum(features[:-lag]*features[lag:], axis=1))
    print(json.dumps({'spectralRepeatLags':peaks(scores,3,40,rate/hop)}))
    for seconds in [4.65,9.3125,13.9625,18.625,23.275,27.9375,37.25]:
        lag=round(seconds*rate/hop)
        similar=np.sum(features[:-lag]*features[lag:],axis=1)
        print(json.dumps({'lag':seconds,'eightSecondWindows':[
            [i,round(float(np.mean(similar[round(i*rate/hop):round((i+8)*rate/hop)])),3)]
            for i in range(0, max(1,int(len(similar)*hop/rate)-7),8)]}))


if __name__ == '__main__':
    main()
