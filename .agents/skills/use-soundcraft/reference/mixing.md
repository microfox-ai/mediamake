# Mixing and mastering

All run on soundcraft-cli 0.20.1. Step lists are shown as `command.id {json}` lines.

## Signal flow

audio or instrument track → its inserts (slots 0–9, in order) → its fader and pan → its output
(`Main`, or a bus). Sends tap the track (after the fader, or before it with `pre_fader`) into a bus.
An aux track takes a bus as its input and plays it through its own inserts and fader to its output.
A master track's inserts and fader sit on everything that reaches `Main`.

- Track kinds (`track.new {kind}`): `audio`, `aux`, `master`, `midi`, `instrument`, `vca`, `folder`.
  Several at once: `track.new {"rows":[{"kind":"aux","format":"stereo","name":"VOX BUS"}, …]}`.
- Delay compensation is on: a plugin with look-ahead on one track keeps it in phase with the others
  (a phase-flipped copy still nulls).
- A mono track panned to the centre is 3 dB down on each side.

## Levels, pan, mute, solo

```
mix.volume {"tracks":["Vocals"],"db":-2}            # or "delta_db": -2 (relative)
mix.pan {"tracks":["Guitar"],"pan":-0.4}            # -1 left … 1 right; stereo tracks: "index":0|1 for each side
mix.mute {"tracks":["FX"],"value":true}
mix.solo {"tracks":["Vocals"],"value":true}         # mix.clear_solos {} afterwards
mix.phase_invert {"tracks":["Snare Bottom"],"value":true}
mix.trim {"tracks":["Bass"],"db":-3}                # a gain before the inserts: it changes what a compressor sees
```

An unknown track name is an error that names it. Faders are exact to the dB.

## Inserts and their parameters

```
mix.insert {"track":"Vocals","plugin":"eq_7band","params":{"hpf_on":1,"hpf_freq":90}}   # next free slot, or "slot": 0..9
mix.insert_params {"track":"Vocals","slot":0,"params":{"low_mid_gain":-2}}
mix.insert_bypass {"track":"Vocals","slot":0,"value":true}
mix.insert_remove {"track":"Vocals","slot":0}
mix.insert_move {"track":"Vocals","from":2,"to":0}
track.bypass_inserts {"tracks":["MASTER"],"bypass":true}      # also track.bypass_eq / _dynamics / _reverb / _delay
```

`track.inspect {"track":"Vocals"}` lists each insert with every parameter's value.
`soundcraft-cli run --cmd engine.plugins` prints every plugin with ranges and defaults. The ones used most:

| Plugin | Parameters (range, default) |
|---|---|
| `eq_7band` | `hpf_on`, `hpf_freq` (10–2000, 80), `hpf_slope` (0–3, steeper as it rises); `low_shelf_freq/gain/q`; `low_mid_freq/gain/q` (250); `mid_freq/gain/q` (1000); `high_mid_freq/gain/q` (4000); `high_shelf_freq/gain/q` (8000); `lpf_on`, `lpf_freq`, `lpf_slope`; `input_gain`, `output_gain`. Gains ±24 dB |
| `eq_1band` | `type` (0–6), `freq`, `gain`, `q`, `output_gain` |
| `compressor` | `threshold` (−60–0, −20), `ratio` (1–100, 4), `attack` ms (0.01–300, 10), `release` ms (5–3000, 100), `knee` (0–24, 6), `makeup` (0–40), `mix` % (100; lower for parallel compression), `lookahead` ms (0–10), `limiter` toggle, `sc_hpf_on`, `sc_hpf_freq` |
| `expander_gate` | `threshold` (−80–0, −40), `ratio`, `range` (0–80), `attack`, `hold`, `release` |
| `de_esser` | `freq` (2000–16000, 6000), `range` dB (0–40, 10), `threshold` (−60–0, −30), `listen` |
| `maximizer` | `threshold` (−30–0, 0: lower is louder), `ceiling` (−30–0, −0.3), `release` ms (1–1000, 50) |
| `channel_strip` | gate, compressor and a 3-band EQ in one: `gate_on`, `comp_on`, `eq_on`, `hpf_on` and their settings |
| `plate_reverb`, `room_reverb` | `mix` %, `pre_delay` ms, `decay` s (0.1–20), `size` %, `damping` Hz, `diffusion` %, `width` %, `low_cut` Hz |
| `mod_delay` | `time` ms (1–2000, 250), `feedback` % (±99, 30), `mix` %, `lpf` Hz, `mod_rate`, `mod_depth` |
| `saturator` | `drive` dB (0–36, 6), `bias`, `tone` Hz, `mix` %, `output` dB |
| `chorus`, `flanger`, `phaser`, `auto_pan`, `ring_mod` | `rate`, `depth`, `mix` and friends |
| `subharmonic`, `lofi`, `rectifier`, `pitch_shifter` (`semitones`, `cents`, `mix`), `time_shift` (`delay_ms`) | — |
| `gain` (`gain`), `trim` (`gain`, `invert`), `invert`, `dc_offset_removal`, `dither` (`bits`, `noise_shaping`), `signal_generator` (`waveform`, `freq`, `level`) | utilities |

A parameter name that doesn't exist is refused; a value out of range is clamped silently. Toggles are 0
or 1. A delay time that fits the song: 60000 ÷ BPM is a quarter note in ms.

