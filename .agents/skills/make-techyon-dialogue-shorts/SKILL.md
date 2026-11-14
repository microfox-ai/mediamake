---
name: make-techyon-dialogue-shorts
description: Make a Techyon dialogue Short. Two (at most three) recurring Techyon characters talk a tech topic through in different human-sounding voices. One asks what the viewer would ask, one explains with receipts on screen, and the turns are short and react to each other. The cast are 3D characters (Tripo models rigged in Blender, Zoe and Kai) with lip sync, gestures and reactions on their words, shown as busts that come forward while they talk, and the captions light in the speaker's colour. The voice is one natural ElevenLabs conversation (make-human-voiceover, mm voice dialogue), and the cast (voices and 3D models) is designed once and reused. Use when the user asks for a Techyon dialogue, conversation, two-person, podcast-style, "two characters explain", "multiple voices" or "avatars talking" Short, wants to set up or change the Techyon cast, or asks to change, pack or upload a project named techyon-*-dialogue-short. For one narrator, make-techyon-shorts or make-techyon-question-shorts.
metadata:
  depends-on: make-techyon-shorts, make-human-voiceover, make-elevenlabs-voice
  category: make
---

# make-techyon-dialogue-shorts

A Techyon Short where characters talk instead of one narrator. Everything `make-techyon-shorts` says still holds:
- the anchors;
- research and the truth rules;
- one build session per Short;
- review;
- masters, cloud and slots.

**Read it first.** This skill lists only the differences:
1. the cast;
2. the dialogue script;
3. the voice as one conversation;
4. the avatars and the speaker-coloured captions on screen;
5. a disclosure line.

**Why a dialogue:** an explainer told as a conversation lets the viewer's own question be asked out loud ("wait, so
my laptop is fine?"). It gives the Short a rhythm of question and answer, and reactions do the work that asides do
for a narrator. It only works if the voices sound like two people in one room, which is why the voice is made as
one conversation (the dialogue endpoint), not as lines glued together.

## 1. The cast (designed once, reused)

Techyon's characters live in `brands/techyon/cast/`:
- `cast.json`: every character's id, name, role, persona, look, voice id, colour and side;
- `tripo/<id>/`: each character's 3D model (a Tripo GLB) and its Blender rig (`<id>-rig.blend`);
- `rig/v3/`: the older layered 2D rig, the fallback;
- `build/`: the scripts that rig and render them (`tripo_cast.py`, `tripo_rig.py`, `tripo_drive.py`).

**Use the same cast in every dialogue Short:** a recurring pair is recognised the way a narrator's voice is. Change a
character, or add a guest, with `references/cast.md`, the user picking each voice by ear and each look in a talking
preview.

The cast (set up 11 Nov 2026):

| id | role | does | voice | side, colour |
|---|---|---|---|---|
| **zoe** | the asker | Asks what the viewer would ask, doubts, jumps in, reacts ("No way.", "Okay, but…"). Mid-twenties, messy top bun, gold hoops, teal bomber | Designed, American (`c9Ht1Ugej4DI3KT3iB6g`) | left, cyan |
| **kai** | the explainer | Has the facts and the receipts, dry and a little sarcastic: the Techyon voice. Early twenties, textured quiff, charcoal jacket over a yellow hoodie | Techyon Narrator E (`r3CSRNuTBNTuPufjI9Vj`) | right, yellow |
| a guest (rare) | | A third view (a maintainer, a lawyer type); only when the story needs one | another contrasting voice | from the top, amber |

- **The characters are fictional AI hosts.** They never claim credentials or personal experience ("as an engineer at Google…", "when I used it…"), and they never pose as a real person.
- **A real person's words** are quoted on screen as a receipt, read by the explainer as a quote ("Torvalds said, quote, …"), never voiced as that person.

## 2. The topic and the script

**Topic:** an explainer with a natural back-and-forth. Something recent that raises an obvious "wait, how?" or "so
what does it mean for me?", with a twist or a payoff. Breaking news with few facts doesn't suit it; a narrator is
faster.

