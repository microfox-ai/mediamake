---
name: analyze-video
description: Break an edited film or video into its shots (every cut, dissolve and fade, with exact times and frames), group the shots into scenes, find environments/locations that come back later in the video, and draw contact sheets so Claude can see the whole video at a glance and use it for further edits; optionally cut one clip per shot or per scene. Use when the user says "segregate / split / break down this video", "find the shots / cuts / scene changes", "mark where the shots change", "make clips of each shot / scene", "contact sheet of this film", "index this footage", "/analyze-video <file>", or gives a finished video (film, episode, trailer, AMV, music video) that a later edit has to reuse.
---

# analyze-video

Turns an edited video into a map Claude can work from:

```
<video name>_segregation/
  INDEX.md            start here: counts, scene table, recurring locations, which file is what
  segregation.json    the same as data: shots, scenes, locations, review items, sheet paths
  shots.csv           one row per shot
  sheets/
    timeline.jpg      one row per location that comes back; blocks show when it is on screen
    shots_###.jpg     every shot's middle frame, colour bar = scene (≈42 shots per page)
    scene_S###.jpg    one per scene: first · middle · last frame of every shot in it
    locations_###.jpg recurring locations, one typical frame per scene
    review_###.jpg    boundaries the detector was unsure of: frames f-2 f-1 | f f+1
  frames/f#######.jpg keyframes at 480 px, named by frame number
  clips/shots/sh####.mp4, clips/scenes/S###.mp4   (only with --clips)
  overrides.json, notes.json   written by Claude; picked up on every rerun
  cache/              analysis + embeddings, so reruns take seconds
```

The words used everywhere:
- **shot**: the frames between two cuts (`sh0001`…).
- **scene**: consecutive shots in one place and moment (`S001`…). Shot/reverse-shot and cutaways
  stay in one scene, because each shot is compared with the 4 shots before it, not just the last one.
- **location**: scenes that look like the same environment (`L01`…). A location with 2+ scenes is an
  environment that comes back (marked ↺ in INDEX.md, drawn on `timeline.jpg` and `locations_*.jpg`).

## Requirements

