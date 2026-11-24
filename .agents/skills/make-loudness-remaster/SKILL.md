---
name: make-loudness-remaster
description: Remaster a finished song (a Suno track or any stereo mix) for YouTube and streaming the way the user likes it — keep the song's own mix exactly as it is and only make it louder. It measures the original, builds a loudness ladder (a gain-only copy with peaks at -1 dBTP, then -11, -10, -9 and -8 LUFS through one limiter and nothing else) with either of two engines, REAPER's ReaLimit or SoundCraft's Maximizer (which needs nothing open and runs in a cloud session), or both side by side to compare, measures what each step costs (deep bass, build-up, punch), lets the user pick by ear, and copies the pick next to the mix as "<title> - final master (-N LUFS).wav". No EQ, compression, clipping, stem remixing or noise cleanup unless the user asks for that one thing. Explains each step in plain words for someone new to mastering. Use when the user says "remaster <song>", "master this track", "make it louder", "louder for YouTube / Spotify / the gym", "loudness options", "/make-loudness-remaster", or gives a song folder (a Suno mix with or without its stems) to master. New user feedback goes in your notes (mm notes add), never in this file.
metadata:
  category: make
  version: 0.2.1
---

# make-loudness-remaster

Suno (and most AI music) already arrives mixed and mastered, just quiet: around -15 LUFS with
3–5 dB of unused headroom. The user's ears decided what a remaster should be here. Three songs in,
every extra stage (a stem remix, EQ, glue compression, cutting Suno's fizzy top end, a soft clipper)
lost "the original touch", and the version they kept every time was **Suno's own mix, only louder**.
So this skill makes the song louder in clean steps and lets the user choose how far.

| Output | Where | What it is |
| --- | --- | --- |
| Ladder | `<song folder>/remaster/v<N>/` | `<title> - original -12 LUFS (level-matched).wav` (gain only) and `-11`, `-10`, `-9`, `-8 LUFS.wav` (limiter only; SoundCraft's steps end in `(SoundCraft).wav`, and REAPER's in `(REAPER).wav` when both engines built the ladder), the engine's session (`<title> - original louder.rpp`, or SoundCraft's as a step list, `… (SoundCraft).steps.txt`) and `ladder.json` (which engine and settings made each file) |
| Review | `<ladder>/remaster.json`, `<ladder>/v<N>.revisions/` | the sidecar `review.py` writes for the Stem Player, and the user's pick and notes the screen writes back |
| Final | next to the song's mix | `<title> - final master (-N LUFS).wav`, a byte-identical copy of the step the user picked |

Everything is 24-bit WAV at the mix's own sample rate, true peak -1.0 dBTP or lower, measured the
same way whichever engine made it.

## Two engines, one method

The method never changes: the song's own mix, gain, one limiter. What makes the limiter steps does:

| Engine | Limiter | Needs | Good to know |
| --- | --- | --- | --- |
| `reaper` (the default) | ReaLimit | REAPER open on this computer, set up once (below) | Made every master the user has picked so far. Leaves a `.rpp` session |
| `soundcraft` | Maximizer | `soundcraft-cli` (the Soundcraft MCP's command line; the use-soundcraft skill says how to install it) | Nothing to open, no window, runs in a cloud session. Its path is bit-exact when the limiter is idle. Leaves its session as a step list |
| `both` | each | both of the above | Every step twice in one folder, for an A/B on the review screen |

Which to use: the user's notes (`mm notes make-loudness-remaster`) say when they have settled on one.
Until they have, build the first ladder with `--engine=both` so they can hear the two limiters at
the same loudness, and write down what they pick. Where REAPER isn't there (a cloud session, a
computer without it), use `soundcraft`. A limiter is the only thing that differs between them, so
the two sound the same at the quiet steps and part ways as the limiting gets heavier: tell the user
to compare the loudest steps.

## Setup (once per machine)