**Script** (the toolbox's `script.json`):
- **Every beat** has a `speaker` (a cast id), its `say` (the caption words, numbers spelled as said), its `tagged` (what's sent: v4 tags, fillers, cut-offs) and a `visual` (`timing.ts` needs one on every beat; without it the first run crashes).
- **Voice settings** at the top, from `cast.json`: `"voice": { "voices": { "<asker>": "<id>", "<explainer>": "r3CSRNuTBNTuPufjI9Vj" }, "model": "eleven_v4", "stability": 0.35 }`.
- **Turns are short:** 1–2 sentences, about 14 words at most. A long explanation is split by the asker's reactions ("Wait—", "Okay…", "So…?").
- **Let them react to each other:**
  - one or two interruptions (an em dash where a line is cut off, then `[jumping in]` on the next);
  - one laugh at most;
  - a filler in about one line in three (make-human-voiceover's recipe);
  - never a filler inside a fact.
- **The facts belong to the explainer** and carry their receipts on screen as in any Techyon Short. The asker's doubts are the viewer's questions, not new claims. A reaction can still smuggle one in: "So they just shrank it?" turns "a smaller model replaced it" into "they shrank it". Check the asker's lines against `keep.txt` too, and soften what the sources only half say ("not independently verified" is not "nobody's checked").
- **Check the twist against the paper, not the scout's summary.** On the Signal Short the scout's twist ("the proof failed on that version") was wrong: they proved the buggy build insecure, with an attack trace. And "old messages stay safe even after your phone gets hacked" overstated forward secrecy.
- **Shape:**
  - the hook (the asker's question or a blunt line, said and shown in the first 1.5 s);
  - the explanation in 3–5 exchanges;
  - the twist;
  - the payoff;
  - the loop line, which hands back to the hook as one thought ("…which is exactly what she asked me:" → the hook).
- **Length:** natural dialogue runs at about 1.95 words a second, with the gaps between turns, so 45 s holds about 80–85 words. Move secondary facts to the screen.

## 3. The voice: one conversation

Follow `make-human-voiceover` for a dialogue (humanize per speaker only when the user asks). In a Techyon project:

```bash
node --experimental-strip-types projects/techyon-shared/tools/vo-script.ts <slug>        # script.json → input/vo/script.json (a run of one speaker's beats = one line)
mm voice dialogue projects/<slug>/input/vo/script.json          # the price; spends nothing
mm voice dialogue projects/<slug>/input/vo/script.json --yes --takes=2
mm voice check projects/<slug>/input/vo/script-voice/take1 --yes   # lines, dead air, facts heard
mm voice finish projects/<slug>/input/vo/script-voice/take<N>
```

- **Copy into `input/vo/`:** the finished take's `vo-room.wav` → `vo.wav`, and its `words.json`.
- **Loop it on the music's grid** with `vo-splice.py --tighten=0.45 --fit-grid=<bar>`. That's gentler than a narrator's 0.32: the gaps between turns are part of what makes it sound like a conversation.
  - The dialogue endpoint leaves few pauses over 0.45 s, so `--fit-grid` may have nothing to stretch. Then add breaths with `gap@<t>=<s>` at the tightest turns (the Signal Short needed 8, 1.2 s in all, to land on bar 22).
- **Time it:** `timing.ts`. Every beat keeps its `speaker` in `video/timing.json`.
  - `timing.ts` rounds the last word + 0.15 s up to the next bar, so being 0.02 s over adds a whole bar of dead air before the seam. Check the gap between the last word and the end, and trim a breath if it's a bar long.
- **Captions:** `captions.py` breaks screens at every change of speaker and marks each screen's speaker. The `.srt` names the speaker at each turn ("MAYA: …").

## 4. The picture: the 3D cast, layout, captions

Use the toolbox's `avatar.tsx`, driven by `video/timing.json`. That's the voice as it's cut, after vo-splice, so don't
use the voice tool's `segments.json`.

**Who talks when:** `segmentsOf(timing, loop)` (pass the loop's length, so the speaker at the seam doesn't step back at
frame 0) and `wordsBySpeaker(timing)`. Then `presence(segs, id, t)` (0–1: forward while talking, back while listening)
and `talkLevel(words, t)`.

**The performance** (what each character does, frame by frame):
1. `video/cast-track.ts` (copy the Signal Short's) turns the timing into cues per frame: the mouth from
   `visemeTrack` (letters → 9 mouth shapes from the word times), gestures, emotions and reactions on words
   (`cueTrack`, `cueAt`), body language (`bodyLanguage`: a head tilt per emotion, a nod on "yeah", a shake on "no", a
   laugh bounce), blinks, and listener nods. It writes `input/cast3d/track.json`.
   - Cue by `nth` when one character echoes the other: `K.at()` matches word prefixes, so the asker's "Six million?" and the explainer's "six million" share a cue.
2. Render each character's bust frames from their rig:
   ```bash
   /Applications/Blender.app/Contents/MacOS/Blender -b brands/techyon/cast/tripo/<id>/<id>-rig.blend \
     --python brands/techyon/cast/build/tripo_drive.py -- projects/<slug>/input/cast3d/track.json <id> \
     projects/<slug>/input/cast3d/<id> --size=640 [--zoom=1.3] [--near=L|R]
   ```
   About 0.4 s a frame at 512 px, so a 45 s Short is about 10 minutes a character; run them in the background.
   `--zoom` evens the two characters' scale (Kai 1.3 against Zoe: two models from one style prompt still came out at
   different proportions).

**On screen:**
- `<Avatar … frame="bust" seq={{ dir, frames, scale, dy }} />` per character: one PNG per frame, no circle, the body fading out at the bottom, so gestures are never clipped. The 2D rig (`rig` members) stays as the fallback.
- **No name or role chips:** `label` defaults to `'never'` (the user: "no need to mention their names and asks & explainer stuff").
- **Spots:** the frames are wider than the bust box, so move the spots inward or turned characters touch the screen edges (the Signal Short: Zoe x 318, Kai x 708, scale 1.25, dy 0.24).
- One to three on frame, never over the hero; the listener stays visible but steps back; the speaker's side never changes in a Short (the 180° rule).
- **Layout:** each scene still declares its hero graphic (`{ at, avoid: [rects] }`), and `avatarTrack(cast, layouts)` can place the cast around it (`track.misfits` lists every scene where someone couldn't fit). With fixed bust spots, design scenes that leave the bottom third to the cast instead: a hero about 620 px wide in the band above them.
- **Receipts stay short on screen:** a full-width source line ran into Kai's hair once the busts were 3D. Put the full credit in the description.
- **Check a Short still against the raw render at the same frame** before showing the user a new kind of picture. A page-wide `img` max-width squeezed the 3D frames on the first cut (the user: "they look like squeezed horizontally"); `Avatar` now sets `maxWidth: none` on `seq` frames.

**Captions:** `<Captions colors={{ zoe: C.cyan, kai: C.yellow }} …>`. Each screen lights in its speaker's colour.

**The cover:** both characters and 2–5 huge words (often the asker's question). The last frame folds back into it.

The rest is the usual Techyon density: one change a second on spoken words, receipts and a motif.

## 5. post.md and the upload

As in `make-techyon-shorts`, plus:
- **The description** says who's talking, in one plain line: "Maya and Dev are Techyon's AI characters; the facts are sourced below." The AI disclosure in Studio stays on (`channel.json`).
- **The pinned comment** can come from the asker ("Still not convinced the 2,000 commits were human. You?"), if the user wants one.

## Costs

- **The conversation:** about 0.45 credits a character on v4, tags included. A 45 s dialogue is about 600–700 characters, so about 300 credits a take and about 600 for two.
- **Scribe check:** about 40 credits.
- **Music:** a composed 60 s track is about 880 credits.
- **The Signal Short,** the first one: about 2,370 ElevenLabs credits in all (cast voices 890, the conversation and its check 600, music 880).
- **A new character:** about 418 credits for two voice designs, about 157 per test exchange, and about 55 Tripo credits per 3D model (H3.1).
- **Time:** the 3D frames take about 0.4 s each, so about 10 minutes per character for a 45 s Short.

## Common mistakes

| mistake | instead |
|---|---|
| Lines voiced one by one and glued together | One conversation (`voice dialogue`), with the previous and next text joined across requests |
| Long monologue turns | 1–2 sentences, broken up by reactions |
| Two voices that sound alike | Contrast gender, pitch or accent (`references/cast.md`) |
| A new cast every Short | `brands/techyon/cast/cast.json`, reused |
| Avatars over the hero graphic | Scenes declare their hero rects and leave the bottom third to the busts; check stills |
| A waist-up 3D model | T-pose in Tripo, so the character has hands to gesture with |
| Flat portraits or primitive-built faces | Tripo models rigged with `tripo_cast.py`; the 2D rig only as a fallback |
| Name and role chips on the characters | None (`label: 'never'`) |
| A new kind of picture shown without a check | Compare a Short still with the raw render at the same frame (the squeeze) |
| Full-width receipts under 3D busts | Short receipts on screen, the full credit in the description |
| Captions in one colour | `Captions colors`; screens split at every turn |
| A character claiming "I worked on this" | Fictional AI hosts: no credentials, no personal experience |
| Voicing a real person's quote as that person | The explainer reads it as a quote, with the receipt on screen |
| Tightening the turns to 0.32 s | 0.45 for a dialogue; the gaps make it human |

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add make-techyon-dialogue-shorts "<Short> · <what they said> → <the rule>"   # a new lesson, dated for you
mm notes make-techyon-dialogue-shorts                                                  # your notes for this skill
```

When the user wants them shared, `mm notes promote make-techyon-dialogue-shorts` offers them to this log as a pull request.

- 2026-11-11 · format · "multiple people talking with different voices and dynamic avatars… the output should not sound like multiple sentances are put together" → this skill: a recurring cast designed once (voices by ear, Midjourney portraits cut out), one conversation through the dialogue endpoint, avatars placed by a layout solver around the hero graphic, captions in the speaker's colour.
- 2026-11-11 · Signal · "can you try building using blender and motion graphics?" (no Midjourney plan), then "the lip syncs are same for anything they say and the hand gestures doesnt look good" → a layered rig with mouth shapes from the word times and gestures on cues, judged in a talking preview.
- 2026-11-11 · Signal · "no need to mention their names and asks & explainer stuff" → no name or role chips.
- 2026-11-11 · Signal · "doesnt look good, give me more options" (the Blender-built faces) → Tripo3D T-pose models rigged in Blender (`tripo_cast.py`, `tripo_drive.py`), shown as busts with `Avatar seq`.
- 2026-11-11 · Signal · "very bad… they look like squeezed horizontally" → a page-wide image limit squeezed the 3D frames; check a still against the raw render before showing a new kind of picture.
