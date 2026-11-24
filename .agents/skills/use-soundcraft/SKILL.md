---
name: use-soundcraft
description: Do audio work in SoundCraft, the open-source DAW (a Pro Tools-style Edit and Mix window), through its MCP server or its command line (soundcraft-cli), with no window needed — mix a song from its stems (levels, pan, EQ, compression, de-essing, reverb and delay sends, group buses, VCAs, automation), master to a loudness target with a true-peak limit or a loudness ladder to pick from, bounce the mix or its stems as WAV, AIFF or FLAC, edit audio (shorten a song, cut a teaser with fades, loop a section, split, move, crossfade, strip silence, consolidate), process it (pitch shift, time stretch, speed, reverse, normalize, gain), work with MIDI and the built-in synth, drum machine and sampler (write or import notes, quantize, transpose, export MIDI, MusicXML and a printable score), convert and inspect audio files, and hand the session to the user in the SoundCraft app to change by hand, then bring it back. Every result is checked by measuring it (loudness, peaks, balance, bands, null tests, spectrograms), since Claude can't listen. Use when the user says "mix these stems", "balance / rebalance the vocals", "add reverb / delay / compression / EQ", "master it to -9 LUFS", "make it louder", "loudness options", "bounce the stems", "shorten this song", "cut a 30 second teaser", "loop this part", "fade it out", "pitch it up", "slow it down", "strip the silence", "convert this to FLAC / 44.1 kHz", "make a beat / a MIDI part", "open it in SoundCraft", "let me mix it myself", "/use-soundcraft", or when another skill needs an editable multitrack session instead of a flat ffmpeg render. Not for making a song or a voice from a prompt (Suno, ElevenLabs), separating stems from a mix (mm analyze), or transcribing words (mm transcribe).
metadata:
  version: 0.1.0
---

# use-soundcraft

SoundCraft (github.com/storytold/soundcraft, MIT or Apache-2.0, pre-alpha) is a digital audio workstation
in Rust: tracks and clips, a mixer with inserts, sends, buses, aux inputs, VCAs and automation, 30
built-in plugins and instruments, MIDI, offline processing and bounce. Its sessions are `.scraft` files;
its command line, `soundcraft-cli`, runs every one of its 483 commands with no window and no audio
device, and serves them over MCP; the SoundCraft app opens the same sessions for mixing by hand. All of
it is local: no account, no key.

Everything this skill and its folder say was run on soundcraft-cli 0.20.1 and measured. The folder:

| | What | Read it when |
|---|---|---|
| `reference/checking.md` | how to check audio without ears: what to measure for each move, null tests, spectrograms | before the first bounce |
| `reference/command-index.md` | "I want to …" → the command, for every task | finding a command |
| `reference/mixing.md` | signal flow, buses, auxes and sends, every plugin's parameters, automation, groups and VCAs, the master, stems | mixing or mastering |
| `reference/editing.md` | clips and ranges, cuts, fades, loops, strip silence, time operations, pitch / stretch / speed | editing or processing audio |
| `reference/midi.md` | instrument tracks, notes and ticks, importing and exporting MIDI, scores, the sampler | anything with notes |
| `reference/files.md` | importing, converting, bounce formats, sessions and disk space, the app, confined folders | getting things in and out |
| `recipes/` + `README.md` | step lists to copy: a teaser, a shortened song, effect returns, a vocal chain | starting a job of that kind |
| `scripts/measure.py` | levels, loudness, balance, bands, tails, null tests, clicks, spectrograms | checking any bounce |
| `scripts/stems_session.py` | a folder of stems → a routed session (group buses, master, colours) | starting a mix |
| `scripts/master_to.py` | a song or a session → a loudness target (or a ladder) under a true-peak limit | mastering, "make it louder" |

## 1. First: check the MCPs

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/soundcraft` | required | Building, changing, checking and bouncing sessions (`soundcraft-cli` alone does the same with step lists) | Nothing to work with: install it first |

- The MCP's tools: `mcp__soundcraft__execute`, `batch`, `list_commands`, `inspect_session`, `new_session`,
  `open_session`, `save_session`, `import_audio`, `bounce_mix`, `parity`; with the app attached also
  `screenshot`, `ui_inspect`, `ui_set`, `menu_invoke`, `click`, `drag`, `key` (a connector added in the
  Claude app has another prefix: match the names; load deferred ones with ToolSearch).
- Or the command line: `soundcraft-cli --version` (on the PATH, or `~/.local/bin/soundcraft-cli`).
- The app, for mixing by hand and for listening: `/Applications/SoundCraft.app` on a Mac.
- The checks need `ffmpeg`, `ffprobe` and `uv` (`mm doctor` looks for them).

Missing: by hand, with the user's yes for the download, the latest release's
`soundcraft-cli-<version>-macos-universal.zip` (signed and notarized; check it against the release's
`SHA256SUMS.txt`; Linux has a tarball, Windows gets it with the app) unzipped into `~/.local/bin`, then
`claude mcp add --scope user soundcraft -- ~/.local/bin/soundcraft-cli mcp` (a full path: the Claude app
may not have `~/.local/bin` on its PATH; the tools come in the next session). The app is
`soundcraft-<version>-macos-universal.dmg` from the same release. The command line alone does everything
here, so a session without the MCP still works.

## 2. Three ways to drive it

| | How | Best for |
|---|---|---|
| MCP (headless) | `execute {command, params}`, `batch {calls: […], keep_going?}`, `inspect_session`, `bounce_mix`, `save_session`. The server keeps one session open between calls, so ids come back and are used in the next call | working a mix step by step while measuring |
| Step list | a text file, one `command.id {json}` a line (`#` comments), run with `soundcraft-cli script <steps>.txt [--in <s>.scraft] [--bounce <out>] --start 0 --end <s> [--save <new>.scraft] [--inspect]`; a few steps inline as `soundcraft-cli run --cmd 'id={json}' …` | whole builds, repeatable jobs, recipes; keep the list beside the session |
| Live app | SoundCraft started as `open -a SoundCraft --args --control 7801 <session>`, then `soundcraft-cli app --port 7801 <command or method> '<json>'`, or a second MCP server `soundcraft-cli mcp --connect 7801` (add it as `soundcraft-app`) | changing the window the user is looking at and hearing; screenshots |

