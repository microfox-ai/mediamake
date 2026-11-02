"""Check voice-over takes without listening: what was said, how close the voice is to the approved one, pace and level.

usage: python vo_check.py <reference.wav> <expected.json> <take.mp3> [<take.mp3> …]
expected.json maps a take's file name to its script text (optional per take).

For each take it prints:
  - word match against the script (whisper large-v3-turbo transcript, normalised), and the words that differ
  - speaker similarity to the reference (ECAPA cosine; the reference's own halves give the baseline)
  - duration, words per second, peak and integrated loudness
"""
import json
import re
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path

import librosa
import numpy as np
import torch

ref_path, expected_path, *takes = sys.argv[1:]
expected = json.loads(Path(expected_path).read_text()) if Path(expected_path).exists() else {}

NUM = {
    '158': 'a hundred and fifty eight', '111': 'a hundred and eleven', '14': 'fourteen', '50': 'fifty',
    '54': 'fifty four', '11': 'eleven', '12': 'twelve',
}


def norm(text: str) -> list[str]:
    t = text.lower().replace('’', "'").replace('-', ' ')
    for k, v in NUM.items():
        t = re.sub(rf'\b{k}\b', v, t)
    t = re.sub(r"[^a-z' ]+", ' ', t)
    return t.split()


def load16(path: str) -> np.ndarray:
    y, _ = librosa.load(path, sr=16000, mono=True)
    return y


from speechbrain.inference.speaker import EncoderClassifier  # noqa: E402

enc = EncoderClassifier.from_hparams(source='speechbrain/spkrec-ecapa-voxceleb', run_opts={'device': 'cpu'})


def embed(y: np.ndarray) -> torch.Tensor:
    with torch.no_grad():
        e = enc.encode_batch(torch.tensor(y).unsqueeze(0)).squeeze()
    return e / e.norm()


ref = load16(ref_path)
half = len(ref) // 2
ref_e = embed(ref)
baseline = float(embed(ref[:half]) @ embed(ref[half:]))
print(f'reference {Path(ref_path).name}: {len(ref) / 16000:.1f}s, self-similarity of its halves {baseline:.3f}')

import mlx_whisper  # noqa: E402

for take in takes:
    name = Path(take).name
    y = load16(take)
    sim = float(embed(y) @ ref_e)
    res = mlx_whisper.transcribe(take, path_or_hf_repo='mlx-community/whisper-large-v3-turbo', language='en', word_timestamps=True)
    heard = res['text'].strip()
    words = [w for s in res['segments'] for w in s.get('words', [])]
    dur = len(y) / 16000
    speech = (words[-1]['end'] - words[0]['start']) if words else dur
    wps = len(words) / speech if speech else 0
    loud = subprocess.run(['ffmpeg', '-hide_banner', '-i', take, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                          capture_output=True, text=True).stderr
    i_lufs = re.findall(r'I:\s+(-?[\d.]+) LUFS', loud)
    peak = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', loud)
    line = f'\n{name}: {dur:.2f}s, {wps:.2f} words/s, similarity {sim:.3f}, {i_lufs[-1] if i_lufs else "?"} LUFS, peak {peak[-1] if peak else "?"} dBFS'
    print(line)
    print(f'  heard: {heard}')
    want = expected.get(name)
    if want:
        a, b = norm(want), norm(heard)
        ratio = SequenceMatcher(None, a, b).ratio()
        diffs = [(op, ' '.join(a[i1:i2]), ' '.join(b[j1:j2])) for op, i1, i2, j1, j2 in SequenceMatcher(None, a, b).get_opcodes() if op != 'equal']
        print(f'  script match {ratio * 100:.1f}%' + (f'; differs: {diffs}' if diffs else ' (word for word)'))
    gaps = [round(words[i + 1]['start'] - words[i]['end'], 2) for i in range(len(words) - 1)]
    long_gaps = [(words[i]['word'].strip(), g) for i, g in enumerate(gaps) if g > 0.6]
    if long_gaps:
        print(f'  pauses > 0.6 s after: {long_gaps}')
