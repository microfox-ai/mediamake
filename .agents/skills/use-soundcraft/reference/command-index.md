# "I want to …" → the command

483 commands on soundcraft-cli 0.20.1. Look one up with `soundcraft-cli commands <word>` (ids, labels,
menu paths), `soundcraft-cli describe <id>` (its parameters), or MCP `list_commands {filter}`. The ones
below were run; the last table lists areas that exist and were not tried.

## Sessions and files

| I want to | Command |
|---|---|
| start a session | `session.new {name, sample_rate, bit_depth, template?: demo}` · MCP `new_session` |
| open, save | `session.open {path}`, `session.save_as {path, replace?}` · MCP `open_session`, `save_session` · CLI `--in`, `--save` |
| see everything | `session.inspect {detail?: full}` · MCP `inspect_session` · CLI `--inspect [--compact]` |
| see one track or clip | `track.inspect {track}` (inserts with every parameter, automation points), `clip.inspect {clip}` |
| bring audio in | `file.import_audio {path | paths, track?, at?, new_tracks?}` |
| bring MIDI in | `file.import_midi {path}` |
| bounce the mix | `file.bounce_mix {path, bit_depth?, start, end}` · CLI `--bounce <file> --start --end` |
| bounce every track | `file.bounce_stems {dir, format?, start?, end?}` |
| check the audio is all there | `session.audio_health {}` |
| list the session as text | `file.export_session_text {path}` |
| convert or inspect a file | `soundcraft-cli convert`, `soundcraft-cli info` (no session) |

## Tracks and routing

| I want to | Command |
|---|---|
| add tracks | `track.new {kind, format, name, instrument?}` or `{rows: [...]}` |
| rename, colour, delete, duplicate | `track.rename`, `track.color {tracks, color:[r,g,b]}`, `track.delete`, `track.duplicate` |
| make a bus | `mix.new_bus {name}` |
| feed an aux from a bus | `track.input {tracks, input: <bus>}` |
| send tracks to a bus | `track.output {tracks, output: <bus> | main}` |
| group faders, add a VCA | `track.group {name, tracks}`, `track.new {kind: vca}` + `track.vca {tracks, vca}` |
| print a track's effects | `track.freeze`, `track.commit` |

## Mixing

| I want to | Command |
|---|---|
| set a level, pan | `mix.volume {tracks, db | delta_db}`, `mix.pan {tracks, pan, index?}` |
| mute, solo, flip phase, trim | `mix.mute`, `mix.solo` (+ `mix.clear_solos`), `mix.phase_invert`, `mix.trim` |
| add, set, bypass, move, remove a plugin | `mix.insert`, `mix.insert_params`, `mix.insert_bypass`, `mix.insert_move`, `mix.insert_remove` |
| list the plugins and their ranges | `engine.plugins {}` · `soundcraft-cli plugins` |
| add a send, set it | `mix.send {track, bus, level_db, pre_fader?}`, `mix.send_level`, `mix.send_remove` |
| write automation | `automation.set_point {track, param, at, value}`, `automation.write_range`, `automation.clear` |
| bypass a track's effects | `track.bypass_inserts {tracks, bypass}` |
| hit a loudness target | `scripts/master_to.py` (the Maximizer's `threshold` and `ceiling`) |

## Editing and processing

| I want to | Command |
|---|---|
| select | `edit.select {tracks, start, end | clips}`, `edit.select_all` |
| cut time out of the song | `event.cut_time {start, end}` |
| keep only a range | `edit.trim_to_selection {tracks, start, end}` |
| split, heal | `edit.separate {tracks, at}`, `edit.separate_on_grid`, `edit.separate_at_transients`, `edit.heal` |
| cut, copy, paste | `edit.cut`, `edit.copy`, `edit.paste {tracks, at}`, `edit.mode {mode: shuffle | slip}` |
| move, mute, gain a clip | `edit.move_clips {clips, to | by}`, `edit.mute_clips`, `clip.gain {clips, db}` |
| fade, crossfade | `edit.fades_create {clip, side, length, shape}` or `{tracks, start, end, shape}` |
| repeat, loop | `edit.repeat {count}`, `clip.loop {clips, count}` |
| join into one clip | `edit.consolidate {tracks, start, end}` |
| add time, shift | `event.insert_time {start, length}`, `edit.shift {by, later}` |
| strip silence | `edit.strip_silence {threshold_db, min_length_ms, …}`, `edit.strip_silence_preview` |
| pitch, stretch, speed, reverse, normalize, gain | `audiosuite.process {process, params, clips | tracks}` |
| make a test tone | `audiosuite.process {process: signal_generator, params: {freq, level}, tracks, start, end}` |
| undo | `edit.undo`, `edit.redo`, `engine.history` |

## Time, markers, MIDI

| I want to | Command |
|---|---|
| set tempo, meter | `event.tempo {bpm, at?}`, `event.meter {numerator, denominator}` |
| guess a tempo from audio (a hint only) | `event.beat_detective {tracks, start, end, set_tempo?}` |
| add a marker | `markers.add {name, at}` |
| write notes | `midi.new_clip`, `midi.note_add`, `midi.notes`, `midi.note_edit`, `midi.note_delete`, `midi.notes_move` |
| quantize, transpose, velocities | `event.quantize`, `event.transpose`, `event.change_velocity` |
| set an instrument and its sound | `mix.instrument`, `mix.instrument_param`, `mix.sampler_load` |
| export MIDI, MusicXML, a score | `file.export_midi`, `file.export_sibelius`, `file.print_score` |

## The app (with `--control` or `--connect`)

| I want to | Command |
|---|---|
| show the Mix or Edit window | `ui.set {"window":"Mix"}` · MCP `ui_set` |
| take a picture of the window | `ui.screenshot {path}` · MCP `screenshot {path}` |
| read the window's state | `ui.inspect {}` · MCP `ui_inspect` |
| play, stop, locate | `transport.play`, `transport.stop`, `transport.locate {at}`, `transport.status` |
| quit | `app.quit {}` |

## There, not tried here

Recording and punch-in (app and a device only), playlists and comping (`track.playlist_*`), elastic
audio and conforming clips to tempo (`track.elastic`, `clip.conform_to_tempo`), tempo ramps, clip
effects (`clip.effects_*`), surround and immersive formats (`setup.main_format`, `mix.surround_pan`),
video tracks (`file.import_video`, `video.*`), third-party CLAP, VST3 and AU plugins (`mix.insert` with
a `clap:`, `vst3:` or `au:` id), track presets (`track.save_preset`), importing tracks from another
session (`file.import_session_data`). Try one on a copy and measure before relying on it.
