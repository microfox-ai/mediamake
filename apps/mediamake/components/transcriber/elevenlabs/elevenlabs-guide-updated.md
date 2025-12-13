# ElevenLabs v3 Audio Tags: Complete Scriptwriting Guide

**Last Updated: December 2025** | **For Eleven v3 (alpha) and Turbo v2.5**

---

## Introduction: Think Like a Director

When writing scripts for ElevenLabs, think of yourself less as a writer and more as a **Director**. The AI does not just read words; it acts them out based on the instructions (tags) you provide.

Audio tags are text instructions placed inside square brackets `[ ]` that tell the AI _how_ to perform a line or what sound to make. They unlock **character performance, emotional depth, and realistic vocal delivery** that flat text cannot achieve.

---

## 1. Audio Tags: Complete Reference (Updated December 2025)

Audio tags are formatted as `[tag_name]` and placed immediately before the text they affect. The model recognizes **40+ tags across 7+ categories**. Below is the comprehensive, current list.

### Core Syntax

- **Format:** `[tag]` followed immediately by the text.
- **Placement:** Usually at the start of a sentence or phrase.
- **Case Sensitivity:** Tags are case-insensitive (`[happy]` = `[HAPPY]`), but lowercase is recommended.
- **Compatibility:** Works best with **Eleven v3**. Turbo v2.5 does NOT support audio tags.
- **Tag Limits:** Keep tags to 1-2 words maximum for consistency. Longer tags may reduce stability.

---

### Category 1: Emotion & Mood Tags

These set the emotional tone of the delivery. They work by providing contextual cues about the intended mood.

| Tag Examples | Description |
|---|---|
| `[happy]`, `[excited]`, `[hyped]` | Joy, enthusiasm, high energy |
| `[sad]`, `[depressed]`, `[sorrowful]` | Melancholy, sorrow, grief |
| `[angry]`, `[frustrated]`, `[exasperated]` | Anger, irritation, annoyance |
| `[nervous]`, `[anxious]`, `[terrified]` | Anxiety, fear, panic |
| `[curious]`, `[confused]`, `[suspicious]` | Interest, bewilderment, doubt |
| `[sarcastic]`, `[sarcastically]`, `[mischievously]` | Irony, mockery, playfulness |
| `[calm]`, `[peaceful]`, `[zen]` | Serenity, tranquility, control |
| `[relieved]`, `[awe]`, `[skeptical]` | Release, wonder, doubt |
| `[reluctant]`, `[dismissive]` | Unwillingness, indifference |
| `[dramatic]`, `[theatrical]` | High-intensity emotion, performance |

**Usage Tip:** Use these to set the "mood" before the line is spoken. Combine them with other tags for nuanced performances.

---

### Category 2: Vocal Action & Delivery Control

These define the _volume_, _projection_, and _manner_ of voice delivery.

| Tag Examples | Description |
|---|---|
| `[whispers]`, `[whispering]`, `[quietly]` | Low volume, intimate delivery |
| `[shouts]`, `[shouting]`, `[loudly]` | High volume, forceful projection |
| `[screams]`, `[screaming]` | Maximum intensity, highest energy |
| `[mumbles]`, `[mumbling]` | Indistinct, muffled speech |
| `[sings]`, `[singing]` | Melodic delivery |
| `[raps]`, `[rapping]` | Rhythmic, beat-driven speech |
| `[garbled]`, `[muffled]` | Obstruction effects, unclear sounds |

**Usage Tip:** Matches the physical action of how the voice is produced. Pair with emotion tags for complete performance direction.

---

### Category 3: Non-Verbal Sounds & Human Reactions

These add realism through human-like sounds. Can be used standalone or attached to speech.

