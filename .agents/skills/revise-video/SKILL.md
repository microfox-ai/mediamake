---
name: revise-video
description: Review and revise a rendered video with the user through mediamake's Video Revision screen (/video-revision) — renders 10-second previews for review, around what changed (the full-size master once, after sign-off), runs machine checks (preflight) before giving the review link, waits in the background for a revision marked ready, reads the revision files (general comments on the whole video, point comments with stills, range comments across shots, machine notes) under out/<slug>/<slug>.revisions/ (or out/<slug>/live.revisions/ when the user reviewed the project live, before any render: /video-revision?live=<slug>), fixes each comment in the project, replies and resolves, and logs the lessons. Also holds the shared intake rule for look previews (3–4 looks as 8 s clips in one grid, or the whole video; the whole video by default under a minute). Shared by every video-making skill (make-lyrics-video, make-video-music-remix, make-waveform-lyric-video, their variants and shorts, and any make-* video skill to come). Use after a render the user will watch, or when the user says "rev-002 is ready", "check my revision / comments", "act on the revisions", "/revise-video <slug>", or asks to fix notes left in the Revisions screen. Not for image sets (thumbnails, posters: create-thumbnail's /file-revision). New user feedback goes in your notes (mm notes add), never in this file.
metadata:
  category: revise
---

# revise-video

The review loop for every rendered video in `apps/studio`. The making skill builds and
renders; this skill renders for review, checks the render before the user sees it, takes the user's
notes back from the **Video Revision** screen, fixes them in the project, and closes the loop.
The making skill's own rules (its principles, its `prefs.md`, its render command) still apply to
every fix.

The loop, in order: render a 10 s preview for review (1) → preflight (2) → the link (3) → wait for a
ready revision in the background (4) → read it (5) → act on it (6) → log what you learned (7). The
full-size master renders once, after the user signs off.

## What a video-making skill must provide

Any skill that hands its renders to this one (today `make-lyrics-video`, `make-video-music-remix`,
`make-waveform-lyric-video`, their variants and shorts; a new `make-*` video skill adds itself to the
list in its own file):

- The render at **`out/<slug>/<slug>.mp4`** and, beside it, **`out/<slug>/<slug>.map.json`**: fps,
  size, sections and every shot with a stable ID and its time range in the video's own time.
  `render-project` writes both (from `video/shots.json` or the cut list). A video made some other
  way (renamed, moved, ffmpeg concat, a splice) gets its map from
  `mm map <slug> --video=out/<slug>/v5/<slug>.mp4`.
- **Kept versions:** before a full render replaces the main file, the previous video, its map and
  its `.revisions/` folder are copied into `out/<slug>/v<N>/` (`render-project` does it; a `--frames`
  clip goes to `out/<slug>/clips/`). Never write into `out/<slug>/` by hand.
- **Stable shot IDs** across renders, so notes from one revision stay comparable with the next.
- A project **`prefs.md`** for style lessons, and your notes for the making skill
  (`mm notes add <skill> "…"`) for general ones.
- At intake, the **previews or whole video** question below.

## Previews or the whole video (asked at intake)

Look previews settle the direction before the full build: 3–4 complete looks (whole treatments, never
menus of parts) of the same stretch, usually the first hook, as 8-second clips shown side by side in
one grid video. A rejected direction then costs four short clips instead of a full build and render.
Whether to make them is the user's call, so every making skill asks in its intake round:

- **Under a minute** (a short, a hook-length video): build the whole video and don't ask. Make
  previews only when the user asks for them.
- **A minute or longer:** ask "Pitch 3–4 looks first as 8 s clips, or build the whole video?". Put
  previews first when the direction is open (no reference, a style new to this user) and the whole
  video first when it is settled (a reference to match, a variant skill's fixed style, a project like
  an earlier one). The making skill may say which it recommends.

To make them, build each look on the same stretch with the project reading the look from its props
(`getInputProps().look`), then render them all at half size in one command, which bundles once and
puts them in one labelled grid:

