---
name: make-elevenlabs-voice
description: Make human-sounding ElevenLabs voice-overs. Design a custom voice from a prompt, clone one from a sample or remix one. Write and tag the script for emotion (Eleven v4 audio tags, pauses, emphasis). Voice one narrator, or a natural multi-speaker dialogue with every word timed and every line's speaker known (`mm voice`). Use whenever the user wants a voice-over or narration, a podcast-style or two-person conversation, a character or custom voice, ElevenLabs audio that sounds "more human" or "more emotional", voice samples to pick from, or asks to clone, design or remix a voice, even when they don't name ElevenLabs. Not for transcribing audio (`mm transcribe`), music or sound effects.
metadata:
  category: make
---

# make-elevenlabs-voice

The goal is speech people believe a person said. Three things make it:
1. **a voice that suits the speaker**, picked by ear from samples;
2. **a script written for the ear and tagged for delivery** before any audio is made;
3. **the latest model** (Eleven v4) reading it, in one natural take for a conversation, not lines glued together.

Every take comes back with each word's time and each line's speaker, so captions and on-screen avatars can follow
it.

The repo's tool is `mm voice <dialogue | tts | check> …` (`apps/studio/scripts/voice.ts`).
- It always shows the price first and spends nothing without `--yes`.
- It uses the key the ElevenLabs MCP already has (`scripts/elevenlabs.ts`), and never prints it.
- Never curl ElevenLabs with a key, and never put the key in a `.env`.