| Tag Examples | Description |
|---|---|
| `[laughs]`, `[laughing]`, `[giggles]`, `[giggling]` | Laughter variations |
| `[sighs]`, `[sighing]` | Resignation, tiredness, contemplation |
| `[gasps]`, `[gasp]` | Surprise, shock, realization |
| `[crying]`, `[cries]`, `[sobbing]` | Deep sadness, emotional release |
| `[clears throat]`, `[coughs]` | Attention-getting, throat-clearing |
| `[sniffs]`, `[sniffing]` | Nasal reaction |
| `[breathing]`, `[breathing heavily]`, `[breathes]` | Natural breath, urgency |
| `[gulps]`, `[gulping]` | Nervous reaction, swallowing |
| `[yawns]`, `[yawning]` | Tiredness, boredom |

**Usage Tip:** Adds authenticity and emotional subtext. Example: `[gasps] I can't believe it!`

---

### Category 4: Pacing, Timing & Rhythm Control (NEW)

Fine-grained control over the flow and speed of speech. These were recently expanded in v3.

| Tag Examples | Description |
|---|---|
| `[pause]`, `[brief pause]` | ~0.5-1 second silence for dramatic effect |
| `[long pause]` | ~2-3 second silence for major transitions |
| `[rushed]`, `[quickly]`, `[rapid-fire]` | Fast, hurried, urgent delivery |
| `[slowly]`, `[slows down]`, `[drawn out]` | Deliberate, extended pronunciation |
| `[stammers]`, `[stammering]` | Stuttering effect, speech hesitation |
| `[hesitates]`, `[hesitant]` | Pause before speaking, uncertainty |
| `[beat]` | Theatrical pause for drama |
| `[picks up pace]` | Speeds up delivery |
| `[trailing off]` | Sentence fades away |

**Usage Tip:** Rhythm changes meaning. Same words with different pacing create entirely different interpretations.

**Example:**
```
[slowly][suspicious] You... didn't... eat... the last slice?
[rushed] Wait wait wait, did you hear that noise?!
[stammers] I... I d-didn't mean to b-break it.
```

---

### Category 5: Character Archetypes & Performance Voice (NEW)

Shift vocal identity to match specific character types or personas. These tags emulate personalities, not accents.

| Tag Examples | Description |
|---|---|
| `[pirate voice]`, `[villainous]` | Gruff, menacing, sea-faring tone |
| `[narrator]`, `[omniscient narrator]` | All-knowing storyteller, classical |
| `[sidekick]` | Supportive, energetic companion |
| `[robot voice]`, `[mechanical]` | Monotone, artificial, androids |
| `[evil scientist voice]` | Menacing, intellectual, sinister |
| `[fairy tale narrator]` | Whimsical, magical storytelling |
| `[documentary style]` | Factual, educational, neutral |
| `[unreliable narrator]` | Questionable truth, psychological |
| `[dramatic]` | Theatrical, intense performance |
| `[matter-of-fact]` | Straightforward, bland, factual |
| `[playfully]`, `[teasing]` | Fun, games, lighthearted |
| `[professionally]` | Business-like, corporate, formal |
| `[condescending]` | Superior, patronizing tone |
| `[stream of consciousness]` | Internal thoughts, rambling |

**Usage Tip:** These define WHO is speaking, not just how they're saying it. Pair with accents for maximum character depth.

---

### Category 6: Accent & Dialect Tags (NEW - Major Feature)

Seamlessly switch regional accents mid-sentence. Quality depends on the source voice being used.

| Tag Examples | Description |
|---|---|
| `[American accent]` | Standard American English |
| `[British accent]` | UK English, formal |
| `[Australian accent]` | Australian English, casual |
| `[French accent]` | French English blend |
| `[Southern US accent]` | Southern American dialect |
| `[German accent]` | German-influenced English |
| `[Spanish accent]` | Spanish-influenced English |
| `[Irish accent]` | Irish English dialect |
| `[Scottish accent]` | Scottish English dialect |
| `[Indian accent]` | Indian English dialect |

**Usage Tip:** Accent quality depends heavily on the underlying voice you're using. IVCs and designed voices work best. PVCs may have reduced quality.

**Example:**
```
[American accent] Could you switch my accent in the old model?
[dismissive] Didn't think so.
[Australian accent] But you can now — check this out, mate!
[French accent] My love... eez like a red, red rose.
```

