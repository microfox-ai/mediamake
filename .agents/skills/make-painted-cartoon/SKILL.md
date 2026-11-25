---
name: make-painted-cartoon
description: Make a short hand-painted 2D cartoon (5–60 s, 16:9) starring Clawd, the Claude Code mascot, or any character the idea needs, painted stroke by stroke in p5.brush with boiling ink lines, watercolour skies and paper grain, and acted through 31 emotions, drawn turns, takes, jumps and dances on the beat. Built on John Heibel's Claude Animation Base kit, which lives in the studio as @mediamake/engine/painted. A storyboard with timed "reads" comes before any code, then shot-by-shot building checked with the kit's own contact sheets, frame strips and crops (mm painted), then 10-second previews reviewed through revise-video, and the master rendered once after sign-off (mm render). Silent, or locked to a song's beat. Use when the user says "make a cartoon of Clawd …", "animate Clawd doing …", "hand-painted / painted / watercolour / brush animation", "a short animation where a little character …", "Claude Animation Base", "/make-painted-cartoon", gives a tiny story to animate in a 2D cartoon look, or asks to change a project with a video/painted.json. Not for lyric videos (make-lyrics-video, make-waveform-lyric-video), footage edits (make-video-music-remix), kinetic type (make-kinetictype), the Doomcat show (make-doomcat-daily-episode), or still pictures (create-thumbnail, create-music-poster). New user feedback goes in your notes (mm notes add), never in this file.
metadata:
  category: make
  version: 0.1.0
  depends-on: revise-video
---

# make-painted-cartoon

