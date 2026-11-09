"""Where each sentence and word of a voice read begins, so the picture can be timed to the narration.

usage: python voice_onsets.py <take.mp3> [<take.mp3> …] [--db=-42] [--gap=0.25]

For each take it prints:
  - the speech runs between silences (silencedetect at --db for at least --gap s): true onsets,
    which whisper tends to place early after a pause
  - every word with whisper large-v3-turbo's start time
Copy the onsets you need into the episode's timeline (the W tables in video/timeline.ts), as
seconds from the start of the read. Run it from apps/studio with the analysis venv:
  HF_HUB_OFFLINE=1 analysis/.venv/bin/python -I <skill>/tools/voice_onsets.py input/vo-rN/<read>.mp3
"""
import re
import subprocess
import sys

args = [a for a in sys.argv[1:] if not a.startswith('--')]
opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
db = opts.get('db', '-42')
gap = opts.get('gap', '0.25')
if not args:
    sys.exit(__doc__)

import mlx_whisper  # noqa: E402

for take in args:
    err = subprocess.run(['ffmpeg', '-hide_banner', '-i', take, '-af', f'silencedetect=n={db}dB:d={gap}', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    hms = re.findall(r'Duration: (\d+):(\d+):([\d.]+)', err)
    dur = int(hms[0][0]) * 3600 + int(hms[0][1]) * 60 + float(hms[0][2]) if hms else 0.0
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', err)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', err)]
    # speech runs: from each silence end (or 0) to the next silence start
    edges = sorted([(s, 'start') for s in starts] + [(e, 'end') for e in ends])
    runs, on = [], 0.0 if not starts or starts[0] > 0.01 else None
    for t, kind in edges:
        if kind == 'start' and on is not None:
            runs.append((on, t))
            on = None
        elif kind == 'end':
            on = t
    if on is not None:
        runs.append((on, dur))
    print(f'\n{take}')
    print('  speech runs: ' + ' · '.join(f'{a:.2f}–{b:.2f}' for a, b in runs))
    r = mlx_whisper.transcribe(take, path_or_hf_repo='mlx-community/whisper-large-v3-turbo', language='en', word_timestamps=True)
    words = [(w['word'].strip(), w['start']) for s in r['segments'] for w in s['words']]
    print('  words: ' + ' | '.join(f'{w}@{t:.2f}' for w, t in words))
