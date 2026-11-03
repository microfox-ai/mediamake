---
name: revise-video
description: Review and revise a rendered video with the user through mediamake's Video Revision screen (/video-revision) — renders for review at half size (the full-size master once, after sign-off), runs machine checks (preflight) before giving the review link, waits in the background for a revision marked ready, reads the revision files (general comments on the whole video, point comments with stills, range comments across shots, machine notes) under out/<slug>/<slug>.revisions/ (or out/<slug>/live.revisions/ when the user reviewed the project live, before any render: /video-revision?live=<slug>), fixes each comment in the project, replies and resolves, and logs the lessons. Also holds the shared intake rule for look previews (3–4 looks as 8 s clips in one grid, or the whole video; the whole video by default under a minute). Shared by every video-making skill (make-lyrics-video, make-video-music-remix, make-waveform-lyric-video, their variants and shorts, and any make-* video skill to come). Use after a render the user will watch, or when the user says "rev-002 is ready", "check my revision / comments", "act on the revisions", "/revise-video <slug>", or asks to fix notes left in the Revisions screen. Not for image sets (thumbnails, posters: create-thumbnail's /file-revision). Append new user feedback to the log at the bottom.
metadata:
  category: revise
---

# revise-video

The review loop for every rendered video in `apps/lyrics_videos`. The making skill builds and
renders; this skill renders for review, checks the render before the user sees it, takes the user's
notes back from the **Video Revision** screen, fixes them in the project, and closes the loop.
The making skill's own rules (its principles, its `prefs.md`, its render command) still apply to
every fix.

The loop, in order: render for review at half size (1) → preflight (2) → the link (3) → wait for a
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
  `npm run map -w lyrics_videos -- <slug> --video=out/<slug>/v5/<slug>.mp4`.
- **Kept versions:** before a full render replaces the main file, the previous video, its map and
  its `.revisions/` folder are copied into `out/<slug>/v<N>/` (`render-project` does it; a `--frames`
  clip goes to `out/<slug>/clips/`). Never write into `out/<slug>/` by hand.
- **Stable shot IDs** across renders, so notes from one revision stay comparable with the next.
- A project **`prefs.md`** for style lessons, and a lessons/feedback log in the making skill for
  general ones.
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
(`getInputProps().look`), render each one at half size, then put them in one labelled grid:

```bash
npm run render-project -w lyrics_videos -- <slug> --look=A --frames=<a>-<b> --proxy   # → out/<slug>/looks/A.mp4
npm run look-grid -w lyrics_videos -- out/<slug>/looks/A.mp4 out/<slug>/looks/B.mp4 out/<slug>/looks/C.mp4 out/<slug>/looks/D.mp4
```

`look-grid` labels each tile with its look ID (two side by side, three or four in a 2×2), keeps the
first clip's sound and shot map, and prints the grid's review link. The user names a pick, or a mix
("B with the rings from D"), by the label on screen. A skill with its own preview command
(`wave-lab <slug> looks --clip=6`) makes the same grid. Then build the whole video on the pick.

## 1. Render for review at half size

A render the user will review is a **review render**. `--proxy` renders at half size (960×540 for a
1080p video; `--proxy=0.75` when fine detail matters) into the same file, so the review link and the
map stay the same; each round paints a quarter of the pixels and takes roughly a third of the time:

```bash
npm run render-project -w lyrics_videos -- <slug> --proxy     # review render
npm run render-project -w lyrics_videos -- <slug>             # the master, once the user signs off
```

Every review round uses review renders. Render the **master** once, when the user signs off ("final",
"render it", "looks good"), and say which of the two you are rendering. Thumbnails, the upload pack,
rotate shorts and anything that gets uploaded come only from the master (`shorts make --mode=rotate`
refuses a review render). When the user asks for full size during review, render full size. Shorts
render at full size (`lyric-shorts render` has no proxy; they are short).

### Or review it live, before rendering

The screen can also play a lyric project straight from its code, the way /remotion-editor does, so
the user can leave notes on a video that was never rendered:

```
https://mediamake.microfox.app/video-revision?live=<slug>
```

(`http://localhost:3002/video-revision?live=<slug>` while mediamake runs locally.) The first time,
the user picks the `apps/lyrics_videos` folder (or the repo) and allows editing; after that the link
reopens it, and the left panel lists every project under **Live projects**. Everything else works as
for a render: shots from `video/shots.json` (or one per lyric line, the IDs a render gets), point,
range and General comments, drawing, spots and the magnifier.

- **When:** offer it for the first look at a new build, or when a round's fixes are small, to skip a
  review render. Render (step 1) when the user wants to judge the finished file: smoothness of a heavy
  3D scene (live playback can drop frames a render never would), the encode, the sound mix, or
  anything spliced or made with ffmpeg after the render (look grids, minor-revision splices), which
  live review does not show.
- **Notes** go in `out/<slug>/live.revisions/` (the revision JSON carries `"live": {"project": "<slug>"}`).
  The watcher (step 4) watches that folder too.