---

### Category 7: Sound Effects & Environmental Audio (Experimental)

Generate ambient and action sounds. Use sparingly — can sometimes bleed into voice or reduce quality.

| Tag Examples | Description |
|---|---|
| `[applause]`, `[clapping]` | Audience reaction |
| `[gunshot]` | Action sequences |
| `[door slam]`, `[door creaks]` | Atmospheric sounds |
| `[footsteps]` | Walking, movement |
| `[explosion]` | Dramatic impact |
| `[thud]`, `[tap]`, `[rattle]` | Impact/object sounds |
| `[beep]`, `[bleep]` | Electronic sounds |

**Warning:** These are experimental. Quality is inconsistent. Best used sparingly and with short clips.

---

### Category 8: Conversation & Multi-Character Flow (NEW)

Tags for directing dialogue interactions and speaker shifts.

| Tag Examples | Description |
|---|---|
| `[interrupting]` | Cuts off previous speaker |
| `[overlapping]` | Simultaneous speech |
| `[cuts in]` | Abrupt entry into conversation |
| `[continues]` | Resumes after interruption |
| `[continues softly]` | Gentle resumption after pause |

**Usage Tip:** Useful for single-voice multi-character scripts. Example:

```
[sad] I think we're done here.
[angry][cuts in] We're NOT done!
[defensive] You don't get to decide that!
```

---

## 2. Advanced Tag Combinations (Stacking)

You can stack multiple tags to create complex, nuanced performances. The order matters less than the combination itself, but generally, put the **action before the emotion** if unsure.

### Formula for Tag Stacking:
```
[vocal_action][emotion][pacing/character]
```

### Real-World Examples:

**The "Secretive Gossip":**
```
[whispers][excited] You won't believe who I saw at the party last night.
```

**The "Reluctant Admission":**
```
[sighs][sad] I guess you were right all along...
```

**The "Maniacal Villain":**
```
[laughs][shouts][evil scientist voice] You think you can stop me?!
```

**The "Nervous Laughter":**
```
[nervous][giggles] I... I didn't mean to break it.
```

**The "Foreign Speaker" (Complex):**
```
[French accent][hesitantly][dramatically] Zis... how you say... was not ze plan.
```

**The "Character Shift" (Mid-Dialogue):**
```
Jessica: [laughs][Australian accent] That was absolutely brilliant, mate!
Dr. Von Fusion: [dramatic][evil scientist voice] To be or not to be — that is the question!
Jessica: [cheerfully][British accent] This is spectacular, isn't it?
```

### Critical Rule: Match the Tag to the Voice

- A **"News Anchor"** voice will struggle with `[scream]` or `[pirate voice]`.
- A **"Soft/ASMR"** voice will struggle with `[shout]` or `[aggressive]`.
- A **"Professional"** voice won't work well with `[playfully]` or `[mischievously]`.

**Pro Tip:** If a tag isn't working, try a synonymous word:
- Swap `[sad]` for `[depressed]` or `[sorrowful]`
- Swap `[excited]` for `[hyped]` or `[energetic]`
- Swap `[whispers]` for `[quietly]`

---

## 3. SSML Markup & Advanced Control

ElevenLabs v3 supports both audio tags AND SSML (Speech Synthesis Markup Language) for additional control.

### Break Tags (Hard Pauses)

Use SSML `<break>` tags for precise silence timing:

```
<break time="1.5s" />
```

**Parameters:**
- **Maximum duration:** 3 seconds per break
- **Recommended range:** 0.5s to 2.0s
- **Warning:** Too many breaks in a row can cause stability issues (artifacts/noise).

**Example:**
```
And the winner is... <break time="2.0s" /> John Doe!
```

**Alternative (Simpler):**
Use the `[pause]` or `[long pause]` audio tag instead. It's often more natural.

---

### Phoneme Tag (Pro-Level Control)

For absolute pronunciation precision with Turbo v2 compatibility, use SSML phonemes (complex):

