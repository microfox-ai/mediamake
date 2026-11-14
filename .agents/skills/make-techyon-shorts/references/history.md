# Techyon: what happened and why the rules are what they are (8–11 Nov 2026)

This file holds the reasons behind the rules in `SKILL.md`. Read it when a rule looks odd, or before changing one.

## Timeline

| when | what |
|---|---|
| 8 Nov, early | The user wanted a dev/tech-news channel "like Fireship". The name **Techyon** was picked over Kaon, Daemon and Nightly. A Standard brand kit (`pack-brand-kit`) was built with a volt-green (#C6FF33) look, a MediaMake cloud project was made, and five **long-form** scripts were researched and written in parallel. ElevenLabs Creator was bought for the voices. |
| 8 Nov | **Pivot:** "make this a short form content channel… cachy shorts optimised to social media". The scripts were cut down to Shorts. Liam was picked from four voice samples. A Shorts kit (`techyon-shared` v1) was built from the brand kit, with set transitions, a set music bed and set scene cards, and a pilot Short (Kimi) was made on it. |
| 8 Nov | **Four feedback rounds** on the first Shorts (see Revisions below). They ended with **direction v2**: "be creative, not kit-bound", the October CVEs Short as the benchmark, its palette as the brand's, and the kit turned into an optional toolbox. The brand was redone as v2 (volt retired, signal yellow), and all six Shorts were rebuilt and approved. |
| 8 Nov, evening | The YouTube channel was created (Techyon Dev, @TechyonDev), AI disclosure was turned on, the Altman Short was published, and five Shorts were scheduled daily at 20:30 IST. The pipeline was saved as this skill. |
| 9 Nov | The Nvidia CEO story was verified and built as breaking news in about an hour. On review the user asked for a fixed loop, dry humour and a new voice, and picked a designed voice (E) on eleven_v3. It went up the same day. Eight more topics were scouted and picked, upload-time research set three slots a day, and eight build sessions ran in parallel from one shared brief: seven were mastered within about an hour of starting. Four Shorts went up. YouTube's daily upload limit then blocked the rest, which went into a pending pack. |
| 10–11 Nov | The schedule was cut to **two a day** (07:30 and 20:30 IST). The four pending Shorts were uploaded for 12–14 Nov. Proton is still in review. |

By 11 Nov: 15 Shorts made, 14 of them mastered and on YouTube (published or scheduled).

## Revisions: what wasn't good, and the rule it became

| what the user said | what was wrong | the rule now |
|---|---|---|
| "the transition sound effect is not good… disturbs the people… should be cachy… but smooth" (WorkOS rev-001, v1–v5) | The kit's tonal-swell transition was harsh and the same on every Short. | Each Short finds its own effects. They're short, smooth and band-checked, and the CVE whoosh, stamp and glitch are the fallback. |
| "the background is bad", "the short seem[s] too empty… a little more content… than current" | Kit scene cards on a flat ground, with one thing on screen at a time. | The CVE Short's density: a living ground (dot grid, scan band, glow on the beat), about one change a second, and a side-by-side check against the CVE stills before review. |
| "the contents are not at the correct position" | Words sat under YouTube's interface. | The research-backed safe zone: no words above y 236, below y 1496 or right of x 910, the hero in y 300–1150, and the first frame as the cover. |
| "looping where the end connects with the start" | The Shorts just ended. | A seamless loop: the last frame is the cover, and the voice is fitted to the bar so the loop lands on it. |
| "the background sound is a bit less… keep the starting and ending volume even higher" | The music was too far under the voice. | `mix.py`: the music pumps between phrases, is louder at both ends and stays at least 12 dB under the words. |
| "the old cve short seemed really good… use the music of the old cve video only" | The kit's own bed. | "Tech Circuit Data Stream" became the fallback; each Short scores its own track. |
| "i think kimi didnt adapt" | A bug in `mix.py` (the lift in the gaps never fired on tightened voices), plus Remotion starting the audio 42.7 ms late. | `remux.sh` after every render, and a kit-wide fix is rolled out to every Short and then checked on disk. |
| "the cve one is also not good… refactor… our brand styles… on that short… looks so empty" | The remake had lost what made the original work. | The original CVE Short is the benchmark: read it, never edit it. |
| "our brandkit is making it very restrictive and not creative enough… let the agent be creative… just use the brand colors and layout" | The Shorts kit was a template. The brand was designed from mood boards, not from the Short the user already loved. | Direction v2: a few fixed anchors (`direction.md`), everything else designed fresh for each Short, and no design questions to the user. |
| "the end doesnt seem connected to the start when looped" (Nvidia) | The last line was a question that just came before the hook. | The loop line leads into the first line as one thought ("…which is how … got this headline:"). |
| "add some subtle humour, sarcasm but stay neutral? like how fireship does it" | Flat, news-reader tone. | Two or three deadpan asides per Short, aimed at the situation, the market or the timing, never at a person or an allegation. |
| Liam and four other stock voices: "these all seem ai… younger american voice… expressions and emotion" | A stock voice on multilingual v2. | Techyon Narrator (E), a designed voice on eleven_v3 with emotion tags. |
| "upload… because of 'Upload more videos daily after a one-time verification…'" | Ten uploads in about 24 h on an unverified channel. | Count the last 24 h of uploads before each pack; whatever doesn't fit goes in the pending pack. |
| "only upload 2 per day" | Three a day was too many. | Two slots, 07:30 and 20:30 IST. |

## Where the pipeline went off course, and why

1. **The format was decided after the brand.**
   - The brand kit and five long-form scripts were built before the switch to Shorts.
   - The kit's 16:9 intros and end screens are unused.
   - Rule: settle the format (Shorts-first) before any brand or script work.
2. **The reference came second.**
   - The CVE Short existed before the brand, and the user loved it.
   - It became the benchmark only after three rejected rounds.
   - Rule: start from what the user already likes.
3. **The kit became a template.**
   - Fixed transitions, bed and cards made every Short the same, and emptier than the reference.
   - Rule: anchors are fixed; everything else is the Short's own.
4. **Taste didn't reach the parallel sessions.**
   - The Nvidia review changed the voice and tone on 9 Nov while eight sessions were already building with Liam.
   - The anchors were copied in four places (the skill's `direction.md`, `projects/techyon-direction.md`, the toolbox README and `brandguide.md`), and none of them changed.
   - So the channel has two voices: Liam on the first 14 Shorts, E from Nvidia on.
   - Rule: one canonical anchors file (`references/direction.md`). A channel-wide change goes into it at once, and every running session gets a pointer to it.
5. **Library rules were followed unevenly.**
   - About half the Techyon productions weren't registered, and none has its channel set.
   - Only some sessions filed their generated music and effects.
   - Rule: register at intake with `--channel=techyon`, and file generated sound in the library.
6. **Uploads needed the user every time.**
   - Browse Hack's Schedule click failed on all 9 batch uploads (the button stays off while the file uploads).
   - Category and language sometimes didn't take.
   - The unverified channel hit its upload cap.
   - Rule: tell the user exactly which tabs need a click, and never run a pack twice.
7. **Some hooks went stale.**
   - The Linux Short's hook ("Ubuntu's LTS still isn't patched") and Inkling's ("about to drop") depend on facts that can change before the slot.
   - Rule: a time-sensitive hook gets a recheck (or a watcher) up to its slot, written in `UPLOAD.md`.

## What worked and should stay

- One shared brief file per batch, with short session prompts: eight sessions, and seven Shorts mastered within about an hour.
- Breaking news verified first, then built and uploaded within the day (Nvidia).
- Strict truth rules on a sensitive allegation: confirmed versus alleged, no naming of a private person, analysis attributed.
- The user signing off in chat ("master it and upload") was enough when the cut was good, and `report.md` records it.
- `make-pack.py`: a pack with each Short's own `scheduleAt`.