- **Stills** are rendered in the browser a few seconds after a comment is added, and can miss some
  effects (radial gradients, some filters and blend modes). Every comment in the `.md` has a
  `Render:` line, `npm run stills -w lyrics_videos -- <slug> <seconds> --only --scale=1` (times are
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
npm run preflight -w lyrics_videos -- <slug>     # --video=<mp4> for a short, a clip or a grid; --source=<their picture>
```

It checks black and frozen frames, a missing or short sound track, dropouts, clipping and a quiet
master, and with `--source` a picture darker or duller than the user's (pass it whenever the video
shows the user's picture or footage). What it finds becomes machine notes (`Preflight · black: …`) at
the top of the video's next revision, where the user will see them beside their own notes.

- Fix each finding, re-render, and run preflight again: it closes what is gone and pins the
  revision to the new render.
- A finding that is meant (a black beat, an impact freeze): answer it with
  `npm run preflight -w lyrics_videos -- <slug> --intended=c02 --why="a black beat before the drop"`.
  The note closes with that reply and later runs on this video skip it.
- Give the link only when no machine note is open, and say in one line what preflight caught.
- Fades from or to black of up to 1 s at either end and a still end card of up to 2 s are printed
  but not noted. Loudness per section is printed for reference: songs change level on purpose.

## 3. Give the user the review link

```
https://mediamake.microfox.app/video-revision?folder=<slug>&video=<slug>.mp4
```

Preflight prints it. It opens on the deployed app; while mediamake runs locally,
`http://localhost:3002/video-revision?folder=<slug>&video=<slug>.mp4` (the port in
`.claude/launch.json`). The old `/remotion-revision` and `/revisions` paths still redirect. For a kept cut, point `folder`
at it (`<slug>/v5`). Say whether it is a half-size review render.

The screen loads the video and its map, shows the shots on a timeline (⌘←/→ jumps shot to shot) and
saves comments **next to the video**. On a paused frame the user can draw (pencil, brush, arrow, box,
circle; red fix, green add, yellow move) and pin the exact spot, with a magnifier for small detail;
the comment keeps the marks and a 2× crop of the spot. A **General** comment (G) is about the
whole video and has no time. Browsers can't open a local folder from a
link: the first time, the user picks `out/<slug>/` and allows editing; after that the link (or
History) reopens it in one click. Better: they add `apps/lyrics_videos/out` once as a **source**
(Sources → +); every project folder in it (and its `v<N>/` folders) is then listed on each visit
and new renders appear on their own. You can open the link in the user's Chrome for them, but they make the folder pick.

## 4. Wait for the revision in the background

Right after giving the link, start the watcher as a background command (Bash
`run_in_background: true`, with the longest timeout your shell allows, up to 2 hours):

```bash
npm run wait-revision -w lyrics_videos -- <slug>     # --video=<mp4> to watch one video only
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
  fix the way it checks (stills, frame sheets, exact seeks), then re-render as a review render
  (step 1) and run preflight (step 2).
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

## 7. Log what you learned

Every comment teaches something. Style-specific lessons (this look, this footage, this song) go in
the project's `prefs.md`, dated and numbered as the user wrote them; general ones (true for any
project) go in the making skill's lessons/feedback log; lessons about the review loop itself go in
the log below.

**How the loop is going:** `npm run loop-stats -w lyrics_videos -- [slug …] [--since=<date>]` prints,
per video, the rounds, the user's notes per round (point / range / general, how many done; live
reviews show as `<slug>/live (no render)`), machine notes and
kept versions, and per production the logged renders (master / review / clip or look) and their
minutes. Run it when the user asks how reviewing is going, or before and after a change to the loop.

## Feedback log

Append dated entries: what the user said → the rule.

- 2026-10-25 · split out of make-lyrics-video step 10 and make-video-music-remix step 10 ("both make videos, and both use the revision page to revise: separate the revising with the revision window into a separate skill, used by all similar video-make skills in future") → this skill; the making skills point here after their render step.
- 2026-10-26 · quicksilverxkingpin ("are you only rendering changed chunks and replacing them in the video? … write that down in the revision skill: if it's just minor changes, save time by doing that") → step 3's "Minor revisions": render only the changed frame ranges and splice them into the previous cut; full renders only when the changes are global or spread across the video.
- 2026-10-27 · a revision on a preview clip arrived together with "build the full video now" → when comments are fixed in a bigger render than the one reviewed (a clip → the whole video), say in each reply where the fix is in the new render (its time there), resolve the revision, and give the new render's link.
- 2026-11-02 · the video-revision plan, Phase 0 ("8-second clip gen first is optional, depends on skill (so ask the user whether to create previews or gen whole, by default gen whole for generating videos under 1 minute)"; "the rest is fine") → Previews or the whole video, asked at intake by every making skill (the whole video by default under a minute; previews as one labelled grid, `--look` + `look-grid`); review renders at half size with the master once after sign-off (step 1); preflight before the link (step 2); the background watcher instead of a pasted message (step 4); `loop-stats` to measure the loop (step 7).
- 2026-11-02 · the video-revision plan, Phase 1 (live review; the user chose to start it) → "Or review it live, before rendering": `/video-revision?live=<slug>` plays the project from its code, notes go in `out/<slug>/live.revisions/`, stills render in the browser (or a stills line in the `.md`); renders stay for judging the finished file.