What differs from one to the next, and bites:

- A step list starts from nothing every run (a new session, `--demo`, or `--in`). It cannot use an
  earlier step's result, but ids are the same on every run: run once with `--inspect`, read the clip
  and track ids, then write them into the next steps. Tracks are named, so most steps need no id.
- A failing line stops a step list (`--keep-going` goes on and exits nonzero). An MCP `batch` stops at
  the first failing call too, but **nothing is rolled back**: the calls before it stay applied.
  `inspect_session` after an error, or `edit.undo`.
- Find a command with `soundcraft-cli commands <word>` and its parameters with `soundcraft-cli describe
  <id>` (MCP: `list_commands {filter}`). Positions are samples as bare numbers, `{"seconds": 12.5}`, or
  strings like `"bars_beats:5|1|000"`. Tracks are a name or an id; most commands take `tracks: [...]`.
- Headless there is no sound and no playback: the user listens to a bounce, or in the app.

## 3. The loop: brief → start → build → check → show → hand over

1. **Brief**: what the audio is and where it is (a stems folder, one mix, a session), what should
   change, what it is for (a release, a video, a short), the target (loudness and true peak, length,
   format), and what must not change. Say what you took a loose word to mean ("vocals" as lead and
   backing together, "a bit of reverb" as a send level) so the user can correct it. "Louder" is not a mix request: when the user likes the mix, it
   gets gain and one limiter (`scripts/master_to.py`) and nothing else. Read the user's notes and any
   skill that owns the job (a remaster skill's preferences win over this one's defaults).
2. **Start**: stems → `scripts/stems_session.py <folder> <song folder>/<name>.scraft`; one file →
   `session.new` + `file.import_audio`; a session → `--in` / `open_session`. One folder a song:
   saving copies every source into `Audio Files/` beside the session (`reference/files.md`).
3. **Measure first**, what the job will change: the range for an excerpt, the whole song for a master,
   a stem when its level or tone is in question (`scripts/measure.py stats`). Decisions come from these
   numbers and from what the user says they hear.
4. **Build**, in this order when mixing: names and routing (group buses, returns), then levels and pan,
   then cleaning (high-pass, de-ess), then dynamics, then space (sends), then automation, the master
   last. One change at a time when the user is steering, so each can be heard and undone.
5. **Check** every bounce before the user hears of it (`reference/checking.md`): the bounce's own
   `lufs`, `peak_db` and `true_peak_db`, then `measure.py` for what the move was meant to do. A
   `peak_db` above 0 means the file is clipped. Fix and bounce again.
