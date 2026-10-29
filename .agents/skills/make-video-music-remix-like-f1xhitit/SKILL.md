---
name: make-video-music-remix-like-f1xhitit
description: Variant of make-video-music-remix in the style of the F1 × Hit It edit (projects/hitixf1, signed off 2026-10-25) — a high-aura racing / sports song edit for a rap or hype track: black-and-white long real-speed takes in the intro, colour bursting in on verse 1, verses cast literally on a steady one-beat pulse, hooks, drops and the bridge each following one scene in order, smooth warp zooms and a speaker pump on every kick, wide-tracked Michroma captions in the bottom bar with only punch words big (Anton), natural colour (no colour devices), slow motion only in the bridge, a "<footage> × <song>" collab title lockup and the channel's sign-off. Use only when the user names this variant or asks for an edit like F1 × Hit It / the f1xhitit style; otherwise make-video-music-remix. Append new user feedback to the log at the bottom.
metadata:
  variant-of: make-video-music-remix
  forked: 2026-10-25
---

# make-video-music-remix-like-f1xhitit

> **Variant of `make-video-music-remix`** (forked 2026-10-25), modelled on **f1xhitit**. Everything below is make-video-music-remix as it was that day, plus what this variant changes. Improvements to make-video-music-remix don't flow in by themselves: port the ones that fit.

## This variant