What was seen on real material: a compressor at attack 1 ms, ratio 8 took 6 dB off a snare's peak and
14 dB off its body (crest rose); at attack 0.01 ms with 5 ms look-ahead it caught the peak (crest fell).
A 200 Hz high-pass at slope 3 took the sub band of a bass down 38 dB.

## Sends, returns and group buses

```
# a reverb return
mix.new_bus {"name":"Plate"}
track.new {"kind":"aux","format":"stereo","name":"Plate Return"}
track.input {"tracks":["Plate Return"],"input":"Plate"}
mix.insert {"track":"Plate Return","plugin":"plate_reverb","params":{"mix":100,"decay":1.8,"pre_delay":30,"low_cut":250}}
mix.send {"track":"Vocals","bus":"Plate","level_db":-14}                 # "pre_fader": true for a send that ignores the fader
mix.send_level {"track":"Vocals","slot":0,"db":-12}                       # also pan, mute, pre_fader

# a group: drums summed on a bus, heard through an aux
mix.new_bus {"name":"Drums Sum"}
track.new {"kind":"aux","format":"stereo","name":"DRUM BUS"}
track.input {"tracks":["DRUM BUS"],"input":"Drums Sum"}
track.output {"tracks":["Kick","Snare","Hats"],"output":"Drums Sum"}
```

- The aux's fader is the group's fader: −6 on it nulls against −6 on each member.
- Soloing a track keeps its returns and its group aux sounding. Soloing an aux alone is silence.
- The effect on a return is fully wet (`mix: 100`); the send's level sets how much. A return goes to
  `Main` unless the user wants it inside a group; a send level is a start for their ears to settle.
- Bus names in `inspect_session` come back as ids (`{"Bus": 37}`); `busses` maps ids to names.
- `scripts/stems_session.py` builds the three usual groups (drums, music, vocals) and a master from a
  stems folder.

## Groups and VCAs

```
track.group {"name":"Drums","tracks":["Kick","Snare"]}       # their faders move together (mix) and edits apply to all (edit)
track.new {"kind":"vca","name":"Drums VCA"}
track.vca {"tracks":["Kick","Snare","Hats"],"vca":"Drums VCA"}   # the VCA's fader offsets its members; exact
```

## Automation

```
automation.set_point {"track":"Vocals","param":"volume","at":{"seconds":60},"value":0}
automation.set_point {"track":"Vocals","param":"volume","at":{"seconds":61},"value":1.5}
automation.write_range {"track":"Vocals","param":"volume","start":{"seconds":90},"end":{"seconds":120},"value":-1}
automation.clear {"track":"MASTER","param":"volume"}                 # or with start/end
```

`param`: `volume` (dB), `pan` (−1…1), `mute`, `send_a_level`, or `plugin:<slot letter>:<parameter>`
(`plugin:a:threshold`). Points are joined by straight ramps. Tracks play automation in `read` mode,
which is the default. A fade-out is two volume points on the master (or the track): 0 at its start,
−60 at its end. A track that has volume automation ignores `mix.volume`: change its points instead
(`track.inspect` shows them), or `automation.clear` first.

## The master and loudness

- Put the master chain on a master track: `track.new {"kind":"master","name":"MASTER"}`, then inserts.
  The limiter goes last.
- Leave headroom before it: stems summed at 0 dB clipped by 3.6 dB on a real song. Pull the group
  auxes down (−3 to −6) until the bounce's `peak_db` is under 0 with the limiter at threshold 0.
- Loudness comes from the Maximizer's `threshold`: each dB lower was 0.8 dB louder at first and 0.3
  by the time it was limiting hard. A whole 4½-minute song with 18 tracks bounces in about 3 s, so stepping is cheap.
- `scripts/master_to.py <song or session> <out.wav> --lufs -9 --true-peak -1` finds the threshold for a
  loudness target and lowers the ceiling until the true peak fits, by both meters. `--tail <seconds>`
  keeps a session's reverb and delay tails (without it the bounce stops at the session's end);
  `--save-session <new>.scraft` keeps the session with the final setting. `--ladder
  -11,-10,-9,-8` writes one file a step for the user to pick by ear. On a song file it adds gain and one
  limiter only; on a session it sets the master's Maximizer (or adds a master with one).
- What limiting costs shows in `stats`: `crest_db` and `lra` fall. Give the user those beside each
  step of a ladder, and the source's.
- 16-bit delivery: bounce with `bit_depth: "16"` (dither is on by default when resolution is lost).

## Stems and bounces

```
file.bounce_mix {"path":"…/mix.wav","bit_depth":"24","start":{"seconds":0},"end":{"seconds":265}}   # format from "format": wav|aiff|flac
file.bounce_stems {"dir":"…/stems","format":"flac","start":{"seconds":0},"end":{"seconds":265}}
```

- `file.bounce_stems`: one file per audio and instrument track, named `<session> - <track>.<ext>`,
  each through its own routing and carrying its share of the returns. They add up to the mix when the
  master has no processing (bypass it first for stems meant to be summed).
- A group stem: solo the group's source tracks and bounce the mix. Three group stems summed equal the mix.
- `source: "<bus name>"` in `file.bounce_mix` bounces the raw bus before its aux: useful to check
  what feeds a return, not as a stem.
- `track.freeze` (exact) and `track.commit` (a new `<name>.cm` track with the inserts rendered in, the
  original made inactive, 2 s of tail added) print a track's processing.