`ffmpeg`/`ffprobe` and [uv](https://docs.astral.sh/uv/) on the PATH. The scripts declare their own
dependencies (numpy, Pillow; torch + transformers for the embeddings), so there's no venv to set up.
The first run downloads torch and the DINOv2-small weights (~90 MB) into the uv / Hugging Face caches.
If that fails it falls back to colour histograms, which find cuts just as well but match locations
much worse; say so if it happens.

## Workflow

### 1. Run it

```bash
uv run --script .claude/skills/analyze-video/scripts/segregate.py "<video>"
```

- Output goes next to the video as `<video name>_segregation/` unless you pass `--out <dir>`. If the
  video is in the repo (e.g. a project's `input/`), put the output somewhere gitignored.
- Clips: only when the user wants files. `--clips shots`, `--clips scenes` or `--clips both`
  (frame-accurate H.264 re-encodes, `--clip-height 1080` to shrink 4K). For a Remotion edit you
  rarely need them: `<OffthreadVideo src={…} startFrom={…} endAt={…}>` on the original file with the
  frame numbers from `segregation.json` does the same with no quality loss. A 2-hour film has
  1000–2000 shots; ask before cutting that many.
- Speed: one decode at ~128 px for analysis plus one at 480 px for the keyframes, ~200 fps for 1080p
  and ~130 fps for 4K on an M-series Mac. A 4.5-minute 4K60 episode took 5 minutes the first time
  (including the torch download) and 12 s per rerun. A feature film takes 30+ minutes; run long
  videos in the background.

### 2. Look before you trust it

Read `INDEX.md`, then look at the sheets yourself (Read the jpgs; each is ≤1560 px, so it reads at
full size):

1. `timeline.jpg` and the `shots_*.jpg` pages: does the shot list look like the video? Shots under
   ~0.3 s are often flashes, text changes or fast action, not real shots.
2. `review_*.jpg`: each item shows two frames before and two after a boundary. Green "KEPT" = it was
   counted as a cut, grey "not cut" = a near miss that was rejected. Check every one.
3. `locations_*.jpg`: are the frames in each row really the same place? Are there places that come
   back but got different location ids (compare with `shots_*.jpg`)?
4. `scene_S###.jpg` for scenes that look too long (several places) or too short (one shot that belongs
   with its neighbour).

Then write `<out>/overrides.json` with what's wrong (all keys optional) and rerun the same command;
every step except the changed ones comes from the cache:

```json
{
  "add_cuts": [1234, "00:01:02.500"],
  "remove_cuts": ["f2240"],
  "scene_break_before": [5120],
  "scene_join": [6011],
  "same_location": [[1200, 30500]],
  "different_location": [["00:03:10", "00:09:44"]]
}
```

References are frame numbers (`1234` or `"f1234"`) or times (`"62.5s"`, `"00:01:02.500"`); any frame
inside a shot or scene stands for it. `remove_cuts` matches a boundary within ±2 frames.
`scene_break_before` / `scene_join` act on the shot containing the frame: start a new scene there /
glue it to the scene before. `same_location` / `different_location` take pairs of frames from the two
scenes. Don't use shot ids like `sh0042` in overrides: ids are renumbered when cuts change, frames
are not. Read the frame numbers from `segregation.json` or the sheet labels.

If many boundaries are wrong the same way, change a threshold instead of listing them (see Tuning).

### 3. Describe it

Once the structure is right, write `<out>/notes.json` from what you saw in the sheets, and rerun so
the descriptions land in `INDEX.md`, `segregation.json` and the sheet headers:

```json
{
  "summary": "Maki fights through the Zenin clan compound, ends in the courtyard at night.",
  "scenes":    {"S001": "Maki walks the corridor, guards notice her", "S002": "…"},
  "locations": {"L01": "Zenin compound corridor (wood, paper doors)", "L03": "Courtyard, night"},
  "shots":     {"sh0017": "close-up, Maki's eyes, good for a beat drop"}
}
```

Notes are keyed by id, so write them after the cuts and scenes are final (or check them after a rerun
that changed the structure).

### 4. Use it

Tell the user what you found in a few lines (shots, scenes, locations that come back, anything odd)
and where `INDEX.md` is. For later edits:

- A shot or scene is `start_frame`…`end_frame` (end exclusive) at the source fps in
  `segregation.json`; seconds are `start`/`end`. Convert to the target composition's fps when it
  differs: `round(start * targetFps)`.
- Find material by look: `similar` on each shot lists look-alike shots in other scenes (reused footage
  or coverage of the same set-up); a location's `scenes` lists every return to a place.
- Extract one moment at full size: `ffmpeg -ss <start> -i <video> -frames:v 1 out.png`.
- Cut one piece on demand: rerun with `--clips scenes`, or
  `ffmpeg -ss <start> -i <video> -t <duration> -c:v libx264 -crf 18 -c:a aac out.mp4`.

## Tuning

| flag | default | change it when |
|---|---|---|
| `--cut-threshold` | 0.3 | cuts between similar-looking shots are missed (lower to 0.2) / motion or flicker gives false cuts (raise to 0.4) |
| `--cut-ratio` | 3.0 | how much a cut must stand out from the frames around it; lower (2.0) for rapid cutting where every frame changes |
| `--layout-threshold` | 0.3 | how much the picture's layout must change. Beat-synced brightness pulses, colour grades and text changes on one image stay below ~0.15; real cuts are usually above 0.45. Lower it if cuts between two similar framings are missed |
| `--min-shot` | 0.2 s | AMVs and trailers with 2–4 frame shots: 0.08; films: 0.4 to absorb flashes |
| `--no-dissolves` | off | heavy smoke, fog or light effects get read as dissolves |
| `--scene-threshold` | auto | too many scenes: lower it; scenes that span several places: raise it. The value used is printed and stored in `params` |
| `--scene-window` | 4 | long back-and-forth intercutting between two places: lower to 2 |
| `--min-scene` | 2.5 s | scenes shorter than this join the neighbour they look most like; 0 keeps every split, 5–10 for a film |
| `--location-threshold` | 0.66 | different places merged: raise to 0.7; one place split across ids: lower to 0.6. Recurring characters pull scenes together, so check `locations_*.jpg` |
| `--no-black-breaks` | off | a black gap of ≥0.5 s ends a scene; disable for videos with rhythmic black flashes |
| `--embed color` | dino | no network / torch install fails |
| `--force` | | the video file changed in place and the cache didn't notice |
| `--no-sheets` | | quick rerun to update the JSON / INDEX.md only |

## How it decides (when a result looks wrong)

- **Cuts**: per frame a 16×4×4 HSV histogram and a 32×18 luma grid; the distance between neighbours
  must pass `--cut-threshold` and be `--cut-ratio`× the average of the 2 frames either side, and the
  layout (luma grid with brightness and contrast normalized away) must change by `--layout-threshold`,
  so a beat pulse or regrade isn't a cut. If the picture returns within ~⅛ s it is a flash (camera
  flash, hit spark, white frame), not a cut.
- **Dissolves**: a middle frame that is the average of frames ±0.25/0.5/1 s away, whose layouts
  differ (so a lighting change doesn't count). Kept as `low`/`medium` confidence and always shown on
  the review sheets.
- **Black/white gaps** of ≥0.2 s / ≥0.3 s become their own shots (`kind: black|white`) and stick to
  the scene before them.
- **Scenes**: DINOv2 embeddings of 3–8 keyframes per shot; a boundary between shot i and i+1 survives
  only if no shot among the last 4 matches any among the next 4 above the scene threshold. The auto
  threshold is an Otsu split of those link values, capped at 0.4–0.65. Then scenes shorter than
  `--min-scene` join the neighbour they link to best (black gaps ≥0.5 s and overrides stay put).
- **Locations**: for each shot of one scene, its best look-alike in the other; the median of that, both
  ways, is the scene similarity. Scenes are clustered with average linkage above the location threshold.

What it can't do: tell two identical-looking sets apart, know that a different-looking angle is the
same room, or read a time jump inside one place. A lyric video or slideshow on one still image gets
"shots" at every text change and a single scene. That's correct for what it measures; say so rather
than forcing it. Your look at the sheets plus `overrides.json` is the fix for all of these.