The look of **F1 × Hit It** ("Hit It" by Get into Zone × *F1: The Movie in 4 Minutes* + *Lose My
Mind*, for the ATOMIC RAP channel): eight renders and four revisions to a final the user signed
off. The full feedback history is `projects/hitixf1/prefs.md`; the section plan is its
`storyboard.md`, the cut list `video/edl.ts`, the look `video/theme.ts`; the final is
`out/hitixf1/v8/` (v9 = v8 + the channel's end screen). Everything below the base skill's
principles still applies; these rules decide where the base leaves a choice.

**Frame and finish.** 16:9 1920×1080, 30 fps, the footage in a 2.39:1 letterboxed window; the bars
carry a minimal HUD (the channel line), never text in the four corners; rev lights as slanted
white and red blocks. Natural colour with a light film finish. Never a colour device: graded
slices, negatives, mirror collage, RGB glitch, psych backgrounds ("hated the chroma effects").

**Palette and type.** Ground #050505, bone #F2F0EA, signal red #FF2A1F, cyan #22D3FF, acid yellow
#E8FF3A only on drops. Anton for the punch words, Michroma in wide-tracked caps for captions and
the sign-off (the "posh racer" feel), JetBrains Mono for data, Unbounded 900 for the title.

**The section shape.**

| section | picture | juice | words |
|---|---|---|---|
| intro A | one held black-and-white shot, then the collab lockup: the footage's logo, then "× SONG" under it, a striking type effect | whoosh on the slam | — |
| intro B | all black and white: 3–4 long continuous takes at their own speed (no slow motion, no race shots, no story), then a steady one-beat build that ends on a rapid black-and-white run of engine and speed shots into verse 1. **The intro is the hook.** | warp zooms, a light pump, engine rev | — |
| verse 1, 2 | colour bursts in on verse 1; literal casting (the lyric's concrete noun on screen) on a **steady one-beat pulse**, halves only as pairs inside a beat | speaker pump on every kick, warp zooms | captions on every line in the bottom bar; a few big words, each on its own shot |
| pre | the grid in black and white, then the same place from above | bars close in | one big line |
| hook | **one race in its own order** (start, pack, stare, wheel to wheel, corner, helmet) | pump, freeze, echo | captions + big words |
| chant | a chain of warp zooms (eyes → mask → helmet), a punch-in on each word | pump | the chant words, punched in |
| drop 1 | **the same race continued**: the spin in order, back to speed, the pit stop move by move; it must hit hardest | hardest pump, shake, impact frames, clunks | 2–4 big words |
| bridge | black and white; the only place for slow motion (interpolated, never repeated frames); a story in order | sound on its own shot, never sudden | typed subtitles |
| verse 3 | whips, the night race, rain | heavy shake | big words + captions |
| chant 2 | one helmet close-up, punch-ins; the start-lights graphic's **only** appearance | bars close in, rev | the chant over the lights |
| drop 2 | the final race to the flag, in order; celebrations only here | hardest pump, freeze on the flag | big words, no timer |
| outro | walking out; the channel name flanking the character in tiny, very wide-tracked Michroma (left word, right word); no song or artist, no big word | — | — |

Then the channel's end screen, appended after the last shot at −4 dB under the kit, with no brand
intro.

**Juice.** Smooth warp zooms anchored on the subject and the speaker pump between transitions are
what the user loved most: keep them through the whole rap. Motion blur and camera shake on the
drops; impact frames that skip one-frame flashes. Words lead their syllable by 0.15 s; a big word
belongs to one shot (start and end at its cuts) and is gone the instant the next section's first
shot arrives; split screens are one panel per word, landing on the word. Sound effects on many
moments (impact, riser, wheel gun, fly-by, heartbeat, crowd, shutter, swoosh), each on its
picture; a whoosh only on a high-speed shot.

**Casting.** One use per shot across the video (long takes may return at other moments); hooks,
drops and the bridge in scene order, verses free to jump; the hero stays the subject; budget the
footage per section before casting; run the repeat check before every render.

**Never.** Footage slower than 1× outside the bridge; colour treatments; a motif shown more than
once (the start lights); timers or readouts over close-ups; corner text; celebrations before the
final drop; the song and artist in the outro.


Existing footage, re-cut to a song. Four things decide every cut:

- **The song decides *when*:** its beat grid, its sections (by energy, not lyric gaps), its hits.
- **The meaning decides *what*:** the lyric line (or, without lyrics, the music's mood and energy)
  picks the shot that says it.
- **The footage's scenes decide *the order*** where the song soars (hooks, drops, bridges): there the
  viewer follows one scene as it happens.
- **The inspiration and the user's taste decide *how*:** pacing, transitions, type, sound.

Everything lives in `apps/lyrics_videos`, next to the lyric videos: this skill shares their project
folder, audio analysis, stills, render and shot map, so read `make-lyrics-video` steps 2, 3, 7–9
once and use them as written; reviews go through the `revise-video` skill. This file covers what is
different.

Worked example: `projects/hitixf1` — "Hit It" (a rap song) cut to two F1-movie edits, eight
revisions to a final the user signed off (2026-10-25). Its `prefs.md` is the full feedback history;
the F1 examples below come from it, the rules are meant for any footage and any song.

**Taste comes from the user.** Keep `projects/<slug>/prefs.md`: intake answers, the style rules for
this look, and a dated log of every piece of feedback, numbered as the user wrote it. Read the
lessons log at the bottom before planning. Keep what the user praised; recast around it.

## Principles

These held across every review of the first two projects and apply to any re-edit.

0. **The song tells one story, and its hero is on screen.** Before casting a single line, write the
   arc: one chapter per section (who the hero is, the turn, the rise, the triumph, the cost, the fall,
   the return, the end), each with its own emotion, building into the drops and crescendos and breathing
   in the breaks. Lines are cast *inside* their section's chapter, never by jumping across the source
   for a literal match. Keep the protagonist the subject: on breakingbadxdangerous the user asked for
   ~80 % Walter, 15 % the sidekick, 5 % everyone else — count screen time per character before rendering.
   v1 there, cast line by line from two fan edits, read as "randomly stitched clips".
1. **The intro is the hook.** No intro, no verse 1; no verse 1, nobody reaches the chorus. A strong
   open: one held, striking shot (black and white works), the title card within the first bars,
   then a few *long continuous takes at their own speed* (3–4.5 beats each, joined by warp zooms) —
   not a story told shot by shot, not a fast montage, not slow motion. The bar before the first
   verse is the launch: a rapid run of close-ups (½ then ¼ beat, the shake rising, a riser peaking
   on the downbeat), the bars closing in, and the first verse bursting in (colour after a
   black-and-white intro). A take can run across the boundary as one action: the intro shows the
   start of it, the verse picks the same take up seconds later.
2. **Pulse before sync.** One cut per beat, every cut on a beat, through a whole verse. When the
   vocal starts lines off the beat, start the line's shot on the beat before it (half a beat early
   reads fine). Never chase each line with half-beat offsets: the length then changes every other
   cut and the edit stumbles (hitixf1's verse 1: 23 half cuts, "very bad", next to a steady verse 2,
   "very good"). Half beats only as pairs inside one beat, on punchlines; quarter beats only in
   builds. `npm run remix` prints each block's rhythm: watch the one-beat count and the length
   changes.
3. **Continuity where the song soars.** Verses may jump shot to shot as the words ask. Hooks, drops
   and bridges follow *one scene in its own order* — the start, the battle, the crash, the pit stop;
   the rain, the fire, the hospital — so the viewer can follow it. A hook can run straight into its
   drop as one story. Scenes come from the segregation (`scene` column, scene sheets).
   **When the footage is one or two continuous set pieces** (a film's scene, not a montage edit),
   continuity rules *every* section: give each section its own stretch of the story, in order, and
   let the lyric only punctuate where a moment of that stretch happens to fit (quicksilverxkingpin
   v1 cast verses line by line across both scenes: "bullshit"; its hook, one scene in order, was
   "excellent").
4. **Meaning first, literally.** Every line gets the shot that says it: "axis spin" → a spinning
   wheel, "friction" → a glowing brake disc, "the static" → a picture breaking up, "every digit" →
   the timing tower, "switch lanes" → whips, "flame" → fire, "race against the minutes" → a pit stop
   under a countdown; in other footage "heartbreak" → the turned back, "rise" → the jump, "clash" →
   the blades meeting. A shot whose main action is something else (a wink in front of the map)
   doesn't say the line. If no shot says it, find more footage before settling (a second source paid
   off most). No lyrics: cast by the music's mood and energy, the same way.
5. **The footage plays at its own speed.** Slow motion softens the picture and reads as filler. Pick
   a longer take or a shorter cut — speeding a short take up to fill a longer cut eats *more*
   source, not less. Speed ramps *up* into hits are juice. The one place slow motion was liked: a
   quiet, spoken bridge, a little (0.55–0.85×), from motion-interpolated clips (see `slow`).
6. **One use per shot.** A shot seen twice reads as filler. Repeat only long takes, at other moments
   of the take. `npm run remix` lists every repeat and flags the ones that show the same frames.
7. **Motion, not colour.** No graded slices, negatives, psychedelic backgrounds, mirrors or RGB
   glitches: they read as cheap. The picture stays natural with a light film finish; black and white
   only for whole passages (an intro, a bridge). The style lives in the moves — the user loved
   these by name: the **smooth warp zoom** (a deep push into the subject with zoom blur and a lens
   bulge, landing decelerated on the next subject) and the **speaker pump** (the picture box punching
   out on every kick between transitions). Make them the edit's signature in every section with a
   beat. Cutouts serve transitions and words behind the subject.
8. **Words that land.** Normal lines are captions in the bar (wide-tracked, revealed as sung); only
   punches go big over the picture (5–7 a verse, every hook word). Every word shows 0.15 s before its
   aligned start — aligned starts trail the consonants, and text that lands *with* the sound reads as
   late. Each big word belongs to one shot: hold it back to the shot it's sung over, clear it before
   a face, a new section or the next big moment. Nothing over close-up faces that hides them; timers
   and graphics only where the picture leaves room. Sign-offs small: tiny, wide-spaced capitals.
9. **Save the payoffs.** A signature motif (the start lights, a logo sting) once, at the last chorus;
   repeated, it bores. Celebrations, finishes and reveals only at the end. Drops hit hardest.
10. **Sound sits on its picture.** A whoosh on a pass-by shot, a crash on the crash, an impact on the
    hit — never an effect over a still graphic or on the sung word while the picture shows something
    else. Effects in a quiet spoken passage feel sudden; keep them under the music.
11. **Never lose a cut.** Every render is a backup until the user asks for a cleanup (see Render).

## Adapting to the song

| song | pacing | words | sound and juice |
|---|---|---|---|
| rap, hip-hop | verses one cut a beat (lines often start off the beat: pulse first); chants one cut per word | captions on nearly every line; big words on punchlines | pump through verses and drops; impacts on bars' punchlines |
| pop, R&B | verses 1–2 beats a cut, hooks 1 beat | captions on hook lines, few big words | match cuts and warp zooms over hard cuts; pump in the hook only |
| EDM, trap, phonk, instrumental drops | build: 2 → 1 → ½ → ¼ into the drop; drop ½ beat with ¼ runs | none, or one word per drop | riser peaking on the drop, impact, heaviest pump and shake |
| rock, metal | cuts on the snare; whips on fills | captions in verses | shake on snares, impact frames on hits |
| ballad, cinematic | 2–4 beats a cut, long takes, held moments | a few lines, small | swooshes and soft impacts; pump off; slow motion only if the user asks |
| no lyrics at all | by energy: sections from the stems | none, or the title only | as the genre above; cast by mood |

Sections, whatever the genre:

| section | treatment |
|---|---|
| intro | principle 1: held opener, title, long takes, the launch bar |
| verse | literal casting on a steady pulse; captions; light pump |
| pre-chorus, build | drums often drop: hold shots, black and white, bars closing in (`tension`), riser |
| hook, chorus | one scene in order; big words; pump |
| chant ("don't blink ×7") | one cut or one punch-in per word (`steps` on one held stare works) |
| drop | the scene's climax in order; ½-beat cuts, shake on every cut, impact frames, heaviest pump |
| break, bridge | let it breathe: one scene in order, black and white, a little interpolated slow motion if spoken |
| outro | the walk-off; the payoff; the channel's sign-off small and wide-spaced |

## Adapting to the footage

- **Films, trailers, series:** story beats make the scenes; cast characters by what they do, not
  who they are. Burned-in titles, position towers and logo cards stay out unless they say the line.
- **Sports, racing:** families (faces/helmets, side-on action, POV/onboard, crowd, team, aerials,
  crashes, celebrations); the race itself is the drop's scene.
- **Anime, animation:** often 12 fps on 24 — never interpolate slow motion (it smears line art);
  match cuts on poses and silhouettes are strongest.
- **Game footage:** crop the HUD out with the plate's `crop`; replays and cinematics make the scenes.
- **Vlogs, travel, weddings:** long natural takes; slower pacing (the ballad row); faces and places.
- **Concerts, music videos:** cut the performer to *this* song's beats; never use their audio.
- **Several sources:** each its own segregation and prefix; a second source pays off most for
  literal casting. Match grades across sources only lightly.
- **Watch for:** "60 fps" uploads of 24 fps material (frames repeated 3-2: real slow motion needs
  interpolation); one-frame flashes of another shot hidden at cuts (an impact frame must not hold
  one); pillarboxed 4:3 archive inside a widescreen file (crop or avoid); letterboxing (`cropdetect`).

## What it needs

1. **The song** (wav/flac preferred) and, if words will be shown, **its timed transcription**
   (`input/lyrics.json`). No transcription and the user wants text: offer to transcribe (paid: ask).
   No words at all: skip the text layer (an instrumental edit is untested end to end here — check
   that `prepare-project` accepts the project before relying on it).
2. **Footage**: one or more videos (each its own source), ideally edits or highlight reels.
3. **An inspiration edit** (optional): a short reel whose style the user wants.

Tools: ffmpeg, uv. Engine (committed): `src/remix/` (cut-list language `edl.ts`, `resolve.ts`,
renderer `Remix.tsx`, `gfx/`), `scripts/remix.ts` (`npm run remix`), `scripts/matte.py` (BiRefNet
cutouts + subject anchors), `scripts/render.ts` (`npm run render-project`). Sound effects: the
ElevenLabs connector (`text_to_sound_effects`).

## Workflow

### 0. Intake (short)

Ask with `AskUserQuestion` only what the request leaves open, and say what you assumed: delivery
(16:9 / letterboxed / 9:16; fps; full song or a cut-down), the channel or brand it's for (its name
may sign off the outro), how much text, footage that is off-limits (spoilers, burned-in graphics,
people), anything they hate. Write `brief.md` and seed `prefs.md`.

### 1. Project folder

`projects/<slug>/input/`: the song, `lyrics.json`, `project.json` (`title`, `artist`, `audio`,
`sections`), the footage, `inspiration/<name>.mp4`, `sfx/` (generated sound effects). Every file is a
copy, never a symlink (`cp -c` clones a big download at no disk cost on the same disk), so the user can
move or delete the originals once the edit is done. Never edit the user's files in `input/`.

### 2. Study the inspiration — `inspo.md`

Segregate it (`.claude/skills/analyze-video/scripts/segregate.py <inspo> --min-shot 0.05`) and
make **dense frame sheets** (every 3–4 frames, frame number burned in, `tile=12x5`): edits that live
on transitions and masks have few hard cuts, so shot detection alone undersells them. Note the
pacing (cuts per beat), the transitions, the type, the colour, and what suits this footage.

### 3. Map the footage

`segregate.py "projects/<slug>/input/<footage>" --out projects/<slug>/footage` (the copy in `input/`:
`segregation.json` keeps that path; each further source into its own folder,
e.g. `footage-lm/`). Read every `sheets/shots_*.jpg` and `scene_*.jpg`; write down:

- **families** of shots (the per-genre lists above) and each shot's **length** (a cut can't be
  longer than its take);