A tiny story in, a hand-painted cartoon out. The look and the craft are John Heibel's
[Claude Animation Base](https://github.com/JohnHeibel/ClaudeAnimationBase) (MIT): p5.js and p5.brush,
Clawd with 31 acted emotions, and a guide that names what makes generated animation look generated.
MediaMake runs that kit in the studio, so a cartoon is an ordinary project: Remotion renders it, and
revise-video reviews it.

**Read [reference/animation-guide.md](reference/animation-guide.md) whole before you draw anything,
every time.** It is the craft: the three goals (handmade, alive, one piece), the seven rules, the
animation principles, the storyboard format with its timed reads, the review budget, and the full
reference for the engine and for Clawd. This file only adds how it runs here. Where they differ on
how to run something, this file wins; on how to animate, the guide does.

The rule the guide calls the one models get wrong most is timing: the viewer sees each moment once, at
full speed, for the first time. Time every read for them, not for you.

## Before anything

1. Read your notes: `mm notes make-painted-cartoon`.
2. Read the guide (above).

## 1. Ask first

Put the questions that cost a round when they are skipped together, as choices, and skip what the
person already said. The kit does a lot with very little, so a broad idea is enough to start from.

- **What happens.** The idea in a sentence or two. Clawd wants something, tries, fails, gets it.
- **How long.** 10–20 s suits one idea. A shot list longer than its reads can carry is the classic failure.
- **Silent, or to a song.** A song sets the length and the beat. Search the media library first
  (`mm media find`).
- **The star.** Clawd as designed, Clawd restyled (a hat, a costume, a colour), or a new character. A new
  one needs a reference picture or a description of its shape, colours and features.
- **For whom.** The channel it is for (its palette when it has a brand kit, and where it is delivered).

The canvas is the kit's: 1920×1080 at 24 fps, the linework boiling at 12 drawings a second. A vertical
(9:16) cartoon is not built yet: say so if asked.

## 2. Set up

```bash
mm painted new <slug> --seconds=<length>          # silent: the project, a starter scene, STORYBOARD.md, mm prepare
```

When it is for a channel, register it too: `mm media production new <slug> --channel=<channel>`.

With a song: put it in `projects/<slug>/input/` first (`mm media use <id> <slug> --as=input/<name>.mp3`,
or a copy of the person's file),
then `mm painted new <slug>`, which keeps the song and takes its length, then `mm analyze <slug>` and
`mm prepare <slug>` for the beat grid, so `bpm` and the first downbeat come from the song.
`mm painted length <slug> <seconds>` changes a silent project's length later.

The project is `projects/<slug>/` in the workspace (`mm workspace`):

| File | What it is |
|---|---|
| `STORYBOARD.md` | the plan, in the guide's format (step 3) |
| `video/painted.json` | `"scenes"`: the scene files in `video/`, in order; `bpm` and `offset` (a silent project starts at 120 and 0; with a song, leave them out and the song's are used) |
| `video/scenes/*.js` | the shots: plain scripts in the kit's style, each ending with `shots([...])` |
| `video/index.tsx` | one line, `paintedProject({ id: '<slug>' })`. Leave it |

Render the model sheets once and look at them: they show what Clawd can already do before you invent
anything (`mm painted <slug> --loop=emotions --sheet=1 --cols=1 --w=1920` and `--loop=views`).

## 3. Storyboard

Write `STORYBOARD.md` before any scene code, in the guide's format: logline, world and palette with its
colour arc, motif, Clawd's emotional arc, and every shot with its transition and its timed reads. Check
it against the guide's list (an event in every shot, time for every read, a transition at every seam,
no text, an ending that rhymes with the opening).

Show it to the person and let them react before you build: changing a storyboard costs a minute, and
changing a built shot costs much more. In a routine or auto mode, check it against the rules yourself
and go on.

## 4. Build, shot by shot

Follow the guide's Build section, in the project's files: one scene file per scene (or one for the
whole video), listed in `video/painted.json`. Build and check one shot at a time, in order. Within a
shot, block the key poses first and look at them as stills before any motion goes between them.

What breaks a render, from the guide: a frame must be a pure function of `t` (no state between frames,
no `Math.random()`), and each separate element gets its own `boilSeed(key)`. A new emotion, prop or
character for one video goes in that video's scene files. The kit in the studio
(`apps/studio/src/painted/kit/`) is the same for every video, so a video never edits it.

**A new character** has none of Clawd's rig: `feel`, `emotions`, the takes and the emote placement are
Clawd's alone. Give it a cast file of its own, listed first in `video/painted.json`: its body drawn with
`paint` and `inkLine` (one outline per part), a small set of faces, a function that poses it from a
few numbers (lean, arms, legs, face), the walk and the takes the story needs built on the kit's motion
helpers (`stroll`, `jump`, `take`, `spring`), and a model sheet as a loop (`LOOPS.cast`). Look at that
sheet before any shot uses the character: a caricature reads by its silhouette and two or three
exaggerated features, at the size the shots will show it. Each scene file is its own script, so the
names a cast file declares at its top level are there for the files after it; keep what's private
inside an IIFE.

## 5. Look at it: the kit's review loop

You can't see motion by reading code. `mm painted` draws chosen frames in headless Chrome, in about
0.1–1 s a frame, and writes one image to `out/<slug>/check/` (or `--out=`). Open every image it writes
and actually look:

```bash
mm painted <slug> --sheet=0.1,0.8,1.6,2.4 --cols=4 --w=480          # the shape of a shot or the piece
mm painted <slug> --strip=2.1:2.6                                    # every frame of a moment
mm painted <slug> --sheet=2.3,2.4 --crop=760,420,500,400 --w=500     # full-resolution detail
mm painted <slug> --strip=2.1:2.6 --crop-at=960,700,500,400          # follows a world point through the camera
mm painted <slug> --stills=1.2,3.4                                   # full-size PNGs
```

The guide's budget holds, plus one thing: at least one sheet per shot, a strip for every key motion
and transition, a crop for every face that carries the story, and one full-size still per shot
(`--stills`), because a muddy pigment mix or a stray mark hides at sheet size. Check each against its list (read, timing counted in
frames, motion, boil, contacts, transitions, rules, colour), fix, and look again. `mm preview <slug>`
scrubs it in Remotion Studio on this computer, for the person or for you. MediaMake's hosted editor
can't open a painted cartoon (it doesn't serve the kit's libraries), so never give a link to it.

The page logs its own errors: `mm painted` stops with the scene file and line that threw. `--gpu` says
which GPU it draws on. With no GPU at all, `--soft-gl` renders in software (slow on watercolour
fills): then ask the person whether to paint with fewer `fill` shapes, as the kit's author advises.

## 6. Show it: previews through revise-video

When a stretch is ready for the person, render the 10 seconds around it and hand over to revise-video:
`mm render` prints the `mm preflight` line, and revise-video runs it and fixes what it finds before it
gives the review link.

```bash
mm render <slug> --preview                 # the 10 s around what changed
mm render <slug> --preview=3-13            # or the stretch you name
```

The whole video renders only when the person asks to review all of it. Their notes come back through
revise-video: fix each one in the scene files, look at it again with `mm painted` (step 5), then
preview again.

## 7. The master, and delivering it

Once they sign off: `mm render <slug>` once, the track (silence or the song) muxed in. It goes to their
channel folder only when they say so (`mm media deliver <slug> --what=video`). A round is never
rendered over: the next one is beside it.

## Gotchas

- **`--crop-at` expressions** are worked out once per sheet, in the page: they follow the camera, not a
  moving character, and they see the kit's names and what a scene puts on `window` (a name inside a
  scene's IIFE isn't there). To crop on a character, set `window.<name>` in its scene, or crop a fixed
  `--crop` per moment.
- **The time label** on each sheet cell is a fixed 84×24 px box in its top-left corner. At small `--w` it
  can cover something there: a dark patch in that corner is the label, not the frame.
- **Emotes over the head** (cloud, bulb, steam, stars, scribble) draw at a fixed height, so they collide
  with anything on the head (a tall hat, a prop). Draw that emote yourself with `emote(kind, x, y, s, k,
  age)` above the prop instead of the `emote` option.
- **Fading out over colour** (lowering `washOp`, `flash()`) mixes like pigment for the last few frames:
  milky or greenish over a green field. Shrink the shape away, or cover it, instead of fading it.
- **Arms** end below the top of the body even at ±1.5 (straight up), so Clawd can't reach above its own
  head with them: raise what Clawd holds on its own, from a point computed from the pose.
- **A side-view walk that stops** leaves two legs lifted unless its phase ends a quarter past a whole
  step (`walk` at n + .25): ease the phase to that before the stop.

## The kit's commands, here

| The kit (upstream) | Here |
|---|---|
| `src/config.js` (`duration`, `bpm`, `offset`) | the track's length (`mm painted length`), `bpm` and `offset` in `video/painted.json` (else the song's) |
| `src/scenes/*.js` and their tags in `studio.html` | `video/scenes/*.js`, listed in `video/painted.json` |
| `studio.html` in Chrome (`?t=`, `?loop=`) | `mm preview <slug>`; loops: `mm painted <slug> --loop=<name> --sheet=…` |
| `node render.mjs --sheet / --strip / --crop / --crop-at / --stills / --png` | `mm painted <slug>` with the same flags |
| `node render.mjs --clip`, `--frames --workers`, `--encode` | `mm render <slug>` (`--preview` for a review) |
| `PROJECT.audio`, `--audio=` | the song in `input/`, played and muxed by the project |
| `--chrome=`, `--soft-gl`, `--gpu-angle=`, `gpu_probe.mjs` | the same flags on `mm painted`; `mm painted <slug> --gpu` |

