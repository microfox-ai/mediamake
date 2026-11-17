# Writing and tagging a script for the voice

Read this before writing or tagging any script. It covers two passes:
1. **Write for the ear.** What sounds like a person talking.
2. **Tag for delivery.** How Eleven v4 is told *how* to say it, without changing *what* is said.

Sources: ElevenLabs' v4 and v3 prompting guides and the Text to Dialogue docs (Sep–Nov 2026), plus the Techyon
Shorts.

## 1. Write for the ear

People listen once, at speed, and can't re-read.

- **Short sentences.** One idea each, mostly 6–14 words. Then one longer one, so the rhythm doesn't tick like a metronome.
- **Contractions and spoken words:** "it's", "you'll", "that's", "turns out", "here's the thing".
- **Signposts the ear needs:** "So.", "But here's the catch.", "Okay, two things.", "The weird part?" Use one or two per 30 s, not every line.
- **Questions** pull a listener forward: "So who's exposed?" and then the answer.
- **The verb early.** "Microsoft found agents abusing leaked keys", not "It was found by Microsoft that…".
- **Numbers as they're said:**
  - "9.8" → "nine point eight", "$6.3B" → "six point three billion dollars";
  - "CVE-2026-98432" → "a Linux bug, CVE twenty twenty-six…" (or show the id on screen and say "this bug");
  - "v7.1.4" → "seven point one point four".
- **Hard names:** spell them as said, or give IPA in slashes: `"Kubernetes /ˌkuːbərˈnɛtiːz/"`. v4 reads IPA; test it once.
- **Cut** what only works on paper: parentheses, "the former / the latter", long lists. Put lists on screen and say "three things".
- **Read it out loud in your head at the target speed.** About 2.6–2.9 words a second for a Short (≈ 120–130 words in 45 s at speed 1.1).

## 2. Write a dialogue that sounds like people

- **Roles with a reason to talk:**
  - a curious host and an expert;
  - a sceptic and a believer;
  - a newcomer and a friend who explains.
  Each has a voice, a stance and a habit (one says "wait, wait", one answers dryly).
- **Turns are short:** one to three sentences. Trade often. A long explanation is broken by reactions: "Mm.", "Okay…", "No way.", "Right, so—".
- **Speakers react to each other,** not to the audience: "You're telling me it was a *job interview*?"
- **Interruptions and finishing a thought:**

  ```
  Speaker 1: So the fix is just—
  Speaker 2: [interrupting] Patch AND reboot. People forget the reboot.
  ```

- **Every line is attributed to a speaker.** In `script.json`, one line is one turn of one speaker.
- **Give each speaker a few dry or warm moments** (the Techyon "deadpan aside"). Aim them at the situation, never at a real person.

## 3. Natural, not clean (the user's pick, 2026-11-11)

A clean, written script is the biggest giveaway that a voice is AI, even with good voices. Real speech has
small imperfections. Put them in on purpose, sparingly:
- **Fillers and restarts** in about one line in three: "Uh, so...", "Like...", "Okay, so... wait.", "It's — well, it's a race."
- **Reactions** that are a word or two: "Yeah. No.", "Noted.", "Wait, what?", "Huh."
- **A laugh or a chuckle** where a person would laugh (`[laughs]`, `[chuckles]`), never more than one in about 15 s.
- **Trailing off** with ellipses, and a person cutting in (an em dash, then `[interrupting]`).
- **Keep the facts exact.** Fillers go around the facts, never inside a number or a name.

The cost is length: the same facts took about 60 % longer to say (14 s → 23 s). In a Short, cut a fact or a
filler rather than speeding the voice up.

The take the user picked (stability 0.35, eleven_v4, then `voice finish`):
```
maya: [curious] Okay, so... wait. What actually happened with the Linux bug?
dev:  [sighs] Uh, so... it's a race in the TCP code. They scored it nine point eight. Out of ten.
maya: [surprised] Nine point EIGHT? [laughs] That's... not great.
dev:  [dryly] Yeah. No. [short pause] Patch it, then reboot. Like... in that order.
maya: [chuckles] Noted.
```
Before (clean, and judged "very easy to identify as ai"):
```
maya: [curious] Okay, so... what actually happened with the Linux bug?
dev:  [sighs] A race in the TCP code. Nine point eight out of ten.
```

