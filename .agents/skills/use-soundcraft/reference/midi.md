# MIDI and the built-in instruments

All run on soundcraft-cli 0.20.1.

## Instruments

| Id | What it is | Parameters worth knowing |
|---|---|---|
| `subtractive_synth` | two oscillators, a filter, two envelopes | `osc1_wave`, `osc2_wave` (0–3), `osc2_semitones`, `osc2_detune`, `osc_mix`, `cutoff` Hz, `resonance`, `filter_env_amount`, `amp_attack/decay/sustain/release`, `glide`, `level` dB |
| `drum_synth` | a synthesised kit on the General MIDI notes (36 kick, 38 snare, 42 closed hat, 46 open hat, toms, cymbals) | `kick_tune`, `kick_decay`, `snare_tune`, `snare_snappy`, `snare_decay`, `hat_decay`, `open_hat_decay`, `tom_tune`, `cymbal_decay`, `level` |
| `sampler` | plays any audio file across the keyboard | `root_note` (the key that plays the file as it is), `transpose`, `key_low/high`, `attack/decay/sustain/release`, `loop_mode`, `start`, `level` |

```
track.new {"kind":"instrument","format":"stereo","name":"Synth","instrument":"subtractive_synth"}
mix.instrument_param {"track":"Synth","param":"cutoff","value":300}
mix.instrument {"track":"Synth","plugin":"drum_synth"}                       # swap the instrument
mix.sampler_load {"track":"Smp","path":"/…/hit.wav","params":{"root_note":60}}
```

Pitch is exact: note 69 on the synth plays 440.0 Hz; a 1 kHz sample with root 60 plays 2000 Hz at note
72. Instrument tracks take inserts, sends and automation like audio tracks.

## Notes

- Time is in ticks, 960 to a quarter note. A bar of 4/4 is 3840; a sixteenth is 240.
- A note needs a clip: `midi.new_clip {"track":"Synth","start":"bars_beats:1|1|000","end":"bars_beats:3|1|000"}`
  returns the clip's id. Note times are counted from the clip's start.

```
midi.note_add {"clip":2,"pitch":60,"start_ticks":0,"length_ticks":480,"velocity":100}
midi.notes {"clip":2}                                  # → notes with "start", "length", "pitch", "velocity"
midi.note_edit {"clip":2,"index":0,"velocity":80}
midi.note_delete {"clip":2,"indices":[3,4]}
midi.notes_move {"clip":2,"indices":[0,1],"ticks":240,"semitones":12}
event.quantize {"grid":"1/16","strength":100,"swing":0,"clips":[2]}
event.transpose {"semitones":12,"clips":[2]}
event.change_velocity {"scale":0.8,"clips":[2]}        # or set, add, min/max
```

- `midi.note_add` writes `start_ticks` and `length_ticks`; `midi.notes` reads them back as `start` and
  `length`.
- A part of more than a few notes is written by a small generator that prints the step list (one
  `midi.note_add` a note), not by hand. Run it once with `--inspect` to learn the clip id first.
- Quantize was checked on a loosely played two-bar beat: every start landed on the 1/16 grid.
- Set the tempo before writing bars: `event.tempo {"bpm":100}`.

## Importing and exporting

| Job | Command | What happens |
|---|---|---|
| Import a MIDI file | `file.import_midi {"path":"…/song.mid"}` | one instrument track per MIDI track, with an instrument picked from its name (drums get `drum_synth`, the rest `subtractive_synth`), and the file's tempo map |
| Export MIDI | `file.export_midi {"path":"…/part.mid","tracks":[…]}` | a Standard MIDI File |
| MusicXML | `file.export_sibelius {"path":"…/part.musicxml","tracks":[…]}` | opens in notation programs |
| A printable score | `file.score_setup {"title":…,"composer":…,"bars_per_system":4}` then `file.print_score {"path":"…/score.svg","tracks":[…]}` | an engraved SVG page. Give a `path`: without one it writes to the temp folder |
| Audio to MIDI | `edit.copy_audio_as_midi {"track":…,"start":…,"end":…}` then `edit.paste {"tracks":["<instrument track>"],"at":…}` | monophonic pitch tracking. Rough: one held note came back as four. Check and clean the notes |

A song's MIDI file is also the best source of its tempo: the imported tempo map follows the recording.
Chord detection (`event.extract_chords`) found nothing on an audio stem; it reads MIDI tracks.

## Not there headless

Playing a MIDI keyboard, recording and step input from a device need the app and a device.
