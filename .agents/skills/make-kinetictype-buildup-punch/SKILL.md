---
name: make-kinetictype-buildup-punch
description: The buildup-punch style of make-kinetictype — a kinetic-typography edit in Remotion where a quote is slammed one giant word per hit: a build on the riser, the hero word letter by letter on the drop, faces on the bass hits, a rise, the last word cracked and on fire, and an end that rushes back into the start so the Short loops; over one picture restyled in Midjourney, its characters cut out in front of the type, words as windows onto the art, impact frames and sound effects on every hit. It holds what is only this style's: the user's fundamental choices from the first one ("Screaming to Win", a Blue Lock page, 2026-11-08), its art styles, its storyboard shape and planner (mm kinetictype storyboard) and its sound cues. The steps every style shares (the music, the research, the pictures, the edit as data, checks, sound, review through revise-video, the master, delivery, upload) are make-kinetictype's, cited here. Use when the user says "buildup punch", "the buildup-punch style", "one giant word per hit", "slam the quote word by word into a drop", "a build into a drop", "/make-kinetictype-buildup-punch", or asks to change a project made in this style (a production registered as make-kinetictype before 2026-11-25 is one); otherwise make-kinetictype. For the exact Screaming-to-Win look from an image, a quote and a song (making what's missing), use make-kinetictype-like-screamingtowin. Not for lyric videos of a sung song (make-lyrics-video, make-waveform-lyric-video) or footage edits (make-video-music-remix, make-anime-music-video). New user feedback goes in your notes (mm notes add), never in this file.
metadata:
  category: make
  version: 0.1.0
  depends-on: make-kinetictype, revise-video, revise-image
---

# make-kinetictype-buildup-punch

A picture, a quote and an instrumental become a kinetic-typography edit: every word of the quote
lands on a hit of the music as a giant slammed word, the picture's characters are cut out in front
of the type, the art itself changes style on the hits, and the end rushes back into the start so the
Short loops. Built on 2026-11-08 for "Screaming to Win" (projects/screamingtowin: the Blue Lock page
"Every cell in your body should be SCREAMING to win", 24 s of an epic brostep instrumental,
published on a YouTube Shorts channel). Every rule below is something the user decided on that
production; the log at the bottom keeps their words.

This is a style of the kinetic type family (it was `make-kinetictype` itself until 2026-11-25). What it
fixes is the motion grammar: one giant word per hit, a build into a drop, cut-outs in front of the
type, a loop (choices 1, 2, 5, 7 and 8, and the order of the shape in choice 6). The type, the colours,
the art styles and the storyboard's times below are the first production's: the place to start from,
chosen again for each job from its own research, pictures and track.

## This style and make-kinetictype

`make-kinetictype` holds the steps every style shares; this skill holds only what is this style's and
cites the rest by step. Read `make-kinetictype`'s SKILL.md once a session (its shared steps, and the two
files beside it: `reference/devices.md` for the edit and every device, `reference/pictures.md` for crops,
Midjourney and cut-outs), then follow the workflow here. Read the notes too: `mm notes
make-kinetictype-buildup-punch` and `mm notes make-kinetictype`. A rule there wins over a default here.

The edit is data: `projects/<slug>/video/edit.json` lists the shots, each one device with its own time
span, and `mm kinetictype <command>` does everything around it.

