"""Prepare and analyse a brand's sound effects so its scenes can line them up with the picture.

Takes every file in brands/<brand>/graphics/sound/raw/ (made with ElevenLabs text-to-sound-effects;
the prompts are recorded in sound/sfx.config.json), normalises its peak to −1 dBFS into
graphics/public/sfx/<name>.wav (so a scene's volume is the mix level), and measures, in seconds
from the start of each file:
  onset   where the first real sound starts (librosa's onset detector; lags on files that start loud)
  attack  the first moment the level reaches 30% of the hit's level (1.5 ms resolution): use it
          for hits that must land on a frame (kicks, drops, needles)
  peak    the loudest moment (smoothed RMS envelope)
  hits    every onset librosa finds (for multi-hit sounds like taps and drops)
plus duration and loudness. Writes graphics/sound/sfx.json (read by lib/Sfx.tsx) and a waveform
sheet to out/brands/<brand>/checks/sfx.png.

The output is 16-bit WAV, not MP3: an MP3 starts with encoder delay that the browser and ffmpeg
handle differently, so the render latency moved by about a frame every time files were re-encoded.
WAV is sample-exact, so a scene's timing (and the brand's measured latency) stays put.

A raw file named *-loop.mp3 is a 5 s seamless loop (generated with loop=true): it is stitched into one
long bed of loops.copies copies with loops.xfade s crossfades (never loop an MP3 at playback, its
padding clicks at every seam) and high-passed at highpass[name] Hz (default 40), because generated
ambiences can be mostly inaudible sub-bass rumble that throws the levels off.

Usage (from apps/lyrics_videos): uv run --with librosa --with matplotlib python logoGraphics/tools/sfx.py <brand>
"""
import glob, json, os, subprocess, sys
import numpy as np
import librosa
import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt

APP = os.path.join(os.path.dirname(__file__), '..', '..')
BRAND = sys.argv[1] if len(sys.argv) > 1 else sys.exit('usage: sfx.py <brand>')
G = os.path.join(APP, 'brands', BRAND, 'graphics')
RAW = os.path.join(G, 'sound', 'raw')
OUT = os.path.join(G, 'public', 'sfx')
CHECKS = os.path.join(APP, 'out', 'brands', BRAND, 'checks')
CFG = json.load(open(os.path.join(G, 'sound', 'sfx.config.json')))
LOOPS = CFG.get('loops', {})
HIGHPASS = CFG.get('highpass', {})
SR = 22050
HOP = 128  # 5.8 ms; the same detector settings as sync_check.py


def peak_db(path):
    y, _ = librosa.load(path, sr=None, mono=False)
    return float(20 * np.log10(np.abs(y).max() + 1e-9))


os.makedirs(OUT, exist_ok=True)
os.makedirs(CHECKS, exist_ok=True)
for old in glob.glob(os.path.join(OUT, '*.mp3')) + glob.glob(os.path.join(OUT, '*.wav')):
    os.remove(old)  # rebuilt below; drops files whose raw source is gone
for f in sorted(glob.glob(os.path.join(RAW, '*.mp3'))):
    name = os.path.basename(f)[:-4]
    dst = os.path.join(OUT, name + '.wav')
    if name.endswith('-loop'):
        copies, xfade = LOOPS.get('copies', 5), LOOPS.get('xfade', 0.6)
        ins = sum([['-i', f] for _ in range(copies)], [])
        chain, last = [], '0'
        for i in range(1, copies):
            chain.append(f'[{last}][{i}]acrossfade=d={xfade}:c1=qsin:c2=qsin[x{i}]')
            last = f'x{i}'
        chain.append(f'[{last}]highpass=f={HIGHPASS.get(name, 40)}:poles=2[out]')
        tmp = dst[:-4] + '.tmp.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(chain), '-map', '[out]', tmp], check=True)
        g = -1.0 - peak_db(tmp)  # normalise after filtering
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', f'volume={g:.2f}dB', '-c:a', 'pcm_s16le', dst], check=True)
        os.remove(tmp)
    else:
        gain = -1.0 - peak_db(f)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f, '-af', f'volume={gain:.2f}dB', '-c:a', 'pcm_s16le', dst], check=True)

out = {}
files = sorted(glob.glob(os.path.join(OUT, '*.wav')))
fig, axes = plt.subplots(len(files), 1, figsize=(12, 1.3 * len(files)), sharex=True, squeeze=False)
for ax, f in zip(axes[:, 0], files):
    name = os.path.splitext(os.path.basename(f))[0]
    y, _ = librosa.load(f, sr=SR, mono=True)
    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
    times = librosa.frames_to_time(np.arange(len(rms)), sr=SR, hop_length=HOP)
    env = librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP)
    hits = librosa.onset.onset_detect(onset_envelope=env, sr=SR, hop_length=HOP, units='time', backtrack=False)
    # onset: the first detected onset at or after the level first reaches a fifth of its maximum
    first = float(times[int(np.argmax(rms > rms.max() * 0.2))])
    after = [h for h in hits if h >= first - 0.03]
    onset = float(after[0]) if after else first
    # peak: on a smoothed envelope, so a broad swell gives its middle, not a ripple; for a sharp
    # attack the loudest point is the attack itself
    smooth = np.convolve(rms, np.hanning(9) / np.hanning(9).sum(), mode='same')
    peak = max(onset, float(times[int(np.argmax(smooth))]))
    # attack: the first moment the level reaches 30% of the hit's level, at 1.5 ms
    fine = librosa.feature.rms(y=y, frame_length=128, hop_length=32, center=False)[0]
    ft = np.arange(len(fine)) * 32 / SR
    win = fine[ft <= onset + 0.3]
    attack = float(ft[int(np.argmax(win >= win.max() * 0.3))])
    out[name] = dict(
        duration=round(len(y) / SR, 3),
        onset=round(onset, 3),
        attack=round(attack, 4),
        peak=round(peak, 3),
        hits=[round(float(h), 3) for h in hits],
        rmsDb=round(float(20 * np.log10(np.sqrt(np.mean(y ** 2)) + 1e-9)), 1),
        peakDb=round(float(20 * np.log10(np.abs(y).max() + 1e-9)), 1),
    )
    ax.plot(times, rms / (rms.max() + 1e-9), lw=1)
    ax.axvline(onset, color='g', lw=1)
    ax.axvline(attack, color='b', lw=1)
    ax.axvline(peak, color='r', lw=1)
    for h in hits:
        ax.axvline(h, color='k', lw=0.5, alpha=0.3)
    ax.set_ylabel(name, rotation=0, ha='right', fontsize=8)
    ax.set_yticks([])
axes[-1, 0].set_xlabel('s  (green onset, blue attack, red peak, grey hits)')
plt.tight_layout()
plt.savefig(os.path.join(CHECKS, 'sfx.png'), dpi=90)
with open(os.path.join(G, 'sound', 'sfx.json'), 'w') as fh:
    json.dump(out, fh, indent=1)
for k, v in out.items():
    print(f"{k:18s} dur {v['duration']:.2f}  onset {v['onset']:.3f}  attack {v['attack']:.4f}  peak {v['peak']:.3f}  rms {v['rmsDb']:6.1f} dB")
