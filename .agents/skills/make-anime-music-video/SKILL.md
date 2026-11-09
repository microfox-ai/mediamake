---
name: make-anime-music-video
description: Make a high-effort anime music video (an AMV, but more detailed) in Remotion from a song and footage of one character. Research comes first: popular edits on YouTube and Pinterest, downloaded as references and cut into technique clips, on a File Revisions board the user picks from. The song is read as the character's story, and the edit matches the song's feel. An epic, slow song gets the story edit: twixtor takes throughout, one shot per sung phrase cut on the beat, white stacked bold captions (the summerstyle shorts' type, font picked from snaps), each moving the way its words mean (motion typography researched on Pinterest: masks, cut-outs, trembles, echoes, dust, shatters, all with motion blur), Goten band glitches and old-TV blinks, aura on the power shots. Its full-speed drum fills (drum map) get a shot on every hit, bass-drop punches, match cuts and morphs. A fast, driving song gets UnClonable's flowing edit: match-cut runs framed by a match finder, mask cuts, portals, liquid morphs, heavy in-scene type. Every transition on a beat, every take once across packs. Reviewed at half size through Revisions (revise-video). Builds in apps/studio with src/amv and scripts/amv.ts. Use when the user says "make an AMV / anime music video / anime edit of <character> to <song>", "research anime edits and make a music video", "/make-anime-music-video", or asks to change a project with a video/cut.ts. Not for lyric videos from artwork (make-lyrics-video, make-waveform-lyric-video), footage re-edits of films (make-video-music-remix) or shorts. New user feedback goes in your notes (mm notes add), never in this file.
metadata:
  category: make
  depends-on: analyze-video, revise-image, revise-video
---

# make-anime-music-video

A song about one anime character, the character's footage, and a finished music video that stands
next to the best edits on YouTube. Built on 2026-11-02 for "The Honoured One" (Gojo, Anime Music
Zone, `projects/honoredone`): the user asked for an AMV "but more detailed, more awesome", research
first, their picks before any storyboard, then "a high effort video edit".

Loose inspiration only from the older video skills; nothing here depends on their engines.

## First: check the MCPs

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/browse-hack` | required | The research: reference edits from YouTube (`youtube_download`) and Pinterest boards (`pinterest_bulk_start`) in the user's Chrome | No research board: the user brings the references by hand |
| `mcp/elevenlabs` | required | Its API key: the song's timed words (`mm transcribe --yes`, Scribe on the vocal stem's MP3; not its own `speech_to_text`) | The hosted ElevenLabs connector's `creative_transcribe_audio` then `--save` instead, or the user brings a timed `lyrics.json` |
| `mcp/elevenlabs-connector` | optional | The alternative where no local MCP runs (the Claude web or phone app): `creative_transcribe_audio` on the vocal stem's MP3, then `--save` | Nothing, while the ElevenLabs MCP's key is set up |

Look for the tools named above (`mcp__<name>__<tool>` in Claude Code; a connector added in the
Claude app has a random prefix, so match on the tool's name; load deferred ones with ToolSearch).
If one is missing, say at intake what it costs and offer to install it from MediaMake ("Set up
mcp/<name> from MediaMake by following
https://github.com/microfox-ai/mediamake/blob/main/install.md"), or go ahead without it.

## 1. Intake

- **The song and the footage.** Song from the user's folder (the final master when there is one),
  footage packs in a `footage/` folder beside it: raw clips, twixtor packs, finished AMVs (those are
  references, not footage).
- **Register the production:** `media production new <slug> --channel=<brand> --title=… --artist=… --skill=make-anime-music-video`,
  then `media use <song id> <slug> --as=input/<slug>.wav` and `input/project.json` (`audio`, `title`, `artist`).
- **The lyrics:** ask for the written lyrics first (Suno's lyric sheet: the text on screen comes from
  it). Run `mm analyze <slug> --only decode,separate`, then transcribe the
  vocal stem with **ElevenLabs Scribe** the house way: `mm transcribe <slug>`
  first (free: the media library's cached words, else the stem's MP3 and the price, ~40 credits a
  minute), quote the price, then `--yes` (`--lang=en`); never a request with the key by hand, and not
  the MCP's own `speech_to_text` (no timings). Write `input/lyrics.json` as the written
  lines on Scribe's times (lines a take repeats or skips follow the audio, not the sheet), then
  `mm analyze <slug> --plots` (beat grid + word alignment). Where the aligner
  and Scribe disagree by more than ~0.3 s, check the stem's energy (lead and backing stems separately:
  choirs live on the backing stem) and place that line with fixed times in the cut.

## 2. Research (before any storyboard)

1. **YouTube:** search pages read through the built-in browser (`ytInitialData` on
   `youtube.com/results?search_query=…&sp=CAM%253D` = sorted by views). Look for: the character's own
   edits, the same theme (the song's title phrase), the most-viewed full-length AMVs of the franchise,
   manga-in-motion (MMV), the "it took me 40+ hours" After Effects school, a few viral shorts.
   Download ~20–25 at ≤1080p with Browse Hack `youtube_download` into
   `_INBOX/youtube/<slug>-refs/` named `r01 <channel> - <title>`.
2. **Pinterest:** `open_tab` on `pinterest.com/search/videos/?q=…` and `/search/pins/?q=…`, then
   `pinterest_bulk_start` (40 a page) per search: the character's edits, transitions, aesthetic
   wallpapers, manga panels, the technique's look, typography posters, overlays. Video searches mostly
   save cover frames; that's fine for looks.
3. **Analyse:** the user's own references with `analyze-video` (`--min-shot 0.08 --cut-ratio 2.0`,
   cached in the library); every reference gets a 24-frame overview sheet and cut stats (cuts/min,
   median shot). Look at every sheet; name the devices each one uses.
4. **The board:** `out/research/<slug>-research/` with `index.json` (mediamake.image-set/v1,
   `workflow: make-anime-music-video`): groups A (their refs) · B (same theme) · C (full-length story
   AMVs) · D (manga in motion) · E (high-craft AE) · F (shorts) · **T (technique clips, 2–15 s, one
   device each: the group they pick from)** · P/M (pins) · O (overlays: a sheet of what the library has
   + new ones) · I (song map + your own ideas as cards). Videos and stills are APFS clones (`cp -c`).
   Link: `https://mediamake.microfox.app/file-revision?job=<slug>-research`.
5. **Your own ideas** go on the board as cards, each naming the board items it builds on. The song map
   (loudness, drums, vocal per section, a chapter per section) is item I01.

The user's picks come back as `rev-001` (revise-image). A comment "take this as prime inspiration"
makes that reference the target: build to its standard, compare stills side by side.

## 3. Match the edit to the song first

Two rejections taught this (honoredone, 2026-11-02): a cut of whips, flashes and dips with words on
top ("do not like it one bit"), then a Darkside-style flowing edit on an epic, half-time song ("this
is more of a slow mo video"). Before choosing devices, read the song: `uv run --script
scripts/amv-drums.py <slug>` charts drum onsets per bar and writes `analysis/drummap.json`.

- **Epic or slow** (half-time drums, 3–5 onsets a bar): the **story edit** (honoredone v4).
  - Twixtor (slow-motion) takes throughout.
  - Every sung phrase of 1–3 words is its own shot, cut on the beat before it (`c.story`).
  - Captions are the summerstyle stacked bold words in white (`c.say`, style `stack`), on the side away
    from the subject.
  - **Every caption moves the way its words mean** (`mo`, `src/amv/motion.tsx`; honoredone v5). Each
    caption has an entrance landing on the sung beat, holds and an exit, white only. Choose by meaning,
    one line at a time, never one default for all:
    - the mask: a band cut through the letters;
    - dread or tremble: tremble plus shake, behind him on his matte;
    - stars: twinkle; align: assemble; fall: drop and fall;
    - a bounty: a scope locking on;
    - a never-arriving reach: `zeno`;
    - divided: split; burn: heat, embers, burn;
    - alone: behind him with `reflect`;
    - tears: drip; void or infinite: `infinite`, then implode or dive;
    - empty: `hollow` outlines; the architect: `build`.
    Research the motion on Pinterest first (motion typography, kinetic typography, text behind subject,
    glitch text, mask reveal) and put the ideas taken on a File Revisions board beside lab tests of them.
  - Between phrases: dissolves, blur-ins, Goten band glitches (`bands`), old-TV blinks (`blink`), and
    aura on the power shots.
  - The fast devices only where the drums go full speed (fills of 6+ onsets a bar, rolls, the climax):
    a shot on every drum hit on the grid (`c.hitsIn` + `c.seqAt`), with bass-drop punches (`fx: 'bass'`)
    and match cuts, flashes, band glitches, zooms and morphs. Raw clips can join there.
- **Fast and driving** (dense drums all through): the **flowing edit**, the standard of UnClonable's
  channel ("Darkside「AMV」Anime Mix", 44M views). Device by device:
  `projects/honoredone/research/unclonable/NOTES.md`.
- Either way, **every transition lands on a beat** (or on a drum hit on the sixteenth grid in the fast
  stretches): check it before rendering (the cut list's times against `timing.beats`).

The flowing edit (UnClonable):

- **Most of the song flows:** every cut has a reason, and the edit never stops.
  - Match-cut runs a beat each: eyes, smiles, hand signs, framed so the feature lands on the same spot.
  - Mask cuts: the new subject arrives first, then his world.
  - The subject held while the world behind him changes.
  - Portals through round things (an orb, an iris, a ring of fire).
  - Liquid morphs, smoke dissolves, blur-in focus pulls, bloom-out pushes into an RGB-split blur-in.
  - Aura on the subject, lightning and impact frames on the hits.
- **The detailed kinetic-type edit** (the research picks R02/R12, the user's own refs) goes only where
  the song stops for it: narrated intro lines, a quote, a drumless void.
- **The type is big, heavy and in the scene:**
  - Giant words a beat each, often behind him.
  - Thin spaced caps over a heavy italic word with a glowing outline.
  - Brush words stacked down the free side, one key word in colour.
  - A giant outlined word behind him.
  - Letters burning with his energy.
  - The footage inside the letters, diving through into the next shot.
  - Small subtitles only for story lines.
- **Colour:** the anime's own, punched up (`grade: 'clean'`); the chapter colour comes from the energy
  (aura, portal rings, liquid light), never from washes over the picture.

## 4. The story and the footage

- **The song is the character's life.** Most character songs walk through their story in order: map
  each section to an era (birth, the gift, the power, the turning point, the cost, the teacher, the
  last stand), each with its energy colour. Hits get the iconic moments; drumless bars get the quiet
  ones and the quote.
- **The same footage twice:** packs re-use each other's scenes (a twixtor pack of the raw scenes; one
  pack held every scene twice). `scripts/amv-match.py` finds them (`dups`) and the cut warns when two
  of them are used.
- **Catalogue the footage:** `analyze-video` on every pack (cached), then
  `python3 scripts/amv-index.py <slug>` → `video/footage.json` (every shot's source range by sheet
  number) and `video/timing.json` (beats, words). Read every `shots_*.jpg`; two packs with the same shot
  count may be one pack regraded (compare frames: PSNR) — use one.
- **Proxies:** every pack as a 2560×1440 H.264 proxy with a short GOP (`derived/src/<id>.mp4`,
  videotoolbox, background priority): 4K AV1 originals are too slow to seek in a render.
- **Overlays:** library first (`media find --kind=overlays`), then Pexels: the page's `__NEXT_DATA__`
  lists each result's mp4 files; download into `_INBOX/pexels/<slug>-overlays/` with
  `mediamake.source/v1` sidecars, `media ingest … --kind=overlays`, `media use … --as=input/overlays/<name>.mp4`.
- **Watch for burned-in text** (watermarks, subtitles) in packs: crop it with `z`/`y` on every take.

## 5. The cut list (`projects/<slug>/video/cut.ts`)

Written with `src/amv/build.ts`: `seq(start, section, shots)` lays shots end to end in beats;
`s: 'ftw:39'` = shot 39 of pack ftw (sheet numbers), `off` = seconds into it, `'black'` = no picture;
`w('blindfold')` = when that word is sung (`w(text, n, after)` = the n-th match after `after` s: count
from the word you mean); `b(329)` = beat 329. Words, overlays, pieces and sound effects are placed by
beat or word. `export const make(footage, timing, match?)` returns `{ cut, warnings, jobs }`.

**Match cuts:** run `uv run --script scripts/amv-match.py <slug>` once the packs are catalogued.
- It cuts out the subject in every shot's first, middle and last keyframe and finds the eyes (Gojo's
  irises by colour: `--eye-hue` for others).
- It writes `video/match.json`: the descriptors, `dups` (the same footage twice), the best silhouette
  and eye-line pairs.
- It draws sheets in `research/match/` showing A | B | both overlaid: pick runs from these.
- A shot with `align: 'eyes' | 'shape'` is framed (x/y/z) so its subject lands where the previous
  shot's was at its end. The previous shot pushes in when the new one would have to zoom out, and the
  cut warns when a pair can't line up within ×1.9 (pick a closer pair).
- Extreme close-ups have no cut-out, so the finder misses their eyes: put those runs on their natural
  framing, eye line to eye line.

Rules that held:
- A section's cuts end exactly on its boundary beat (`at(t, beat, name)` warns otherwise).
- **Every take once, across packs too:** `cut()` warns on any repeated stretch of a source and on two
  shots `match.json` calls the same footage. The warning list must be empty.
- A shot never asks for more footage than it has (rate it down, or pick a longer take).
- Cut on the beat before a lyric line, never mid-word; fills of a cut a beat into the hits.
- Words in free space, never over the face (brush stacks go down the free side); big words only on
  the beats that earn them; one face per job.

**The story edit's helpers** (build.ts):
- `c.font('racing')`: the face of every caption (fonts.ts `STACK_FONTS`). Show the user snaps of a few
  faces on their footage (the `amv-lab` `type` device, a File Revisions board) and let them pick.
- `c.story(a, z, section, entries)`: each entry is `{ say: 'the mask', s: 'ftw:60', …shot }`.
  - It starts on the beat at or before the phrase's first sung word.
  - An entry without `say` runs `beats` after the one before it.
  - `cap` overrides a caption's sung times or place, for where the aligner drifted (choirs, pickups).
- `c.say(text)`: a caption alone (inside a fast stretch). Captions find their words in order from a
  cursor, so call them in song order.
- `c.hitsIn(a, z, gap)`: the drum hits snapped to the sixteenth grid.
- `c.seqAt(a, z, section, items, cuts)`: shots at those cuts.
- A take shorter than its slot holds its last frame (the camera keeps moving). Warned when it would
  freeze for more than half the shot: slow it (`rate`) or pick a longer take.
- Captions over bright frames get a dark pool under them (match.json `luma`); white words only, never
  coloured, never black.
- In honoredone's cut.ts, `fast()` runs after the whole story is placed and skips any clip the story
  uses or its twin. Copy that pattern.

`mm amv <slug> --list` prints every shot (with its framing, matte, aura,
worlds) and the warnings, writes `video/shots.json` (the Revisions shot map) and `video/overlays.json`;
`--stills` grabs the frames pieces use; `--matte` cuts the subject mattes the cut asks for (BiRefNet,
`scripts/matte.py`, ~3 frames/s). Never run `mm map` by hand for a clip: it rewrites the main
render's map (`render-project` maps clips itself).

## 6. The engine (`src/amv`)

- `Amv.tsx` — the composition layer: the shot track (and the shot before it during overlapping
  transitions: fade, shatter, eye, the GPU liquid/portal/smoke, the mask cut), overlays, set pieces,
  words, top overlays, flashes, sound effects.
- `Shot.tsx` — one shot:
  - The camera: `x/y/z`, `push`, `drift`, `rot`, `shake`, `kick`.
  - Speed: `rate`, `ramp`, `snap` (speed.ts: fast, then dropping into its own slow motion as the line
    lands), `reverse` (a pull-down played backwards puts the blindfold ON), `hold`. A take too short for its
    shot is slowed to fill it (build.ts, speed.ts `fillFactor`, down to 0.3×), never frozen on its last frame.
  - `strobe` {at, looks, glitch}: the same shot flipping looks on beat times (invert, nbw, thresh, diff, neg,
    bw, hot), a punch on each flip, a colour split with `glitch`. This is the "Nah, I'd win" moment; on a long
    shot, inverted snaps a quarter beat long on every beat.
  - The transition it enters with (`tin`, frames in `tlen`):
    - `match`: a hard cut with a small kick.
    - `liquid`, `smoke`: GPU, along `dir`.
    - `portal`: GPU, at `portal` {x, y, color}.
    - `mask`: his cutout first, then his world.
    - `blurin`, `bloom`.
    - `bands`: the Goten glitch, horizontal bands of both shots shoved sideways with a red/blue split,
      a few inverted, strongest on the cut.
    - `blink`: the old TV, squeezing to a bright line and opening again.
    - **The smooth cuts** (GPU `ZOOMT`, Amv.tsx `smoothMove`; 4 frames out + 7 in, real motion blur over
      14 taps, mirrored edges):
      - `push`: the old shot zooms in, faster and faster. The new one carries the zoom on and eases out;
        its camera settles 14 % in (`SETTLE`).
      - `slide-l|r|u|d`: the same along a direction.
      - `warp`: a deep push with a lens bulge, both shots melting over 2–3 frames. This is the match cut's
        continuity.
      In the story edit, dissolves become push / slide, blur-ins push and match cuts warp, except in the
      drumless quote, the outro and drum-punched fill shots.
    - The old set: `whip-*`, `zoom`, `flash`, `dip`, `eye`, `iris`, `glitch`, `shatter`, `fade`.
  - The grade (`clean` for the flowing edit) with highlight bloom.
  - Effects: `glow`, `rgb`, `impact`, `neon`, `posterize`, `tilt`, `bass`. `bass` is the Inverted Devils
    jolt: on every drum hit a zoom punch, a shove with motion blur, a split and a flash.
  - With a `matte`:
    - `aura` {color, amt, dim, rise}: energy off him, the world dimmed under the words behind him.
    - `worlds`: him held while plates change behind him.
    - The old subject effects: `echo`, `arms`, `rim`, `silhouette`.
  - `paint` {color, dir, cov}: liquid paint streaming over the shot.
- `gl.tsx` — `GLPass`, one WebGL2 canvas per pass:
  - Its inputs are exact-time frames from OffthreadVideo's `onVideoFrame`, plus 2D canvases (letters).
  - The frame is held with delayRender until every input of the frame has arrived.
  - The shaders: `AURA`, `LIQUID`, `SMOKE`, `PAINT`, `PORTAL`, `KNOCK`, with simplex noise, curl, the
    CSS colour filters and the shot camera inverted.
  - Remotion's own `effects` take one image; these passes need two (shot + matte, shot + shot).
- `type2.tsx` — `stack` (the story edit's captions: the summerstyle shorts' stacked width-fit rows,
  white, a word lit as it is sung, clamped inside the frame); the powerful set of the flowing edit:
  - `slam`: 'I / AM / THE / ONE', a unit a beat, flash + RGB split + shake, `behind` with a matte.
  - `lockup`: a thin spaced `sub` over a heavy italic word with a white outline and glow.
  - `brush`: Knewave, a word a beat stacked down the side, the `key` word coloured.
  - `outline`: a giant outlined word behind him.
  - `burn`: the aura on the letters, which stay crisp with a dark halo.
  - `knockout`: a `clip` inside the letters, `exit: 'dive'` flies through.
  - Sizes are fitted with the loaded faces (`useFontsReady` holds the frame until they are).
- `motion.tsx` — a `stack` caption with `mo` set, drawn letter by letter on a canvas, with real motion
  blur (sub-frame samples):
  - Three canvases: the letters (T); T after masks and displacement (F: glitch, heat, ripple, the band,
    wipes); the composite (shadow, glow, copies, pieces, particles, marks).
  - `in`:
    - `rise`, `drop`, `assemble`, `throw`, `step`, `pop`, `focus`, `decode`;
    - `build` (outlines on guide lines, then filled), `spin` (T018's camera roll);
    - `slam` (an impact shake and a ring);
    - `twinkle`, `zeno`, `creep`, `form` (out of particles), `drift`, `descend`, `flip`, `stretch`, `cut`.
  - `hold`:
    - on the letters: `tremble`, `wave`, `arc` (a smile), `space`, `reach`, `shimmer`, `hollow`;
    - on the whole caption: `breathe`, `shake` (also on the cut's drum hits), `flicker`, `glitch`,
      `heat`, `ripple`, `reflect`, `shadow`, `infinite`, `echo` (n copies each side), `rays`, `drip`,
      `glow`, `sweep`, `pulse`, `embers`;
    - marks: `target`, `stars`, `band` / `unband`.
  - `out`:
    - per letter: `blur`, `fade`, `fall`, `sink`, `rise`, `slip`, `flip`, `implode`;
    - the caption as one image: `dust`, `burn`, `erase`, `dark`, `shatter`, `split`, `slice`, `smear`,
      `dive`.
  - In cut.ts: `mo: m('focus', 'slice', 'tremble', 'shake')`, plus `behind: true` on a matte shot.
  - **The lockup and its place:**
    - Every caption is ATOMIC RAP's lockup: the big word (`hero`, by default the longest word that isn't
      a small one), the words before it small above (flush left), the words after it small below (flush
      right).
    - `tier` sets the big word's capitals as a share of the frame's height: s 6.5 %, m 11 %, l 17 %,
      xl 42 % (filling the screen).
    - The box goes where it covers least of him, his head counted three times. It also avoids bright
      patches, and shrinks to 58 % of its size if it has to. The map behind this is `video/space.json`.
    - To make that map: render the composition with `--props='{"clean":true}'` (no words, quarter size)
      into `analysis/clean/clean.mp4`. Then run `mm amv <slug> --captions`, then
      `uv run --script scripts/amv-space.py <slug> --sheet`. Redo it whenever captions move.
  - **The xl `look`:**
    - `outline`: a fine stroke, the picture showing through.
    - `cutout`: the fill behind his matte and the outline over him. It needs the shot's `matte`, so
      check the matte over magenta: a shot with no clear figure, such as crosshairs on an eye, can't
      be a cutout.
    - `window`: black, with the footage inside the letters. It suits a `dive` exit.
  - **The footage moves under the words** (`bgAt`, Amv.tsx): punch on each word's beat, shake, focus
    (racked in as the word lands), defocus and dim behind a giant word, push, pull, roll, zoom into a
    dive. Each move follows from the motion by default; set `bg` to choose it by hand.
  - Exits wait until the last word has landed (+0.3 s): an exit that eats the big word before it's read
    reads as a bug.
  - Outline legibility: a thin white stroke disappears on a bright frame (the light over the macro eye). So
    outline words get a tight dark halo around the stroke, but never a dark pool or a dimmed shot
    (rev-002). On a bright frame, make the word a mask or blend an overlay into the clip.
  - More motion: `write` (a pen-of-light wipe, for a word that starts with the voice), the `zoom` hold (a
    slow push into a mask while the cuts go on inside it), the `away` exit (carried off sideways with a
    hand, `dir`), and `flat` (solid white, no shadow).
  - Lab tests come from the real cut (each caption over its own shot). The lab's framing is rough, so
    check placement in a proof render.
- `type.tsx` — the detailed-edit set: `kinetic`, `hero`, `serif`, `subtitle`, `kanji`, `behind`,
  `pill`, `nameplate`, `stamp`.
- `pieces.tsx` — `rings`, `halo`, `constellation`, `split`, `voidgrid`, `reticle`, `clock`,
  `letterbox`, `flash`, `eyeslit`, `sixeyes`, `title`.
- `look.tsx` — the exact-time `Frame` (frozen OffthreadVideo, so ramps and holds are just times), the
  grades with their GPU twins (`CC`), the energy colours (`ENERGY`), SVG filters.
- `fonts.ts` — Anton, Exo 2 italic, Knewave (brush), Dela Gothic One (kanji slams), Montserrat, Cinzel,
  Cormorant Garamond, Shippori Mincho B1.
- `Lab.tsx` + `mm amv-lab <jobs.json> [--video]` — one GPU device on any
  footage, many tests per bundle (stills side by side, or a clip): tune a shader here before the cut
  uses it.

## 7. Check, render, review

0. **A new direction starts with a proof:** one stretch (the pre-chorus and first hook) built to the
   standard and rendered at half size as a clip (`render-project <slug> --proxy --frames=a-b`), before
   the whole song is re-cut.
1. `npx tsc --noEmit -p apps/studio` clean.
2. **Cut-outs, checked twice:** composite each matte over magenta at four times (`-c:v libvpx-vp9`
   decoder so the alpha survives, accurate seek with `trim`), look at the edges and the coverage
   (`<id>.stats.json` area per frame).
3. `mm stills <slug> <seconds…> --only` at every device; fix what reads badly
   (dark words, washed-out lines on bright frames, blown-out grades, burned-in text) and re-render those.
4. Render in chunks (full renders die on memory): `remotion render … --frames=a-b --muted
   --concurrency=4 --offthreadvideo-cache-size-in-bytes=800000000` per 1,200 frames with retries (~2 min
   each), the audio mixed once with ffmpeg (`mm amv <slug> --audio=<file>.m4a`),
   joined with `ffmpeg -f concat … -c copy` into `out/<slug>/<slug>.mp4`;
   an older render moves to `out/<slug>/v<N>/` first. `mm map <slug>` for the shot map.
5. Review renders at half size, preflight, then the link (revise-video):
   `https://mediamake.microfox.app/video-revision?folder=<slug>&video=<slug>.mp4`
   (a clip: `folder=<slug>/clips&video=<clip>.mp4`)
   (revise-video). Deliver with `media deliver` only after the user approves.

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add make-anime-music-video "<what the user said> → <the rule>"   # a new lesson, dated for you
mm notes make-anime-music-video                                           # your notes for this skill
```

When the user wants them shared, `mm notes promote make-anime-music-video` offers them to this log as a pull request.

- 2026-11-02 · honoredone intake: "research popular anime edits… show me research material, I will
  tell which ones are good… you give me your own ideas as well… storyboard ideas after initial research"
  → research and the File Revisions board come before any storyboard; your own ideas are cards on it.
- 2026-11-02 · honoredone rev-001: "take this as prime inspiration" (R02, Chef.'s kinetic-type Gojo
  edit) + "this is also good source of inspo" (R12, Molob) + "I will let you choose the rest for the
  first edit, just make sure it is high effort video edit" → a prime reference is the standard to build
  to; the rest of the picks are yours; v1 goes straight to a full render.
- 2026-11-02 · honoredone: the user pasted the written lyrics after v1 (local whisper had "Not when"
  for "Nah, I'd win", "My own honor" for "I alone… honored…", missed "Let 'em see" and both
  "Kyrie eleison") + "use elevenlabs for transcription, its fast and better" → written lyrics before
  any timing, ElevenLabs Scribe for the times; the character's famous lines get their own moment.
- 2026-11-02 · honoredone render: the Remotion `--codec=aac` audio pass ran the whole composition again
  (15+ min) → mix the song and the cut's sound effects with ffmpeg (`mm amv <slug> --audio=…`,
  one limiter at -1 dBFS) and join it to the chunks.
- 2026-11-02 · honoredone v2: "do not like it one bit… the references I gave is only for parts of the
  music where a highly detailed edit is needed, the rest is primarily full-fledged match cut or mask cut
  transitions, liquid morphs, aura effects… the typography also has to be much more powerful" + the
  standard: UnClonable's "Darkside「AMV」Anime Mix" ("all videos on this channel are good amv") → an
  AMV is carried by its transitions; the kinetic-type detail (R02-style) only where the song asks for
  it; type big and heavy. A cut list of whips, flashes and dips with words on top reads as a lyric video.
- 2026-11-02 · honoredone v3 proof (Darkside-style flowing edit): "this music does not match
  something like that, as this is more of a slow mo video. this is more of an epic video… use twixtor
  shots throughout, except for when the beat goes extreme fast… match cut, morph effect, bass drop
  zoom effects… captions simply like summerstyle boldwords on top of twixtor videos… the story is more
  important… use the glitch transition effects done in the goten video… every transition MUST match
  with a beat… >200 shots… just a suggestion" → match the edit to the song's feel before the
  reference: an epic, slow song gets slow-motion takes and the story; fast devices only where the
  drums go full speed. Every transition on a beat. Captions as stacked bold words (the summerstyle
  shorts' type), font picked by the user from snaps.
- 2026-11-02 · honoredone v4 font snaps: "split the lines into more shots (lots of shots), too much
  text" + "do not use text colors (only white). use racing sans, that look better" → a caption is 1–3
  words and gets its own shot; captions are white only; the face was picked from snaps (Racing Sans
  One for this song).
- 2026-11-03 · honoredone v4 review: "i like the overall shot sequence, but i feel the typography can
  use a lot of creativity, look into some pinterest motion typography for ideas, the font fits, but not
  the animation, the text effect should really match the meaning and the aura (you can use masks,
  cutouts, vibration, blurs, shakes, anything that gives polished edit feel)".
  The rule: a fade-in and lighting each word is not motion typography. Every line gets its own
  entrance, hold and exit, chosen for what it says (motion.tsx), with motion blur and white only.
  Pinterest motion-type research comes first.
  Pinterest pins land in the inbox, and its watcher files them by the folder's name, so a folder named
  after the production filed them as the character's footage. Move them to `references/<topic>` with
  `media mv` and re-tag them.
- 2026-11-03 · honoredone v5 proof: "still not good… place them at suitable positions based on the
  underlying clip (current placement blocks 80% of the underlying clips)… they can be smaller… use more
  cutouts or outlined text for BIGGER words so that underlying will be visible. take visible inspiration
  from atomic rap edits, for stuff that comes as one word filling the screen… you can animate the video
  in background, by zoom, camera shake, blur focus pull…".
  The rules:
  - A caption never covers most of the picture. Place it from the shot's own free space (the clean
    render → `scripts/amv-space.py` → `video/space.json`), and size it by how much the line matters
    (`tier`).
  - Every line is a lockup: one big word, the rest small (ATOMIC RAP's).
  - A word that fills the screen is an `outline`, a `cutout` (behind him, outlined over him) or a
    `window` onto the footage, never solid.
  - The footage moves under the words (`bgAt`).
- 2026-11-03 · honoredone v6 proof: "speed up a twixtor shot and suddenly use a normal speed… transition
  between clips should feel smooth… zoom in and cut and continue zoom in on next shot, use ease-out, same for
  left translate, right translate… very fast… morph effects if you are zooming too much giving it a warp
  feel… continuity in the match cut… the eye in binds on 'my sight', bounty shows Toji shots… camera shakes
  are good… the same shot with multiple blend effects in inverted, rapidly transitioning with beats (Nah, I'd
  win)… the climax only epic Gojo shots, no past; past shots with other people only where the verse makes
  sense… small wording like 'The smile' good, big filled words like TREAD bad, big outline words good
  (if they stay), mask big words good… pacing is good".
  The rules:
  - Story cuts are smooth GPU moves on the beat (push, slide, warp).
  - Key lines `snap` into slow motion.
  - The character's iconic line strobes the same shot.
  - Shots follow the lyric's subject. When a line names someone (the bounty, the hunter), show them, even
    from another production's footage (`media use` + `cache put`/`get` for its analysis).
  - The climax is the character alone at full power. When the unseen footage runs out, use later stretches
    of earlier power takes (`again`), never someone else.
  - Big words are outlines or masks; solid words stay small.
- 2026-11-04 · honoredone rev-002 (26 notes) + "many a times you are dulling the shot to make the text
  visible, don't do that, the alternatives are use mask, or use a blend effect of the underlying clip with
  a good overlay… sometimes color burn, sometimes color dodge, sometimes soft/hard light… dependent on the
  overlay and the clip" + "remove all flip transition where video appears to be flipping by collapsing to
  center".
  The rules:
  - Never darken a shot for the words: no pools, no dim, no aura dim. Use masks (cutout like Hit It,
    windows), or blend one of the user's overlays (apps/studio/overlays: survey them with a contact
    sheet, `media use` them in) with the mode the overlay and the clip need.
  - No old-TV collapse.
  - No decode-scramble or twinkle text effects: they're hard to read and not smooth.
  - Captions leave with their own shot.
  - Big words over fast cuts are masks, with the cuts going on inside and a slow zoom.
  - Captions start where the voice is heard, not where the transcript says.
  - Shots show what the line literally says (the body, the head, the eye in the bandages, him standing).
  - A strobe ends in colour: the inverted flashes on the words, then the shot settles in colour and holds
    (honoredone, after v8: "should have the inverted blend flash effects, it should just settle at color
    finally"). `strobe.looks` with 'none' last.
  - The takes cut inside a window mask must be bright where the word is biggest: a dark take hides the word.
- 2026-11-04 · honoredone rev-003 (15 notes on v8) + "use this overlay in fast edits at the end sequence".
  The rules:
  - Never freeze a take that runs out: slow it to fill its shot ("the video is freezing and it feels odd, slow
    mo the video if needed to fill gap").
  - A dive into a mask word comes right after the word lands, and fast (`mo.outDur`), not at the end of a long
    hold ("the zoom in should happen earlier", "extreme fast"). No trailing dots in a big word.
  - A long shot gets inverted snaps on the beats (`strobe` with `glitch`).
  - A held word still leaves with its shot.
  - Overlays: no colour fire over a red fire shot; a colourful overlay that hazes the frame goes grey and
    colour-dodged; an overlay can be cut on the beats in a fast stretch (`edge: 0`, a new `in` on every cut).
  - The last shot lands its action on the last hit, then fades slowly to black with the sound's tail (`tlen`).
  - Text may be black where the user asks for it (`color` on the caption).
