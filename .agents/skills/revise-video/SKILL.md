---
name: revise-video
description: Review and revise a rendered video with the user through mediamake's Remotion Revisions screen (/remotion-revision) — give them the review link for a render, read their revision files (point comments with stills, range comments across shots) under out/<slug>/<slug>.revisions/, fix each comment in the project, reply and resolve, and log the lessons. Shared by every video-making skill (make-lyrics-video, make-video-music-remix, their variants, and any make-* video skill to come). Use after a render the user will watch, or when the user says "rev-002 is ready", "check my revision / comments", "act on the revisions", "/revise-video <slug>", or asks to fix notes left in the Revisions screen. Not for image sets (thumbnails, posters: create-thumbnail's /image-revision). Append new user feedback to the log at the bottom.
metadata:
  category: revise
---

# revise-video

The review loop for every rendered video in `apps/lyrics_videos`. The making skill builds and
renders; this skill takes the user's notes back from the **Remotion Revisions** screen, fixes them
in the project, and closes the loop. The making skill's own rules (its principles, its
`prefs.md`, its render command) still apply to every fix.

## What a video-making skill must provide

Any skill that hands its renders to this one (today `make-lyrics-video` and
`make-video-music-remix`; a new `make-*` video skill adds itself to the list in its own file):

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

## 1. Give the user the review link (after every render they will watch)

```
https://mediamake.microfox.app/remotion-revision?folder=<slug>&video=<slug>.mp4
```

It opens on the deployed app; while mediamake runs locally,
`http://localhost:3002/remotion-revision?folder=<slug>&video=<slug>.mp4` (the port in
`.claude/launch.json`). The old `/revisions` path still redirects. For a kept cut, point `folder`
at it (`<slug>/v5`).

The screen loads the video and its map, shows the shots on a timeline (⌘←/→ jumps shot to shot) and
saves comments **next to the video**. Browsers can't open a local folder from a link: the first
time, the user picks `out/<slug>/` and allows editing; after that the link (or History) reopens it
in one click. Better: they add `apps/lyrics_videos/out` once as a **source** (Sources → +); every
project folder in it (and its `v<N>/` folders) is then listed on each visit and new renders appear
on their own. You can open the link in the user's Chrome for them, but they make the folder pick.

## 2. Read the revision

```
out/<slug>/<slug>.revisions/
  rev-001.json      source of truth: title, status (draft | ready | resolved), comments
  rev-001.md        the same as Markdown, regenerated on every save (read this first)
  rev-001/          one JPEG per point comment: c01_h1.3_f000372.jpg (comment, shot, frame)
```

- **Point comments** carry `time`, `frame`, the `shot` they were made on and a `snapshot` still
  (path relative to `<slug>.revisions/`). Open the still with the Read tool before acting.
- **Range comments** carry `from`/`to` (seconds and frames) and every shot they touch, but no
  stills. Extract what you need with the ffmpeg line the `.md` gives (run from `out/<slug>/`), or
  exact seeks (`ffmpeg -ss <t> -i <video> -frames:v 1`); a frame sheet
  (`select='between(n\,a\,b)'`, `tile=8x6`) for motion.
- Look up each shot ID in the project (the cut list, `video/shots.json`, the scene's cues) before
  changing anything: the ID is the bridge from the note to the code.

## 3. Act on it

- Act on revisions whose status is `ready` (the user may also just say "rev-002 is ready"), and on
  any comment without a `reply`: users add new comments to an older revision file too.
- Fix each comment the way the making skill works (its principles and its `prefs.md`), check the
  fix the way it checks (stills, frame sheets, exact seeks), then re-render the way it renders.
- In the JSON set each comment's `status` to `"done"` and add a short `reply` (what changed, or why
  not); set the revision's `status` to `"resolved"` when all are done (don't forget this last
  step). Edit only those fields: the open page picks the change up when it regains focus and
  rewrites the `.md` on its next save. Don't rename, delete or reformat revision files.
- Copy the updated JSON into the kept `v<N>/` copy of that revision, so the archived cut carries its
  answered notes too. Copy, don't move.
- A revision records the render's size and modified time. After you re-render, the screen warns
  that older revisions point at the previous cut, and the user starts a new revision for the new
  render. Give them the link again.

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
- **Render the ranges** muted, with the same settings as the full render, so the pieces join without
  re-encoding: `npx remotion render <bundle> <composition> partN.mp4 --frames=a-b --muted --crf=18`.
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
  previous cut. Then keep the
  previous version, rebuild the map and answer the revision as usual.

## 4. Log what you learned

Every comment teaches something. Style-specific lessons (this look, this footage, this song) go in
the project's `prefs.md`, dated and numbered as the user wrote them; general ones (true for any
project) go in the making skill's lessons/feedback log; lessons about the review loop itself go in
the log below.

## Feedback log

Append dated entries: what the user said → the rule.

- 2026-10-25 · split out of make-lyrics-video step 10 and make-video-music-remix step 10 ("both make videos, and both use the revision page to revise: separate the revising with the revision window into a separate skill, used by all similar video-make skills in future") → this skill; the making skills point here after their render step.
- 2026-10-26 · quicksilverxkingpin ("are you only rendering changed chunks and replacing them in the video? … write that down in the revision skill: if it's just minor changes, save time by doing that") → step 3's "Minor revisions": render only the changed frame ranges and splice them into the previous cut; full renders only when the changes are global or spread across the video.
