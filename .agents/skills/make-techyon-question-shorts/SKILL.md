---
name: make-techyon-question-shorts
description: Make a Techyon question Short, the format that asks viewers to pick a side. It's a normal Techyon news loop on a tech topic people genuinely split on. Both sides get their strongest case, attributed and given equal time. At about 60–70 % of the Short, an arguable question goes on screen with a "pick a side" answer card (A / B), and post.md gets a pinned comment. Nobody ever says "comment below", the voice is human (make-human-voiceover), and the loop is kept. Use when the user asks for a Techyon question Short, a debate, poll, "would you", "pick a side", "hot take" or "which side are you on" Short, a Short "to get comments" or "audience interaction", or asks to change, pack or upload a project named techyon-*-question-short. For ordinary Techyon news Shorts, make-techyon-shorts; for two characters talking, make-techyon-dialogue-shorts.
metadata:
  depends-on: make-techyon-shorts, make-human-voiceover
  category: make
---

# make-techyon-question-shorts

A Techyon Short that ends its argument with a question the viewer answers in the comments. Everything
`make-techyon-shorts` says still holds:
- the anchors in its `references/direction.md`;
- research and truth;
- one build session per Short;
- review in Video Revision;
- masters, cloud and two upload slots a day.

**Read that skill first.** This one lists only what is different.

**Why this shape (the user's pick, 11 Nov 2026: "Hybrid: loop + question").**
- A Short is pushed on how long people watch and rewatch, so the seamless loop stays.
- Comments come from a question that is genuinely open, shown at the moment the viewer has enough to answer it, not
  tacked on at the end. A spoken "comment below" at the end breaks the loop and reads as begging, so it's never said.
  The card and the pinned comment do that job.

## 1. The topic: a real split

Scout as in `make-techyon-shorts` step 1, but keep only topics that pass all four tests:

| test | why | fails |
|---|---|---|
| **Informed people disagree in public,** and you can cite each camp | Otherwise the "question" has a right answer and the comments are a quiz | "Is a 10/10 CVE bad?" |
| **It's about tech, a product or a policy, not a person's character or an allegation** | Inviting a crowd to judge a named person turns into a pile-on and can defame | "Is Altman lying?", "Should Huang resign?" |
| **The facts underneath are settled;** the open part is what to do or what to think | A question about what happened invites rumours as answers | "Did the model really escape?" |
| **A viewer can answer in one letter** | A choice of 2 (sometimes 3) gets replies; an essay prompt doesn't | "What do you think about AI regulation?" |

Never ask about markets or stocks as a choice ("buy or sell?"): that's financial advice.

When the user brings a topic that fails a test, say which test and offer the closest version that passes. For
example, "Is Altman lying about RAM?" becomes "Should AI labs pay more for the RAM shortage they caused?"

## 2. The script: setup, both sides, the question, the twist, the loop

Use the toolbox's `script.json`, with these beats. The percentages are of the Short's length; aim for 35–45 s.

| beat | where | what |
|---|---|---|
| **hook** | 0–1.5 s | The tension in one line, said and shown. It's the cover: "OpenAI wants a licence for big models." |
| **setup** | to about 30 % | The settled facts with receipts (2–3 beats), the channel's usual density and dry asides |
| **side A** | | That side's strongest case in one or two lines, attributed to a named, cited source ("Meta's argument: …") |
| **side B** | | The other side's strongest case, **about the same length** (within about 25 % of A's words), attributed and cited |
| **the question** | starts at **65–70 %** | Asked naturally, the way a person would ("So… where do you land?"), then the choices said or shown. The `PickSide` card holds for 3–4 s |
| **twist** | after the card | One more settled fact that sharpens the choice without answering it ("…and the EU's rule starts in March.") |
| **loop** | the last line | Leads into the hook as one thought, as in every Techyon Short |

Hook, setup and two equal sides push the question to about 70 % even with a short setup, so keep the twist and the
loop line to about 8 s together.

