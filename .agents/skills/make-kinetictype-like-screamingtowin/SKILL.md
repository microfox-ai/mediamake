---
name: make-kinetictype-like-screamingtowin
description: The Screaming to Win look, as a like skill of make-kinetictype-buildup-punch (the kinetic type family's buildup-punch style, pinned to one example: projects/screamingtowin, published 2026-11-08) — give it a picture, a quote and music (or any one of them: it makes the two that are missing) and it makes a stunning 9:16 kinetic-type Short in that look, end to end — the look is the suggestion (the slam language, the type, the restyled picture, the loop, the sounds); the setup (length, sections, which devices when, what the words do, which art styles) is designed from the new quote, picture and track, never copied from the reference. It holds only what the example adds (designing the setup from the inputs, making a missing picture, quote or track, the fast path, what to fix in the draft); the style's rules are make-kinetictype-buildup-punch's and the shared steps make-kinetictype's. Use when the user says "make one like Screaming to Win", "a kinetic type short like the Blue Lock one", "here's a picture / quote / song, make that style", "make a kinetictype short from this picture / quote / song", "/make-kinetictype-like-screamingtowin", or gives a long instrumental to cut a kinetic edit from in that look; otherwise make-kinetictype-buildup-punch for the style, or make-kinetictype for the family. New user feedback goes in your notes (mm notes add), never in this file.
metadata:
  category: make
  version: 0.1.0
  depends-on: make-kinetictype-buildup-punch, make-kinetictype, revise-video
---

# make-kinetictype-like-screamingtowin

A like skill of the kinetic type family: the buildup-punch style, pinned to one example, Screaming to
Win (projects/screamingtowin, published 2026-11-08). It holds only what the example adds. The style's
own rules (its fundamental choices, its storyboard planner, its sound cues, its nine steps) are
`make-kinetictype-buildup-punch`'s, and the steps every style shares are `make-kinetictype`'s. Nothing
of either is copied here, so a change to them reaches this skill by itself.

Read both once a session, then work from the fast path below. Read the notes of all three before
planning: `mm notes make-kinetictype-like-screamingtowin`, `mm notes make-kinetictype-buildup-punch`
and `mm notes make-kinetictype`. A rule there wins over a default here.

## First: check the MCPs

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/browse-hack` | required | Midjourney: the restyles and upscales, and a new picture when there is none (`midjourney_generate`, `midjourney_upscale`); the research and a franchise's real page on Pinterest (`pinterest_bulk_start`); a new instrumental from Suno when there is none (`suno_create`, `suno_download`); the YouTube upload (`youtube_fill_uploads`) | No restyled art and no made picture or track: the user brings all three inputs, and uploads by hand |
| `mcp/elevenlabs` | optional | Sound effects the media library doesn't have (`text_to_sound_effects`, paid: ask with the price) | The library's sounds only |
| `mcp/fal` | optional | A new picture when Midjourney isn't available (Ideogram and FLUX.2 klein first; paid: ask with the price) | Pictures come from Midjourney or the user |

How to look for them and which Chrome profile to ask for: `make-kinetictype` › First: check the MCPs.

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
   While they render, run the inspiration research (make-kinetictype step 4): it is never skipped. Search from the new inputs, and name what is taken, with its pins, in prefs.md.
5. Pick (the cleanest of each four: faces intact, no extra limbs, the composition kept), Subtle-upscale what is shown big, round 2 only where a device still lacks a look.
6. `cutout` the plates that give cut-outs (`--all`) and the close-ups; a neon or fire restyle won't cut (black ground): use it uncut on ink or give it the riso cut-out's alpha; a 2048 upscale that loses a part gets the 1024 pick's alpha. Write input/assets.json; `storyboard --key=<hero> --groups=… --step=…` for the draft, then the edit by hand to the design (a tools/edit.py in the project keeps it reproducible).
7. `kit`, `sfx`; stills at the new edit's own moments next to screamingtowin's stills of the same devices (not the same seconds): fix what is weaker in craft (words hidden behind cut-outs, thin knock rows, a cut-out covering the word, low contrast on a ground).
8. Preview for review (`--preview`, 10 s stretches at half size), preflight (the burst's dark dive is intended), the revise-video link — the first checkpoint the user sees after the inputs.
9. After sign-off: the master, `media deliver`, the youtube/ pack (title like "<Quote in Title Case> 🔥 #<franchise>", the description as make-kinetictype step 10), preview it and ask, `youtube_fill_uploads`, then `deliver --uploaded` once the user has published.

### What to expect from the draft (and fix by eye)

- Letter looks cycle knockouts and grounds with faces: swap a look where a letter hides behind a big cut-out (keep the letter readable, at least its top two thirds).
- `faces` cycles the faces in assets.json order: put the strongest screaming face first.
- A short build (a stretch whose drop comes early) gets fewer beats than words: group more words, or start the stretch earlier.
- The `poster` phrase lines are the build's groups in pairs; a long quote may need a smaller `max` or three lines.

## Where it runs

| Step | Needs | A person's yes | Safe to repeat | Without it |
|---|---|---|---|---|
| 0. Ask everything at once | nothing | no | yes | - |
| 0b. Make the missing inputs | `mcp:browse-hack` | yes | no | a to-do: the missing picture or track made on a computer with Browse Hack |
| 1. Register the production | `media:library` | no | yes | skipped in a cloud session: the production is registered on a computer when its files are delivered |
| 2. The project and the music | `media:library` | no | yes | the track from the session's own files, or the Cloud Library (`mm library use`) |
| 3. Crops | nothing | no | yes | - |
| 4. Midjourney round 1 and the research | `mcp:browse-hack`, `browser:midjourney` | yes | no | a to-do: the Midjourney round and the Pinterest research on a computer signed in to Midjourney |
| 5. Picks, upscales, round 2 | `mcp:browse-hack`, `browser:midjourney` | no | no | a to-do: the picks and their upscales on a computer signed in to Midjourney |
| 6. Cut-outs, assets and the edit | `render` | no | yes | - |
| 7. Sound and stills | `media:library`, `render` | no | yes | a to-do: the sound kit and the mix on a computer with the media library |
| 8. Preview and the user's review | `render` | yes | yes | - |
| 9. The master | `render` | yes | yes | - |
| 9b. Deliver | `media:library` | yes | yes | `mm cloud deliver <slug>` hands the user the files |
| 9c. Upload to YouTube | `mcp:browse-hack`, `browser:youtube` | yes | no | a to-do: upload the pack from a computer signed in to the channel |

The numbers are the fast path's. Step 0b runs only for an input the user didn't give; a quote is written
in the session and needs nothing. What can cost money: a made picture (Midjourney, or fal), a track from
Suno, the Midjourney rounds, and a sound effect made with ElevenLabs. Each is agreed in step 0's one
round of questions, with its size or its price. Step 9c fills the upload form; the user publishes.

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add make-kinetictype-like-screamingtowin "<what the user said> → <the rule>"   # a new lesson, dated for you
mm notes make-kinetictype-like-screamingtowin                                           # your notes for this skill
```

When the user wants them shared, `mm notes promote make-kinetictype-like-screamingtowin` offers them to this log as a pull request.

A lesson about the style, true beyond this look, goes in `make-kinetictype-buildup-punch`'s notes; one
true for every style, in `make-kinetictype`'s. The style's own log, with this skill's earlier lessons
about it (the instrumental tail, every picture in the mix, the cut-out fixes), is in
`make-kinetictype-buildup-punch`.

- 2026-11-09, after Someone Took · "you got 2 things wrong in the skill, the skill should only suggest the video style, but not an exact replica, the new setup would be dependent on the new quote/image/track. for now, just update the skill, no need to redo it" → "This variant" rewritten: the style is a suggestion; the setup (length, sections, devices, word roles, art styles) is designed from the new inputs ("Designing the setup from the inputs"); the reference's stills compare craft, not moments. Someone Took stays as made.
- 2026-11-25 · Made thin: it was a full copy of `make-kinetictype` as that skill stood on 2026-11-08. It now depends on `make-kinetictype-buildup-punch` (the style) and `make-kinetictype` (the shared steps) and keeps only its own sections; it is no longer a fork, so there is no base to port changes from.
