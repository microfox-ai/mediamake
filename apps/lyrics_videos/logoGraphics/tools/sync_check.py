"""Check a brand's rendered scenes' sound against the picture.

Scenes place sound files so that a chosen moment of each (onset, attack or loudest point, from
sfx.py → sound/sfx.json) lands on a visual hit. For every layer listed in the brand's
sound/sync.config.json this finds where the file really sits in the rendered MP4
(out/brands/<brand>/renders/<scene>.mp4): it cross-correlates the file with the decoded mix around
where it should be (exact to the sample, even under other layers; onsets detected in a mix are
not reliable), and prints how far its aligned moment lands from the visual hit, in ms and frames
(60 fps). It also prints integrated loudness (LUFS) and true peak, the level along end screens
(their fades), and draws out/brands/<brand>/checks/sync.png.

The scenes start every file `latency` s early (sound/sfx.config.json): the measured delay of
rendered MP4 audio. If every layer reads the same offset, correct that number.

Usage (from apps/lyrics_videos): uv run --with librosa --with scipy --with matplotlib python logoGraphics/tools/sync_check.py <brand> [scene,...]
"""
import json, os, re, subprocess, sys
import numpy as np
import librosa
from scipy.signal import correlate
import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt

APP = os.path.join(os.path.dirname(__file__), '..', '..')
BRAND = sys.argv[1] if len(sys.argv) > 1 else sys.exit('usage: sync_check.py <brand> [scene,...]')
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
G = os.path.join(APP, 'brands', BRAND, 'graphics')
RENDERS = os.path.join(APP, 'out', 'brands', BRAND, 'renders')
CHECKS = os.path.join(APP, 'out', 'brands', BRAND, 'checks')
SFX = os.path.join(G, 'public', 'sfx')
META = json.load(open(os.path.join(G, 'sound', 'sfx.json')))
LATENCY = json.load(open(os.path.join(G, 'sound', 'sfx.config.json')))['latency']
SCENES = {k: v for k, v in json.load(open(os.path.join(G, 'sound', 'sync.config.json')))['scenes'].items() if not ONLY or k in ONLY}
SR = 22050


def decode(path):
    # ffmpeg honours the AAC priming edit list (audioread does not)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def key_of(f, align):
    if not isinstance(align, str):
        return align
    m = META[f]
    return m.get('attack', m['onset']) if align == 'attack' else m[align]


os.makedirs(CHECKS, exist_ok=True)
worst = 0
fig, axes = plt.subplots(len(SCENES), 1, figsize=(12, 1.6 * len(SCENES)), squeeze=False)
for ax, (name, layers) in zip(axes[:, 0], SCENES.items()):
    path = os.path.join(RENDERS, f'{name}.mp4')
    if not os.path.exists(path):
        print(f'\n{name}: not rendered ({os.path.relpath(path, APP)})')
        continue
    mix = decode(path)
    ebu = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    lufs = re.findall(r'I:\s+(-?[\d.]+) LUFS', ebu)[-1]
    tp = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', ebu)[-1]
    print(f'\n{name}: {lufs} LUFS integrated, true peak {tp} dBFS')
    dur = len(mix) / SR
    if dur > 8:  # end screens: the level along the scene (dBFS RMS over 0.4 s), to see the fades
        lv = lambda t: 20 * np.log10(np.sqrt(np.mean(mix[int(t * SR): int((t + 0.4) * SR)] ** 2)) + 1e-9)
        print('  level ' + '  '.join(f'{t:g}s {lv(t):.0f}' for t in [0, 1.5, 3.5, dur / 2, dur - 4, dur - 2, dur - 0.6]))
    for label, f, at, align, rate in layers:
        stem = decode(os.path.join(SFX, f + '.wav'))
        if rate != 1:  # played faster/slower: shorter/longer and re-pitched
            stem = librosa.resample(stem, orig_sr=SR * rate, target_sr=SR)
        key = key_of(f, align) / rate
        start = at - key - LATENCY  # where the scene starts the file
        skip = max(0, int(round(-start * SR)))  # the scene trims the file's head if it starts before 0
        stem = stem[skip: skip + int(1.2 * SR)]  # the first 1.2 s carry the shape
        lo = max(0, int((max(0.0, start) - 0.25) * SR))
        seg = mix[lo: lo + len(stem) + int(0.5 * SR)]
        c = correlate(seg, stem, mode='valid', method='fft')
        found = (lo + int(np.argmax(c))) / SR  # where it really starts
        hit = found + key - skip / SR  # when its aligned moment really plays
        d = (hit - at) * 1000
        worst = max(worst, abs(d))
        print(f'  {label:10s} should land {at:.3f}s, lands {hit:.3f}s  ({d:+5.1f} ms, {d / 16.667:+.2f} frames)')
        ax.axvline(at, color='r', lw=1)
    rms = librosa.feature.rms(y=mix, hop_length=128)[0]
    ax.plot(librosa.frames_to_time(np.arange(len(rms)), sr=SR, hop_length=128), rms / (rms.max() + 1e-9), lw=0.8)
    ax.set_ylabel(name, rotation=0, ha='right', fontsize=8)
    ax.set_yticks([])
axes[-1, 0].set_xlabel('s  (blue mix level, red = visual hits)')
plt.tight_layout()
plt.savefig(os.path.join(CHECKS, 'sync.png'), dpi=90)
print(f'\nlargest offset: {worst:.1f} ms ({worst / 16.667:.2f} frames)')