- **SoundCraft engine**: `soundcraft-cli --version` (on the PATH or in `~/.local/bin`). Nothing else.
  Missing: it is `mcp/soundcraft` in MediaMake; the use-soundcraft skill has the install steps.
- **REAPER engine**: REAPER open, with reapy's distant API on. If `reapy.connect()` fails:
  1. `uv tool install reaper-mcp-server` (the environment the scripts run in; it brings reapy,
     numpy, soundfile and pyloudnorm). Optionally register its MCP: `claude mcp add --scope user
     reaper -- reaper-mcp-server` (the scripts below are much faster than its tools).
  2. Install `python-reapy` into the Python REAPER loads: on macOS the python.org framework Python
     (`/Library/Frameworks/Python.framework/Versions/3.12/bin/python3.12 -m pip install python-reapy`).
  3. With REAPER **closed** (it rewrites reaper.ini on exit), back up reaper.ini, then run
     `python3.12 -c "import reapy.config as c; c.configure_reaper(detect_portable_install=False)"`
     with that Python: it enables Python in REAPER, adds the web interface on port 2307 and the
     reapy action. Start REAPER again.
- **ffmpeg** on the PATH (true peak and loudness range), and **uv**.

Run the scripts with `uv run`, which brings what they need; the REAPER engine alone needs the
tool's Python, which has reapy:

```bash
SK=.claude/skills/make-loudness-remaster/scripts
uv run $SK/measure.py …                                   # measuring, the review file, the SoundCraft engine
RPY="$(uv tool dir)/reaper-mcp-server/bin/python"         # the REAPER engine, and --engine=both: $RPY $SK/ladder.py …
```

## Steps

1. **Find the song's own mix.** In a Suno download the full mix sits next to the stems folder
   (`<name>.wav`, sometimes one folder up), with the same length as the stems (`ffprobe` both).
   Use the mix, never a sum of the stems: Suno separates stems after the fact, so they don't add
   back up to its mix. Ask for the song title when the file name isn't it ("Better Luck next life -
   funk + copper - gym final" was *I am the Demon*); a release folder's `info.json` has `songTitle`.
   Don't rename the user's source files unless asked.