## 4. Tag for delivery (Eleven v4)

Tags go **at the start of a line or a turn**, or mid-turn before the words they colour. They are instructions, so
they are never read aloud when written as below.

| purpose | tags that work |
|---|---|
| emotion | `[curious]`, `[excited]`, `[thoughtful]`, `[surprised]`, `[annoyed]`, `[sad]`, `[happy]`, `[sarcastic]`, `[mischievously]`, `[appalled]` |
| delivery | `[whispers]`, `[shouting]`, `[dryly]`, `[deadpan]`, `[serious]`, `[confident]`, `[low, gravelly voice]`, `[singing quickly]` |
| non-verbal | `[laughs]`, `[chuckles]`, `[sighs]`, `[exhales]`, `[clears throat]`, `[gulps]`, `[happy gasp]`, `[frustrated sigh]`, `[snorts]` |
| pace and pauses | `[short pause]`, `[long pause]`, `[pauses]`, ellipses `...` |
| dialogue | `[interrupting]`, `[overlapping]`, `[jumping in]` |
| accent | `[strong French accent]` (only for a character, and never as a caricature of real people) |

**Punctuation does as much as tags:**
- `...` adds a beat and weight: "And then... nothing."
- A CAPS word stresses it: "It was NINE point eight." Use one per sentence at most.
- An em dash `—` cuts a line off, for an interruption.
- `?` and `!` shape the pitch; use `!` sparingly or it sounds like an ad.

**Rules of thumb:**
- **1–3 tags a line.** More makes it sound acted.
- **Vary them from line to line.** One tag held over a whole section reads flat. On a Techyon Short, a different tag on each line (impressed, incredulous, sighs, chuckles, playfully, deadpan) plus one CAPS word widened the pitch range from about 7–9 to 11–14 semitones, and the user had asked for "some expressions".
- **Match the voice's character.** A dry narrator doesn't `[giggle]`. If a tag fights the voice, the voice wins and the line sounds odd.
- **Say the quality.** Write `[low, gravelly voice]`, not `[gravel]`: a vague tag can be read as a sound effect.
- **Nothing that isn't speech.** No music or ambience tags for a narrator. (`[applause]` and the like are sound effects; leave them to the mix.)
- **No SSML `<break>`.** v4 ignores it. Use ellipses or the pause tags.
- **Tagging never changes the words.** Add tags, punctuation and CAPS only. If the wording is wrong, fix it in the plain script first, then tag again.
- **Experimental tags** (`[sings]`, `[woo]`) are inconsistent. Test before relying on one.

## 5. Settings that go with the tags

- **Stability 0.35** is the default (the user's pick): more range and life. Make two takes and pick.
  - 0.5 (Natural) is steadier, for long calm reads.
  - 0.7+ is steady but plays tags down.
- **Speed** (`tts` only): 1.0–1.1 for Shorts; slower (0.9–0.95) for calm explainers.
- **Seed:** keep the seed of a take you like (`meta.json`). It's best-effort, not exact.

## 6. Before and after

Plain, as written for reading:
> Microsoft says threat actors are using agentic AI frameworks to locate exposed secrets on GitHub, with one case
> progressing from discovery to Azure Key Vault exfiltration in five minutes.

Written for the ear:
> Leaked a secret on GitHub? AI agents now find it for attackers. In one case Microsoft saw, an agent went from that
> leak to the company's key vault in five minutes.

Tagged (one narrator, dry tech voice):
> [confident] Leaked a secret on GitHub? [serious] AI agents now find it... for attackers. In one case Microsoft saw,
> an agent went from that leak to the company's key vault in FIVE minutes. [dryly] Speedrun.

As a dialogue:
```
maya: [curious] Wait, how fast can an AI agent use a leaked GitHub key?
dev:  [dryly] Microsoft timed one. Five minutes.
maya: [surprised] Five MINUTES?
dev:  [serious] From the leak... to the key vault. So rotate the key. Deleting the commit isn't enough.
```