- **scenes** worth a hook, a drop or a bridge, with their shots in order (the crash: onboard into
  the gravel → wide spin → onboard spin → the flip → the helmet);
- the **unusable** shots (burned-in titles, scoreboards, logo cards, black, pillarboxed archive);
- the picture area (`cropdetect`), and whether a "high fps" source is really 24 fps with repeats
  (frame differences of zero in a 3-2 pattern).

A shot sheet of candidates (3 frames each, 15/50/85 %) settles doubts before casting.

### 4. Map the song

`npm run analyze -w lyrics_videos -- <slug> --plots`, then `prepare-project` (make-lyrics-video 2–3).

- **Sections from energy, not lyric gaps:** print each stem's mean envelope per bar and cut where
  drums or bass drop out or return. Write them to `input/project.json`, re-run prepare.
- **Find the hits per beat around every section join:** drums, bass, kick and snare onsets. A drop
  can land beats before the lyric that names it (hitixf1's drop 2 hit three beats before "lose
  control") — the picture's drop goes on the music's hit.
- **Every lyric line and word as a fractional beat index:** the cut list is written in beats; note
  which lines start off the beat (principle 2).
- Ad-libs the transcription doesn't list pull the first word early; a fast chant's last word can
  land after the next line starts — pin such lines to the transcription (`"<n>": "input"` in
  `analysis/fixes.json`).

### 5. Plan — `storyboard.md`

One row per section: beats, picture (the scene for hooks/drops/bridges, the casting idea for
verses), juice, words, sound. Settle the intro first (principle 1).

### 6. Cast and cut — `video/edl.ts`

Print every lyric line with its beat, keep the shot sheets of every source open, and write each cut
with the shot *and why* as a comment (`c(1, 'lm0052', 'impact', S), // FRICTION: the brake disc
glowing`). Verses line by line, literal; hooks, drops and bridges by scene, in the scene's order.
Then run `npm run remix -w lyrics_videos -- <slug>` and fix, in this order:

1. **block lengths** (each block must end where the next starts; the resolver stops otherwise);
2. **`runs … past the end` warnings** — a shorter cut or a longer take, never a rate change;
3. **rhythm** (the per-block table: mostly one-beat cuts in verses, few length changes);
4. **repeats** (the ⚠ ones first; `--unused` lists free takes with their lengths).

Cut lengths at ~100 BPM: a beat is 0.6 s, so a one-beat cut needs a take of ≥ 0.62 s, half a beat
≥ 0.32 s. Before rewriting a cut list, copy it to `video/archive/edl.v<N>.ts.txt` and the storyboard
to `video/archive/storyboard.v<N>.md` (`.txt` keeps the type-check clean).

### 7. Media

```bash
npm run remix -w lyrics_videos -- <slug>            # footage table, plates, anchors, slow-motion clips, resolve + checks, shots.json, jobs
npm run remix -w lyrics_videos -- <slug> --matte    # + cutouts for the shots that have none yet (background)
npm run remix -w lyrics_videos -- <slug> --unused   # + the shots not used yet, with their lengths
npm run remix -w lyrics_videos -- <slug> --animatic # + out/<slug>/animatic/<section>.jpg: every cut's middle frame
```

`video/remix.json`: `sources` (each `{ id, prefix, source, segregation, crop, matteFps }`: the first
source keeps `sh####` ids, others get their prefix, e.g. `lm####`), `window` (the picture's size in
the frame, 1920×804 for 2.39:1 at 1080p), `logo`. Outputs: one plate per source (`derived/plate*.mp4`,
cropped, at most 30 fps), `derived/shotmattes/<shot>.webm` (VP9 alpha, one per footage shot, reused
by every cut from that take) with `<shot>.stats.json` (subject centre/area/box per frame) gathered
into `video/anchors.json` for anchored zooms, match cuts and words beside the subject, and
`derived/slow/<shot>.mp4` for every shot a `slow()` cut plays: its real frames (`mpdecimate` drops
repeats) motion-interpolated to 60 fps (`minterpolate`, ~15 s a shot).

Matting: BiRefNet-lite, half precision, Apple GPU, 1–2 frames at a time: ~0.3 s a frame with free
memory, 1–4 s when swapping (`sysctl vm.swapusage`); the full model can stall a 16–18 GB Mac. Start
it early, for all usable shots, while you cast. Check cutouts on green before relying on them.
Graphics shots (timing towers, maps, flashes) need no matte.

### 8. Words, graphics, sound

See the reference below. Sound once the cut is settled:

- **What:** a riser that peaks on each drop, a sub impact on the biggest hits, fly-bys / pass-bys on
  the fast shots, the scene's own sounds (wheel guns, engine revs, clunks, a crowd at the finish,
  camera shutters on the press), heartbeats under punch-ins, a soft swoosh on the zooms that open a
  section. A first pass of ~5; the first project ended at ~40 placements from 13 files when the
  user asked for more.