## First: check the MCPs

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/browse-hack` | required | Midjourney restyles and upscales of the picture and its close-ups (`midjourney_generate` with `editImage`, `midjourney_upscale`), Pinterest type research (`pinterest_bulk_start`), the YouTube upload (`youtube_fill_uploads`), a new instrumental from Suno when there is none (`suno_create`) | No restyled art (the edit runs on the one picture), no research boards, the user uploads by hand |
| `mcp/elevenlabs` | optional | Sound effects the media library doesn't have (`text_to_sound_effects`, paid: ask with the price), and a voice-over only if the user asks for one (`text_to_speech`; Scribe word times through `mm transcribe`) | The library's sounds only; no voice-over |
| `mcp/fal` | optional | A new picture or an upscale when Midjourney isn't available (Ideogram and FLUX.2 klein first; paid: ask with the price) | Pictures come from Midjourney or the user |

How to look for them, what to say when one is missing and which Chrome profile to ask for:
`make-kinetictype` › First: check the MCPs.

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

Each step names the shared step it rests on (`make-kinetictype` step N) and then what this style adds.

### 1. Intake

`make-kinetictype` step 1, asking for this style's three inputs:

- **A picture** (a manga page, a poster, an artwork; text on it is cropped off), **a quote** (the words
  on screen; which one is the hero word), **music** (an instrumental and the stretch to use, or a long
  one to pick from). A missing one is asked for; a like skill of this style may say how to make it
  (`make-kinetictype` lists them).
- The shape: 9:16 Short by default (ask; a 16:9 section works the same with width/height in
  edit.json and the type re-fitted). Length: the stretch's length (≈24 s).
- The channel (for the delivery folder and the upload) and the Chrome profile, by email.
- Register the production: `mm media production new <slug> --title="…"
  --skill=make-kinetictype-buildup-punch --deliver-folder=<channel folder>/<slug>`.

### 2. The music

`make-kinetictype` step 2 (`pick`, `new`, `hits`). For this style:

```bash
mm kinetictype pick "<song>" --length=24 --top=3      # long song: 3 stretches + mp3 previews + plot
mm kinetictype new <slug> --music="<song>" --from=51 --to=75 --image="<picture>" --quote="…"
```

The stretch is a quiet build into a drop about 4 s in (the bass coming back in), strong section hits
after it and a dip at the end (good for the loop): what `pick` looks for. Let the user choose by ear
from the mp3 previews (the user's own pick on Screaming to Win, 0:51–1:15, was the tool's first pick
before its drop detection changed: offer all three). Look at hits.png; the storyboard hangs on `drop`
and `sections`. A Suno excerpt's tempo is unreliable; the build is counted back from the drop on the
song's pulse instead.

### 3. Crops and Midjourney

`make-kinetictype` step 5 (`reference/pictures.md`, parts 1 and 2). This style's crops and styles:

```bash
mm kinetictype grid <slug>                     # analysis/grid.jpg: read the coordinates
mm kinetictype crops <slug> --boxes='{"c0-art":[0,250,735,920],"c1-top":[165,262,545,642],"c5-fist":[385,268,545,468]}'
```

`c0-art` is the whole art without its text; then 4–5 close-ups: each important face (square-ish,
the head in the upper third, with shoulders) and a raised fist or the strongest gesture.

Midjourney (ask the batch size first, relax mode):
- the panel `c0-art-1024.png` in the six styles (choice 3), prompt = what's in the picture + "exactly
  the same pose and framing" + the style words;
- each close-up redrawn clean (the ink prompt), then 1–2 style variations of each from the pick
  (`editImage: mj:<jobId>#<i>`: red riso, neon negative, the fist in fire);
- the picks Subtle-upscaled to 2048 before they are used big, then copied to input/plates/ (the panel
  styles) and input/chars/ (the close-ups).

### 4. Type research (Pinterest)

`make-kinetictype` step 4: never skipped, and always before the storyboard. For this style, search
wide: kinetic typography motivational / anime edit, manga typography posters, experimental distortion
posters, 3D twisted type, sports grunge posters, Swiss posters. Name the devices you take and from
which pins (choice 4); put them in prefs.md.

### 5. Cut-outs and the assets file

`make-kinetictype` step 5 (`reference/pictures.md`, parts 3 and 4):

```bash
mm kinetictype cutout <slug> input/plates/red-riso.png input/plates/linocut.png input/plates/anime-colour.png --all
mm kinetictype cutout <slug> input/chars/c1-top.png input/chars/c5-fist.png input/chars/c1-riso.png
```

`--all` for the group plates (every character kept). Then `input/assets.json` with what this style's
planner reads: the six `plates`, the `teams` (the cut-outs of the riso, linocut and colour plates), the
`faces` (the strongest screaming face first; a `mouth` point on the one the hero word bursts from), the
`fist` and `fistFire`, the plate and face the `open` lands on, and the face the end `warp`s into.