```
<phoneme alphabet="cmu-arpabet" ph="M AE1 D IH0 S AH0 N">Madison</phoneme>
```

**Note:** This requires CMU-arpabet dictionary knowledge. **Phonetic respelling is usually faster and easier** (see next section).

---

## 4. Pronunciation & Clarity Control

When the AI mispronounces names or special text, you have three approaches:

### Approach 1: Phonetic Respelling (Easiest & Most Common)

Misspell the word intentionally to force correct pronunciation.

| Target Word | Mispronunciation Problem | Script Spelling |
|---|---|---|
| Siobhan | "See-oh-bahn" | Shiv-awn |
| Resume (verb) | "Rez-yoo-may" | Re-zoom |
| Loughborough | "Luff-buh-ruh" | Luff-buruh |
| Bologna | "Buh-LOH-nyuh" | Buh-LOH-nee |
| Worcestershire | "Woos-ter-sher" | Woo-ster-shur |

**Example:**
```
"I hired a new manager named Shiv-awn to head the team."
```

### Approach 2: Text Normalization (Numbers & Symbols)

The AI (especially with Turbo v2.5) interprets symbols and numbers literally.

| Format | Problem | Solution |
|---|---|---|
| `01/01/2024` | Reads as "zero one slash zero one" | Write "January first 2024" |
| `555-123-4567` | Reads each digit individually, no pacing | Write "5 5 5, 1 2 3, 4 5 6 7" |
| `NASA` | Might read as letters or abbreviation | Write "N.A.S.A." OR "Nassa" |
| `$5.99` | Read as "dollar sign five ninety-nine" | Write "five ninety-nine" |
| `50%` | Unclear delivery | Write "fifty percent" |

---

## 5. Pacing, Rhythm & Narrative Control

ElevenLabs tends to read naturally, but for dramatic effect, you often need to direct the pacing.

### Method 1: Pacing Tags (Recommended)

Use the new pacing tags for control:

```
[slowly][suspicious] Did you... really... do this?
[rushed] Wait, we're late, we're late, we're LATE!
[drawn out] Sooooo... you're telling me...
```

### Method 2: Punctuation Hacks (Soft Pauses)

Punctuation influences rhythm more naturally than break tags.

| Punctuation | Effect | Example |
|---|---|---|
| **Ellipses (`...`)** | Hesitation, trailing thought | "I... I don't know." |
| **Dashes (`—` or `-`)** | Sharp cut-off, interruption | "Wait—what was that?" |
| **Period** | Full stop (breath) | Ends a phrase cleanly. |
| **Comma** | Short beat | Groups related thoughts. |
| **Exclamation!** | Energy, urgency | "Run! Now!" |
| **Question?** | Curiosity, uncertainty | Natural upward inflection |

### Method 3: Narrative Pacing (Context)

The AI looks at surrounding text to determine speed.

**To Slow Down:** Write descriptive, somber text. Use longer sentences.
```
Slowly, he turned the handle, holding his breath, terrified of what he might find.
```

**To Speed Up:** Use short, punchy sentences. Remove commas.
```
Run! Go now! Don't look back!
```

---

## 6. Best Practices for Script Construction (2025 Update)

### 1. Prompt Length Matters (Critical for v3)

- **❌ Don't:** Generate 1 sentence at a time (e.g., "Hello."). The AI lacks context and sounds random.
- **✅ Do:** Provide a "chunk" of text (**250+ characters minimum**). Even if you only need one sentence, include surrounding text for context. Crop the audio later.

**Example:**
```
WRONG: [excited] Great!

RIGHT: 
Sarah had been waiting for this moment her whole life. 
[excited] Great! 
She couldn't contain her joy as she jumped up from her seat.
```

### 2. Context Wrappers (For Short Emotional Lines)

If you need a specific emotion but the line is too short, wrap it in a "director's note" narrative.

**Goal:** Get an angry "Get out!" from a 2-word line.

**Script:**
```
He slammed his fist on the table, his face turning red with rage as he screamed at the top of his lungs: 
[angry][shouts] Get out!
```