- **Make:** ElevenLabs `text_to_sound_effects` (only when the user asked for sound effects — it is
  paid) into `input/sfx/`, renamed by purpose; convert to `derived/sfx/<name>.wav`, leading silence
  trimmed and peak-normalised to −1 dB
  (`silenceremove=start_periods=1:start_threshold=-50dB,volume=<gain>dB`).
- **Place:** measure each file's envelope (`astats` RMS every 0.1 s) and set `lead` to its peak, so
  a riser or a fly-by peaks *on* the cut. Gains 0.3–0.5 under the music.
- **Check:** render the audio alone (`npx remotion render src/index.ts <slug> out/<slug>/clips/audio.wav
  --codec=wav`, a minute) and find the half-seconds over −0.8 dB (`astats` peaks); ease impacts and
  risers where they pile onto a drop.

### 9. Check

`video/index.tsx` is one layer: `Remix` at `'all'` with `{ slug, blocks, words, sfx, gfx, footage,
anchors, window, theme }`; `theme.ts` loads the fonts and palette and sets the HUD.

In this order: the animatic (`npm run remix -w lyrics_videos -- <slug> --animatic`: the middle frame of
every cut, a sheet per section in `out/<slug>/animatic/`) — read it as the audience will: does each
section tell its chapter, does the hero stay on screen, does it build; then `npm run type-check`; the title/graphic cuts frame by frame across their animation;
stills at every changed moment (`npm run stills -- <slug> t1,t2,… --only`, a contact sheet);
one late cut per source against `ffmpeg -ss <t> -i <source>` (catches timing bugs); half-scale
`--frames` clips of the densest and the slowed passages as frame sheets (`select='between(n\,a\,b)'`,
`tile=8x6`) — a zoom reads as a blur ramp into the cut and a decelerating landing out of it; slow
motion has no repeated frames (`signalstats` YDIF near 0 = a repeat); the audio-only peak check.
Look for: subjects in front of punch words, words on time and on their shot, nothing over faces,
no stutter, no burned-in graphics, every sound on its picture.