2. **Measure the original** (`uv run $SK/measure.py "<mix>.wav"`) and tell the user in plain words
   what you see: how loud it is, how much headroom it leaves, whether it is bass-heavy, how much it
   builds. Say what LUFS means the first time ("the loudness scale YouTube and Spotify use; they
   turn everything down to about -14").
3. **Build the ladder** in the next free `remaster/v<N>/` folder (never overwrite a version):

   ```bash
   $RPY $SK/ladder.py "<mix>.wav" "<song folder>/remaster/v1" "<Title>"                         # REAPER
   uv run $SK/ladder.py "<mix>.wav" "<song folder>/remaster/v1" "<Title>" --engine=soundcraft   # SoundCraft
   $RPY $SK/ladder.py "<mix>.wav" "<song folder>/remaster/v1" "<Title>" --engine=both           # each step from both
   ```

   It makes the gain-only copy, then the limiter steps: the mix on one track and the engine's
   limiter as the only effect (REAPER in a **new tab**, SoundCraft with no window), each step tuned
   until it measures within 0.15 LU of its target with its true peak at -1.0 dBTP or lower (a few
   minutes a song for each engine). When a limiter stalls short of a target it retries with a
   faster release; a file is always named after what it measures. `--targets=-7` adds steps to an
   existing ladder later, and `--engine=soundcraft` on a REAPER ladder adds the other engine's steps
   beside it.
4. **Measure the ladder** (`uv run $SK/measure.py` on the original and every step) and give the user a
   short table of what each step costs: build-up (LRA), deep bass (sub), punch (PLR). The usual
   picture: -12 and -11 are the original, louder; -10 is nearly identical; -9 gives up a little sub
   and build-up; -8 costs more than all the steps before it together (the build-up roughly halves),
   and its faster limiter release can make bass pump or grit. Tell them to compare the song's
   loudest part at -9 and -8. With both engines in the ladder, give the two side by side for each
   step: they measure alike at the quiet steps and part ways at the loud ones, which is where the
   user should compare them, at matched level.
5. **The user picks by ear, in the Stem Player** (a file picker can't A/B: they
   couldn't compare a ladder in Finder, 2026-11-04). Make the ladder reviewable and give the link:

   ```bash
   uv run $SK/review.py "<song folder>/remaster/v1"
   ```

   It writes `remaster.json` beside the versions (title, path, LUFS, true peak, LRA per file, and
   as each version's note the engine and limiter settings that made it) and
   prints the review link, `https://mediamake.microfox.app/stem-player?job=<path under
   Downloads>` (always this base URL, never localhost, never an `open -R` line for the ladder).
   There every version plays from one shared playhead: the arrow keys (or a version's key) switch
   between them at the same moment, a range loops, levels can be matched, and the user marks the
   **final**, drops the rest and leaves notes (the screen is documented in
   `apps/mediamake/components/stem-player/README.md`).
   The first time, they open the song's folder (or Downloads) once in the screen; after that the
   link opens the ladder directly. Their pick lands in `<ladder>/v<N>.revisions/rev-NNN.md` (and
   `.json`, the `mediamake.image-revision/v1` format of revise-image: `final` = the file name without
   its extension, `drop`, `comments` with a version's ID and sometimes a time `pin.t`). Wait for a
   revision marked `ready` (or "rev-001 is ready"), read the `.md`, then copy the pick next to the
   song's mix and check it (the pick's own file name, with its engine when it has one; the final's
   name stays the same):

   ```bash
   cp -n "<ladder>/<Title> - original -9 LUFS.wav" "<song folder>/<Title> - final master (-9 LUFS).wav" && cmp "<ladder>/<Title> - original -9 LUFS.wav" "<song folder>/<Title> - final master (-9 LUFS).wav"
   ```

   From then on that file is the song's audio (lyric video, uploads, DistroKid). Note it in the
   song's memory or notes, answer each note in the revision JSON (`reply`, `status: "done"`) and
   set the revision's `status` to `resolved`, the way revise-image does.
6. **Into the library.** The song's mix, its stems and the final master belong to the song's folder
   in the media library (`apps/studio/scripts/library/README.md`), where every later
   production finds them:
   `mm media ingest "<mix>.wav" "<song folder>/<Title> - final master (-9 LUFS).wav" --channel=<brand id>`.
   This clones them into `music/<channel>/<song>/`; the originals stay where the user keeps them.
   The master the user approved is a deliverable too: `media deliver <slug> --what=master --from="<master>"`
   (a dry run, then `--yes`) when there's a production for the song.

## Things to know

- **Their taste so far:** Honored One, I am the Demon, Inexorable (2026-10-30/31) and WAKE UP
  (2026-11-03) all ended at **-9 LUFS**. They lean loud ("loud volume is better", "I need even more volume"), so the ladder
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
- **The meters** are the same for every file: loudness from pyloudnorm, true peak from ffmpeg's
  loudnorm, which reads the louder channel. ffmpeg's `ebur128` summary line reads the left channel
  only, and a master whose right side peaks higher passed -1.0 dBTP with it while it was over:
  never take a true peak from that line. A master measured before this was fixed is worth one
  `measure.py` pass before it is released.
- **SoundCraft's limiter**: the Maximizer's threshold is the gain into it (threshold -6 is 6 dB of
  drive), its ceiling a sample peak like ReaLimit's, and a longer release limits more gently and
  stops lower, so the ladder starts at 100 ms and goes faster only when a step stalls. Heavy
  limiting pushed true peaks 1 dB and more over the ceiling, so the ladder lowers the ceiling by
  what a render is over.
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

## Where it runs

| Step | Needs | A person's yes | Safe to repeat | Without it |
|---|---|---|---|---|
| 1. Find the song's own mix | `media:library` | no | yes | the mix from the session's own files, or the Cloud Library (`mm library use`) |
| 2. Measure the original | nothing | no | yes | - |
| 3a. Build the ladder with REAPER | `app:reaper` | no | yes | the SoundCraft engine (3b) |
| 3b. Build the ladder with SoundCraft | `mcp:soundcraft` | no | yes | a to-do for a place with REAPER or Soundcraft |
| 4. Measure the ladder | nothing | no | yes | - |
| 5. The user picks on the review screen | nothing | yes | yes | - |
| 6. Into the library | `media:library` | yes | yes | a to-do: file the master on the user's computer |

`mcp:soundcraft` is `soundcraft-cli`, with or without its MCP added. Every step needs ffmpeg and uv.
The review screen plays files on the user's computer: from a cloud session, deliver the ladder first
(`mm cloud deliver`). A ladder is never built over: a new one is the next `v<N>`.

## Log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add make-loudness-remaster "<what the user corrected or confirmed> → <the rule>"   # a new lesson, dated for you
mm notes make-loudness-remaster                                                             # your notes for this skill
```

When the user wants them shared, `mm notes promote make-loudness-remaster` offers them to this log as a pull request.

- 2026-10-30 (Honored One): v1 rebuilt the song from Suno's 12 stems (EQ per track, buses, glue
  comp, -12 LUFS). User: louder, it's "a grand workout song, loud volume is better", and "there is
  some noise in the original".
- 2026-10-30: v2 cut Suno's fizz with stem low-passes and pushed to -9/-8 with a clipper. User:
  "out of all the remasters, I liked the level-matched one best, it has the least amount of loss of
  quality, the rest have lost the original touch, maybe overmastering is incorrect, just raise the
  volume". → The method of this skill: the original mix, gain + one limiter, a ladder to pick from.
- 2026-10-31: picked -9 for Honored One. Demon + Inexorable "remaster both the same way"; asked
  for -8 too ("I need even more volume"), then picked -9 for both. Made into this skill.
- 2026-10-31 (Genki Dama, a cinematic OST already at -13 LUFS with 3.6 dB headroom): the gain-only
  copy alone reached -9.4, so -11/-10 were pointless; the ladder went -9, -8.5, -8, -7.5 instead
  (ReaLimit stopped at -7.7 on it). Fixed in ladder.py: REAPER read a temp name with a dot
  ("try-8.5-…") as "try-8" plus an extension, and round() named -8.5 after -8 → temp names use
  "8p5", half steps keep their ".5". When a song arrives louder than usual (gain alone gets past
  -10), offer half steps in the loud range.
- 2026-11-03 (WAKE UP, a Suno stems download): only the stems folder sat in the song's folder; the
  full mix was already in the media library (the sweep had filed the Suno download), found with
  `mdfind -name` / `media find`. The usual ladder (-14.8 LUFS in, gain alone -12.5, -8 halved the
  build-up), and the user picked **-9** again. The production's channel (getintozone) differed from
  the sweep's guess (animemusiczone, from the Suno workspace name): the master and stems were
  ingested to the production's channel and the mix moved there with `media mv`.
- 2026-11-24: "rewrite make-loudness-remaster to support both soundcraft & reaper & then i will test
  the outputs of both and judge accordingly" → a second engine, `--engine=reaper|soundcraft|both`: the
  same method (gain, one limiter) with ReaLimit or SoundCraft's Maximizer, the same meters for both,
  each file's engine and settings in `ladder.json` and as its note on the review screen. On the first
  side-by-side ladder the two measured alike at -11 and -10; at -9 and -8 the Maximizer gave up more
  build-up than ReaLimit for the same loudness. Which engine is the default waits for the user's ears:
  REAPER stays it until they say. Found while making the comparison fair: the true peak came from
  ffmpeg's `ebur128` summary, which reads the left channel only → every true peak now takes the
  louder channel.