**Result:** The AI reads the quote with the anger established in the surrounding narrative.

### 3. Stability Slider & Voice Selection

**Stability Slider:**
- **Low Stability (30-50%):** More expressive, better emotional variation, better at tags. Risk of "going off script."
- **High Stability (70-100%):** Monotone, consistent, ignores extreme tags.

**Voice Type Impact:**
- **Designed Voices (IVCs):** Work best with all tag types. Highly responsive.
- **Instant Voice Clones:** Good tag responsiveness. Reliable.
- **Professional Voice Clones (PVCs):** ⚠️ **NOT OPTIMIZED for v3 yet.** Lower quality, tags may not apply consistently. Expect improvements in future updates.

**Recommendation:** Use **IVCs or designed voices** for best v3 audio tag results.

### 4. Tag Application Rules (Important)

- **Tags affect all text until a new tag appears.** Re-apply tags if you want to change delivery mid-sentence.
- **Tags are non-deterministic.** Same text + same tag = potentially different results across generations. Always test and iterate.
- **Longer tags reduce consistency.** Stick to 1-2 word tags: `[excited]` not `[very extremely excited]`.

---

## 7. Master Examples: Before & After

### Example 1: Horror Scene

**❌ The Bad Script:**
```
Hello. Is anyone there? I heard a noise. I'm scared.
```

**Critique:** Too short, no emotional direction, generic punctuation, sounds robotic.

**✅ The Optimized Script:**
```
[frightened][whispers] Hello? Is... is anyone there? 
<break time="1.0s" />
[gasp] I swear I heard a noise just now. 
[breathing heavily] 
[terrified][crying] Please, if you can hear me... just let me go.
```

**Why this works:**
1. **Tag Stacking:** `[frightened][whispers]` sets immediate mood.
2. **Punctuation:** Ellipses (`...`) add natural hesitation.
3. **Pacing:** The `<break>` creates genuine tension.
4. **Non-Verbal:** `[gasp]` and `[breathing heavily]` add realism.
5. **Arc:** Starts frightened, escalates to terrified/crying.
6. **Length:** Sufficient context for the AI to understand emotional depth.

---

### Example 2: Character Dialogue (Single Voice, Multiple Characters)

**❌ The Bad Script:**
```
Jessica: Hello.
Dr. Von Fusion: To be or not to be?
Jessica: That's amazing!
```

**Critique:** Indistinguishable characters, flat delivery, no personality.

**✅ The Optimized Script:**
```
[Australian accent][playfully][laughs] 
Jessica: That was brilliant, mate! Absolutely brilliant!

[dramatic][British accent][theatrical]
Dr. Von Fusion: To be... or not to be. That is the eternal question!

[excited][cheerfully][American accent]
Jessica: This is the most spectacular thing I've ever seen in my entire life!
```

**Why this works:**
1. **Accent Differentiation:** Each character has a distinct regional identity.
2. **Personality Tags:** Accent + emotion + delivery = unique voice.
3. **Non-Verbal:** Laughing integrates naturally with dialogue.
4. **Character Arc:** Each character feels like a real person.

---

### Example 3: Corporate Tutorial (Professional Delivery)

**❌ The Bad Script:**
```
Click the button. Then select the option. You're done.
```

**Critique:** No engagement, monotone, no pacing for comprehension.

**✅ The Optimized Script:**
```
[professionally][calmly] 
Let me walk you through this process step by step. First, 
[pause] 
click on the blue button in the top right corner of your screen. 

[pause] 
You'll see a dropdown menu appear. [pause] Select "Settings" from that menu. 

[pause] 
And that's it! 
[cheerfully] You're all set.
```

**Why this works:**
1. **Pacing:** Pauses allow viewers time to follow along.
2. **Professional Tone:** `[professionally][calmly]` sets trust and clarity.
3. **Tonal Shift:** `[cheerfully]` at the end provides positive reinforcement.
4. **Narrative Clarity:** Longer context helps the AI understand instructional tone.

