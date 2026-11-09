---
name: make-kinetictype-like-screamingtowin
description: Variant of make-kinetictype in the style of Screaming to Win (projects/screamingtowin, published 2026-11-08) — give it a picture, a quote and music (or any one of them: it makes the two that are missing) and it makes a stunning 9:16 kinetic-type Short in that style, end to end with the same utilities and MCPs — the style is the suggestion (the slam language, the type, the restyled picture, the loop, the sounds); the setup (length, sections, which devices when, what the words do, which art styles) is designed from the new quote, picture and track, never copied from the reference. It picks the best stretch of a long instrumental (a quiet build into a drop, big section hits, a dip to loop on), restyles the picture and its close-ups in Midjourney in the six styles that worked, cuts the characters out, storyboards the quote onto the music's hits (build word per beat, the hero word letter by letter on the drop, faces, the rise, the last word cracked and on fire, the poster ending warping back into the start), adds the sound effects, reviews through revise-video, renders the master, delivers it and fills the YouTube upload. Make a kinetic-typography edit in Remotion on the shared engine (src/kinetictype, video/edit.json, mm kinetictype). Use when the user says "make one like Screaming to Win", "a kinetic type short like the Blue Lock one", "here's a picture / quote / song, make that style", "make a kinetictype short from this <picture | quote | song>", "/make-kinetictype-like-screamingtowin", or gives a long instrumental to cut a kinetic edit from; otherwise make-kinetictype. Append new user feedback to the log at the bottom.
metadata:
  variant-of: make-kinetictype
  forked: 2026-11-08
  forked-from: make-kinetictype@9bc49b5343d3
  category: make
  depends-on: revise-video, revise-image
---

# make-kinetictype-like-screamingtowin

> **Variant of `make-kinetictype`** (forked 2026-11-08), modelled on **screamingtowin**. Everything below is make-kinetictype as it was that day, plus what this variant changes. Improvements to make-kinetictype don't flow in by themselves: port the ones that fit (`node tools/skills.mjs diff make-kinetictype-like-screamingtowin` shows them).

## This variant

Screaming to Win's style, suggested for new material: one giant word per hit with impact frames and a
camera that never rests, Anton caps in ink, paper and one accent colour, the picture restyled in
several looks with its characters cut out in front of the type, faces clear of type, music with sound
effects and no voice-over, an end that rushes back into the start so the Short loops. That is a
suggestion, not a template: the setup of a new edit (its length, its sections, which devices come
when, what the words do, which art styles) is designed from the new quote, picture(s) and track, and
projects/screamingtowin is compared for craft only (its stills show what "powerful" and "readable"
look like, not where the cuts go).

Two things this skill got wrong on Someone Took (2026-11-08) and must not again:

1. **Treating the look as fixed.** The six Midjourney styles, the red, the 24 s shape are what worked
   for a Blue Lock page. For another picture pick the styles and colours that fit its world (a neon
   negative for a shadow monarch, stadium floodlights for a football page) and keep only what still
   serves: the slam, the type, the loop, the sounds.
2. **Replicating the setup.** Screaming to Win's shape (build → drop → faces → rise → win → end, 24 s,
   one drop 4 s in) came from that track and that quote. A new track may have two drops or a long
   outro; a new quote a three-letter hero word or a two-word tail; new pictures a grin to burst from,
   a weapon hand to rise, or no team at all. Read the three inputs first, then lay out the sections
   and the devices to fit them.

### Designing the setup from the inputs

- **The track decides the time.** Run `pick` (on the tail alone when the song has vocals and the user
  wants its instrumental part), then read analysis/hits.png: how many drops and how strong, the bass
  hits, the swells and dips, the outro. Choose the length that holds the music's own arc (20–35 s,
  not 24 by rule) and set the section marks on the hits: `hits.json`'s drop / riser / sections, by
  hand when the tool's guess is wrong (keep its own in hits.auto.json). Two drops → the hero word on
  the first, the tail words on the second; a swell before a drop → the rise; bass hits in a row →
  the faces; a thinning outro → the poster end, its warp on the last strong onset.
- **The quote decides the words' roles.** The hero word (the user picks: the shouted one) takes the
  drop letter by letter: a short one (WON) fits three hits, a long one (SCREAMING) nine. The words
  after it are the rise and the win: one word each, or a two-word tail as one big word ("WITH IT");
  the lockup is "<hero> / <the tail>." The words before it are the build, grouped by hand onto the
  beats before the drop (`storyboard --groups="…|…" --step=<s>`) and back in pairs as the poster's
  phrases; a short build gets fewer, longer groups.
