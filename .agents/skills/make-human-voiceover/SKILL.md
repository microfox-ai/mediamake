---
name: make-human-voiceover
description: Make a voice-over that sounds like a real person from start to finish. Write the script for the ear, optionally humanize it with Phrasly (write-human-text), add natural speech (fillers, reactions, a laugh) and emotion tags, voice it with ElevenLabs as one narrator or a multi-speaker conversation (make-elevenlabs-voice), check every fact survived into the audio, then give it the room finish. It hands timed words, speakers and the finished audio to the video. Use when the user asks for a human-sounding voice-over, narration or conversation for a video or Short ("make the voice-over", "voice this script so it doesn't sound AI", "a two-person conversation about X"), or when a video skill reaches its voice step (the Techyon question and dialogue Shorts). For voices or tagging alone, make-elevenlabs-voice; for text alone, write-human-text.
metadata:
  depends-on: write-human-text, make-elevenlabs-voice
  category: make
---

# make-human-voiceover

This skill is the order that makes a voice-over believable. Each step belongs to another skill; this one passes
the work between them so that nothing is lost on the way:
- the facts (from the script to the humanized text to the audio);
- the timing (from the take to the captions);
- the user's picks (voices, recipe).

```
facts list → script for the ear → (humanize) → natural speech + tags → price → takes → check → room finish → hand over
```

