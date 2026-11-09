---
name: make-video-music-remix-shorts
description: Make vertical shorts (9:16 YouTube Shorts / Reels / TikTok, 3:4 Instagram grid, 4:5 Instagram feed) of a song set to footage, in Remotion, in make-video-music-remix's edit style — from either a finished song edit (a make-video-music-remix project with its 16:9 render) or just footage + a song (the shorts' stretches are cast fresh from the footage, each rendered in 16:9 for its short). Every run picks the three coolest different stretches of the song (energy, hits, hooks that repeat, clean section starts and ends; never a stretch the user called bad), checks them with the user (waveform with the picks, an mp3 of each), then makes three finished shorts of 30 s–2 min in the formats the user chose: "rotate your phone" shorts, whose opening cue is the key — the film's own stand-in for the phone (a coffin for Dracula, Deadpool's mask for Deadpool) does a beat of its character and tips onto its side, the plea and the title appear already turned, and the 16:9 edit plays turned from the stretch's hit — or recast for the vertical frame (reframed on the subject, stacked splits and boxes where a crop would be soft); reviewed through Revisions (revise-video). Use when the user says "make shorts / reels / tiktoks of <edit or footage + song>", "vertical cuts of this song edit", "rotate your phone shorts", "9:16 / 3:4 versions", "/make-video-music-remix-shorts", or asks to change a short under projects/<slug>/shorts/. Not for the full-length edit (make-video-music-remix). New user feedback goes in your notes (mm notes add), never in this file.
---

# make-video-music-remix-shorts

Vertical shorts of a song set to footage. Two ways in, two modes out.

**Ways in (the source of the 16:9 picture):**

- **A finished edit** (`--source=edit`): a make-video-music-remix project with its approved render
  (`out/<slug>/<slug>.mp4`). Rotate shorts play it as is; recast shorts start from its cut list.
- **Footage + a song** (`--source=fresh`, the default when there is no render; also when the user
  wants the shorts made "anew"): the project gets set up as make-video-music-remix steps 0–4 and 7 say
  (intake, folder, footage map, song map, media), and only the three stretches are cast — each short's
  own `edl.ts`, from 12 beats before its hit to its end, rendered as `<slug>-<id>-16x9` (also a
  landscape version of the short on its own). No long edit is needed.

**Modes out:**

- **rotate** (`--mode=rotate`): the cue, then the 16:9 picture turned 90° so it fills the 9:16 frame
  (the viewer turns the phone). Nothing is cropped or enlarged. The user's pick for hitixf1 and
  kingpinxdeadpool: see "Rotate your phone". The cue is the key.
- **recast** (the default): the edit recast for the vertical frame, with every rule below.

Three things change from the long edit:

- **The stretch:** 30 s–2 min of the song, the coolest parts, three different ones every run.
- **The frame:** 9:16, 3:4 or 4:5 (the user's choice), with a widescreen picture inside it.
- **The clock:** the first second has to hit, and the end should flow back into the start.

Everything else is `make-video-music-remix`: its principles (the story, pulse before sync, continuity
where the song soars, meaning first, real speed, one use per shot, motion not colour, words that land,
sound on its picture), its cut-list language, its checks and render. Read that skill once; this file
covers what is different. Reviews go through `revise-video`.

Taste comes from the user: read the project's `prefs.md`, the lessons log at the bottom and your notes
(`mm notes make-video-music-remix-shorts`) before planning; log every piece of feedback on a short in
`prefs.md` (under a "Shorts" heading) and the general rule in your notes
(`mm notes add make-video-music-remix-shorts "…"`).

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

## Rotate your phone (mode 'rotate')

The famous hook-shot format: the short opens vertical, tells the viewer to turn the phone, and the
widescreen video plays sideways to fill the frame. The user asked for it after disliking the vertical
recasts on hitixf1 ("take some inspiration from the famous rotate your phone hook shots, and build a hook
that matches the film"), then, on kingpinxdeadpool (2026-11-02), took the noahanima "dracula" reel as the
model: **"the first rotate animation is key, and it should always match the vibe of the
character/movie."**

### The cue (hook style 'cue', the default)

What the noahanima reel does in its first three seconds, and what every rotate short now does:

- **The film's own stand-in for the phone.** Where a phone icon would be, an object from the film's
  world with a phone's silhouette: the reel's red coffin (Dracula), Deadpool's mask worn by a red
  handset (kingpinxdeadpool), start lights in a pod (F1). It appears upright in the middle, does one beat
  of its character (Deadpool squints at the viewer, blinks, and winks once he is down), and **tips onto
  its side, clockwise** (the viewer's move, the user's direction since hitixf1) with a little overshoot,
  its turn arrow staying put and fading as it goes. **Then it must end upright for the turned phone:**
  tipped clockwise its top points right, which is down once the viewer has turned the phone clockwise
  ("the character is upside down after i rotate phone", quicksilverxkingpin 2026-11-03). So its last pose
  is head left (−90° on screen): a stand-in with a clear up (hair, a face, a lid) turns itself round in
  character once it is down, before the viewer has finished turning (Quicksilver flips 180° at his speed,
  0.3 s after landing, in 0.2 s), and does its reaction in that pose.
- **The plea, already turned.** Beside it, set in the landscape stage (the frame turned 90°
  counter-clockwise, against the viewer's turn), so it reads upright for anyone who has turned the
  phone: one big word and a line, in the character's voice and look ("PLEASE." / "Rotate your phone" /
  "(I'll wait.)" in Deadpool's yellow comic boxes).
- **The title, turned.** The edit's title card (gfx.title) plays in the stage and slams in 3 beats
  before the hit, on the film's texture (the reel's scratched film; Deadpool's halftone dots).
- **The edit, turned, from the hit.** Nothing turns in the frame after the cue: whenever the viewer turns
  the phone, everything is already the right way up for them (this is what fixes the countdown's
  problem, "user is rotating phone the instant the counter moves away"). Flash and jolt on the hit.
- **The song waits for the turn.** Until the stand-in has tipped over there is no song, only the hook's
  own sounds: "the song starting confuses the user … let the song start only after the rotation, until
  then a slow minimal fade and some sound fx" (kingpinxdeadpool, 2026-11-02). Music under the cue reads as
  the short having started, and the viewer waits for it instead of turning the phone.
- **Timeline (beats before the hit H):** H − 14 the stand-in fades up from black over 1.4 s (`fadeIn`; a
  riser builds under it) and does its gesture → H − 10 it tips over (a swoosh, the film's own sound —
  Deadpool's katana shing — and a clunk as it lands) → the song swells in from just after the tip
  (`songIn` = tip + 0.5 s, squared over `songFade` 3 s, full by the title's slam) → the plea pops in line by
  line → H − 6 the cue and plea go → H − 5.5 the title card → H − 3 its slam (a whoosh) → H the edit (a soft
  impact). About 7 s. A fresh stretch is still cast from H − 12 (`videoFrom`): the 16:9 render starts
  there, 2 beats after the hook.
- **Design a new stand-in for every film**, in its own file `src/remix/gfx/cues/<name>.tsx`, registered in
  `CUES` in `src/remix/gfx/cues/index.tsx` (picked by `hook.cue`). Offer the user three at intake, recommend
  one. A stand-in:
  - is tall like a phone and reads at a glance in the film's colours (a silhouette test: would a fan
    name the film from it?);
  - is sized like a phone icon, not a poster: about a fifth of the frame's height upright, and in the turned
    view about as tall as the plea block beside it ("the emoji is looking a bit too big",
    breakingbadxdangerous 2026-11-03). Draw it smaller inside its box (its viewBox) when a hat or a glow
    would make it fill the box;
  - has one gesture of character, timed from the tip (`tipAt`, `beat`), and a reaction once it's down;
  - ends head left, upright for the turned phone, turning itself round in character (above);
  - keeps its turn arrow still (counter-turned by `angle`) and lets it fade with the tip;
  - is drawn in SVG, upright, `size` tall; no text inside it (the plea carries the words).
- **The stand-ins so far** (`CUES`): `deadpool-mask` (kingpinxdeadpool: the mask on a red handset; squints,
  tips with a katana shing, winks; `phone` is the plain handset), `quicksilver-goggles`
  (quicksilverxkingpin: silver hair and the kitchen's chrome goggles; tips in a blur and flips 180° at his
  speed, "(I already did. Twice.)", `texture: 'drops'`), `heisenberg` (breakingbadxdangerous: hat, glasses,
  goatee, lit in element green; glasses slide down, a coin-toss flip once down, `pleaStyle: 'element'`,
  `texture: 'smoke'`).
- **Check the cue the viewer's way:** a still of the cue's last pose turned as the viewer holds the phone
  (`ffmpeg -i still.png -vf transpose=1 turned.png`): the stand-in, the plea and the title all upright.
- **short.json `hook`:** `style: 'cue'`, `cue`, `from`, `tip`, `plea` (lines; the first big, `(…)` an
  aside), `pleaStyle` ('comic' | 'plain' | 'element': symbols written `[Na:11]` in periodic-table boxes,
  Breaking Bad's lockup), `pleaTo`, `title` (`from` in seconds, `hit` a beat index), `hit`, `texture`
  ('halftone' | 'film' | 'smoke' | 'drops' | 'none'), `fadeIn`, `songIn`, `songFade`, `sfx`. `make` writes it;
  tune the plea and the sounds per film. Scene: `src/remix/RotateCue.tsx`. `make` plans the cue in beats:
  on a slow song (80 BPM: 14 beats = 10.5 s) pull it in to about 8 s (breakingbadxdangerous: from H − 11,
  tip H − 7, pleaTo H − 4, title from H − 3.75 slamming on H − 2).

### The countdown (hook style 'center', 'center5', 'band')

The hitixf1 hooks, kept for a film whose signature is a count (F1's start lights): ROTATE YOUR PHONE /
IN 3 SECS → 3 · 2 · 1 with a light each → lights out, and the video turns slowly in the frame into the
hit. `--hook=center` (or `center5`, `band`). Its rules:

- **Nothing moves until 0 (the rule, 2026-10-29).** Viewers turn the phone the instant anything big
  moves ("user is rotating phone the instant the counter moves away, so only move away the counter when
  its time"). The counter, lights and phone hold the centre and the video stays hidden until lights
  out; only the numbers change. A 3-count is enough ("a 3 number countdown might be enough").
- **The timeline (beats), the centre countdown** (the user's design, refined 2026-10-28/29):
  - H − 14: the short starts on a black frame with the edit's **sound only** (its build), fading in
    slowly from silence to full at 0 (a squared ramp: "fade in the audio slowly until 0").
    ROTATE YOUR PHONE / IN 3 SECS sit centred in two lines, fitted to the width, with the phone hint
    under them.
  - H − 10, 3: the words drift away and blur; the 3 grows from red into the white counter in the middle
    (the morph ends on the beat) and the first of three start lights comes on above it, with a clunk.
  - H − 8, 2 and H − 6, 1: each next number rolls in (the old one rises and fades, the new one settles
    from 1.35×), one more light each, a clunk each. Nothing floats; the video stays hidden.
  - H − 4, 0: lights out. Only now the counter, lights and phone go (0.3 s), the video appears (0.4 s)
    and turns 90° counter-clockwise slowly (sine in-out over 4 beats, about 2.4 s) as it grows to fill
    the frame. The sound is at full.
  - H: the turn lands on the hit. A white flash, a jolt and a soft impact; the edit plays on as is.
  - In short.json: `hook.style: 'center'`, `stay: true`, `hook.from` (the call) before `count[0]`.
    The script writes this by default.
  - `--hook=center5`: the earlier 5-count (IN 5 SECS from H − 15, 5 → 4 → 3 with lights, the count
    floating up at 2, the video fading in at 1). `--hook=band`: the first countdown (the edit in the band
    from the start, 3 · 2 · 1 above it, 10 beats).
- **The phone hint:** a phone under the words, then under the counter, turning once per count until 0
  ("show a phone rotating animation that suggests…"). **Only ever upright → on its side** (the viewer is
  watching upright on Shorts): it holds on its side, fades, and comes back upright, never turning back.
  The phone and its arrow turn **clockwise** (the user's direction); the band turns the opposite way on
  screen (counter-clockwise), so in the viewer's hand the picture stays level as they turn and lands
  upright. Flip one, flip both.
- **The hook matches the film:** for F1, three start lights over the number and the F1 logo. Every
  film needs its own signature (the cue's stand-in, a fight's bell, a heist's countdown).
- **The layout (9:16):** everything in the middle (the words, the counter at 20 % of the height, the
  lights above it, the phone below it) until 0. Nothing goes in the bottom quarter: the platforms' title and buttons cover it.
### Both hooks

- **Planned back from a hit.** Each short is built around a real hit in the song (a drop, the drums
  coming back, a hook landing after a quiet bar), H. The hook rides the build before it and the edit
  takes over on H. Pick stretches by their hit: hitixf1's are drop 1, verse 3's drums and drop 2;
  kingpinxdeadpool's are verse 1 after the suit-up launch, hook 1 after the heartbeats, and hook 2 after
  "Rewind, let's try that again, shall we?". A stretch without a hit (a spoken bridge) can't be a
  rotate short on its own.
- **The picture plays as is:** a 16:9 frame turned is exactly 9:16: no crop, no enlargement. Its own
  mix throughout (the cue's build included), faded over the last 0.4 s.
  - `--source=edit`: the finished render (`out/<slug>/<slug>.mp4`, hard-linked as
    `derived/final-16x9.mp4`). A short may run past the song into the render's end screen (hitixf1's
    finale ends on the ATOMIC RAP end screen). Check the render's first frames after H, a frame at a
    time: the section before can leave its big word on screen there (kingpinxdeadpool: ENOUGH for 5–10
    frames). Hold those frames on the first clean frame of the same shot in an ffmpeg copy of the
    render from `hook.from` (`split` + `freezeframes`, audio untouched), set as short.json `video` +
    `videoFrom`. Never re-render the approved edit for it.
  - `--source=fresh`: the short's own stretch, `shorts/<id>/edl.ts` cast from H − 12 (the cue's first
    frame: those beats only show in the 16:9 version) to the end. `defineShorts` makes it a
    `<slug>-<id>-16x9` composition; `render-project --short=<id>` renders it first and hard-links it as
    `shorts/<id>/wide.mp4`, which the turned short plays (`video`, `videoFrom`). Cast it the way
    make-video-music-remix cuts a section, and read an edit the user approved first (the same song's, if
    there is one) and follow make-video-music-remix's standing rules (no people-talking shots; every line on
    the hero, never on another character; the pace the song's feel asks for; the hero's tone): the approved
    Deadpool shorts cut a beat at a time with two-beat holds under words, while the full edit of the same
    slow, stylish song wanted long takes and slow motion at times; whips, zooms and impacts on the snares
    and bars; every line on the hero's moment that says it (GLOW → his eyes light up, PREMIER
    → the film's title, DISAPPEAR → an agent stepping through a time door); hooks one scene in its order,
    cut on movement (flow, match), aura on the hero shots; one word a line acting out its meaning (behind
    the cutout, set into the shot as a plane, knocked out of the black, a stack beside the face, glass,
    drawX, the acts), each on the one take it is sung over and never over a face. A uniform half-beat
    montage with caption-box words was rejected (2026-11-02, lessons log). A block may start before the
    window (its earlier cuts are never seen), so a long edit's blocks can be reused by id
    (`full.blocks.filter(…)`).
- **Make:** `mm shorts <slug> make A,B,C --formats=9x16 --mode=rotate
  --source=fresh|edit --cue=<stand-in> --plea="PLEASE.|Rotate your phone|(I'll wait.)"` (picks, or a
  range starting *on the hit* in seconds, snapped to a beat; `--hook=center` for the countdown). It
  writes short.json (`"mode": "rotate"`, `hook`, `video`, with `wide`/`videoFrom` when fresh), index.tsx
  and, when fresh, the edl.ts scaffold. Add the film's own sounds to `hook.sfx` (only files in
  derived/sfx). The turned composition plays the 16:9 video's mix (`ProjectDefinition.audio: false`).
- **Check:** `mm remix <slug> --short=<id>` checks a fresh short's 16:9 cut list (rhythm,
  repeats, mattes). Then stills through the hook: the cue's pop, its gesture, the tip (the arrow stays),
  the plea (reads upright when turned, clear of the stand-in), the title's slam, the hit
  (`stills … 0.1,0.5,0.8,1.1,1.3,1.8,2.4,3.5,4.8,5.7,6.2,7.5 --only --short=<id>`; the turned video has
  to exist: render the 16:9 first). After the render, the hit's peak (`volumedetect`).
- **Ask which mode, which source and which stand-in** at intake (rotate first for an edit the user
  already signed off).

## What makes a short (recast)

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
   and 1.8× in 3:4. `mm remix <slug> --short=<id>` prints the factor for the project. Past
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

Either a finished edit or footage + a song (see "Ways in"). Either way, a make-video-music-remix project, `projects/<slug>/`, with `manifest.json`, `video/remix.json`, the
footage segregated and matted. A finished long edit (`video/edl.ts`, `video/index.tsx`) is the best
start: its casting, words, sound and look come along, and the user already approved them. Without one
(new footage and song), run make-video-music-remix steps 0–4 and 7 first (intake, folder, footage map,
song map, media), then cast only the shorts' stretches. The reframe needs a cutout (matte) on every
footage shot used; without one the crop sits in the centre.

Tools: ffmpeg. Engine (committed): `scripts/shorts.ts` (`mm shorts`), `src/remix/shorts.ts`
(`defineShorts`, `FORMATS` incl. `16x9` for a fresh short's stretch), `src/remix/RotateShort.tsx` (the
countdowns) and `src/remix/RotateCue.tsx` (the cue), the stand-ins in `src/remix/gfx/cues/`, the
vertical frame in `src/remix/Remix.tsx`, the song window in `src/kit` (`ProjectDefinition.window`),
`--short` in `scripts/remix.ts`, `stills.ts` and `render.ts` (a fresh rotate short's 16:9 first).

## Workflow

### 0. Intake (short)

One `AskUserQuestion` call:

- **the mode**: rotate your phone (the film's cue, then the 16:9 picture turned) or recast for the
  vertical frame.
- **the source** (rotate): the finished edit as it is, or the stretches cut fresh for the shorts (the
  only way when there is no long edit; the user's choice for kingpinxdeadpool: "do it anew").
- **the stand-in** (rotate): three ideas from the film's world, the recommended one first, each with its
  gesture and its plea ("Mask phone: the phone wears Deadpool's mask, squints, flops onto its side with a
  katana shing; PLEASE. Rotate your phone. (I'll wait.)"). New ones get drawn in gfx/cues.
- **the formats** (multiSelect): 9:16 Shorts / Reels / TikTok · 3:4 Instagram grid · 4:5 Instagram
  feed. This question is asked every run. A rotate short is made for 9:16 (a turned 16:9 frame fills
  it exactly).
- anything else the request leaves open: which project or edit, the channel's sign-off, anything they
  want in or out.
- no look previews for a short under a minute: build it whole (`revise-video` › Previews or the
  whole video). For one of a minute or more, ask whether to see looks of its hook first.

Then read `prefs.md` and the shorts so far (`mm shorts <slug> list`).

### 1. Pick three stretches

```bash
mm shorts <slug> pick            # --n=3 --min=30 --max=120 --alts=3
```

It scores every bar-aligned stretch of 30 s–2 min:

- drums + bass energy against the song
- the opening two bars (a one-bar launch into a section counts)
- the peak
- the share of lyric lines that repeat (hooks)
- the sections' names (hook/drop > build > verse > bridge > intro/outro)

The three must be three different parts of the song: drop a pick whose lines repeat another pick's
(hook 2 after hook 1 — kingpinxdeadpool's s03, "it's the same bit in the song") for the next best part.
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
A stretch they call bad: `mm shorts <slug> mark C bad --note="…"`, then
offer the next alternate. "Autopick" (the user's answer on all three films, 2026-11-03) means: take your
judged three (three different parts, each with a real hit, no repeated hook), say which and why in a line,
and go on to make them without asking again.

### 3. Make

```bash
mm shorts <slug> make A,B,C --formats=9x16,3x4
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
mm remix <slug> --short=<id>             # cuts, rhythm, repeats, mattes, enlargement
mm remix <slug> --short=<id> --matte     # cutouts for shots without one
mm remix <slug> --short=<id> --animatic  # out/<slug>/shorts/<id>/animatic/
```

It writes `shorts/<id>/shots.json` (the short's shot map). Plates, mattes, slow clips and
`video/footage.json` stay shared with the long edit (slow clips the long edit uses stay listed).

### 5. Check

```bash
mm stills <slug> --short=<id> --cuts --scale=0.25                 # a frame per cut + sheet.jpg
mm stills <slug> 0.2,2,8,20 --only --short=<id> --format=9x16   # seconds of the short
mm render <slug> --short=<id> --format=9x16 --frames=0-150 --scale=0.5
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
mm render <slug> --short=<id>     # every format in short.json (or --format=9x16)
```

→ `out/<slug>/shorts/<id>/<slug>-<id>-<format>.mp4` plus its `.map.json` (the short's shots in its own
time). Earlier renders are kept in `v<N>/` beside it, as with the long edit. Render the three shorts one
after another in the background, not in parallel. Shorts render at full size (no `--proxy`); a rotate
short plays the long edit's master, so `shorts make --mode=rotate` refuses a half-size review render of
it. Before the links, run preflight on each short
(`mm preflight <slug> --video=out/<slug>/shorts/<id>/<slug>-<id>-9x16.mp4`) and
fix or answer what it finds; after them, start the watcher (`mm wait-revision --
<slug>` covers every short), as `revise-video` describes.

Review with **`revise-video`**, one link per short and format:
`/video-revision?folder=<slug>/shorts/<id>&video=<slug>-<id>-9x16.mp4` (if it doesn't open, the user
picks `out/<slug>/shorts/<id>/`). Log the comments. When the user likes a short:
`mm shorts <slug> mark <id> liked`. Then offer the YouTube text per short
(`pack-youtube` / `write-youtube-metadata`, with #shorts) and, for the long edit, a related-video link.

### Next runs

`pick` again: history steers it to stretches not made yet, then to re-cuts of ones that were (with a
new casting), never to ones marked bad. Ask the formats again.

### Several films at once

Shorts for several edits (breakingbadxdangerous, quicksilverxkingpin and kingpinxdeadpool, 2026-11-03) run
one session per film, all in the same checkout (`projects/` is gitignored, so a worktree has no footage):

- each film's stand-in in its own file in `gfx/cues/`, registered in `CUES` with a one-line edit made just
  after re-reading `index.tsx`; engine files edited surgically, never rewritten whole; nothing committed and
  no branch switched while the others work;
- at most two heavy jobs (renders, stills batches, mattes, bundles) across all the sessions: check
  `pgrep -fl "remotion|render-project|ffmpeg"` first and wait while two run;
- a note the user gives every session ("the character is upside down") is one rule: fix it in the engine or
  in every stand-in the same way, and log it once here;
- approval ("all done") delivers each film's latest 9:16 renders with `media deliver` to
  `~/Downloads/<channel>/<slug>/shorts/` as "<Title> - s<NN> (9x16).mp4", after marking them liked.

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
41 s → 96 s; three shorts ≈ 5 min), 30–60 MB each. A fresh short renders its 16:9 stretch first (kingpinxdeadpool
s01: 40 s → 86 s at 1080p).

## Lessons log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add make-video-music-remix-shorts "<what the user asked to change> → <the general rule behind it>"   # a new lesson, dated for you
mm notes make-video-music-remix-shorts                                                                        # your notes for this skill
```

When the user wants them shared, `mm notes promote make-video-music-remix-shorts` offers them to this log as a pull request.

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
- 2026-10-28 — hitixf1: "i dont like any of them" (the three vertical recasts) → "take some inspiration
  from the famous rotate your phone hook shots, and build a hook that matches the film, and then rotate
  from vertical to horizontal and play the 16:9 edit as is". The rotate mode was built for it, on the same
  three stretches (s04–s06; s01–s03 kept, noted in history). The hook is the film's own start lights in
  a band, the band turns into the edit at lights out, and the edit plays untouched. For an edit the user
  signed off, offer rotate first: it keeps the approved cut and needs no reframing.
- 2026-10-28 — the first rotate shorts (s04–s06) turned in 0.6 s after a silent start-lights hook: "the
  rotate should happen slowly … 3, 2, 1 … users can't rotate fast … the video hits hyper mode after the
  rotation, plan music and edit like that". Rotate shorts are now planned back from a hit: the edit's
  own build plays in the band under a 3 · 2 · 1 (2 beats each), a 4-beat sine turn lands on the hit, and
  there is a flash and a jolt there. A stretch without a hit (the bridge) was replaced: the user picked
  the drop 2 finale running into the end screen. s07–s09.
- 2026-10-28 — s07–s09 (the count over the playing video, 3 counts): "do not play the video, only the
  audio until the counter's 1, and do the counting at the centre … 5 secs, 3 secs is too short" plus the
  full choreography → the centre countdown, now the default (`style: 'center'`): 15 beats before the hit,
  black with sound only, the words → 5 → 4 → 3 (lights) → 2 (float up) → 1 (video fades in) → 0 (slow
  turn) → hit. s10–s12. The first try ran ROTATE YOUR PHONE off both edges: the words are fitted to the
  width now.
- 2026-10-28 — s10–s12: "show a phone rotating animation, that suggests until point 2 when it moves to
  top" → the turning phone (27 % of the width) under the words and then the counter, one turn per count
  starting on the 4, rising and fading with the counter at 2. s10–s12 re-rendered (the previous renders
  kept in v1/).
- 2026-10-28 — "the rotation animation is wrong, it should start from vertical and end at horizontal, as
  the user would be seeing this on shorts": the phone turned onto its side and visibly back, which reads
  as "turn to upright", and its arrow pointed clockwise. Now each turn is upright → on its side, a hold,
  a fade, back upright (PhoneTurn); the arrow counter-clockwise. s10–s12 re-rendered (previous in v2/).
- 2026-10-28 — "now it is rotating in wrong direction" → the phone and arrow turn clockwise, and the band
  now turns counter-clockwise on screen to match (otherwise a viewer turning clockwise sees the edit
  upside down). "also fade in the audio slowly until 0" → the edit's sound swells from silence to full at
  the turn (squared ramp). s10–s12 re-rendered (previous in v3/).
- 2026-10-29 — "there is a confusion, so user is rotating phone the instant the counter moves away, so only
  move away the counter when its time, also a 3 number countdown might be enough": viewers act on the first
  big movement, so nothing may move but the numbers until 0. Test on s10 only (`hook.stay`, hook.from
  before count[0]): ROTATE YOUR PHONE / IN 3 SECS (4 beats) → the 3 becomes the counter, first light → 2
  → 1 (a light each, 2 beats apart) → 0: lights out, the counter goes and the video appears as it turns.
  The counter, lights and phone hold the centre throughout; the video stays hidden until 0. Shown in
  Studio, not rendered ("do not render, just give me the Remotion editor link"). The 5-count s10 is kept
  as shorts/s10/short.v3.json.
- 2026-10-29 — approved: "just save it into the rules … this is done, no need for rerender" → the 3-count
  hold is the rule and the script's default (`--hook=center5` keeps the 5-count). hitixf1's shorts closed
  with s10 tested in Studio, s11/s12 left as their 5-count v3 renders.
- 2026-11-02 — kingpinxdeadpool (Deadpool × "Kingpin"): "take inspo from the first few seconds [of the
  noahanima 'dracula' reel], and lets redesign the skill … it should either accept a completed video edit
  or … just stock footage + music and do it for 3 different bits of track. the first rotate animation is
  key, and it should always match the vibe of the character/movie." The reel opens with a red coffin in
  place of a phone icon, tipping onto its side, "PLEASE / Rotate your phone" already sideways, then the
  title sideways on scratched film: everything after the cue is laid out for the turned phone, so it never
  matters when the viewer turns. That became the 'cue' hook (the default; the countdowns stay as
  `--hook=center`): a stand-in from the film's world (gfx/cues: Deadpool's mask on a red handset that
  squints, tips clockwise with a katana shing and winks), the plea in the character's voice in its
  look (Deadpool's yellow comic boxes, "(I'll wait.)"), the title card turned, the edit turned from the
  hit. Two ways in: a finished edit (`--source=edit`) or the stretches cut fresh from the footage
  (`--source=fresh`: each short's own edl from 12 beats before its hit, rendered as `<slug>-<id>-16x9`,
  then turned), which the user chose ("do it anew") over turning the long edit.
- 2026-11-02 — kingpinxdeadpool, run 1 rejected: "all the edits are really bad, read into the
  /make-video-music-remix skill and learn how to do video edits, none of the shots match neither the lyrics
  nor the sound beats, and i dont see any fancy effects on words or videos or any match cuts or anything
  that will give the edit an aura". The cuts sat on the grid (within 16 ms), but every one was half a beat
  on a half-time song, so the picture chattered against a groove that hits every two beats; lines were cast
  as a montage of their scene, not the shot that says them; the words were small comic boxes. v2 rebuilt
  all three on the user-approved Quicksilver edit of the same song: a beat a cut, holds under words, the
  same section patterns (hook: 1–3-beat cuts, the half + spin on LIGHT YEARS, the triplets on "has been
  said"; the drop: flashes on the kicks, then half- and quarter-beat bursts), each line on its literal
  shot, a word acting out every line. Rule now in "Both hooks" (`--source=fresh`).
- 2026-11-02 — kingpinxdeadpool v2: "i dont like s3, it same bit in song, try picking another part" — the
  finale's hook 2 repeats hook 1's lines, which s02 already had: three shorts are three different parts of
  the song, never a repeated hook (s03 marked bad; s04 = verse 2). "the song starting confuses the user, so
  do a slow fade in and let the song start only after the rotation, until then a slow minimal fade in and
  some sound fx for rotation" → the cue's new timeline (above; the engine's and `make`'s default). "i
  really like s2 … it picked the right scene and made a comedy style edit": cast each short as the one
  right scene in order, played for its gags, the punchlines on the moments that say them.
- 2026-11-03 — kingpinxdeadpool run 3 (s05–s07, s01–s04 kept): with the long edit now final, the user picked
  rotate from the edit as is over cutting fresh, kept the approved mask phone over two new stand-ins
  (Dogpool playing dead, the TVA TemPad), and answered the picks with "autopick". With most of the song
  already made, the only unmade parts were the intro and the end, so the run was two new stretches and one
  re-cut whose edit casting differs from the earlier short (verse 2: the edit's taxi and junkyard, not s04's
  freeway fight). The end stretch was the back half of a stretch marked bad, without the repeated hook that
  made it bad: a bad mark is about that part of the song, so the rest of the stretch can still be offered,
  flagged. The edit's previous big word hung over the first frames after two of the hits (now under
  "The picture plays as is").
- 2026-11-03 — quicksilverxkingpin run 1 (s01–s03): rotate from the v14 edit as is, 9:16; the user picked
  the goggles handset (over his Walkman and a frozen bullet) and answered the picks with "autopick" → verse 1,
  hook 1, and the outro → break → drop → end (verse 2 the spare; hook 2 left out as a repeat of hook 1). The
  stand-in: a dark handset with his silver hair and the kitchen's chrome goggles, a plain plea, water drops
  hanging in slowed time behind it (`texture: 'drops'`) and the long edit's own title sound (elegant.wav, the
  user's c05) instead of the whoosh. Review: "the rotation is correct, but the character is upside down after
  i rotate phone" — every stand-in so far ended its tip head right, which is down in the turned phone (the
  plea and the edit are laid out for a clockwise turn). Rule now under "The cue": the tip stays clockwise as
  the hint, and the stand-in then turns itself round, head left, upright in the turned phone. Quicksilver
  flips 180° at his speed a beat after landing (swoosh), so "(I already did. Twice.)" is literal. Check it
  with a still turned the viewer's way (`ffmpeg -vf transpose=1`): the plea and the stand-in both upright. v2 approved
  ("all done") and delivered.
- 2026-11-03 — breakingbadxdangerous run 1 (rotate, the finished edit, 9:16; picks autopicked: drop 1, verse 2,
  drop 2 into the end), the same note: "the rotation is correct, but the character is upside down after i
  rotate phone". The Heisenberg handset (hat, glasses, goatee) flips over once down, like the show's coin toss
  (scaleY through 0 about its middle in its own frame = a flip across the frame's width), and lies head left.
  At 80 BPM the cue was retimed to about 8 s (see "short.json `hook`"). New engine pieces: plea style
  'element' ([Na:11] boxes) and texture 'smoke'; the picker's mp3s now survive a stretch ending at the
  song's end (ffmpeg 8).
- 2026-11-03 — breakingbadxdangerous: "the emoji is looking a bit too big i think, size it correctly". The
  cue box is 30 % of the frame's height, and a stand-in drawn to fill it (a hat on top, a glow round it)
  read bigger than a phone. Size it like a phone icon: about a fifth of the height upright, and in the turned
  view about as tall as the plea block beside it (Heisenberg: drawn at 72 % of the box via its viewBox).
- 2026-11-03 — three films at once ("for breakingbad, quicksilver, deadpool in 3 seperate threads (keep the
  already made deadpool and create new ones)"): one session per film in the same checkout, each stand-in in
  its own cue file, two heavy jobs at most. All three answered the picks with "autopick" and approved the
  three rotate shorts each ("all done, move to the project folder"): delivered to
  `~/Downloads/atomicrap/<slug>/shorts/`. The rules are under "Several films at once" and step 2.
