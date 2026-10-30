---
name: make-loudness-remaster
description: Remaster a finished song (a Suno track or any stereo mix) for YouTube and streaming the way the user likes it — keep the song's own mix exactly as it is and only make it louder. It measures the original, builds a loudness ladder in REAPER (a gain-only copy with peaks at -1 dBTP, then -11, -10, -9 and -8 LUFS through one limiter and nothing else), measures what each step costs (deep bass, build-up, punch), lets the user pick by ear, and copies the pick next to the mix as "<title> - final master (-N LUFS).wav". No EQ, compression, clipping, stem remixing or noise cleanup unless the user asks for that one thing. Explains each step in plain words for someone new to mastering. Use when the user says "remaster <song>", "master this track", "make it louder", "louder for YouTube / Spotify / the gym", "loudness options", "/make-loudness-remaster", or gives a song folder (a Suno mix with or without its stems) to master. Append new user feedback to the log at the bottom.
metadata:
  category: make
---

# make-loudness-remaster

Suno (and most AI music) already arrives mixed and mastered, just quiet: around -15 LUFS with
3–5 dB of unused headroom. The user's ears decided what a remaster should be here. Three songs in,
every extra stage (a stem remix, EQ, glue compression, cutting Suno's fizzy top end, a soft clipper)
lost "the original touch", and the version they kept every time was **Suno's own mix, only louder**.
So this skill makes the song louder in clean steps and lets the user choose how far.

| Output | Where | What it is |
| --- | --- | --- |
| Ladder | `<song folder>/remaster/v<N>/` | `<title> - original -12 LUFS (level-matched).wav` (gain only) and `-11`, `-10`, `-9`, `-8 LUFS.wav` (limiter only), plus the REAPER session `<title> - original louder.rpp` |
| Final | next to the song's mix | `<title> - final master (-N LUFS).wav`, a byte-identical copy of the step the user picked |

Everything is 24-bit WAV at the mix's own sample rate, true peak -1.0 dBTP or lower.

## Setup (once per machine)

- **REAPER** open, with reapy's distant API on. If `reapy.connect()` fails:
  1. `uv tool install reaper-mcp-server` (the environment the scripts run in; it brings reapy,
     numpy, soundfile and pyloudnorm). Optionally register its MCP: `claude mcp add --scope user
     reaper -- reaper-mcp-server` (the scripts below are much faster than its tools).
  2. Install `python-reapy` into the Python REAPER loads: on macOS the python.org framework Python
     (`/Library/Frameworks/Python.framework/Versions/3.12/bin/python3.12 -m pip install python-reapy`).
  3. With REAPER **closed** (it rewrites reaper.ini on exit), back up reaper.ini, then run
     `python3.12 -c "import reapy.config as c; c.configure_reaper(detect_portable_install=False)"`
     with that Python: it enables Python in REAPER, adds the web interface on port 2307 and the
     reapy action. Start REAPER again.
- **ffmpeg** on the PATH (true peak and loudness range).

Run the scripts with the tool's Python:

```bash
PY="$(uv tool dir)/reaper-mcp-server/bin/python"; SK=.claude/skills/make-loudness-remaster/scripts
```

## Steps

1. **Find the song's own mix.** In a Suno download the full mix sits next to the stems folder
   (`<name>.wav`, sometimes one folder up), with the same length as the stems (`ffprobe` both).
   Use the mix, never a sum of the stems: Suno separates stems after the fact, so they don't add
   back up to its mix. Ask for the song title when the file name isn't it ("Better Luck next life -
   funk + copper - gym final" was *I am the Demon*); a release folder's `info.json` has `songTitle`.
   Don't rename the user's source files unless asked.
2. **Measure the original** (`$PY $SK/measure.py "<mix>.wav"`) and tell the user in plain words
   what you see: how loud it is, how much headroom it leaves, whether it is bass-heavy, how much it
   builds. Say what LUFS means the first time ("the loudness scale YouTube and Spotify use; they
   turn everything down to about -14").
3. **Build the ladder** in the next free `remaster/v<N>/` folder (never overwrite a version):

   ```bash
   $PY $SK/ladder.py "<mix>.wav" "<song folder>/remaster/v1" "<Title>"
   ```

   It makes the gain-only copy, opens a **new REAPER tab** with the mix on one track and ReaLimit
   as the only effect, and tunes each step until it measures within 0.15 LU of its target (about a
   minute a song). When ReaLimit stalls short of a target it retries with a faster release; a file
   is always named after what it measures. `--targets=-7` adds steps to an existing ladder later.
4. **Measure the ladder** (`$PY $SK/measure.py` on the original and every step) and give the user a
   short table of what each step costs: build-up (LRA), deep bass (sub), punch (PLR). The usual
   picture: -12 and -11 are the original, louder; -10 is nearly identical; -9 gives up a little sub
   and build-up; -8 costs more than all the steps before it together (the build-up roughly halves),
   and its faster limiter release can make bass pump or grit. Tell them to compare the song's
   loudest part at -9 and -8. Give a one-click `open -R` block for the folder (never open Finder).
5. **The user picks by ear.** Copy the pick next to the song's mix and check it:

   ```bash
   cp -n "<ladder>/<Title> - original -9 LUFS.wav" "<song folder>/<Title> - final master (-9 LUFS).wav" && cmp "<ladder>/<Title> - original -9 LUFS.wav" "<song folder>/<Title> - final master (-9 LUFS).wav"
   ```

   From then on that file is the song's audio (lyric video, uploads, DistroKid). Note it in the
   song's memory or notes.

## Things to know

- **Their taste so far:** Honored One, I am the Demon and Inexorable (2026-10-30/31) all ended at
  **-9 LUFS**. They lean loud ("loud volume is better", "I need even more volume"), so the ladder
  goes down to -8 by default; the pick is theirs.
- **Don't over-master.** No EQ, compressor, clipper, stem remix or noise cleanup by default. If the
  user asks for one of them, do just that one, as a new version beside the ladder, and compare it
  at the same loudness (a louder file always sounds better at first).
  - *Noise / fizz*: Suno renders a flat haze from about 6 kHz to 19.6 kHz into its audio (cymbals,
    percussion, junk above 12 kHz in bass and synth stems). A spectrogram shows it
    (`ffmpeg -lavfi showspectrumpic`). Cutting it with low-passes per stem worked technically, but
    the user heard the result as lost character. Offer it, don't do it.
  - *Louder than -8*: ReaLimit alone stops near -8.2 on a bass-heavy mix. Going further needs a
    clipper before the limiter (JS: schwa/soft_clipper, boost a few dB), which flattens the song
    further. Only on request, and say what it costs.
- **REAPER traps** (each one cost time once):
  - Wrap every batch of reapy calls in `with reapy.inside_reaper():`. Without it a REAPER in the
    background answers about one call per refresh, and a script that should take seconds takes
    15 minutes.
  - Never call `Main_SaveProject` on a project with no file path: it opens a Save As dialog that
    freezes REAPER and every reapy call until a person clicks Cancel. `open_session` saves with
    `Main_SaveProjectEx` and reopens the file so the tab owns it.
  - REAPER can leave items offline after a reload, and an offline item renders silence. `render`
    puts media online and checks the source length first.
  - ReaLimit's ceiling is a sample peak, and between-sample peaks run about 0.4 dB higher, so the
    ceiling sits at -1.5 for -1.0 dBTP (lowered further when a render still peaks above it).
  - Renders are never overwritten (a REAPER overwrite prompt would block too); old versions stay.
- **Plain words.** The user is new to mastering: explain each step in a sentence (what the limiter
  does, why louder isn't louder on YouTube, what a number means), no jargon without its meaning.

## Log

User feedback, newest last. Add an entry whenever the user corrects or confirms how this skill works.

- 2026-10-30 (Honored One): v1 rebuilt the song from Suno's 12 stems (EQ per track, buses, glue
  comp, -12 LUFS). User: louder, it's "a grand workout song, loud volume is better", and "there is
  some noise in the original".
- 2026-10-30: v2 cut Suno's fizz with stem low-passes and pushed to -9/-8 with a clipper. User:
  "out of all the remasters, I liked the level-matched one best, it has the least amount of loss of
  quality, the rest have lost the original touch, maybe overmastering is incorrect, just raise the
  volume". → The method of this skill: the original mix, gain + one limiter, a ladder to pick from.
- 2026-10-31: picked -9 for Honored One. Demon + Inexorable "remaster both the same way"; asked
  for -8 too ("I need even more volume"), then picked -9 for both. Made into this skill.