- **The pictures decide the devices.** A group panel → the plates and the team cut-outs; a single
  portrait → the plates, its cut-out placed low so the words above stay readable. A grin or a scream
  → the burst's mouth; a fist, a weapon hand or a raised arm → the rise and the win's crack (cropped
  as its own square, the sleeve masked, f = its top); several pictures → the faces, each on the
  ground it contrasts with (b&w or colour on red, red-and-black on ink or paper), flashing between
  styles. No mouth → no burst (the crack runs on to the faces); no fist → a face rises.
- **The art styles fit the world.** Screaming to Win's six looks (riso, linocut, firelight, neon
  negative, oil, full colour) are a palette to pick from, swap or add to: the colour look names the
  franchise's own colours and light, and the type's red can give way to the picture's accent. Keep
  "exactly the same pose and framing" on every restyle so the plates register.

### The inputs, and making the missing ones

At least one of the three comes from the user; make the others, show them, and go on once the user
is happy (each is a checkpoint, never a silent pick):

| Missing | How to make it | Ask first |
|---|---|---|
| **the picture** | From the quote's (and the music's) mood: a manga or anime page with one dramatic moment (a scream, a celebration, a raised fist, a stare), black-and-white ink, free space for type. Midjourney through Browse Hack (`midjourney_generate`, text prompt, `--ar 4:5`, 4 images, the user picks); or fal (Ideogram `ideogram/v4.5` or FLUX.2 klein `fal-ai/flux-2/klein/9b` first, then Nano Banana 2.1 only if those can't). A franchise the user names: Pinterest (Browse Hack) for a real page, then the user picks. Every picture the user puts in the folder is in the mix | the batch and its cost |
| **the quote** | Three options of 6–12 words with one hero word (a verb or an "-ing" word that can be shouted) and a two-or-three-word ending ("…to win", "…never stop"): from the picture's scene, or the franchise's own famous line (credited in the description). Mark the hero word | which one |
| **the music** | The media library first (`mm media find instrumental epic --kind=music`); else the user's channel folders in Downloads; else Suno through Browse Hack (`suno_create`, instrumental, styles like "cinematic drops, epic drums, powerful score, orchestral composition, atmospheric", the model the user uses; each Create spends credits and makes two songs: agree first, `suno_download` the keeper into the library inbox) | the source; Suno credits |

A long instrumental (more than ~40 s): `mm kinetictype pick "<song>"
--length=24 --top=3`, give the user the three mp3 previews (`open -R` line) and the plot, and use
the one they pick (default: the first). The user picked 0:51–1:15 of a 3-minute track by ear for
Screaming to Win, and the instrumental tail of a sung track for Someone Took; the length follows the
music, not the tool's default.

### The fast path

Ask everything at once at the start (one question round): the Chrome profile by email (the one
signed in to Midjourney), the Midjourney round size (default "small": the main panel in 5–6 styles
+ each other picture in 1–2 ≈ 10–14 jobs, relax mode), the channel for delivery and upload, the
hero word, and the missing inputs above. Then, without stopping unless something fails:

1. `mm media production new <slug> --title="…" --skill=make-kinetictype-like-screamingtowin --deliver-folder=<channel folder>/<slug>`
2. `mm kinetictype new <slug> --music="<song>" --from=<s> --to=<s> --image="<picture>" --quote="…"` — read analysis/hits.png and design the sections from it (above); re-cut the stretch if the drop is wrong; write the marks into hits.json.
3. `grid`, then `crops` (`c0-art` without the text + the close-ups the devices need: faces, a mouth, a fist); the other pictures go to input/extras/ as they are.
4. Midjourney round 1 in parallel (wait: false, 6–8 at a time): the main panel in the styles chosen for its world, prompt = what's in the picture + "exactly the same pose and framing" + the style words. The Blue Lock set, to pick from:
   - "…, bold red and black ink duotone, risograph print texture, grainy"
   - "…, black and white linocut woodcut print, thick carved lines, rough ink edges"
   - "…, lit by roaring firelight, glowing embers and sparks, orange and black, cinematic"
   - "…, inverted photographic negative, glowing electric blue lines on a black background, neon energy"
   - "…, thick expressive oil painting, impasto brush strokes, deep crimson and charcoal"
   - "…, full colour anime key visual, cel shaded, vivid <the franchise's colours> and white, <its light>"
   and each other picture in the one or two styles its device needs (a face in riso and neon, a fist in fire). A manga page that is already clean ink needs no redraw.
   While they render, run the Pinterest research (make-kinetictype step 4) only if the user asked for new type ideas.
5. Pick (the cleanest of each four: faces intact, no extra limbs, the composition kept), Subtle-upscale what is shown big, round 2 only where a device still lacks a look.
6. `cutout` the plates that give cut-outs (`--all`) and the close-ups; a neon or fire restyle won't cut (black ground): use it uncut on ink or give it the riso cut-out's alpha; a 2048 upscale that loses a part gets the 1024 pick's alpha. Write input/assets.json; `storyboard --key=<hero> --groups=… --step=…` for the draft, then the edit by hand to the design (a tools/edit.py in the project keeps it reproducible).
7. `kit`, `sfx`; stills at the new edit's own moments next to screamingtowin's stills of the same devices (not the same seconds): fix what is weaker in craft (words hidden behind cut-outs, thin knock rows, a cut-out covering the word, low contrast on a ground).
8. Preview for review (`--preview`, 10 s stretches at half size), preflight (the burst's dark dive is intended), the revise-video link — the first checkpoint the user sees after the inputs.
9. After sign-off: the master, `media deliver`, the youtube/ pack (title like "<Quote in Title Case> 🔥 #<franchise>", the description as make-kinetictype step 9), preview it and ask, `youtube_fill_uploads`, then `deliver --uploaded` once the user has published.

### What to expect from the draft (and fix by eye)

- Letter looks cycle knockouts and grounds with faces: swap a look where a letter hides behind a big cut-out (keep the letter readable, at least its top two thirds).
- `faces` cycles the faces in assets.json order: put the strongest screaming face first.
- A short build (a stretch whose drop comes early) gets fewer beats than words: group more words, or start the stretch earlier.
- The `poster` phrase lines are the build's groups in pairs; a long quote may need a smaller `max` or three lines.

A picture, a quote and an instrumental become a kinetic-typography edit: every word of the quote
lands on a hit of the music as a giant slammed word, the picture's characters are cut out in front
of the type, the art itself changes style on the hits, and the end rushes back into the start so the
Short loops. Built on 2026-11-08 for "Screaming to Win" (projects/screamingtowin: the Blue Lock page
"Every cell in your body should be SCREAMING to win", 24 s of an epic brostep instrumental,
published on a YouTube Shorts channel). Every rule below is something the user decided on that
production; the log at the bottom keeps their words.

The edit is data. `projects/<slug>/video/edit.json` lists the shots, each one device with its own
time span; `src/kinetictype` draws them (one Remotion layer per shot); `mm kinetictype
<command>` does everything around it. A new project is three lines of TSX.

## First: check the MCPs

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/browse-hack` | required | Midjourney restyles and upscales of the picture and its close-ups (`midjourney_generate` with `editImage`, `midjourney_upscale`), Pinterest type research (`pinterest_bulk_start`), the YouTube upload (`youtube_fill_uploads`), a new instrumental from Suno when there is none (`suno_create`) | No restyled art (the edit runs on the one picture), no research boards, the user uploads by hand |
| `mcp/elevenlabs` | optional | Sound effects the media library doesn't have (`text_to_sound_effects`, paid: ask with the price), and a voice-over only if the user asks for one (`text_to_speech`; Scribe word times through `mm transcribe`) | The library's sounds only; no voice-over |
| `mcp/fal` | optional | A new picture or an upscale when Midjourney isn't available (Ideogram and FLUX.2 klein first; paid: ask with the price) | Pictures come from Midjourney or the user |

Look for the tools named above (`mcp__<name>__<tool>` in Claude Code; a connector added in the
Claude app has a random prefix, so match on the tool's name; load deferred ones with ToolSearch).
If one is missing, say at intake what it costs and offer to install it from MediaMake ("Set up
mcp/<name> from MediaMake by following
https://github.com/microfox-ai/mediamake/blob/main/install.md"), or go ahead without it. Browse Hack
runs in the user's Chrome: when several profiles are connected, ask which one by its Google account
email (never by number), and use the one signed in to Midjourney; the YouTube channel may live in a
different profile (list_profiles, youtube_list_channels).

## The fundamental choices (the user's, keep them)

1. **Power before polish.** One giant word per hit, never a sentence on screen at once in the build.
   Every shot slams in: scale 1.65 → 1 in 0.12 s, a rotation kick, a horizontal motion smear, a
   red/cyan colour split on the type; the camera pushes and shakes all the time; two inverted frames
   (an anime impact frame) on the big hits. v1 was "not powerful enough": small editorial type, a
   sentence line, picture blocks with marquees, a nine-row SCREAMING wallpaper, grey negative
   close-ups and a static poster ending were all thrown out.
2. **What the user loved (rise → w6), the bar for every other shot:** a fist climbing out of the dark
   towards an outline word with a small word waiting above; the word cracked on red with the fist
   punching up through it; the fist in fire in front of the word in fire colours; the word ×3 as
   windows onto the fire plate; the full plates (firelight, oil, neon) with the word low and big.
3. **The art is one picture, restyled — never new compositions.** Midjourney `editImage` restyles
   keep the pose and framing ("exactly the same pose and framing" + the style words), so the plates
   register over each other and cut-outs line up. The styles that worked: bold red-and-black
   risograph duotone, black-and-white linocut, roaring firelight, inverted neon negative (electric
   blue on black), thick crimson oil, full-colour anime key visual. Close-ups are cropped from the
   picture (faces, a raised fist), redrawn clean ("black and white manga ink, sharp clean linework,
   screentone, high detail, exactly the same pose"), then restyled too (red riso, neon, fire) "as
   needed" — so a face can flash between styles.
4. **Type:** Anton (condensed heavy caps), width-fitted; ink #0a0a0a, paper #fbfbfa and one red
   #e02b3e (sampled from the riso plate); blue and fire tones only where a plate brings them. Inspo
   "can come from anywhere", not only the franchise's posters: experimental / distortion posters,
   3D twisted type, sports grunge, Swiss — the devices that came from there are the smeared type
   (DIFFUSION, ESDR pins), stacked repeats with slices (PARANOIA, TWIST), the subject in front of the
   giant word (HE'S NOT DONE), the cracked word (UNBROKEN).
5. **Faces stay clear of type.** Type sits behind cut-outs or in free space, never over a face.
6. **The shape (24 s, 9:16):** open (≈1 s) → build on the riser, one word group per beat → the hero
   word letter by letter on the drop's drum hits, then on the plates, cracked, bursting out of a
   mouth → faces on the bass hits → the rise → the last word (cracked, fire, windows, plates,
   flashes) → the end: the quote slammed phrase by phrase above the full-colour picture, the final
   lockup, the bottom line cracking → a rush into a face burning to white.
7. **It loops.** The end burns to white and the start opens out of the same white with the same rush
   slowing down (shot `open`); the music has no end fade; no inverted frame at the seam (the last
   and first frames are both white). Check frames 0 and N−1.
8. **The music leads; no voice-over unless asked.** Impacts and special effects on the hits (swooshes
   on the slams, a riser and a reverse whoosh into the drop, glitches on strobes and flashes, sub
   drops under the big hits, glass/ice cracks where a word cracks, a sizzle on fire, a heartbeat on a
   bass slide, a reverse whoosh into the loop's white). The user tried four voices and removed them
   all ("i liked it before, just add some special sound fx along with the music"). If a voice-over is
   asked for: one natural read ("do not overtightly follow the visuals"), only the hero word pinned to
   its hit, its echo carried "until the to win comes", the ending said "when the word first appears"
   and its last word echoing into its big hit (tools in projects/screamingtowin/tools/vo2.py).
9. **Ask before spending:** Midjourney batches (relax mode is in the plan, still ask the size),
   ElevenLabs credits, fal, Suno. Give the estimate, start small.

## The workflow

### 1. Intake

- The three inputs: **a picture** (a manga page, a poster, an artwork; text on it is cropped off),
  **a quote** (the words on screen; which one is the hero word), **music** (an instrumental and the
  stretch to use, or a long one to pick from). Missing ones: make-kinetictype-like-screamingtowin
  says how to make them.
- The shape: 9:16 Short by default (ask; a 16:9 section works the same with width/height in
  edit.json and the type re-fitted). Length: the stretch's length (≈24 s).
- The channel (for the delivery folder and the upload) and the Chrome profile, by email.
- Register the production: `mm media production new <slug> --title="…"
  --skill=make-kinetictype --deliver-folder=<channel folder>/<slug>`.

### 2. The music

```bash
mm kinetictype pick "<song>" --length=24 --top=3      # long song: 3 stretches + mp3 previews + plot
mm kinetictype new <slug> --music="<song>" --from=51 --to=75 --image="<picture>" --quote="…"
```

`pick` looks for a quiet build into a drop about 4 s in (the bass coming back in), strong section
hits after it and a dip at the end (good for the loop). Let the user choose by ear from the mp3
previews (the user's own pick on Screaming to Win, 0:51–1:15, was the tool's first pick before its
drop detection changed: offer all three). `new` cuts the stretch (input/music.wav, gained to a
−1.8 dBFS peak, 20 ms fades so it loops), clones the picture, writes the manifest, a placeholder
edit and prefs.md, and runs `hits`: analysis/hits.json + hits.png with the riser, the drop, the
section hits (bass re-entries after the drop), onsets and beats. Look at hits.png; the storyboard
hangs on `drop` and `sections`. A Suno excerpt's tempo is unreliable; the build is counted back from
the drop on the song's pulse instead.

### 3. Crops and Midjourney

```bash
mm kinetictype grid <slug>                     # analysis/grid.jpg: read the coordinates
mm kinetictype crops <slug> --boxes='{"c0-art":[0,250,735,920],"c1-top":[165,262,545,642],"c5-fist":[385,268,545,468]}'
```

`c0-art` is the whole art without its text; then 4–5 close-ups: each important face (square-ish,
the head in the upper third, with shoulders) and a raised fist or the strongest gesture. Each gets
a `-1024` copy for Midjourney.

Midjourney (the midjourney-restyle skill's steps; ask the batch size first, relax mode):
- the panel `c0-art-1024.png` in the six styles (choice 3), prompt = what's in the picture + "exactly
  the same pose and framing" + the style words;
- each close-up redrawn clean (the ink prompt), then 1–2 style variations of each from the pick
  (`editImage: mj:<jobId>#<i>`: red riso, neon negative, the fist in fire);
- `wait: false`, 6–8 jobs at a time, `midjourney_job_status`, `midjourney_download_images` with a set
  name; contact sheets (`mm kinetictype sheet <folder>`) and a review set
  (`mm image-index out/<slug>-mj --groups=subfolders`, link
  https://mediamake.microfox.app/file-revision?job=<slug>-mj);
- Subtle-upscale the picks to 2048 (`midjourney_upscale`) before using them big; copy them to
  input/plates/ (the panel styles) and input/chars/ (the close-ups).

### 4. Type research (Pinterest)

Browse Hack, one search per tab, `pinterest_bulk_start` (perPageLimit 15, includeVideos false),
`pinterest_bulk_stop`, contact sheets. Search wide: kinetic typography motivational / anime edit,
manga typography posters, experimental distortion posters, 3D twisted type, sports grunge posters,
Swiss posters. Name the devices you take and from which pins (choice 4); put them in prefs.md.

### 5. Cut-outs and the assets file

```bash
mm kinetictype cutout <slug> input/plates/red-riso.png input/plates/linocut.png input/plates/anime-colour.png --all
mm kinetictype cutout <slug> input/chars/c1-top.png input/chars/c5-fist.png input/chars/c1-riso.png
```

`--all` for the group plates (every character kept). Look at input/cutouts/_checks.jpg; a blob (a
close-up of tangled limbs) is dropped. Then write `input/assets.json`; the face and mouth points
are fractions of each square, read off the cut-out:

```json
{
  "plates": { "riso": "plates/red-riso.png", "lino": "plates/linocut.png", "neon": "plates/neon-negative.png",
              "fire": "plates/firelight.png", "oil": "plates/oil-crimson.png", "colour": "plates/anime-colour.png" },
  "teams": { "riso": "cutouts/red-riso.png", "lino": "cutouts/linocut.png", "colour": "cutouts/anime-colour.png" },
  "faces": [ { "src": "cutouts/c3-left.png", "f": [0.33, 0.28] },
             { "src": "cutouts/c1-riso.png", "f": [0.27, 0.27], "mouth": [0.2, 0.43] } ],
  "fist": { "src": "cutouts/c5-fist.png", "f": [0.37, 0.16] },
  "fistFire": { "src": "cutouts/c5-fire.png", "f": [0.35, 0.2] },
  "open": { "plate": "lino", "face": [0.36, 0.17] },
  "warp": { "face": [0.4, 0.15] }
}
```

### 6. The storyboard

```bash
mm kinetictype storyboard <slug> --key=SCREAMING --title="Screaming / To Win"
```

The quote splits around the hero word (`--key`, else the longest word): the words before it are the
build (short words ride with the next: "IN YOUR"), the hero word is the drop, the words after it are
the rise (all but the last: "TO") and the win (the last: "WIN"); the end slams the build in pairs of
groups, then the hero word, then the lockup "<hero> / <the rest>." Sections come from `drop` and the
first four section hits (else proportions). It writes video/edit.json (the old one kept as
edit.prev.json) and video/shots.json (the review map). On Screaming to Win the draft landed on the
same cuts as the hand-made edit. Then refine edit.json by eye; the devices:

| `type` | What it draws | Key fields |
|---|---|---|
| `open` | out of white, the rush slowing on a plate (the loop's landing) | `plate`, `face` |
| `slam` | a giant word / stack on a ground, a knockout or a plate; a cut-out rising into it | `ground` / `knock` / `plate`, `rows`, `color`, `stroke`, `echoes`, `y`, `width`, `max`, `cut`, `lines`, `glow`, `invertStart` |
| `strobe` | a word strobing black/white, growing (the beat before a drop) | `word` |
| `letters` | the hero word one letter per hit, each its own look, an ink bar spelling it | `word`, `hits`, `looks` |
| `crack` | a cracked word on a ground, a cut-out punching up into it | `word`, `ground`, `color`, `y`, `cut`, `crackAt`, `echoes` |
| `burst` | the letters bursting out of a mouth past the camera, then the dive into the mouth | `word`, `cut` (f = the mouth), `diveAt` |
| `faces` | faces slammed on grounds on the hits, the word running vertically behind | `word`, `faces[]` |
| `rise` | a fist climbing to an outline word, a small word above, the drum roll pulsing | `big`, `small`, `smallAt`, `cut`, `roll` |
| `flash` | every plate flashing two frames each under a cracked word | `word`, `plates` |
| `poster` | the end: phrases slammed, the lockup, the crack, the warp into white | `plate`, `cutout`, `phrases`, `final`, `warp` |

Cut-outs are squares placed by a focus point: `{ "src", "f": [fx, fy], "at": [x, y], "w" }` puts the
point f of the picture at screen point (x, y), w px wide. Keep cut edges off-screen (w ≈ 1700–1900
for close-ups). Anything the devices can't do goes in a custom scene in the project's index.tsx
next to `kineticLayers(edit)` (src/kinetictype/index.tsx).

**A section inside a longer video:** in that project's index.tsx add
`...kineticLayers(edit)` to its layers with the shots' times in that video's seconds, or render
the kinetic project and splice it in.

### 7. Check, review, revise

```bash
ONLY_PROJECT=<slug> mm stills <slug> 0.5,1.3,2.3,4.6,6.8,8.7,9.5,12.8,15.0,16.6,18.5,21.6,23.9 --only
mm render <slug> --preview && mm preflight <slug> --video=out/<slug>/preview/<slug>.mp4
```

Look at every still before the user does (Tailwind's `img {max-width:100%}` once capped every picture
at 1080 px: the engine sets `maxWidth: 'none'`). The review loop is revise-video's (link, background
watcher, revision files). An intended dark beat (the dive into the mouth) is answered with
`preflight --intended`. Check the loop seam: frame 0 and the last frame both white.

### 8. Sound

```bash
mm kinetictype kit <slug>      # the sound kit from the media library into input/sfx/
mm kinetictype sfx <slug>      # video/sfx.json from the edit (first time), mixed → input/mix-sfx.wav
```

`sfx` writes the cues once from the shots (choice 8), mixes them over the music through a limiter,
and points the manifest's audio at input/mix-sfx.wav (one file: the review and the master sound
the same). Edit video/sfx.json (gain, pan, `at` or `end`) and run it again; `--auto` rebuilds the
cues from the edit. Stacked sub drops and booms at a big hit are what push it into the limiter:
lower those first. Aim for ≈ −13 LUFS, true peak under −1 dB. A sound-only change is muxed onto the
last render (revise-video, sound-only revisions), not re-rendered.

### 9. Master, delivery, upload

- The master once the user signs off: `mm render <slug>`, preflight.
- `mm media deliver <slug> --what=video` (dry run), then `--yes`.
- The upload: a `youtube/` folder beside the delivery with the video (a clone), title.txt,
  description.txt (the quote, a line about the edit, the source's credit, the music, at most 5
  hashtags) and info.json (`channel` @handle, `madeForKids: false`, `alteredContent: false`, category,
  language, tags). Preview the title and description and ask first; then `youtube_fill_uploads` with
  the folder: the tab waits on the Visibility step for the user to Publish or Schedule. When they say
  it's out: `mm media deliver <slug> --uploaded`.

## Feedback log

Append dated entries: what the user said → the rule.

- 2026-11-08 · "crop the image, create multiple variations in different art styles in the midjourney (browse for some good kinetic typography effects in pinterest, pick a style that matches, and make an inspirational edit (you can also create other images of individual characters by cropping the image … and gen in midjourney if needed) use the music from 51 to 1:15" → the workflow: crops, Midjourney panel restyles, close-ups redrawn, Pinterest research, a 24 s 9:16 edit on that stretch.
- 2026-11-08 · "no need to stick to bluelock poster for inspiration, inspiration can come from anywhere" → research wide (choice 4).
- 2026-11-08 · "you can also create variations of the zoomedin images as needed in midjourney" → close-ups restyled too (choice 3).
- 2026-11-08, on v1 · "make it more dynamic, not powerful enough, i only like rise to w6, the rest is not good" → choices 1 and 2; the slam device, letter-by-letter drop, faces on grounds, impact frames.
- 2026-11-08, on v2 · "dw4 and dz are bad, redo them. e3 should end with a zoom in warping it to o1 making it a loop" → `crack` with the team punching up, `burst` out of the mouth, the warp and `open` (choice 7).
- 2026-11-08 · voice-overs (Final Boss, Charlie, Knox, Havoc) with "do not overtightly follow the visuals", "after screaming, create an echo effect untill the to win comes", "to win should appear when the word first appears, and then win in echo later on" — then "remove all voices, i liked it before, jsut add some speciall sound fx along witht the music" → choice 8.
- 2026-11-08 · the engine (src/kinetictype) and `mm kinetictype` made from the project, checked against it side by side: the auto storyboard landed on the same cuts.
- 2026-11-08, Someone Took (Solo Leveling, "someone took the same situation you're complaining about and won with it") · "pick instrumental part at the end of the audio" → when the track is a song, the stretch comes from its instrumental tail: run `pick` on the tail alone (cut it to a file from where the vocals end) and take its drop, even if the tool scores a sung section higher. The tail's second drop became the win (hits.json's drop / sections set by hand, the tool's kept in hits.auto.json).
- 2026-11-08 · "you can also use the statue image in the mix" (five pictures given: four of the hero, one of the villain's grin) → every picture the user puts in the folder is in the mix: the main panel gets the six styles, the others two styles each (riso + neon / fire) and become the faces, the mouth of the burst and the fist. The hero word was WON (the user's pick over COMPLAINING): the drop takes the short word letter by letter on its three bass hits, the two-word tail "WITH IT" is the rise and the win, the lockup "WON / WITH IT."
- 2026-11-08 · engine notes from this run: `storyboard --groups="A B|C|…" --step=0.5` sets the build by hand; rembg on the 2048 upscales lost parts (the statue's right half, the dagger fist) that the 1024 picks kept, so cut the 1024 pick and put its alpha on the upscale; the neon-negative and firelight restyles don't cut at all (black grounds): the neon face goes on the ink ground uncut, the fire fist takes the riso cut-out's alpha (same framing). Parallel `midjourney_download_images` calls are fine; the inbox watcher ingests the files into _LIBRARY/_unsorted/art/<set>/ within a minute.
- 2026-11-09, after Someone Took · "you got 2 things wrong in the skill, the skill should only suggest the video style, but not an exact replica, the new setup would be dependent on the new quote/image/track. for now, just update the skill, no need to redo it" → "This variant" rewritten: the style is a suggestion; the setup (length, sections, devices, word roles, art styles) is designed from the new inputs ("Designing the setup from the inputs"); the reference's stills compare craft, not moments. Someone Took stays as made.