---

## 8. Voice Compatibility & Known Limitations (2025)

### What Works Well:
- ✅ Emotional tags with designed/IVC voices
- ✅ Accent switching mid-sentence
- ✅ Non-verbal sounds (laughs, sighs, gasps)
- ✅ Pacing control with punctuation and tags
- ✅ Character performance layering

### What Doesn't Work Well:
- ❌ **PVC (Professional Voice Clones) with audio tags** — not optimized yet. Results are inconsistent.
- ❌ **Extreme sound effects** (explosions, gunshots) — can bleed into voice or distort audio.
- ❌ **Very long audio tags** — reduce consistency.
- ❌ **Combining 5+ tags** — stability drops significantly.
- ❌ **Assuming deterministic output** — same input ≠ same output. Always iterate.

### PVC Status (December 2025):
⚠️ **Professional Voice Clones (PVCs) are NOT fully optimized for Eleven v3.** 

ElevenLabs states:
> "Professional Voice Clones (PVCs) are currently not fully optimized for Eleven v3, resulting in potentially lower clone quality compared to earlier models. During this research preview stage, it would be best to find an Instant Voice Clone (IVC) or designed voice for your project if you need to use v3 features. PVC optimization for v3 is coming in the near future."

**Workaround:** Use **Instant Voice Clones** or **designed voices** instead of PVCs for best audio tag results.

---

## 9. API Specifications (Technical Reference)

| Specification | Eleven v3 | Turbo v2.5 |
|---|---|---|
| **Audio Tag Support** | ✅ Full (40+ tags) | ❌ None |
| **Character Limit** | 10,000 per request | 10,000 per request |
| **Supported Languages** | 70+ (with regional variants) | 29-33 |
| **SSML Support** | ✅ Yes | ✅ Limited |
| **Phoneme Support** | ✅ CMU-arpabet | ✅ CMU-arpabet |
| **Break Tag Support** | ✅ Yes (max 3s) | ✅ Yes (max 3s) |

---

## 10. Troubleshooting & Tips

### Issue: Tag isn't being applied
**Solutions:**
1. Check tag spelling (case-insensitive, but no typos).
2. Use shorter tags (1-2 words).
3. Try a synonym: `[sad]` → `[depressed]` → `[sorrowful]`
4. Ensure the voice supports that tag (test with a designed voice first).
5. Lower the stability slider to 30-50% for more tag responsiveness.
6. Add more context text (250+ characters).

### Issue: Tag is being read aloud instead of applied
**Solutions:**
1. Check for typos or extra characters in brackets.
2. Use brackets immediately before text: `[tag]text` not `[tag] text` (spacing can sometimes cause issues).
3. Ensure you're using Eleven v3, not Turbo v2.5.
4. Try with an IVC or designed voice instead of a PVC.

### Issue: Audio sounds robotic or emotionless
**Solutions:**
1. Add more emotional context in the surrounding narrative.
2. Increase emotional tag intensity: `[excited]` → `[hyped]`
3. Combine tags: `[excited][laughs]` instead of just `[excited]`
4. Add non-verbal sounds to humanize delivery: `[gasps]`, `[sighs]`
5. Use punctuation for natural rhythm: `...` and `—`

### Issue: Accent tag not working
**Solutions:**
1. The source voice matters. Some voices work better with certain accents.
2. Try layering: `[French accent][dramatic]` instead of just `[French accent]`
3. Add context: Don't just tag single words; tag full sentences.
4. Use IVCs/designed voices; PVCs have reduced accent quality.

### Issue: Non-deterministic output (different results each time)
**This is expected behavior.** ElevenLabs v3 is non-deterministic by design for expressive variation.

**Solutions:**
1. Generate 2-3 versions and pick the best.
2. Use higher stability (70-100%) for consistency (but less emotion).
3. Use lower stability (30-50%) for variety (but accept inconsistency).
4. Iterate with refined tags and context.

---

## 11. Tips for Power Users

