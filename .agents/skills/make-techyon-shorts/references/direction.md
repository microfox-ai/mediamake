# Techyon direction: the channel's rules (v2 from 2026-11-08, updated 2026-11-11)

**This is the one source of the Techyon channel's rules.** `projects/techyon-direction.md`, the toolbox README and
`brands/techyon/brandguide.md` point here; if any of them disagrees with this file, this file wins. Every session
working on Techyon reads it first, and again before recording the voice and before mastering. When the user changes
something for every Short, it is changed here first (the skill's "Channel-wide changes").

> "i dont like the shorts in our brand as much as the old cve one at all. i think our brandkit is making it very
> restrictive and not creative enough, let the agent be creative, no need to strictly follow the brand, just use
> the brand colors and layout maybe. refactor and redesign our brand on your own (dont ask me for anything), take
> the old cve one as reference and use its colors too. dont just fix a few graphics and sound effects and music
> and let the claude find it whenever it works on it instead of just picking from the brand kit"

## The reference

The October 2026 CVEs Short is the benchmark for density, motion graphics and sound:
- source: `projects/cve-october-2026/`, with its style rules in `prefs.md`;
- finals: `out/cve-october-2026/`, with stills in `stills/` and the master `.mp4`.

Watch it before designing anything. Every Short should feel at least that full, that alive and that well scored.
**Never edit that project**; copy what you need.

What made it work:
- a near-black ground with a dot grid, a slow scan band, and a glow in the section's colour pulsing on the music's beat;
- dense, bespoke devices per beat:
  - gauges, rank slams, update bars, satellites around a hub, attack-flow diagrams;
  - stamps (PATCH NOW), spark traces and brush strokes, kinetic words;
  - 3D cards, file/shield/server/bug icons;
- big Figtree 900 captions, with the spoken word on a box in the section's colour;
- a whoosh on section changes, a stamp on the big moment, and pumping music (sidechain-ducked under the voice);
- a seamless loop whose last frame is the first.

## The only fixed anchors (everything else is your call)

1. **Palette (the CVE Short's, now Techyon's).** Use the roles; tints and gradients of these are fine.

   | role | hex |
   |---|---|
   | ground | `#06070A` |
   | panel / panel hi | `#0E1117` / `#151A23` |
   | line | `#232A36` |
   | dim text | `#7D8796` |
   | text | `#F5F7FA` |
   | ink (text on light boxes) | `#07080B` |
   | **signal yellow (the brand's signature accent: hooks, highlights, the logo core)** | `#FFD93D` |
   | info cyan | `#3DD6FF` |
   | fix / good green | `#22E39A` |
   | warning amber | `#FF9F1C` |
   | danger red | `#FF3B3B` |
   | max pink | `#FF2D55` |

   Colour carries meaning (severity, good or bad, section). A Short may lean on whichever accents suit its story.
   The old volt green `#C6FF33` is retired.
2. **Type.**
   - Figtree 700/900 for captions and headlines (the CVE Short's face).
   - JetBrains Mono for ids, versions and code.
   - Anton (optional) for huge condensed numbers.
   - The TECHYON logo keeps its own drawn shape; only its colours follow the palette.
3. **Captions.**
   - 1–3 words a screen, Figtree 900, the spoken word on a box in the section's colour, the rest dimmed.
   - Centred around x 490 / y 1300–1340, inside the safe area.
4. **Layout.** No words in the top 12 %, the bottom 22 % or the right 14 % (y < 236, y > 1496, x > 910); graphics may run under them.
   - The hero sits in y 300–1150.
   - The first frame works as the cover: 2–5 words, huge, inside y 640–1280.
   - Research: `projects/techyon-shared/research/shortform-best-practices.md`.
5. **Brand presence.** No logo at the start; a small Techyon tag (the T mark + TECHYON) in the last second at most, gone before the loop seam.
6. **Sound targets.**
   - −14 LUFS integrated, true peak ≤ −2 dBTP.
   - The voice always clear: music sidechain-ducked under it and pumping between phrases.
   - Effects sparse and purposeful.
   - After every render, run `projects/techyon-shared/tools/remux.sh` (Remotion starts the audio 42.7 ms late).
7. **Voice and tone** (since 2026-11-11: the voice skill's recipe, picked by the user by ear).
   - The narrator is "Techyon Narrator (young American, E)" (ElevenLabs `r3CSRNuTBNTuPufjI9Vj`). Voice it with the `make-elevenlabs-voice` skill:
     - **`eleven_v4`, stability 0.35**, speed 1.0, two takes, pick the better one (`mm voice … tts|dialogue`);
     - **a natural script**: a filler or restart in about one line in four for a narrator ("Okay, so...", "Like..."), reactions, a dry laugh where it fits;
     - **then the room finish** (`mm voice finish <take>`), and `vo-room.wav` becomes `input/vo/vo.wav`;
     - emotion tags as before, in `script.json` `text` ([confident] hook, [serious] facts, [deadpan], [dryly] or [sarcastic] asides).
   - Measured cost: about 0.44 credits a character on v4, so two takes cost about what one v3 take did.
   - Liam (`TX3LPaxmHKxFdv7VOQHJ`) voiced the first 14 Shorts on multilingual v2, and the Nvidia Short used E on v3. Never mix voices within one narrated Short. In a dialogue Short, E and Liam together are the pairing the user picked.
   - The tone is dry, exact and developer-literate: sceptical of hype, never smug.
     - Add 2–3 deadpan asides per Short ("Not your typical company memo.", "Timing: not ideal."), aimed at the situation, the market or the timing, never at a person or an allegation.
     - Show each aside as a sticky note or stamp in signal yellow.
   - The loop line leads into the first line as one thought ("…which is how X got this headline:" → the cover → the hook).
8. **Truth.**
   - Receipts on screen. Every fact traces to `sources.md`.
   - Opinion is labelled OPINION, analysis ANALYSIS, and vendor numbers are stamped as the vendor's.
   - Security stories are defensive: who is exposed, the fixed versions and what to do. No exploit details or trigger conditions.
   - **Sensitive stories** (allegations about real people, crimes, markets):
     - Say what is confirmed (by whom) apart from what is alleged (by whom). Say "alleged" or "reportedly" every time, in the voice and on screen, and give the denial when there is one.
     - Never name a private person who hasn't been charged.
     - Never say or imply wrongdoing that isn't established. Show the exculpatory line when there is one (e.g. the board's "no reason to believe … compromised").
     - Every market number carries its time ("before Monday's opening bell"). Forecasts are ANALYSIS with the analyst's name. "Not financial advice" goes small on screen, and there are never buy or sell calls.
9. **Format.** 9:16, 30 fps, 30–55 s, a seamless loop (the last line flows into the first, and the last frame is the first).

## Free for every Short (be creative)

- **Scene design:** the visual idea for each beat, the devices, the illustrations, the 3D (Blender is available), backgrounds, transitions, camera moves, pacing and colour use within the palette. Invent devices that fit the story; don't reuse a set of stock cards.
- **Music: find it for each Short.**
  1. Search the media library first: `mm media find <mood words>`.
  2. Then free tracks that are **not** marked Content ID registered (Pixabay).
  3. Or ElevenLabs `compose_music`: state the cost and stay within budget.
  - Downloads go to the inbox, then `media ingest`.
  - Pick what fits the topic's energy. "Tech Circuit Data Stream" (library a15411d3ec) is the fallback, not the rule.
- **Sound effects: find or make them for each Short.**
  - Search the library, or make them with ElevenLabs `text_to_sound_effects` (Creator plan only; never reuse free-plan files commercially).
  - The CVE-style whoosh, stamp and glitch in `projects/techyon-shared/sfx/` are available, not mandatory.
  - Check each effect's band energy, and keep it smooth and catchy, never harsh.
- **Tools you may use (optional):**
  - `projects/techyon-shared/tools/`: timing, mix, remux, vo-splice `--fit-grid` for loops;
  - the CVE Short's `video/fx.tsx` primitives, copied into your project or taken from the shared toolbox;
  - a copy of the CVE engine as a starting point.

## Budget and review

- About 2–3k ElevenLabs credits per Short (voice, effects, music), plus about 1k when composing music. Report what you spend.
- Don't ask the user about design: decide, then show the result.
  - Review through Video Revision: a half-size cut, then the master after sign-off.
  - Masters, finals and the cloud update (ProjectSync) come only after the user signs off.
- Compare your cut side by side with the CVE Short's stills before you show it. If yours looks emptier, it isn't done.
