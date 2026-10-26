---
name: make-video-music-remix-shorts
description: Make vertical shorts (9:16 YouTube Shorts / Reels / TikTok, 3:4 Instagram grid, 4:5 Instagram feed) of a song edit in Remotion, in make-video-music-remix's edit style — every run picks the three coolest different stretches of the song (energy, the opening hit, hooks that repeat, clean section starts and ends; never a stretch the user called bad), checks them with the user (waveform with the picks, an mp3 of each), then makes three finished shorts of 30 s–2 min in the formats the user chose, cut on the beat with the footage reframed around its subject, stacked splits and widescreen bands where a crop would be soft, words and captions laid out for a phone; reviewed through Revisions (revise-video). Builds on a make-video-music-remix project (ideally a finished long edit, whose casting it starts from). Use when the user says "make shorts / reels / tiktoks of <edit>", "vertical cuts of this song edit", "9:16 / 3:4 versions", "/make-video-music-remix-shorts", or asks to change a short under apps/lyrics_videos/projects/<slug>/shorts/. Not for the full-length edit (make-video-music-remix). Append new user feedback to the log at the bottom.
---

# make-video-music-remix-shorts

Vertical shorts cut from a song edit. Three things change from the long edit:

- **The stretch:** 30 s–2 min of the song, the coolest parts, three different ones every run.
- **The frame:** 9:16, 3:4 or 4:5 (the user's choice), with a widescreen picture inside it.
- **The clock:** the first second has to hit, and the end should flow back into the start.

Everything else is `make-video-music-remix`: its principles (the story, pulse before sync, continuity
where the song soars, meaning first, real speed, one use per shot, motion not colour, words that land,
sound on its picture), its cut-list language, its checks and render. Read that skill once; this file
covers what is different. Reviews go through `revise-video`.

Taste comes from the user: read the project's `prefs.md` and the lessons log at the bottom before
planning; log every piece of feedback on a short in `prefs.md` (under a "Shorts" heading) and the
general rule here.

## The user's rules (2026-10-26)

- **Three different stretches every run**, checked with the user before any editing.
- **Every run ends in three finished shorts**, rendered and ready for review.
- **The formats are the user's choice**, asked every run: 9:16, 3:4, 4:5 or several. Never assume one.
- **A re-cut of a stretch already made is fine** unless the user said that part is bad. Then it is
  never picked again (`mark … bad`). New stretches come first; a re-cut gets a new casting, not the
  same edit again.
- **Never AI-upscale footage** unless the user asks for it. If it would help, ask first (it costs
  money). The sharp alternatives come first: several moments in one frame (stacked splits, the user's
  own idea: "more edit-like"), the whole wide picture as a band, or 4K sources.
- **30 s to 2 min** each.

## What makes a short

1. **The first second is the hook.** No slow intro and no black title card. The short starts on a
   downbeat where the drums are in (the picker prefers these), or on a one-bar launch into one. The
   long edit's principle 1 (held opener, long takes) is for a full video, not a short. The first cut is
   a strong full-motion shot of the hero. A title, if any, goes in the top band over the picture
   (`bar` or `label`, a beat or two), and so does the channel's name, small.
2. **One small story.** The stretch's sections are its chapters (verse → hook → drop): continuity in
   the hooks and drops, the steady pulse in the verses, the payoff at the end of the stretch.
3. **The loop.** Shorts replay. End on a later moment of the take that opened the short, or warp-zoom
   the last cut into a subject placed where the first shot's subject is, so the replay reads as one
   move. The audio ends on the phrase end the picker snapped to, with a 0.4 s fade (`fadeOut` in
   short.json; `fadeIn` stays 0 so the hit lands).
4. **A phone frame.** The subject is big and near the centre. Fewer, bigger words, each on its own shot.
   Captions and top words sit at the safe heights (the renderer does this: 9:16 keeps the bottom
   quarter and the right edge for the platforms' buttons). Nothing important goes in the bottom quarter.
5. **Sharp, not blown up.** A 2.39:1 1080p picture filling a 9:16 frame is enlarged 2.4× (1920 / 804),
   and 1.8× in 3:4. `npm run remix -- <slug> --short=<id>` prints the factor for the project. Past
   ~1.5× it looks soft on held shots, so mix three layouts by section:
   - **reframe** (the default): full frame, the crop following the subject. Use it for fast cuts,
     close-ups, drops and motion, which hide the softness.
   - **stacked split** (`split` / `splitAt`): two or three moments stacked in one frame, each barely
     enlarged (three panels are sharper than the source). Use it for verses, lists, call and response,
     the same moment from several angles, and the panels landing on words.
   - **box** (`band(y, h)` or `gfx.band`): a box across the frame, `h` tall over its width, reframed on
     the subject, with a bold `bar` word above it and the caption low in it. On a 2.39:1 source,
     `h` 0.75 shows the picture at its own sharpness (flame waves over the night race), 0.9 is near
     square and enlarged ~1.2× (faces: hitixf1's black-and-white bridge), 0.6 keeps a two-shot whole.
     Without `h`, the uncropped widescreen strip (elegant, but small on a phone: it left most of the
     frame black). Use boxes for vistas, held moments and spoken passages.
6. **Sound:** the long edit's effects come along with its cut list. Make no new sound effects (paid)
   unless the user asks.

## What it needs

A make-video-music-remix project, `projects/<slug>/`, with `manifest.json`, `video/remix.json`, the
footage segregated and matted. A finished long edit (`video/edl.ts`, `video/index.tsx`) is the best
start: its casting, words, sound and look come along, and the user already approved them. Without one
(new footage and song), run make-video-music-remix steps 0–4 and 7 first (intake, folder, footage map,
song map, media), then cast only the shorts' stretches. The reframe needs a cutout (matte) on every
footage shot used; without one the crop sits in the centre.

Tools: ffmpeg. Engine (committed): `scripts/shorts.ts` (`npm run shorts`), `src/remix/shorts.ts`
(`defineShorts`, `FORMATS`), the vertical frame in `src/remix/Remix.tsx`, the song window in
`src/kit` (`ProjectDefinition.window`), `--short` in `scripts/remix.ts`, `stills.ts` and `render.ts`.

## Workflow

### 0. Intake (short)

One `AskUserQuestion` call:

- **the formats** (multiSelect): 9:16 Shorts / Reels / TikTok · 3:4 Instagram grid · 4:5 Instagram
  feed. This question is asked every run.
- anything else the request leaves open: which project or edit, the channel's sign-off, anything they
  want in or out.

Then read `prefs.md` and the shorts so far (`npm run shorts -w lyrics_videos -- <slug> list`).

### 1. Pick three stretches

```bash
npm run shorts -w lyrics_videos -- <slug> pick            # --n=3 --min=30 --max=120 --alts=3
```

It scores every bar-aligned stretch of 30 s–2 min:

- drums + bass energy against the song
- the opening two bars (a one-bar launch into a section counts)
- the peak
- the share of lyric lines that repeat (hooks)
- the sections' names (hook/drop > build > verse > bridge > intro/outro)
- clean starts and ends on section edges, on the bars where the drums come in or drop away, the music
  dropping away after the end
- lyric lines: a stretch that starts inside a line ("…down") loses points. An end that falls just
  after a line starts moves back before it; one inside a line that is mostly sung moves on to the
  line's end (`ends before / after "…"`).
- a quiet passage in the middle (a bridge, a breakdown) loses points
- ~45–75 s preferred

It keeps the best three that overlap a quarter of the shorter at most, plus alternates.
`--extra=104.7-150.6,…` adds stretches you name (snapped to bars, phrase ends applied), scored and
drawn with the rest, so a judgement call gets its mp3 and its place on the waveform too. Stretches marked bad are out.
Ones already made come back only as re-cuts, ranked lower (`re-cut of s02`). Writes
`shorts/picks.json` and `out/<slug>/shorts/picks-<run>/` (`A.mp3`…, `picks.png`: the waveform, the
sections, the picks in colour, the alternates in grey).

Judge them before asking. Print each stretch's lyric lines and the per-bar drive. Pull frames from
the long edit's render at each stretch's start, +1 s, middle and end (a contact sheet): does it open on
a hit and a strong shot, is there a scene for its drop, does it end cleanly? Two shorts sharing a shot
at their edges (one's end, the next one's start) is fine to propose; recast one of them later. Swap a weak pick for an alternate or any stretch you name (`make`
takes letters or seconds, e.g. `95.2-151.0`, snapped to bars).

### 2. Check with the user

Show `picks.png` (read it and give its path), give the mp3s as a one-click block:

```bash
open "out/<slug>/shorts/picks-<run>/A.mp3"
```

Then one `AskUserQuestion` (multiSelect): an option per pick, e.g. label `A · 1:08–1:45 hook → drop`,
description its sections, length, why it scored and `re-cut of s01` when it is one. "Other" takes swaps
("C is bad", "start B a bar earlier", "use the bridge instead"). Edit nothing until they approve three.
A stretch they call bad: `npm run shorts -w lyrics_videos -- <slug> mark C bad --note="…"`, then
offer the next alternate.

### 3. Make

```bash
npm run shorts -w lyrics_videos -- <slug> make A,B,C --formats=9x16,3x4
```

Each becomes `shorts/s<NN>/`:

- `short.json`: the window in seconds and beats, the formats.
- `edl.ts`: re-exports the long edit's lists, or starts empty for a project without one.
- `index.tsx`: `defineShorts(parent, short, edl)`.

Each format becomes its own composition, `<slug>-s<NN>-<format>`, and each short is logged in
`shorts/history.json`. The short plays the song from its window: cuts, words and sound effects stay in
the song's own beats.

### 4. Recast each short — `shorts/<id>/edl.ts`

Start from the long edit's cut list and change what a short needs. A recast block replaces the long
edit's block of the same id and must cover the same beats (the resolver stops otherwise). Cuts before
the window are never seen, so a block the window starts inside only needs its cuts from the window on to
be good.

```ts
import * as full from '../../video/edl.ts';
import { band, c, splitAt, aim, freeze, shake, type Block } from '../../../../src/remix/edl.ts';

const recast: Record<string, Block> = {
  // the short opens here: the hero on the downbeat, then the long edit's hook
  h1: { id: 'h1', at: 112, cuts: [c(1, 'lm0132', 'impact', shake()), /* … */] },
  // the verse as stacked moments landing on their words
  v2: { id: 'v2', at: 176, cuts: [splitAt(4, ['sh0041', 'lm0090', 'sh0102'], [176, 177.5, 179]), /* … */] },
};
export const blocks = full.blocks.map(b => recast[b.id] ?? b);
export const words = full.words; // or filter / add: fewer, bigger, `bar` at the top
export const sfx = full.sfx;
export const gfx = { ...full.gfx, band: [[112, 114]] as [number, number][] }; // the opening bar as a band
```

- **Recast with `swap()`:** `swap(block, i, j, cuts)` replaces cuts [i, j) (0-based: 'v2.9' is 8) with
  new ones of the same length, and stops if the length differs. Swap later indices first. Map every cut
  to its beat first (shots.json + the manifest's beats): windows rarely start on a block's first cut.
- **The opening:** the first cut on the window's first beat, a strong, bright motion shot (a dark
  close-up reads as nothing). If the long edit is mid-freeze, mid-take or mid-transition there, cut at
  the window: an `impact` into a later moment of the take (hitixf1 s01: the car charging the lens
  under RACER). A quiet first bar can be a launch: four ¼-beat black-and-white close-ups with rising
  shake, colour on the drums.
- **Leftovers:** a caption, `sub` or big word from before the window can still hang on at its first
  frames (and a `sub` hides the new line's caption). `end` them at the window's first beat.
- **Splits:** one panel per word, landing on it. A panel plays its take from where it lands and holds
  the last frame after it (often a fade to black). `remix --short` flags panels holding more than half
  a beat: longer takes on top, or a cut before the split.
- **`pop`** (the picture as a card) reads as a mistake in a tall frame: freeze and flash instead.
- **The sign-off** `flank` beside a full-height subject gets only a few pixels. Give it a `box` around
  the head (`[0.38, 0.62, 0.3]`) and a `size` (0.07).
- **Layouts by section:** see principle 5. `aim(x, to?)` overrides the reframe: `x` is 0–1 across
  the wide picture. Use it for two faces (aim at the hero), the wrong subject, or a pan across a wide
  shot (`aim(0.2, 0.8)`).
- **Words:** keep the long edit's punch words where a subject leaves room. In a vertical frame `bar`
  words sit in the top band, a headline over the picture. `front` words go over close-ups only when
  short. Captions break into two lines by themselves.
- **The end:** the loop (principle 3).

Then check the short's window only:

```bash
npm run remix -w lyrics_videos -- <slug> --short=<id>             # cuts, rhythm, repeats, mattes, enlargement
npm run remix -w lyrics_videos -- <slug> --short=<id> --matte     # cutouts for shots without one
npm run remix -w lyrics_videos -- <slug> --short=<id> --animatic  # out/<slug>/shorts/<id>/animatic/
```

It writes `shorts/<id>/shots.json` (the short's shot map). Plates, mattes, slow clips and
`video/footage.json` stay shared with the long edit (slow clips the long edit uses stay listed).

### 5. Check

```bash
npm run stills -w lyrics_videos -- <slug> --short=<id> --cuts --scale=0.25                 # a frame per cut + sheet.jpg
npm run stills -w lyrics_videos -- <slug> 0.2,2,8,20 --only --short=<id> --format=9x16   # seconds of the short
npm run render-project -w lyrics_videos -- <slug> --short=<id> --format=9x16 --frames=0-150 --scale=0.5
```

Stills go to `out/<slug>/shorts/<id>/stills-<format>/`, clips to `…/clips/`. Check every format:

- the subject in frame on every cut (the reframe), the first frame strong
- words clear of faces and of the bottom quarter in 9:16
- held shots that look soft (switch them to a band or a split)
- splits that read as one beat each
- the last frame flowing into the first

Then the long edit's checks: rhythm, repeats, sound on its picture.

### 6. Render and review

```bash
npm run render-project -w lyrics_videos -- <slug> --short=<id>     # every format in short.json (or --format=9x16)
```

→ `out/<slug>/shorts/<id>/<slug>-<id>-<format>.mp4` plus its `.map.json` (the short's shots in its own
time). Earlier renders are kept in `v<N>/` beside it, as with the long edit. Render the three shorts one
after another in the background, not in parallel.

Review with **`revise-video`**, one link per short and format:
`/remotion-revision?folder=<slug>/shorts/<id>&video=<slug>-<id>-9x16.mp4` (if it doesn't open, the user
picks `out/<slug>/shorts/<id>/`). Log the comments. When the user likes a short:
`npm run shorts -w lyrics_videos -- <slug> mark <id> liked`. Then offer the YouTube text per short
(`pack-youtube` / `write-youtube-metadata`, with #shorts) and, for the long edit, a related-video link.

### Next runs

`pick` again: history steers it to stretches not made yet, then to re-cuts of ones that were (with a
new casting), never to ones marked bad. Ask the formats again.

## The vertical frame — reference

A composition taller than it is wide (`defineShorts` makes them) switches `Remix` into its vertical mode:

- **Window = the whole frame.** Each cut shows the part of the wide picture around its subject. The
  reframe uses the cutout's anchors (centre weighted by size over ±0.4 s, so the crop glides) and is
  cropped inside the image (`object-position`). Anchors map to the frame, so warp zooms, match cuts,
  flank words and decals land on the subject as in the long edit. No cutout: the centre.
- **`aim(x, to?)`** (fx): reframe on that point of the wide picture (0–1 across), panning to `to` over
  the cut.
- **`band(y?, h?)`** (fx) / **`gfx.band: [[from, to, h?, y?]]`** (beats): the cut sits in a box across
  the frame (centred, or at `y` 0–1 down it), `h` tall over its width and reframed on the subject. Without
  `h` it shows the whole wide picture as a strip. The box is that cut's window: big words, cutouts and
  warps fit it, and its own warp filter is made per box height. The rest of the frame is the theme's
  ground.
- **`swap(block, i, j, cuts)`** (edl.ts): a block with cuts [i, j) replaced, same length enforced.
- **`split` / `splitAt`:** panels stack top to bottom (full width), sliding in from alternate sides,
  each cropped on its subject.
- **Text:**
  - Sizes are capped at a landscape frame's of the same width (`typeH`).
  - Captions sit at 70 % of the height in 9:16 (87 % in 3:4 and 4:5), larger, shadowed, in two
    balanced lines when long.
  - `bar` words and `label` sit at 19 % (12 %).
  - There is no meter, HUD or corner readout. Tension bars close in from the top and bottom.
- **Kit:**
  - `ProjectDefinition.window: { from, to, fadeIn?, fadeOut? }` (song seconds) shifts the song's
    timeline so the video shows that stretch.
  - `slug` names the project folder when the composition id differs.
  - `src/Root.tsx` registers `projects/<slug>/shorts/<id>/index.tsx` (an array: one composition per
    format).
- **`FORMATS`:** 9x16 1080×1920 · 3x4 1080×1440 · 4x5 1080×1350.

## Gotchas

- **Never crop by sliding an oversized image:** an image wider than its window shifts the SVG filters'
  pixel space (warp, motion blur), and Chrome clipped the picture to a sliver or to black. Crop
  inside the image (`object-position`), as `placed()` and the stacked split do.
- **Frozen video in a shifted song:** `<Freeze>` pins the timeline at its frame plus the nearest
  `Sequence`'s start, and Remotion clamps that to the composition's length. A cut's Sequence starts
  at its song time, so in a short it lies past the end: the video showed the wrong frame or nothing (half
  the cuts black). `Frame` puts each Freeze in a Sequence of its own. Check a short with
  `stills --cuts`: every cut should show the shot the long edit shows there.
- **`remix --short`** rewrites `video/footage.json` and `anchors.json` from the shared data. Slow-motion
  clips stay listed, so the long edit keeps its slowed cuts.
- **A recast block** must span exactly the beats of the block it replaces.
- Remotion forwards no browser console to the CLI: to debug a frame, render it through
  `@remotion/renderer`'s `renderStill` with `onBrowserLog`.

## Timing budget (this machine)

`pick` a few seconds; stills ~1 min a batch (most of it bundling), `--cuts` sheets ~2–3 min a short; a
full 9:16 render at CRF 18 runs about 2.5× the short's length (hitixf1: 46 s → 121 s, 33 s → 69 s,
41 s → 96 s; three shorts ≈ 5 min), 30–60 MB each.

## Lessons log

Append dated entries: what the user asked to change and the general rule behind it.

- 2026-10-26 — Created from make-video-music-remix. The user's rules: three different stretches per run,
  checked with them before editing; three finished shorts per run; the formats chosen by the user every
  run; a re-cut of a stretch is fine unless they called it bad; no AI upscaling unless they ask (ask
  before suggesting it); the sharp alternative is several moments of the video in one frame, "more
  edit-like".
- 2026-10-26 — Engine test on hitixf1 (hook-1 → drop-1 in 9:16 and 3:4). The first reframe rendered
  black: oversized images clip under the warp filters; cropping inside the image fixed it. Wide renders
  were unchanged (a frame compared with v8). A 2.39:1 1080p source is enlarged 2.4× in 9:16: bands and
  stacked splits stay sharp.
- 2026-10-26 — First run (hitixf1). Judging the picks by hand showed what the scores missed, now in the
  picker: a pick starting on "…down" of "Tear the sky down" (start one bar earlier, on the line), a pick
  starting mid-word on "Racer" with a 20 s quiet bridge in the middle, a near-duplicate of the best pick
  let through by a "different kind of section" rule (both drops counted as the same kind; overlap alone
  decides now). Starts where the drums come in are candidates; ends land on phrase ends.
- 2026-10-26 — hitixf1 run 1, the user's choices: a hard hit in the first second beat a clean lyric
  start (C, opening on the drop's last hit inside "Racer", over G, opening on "Yeah, yeah, yeah"). They
  asked for "other suggestions, especially towards the end" and took two end stretches that share a
  verse (17 s). So offer the song's end even when it overlaps a pick, and accept overlapping shorts the
  user chooses, cast differently. Named stretches (`--extra`) start on any beat, since a spoken bridge
  starts between bars. 9:16 only this time.
- 2026-10-26 — hitixf1 recast (s01–s03). The `stills --cuts` sheet of every cut found that half the
  cuts rendered black (the Freeze offset, now fixed in Frame) before any casting question. Then the
  layout calls:
  - The long edit's black-and-white bridge as a widescreen strip left the phone frame mostly black. A
    0.9 box with a bold word above and the typed line inside its bottom edge kept the faces big.
  - The second verse shared by two shorts (s02, s03) was cast differently: s02 full frame, s03 with
    stacks, a 0.75 box and two unused shots.
  - A panel holding a black last frame, a leftover caption from the bridge, a RACER `pop` card and a
    pixel-sized sign-off were each fixed and are now rules above.
