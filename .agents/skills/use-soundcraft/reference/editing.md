# Editing and processing audio

All run on soundcraft-cli 0.20.1, on a real 4½-minute song and on test tones.

## Clips, ranges and ids

- A clip is a window on a source file: `start` (where it sits), `length`, `offset` (where in the file
  it begins), `fade_in`, `fade_out`, `gain_db`, `muted`. `inspect_session` lists them per track, in
  samples; divide by the session's `sample_rate`.
- Most edit commands take `tracks` with `start` and `end`, or act on the current selection
  (`edit.select {"tracks":["Song"],"start":{"seconds":60},"end":{"seconds":68}}`). Give the range in
  the command when it takes one: it is clearer than a selection made earlier.
- Clip ids are needed for clip commands (`edit.move_clips`, `clip.gain`, a clip fade). They are the
  same on every run of the same steps: run once with `--inspect`, read them, then use them. Ids
  come from one counter shared by tracks, clips, buses and markers, so a step added earlier in the
  list shifts every id after it: read them again. A split leaves the left piece with the old id and
  gives the right one a new id.
- The edit mode is Slip by default: `edit.cut` leaves a gap. After `edit.mode {"mode":"shuffle"}` the
  rest of that track closes up; `event.cut_time` closes it for every track at once.

## The jobs

| Job | Steps |
|---|---|
| Shorten a song (take a section out) | `event.cut_time {"start":{"seconds":78},"end":{"seconds":150}}` removes that time from every track and leaves two clips meeting at 78 s; then `edit.fades_create {"tracks":["Song"],"start":{"seconds":77.97},"end":{"seconds":78.03},"shape":"equal power"}` makes a 60 ms crossfade over the join. Cut on a downbeat, at the same place in the bar on both sides |
| A teaser (keep one part) | `edit.trim_to_selection {tracks, start, end}`; `edit.move_clips {"clips":[3],"to":{"seconds":0}}`; fades as below; bounce `--start 0 --end <length>` |
| Fade in / out on a clip | `edit.fades_create {"clip":3,"side":"in","length":48000,"shape":"s-curve"}` (`length` in samples; `side`: `in` or `out`; shapes: `linear`, `equal power`, `s-curve`, `exponential`, `logarithmic`) |
| Fade the whole mix out | two volume automation points on the master (`reference/mixing.md`) |
| Repeat a section | `edit.trim_to_selection`, then `edit.select` the same range and `edit.repeat {"count":3}` (three more copies, end to end), or `clip.loop {"clips":[3],"count":4}` (the clip plus three loops) |
| Split | `edit.separate {"tracks":["Song"],"at":{"seconds":10}}`; `edit.separate_on_grid {tracks, start, end}` (a piece per grid step, 1/16 note by default); `edit.select` a range then `edit.separate_at_transients {"sensitivity":0.5}` |
| Move a clip | `edit.move_clips {"clips":[5],"to":{"seconds":0}}` or `"by": <samples>` |
| Mute a clip | `edit.mute_clips {"clips":[4]}` |
| Clip gain | `clip.gain {"clips":[3],"db":-6}` (or `delta_db`) |
| Join pieces into one clip | `edit.consolidate {tracks, start, end}`: renders the range (clip gain, mutes and fades included) as one new clip; the bounce is unchanged |
| Silence at the head | `event.insert_time {"start":{"seconds":0},"length":{"seconds":2}}` (every track moves) |
| Shift later / earlier | `edit.select {"clips":[3]}` then `edit.shift {"by":{"seconds":0.5},"later":true}` |
| Strip silence | `edit.select` the range, then `edit.strip_silence {"threshold_db":-45,"min_length_ms":400,"pad_before_ms":20,"pad_after_ms":120}` (`edit.strip_silence_preview` shows the ranges first). A separated stem has bleed in its gaps, so it may strip little: raise the threshold |
| Cut, copy, paste, duplicate | `edit.cut`, `edit.copy`, `edit.paste {tracks, at}`, `edit.duplicate`, `edit.clear`, `edit.heal` |
| Undo | `edit.undo`, `edit.redo`; `engine.history` lists what can be undone |

An excerpt that stops in the middle of a sound needs a short fade out (a clip fade of 20–50 ms, or
longer by taste): a hard end clicks, and it shows as a wall in a spectrogram.

After any cut or join, run `scripts/measure.py join <bounce> <seconds>` and look at the lengths in
`inspect_session`. A crossfade of 20–80 ms hides most joins; a musical edit also needs the user's ears.

## Processing a clip (AudioSuite)

`audiosuite.process {"process": …, "params": {…}, "clips":[id] | "tracks":[…], "start"?, "end"?}`
renders the result as a new clip in place (named with a suffix: `-pitcshif`, `-timestre`, `-norm`).

| Process | Parameters | Seen on a 1 kHz, 5 s tone |
|---|---|---|
| `pitch_shift` | `semitones`, `cents` | +12 → 2000 Hz, still 5 s; −5 → 749 Hz |
| `time_stretch` | `ratio` (new length ÷ old) | 2 → 10 s, still 1000 Hz |
| `varispeed` | `speed` (2 = twice as fast) | 2 → 2.5 s at 2000 Hz |
| `gain` | `gain` dB | −6 → 6 dB down |
| `normalize` | none | peak to −0.1 dBFS |
| `reverse`, `invert`, `duplicate` | none | inverted copy nulls with the original |
| `speed_ramp` | `change` (0 slow down, 1 speed up), `selection` (0 fit, 1 extend), `fades` | a slide in pitch |
| `signal_generator` | `waveform` (0 = sine), `freq`, `level`, with `tracks`, `start`, `end` | fills the range with a new clip |
| any plugin id (`eq_1band`, `compressor`, …) | that plugin's parameters | prints the effect into the clip |

**An unknown parameter is ignored without a word** and the result still says `processed: 1`
(`varispeed` with `ratio` did nothing). After every process, check the clip's length in
`inspect_session` and measure the bounce. Pitch and stretch lose a little level (0.4–0.8 dB on a tone).

## Time and tempo

- `event.tempo {"bpm":120}` (at the start, or `"at"`), `event.meter {"numerator":3,"denominator":4}`;
  `event.tempo_linear` and friends make ramps (not tried here). Changing the tempo does not move clips on sample-based
  tracks, which is what an imported file sits on.
- `event.beat_detective {tracks, start, end, set_tempo}` needs a range, returns beat positions and a
  BPM, and writes the tempo at the range's start. Its BPM was wrong on a real song (171 for a song its
  own MIDI file puts at 79): treat it as a hint.
- `clip.conform_to_tempo`, `track.elastic` and `edit.tce_to_timeline` exist for fitting audio to the
  tempo: not tried here. Try them on a copy and measure before relying on them.
- Markers: `markers.add {"name":"Chorus","at":{"seconds":61}}`; they show on the ruler in the app.