## Where it runs

| Step | Needs | A person's yes | Safe to repeat | Without it |
|---|---|---|---|---|
| 1. Ask first | nothing | no | yes | - |
| 2. Set up | `media:library` | no | yes | the song from the session's own files, or silent |
| 3. Storyboard | nothing | yes | yes | - |
| 4. Build, shot by shot | nothing | no | yes | - |
| 5. Look at it | `render` | no | yes | - |
| 6. Show it | `render` | yes | yes | - |
| 7. The master, and delivering it | `render`, `media:library` | yes | yes | a to-do: deliver the master on the person's computer |

Nothing here costs money, and no MCP is needed. Step 2 needs the media library only to find a song.
`render` is Chrome with WebGL. A computer's GPU paints the watercolour fills fast; a cloud session's
machine without one draws them slowly in software (`mm painted … --soft-gl`).

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add make-painted-cartoon "<what the user said> → <the rule>"   # a new lesson, dated for you
mm notes make-painted-cartoon                                           # your notes for this skill
```

When the user wants them shared, `mm notes promote make-painted-cartoon` offers them to this log as a pull request.

- 2026-11-25 · Added from John Heibel's Claude Animation Base: "through the studio, but add the same flow
  and capabilities as kit supports" → the kit runs unchanged inside Remotion (`@mediamake/engine/painted`),
  and every review mode of its renderer is `mm painted`.
