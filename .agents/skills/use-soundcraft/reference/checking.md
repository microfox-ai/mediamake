# Checking audio without ears

Claude can't listen, so every move is checked by a number or a picture, and the user is asked to listen
to what the numbers can't judge (taste, feel, whether a vocal sits right). Never describe how something
sounds. Say what was measured.

## The tools

`scripts/measure.py` (run with `uv run`; needs ffmpeg and ffprobe):

| Call | Gives |
|---|---|
| `stats <file> [--start S --end S] [--windows N] [--json]` | sample rate, length, peak and RMS per channel, integrated loudness (LUFS), true peak, loudness range, crest factor, left/right correlation and balance, side-to-mid level, the share of energy in five bands (sub under 60 Hz, bass 60–250, low-mid 250–2k, high-mid 2k–6k, air over 6k), DC offset, where sound starts and ends; with `--windows`, RMS in N equal slices of time |
| `null <a> <b> [--gain-db G] [--a-start S] [--b-start S] [--seconds L]` | what is left of a − b, with the gain put on **b**: the null depth in dB (over 100 = the same audio; 60–100 = the same but for dither or rounding; under 40 = different). The starts line a piece up with its place in a longer file (a teaser against the song it came from) |
| `join <file> <seconds>` | the biggest sample-to-sample jump at an edit point beside what is usual in the file, and whether a click is likely |
| `tone <file>` | the strongest frequency (pitch and speed checks on a test tone or a single note) |
| `spectro <file> <out.png>` | a spectrogram picture: read it for the song's shape (sections, breaks, the fade), a missing top end, hum, a filter's cut |

SoundCraft's own meters come free with every bounce (`lufs`, `peak_db`, `true_peak_db`, `seconds`) and
agree with ffmpeg: loudness within 0.1 LU, true peak up to 0.4 dB lower than ffmpeg's. For a release
limit, count the higher reading.

## What to check for each move

| The move | The check | Passes when |
|---|---|---|
| A fader change of N dB | solo the track, bounce before and after, `null <after> <before> --gain-db N` | null depth over 100 |
| A group fader | solo the group's source tracks (an aux alone is silence) and mute any return their sends feed, since the return doesn't move with the group; then as above | over 100 |
| Pan | solo, `stats`: `balance_db_r_minus_l` | it moved the way the pan did (hard left: the right side at silence) |
| Mute, solo, routing to a bus, a VCA | bounce both ways, `null` | over 100 |
| A high-pass or a shelf | solo, `stats` before and after: the band it targets | that band fell or rose, the others held |
| A compressor | solo, `stats`: `crest_db`, `peak_db`, `rms_db` | peaks came down by about the gain reduction wanted. A slow attack lets transients through, so crest can rise: that is the setting, not a fault |
| A de-esser | `stats` on a sibilant stretch: `high-mid` and `air` | they fell a little there and not elsewhere |
| A reverb or delay send | solo the track, bounce with a tail: `last_sound_s`, `rms_db` | sound goes on after the dry signal ends; level rose slightly |
| How long a tail to keep | bounce 5 s past the end once, read `last_sound_s` | the final bounce ends about 0.3 s after it |
| Volume automation, a fade | `stats --start … --end … --windows N` over the fade only, beside the same slices of the source (music moves by itself) | the difference between the two follows the curve |
| Pan automation | `stats --windows N` | left and right trade places over time |
| The master | the bounce's `lufs` and `true_peak_db`, then `stats`: `lra`, `crest_db`, bands | on target; crest and loudness range not crushed beside the source |
| Stems | sum them (ffmpeg `amix=inputs=N:normalize=0`), `null` against the mix bounced at 32-bit float with the master bypassed | over 100 |
| An edit point | `join <file> <seconds>` | no click likely |
| A cut, a teaser, a loop | `stats`: `seconds`; `inspect_session`: clip starts and lengths | the length is what was asked |
| Pitch shift, speed | on a test tone, `tone`; on music, `seconds` and the user's ears | the frequency or length moved by the right ratio |
| A saved session | reopen it, bounce, `null` against the earlier bounce | over 100 |
| A file conversion | `soundcraft-cli info <file>`; `null` for lossless ones | format, rate and length as asked |

## Good habits

- **Measure the source first**, and only what the job will change: the range for an excerpt, the
  whole song for a master, a stem when its level or tone is in question. Without a "before", an
  "after" proves nothing; a number no decision uses is time lost.
- **Solo to check one thing**, then un-solo. A step list starts clean each run, so a check never leaks
  into the build.
- **Bounce a range** (20–30 s of the densest part) for checks; the whole song only for loudness and
  for what the user will hear.
- **Use 32-bit float for null tests** (`bit_depth: "32f"`), so dither and clipping don't cloud them.
- **A null test needs the same length**: bounce both with the same `start` and `end`.
- **Compare with a reference** the user likes (their last master, a released song): `stats` on both,
  side by side — loudness, range, crest, bands, correlation. Differences are things to ask about, not
  to fix unasked.
- **Look at a spectrogram** of a master, a shortened song or anything with a tail: a cut in the wrong
  place, a chopped tail, a hard end or a dull top end show at a glance. A short excerpt needs none.
- **Remove what you bounced only to measure** once the numbers are read; keep what the user may hear.