### Tip 1: The "Emotion Escalation" Pattern
Build emotion gradually through a scene:
```
[calm] Everything is fine.
[nervous] Wait... what was that?
[afraid] Did you hear that?
[terrified][screams] RUN!
```

### Tip 2: The "Identity Shift" Pattern
Change who's speaking by stacking character + accent + emotion:
```
[pirate voice][gruff] Arr, the open seas!
[narrator][calm][British accent] But beneath the waves lay darkness.
[evil scientist voice][dramatic][menacing] Muahahaha!
```

### Tip 3: Pause for Emphasis
Use pauses strategically:
```
[slowly][serious] You... didn't... tell them... the truth.
<break time="1.5s" />
[angry][shouts] Did you?!
```

### Tip 4: Realism Through Non-Verbal Sounds
Layer non-verbal sounds with dialogue:
```
[nervous][stammers] I... I th-think... [gulps] I can do this.
```

### Tip 5: Context for Short Lines
Never tag a single word. Always give context:
```
❌ [excited] Yes!

✅ After months of waiting, she finally got the call she'd been dreaming of. 
[excited] Yes! 
She couldn't believe it was finally happening.
```

---

## 12. Changelog & What's New (December 2025)

### Recent Updates to v3:
- ✅ **Expanded pacing tags:** `[rushed]`, `[drawn out]`, `[stammers]`, `[hesitates]`
- ✅ **Accent emulation feature:** Full support for regional dialects mid-sentence
- ✅ **Character archetype tags:** `[pirate voice]`, `[robot voice]`, `[evil scientist voice]`, etc.
- ✅ **Conversation flow tags:** `[interrupting]`, `[overlapping]`, `[cuts in]`
- ✅ **Improved multi-character dialogue:** Better identity consistency
- ⚠️ **PVC optimization:** Still in progress. Using IVCs recommended.
- ✅ **Delivery control expanded:** More granular pacing and rhythm options

### Coming Soon (Expected 2025):
- Real-time v3 model (lower latency)
- PVC full optimization for v3
- Extended API access
- More character archetypes

---

## 13. Quick Reference Cheat Sheet

```
EMOTION STACK:
[emotion][vocal_action] Text

EXAMPLE:
[excited][shouts] This is incredible!

---

CHARACTER STACK:
[character_voice][accent][emotion] Text

EXAMPLE:
[pirate voice][British accent][dramatic] Arr, the treasure awaits!

---

PACING STACK:
[pacing_tag][emotion] Text

EXAMPLE:
[rushed][excited] We need to go NOW!

---

MULTI-CHARACTER:
Character A: [Australian accent][playful] Dialog here.
Character B: [British accent][serious] Dialog here.

---

SOUND EFFECTS (Experimental):
[laughs] Regular text with a laugh.
<break time="1.0s" /> Silence for dramatic effect.

---

PRONUNCIATION FIX:
Name: Siobhan → Script: Shiv-awn
Date: 01/01/2024 → Script: January first 2024
Phone: 555-1234 → Script: 5 5 5, 1 2 3 4
```

---

## Final Recommendations

1. **Start Simple:** Use 1-2 tags per sentence until you're comfortable.
2. **Test & Iterate:** Generate multiple versions. v3 is non-deterministic.
3. **Use IVCs:** Professional Voice Clones aren't optimized yet. Use Instant Voice Clones or designed voices.
4. **Add Context:** Never tag single words. Provide 250+ characters for AI understanding.
5. **Match Voice to Tag:** Not all voices work with all tags. Test your voice first.
6. **Stability Slider Matters:** Low (30-50%) for emotion, High (70-100%) for consistency.
7. **Combine Tags Strategically:** Emotion + Action + Pacing = Full performance.
8. **Read the Docs:** ElevenLabs updates features frequently. Check their blog for new tags.

---

**Last Updated:** December 13, 2025  
**Version:** 2.1 (Complete Revision)  
**Status:** Current for Eleven v3 (alpha) and Turbo v2.5

For the latest updates, visit: https://elevenlabs.io/blog
