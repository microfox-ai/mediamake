# analysis

Audio and lyric analysis for lyric videos, after the method of
[mexicat/pdoom-video](https://github.com/mexicat/pdoom-video) (`analysis/`). It turns the song and its
transcription into timing data precise enough to cut on downbeats and highlight every word as it's sung.
`scripts/prepare.ts` folds the results into `manifest.json`; without them prepare falls back to its
quick onset estimate and the input timings.

```bash
npm run analyze -w lyrics_videos -- <slug>            # all steps, skips what's up to date
npm run analyze -w lyrics_videos -- <slug> --plots    # + QA plots in projects/<slug>/analysis/qa/
npm run analyze -w lyrics_videos -- <slug> --only align,analyze
npm run prepare-project -w lyrics_videos -- <slug>    # then fold it into the manifest
```

Needs [uv](https://docs.astral.sh/uv/) and ffmpeg. The first run creates `analysis/.venv` (torch, Demucs,
librosa, mlx-whisper) and downloads about 4 GB of model weights into `analysis/.cache/` (both gitignored).
A 4-minute song takes about 3 minutes on an M3 Pro.

## Steps

| Step | Script | Output (`projects/<slug>/analysis/`) |
|---|---|---|
| decode | `common.py` | `work/mix.wav`: the song as the video plays it, decoded once. Every later step uses this timeline, so stems and analysis need no offset correction |
| separate | `separate.py` | `stems/{vocals,drums,bass,other}.wav`: Demucs `htdemucs_ft` on the Apple GPU |
| feats | `vocal_feats.py` | `work/vocal_feats.npz`: vocal-stem rms, pyin f0, spectral-flux onsets, sibilance (5 ms hop) |
| emissions | `ctc_emissions.py` | `work/emission_*.npy`: CTC log-probs from MMS_FA and wav2vec2 LV60K on the vocal stem's mono sum, left and right channel |
| whisper | `whisper_run.py` | `work/whisper.json`: mlx-whisper large-v3-turbo word timestamps, an independent cross-check |
| analyze | `analyze.py` | `audio.json`: beat grid, downbeats, envelopes, onsets |
| align | `align.py` | `lyrics.aligned.json`: word timings, confidence, unlisted vocals |

### Beat grid (`analyze.py`)

- Tempo and phase are fitted to the drum-stem + mix onset envelopes: a coarse search around a tempogram
  estimate, then a fine search, then the phase is refined on kick attacks.
- **Constant or tracked.** If the tempo wanders (common in generated music), a constant grid drifts by up
  to a beat. The script then also fits a local period and phase per 16-beat window. It tracks forward and
  backward from the best-locked window, with the phase held within ±60 ms of the neighbour's
  extrapolation so it can't slip half a beat, and blends the windows. It prints both fits per 12 s window
  and uses the tracked grid when that fits clearly better.
- **Downbeats.** The bar phase is scored from kick on 1, snare on 2 & 4, bass onsets on 1, chord change on
  1 (chroma novelty) and lyric lines starting on 1 or as a last-beat pickup. Snare alone can't tell beat
  1 from beat 3; the other cues can. The evidence table is printed.
- Envelopes at 100 fps: mix rms / low (<150 Hz) / mid / high (>4 kHz) and the stem rms (vocal, drums, bass,
  other). Each is smoothed (10 ms attack, 90 ms release) and normalized to its 99th percentile.
- Onsets `[t, strength]`: kick (<120 Hz attacks), snare (1.5–5 kHz attacks with a noisy tail), hat (>7 kHz,
  away from kicks/snares) from the drums stem, and vocal note onsets (flux peaks + pitch jumps).

### Word alignment (`align.py`)

1. One global CTC Viterbi pass over the whole song on the fused emissions (both models × mono/L/R), with
   a garbage "star" token between lines that absorbs ad-libs and instrumental parts. Each line stays
   within ±`line_window` s of its `input/lyrics.json` time, so repeated choruses can't swap.
2. Refinement per sub-word on the vocal stem. Rest-onset: after a rest, the start moves to where the
   voice re-enters. Onset-snap: otherwise it snaps to the nearest spectral-flux onset. Fricative: it moves
   back to where s/sh/ch/f/z noise begins. The end is the next word's start when the voice continues,
   else the point where it drops 15 dB.
3. Confidence = agreement of the independent alignments (each model, each channel), CTC posterior and
   Whisper. Lines that move >0.25 s from the input transcription or have a word below 0.55 confidence
   are printed with `<-- check`.

The lyric **text** always comes from `input/lyrics.json`; only the times change.

## Checking and fixing

- `--plots` writes `qa/audio_*.png` (drum spectrogram, beat grid, downbeats, onsets, envelopes, sections)
  and `qa/line_*.png` (vocal spectrogram + f0 with the final, CTC, input, per-model and Whisper words).
- `uv run --project analysis python analysis/zoom.py <slug> lines 5 46` zooms into flagged lines (16th grid,
  start rules in brackets), and `zoom.py <slug> <t0> <t1>` into any window.
- Overrides, all in `projects/<slug>/analysis/`:
  - `fixes.json`: `{"5:0": {"start": 18.52}}` sets line 5, token 0 (start / end / `syl` / conf), and
    `{"46": "input"}` keeps a line the CTC can't place (an echo, a buried ad-lib) at its input times.
    Only fix what the plots clearly show.
  - `pron.json`: `{"S-Rank": "ess rank"}` spells a token the way it's sung.
  - `config.json`: `tempo_range: [lo, hi]`, `tempo_mode: "constant" | "tracked"`, `downbeat_phase: 0..3`,
    `beats_per_bar`, `line_window` (s, 0 turns the windows off).