### 10. Render and review

```bash
npm run render-project -w lyrics_videos -- <slug> --crf=18   # → out/<slug>/<slug>.mp4 + .map.json (background, ~10 min for 3.5 min at 1080p30)
npm run render-project -w lyrics_videos -- <slug> --frames=900-960 --scale=0.5   # a clip → out/<slug>/clips/
```

Before a full render replaces the main file, the script copies the previous video, its map and its
`.revisions/` into `out/<slug>/v<N>/` (skipped when an identical copy is kept); clips never touch
the main file. Copy the archived cut list in beside it. An audio-only fix doesn't need a new
picture: render the audio and mux it onto the video (`-c:v copy`).

Review with the **`revise-video`** skill (the `/remotion-revision` link, reading and closing the
user's comments). The cut list's shot IDs are what the comments point at: keep them stable. Log
every comment in `prefs.md` and the general rule in the lessons log here. After the final render,
offer thumbnails (`create-thumbnail`) and the YouTube pack (`pack-youtube`).

## The cut list — reference

```ts
export const blocks: Block[] = [
  { id: 'v1', at: 48, cuts: [                  // starts on beat 48; cuts run back to back
    c(1, ['lm0002', 2.8], 'flash', freeze(), shake(0.8)), // a take 2.8 s in; white flash; impact frame
    c(1, 'lm0004', 'zoom'),                    // warp zoom from the previous shot's subject
    c(0.5, 'sh0002'), c(0.5, 'sh0004'),        // a pair of halves inside one beat
    c(1, 'sh0141'),
    c(1, 'lm0052', 'impact', S),               // S = shake(): kick/snare camera shake
    c(2, 'lm0102', ramp(2.4)),                 // speeds up into the next cut
    c(3, 'sh0098', mono, slow(0.75)),          // black and white, slow motion (bridges only)
    c(4, 'sh0179', steps([300.45, 301.45], 0.13)), // punch-ins on the subject on those beats
    splitAt(2.5, ['lm0061', 'lm0122'], [237.5, 238.7]), // two panels, each landing on its word
    c(1.5, '@lights', 'impact'),               // a graphic cut
  ] },
];
export const words: TextCue[] = [
  L("Injectin' octane"),                                         // a caption: the line it matches
  { ...B('FRICTION', 'listen to the friction', 5, 'red'), end: 61.5 }, // big word on sung word 5, cleared by beat 61.5
  { ...F('PURE ENERGY', 'pure energy', 3, 'acid'), start: 127.5 }, // in front, held back to the next shot
  { text: 'ATOMIC RAP', beat: 337, style: 'flank', hold: 12 },   // the sign-off either side of the subject
];
export const sfx: Sfx[] = [
  { file: 'riser', beat: 147, lead: 1.85, gain: 0.26 },          // peaks on the drop
  { file: 'flyby', beat: 308, lead: 0.8, gain: 0.4 },            // the pass peaks on the cut
  { file: 'crash', line: ["It isn't if I crash"], w: 4 },        // or on a sung word
];
export const gfx: Gfx = {
  title: { logo: 'derived/logo.png', text: 'HIT IT', sub: 'GET INTO ZONE', hit: 8 },
  lights: [{ on: [304, 304.3, 304.6, 304.9, 305.2], out: 308 }],
  tension: [[44, 48], [106, 112]],             // bars close in, frame darkens; released on the hit
  pump: [[48, 104, 0.055], [147, 175, 0.08]],  // the speaker pump: beat range, amount
  // optional, themed: tensionStyle 'smoke' (green chemical smoke + element symbols creep in instead
  // of the bars); meter { kind: 'ecg', flatline: beat } (the top bar as a heart monitor, not rev lights)
};
```

`L`, `B` and `F` are small helpers defined at the top of the words section of the project's edl.ts
(a caption, a big word behind the subject, a big word in front); copy them from the worked example.

**Transitions** (how a cut enters; the previous cut plays the matching exit): `cut` · `zoom` (the
warp zoom: the out-shot pushes 2.5× into its subject with a six-layer zoom blur and a lens bulge,
the in-shot lands from the same zoom on its own subject and decelerates — the signature) · `whip` /
`whipr` / `whipv` (pans with directional blur; on snares) · `spin` (rotate-zoom) · `match` (the
in-shot's subject starts where and as big as the out-shot's ended, then settles: subject to subject,
eyes → eyes; needs a beat or more and similar-size subjects — on half-beat cuts it shrinks the
picture into a corner) · `carry` (the out-shot's cutout stays over the new shot, then flies past the
camera; section changes) · `pass` (it flies past at once — read as bad once; prefer `zoom`) ·
`flash` (white) · `impact` (shake burst + punch-in; the strongest words) · `liquid` (the picture
melts: a flowing displacement swells into the cut and settles out of it; fast cuts that should feel
like a high, a dream or a drug trip, never as the default). Rapid builds: hard cuts.

**Fx:** `shake(amp)` (`S` on every drop cut; rising amps through a build) · `push(s)` (slow push-in;
long takes) · `echo()` (trailing copies of the subject, natural colour) · `streaks` (speed lines) ·
`pop` (the picture shrinks to a card and the subject spills over: only subjects smaller than the
frame) · `ramp(peak)` (accelerates into the next cut) · `freeze(n)` (impact frame: holds n frames,
two frames into the take, subject outlined in light; the biggest hits, or a long hold like
`freeze(16)` for "fracture") · `aura` (a glow round the subject pulsing on the kick: hero shots) ·
`steps([beats], s, to?)` (punch-ins on the subject: chants; `to: [x, y]` in window fractions aims
them at a point instead, e.g. the eyes, for a highlight shot) · `slow(r)` (0.55–0.85, quiet bridges, plays
the interpolated clip) · `rev(r)` (the take runs backwards from its offset at r×: a lyric that says
"rewind"; quicksilverxkingpin rewinds the bridge to the very first shot) · `flat` (no subject
cutout on this cut: a sign-off or word over a subject that fills the frame, which leaves `flank` no
room) · `mono`. Always on: an exposure lift on snares and a beat bounce on kicks,
scaled by loudness; inside a `gfx.pump` range the bounce becomes the **speaker pump** — the whole
picture box punches out on each kick with a zoom blur and a little lens bulge, then settles (verses
~0.055, hooks ~0.065, drops ~0.08); it sits out while a transition plays (that is the beat's move).

**Words:** `line` (caption in the bottom bar, wide-tracked, revealed as sung) · `big` (a punch word
behind the subject, drawn again as an outline over it so it reads even behind a close-up) · `front`
(big, over everything: split screens, close-ups that would hide a `big`) · `sub` (typed subtitles,
spoken parts) · `timer` (a stopwatch counting down `until` a line; only where the picture leaves
room) · `map` (a circuit drawing itself) · `label` (small text in the top bar) · `flank` (two words
either side of the subject, behind it, tiny line-font capitals, very wide spacing). Cue options:
`line: [query, nth]` + `w` (the sung word to start on), `perWord`, `hold` (beats after the last word),
`until`, `start` / `end` (beats: hold back to a shot / clear before the next), `color` (`bone`,
`red`, `cyan`, `acid`), `el: [at, len, n]` (big words: those letters in a periodic-table element box
with atomic number n, Breaking Bad's credits — `NAMELESS` with `[0, 2, 11]` is [Na]MELESS). Every
sung word shows `TEXT_LEAD` (0.15 s, resolve.ts) early.

**Graphics:** `@title` (`gfx/TitleCard.tsx`): a collab lockup, LOGO × TITLE — the logo revealed
alone by a light sweep with a running shine, then it glides left as an × slashes in and the title
slams in letter by letter on speed trails on beat `hit`, a red underline under the lockup and the
small line; it zooms out into the next cut (give that cut `'zoom'`). The logo is `remix.json` `logo`
→ `derived/logo.png` (white on transparent: its own alpha, else its dark marks). `@lights`
(`gfx/StartLights.tsx`, three.js): five pods lighting one red pair per `on` beat, all out at `out`.
`@split` via `split` / `splitAt`. New graphics go in `src/remix/gfx/` and are dispatched in
`Remix.tsx` (`cut.src === '@name'`).

**Theme** (`video/theme.ts`): fonts `punch` (big words), `line` (captions), `data` (HUD),
`title`, `sign` (the channel's `flank` sign-off, falls back to `line`: ATOMIC RAP is Michroma); colours `ground`, `bone`, `red` (the accent slot: the title card's logo, streaks and underline, element boxes and rev lights take it, so it can be any hue), `cyan`, `acid`; `hud` (top-left text) and `corners: false`
to clear the four corner readouts (the first user found them clutter). The top bar's rev lights are
slanted blocks, bone then red.

## Gotchas

- **Remotion `<Freeze>`:** freezing a video on frame n inside a Sequence sets the timeline to n + the
  Sequence's start, and a render clamps that to the composition's length — late source times show
  the wrong frames. The engine freezes on frame 0 and passes the time as `startFrom` (fractional
  for slow motion). Check a late cut per source against the source.
- **Overwritten renders:** before `render-project` kept versions, a test clip replaced the full cut
  and two revisions were lost. Don't write into `out/<slug>/` by hand either.
- **Behind-words on full-frame close-ups** disappear (the outline keeps them readable); on split
  screens there is no single subject — use `front`.
- **`pop` on a full-frame subject** shows a stray outline box; subject devices on POV shots grab the
  cockpit, not a subject.
- **The lens-bulge map is 8-bit:** stronger pulls than ~360 px show steps (`WARP_PX` in Remix.tsx).
- **A big word's hold** bleeds onto the next shot or a graphic cut: `end` it at the cut.

## Timing budget (this machine)

Segregation ~1–2 min per 4-min video; matting ~0.3–1 s a frame (5k frames ≈ 30 min); slow-motion
clips ~15 s a shot; a still batch ~1 min; a full 3.5-min render at 1080p30 ≈ 10 min; an audio-only
render ~1 min. Start the slow steps first and run renders in the background.

## Lessons log

Append dated entries: what the user asked to change and the general rule behind it.

- 2026-10-24 — First project (hitixf1, a rap song × F1 footage). Edits that live on masks change the
  picture without cuts: study the inspo with dense frame sheets. Derived lyric sections fail on rap:
  set sections from per-bar stem energy.
- 2026-10-24 — v1 "very bad": slowed footage and colour devices (graded slices, negatives, mirror,
  RGB glitch) read as cheap. Rebuilt the engine around transitions (warp zooms anchored on the
  subject, match cuts, whips, cutouts carried over the next shot), real motion blur and camera shake.
- 2026-10-24 — v2: no slowed footage anywhere; a musical intro wants life, not action, and a title
  card with a striking type effect; literal lyric casting matters most; normal lines as captions,
  only punches big; editor juice that rides the music.
- 2026-10-24 — v3: a second footage source paid off most for literal casting.
- 2026-10-24 — rev-001: two renders lost to overwriting (render-project now keeps versions); "no
  continuity" — cast hooks, drops and bridges by scene, in order; more blur and warp on the zoom and
  the speaker pump between transitions; a motif shown five times bores; celebrations only at the
  end; impact frames must skip one-frame flashes; drops land on the music's hit, not the lyric's.
- 2026-10-24 — rev-002: the user **loved the smooth warp zooms and the pump** (now principle 7);
  a story-telling intro is unwanted; words felt late everywhere (text now leads by 0.15 s); a
  three-way split read badly; timers over close-ups look bad; effects on their picture; the outro
  signs off with the channel name, not the song and artist.
- 2026-10-24 — v5: verse 2 "very good", verse 1 "very bad" — rhythm, not casting (principle 2).
  Slow motion in the intro rejected outright: long real-speed takes instead. A "60 fps" source was
  24 fps with repeats; slow motion needs interpolated frames.
- 2026-10-25 — rev-003: the bar before the first verse is the launch (rapid close-ups); `match`
  fails on half-beat cuts; a whoosh on a still graphic reads wrong; every big word belongs to one
  shot (`start` / `end`); one panel per word in a split.
- 2026-10-25 — rev-004: long takes through the whole intro, not a long opener then a montage; a take
  can run across the intro/verse boundary; when the drop's engine sound starts, the picture is
  already racing; more sound effects (risers, impacts, fly-bys, scene sounds); corner readouts are
  clutter. Final: v8. The repeat check, run afterwards, still found two takes showing the same
  frames for a fraction of a second — run it before every render.
- 2026-10-25 — Second project (breakingbadxdangerous: NEFFEX "Dangerous", 80 BPM, two EDM drops, × two
  Breaking Bad fan edits). Budget the footage before casting: sum the beats each take can give (a take
  of length L gives L / beat-length beats) against the song's beats. Fan edits cut fast (most takes
  under a beat at 80 BPM), and two of them ran out by verse 2. Stretch with impact frames (`freeze(n)`
  holds n frames, so a 0.46 s take carries a full beat on a punch word), later moments of long takes, one
  deliberate callback, and in the last drop a flashback of the whole story from the unused ends of
  earlier takes (¼ beat each, so no frame repeats); better, ask for a third source as soon as the
  budget falls short. The ElevenLabs connector's speech_to_text returns text only: for word timings
  call the API itself (`/v1/speech-to-text`, `timestamps_granularity=word`).
- 2026-10-25 — hitixf1 after sign-off: "rerender video, by adding the atomic rap outro at the end … no
  need to add intro … reduce the volume of outro by a bit, as it sound too strong" → a finished edit
  gets the channel's end screen (brands/<brand>/outros/, the user picks which) appended after the last
  shot, no brand intro, with the end screen's audio 4 dB under the kit (−24 → −28 LUFS). Done with
  ffmpeg (concat filter, 60 → 30 fps, CRF 15) rather than a Remotion re-render; the old render is kept
  in v<N>/ first and the map gets an end-screen section.
- 2026-10-25 — Third project (quicksilverxkingpin: "Kingpin" × Quicksilver's kitchen scene and
  mansion rescue). v1: hook 1 "excellent, keep everything" — the kitchen in its own order, mostly
  2-beat cuts walking through long takes with warp zooms; everything else "bullshit": verses cast line
  by line across both films (words over story), other characters in focus, and a 41 s musical intro
  that spent the set pieces. Rules: with set-piece footage every section is a small story in order
  (principle 3); the hero stays the subject, others brief and in the background; a long intro tells a
  setup story with the least material and saves the big moments; budget the scenes across the song
  before casting (each section gets its own stretch). Also: the title lockup's logo can be too small
  next to a short title (TitleCard `logoW` / `size`).
- 2026-10-25 — breakingbadxdangerous v1: "build a proper storyline … consider everything at a section
  level, build-ups and crescendos", and "80 % Walter White, 15 % Jesse, 5 % others" (principle 0). Literal
  line-by-line casting across a whole show reads as random. Plan the arc in storyboard.md first; tag every
  shot by character (a CLIP zero-shot pre-sort over the segregation keyframes, verified on sheets) and
  count screen time.
- 2026-10-25 — breakingbadxdangerous rev-001 (26 comments on v2). Generic graphics read as kit: the
  bars sliding in for tension "look bad" and the rev-light meter didn't belong → theme the graphics on
  the footage's world (Breaking Bad: chemical smoke with element symbols, a heart monitor that flatlines
  when the song stops; `tensionStyle`, `meter`). A love line ("baby girl, your body") can be sung to
  the hero's obsession (the product, the gun, the money), not to a person. A highlight line wants the
  camera to attack it (`steps` into the eyes) and the drop after a "high" wants `liquid` cuts. Good shots
  in the wrong lines read as random: each threat line lands on the man it names. A quarter-beat run
  flows only when the subject stays at one place and size (faces through time), not when every flash
  is a new framing. Big words: about one per verse line, each on its own shot; shift a cut half a beat
  (blocks may start on fractional beats) rather than squeezing a word under 0.5 s. When a range note
  says "change the shots", every shot it covers changes, even ones a later "keep" note overlaps by a
  frame.
- 2026-10-25 — kingpinxdeadpool v1 (Deadpool × "Kingpin", 8 sources, built story-first with 2–4-beat
  takes after the Quicksilver lesson): "too many long shot scenes … the entire verses should go at
  extreme fast cuts, hooks should go stylish and emotive match movement, plain music should either be
  dance moves or comedic with whole lot of effects and transitions to give the beat rhythm". With
  plenty of footage and a high-energy rap, taste can flip to velocity style: verses on a steady ½-beat
  pulse (¼ bursts on punchlines, 1 beat only under a big word); hooks slower but cut on movement
  (match cuts, whips along the move) through the emotional beats; every vocal-free stretch (intro
  beatbox, break, drop) as dance or comedy with a device on every beat. Ask about pacing at intake
  when footage is plentiful; principle 1's long intro takes are not universal.