6. **Show**: give the bounce (a FLAC or WAV in the song's folder, with a line to open or reveal it),
   say in plain words what changed and the numbers before and after. Never say how it sounds: say
   what was measured, and ask the user to listen.
7. **Hand over and bring back** (section 5) when the user wants to mix by hand.

## 4. The rules that cost the most time (all proved)

- **Bounce with both ends.** `--start 0 --end <seconds>` (in a command: `start` and `end` as
  `{"seconds": …}`). With `--end` alone the start is not 0. With neither, the bounce stops at the
  session's end and cuts reverb and delay tails: add the tail's length to `end`.
- **The bounce is the meter.** Its result has `lufs`, `peak_db`, `true_peak_db` and `seconds`, and
  agrees with ffmpeg (loudness within 0.1 LU). WAV, AIFF and FLAC at 16 or 24 bit clip anything over 0
  with no warning: only `peak_db > 0` says so. `bit_depth: "32f"` keeps overs for checks.
- **The Maximizer limits sample peaks, not true peaks.** A ceiling of −1 gave true peaks up to
  +0.6 dBTP when pushed. For a true-peak limit, lower the ceiling until `true_peak_db` fits
  (`scripts/master_to.py` does this; a ceiling 0.5 to 1.3 dB under the limit was needed).
- **A mono track in the centre plays 3 dB down on each side** (the pan law): a −20 dBFS mono tone
  reads −23 in a stereo bounce.
- **A send needs three things**: a bus (`mix.new_bus`), an aux track (`track.new {kind:"aux"}`) whose
  input is the bus (`track.input`), and the effect on the aux at `mix: 100`. Then `mix.send` from each
  track. A group bus is the same with `track.output` instead of sends.
- **Solo follows the signal down, not up.** Soloing a track keeps its returns and its group aux
  sounding; soloing an aux alone gives silence. A group's stem is its source tracks soloed.
  `file.bounce_mix {source: "<bus>"}` is the raw bus before its aux (no fader, no inserts).
  `file.bounce_stems` writes one file per source track, each with its share of the returns, and
  they add up to the mix when the master has no processing.
- **Wrong parameters fail differently.** `mix.insert` and `mix.insert_params` refuse an unknown
  parameter name; a value out of range is clamped with no word; `audiosuite.process` ignores an
  unknown parameter and still says `processed: 1`. Measure what a process did, every time.
- **Saving copies the audio.** A `.scraft` gets an `Audio Files/` folder beside it with every source
  rewritten at the session's bit depth (twelve 16-bit stems became 1.1 GB at 24-bit). Saving again in
  the same folder writes no new audio. For checks, bounce a range or a FLAC, and remove the checks
  you made once the numbers are read.
- **Tempo does not move audio.** Changing the tempo leaves clips on sample-based tracks where they
  are. Beat analysis guessed a wrong tempo on a real song: take a tempo from the song's MIDI file or
  the user, not from `event.beat_detective`.
- **Screenshots need a path** (`screenshot {path}`): without one the picture comes back inline, far
  too large to read.
- `track.commit` renders a track's inserts into a new `<name>.cm` track, 2 s longer, and is close but
  not identical (−80 dB apart); `track.freeze` is exact. Out-of-the-box nothing third-party loads:
  CLAP, VST3 and AU plugins are scanned from the system's folders (`engine.clap_plugins`).

## 5. Hand it to the user, and bring the mix back

1. Save the session (`save_session` / `--save`) in the song's folder and open it:
   `open -a SoundCraft --args --control 7801 <session>`. The control port lets a live session attach;
   add `--no-audio` only for a silent check of your own.
2. Tell the user what is where (the Mix window is ⌘=, group auxes in capitals, returns named) and to
   save with ⌘S. While the app is open, change it only through the app (`soundcraft-cli app --port
   7801 …` or the `--connect` server), never by writing the file under it.
3. Back: `soundcraft-cli run --in <session> --inspect` reads what they changed; bounce and measure as
   in step 5 of the loop.
4. Never build over a session the user may have changed: a new build is a new file
   (`<name>-2.scraft`, `--save` never the `--in` file), and every bounce a new version
   (`<title> - mix v2.wav`). Earlier ones stay.
5. A release master is the user's pick, by ear: give a ladder (`master_to.py --ladder`) or two
   versions, and copy only the pick to where releases live.

## Where it runs

| Step | Needs | A person's yes | Safe to repeat | Without it |
|---|---|---|---|---|
| 1. Check it is there | nothing | no | yes | - |
| 2. Brief and start | nothing | no | yes | - |
| 3. Build | `mcp:soundcraft` | no | yes | a to-do for a place with Soundcraft |
| 4. Check | `mcp:soundcraft` | no | yes | a to-do for a place with Soundcraft |
| 5. Show | nothing | no | yes | - |
| 6. Hand it to the user | `mcp:soundcraft`, `app:soundcraft` | no | yes | a to-do: open the session in SoundCraft on the user's computer |
| 7. Bring the mix back | `mcp:soundcraft` | no | yes | a to-do for a place with Soundcraft |

`mcp:soundcraft` is the MCP or `soundcraft-cli` alone (step lists do the same). Installing it downloads
a release: ask first. The checks also use ffmpeg and uv. Nothing here costs money.

## Feedback log

This log is shared and changes only when the skill is updated, never in a session. New lessons go in
your notes, outside the skill. Read them with this log before planning:

```bash
mm notes add use-soundcraft "<what the user said> → <the rule>"   # a new lesson, dated for you
mm notes use-soundcraft                                           # your notes for this skill
```

- 2026-11-24 · first tried (experiments, not productions) on soundcraft-cli 0.20.1: the built-in demo
  song and a real twelve-stem song. Faders, pan, solo, EQ, compression, sends, group buses, VCAs,
  automation, stems, editing, offline processing, MIDI, the instruments, file conversion, the MCP
  server and the live app were each run and measured; what they showed is sections 2 to 5 and
  `reference/`. No command crashed or hung.
- 2026-11-24 · a fresh session following only this skill cut a teaser and mixed and mastered five
  stems to brief with no failed command; what it had to guess is now written in: which file a null
  test puts the gain on, nulling a piece against its place in a longer file, checking a group fader
  and a fade on music, sizing a tail, the master script's tail and save options, bounce depth.
