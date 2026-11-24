# Files: in, out, sessions and the app

All run on soundcraft-cli 0.20.1.

## Reading and converting a file (no session)

```bash
soundcraft-cli info song.mp3 --compact          # format, channels, sample rate, frames, seconds; a .scraft prints a text summary
soundcraft-cli convert in.mp3 out.wav --rate 44100 --bit-depth 16      # resample, change depth (dithers when depth is lost)
soundcraft-cli convert in.wav out.flac                                  # lossless: it nulls against the WAV
soundcraft-cli convert in.wav out.wav --normalize                       # peak to -0.1 dBFS
```

- Reads WAV, BWF, RF64, AIFF, FLAC, MP3, Ogg, Opus, M4A/AAC, ALAC, CAF, AC-3, and the audio of
  MP4, MOV, MKV and WebM. Writes **WAV, AIFF and FLAC only**. An MP3 or M4A for upload is made from the
  bounce with ffmpeg.
- The default depth is 24-bit, also for FLAC from a 16-bit source: pass `--bit-depth 16` to keep it small.
- It refuses to write over its input (`--in-place` allows it: don't). An existing output that is not
  the input is replaced without asking, so choose a new name.
- A whole song converts in about a second.

## Into a session

```
session.new {"name":"Song","sample_rate":48000,"bit_depth":24}      # "template":"demo" for the built-in demo song
file.import_audio {"path":"/…/vocals.wav"}                           # a new track named after the file
file.import_audio {"paths":["/…/a.wav","/…/b.wav"]}                   # one track each
file.import_audio {"path":"/…/take2.wav","track":"Vocals","at":{"seconds":30},"new_tracks":false}
file.import_midi {"path":"/…/song.mid"}
file.import_video {"path":"/…/clip.mp4"}                              # the picture on a Video track and its audio on a new track (not tried here)
```

- A file at another sample rate is resampled to the session's on the way in; its length is kept.
- Twelve 4½-minute stereo stems were imported, summed and saved in about 7 s.
- A track is named after its file: `track.rename {"track":"<file name>","name":"Vocals"}`.

## Out of a session

- `file.bounce_mix {path, format?: wav|aiff|flac, bit_depth?: 16|24|32f, start, end, source?, normalize?, dither?}`
  and the CLI's `--bounce <file> --start <s> --end <s>`. In both, the path's extension picks the format
  and the depth is 24-bit unless `bit_depth` says otherwise (`--bounce` has no depth flag: use the
  command for 16-bit or float).
- `file.bounce_stems {dir, format?, bit_depth?, start?, end?}`; `file.export_clips {"dir":…,"clips":[ids]}`
  (it needs the clips named); `file.export_midi`; `file.export_session_text {path}` (a text listing of
  files, tracks and clips).
- Always give both `start` and `end` (SKILL.md, section 4). A bare number in JSON is samples:
  write seconds as `{"seconds": 12.5}`. On the command line `--start 12.5` is seconds.
- A bounce replaces a file of the same name without asking. Earlier outputs stay: version the name.

## Sessions and disk space

- A session is `<name>.scraft` (JSON, small) plus `Audio Files/` beside it, holding a copy of every
  source at the session's bit depth. Twelve 50 MB 16-bit stems became 1.1 GB at 24-bit.
- Saving another session into the same folder reuses those files (`audio_files_written: 0`), so keep
  every version of a song's session in one folder: `mix-1.scraft`, `mix-2.scraft`.
- `save_session` and `session.save_as` refuse to replace another file unless `replace` is true; the
  CLI's `--save` replaces. Never `--save` onto the `--in` session: a new name each time.
- A reopened session bounces identically to the one that was saved (it nulls).
- `session.audio_health {}` checks that every clip's audio is loaded. `open_session` returns `missing`
  for files it couldn't find.
- The user's own songs and stems are only ever read: sessions, bounces and checks go in the
  production's folder in the workspace (`mm workspace` says where `out/` is), and a finished file is
  delivered to the user's folders only after they approve it.
- Before stopping, say how much disk a session's folder took, and remove the bounces made only to measure.

## The app

```bash
open -a SoundCraft --args --control 7801 "/…/mix-1.scraft"      # --no-audio opens no audio device; --demo opens the demo song
soundcraft-cli app --port 7801 transport.status
soundcraft-cli app --port 7801 mix.volume '{"tracks":["Vocals"],"delta_db":1}'
soundcraft-cli app --port 7801 ui.set '{"window":"Mix"}'
soundcraft-cli app --port 7801 ui.screenshot '{"path":"/…/mix-window.png"}'
soundcraft-cli app --port 7801 app.quit
```

- The control channel listens on this computer only. `soundcraft-cli mcp --connect 7801` serves the
  same app over MCP, adding `screenshot`, `ui_inspect`, `ui_set`, `menu_invoke`, `click`, `drag`
  and `key`.
- A dotted command id runs that command in the open window; `session.inspect`, `ui.inspect`,
  `ui.screenshot`, `ui.menu.invoke` are the control channel's own methods.
- `ui.menu.invoke {"path":"Track > New..."}` opens the item's dialog, as a click would: close it
  (`ui.key {"key":"Escape"}`) or the user finds it open. Commands run by id never open a dialog.
- Playback (`transport.play`) plays through the user's speakers: only when they ask to hear it.
- Never arm a track, switch input monitoring on or record from a script.
- The app's settings and logs are in `~/Library/Application Support/SoundCraft/` on a Mac.

## Keeping the MCP to some folders

`soundcraft-cli mcp --automation-read-root <dir> --automation-write-root <dir>` (each flag may repeat)
confines what the server's commands read and write. A path outside is refused with a message that
names the root. Without the flags it reads and writes anywhere the user can. `--connect` can't be
confined: the app is not.