## First: check the MCPs

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/elevenlabs` | required | The voices and the takes (through `mm voice`, which uses its key), `check_subscription`, `list_models` | No voice-over |
| `mcp/browse-hack` | optional | Phrasly drafts for the humanize step (`phrasly_humanize`, `phrasly_status`) | Skip humanizing; the natural-speech pass still makes it sound human |

Read both skills before the first run: `make-elevenlabs-voice` (the voice tool, the recipe, voices) and
`write-human-text` (Phrasly, the facts list, `humanize.py`).

## The run

Work in the project's `input/vo/` (Techyon: `projects/<slug>/input/vo/`) and keep every step's file there.

### 1. Facts list and brief

Write `keep.txt` before anything else, one fact per line:
- names, numbers and versions;
- the exact claim;
- what the viewer is asked to do;
- anything legal or sensitive ("alleged", "reportedly").

Every later step is checked against it, the audio included.

**Check the facts list against the sources before writing, not just against the script.** When the project has a
`sources.md` (every Techyon Short does), read each fact against it. A script can carry a small error that every later
step then faithfully protects. In the first test, "2.4 times the last release" should have been "the last merge
window": 3,008 against 7.3's 1,257, which is only about 1.6× all of 7.3. A run without the skill caught it by reading
`sources.md`; the run with the skill didn't.

Then settle the brief:
- **one narrator, or a dialogue,** and who speaks;
- **the length.** A natural read is slower than clean text (2.6–2.9 words a second):
  - **one narrator:** about 2.2–2.3 words a second (Techyon Narrator E measured 2.27 on the first question Short: 94 words in 41.4 s);
  - **a dialogue:** about 1.95 words a second, with the gaps between turns (the takes the user picked).

  Budget the words to the length. When the facts don't fit, ask, or move the secondary ones (a date, an index number) onto the screen and say so;
- **the tone,** and the channel's rules (Techyon: `make-techyon-shorts/references/direction.md`).

### 2. The script, written for the ear

Write `script.md` with `make-elevenlabs-voice`'s `references/script-for-voice.md` § 1–2:
- short spoken sentences;
- numbers written as said;
- a dialogue's turns short and reacting to each other.

This is the plain text, with no tags yet.

### 3. Humanize (when the user asked, or the calling skill says so)

Run `write-human-text` on the **plain narration**: one speaker's lines at a time for a dialogue, so turns don't
blur. Use mode **Balanced** (facts matter) and **Shorter** sentences (better for speech).
- Use its facts list (`keep.txt`), and finish only when its `check` passes.
- Keep the script's spoken spelling ("nine point eight"): if a draft turns it back into digits, put the spoken form back.
- Phrasly's tools may be missing (Browse Hack not updated), or the user may not want this step. In either case say so and go on; step 4 still does most of the work for the ear.

### 4. Natural speech, then the tags

The user picked this on 2026-11-11 over a clean script; it's what made the voices pass as human. From
`script-for-voice.md` § 3–4:
1. **Natural speech:** a filler or restart in about one line in three for a dialogue, one in four for a narrator ("Okay, so...", "Uh,", "Like..."). Add one-word reactions, a `[laughs]` or `[chuckles]` where a person would, and trailing ellipses. Never put a filler inside a number, a name or a fact.
2. **Tags:** 1–3 v4 audio tags a line ([curious], [serious], [dryly], [sighs]...), CAPS on one stressed word, and em dashes for cut-offs.
3. **Then `script.json`** for the voice tool. `text` is the tagged line and `say` is the caption: the same words, without tags or fillers like "uh".
   - Voices come from `make-elevenlabs-voice/references/voices.json`, or the channel's rules. In a dialogue the two voices should differ clearly (gender, age, accent, pitch or pace). E and Liam, the pair the user picked, are both young American men; for a new dialogue format, offer a contrasting designed voice.
   - The settings: `eleven_v4`, stability 0.35.

### 5. Price, takes, check

```bash
mm voice dialogue input/vo/script.json          # or tts for one narrator: prints the price, spends nothing
mm voice dialogue input/vo/script.json --yes --takes=2   # after the user's yes
mm voice check input/vo/script-voice/take1      # free: lines, dead air, loudness (both takes)
```

**Facts in the audio:** when facts matter (news, numbers), run `check --yes` (Scribe, about 40 credits a minute).
Then confirm every line of `keep.txt` is heard in `vo.scribe.json`'s words. A misread number gets that line fixed
(spell it as said) and only that scene made again.

**Listen,** or have the user listen, and pick the take with the more human read.

### 6. Room finish and hand over

```bash
mm voice finish input/vo/script-voice/take<N>
```

Then:
- copy `vo-room.wav` → `input/vo/vo.wav`, plus that take's `words.json` and `segments.json` → `input/vo/`. The video's timing and captions read `words.json` (each word with its speaker and line); avatars read `segments.json`;
- write `input/vo/voiceover.md`: the brief, the voices and settings, the take picked and why, the humanize record (if any), the facts check, and the credits spent.

## Common mistakes

| mistake | instead |
|---|---|
| Humanizing after adding tags, or with tags in the text | Humanize the plain text first; tags and fillers come after |
| Humanizing a whole dialogue at once | One speaker's lines at a time, so turns stay with their speaker |
| Phrasly's digits left in a spoken script | Put the spoken form back ("nine point eight") |
| A filler inside a number or a name | Fillers go between thoughts, never inside a fact |
| Budgeting length at clean-read speed | A natural read: about 2.2–2.3 words a second for one narrator, about 1.95 for a dialogue |
| Trusting the script's facts | Check `keep.txt` against `sources.md` first |
| Captions that include "uh" and "like" | `say` keeps the words, not the fillers |
| Trusting the take without hearing the facts | `check --yes`, then every line of `keep.txt` heard |
| Shipping the raw take | `voice finish` |

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add make-human-voiceover "<Short> · <what they said> → <the rule>"   # a new lesson, dated for you
mm notes make-human-voiceover                                                  # your notes for this skill
```

When the user wants them shared, `mm notes promote make-human-voiceover` offers them to this log as a pull request.

- 2026-11-11 · skill · "create humanizer skill -> elevenlabs voice skill and then combine both to create human like content with human like voice and script; use the above for the first two variations" → this skill: one facts list carried from script to audio; humanize (Balanced, Shorter) before the natural-speech pass and the tags; dialogue humanized per speaker; voice by the user's picked recipe; facts checked in the audio; room finish; hand over to the video.