### 6. The storyboard

`make-kinetictype` step 6, with this style's planner:

```bash
mm kinetictype storyboard <slug> --key=SCREAMING --title="Screaming / To Win"
```

The quote splits around the hero word (`--key`, else the longest word): the words before it are the
build (short words ride with the next: "IN YOUR"), the hero word is the drop, the words after it are
the rise (all but the last: "TO") and the win (the last: "WIN"); the end slams the build in pairs of
groups, then the hero word, then the lockup "<hero> / <the rest>." Sections come from `drop` and the
first four section hits (else proportions). `--groups="A B|C|…" --step=0.5` sets the build's word
groups and the seconds between them by hand. It writes video/edit.json (the old one kept as
edit.prev.json) and video/shots.json (the review map). On Screaming to Win the draft landed on the
same cuts as the hand-made edit. Then refine edit.json by eye, device by device
(`make-kinetictype`'s `reference/devices.md` has each one's fields, how a cut-out is placed, a custom
scene for what the devices can't do, and how the edit sits as a section inside a longer video).

### 7. Sound

`make-kinetictype` step 8 (`kit`, `sfx`), with this style's cues (choice 8): `sfx` writes them from the
shots. Stacked sub drops and booms at a big hit are what push the mix into the limiter: lower those
first. Aim for ≈ −13 LUFS, true peak under −1 dB. A sound-only change is muxed onto the last render
(revise-video, sound-only revisions), not re-rendered.

### 8. Check, review, revise

`make-kinetictype` steps 7 and 9:

```bash
ONLY_PROJECT=<slug> mm stills <slug> 0.5,1.3,2.3,4.6,6.8,8.7,9.5,12.8,15.0,16.6,18.5,21.6,23.9 --only
mm render <slug> --preview && mm preflight <slug> --video=out/<slug>/preview/<slug>.mp4
```

A still in every part of the shape (the seconds above are a 24 s edit's). Look at every still before
the user does. The review loop is revise-video's (link, background watcher, revision files). An
intended dark beat (the dive into the mouth) is answered with `preflight --intended`. Check the loop
seam: frame 0 and the last frame both white.

### 9. Master, delivery, upload

`make-kinetictype` step 10: the master once the user signs off, `mm media deliver` on their approval,
the `youtube/` pack previewed and asked about before `youtube_fill_uploads`. The description: the
quote, a line about the edit, the source's credit, the music, at most 5 hashtags.

## Where it runs

| Step | Needs | A person's yes | Safe to repeat | Without it |
|---|---|---|---|---|
| 1. Intake | nothing | no | yes | - |
| 1b. Register the production | `media:library` | no | yes | skipped in a cloud session: the production is registered on a computer when its files are delivered |
| 2. The music | `media:library` | no | yes | the track from the session's own files, or the Cloud Library (`mm library use`) |
| 3. Crops and Midjourney | `mcp:browse-hack`, `browser:midjourney` | yes | no | a to-do: the Midjourney round on a computer signed in to Midjourney |
| 4. Type research | `mcp:browse-hack` | no | yes | a to-do: the Pinterest research on a computer with Browse Hack |
| 5. Cut-outs and the assets file | nothing | no | yes | - |
| 6. The storyboard | `render` | no | yes | - |
| 7. Sound | `media:library` | no | yes | a to-do: the sound kit and the mix on a computer with the media library |
| 8. Check and preview | `render` | no | yes | - |
| 8b. The user's review | `render` | yes | yes | - |
| 9. The master | `render` | yes | yes | - |
| 9b. Deliver | `media:library` | yes | yes | `mm cloud deliver <slug>` hands the user the files |
| 9c. Upload to YouTube | `mcp:browse-hack`, `browser:youtube` | yes | no | a to-do: upload the pack from a computer signed in to the channel |

Step 3's crops need no browser; its Midjourney round is asked about first (the batch's size) and is
never run twice for the same pictures. The other steps that can cost money are a sound effect made with
ElevenLabs (step 7) and a voice-over, only when the user asks for one (choice 8): each shows the price
and waits for the user's yes. Step 9c fills the upload form; the user publishes.

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add make-kinetictype-buildup-punch "<what the user said> → <the rule>"   # a new lesson, dated for you
mm notes make-kinetictype-buildup-punch                                           # your notes for this skill
```

When the user wants them shared, `mm notes promote make-kinetictype-buildup-punch` offers them to this log as a pull request.

A lesson that is true for every kinetic type style goes in `make-kinetictype`'s notes instead.

- 2026-11-08 · "crop the image, create multiple variations in different art styles in the midjourney (browse for some good kinetic typography effects in pinterest, pick a style that matches, and make an inspirational edit (you can also create other images of individual characters by cropping the image … and gen in midjourney if needed) use the music from 51 to 1:15" → the workflow: crops, Midjourney panel restyles, close-ups redrawn, Pinterest research, a 24 s 9:16 edit on that stretch.
- 2026-11-08 · "you can also create variations of the zoomedin images as needed in midjourney" → close-ups restyled too (choice 3).
- 2026-11-08, on v1 · "make it more dynamic, not powerful enough, i only like rise to w6, the rest is not good" → choices 1 and 2; the slam device, letter-by-letter drop, faces on grounds, impact frames.
- 2026-11-08, on v2 · "dw4 and dz are bad, redo them. e3 should end with a zoom in warping it to o1 making it a loop" → `crack` with the team punching up, `burst` out of the mouth, the warp and `open` (choice 7).
- 2026-11-08 · voice-overs (Final Boss, Charlie, Knox, Havoc) with "do not overtightly follow the visuals", "after screaming, create an echo effect untill the to win comes", "to win should appear when the word first appears, and then win in echo later on" — then "remove all voices, i liked it before, jsut add some speciall sound fx along witht the music" → choice 8.
- 2026-11-08 · the engine (src/kinetictype) and `mm kinetictype` made from the project, checked against it side by side: the auto storyboard landed on the same cuts.
- 2026-11-08, Someone Took (Solo Leveling, "someone took the same situation you're complaining about and won with it") · "pick instrumental part at the end of the audio" → when the track is a song, the stretch comes from its instrumental tail: run `pick` on the tail alone (cut it to a file from where the vocals end) and take its drop, even if the tool scores a sung section higher. The tail's second drop became the win (hits.json's drop / sections set by hand, the tool's kept in hits.auto.json).
- 2026-11-08 · "you can also use the statue image in the mix" (five pictures given: four of the hero, one of the villain's grin) → every picture the user puts in the folder is in the mix: the main panel gets the six styles, the others two styles each (riso + neon / fire) and become the faces, the mouth of the burst and the fist. The hero word was WON (the user's pick over COMPLAINING): the drop takes the short word letter by letter on its three bass hits, the two-word tail "WITH IT" is the rise and the win, the lockup "WON / WITH IT."
- 2026-11-08 · engine notes from this run: `storyboard --groups="A B|C|…" --step=0.5` sets the build by hand; rembg on the 2048 upscales lost parts (the statue's right half, the dagger fist) that the 1024 picks kept, so cut the 1024 pick and put its alpha on the upscale; the neon-negative and firelight restyles don't cut at all (black grounds): the neon face goes on the ink ground uncut, the fire fist takes the riso cut-out's alpha (same framing). Parallel `midjourney_download_images` calls are fine; the inbox watcher ingests the files into _LIBRARY/_unsorted/art/<set>/ within a minute.
- 2026-11-09, Someone Took v2 · "in the open section use shots of him as failure, you can use midjourney to convert them as well into the graphic style you need" → the build can carry the hero's low point so the drop is a reversal: frames of him failing from the source (the library's episodes first), square-cropped, restyled in Midjourney into the edit's look (ask the batch size), the open kept colourless so the accent colour arrives with his turn.
- 2026-11-25 · Renamed from `make-kinetictype`, which became the family's superset: this skill keeps the style's choices and this log; the steps every style shares, and the lessons true for every style (research wide, research never skipped, a fresh take from the inputs), moved to `make-kinetictype`.