```bash
mm render <slug> --look=A,B,C,D --preview=hook-1 --seconds=8   # or --frames=<a>-<b> --proxy; → out/<slug>/looks/grid-A-B-C-D.mp4
```

The grid labels each tile with its look ID (two side by side, three or four in a 2×2), keeps the
first clip's sound and shot map, and its review link is printed (`mm look-grid <clip> …` makes one
from clips rendered apart). The user names a pick, or a mix ("B with the rings from D"), by the
label on screen. A skill with its own preview command
(`wave-lab <slug> looks --clip=6`) makes the same grid. Then build the whole video on the pick.

## 1. Render for review: 10-second previews

A render the user will review is a **preview**: 10-second stretches at half size, never the whole
video (the user's rule, 2026-11-09: a whole render costs too much). `--preview` renders the 10 s
around what changed and joins the stretches into one review file with a shot map, so the user's
comments land on the right shots:

```bash
mm render <slug> --preview                  # around every point and range comment of the latest revision
mm render <slug> --preview=h1.3,chorus-2,1:24,40-52   # around shots, sections (first 10 s), seconds; a-b as named
mm render <slug>                            # the master, once the user signs off
```

- **What it renders:** with nothing named, the 10 s around each comment of the latest revision (the
  main video's, the last preview's or a live review's), which is where the fixes just went; with no
  revision yet, the first hook or chorus. Name the stretches yourself when the fixes went somewhere
  else (a change to every chorus: name one chorus). Stretches less than a second apart are merged;
  `--seconds=<n>` for another length. A video of 15 s or less is its own preview, whole.
- **Where:** `out/<slug>/preview/<slug>.mp4`, the previous preview kept in `preview/v<N>/`. The command
  prints the review link and the preflight line. Its map lists each stretch (`stretches`: where it
  sits in the preview and in the song) with a marker at each join, and every shot keeps its ID, so a
  comment's shot is the shot to fix. A comment's time is preview time: the map's `stretches` turn it
  into song time, and the next `--preview` does that by itself.
- **The whole video at half size** (`mm render <slug> --proxy`, into the master's file) only when the
  user asks to watch the whole thing during review.

Render the **master** once, when the user signs off ("final", "render it", "looks good"), and say
which of the two you are rendering. Thumbnails, the upload pack, rotate shorts and anything that gets
uploaded come only from the master (`shorts make --mode=rotate` refuses a review render). When the
user asks for full size during review, add `--scale=1`. Shorts render at full size (`lyric-shorts
render` has no proxy; they are short).

Renders are quicker than they used to be, so don't skip one to save time: the project's bundle is
kept and reused until its code changes, and renders on this machine take turns (a second session's
render waits for the first: "Waiting for the render slot"; `mm render-queue` shows them).

### Or review it live, before rendering

The screen can also play a lyric project straight from its code, the way /remotion-editor does, so
the user can leave notes on a video that was never rendered:

```
https://mediamake.microfox.app/video-revision?live=<slug>
```

The first time, the user picks the `apps/studio` folder (or the repo) and allows editing;
after that the link reopens it, and the left panel lists every project under **Live projects**.
Everything else works as for a render: shots from `video/shots.json` (or one per lyric line, the IDs
a render gets), point, range and General comments, drawing, spots and the magnifier.

- **When:** offer it for the first look at a new build, or when a round's fixes are small, to skip a
  review render. Render (step 1) when the user wants to judge the finished file: smoothness of a heavy
  3D scene (live playback can drop frames a render never would), the encode, the sound mix, or
  anything spliced or made with ffmpeg after the render (look grids, minor-revision splices), which
  live review does not show.
- **Notes** go in `out/<slug>/live.revisions/` (the revision JSON carries `"live": {"project": "<slug>"}`).
  The watcher (step 4) watches that folder too.
- **Stills** are rendered in the browser a few seconds after a comment is added, and can miss some
  effects (radial gradients, some filters and blend modes). Every comment in the `.md` has a
  `Render:` line, `mm stills <slug> <seconds> --only --scale=1` (times are
  the video's own, output in `out/<slug>/stills/`): run it when the look matters, when a still
  looks off, and for range comments, which have no still.
- **Fixes** go in the project as usual; the open page recompiles when the code or `video/edits.json`
  changes and its window regains focus, so there is nothing to re-render between rounds. Say what
  changed and restart the watcher.
- **The user may fix small notes themselves:** "Tweak it yourself" in the header opens the project
  in /remotion-editor, where they move and retype things, turn a scene's knobs and swap pictures,
  clips and sounds (saved in `video/edits.json`: `props` and `assets`; new files in
  `projects/<slug>/input/swaps/`). Read `edits.json` before fixing a note: one they already fixed
  there needs no code, just say so. Bake edits into the code only when asked (make-lyrics-video,
  step 11); a swap is baked by ingesting the file into the media library (`media ingest`) first.
- **Timing notes:** live review's timeline shows the bars, beats and sung words (retimed words
  outlined), and a range selection gives its length in beats, so "half a beat earlier" is exact.
  Word timing is fixed on the editor's word lane (`words` and `lyricsOffset` in `edits.json`): fix
  a late or early word there, or tell the user it's a drag away, rather than editing the alignment.
- **Preflight** checks a render, so it runs on the first real render, before that link.

## 2. Preflight before the link

Machines check, the user judges: the user should never be the one who finds a black frame. After
every render the user will watch:

```bash
mm preflight <slug> --video=out/<slug>/preview/<slug>.mp4   # a preview (mm render prints this line)
mm preflight <slug>     # the master; --video=<mp4> for a short, a clip or a grid; --source=<their picture>
```

It checks black and frozen frames, a missing or short sound track, dropouts, clipping and a quiet
master, and with `--source` a picture darker or duller than the user's (pass it whenever the video
shows the user's picture or footage). What it finds becomes machine notes (`Preflight · black: …`) at
the top of the video's next revision, where the user will see them beside their own notes.

- Fix each finding, re-render, and run preflight again: it closes what is gone and pins the
  revision to the new render.
- A finding that is meant (a black beat, an impact freeze): answer it with
  `mm preflight <slug> --intended=c02 --why="a black beat before the drop"`.
  The note closes with that reply and later runs on this video skip it.
- Give the link only when no machine note is open, and say in one line what preflight caught.
- Fades from or to black of up to 1 s at either end and a still end card of up to 2 s are printed
  but not noted. Loudness per section is printed for reference: songs change level on purpose.

## 3. Give the user the review link

```
https://mediamake.microfox.app/video-revision?folder=<slug>/preview&video=<slug>.mp4   # a preview
https://mediamake.microfox.app/video-revision?folder=<slug>&video=<slug>.mp4           # the master
```

`mm render --preview` and preflight print it. It opens on the deployed app, no local server needed. **Always this base URL,
`https://mediamake.microfox.app`, never a `localhost` link** (2026-11-02: "why are you creating
wrong remotion urls, always use the base url - mediamake.microfox.app"), even while a local dev
server is running for your own checks. The old `/remotion-revision` and `/revisions` paths still
redirect. For a kept cut, point `folder` at it (`<slug>/v5`, `<slug>/preview/v3`). Say what the preview
holds (which stretches, around which notes) and that it is half size.

The screen loads the video and its map, shows the shots on a timeline (⌘←/→ jumps shot to shot) and
saves comments **next to the video**. On a paused frame the user can draw (pencil, brush, arrow, box,
circle; red fix, green add, yellow move) and pin the exact spot, with a magnifier for small detail;
the comment keeps the marks and a 2× crop of the spot. A **General** comment (G) is about the
whole video and has no time. Browsers can't open a local folder from a
link, so the user links `apps/studio/out` once as a **source** (the link's page offers "Link
your out folder"; or Sources → +). Every link's `folder` is its path under `out/`
(`<slug>`, `<slug>/v5`, `<channel>/shorts/s01`), so from then on every link opens straight from
that source, with one "Reconnect out" click per visit, or none once they choose Chrome's "Allow on
every visit"; every project folder in it is also listed on each visit and new renders appear on
their own. Without a source they pick the video's folder ("Open just <folder>"). You can open the
link in the user's Chrome for them, but they make the first pick.

## 4. Wait for the revision in the background

Right after giving the link, start the watcher as a background command (Bash
`run_in_background: true`, with the longest timeout your shell allows, up to 2 hours):

```bash
mm wait-revision <slug>     # --video=<mp4> to watch one video only
```

It watches every `.revisions/` folder under `out/<slug>/`, `live.revisions/` included (not the kept `v<N>/` copies), and exits
when the user sets a revision to **Ready for Claude**, printing the revision with its open notes.
Then read it (step 5) and act on it (step 6) without waiting for a message: the user doesn't need
to paste anything. If it
stops without one (exit 3, after 110 minutes), start it once more; after that, wait for the user's
message. It only helps while this session is open; otherwise the user pastes the message the screen
copies for them. Never poll in the foreground.

## 5. Read the revision

```
out/<slug>/<slug>.revisions/
  rev-001.json      source of truth: title, status (draft | ready | resolved), comments
  rev-001.md        the same as Markdown, regenerated on every save (read this first)
  rev-001/          one JPEG per point comment: c01_h1.3_f000372.jpg (comment, shot, frame),
                    plus c01_h1.3_f000372_zoom.jpg when the comment pins a spot
  preflight.json    effects marked intended (preflight --intended), skipped by later runs
out/<slug>/live.revisions/      the same, for notes left on the project reviewed live
```

- **General comments** (`kind: "general"`) have no time: they are about the whole video (pacing,
  mood, "no text over music-only stretches"). The `.md` lists them first; read them first and
  apply each one everywhere it fits, not at one spot. When one is a standing preference, add it to
  the making skill's `prefs.md` or its log too, so the next video starts with it.
- **Point comments** carry `time`, `frame`, the `shot` they were made on and a `snapshot` still
  (path relative to `<slug>.revisions/`). Open the still with the Read tool before acting.
- **Marks and spots.** A point comment can carry `drawing` (marks the user drew on that frame) and
  a `spot` with a `zoom` crop. The still has them drawn in, so reading it shows what was circled or
  crossed out; the `.md` also says each mark in words. The colour is the ask: red fix or remove,
  green add here, yellow move (an arrow runs from the thing to where it goes). `pen` and `brush`
  are freehand (the brush is a wide see-through stroke over an area), `arrow` is tail then head,
  `box` and `circle` are two opposite corners of an area. Points are fractions of the frame (x
  across, y down), so they hold at review and full size: multiply by the project's width and height
  to find the element in the scene. The `zoom` JPEG is the frame around the spot at 2× with only a
  ring on it: open it for detail a half-size render hides. The text says what to do; the marks say
  where.
- **Range comments** carry `from`/`to` (seconds and frames) and every shot they touch, but no
  stills. Extract what you need with the ffmpeg line the `.md` gives (run from `out/<slug>/`), or
  exact seeks (`ffmpeg -ss <t> -i <video> -frames:v 1`); a frame sheet
  (`select='between(n\,a\,b)'`, `tile=8x6`) for motion.
- **Machine notes** start with `Preflight ·` and carry `source: "preflight"` and the `check` that
  found them. They are yours to close before the user looks (step 2); one still open in a ready
  revision is a defect the user saw too. One the user ticked off (`done` with no `reply`) is their
  call: record it with `--intended=rev-002/c02 --why="the user closed it"` so later runs skip it.
- Look up each shot ID in the project (the cut list, `video/shots.json`, the scene's cues) before
  changing anything: the ID is the bridge from the note to the code.

## 6. Act on it

- Act on revisions whose status is `ready` (the watcher, or the user saying "rev-002 is ready"),
  and on any comment without a `reply`: users add new comments to an older revision file too.
- Fix each comment the way the making skill works (its principles and its `prefs.md`), check the
  fix the way it checks (stills, frame sheets, exact seeks), then render a preview of the fixes
  (`mm render <slug> --preview`, step 1) and run preflight on it (step 2).
- In the JSON set each comment's `status` to `"done"` and add a short `reply` (what changed, or why
  not); set the revision's `status` to `"resolved"` when all are done (don't forget this last
  step: the watcher reports a ready revision at once). Edit only those fields: the open page picks
  the change up when it regains focus and rewrites the `.md` on its next save. Don't rename, delete
  or reformat revision files.
- Copy the updated JSON into the kept `v<N>/` copy of that revision, so the archived cut carries its
  answered notes too. Copy, don't move.
- A revision records the render's size and modified time. After you re-render, the screen warns
  that older revisions point at the previous cut, and the user starts a new revision for the new
  render (or preflight opens one with its machine notes). Give them the link again and restart the
  watcher.

### Minor revisions: re-render only what changed

A full render of a song-length video takes half an hour or more. When the fixes are minor, render
only the frames they change and splice them into the previous cut.

- **When it applies:** the changes sit in a few places (some cuts, some words) and nothing global
  changed — no shared engine code, theme (fonts, colours), matte or footage-table change, no global
  graphics (meter, pump, reverb, title), no sound change you can't render separately, and no block
  that changed length (so no other cut moved). Anything else: render the whole video (in chunks if
  the full render runs out of memory).
- **Find the ranges:** diff the previous and the new cut list (`video/shots.json` or the map) and the
  resolved word cues; take every time span where a cut or a word differs, widen it by the
  transitions on either side (a cut's entry and the previous cut's exit, up to ~12 frames) and by any
  word that runs over its edge, then snap outward to the previous render's keyframes
  (`ffprobe -select_streams v -skip_frame nokey -show_entries frame=pts_time -of csv=p=0 prev.mp4`).
- **Render the ranges** muted, with the same settings as the full render (the same `--scale` for a
  review render), so the pieces join without re-encoding:
  `npx remotion render <bundle> <composition> partN.mp4 --frames=a-b --muted --crf=18`.
- **Take the unchanged parts** from the previous render at those keyframes
  (`ffmpeg -ss <t0> -to <t1> -i prev.mp4 -map 0:v -c copy keepN.mp4`), join old and new pieces in
  order with the concat demuxer (`-f concat -safe 0 -i list.txt -c copy`), and mux the audio: the
  previous render's if no sound changed, otherwise the audio rendered once (`audio.aac --codec=aac`).
  The concat demuxer cuts an `outpoint` by *decode* time, which with B-frames runs behind display
  time (Remotion's x264: 2 frames), so an outpoint at the keyframe lets the next two frames through
  and everything after drifts. Set each kept piece's `outpoint` to the keyframe minus that delay
  (check `ffprobe -show_entries packet=pts_time,dts_time` at the keyframe) and give every piece an
  explicit `duration` (its true frame count / fps) so the next piece starts at the right time.
  If the stream-copy join still glitches, re-encode the join once with ffmpeg (x264, same crf):
  still minutes, not half an hour.
- **Check** the decoded frame count against the composition's (`ffprobe -count_frames …
  nb_read_frames`), that frame timestamps run 0…N−1 without a step back, that the frames either side of
  every splice match their sources (PSNR `inf`), the changed spots, and the audio level against the
  previous cut. Then keep the previous version, rebuild the map, run preflight (a bad splice shows
  as a black or frozen frame) and answer the revision as usual.

### Sound-only revisions: audio files, built with ffmpeg

When the user is reviewing only the sound (levels, which track, fades, how loud the effects sit),
don't render video at all, and don't use Remotion for anything a simple ffmpeg call can do: a
Remotion render loads Chrome and the whole bundle and eats RAM that the other sessions' renders need.

- **Mix the review audio with ffmpeg** from the same layers the scene places (each file, its start
  time, trim, volume, fades and playback rate: `atrim`, `asetrate`, `volume='…':eval=frame`,
  `adelay`, `amix=normalize=0`), so the mix is sample-exact. Keep one source of truth: write the layer
  list once as data that both the scene and the mixing tool read, or check the ffmpeg mix against the
  last Remotion render's audio (same loudness within ~0.5 LU, hits on the same times) before trusting it.
- **Send only the audio** (an MP3 or WAV per scene, named for the scene), with its loudness, not the
  MP4s: the user is listening, not watching.
- **Measure with ffmpeg too:** `ebur128` for loudness, momentary loudness around each effect against
  the music bed, cross-correlation for sync.
- **Once the sound is approved,** put it in the scene's source (so later renders and exports match)
  and, if the picture hasn't changed, mux the approved audio onto the existing render
  (`ffmpeg -i prev.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac`) instead of rendering again.
  Render with Remotion only when the picture changed too.

## 7. Log what you learned

Every comment teaches something. Style-specific lessons (this look, this footage, this song) go in
the project's `prefs.md`, dated and numbered as the user wrote them; general ones (true for any
project) go in your notes for the making skill (`mm notes add <making skill> "…"`); lessons about
the review loop itself in your notes for this one (`mm notes add revise-video "…"`). Never edit a
SKILL.md to log a lesson: the skills' logs change only in pull requests (`mm notes promote`).

**How the loop is going:** `mm loop-stats [slug …] [--since=<date>]` prints,
per video, the rounds, the user's notes per round (point / range / general, how many done; live
reviews show as `<slug>/live (no render)`), machine notes and
kept versions, and per production the logged renders (master / review / clip or look) and their
minutes. Run it when the user asks how reviewing is going, or before and after a change to the loop.

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add revise-video "<what the user said> → <the rule>"   # a new lesson, dated for you
mm notes revise-video                                           # your notes for this skill
```

When the user wants them shared, `mm notes promote revise-video` offers them to this log as a pull request.

- 2026-10-25 · split out of make-lyrics-video step 10 and make-video-music-remix step 10 ("both make videos, and both use the revision page to revise: separate the revising with the revision window into a separate skill, used by all similar video-make skills in future") → this skill; the making skills point here after their render step.
- 2026-10-26 · quicksilverxkingpin ("are you only rendering changed chunks and replacing them in the video? … write that down in the revision skill: if it's just minor changes, save time by doing that") → step 3's "Minor revisions": render only the changed frame ranges and splice them into the previous cut; full renders only when the changes are global or spread across the video.
- 2026-10-27 · a revision on a preview clip arrived together with "build the full video now" → when comments are fixed in a bigger render than the one reviewed (a clip → the whole video), say in each reply where the fix is in the new render (its time there), resolve the revision, and give the new render's link.
- 2026-11-02 · the video-revision plan, Phase 0 ("8-second clip gen first is optional, depends on skill (so ask the user whether to create previews or gen whole, by default gen whole for generating videos under 1 minute)"; "the rest is fine") → Previews or the whole video, asked at intake by every making skill (the whole video by default under a minute; previews as one labelled grid, `--look` + `look-grid`); review renders at half size with the master once after sign-off (step 1); preflight before the link (step 2); the background watcher instead of a pasted message (step 4); `loop-stats` to measure the loop (step 7).
- 2026-11-02 · the video-revision plan, Phase 1 (live review; the user chose to start it) → "Or review it live, before rendering": `/video-revision?live=<slug>` plays the project from its code, notes go in `out/<slug>/live.revisions/`, stills render in the browser (or a stills line in the `.md`); renders stay for judging the finished file.
- 2026-11-02 · Cook with Claude end screens, three sound rounds each re-rendered as full MP4s ("show me sounds only since i am reviewing only sounds. mark that point in a generalistic mediamake remotion skill" + "those that can be reviewed with simple ffmpeg calls must not be done with remotion, wastes up ram usage") → step 6's "Sound-only revisions": mix the review audio with ffmpeg from the scene's layers, send audio files only, measure with ffmpeg, and after approval mux the audio onto the existing render rather than re-rendering.