- **A side with no named voice in the sources:** research one (a maintainer's post, a trade group, a regulator, a named commentator) before writing it. If none exists, the side may be the weaker, unvoiced one, so ask whether the split is real (test 1). Never invent a camp's reasoning and present it as theirs.
- **Neutral, not wishy-washy.** Techyon doesn't pick a side in the Short. State each side in its strongest form (steelman, never a strawman), give them equal time, and use neutral colours. The dry humour is aimed at the situation, never at either camp.
- **Equal time on screen too:** both sides get the same header device, type size and weight. Pick labels that fit at the same size ("CASE FOR" / "CASE AGAINST" at 84 px; "THE CASE AGAINST" didn't fit `HeaderCard` at 96–104 px while "THE CASE FOR" did).
- **The choices:** 2 (at most 3), each 4 words or fewer and mutually exclusive. Put them in the beat's `visual` as `{ "type": "pick-side", "question": "...", "choices": ["...", "..."] }`.
- **Never spoken:** "comment below", "let me know", "smash like", "what do you think?". The question itself is the call.
- **Length:** one narrator's natural speech runs at about 2.3 words a second (E on v4 read 94 words, 668 tagged characters, in 41.4 s on the first question Short), so 40–42 s holds about 90–95 words. Budget for it, and move secondary facts onto the screen. Asides cost words: one shown only on screen keeps the question near 65 %.
- **Numbers spelled as said** in `say`, as always. Add `tagged` (the line sent to ElevenLabs, with v4 tags and the occasional filler), and voice settings at the top: `"voice": { "voices": { "narrator": "r3CSRNuTBNTuPufjI9Vj" }, "model": "eleven_v4", "stability": 0.35 }`.

## 3. Voice: make-human-voiceover, one narrator

Follow `make-human-voiceover` for one narrator (Techyon Narrator E, the user's recipe). In a Techyon project:

```bash
node --experimental-strip-types projects/techyon-shared/tools/vo-script.ts <slug>        # script.json → input/vo/script.json
mm voice tts projects/<slug>/input/vo/script.json              # the price; spends nothing
mm voice tts projects/<slug>/input/vo/script.json --yes --takes=2
mm voice check projects/<slug>/input/vo/script-voice/take1 --yes  # facts heard (Scribe)
mm voice finish projects/<slug>/input/vo/script-voice/take<N>
```

Then continue with the toolbox's steps 4–5 (`vo-splice.py --fit-grid`, `timing.ts`):
- **A tag on every line, and a different one each time.** One `[serious]` per side read flat on the first Short, and the user asked for "some expressions". Varied tags (impressed, incredulous, sighs, chuckles, playfully, deadpan) and one CAPS word per side widened the two cases' pitch range from about 7–9 to 11–14 semitones.
- The question line gets a curious, genuinely asking tag ([curious], [thoughtful]), not a host's sell.
- **A short pause after the question** (`...`) gives the card room. Keep it when tightening: `vo-splice.py … gap@<t>=0.35` inside that pause, because `--tighten` skips a pause that holds a gap.
- **A more expressive read runs longer** (41.4 → 42.3 s on the first one) and can miss the music's grid. Let `--fit-grid` lengthen the pauses, or cut a word; don't tighten below about 0.32 s to make it fit.
- **The Scribe check's word score** reads low on this format: British spellings ("centres" → "centers") and spoken numbers ("twenty-nine billion dollars" → "$29 billion") put the first one at 93.5 % with every fact heard. Read the transcript against `keep.txt` rather than trusting the percentage.
- Humanize with Phrasly (`write-human-text`) only when the user asks.

## 4. The picture: the card

Use `PickSide` from the toolbox (`projects/techyon-shared/toolbox/pickside.tsx`). It holds the question, the
lettered choices, and a small "Reply A or B ↓":
- **When:** it starts on the question's first word, each choice comes in on the word where it's offered, and it leaves before the twist.
- **Cue the choices by phrase, not by one word:** `K.at` matches word prefixes, so `K.at('bill', 2)` caught "billion" and brought choice B in 7 s early. Use `K.w(K.idx('the bill') + 1)`, and check each choice's time on a still.
- **Behind the card:** a split glow (A's colour on the left, B's on the right) gives it neutral ground; it reads well.
- **Results:** it shows none (no percentages, no "most of you said"). Nobody has voted yet, so any number would be a fake receipt.
- **Colours:** neutral by default (cyan, pink, amber); never green against red, which reads as right against wrong.
- **The rest of the Short** is designed as usual. A motif can hint at the split from the cover on (two halves, a fork, a scale).
- **The cover** (the first frame) can show the choice as the hook ("Open or closed?"), as long as the hook line says it.

## 5. post.md: the pinned comment and the follow-up

In addition to the usual `post.md` fields:
- **Title:** the tension or the question itself, under 100 characters. A question title is fine; clickbait isn't (the answer must not already be in the Short).
- **Description:** two lines of setup, then each side in one line with its source, then the choices ("A) … B) …"), then the sources and hashtags.
- **Pinned comment** (the user pins it after publishing; Browse Hack can't pin before then):
  ```
  A) <choice> or B) <choice>? Reply with a letter and your best reason. The strongest argument for each side gets pinned.
  ```
  Put it in the pack's `UPLOAD.md` too, next to the Short's slot.
- **The follow-up, two days after publishing:**
  - read the comments (`youtube_get_video`, or ask the user to paste them) and count the A and B replies;
  - write the real split and the comment count in `techyon-published.md`;
  - offer the user an updated pin ("Comments so far: A 58, B 41. Best case for A: '…'"), quoting a viewer short and without their username.
  - Only real counts, never an estimate.

## 6. What to measure

After two weeks, in `techyon-published.md`:
- comments per 1,000 views against the channel's narrated Shorts of the same weeks;
- "stayed to watch".

If the card costs retention (a dip at its time in the retention graph), move the card later or shorten it, and say
so in the feedback log.

## Costs

As in `make-techyon-shorts`, plus:
- **Its own music:** every Techyon track in the library already belongs to some Short, so each question Short composes one (about 800 credits). Say so with the first price.
- **A re-voice for expression** is about 700–1,000 credits a take.
- The first one came to about 1.75k credits before the re-voice and about 2.45k after it.

## Common mistakes

| mistake | instead |
|---|---|
| A question with a right answer | Test 1: cite both camps, or pick another topic |
| Judging a person ("Is X lying?") | Ask about the policy, product or choice instead |
| Side B in one rushed line after a long side A | About the same length, both in their strongest form |
| "Comment below!" at the end | The question at 60–70 % and the card; the loop stays intact |
| Fake results on the card ("72 % said A") | No numbers until real comments are counted |
| Green for one side, red for the other | Neutral colours (`PickSide`'s default) |
| A question about stocks | Never: that's financial advice |
| The pin forgotten | In `post.md` and `UPLOAD.md`; a two-day follow-up with the real split |

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add make-techyon-question-shorts "<Short> · <what they said> → <the rule>"   # a new lesson, dated for you
mm notes make-techyon-question-shorts                                                  # your notes for this skill
```

When the user wants them shared, `mm notes promote make-techyon-question-shorts` offers them to this log as a pull request.

- 2026-11-11 · format · "a question/interaction Short (and which strategy is better)"; picked "Hybrid: loop + question" → this skill: the loop kept, an arguable question at 60–70 % with a pick-a-side card, a pinned comment, never a spoken "comment below".
- 2026-11-11 · datacentre-vote (rev-001) · "add some expressions to the voice?" → a tag on every line, varied, and one CAPS word per side (step 3); re-voiced, signed off and scheduled for 15 Nov 20:30.