## First: check the MCPs and the account

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/elevenlabs` | required | Voice design (`text_to_voice`, `create_voice_from_preview`), cloning (`voice_clone`), the voice list (`search_voices`, `get_voice`), the models (`list_models`), credits (`check_subscription`), and the key `mm voice` reuses | No voices and no audio at all |

- **Plan:** a paid plan (Creator or higher) is needed. The free plan gives no commercial licence, so its audio never ships.
- **Before a run:** check `check_subscription`, and `list_models` to confirm `eleven_v4` is there. Use `eleven_v3` only when v4 is missing.

## The run

### 1. The brief

Settle these in one short exchange; most come from context:
- who speaks, and how many;
- what it's for (a Short, a tutorial, an ad) and where it plays;
- how long;
- the tone (dry, warm, hyped, calm);
- whether the text is final, or yours to write.

If the text came from the humanizer (`write-human-text`), keep its wording: tagging adds delivery, it doesn't rewrite.

### 2. Voices

Start from the saved voices in `references/voices.json` (name, id, model, settings and what each was picked for).

A new voice is a taste decision, so the user picks by ear:
- **Design** (most voices). Read `references/voice-design.md` for the prompt recipe.
  - Write 2–3 different prompts, then `text_to_voice` for each (3 previews each).
  - Every candidate reads **the same opening line** of the real script, so they're compared fairly.
  - Show the user the files with one line each on the difference, and save their pick with `create_voice_from_preview`.
- **Clone** from a sample: `voice_clone` with 1–2 minutes of clean, single-speaker audio. Only clone a voice the user owns or has the speaker's permission for, and ask if that isn't clear.
- **Remix** a saved voice (accent, age, pace, quality) in the ElevenLabs app's Voice Remix. Start at low strength.
- **Record every pick** in `references/voices.json` with the reason, so the next run reuses it.

On voices, the user has said Liam and four other stock voices "all seem ai", and picked a designed voice (young
American, conversational, a little dry). Lean towards designed voices with a persona, over stock library voices.

### 3. The script, written for the ear

Read `references/script-for-voice.md` before writing or tagging. In short:
- **Write for speaking.** Short sentences, contractions, one idea a line, and varied rhythm. Numbers, versions and ids are written as said ("nine point eight", "CVE twenty twenty-six…"); IPA in slashes goes around a hard name.
- **Then the tagging pass** adds delivery without changing a word:
  - v4 audio tags at the start of a line or a turn: `[curious]`, `[sighs]`, `[dryly]`, `[excited]`, `[whispers]`, `[short pause]`, `[laughs]`;
  - ellipses for weight, CAPS for one stressed word, em dashes for a cut-off;
  - `[interrupting]` or `[overlapping]` in a dialogue.
  - Two or three tags a line at most, and they must suit the voice's character.
- **Dialogue** reads like people talking: reactions ("wait, what?"), short back-and-forths, one speaker finishing another's thought. Never trade monologues.
- **Make it natural, not clean** (the user's pick, 2026-11-11). This is what made the voices sound human, so do it every time:
  - a filler or a restart in about one line in three ("Uh, so...", "Like...", "Okay, so... wait.");
  - real reactions ("Yeah. No.", "Noted.") and a `[laughs]` or `[chuckles]` where a person would;
  - ellipses where people trail off.
  - It makes the read about **60 % longer**: 14 s of clean text became 23 s. For a Short, cut facts or fillers until it fits.
  - The full recipe and the winning example are in `references/script-for-voice.md` § "Natural, not clean".

Write `script.json` beside the project's audio (Techyon: `projects/<slug>/input/vo/script.json`):

```json
{
  "model": "eleven_v4", "language": "en", "stability": 0.35, "speed": 1.0,
  "voices": { "maya": "<voice_id>", "dev": "<voice_id>" },
  "lines": [
    { "speaker": "maya", "scene": 1, "text": "[curious] Okay, so... what actually happened?", "say": "Okay, so... what actually happened?" },
    { "speaker": "dev",  "scene": 1, "text": "[sighs] A race in the TCP code. Nine point eight out of ten." }
  ]
}
```

- `text` is sent as written; `say` is the plain caption (tags stripped when it's left out).
- `scene` marks where a long script may be split between requests.

### 4. Price, then the take

```bash
mm voice dialogue projects/<slug>/input/vo/script.json            # or: tts (one voice)
```

1. **The first run spends nothing.** It prints the requests, the characters, the credits (about 0.45 a character on v4, 1 on v3 and v2, tags included) and what's left. Show the user and ask.
2. **On their yes**, run it again with `--yes --takes=2`. Stability 0.35 gives the range a human read needs and varies more between takes, so make two and pick the better one.
3. **Output,** in `<script>-voice/take<N>/`:
   - `vo.wav`;
   - `segments.json` (line, speaker, start, end, caption);
   - `words.json` (each word's time, speaker and line);
   - `meta.json` (model, seed, requests, request ids).
4. **How it's voiced:**
   - `dialogue` makes the conversation in one generation per request (up to about 1,900 characters). A longer script splits between lines, preferably at a scene change, and each request gets the text either side of it, so the joins stay natural.
   - `tts` reads one voice with request stitching on v4, so a long read keeps one tone.

### 5. Check, listen, fix

```bash
mm voice check <…>-voice/take1          # free: missing lines, dead air over 0.4 s, loudness
mm voice check <…>-voice/take1 --yes    # + Scribe on the take, word diff with the script (~40 credits a minute)
```

- **Then listen,** and have the user listen. The tools catch dropped words and long gaps, not a wrong emotion. With two takes, pick by ear.
- **A misread word:** spell it as said, or add IPA (`/ˌbaɪoʊˈkemɪstri/`).
- **A flat line:** change its tag or punctuation, not the words.
- **A whole take that's off:** try a new seed, or stability 0.35–0.45 for more range.
- Generate again only the scenes that need it: put them in their own `script.json`.

Then the **room finish**, the last step for every take that's kept (free, on this Mac):

```bash
mm voice finish <…>-voice/take1        # → vo-room.wav, same timing, about -20 LUFS
```

It adds a low cut, faint early reflections, gentle compression and a whisper of room tone, so the take stops
sounding studio-perfect. The user picked "our voices + room" over the plain take and over the library voices.

### 6. Hand over

Copy the picked take into the project:
- `vo-room.wav` (the finished take) → `input/vo/vo.wav`;
- `input/vo/words.json`, the input to the Techyon `timing.ts` and captions (it now has `speaker` and `line`);
- `input/vo/segments.json`, which tells avatars who is talking.

Keep `script.json` with them. Note the voices and the take's seed in the project's report.

## Quick reference

| setting | use |
|---|---|
| `model` | `eleven_v4` (best at tags and emotion, stitches requests); `eleven_v4_turbo` for speed; `eleven_v3` only when v4 is missing |
| `stability` | **0.35, the default** (expressive; make 2 takes and pick); 0.5 is steadier; 0.7+ plays tags down |
| `speed` | 0.7–1.2. Shorts read well at 1.0–1.1 (`tts` only; in a dialogue, pace comes from the writing) |
| `format` | `mp3_44100_192` (Creator plan and up); 44.1 kHz WAV/PCM needs Pro |
| dialogue limits | at most 10 voices; about 2,000 characters a request (the tool splits) |
| cost | measured Nov 2026 (Creator): **eleven_v4 about 0.44 credits a character** (4 dialogue takes), v3 and multilingual v2 about 1. A 45 s narration is about 350–450 on v4 (800–1,000 on v3). Library voices cost the same as your own. Voice design: measure it on the first run and note it here |

## Common mistakes

| mistake | instead |
|---|---|
| Gluing single-line TTS clips into a "conversation" | `dialogue`: one generation hears the whole exchange |
| Rewriting the words while tagging | Tags, punctuation and CAPS only; the words stay |
| Tags on every phrase, or ones that clash with the voice | 1–3 per line, matched to the character |
| SSML `<break>` for pauses | Ellipses, `[short pause]` or `[long pause]` |
| Picking a voice for the user | Same-line samples; they choose |
| Spending before showing the price | The first run is always the dry run |
| A perfectly clean, written script | Natural speech: a filler or restart in about one line in three, reactions, a laugh |
| Shipping the raw take | `voice finish`: the room finish is the last step |

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add make-elevenlabs-voice "<Short> · <what they said> → <the rule>"   # a new lesson, dated for you
mm notes make-elevenlabs-voice                                                  # your notes for this skill
```

When the user wants them shared, `mm notes promote make-elevenlabs-voice` offers them to this log as a pull request.

- 2026-11-09 · Techyon (Nvidia Short) · Liam, Chris, Eric, Daniel and Callum on multilingual v2: "these all seem ai… something which sound human, like younger american voice… add some expressions and emotion" → a designed voice, "Techyon Narrator (young American, E)", with emotion tags. Prefer designed voices with a persona, and the newest model.
- 2026-11-11 · skill · "create more personalized voices… a lot more human like, add the expressions and emotions (also add in the script of it first via the best practices of script writing)… use the latest model… multiple people with different voices talking to each other… should not sound like multiple sentences put together" → this skill: Eleven v4, a script written and tagged for the ear, and `mm voice dialogue` for one-generation conversations with timed words and speakers.
- 2026-11-11 · voice test · The first dialogue test was "good and better than before… but it is very easy to identify it as ai voice". Of six versions, the user picked **"4: our voices + room"**: the same voices (Techyon Narrator E and Liam), a natural script (fillers, restarts, reactions, a laugh), stability 0.35, and the room finish. Neither the library voices nor the plain take won → those are the defaults now: natural script, stability 0.35, two takes, `voice finish`. Measured: eleven_v4 costs about 0.44 credits a character, under half of v3 and v2.
