---
name: make-techyon-data-shorts
description: Make a Techyon data Short. There's no narrator, only music and animated charts (a bar race, a line race, a head-to-head, a counter) of one long, sourced time series about tech or AI, with a fresh news hook, a build and a reveal at the end, told in on-screen text. Data comes first: real datasets downloaded, cleaned and checked (gaps, outliers, units, licences) with tools/data/clean.py, and a provenance record behind every number. The cut is timed to the music's bars and loops. There are two masters: one with a copyright-safe track that Browse Hack uploads, and a silent one the user posts from the phone with a trending sound. Use when the user asks for a Techyon data, chart, stats, "numbers", "growth over time", "bar chart race", "no voice" or "music-only" Short, a data visualisation Short about tech or AI, or asks to change, pack or upload a project named techyon-*-data-short. For narrated news, make-techyon-shorts.
metadata:
  depends-on: make-techyon-shorts, dataviz
  category: make
---

# make-techyon-data-shorts

A Techyon Short with no voice: the data tells the story, on music, in 20–45 s. Everything `make-techyon-shorts` says
still holds:
- the anchors (palette, type, safe zone, cover, end tag, loop);
- research and the truth rules;
- build sessions;
- review;
- masters, cloud and slots.

**Read it first.** This skill lists what's different:
1. the data comes first and has its own checks;
2. the story is told in on-screen text and the charts;
3. the timing comes from the music;
4. there are two masters.

**Why it works:** a chart that moves (a race, a line bending upwards, one bar dwarfing another) is understood with
the sound off, rewatched to catch the numbers, and shared as a "did you know". It only works if every number is
real. A data Short with one wrong point is worse than none, so the dataset is built and checked before anything is
designed.

## 1. The topic: a long series with a fresh hook

Look for three things:
- **a time series of 10+ years or 15+ points,** downloadable (CSV or an API);
- **a licence that allows reuse** on a monetised channel;
- **a news hook from the last few weeks:** a new record, a crossover or a milestone.

Examples: training compute of frontier models, the price of a million tokens, TOP500's fastest machine, GitHub
developers by country, data-centre power use, transistors per chip.

**The reveal** is the point of the Short. Find it before designing: a crossover ("India passed the US in 2027"), a
scale ("×10 billion in 14 years") or a turn ("then it fell"). Without one there's no Short, only a chart.

`references/data-sources.md` lists good open sources with their licences, and the traps.

## 2. Data first: download, clean, check, record

Work in the Short's `data/`:
1. **Find the primary dataset** (web search, the deep-research MCP for one cross-check). Read its licence page.
   - CC BY or ODbL: fine, credit it on screen and in the description.
   - CC BY-NC, "personal use", Statista or anything paywalled: not usable. Find the primary source the numbers came from.
   - Facts from filings or official releases: fine, cited per point.
   - **An API** has its own terms of use, separate from the content's licence (Stack Exchange's API asks for attribution to the network and says nothing against commercial use). Read both.
2. **Download it as it is** into `data/raw/`, and note the URL and the date. Never edit a raw file: every change goes in the recipe.
   - **From an API,** write `data/pull.py` (copy the Stack Overflow project's): one call per bucket, every raw response kept, a call log, the quota respected and a backoff on 5xx errors.
   - **Counts that change after the fact** (deleted questions, revised figures): quote them "as of <pull date>", on screen and in the notes. Stack Overflow's October 2026 read 977 on 29 Oct and 949 on 11 Nov.
3. **Write `data/recipe.json`** (format at the top of `projects/techyon-shared/tools/data/clean.py`):
   - the sources and their columns, and filters;
   - mixed units in one file: `"unit_column"` and `"units": { "thousands": 1000, "count": 1 }`;
   - renames (merging one company's names);
   - the bucket (year, quarter or month) and how to aggregate;
   - a running record, if the story is "the record so far";
   - which series to keep;
   - every drop and every accepted oddity **with a reason** (`drop`, `keep`), and every flag you checked and kept (`decisions`: `[{series, x, why}]`, written under "Decisions" in `provenance.md`);
   - per source, the `terms` page and a `note` on how it was read (method, caveats), both copied into `provenance.md`.
4. **Run it** (from the workspace: `mm workspace` says where):
   ```bash
   python3 -I projects/techyon-shared/tools/data/clean.py <slug> --check
   ```
   - It writes `data/series.json` (what the charts read), `data/clean.csv` and `data/provenance.md`.
   - It fails on any source with no URL, licence or date; on unreadable numbers or an unlisted unit; on non-positive values on a log scale; on a series with under 3 points; on a spike more than 20× both neighbours (a typo, until it's dropped or kept); and on a drop or keep with no reason.
   - It reports every missing year (or quarter, or month), outliers, falls and coverage. **Decide each one** against the source: fix the recipe, drop it with a reason, or keep it and say so on screen ("no data 2016–17"). Never smooth a gap into a trend.
5. **Spot-check 3 values against the source page itself** (the biggest, the reveal and one at random), and write them in `provenance.md` under "Spot checks". For an API, the "page" is the API URL for that value. Add one independent count when someone has published one (for Stack Overflow, a DEV post and heise matched).

**The hook's own number goes through the same checks:**
- a figure that can't be sourced never goes on the cover or in the loop line;
- a company's own count is labelled as theirs ("CodeHarbor's figure");
- the cover never implies the chart's points add up to it unless they do.

The hook's news gets a `sources.md` as in any Techyon Short. `provenance.md` is the data's receipt, and its source
line goes on every chart frame (`SourceLine`).

## 3. The story, in text and charts

**`script.json`:**
- `"voice": false` and `"loop": true`;
- beats with an empty `say`, timed in music bars (`"bars": 4`);
- each beat's on-screen text in its `visual` (`{ "type": "line-race", "text": "AI training compute", "sub": "FLOP, log scale" }`).

The shape, in bars of the track:

| beat | bars (at ~120 bpm, 2 s a bar) | what |
|---|---|---|
| **cover / hook** | 1–2 | 2–5 huge words: the claim or the question ("AI compute since 2012"). It's frame 0 |
| **the build** | 6–10 | The race or the line, a label for each turn the eye should catch |
| **the twist** | 2–4 | A crossover, a log-scale switch, a zoom out, a "then…" |
| **the reveal** | 2–3 | The number in context, huge (`Counter` or `Compare`: "×10,000,000,000") |
| **the loop** | 1 | The last frame folds back into the cover |

- **Text:** 7 words or fewer per card, each on screen for at least 1.5 s. The hook and the reveal are the only big type. Labels say units ("FLOP", "$ per 1M tokens").
- **Honest charts** (`dataviz` for the craft): a linear axis starts at zero; a log scale says LOG on the axis; no 3D and no cut-off axes; series labelled at their heads rather than in a legend; colour on the focus series and the rest muted. A forecast is labelled FORECAST with its source, and never runs past the last real point unlabelled.
- **Toolbox charts** (`projects/techyon-shared/toolbox/charts.tsx`): `BarRace`, `LineRace`, `Columns`, `Compare`, `Counter`, `SourceLine`, and `dataX(t, at, dur, x0, x1)` for the clock.
  - **One series with missing years:** use `Columns`, whose missing years stay empty slots labelled N/A, or `LineRace` with `gaps`. A plain line draws straight across a gap.
  - **One long series with a huge range** (200× from peak to now): `Columns`, with its x and y zoom from zero (re-labelled ticks, `tickGap`), reference lines, event markers and pins. `LineRace` flattens the end into the floor.
  - **Data time:** even between anchors. Pin the data's turns to the music's moments (the peak on the hit, the plunge on the last section) and run evenly between them.
- **Still Techyon:**
  - the ground pulses on the beat (`Ground` with the track's beat);
  - something changes every 1–2 bars;
  - sound effects are off by default (the user, 11 Nov 2026: "dont add any other sound effects"): the music carries it. If the user asks for them, they land on bars: `"sound": { "hits": [ { "sound": "impact", "bar": 8 } ] }` (bar 0 is the first frame), read by `mix.py`;
  - the brand tag comes in the last second and is gone before the seam;
  - the cover's words sit in y 640–1280.
- **No captions:** there's no voice. `captions.srt` is optional: write the on-screen texts as subtitles if the Short has more than three cards.
- **The topic, big, from frame 0:** the dataset's name as a title (Anton ~90 px at the top, with what is counted under it), on screen the whole Short. A small header leaves viewers guessing what the Short is about (the user, 11 Nov 2026).
- **The race fills the music:** the build runs across the whole clip, with its turns on the music's moments (the Stack Overflow Short: the peak on the hit, the plunge on the last section). It must not finish halfway and leave the rest to labels (the user: "it is completing in half time").

### Reactions (optional, the user's call)

Popular data Shorts cut real people's meme reactions in beside the chart (the user, 11 Nov 2026: "the reaction videos of actual people which became meme, popular clip etc"). Offer them as a variation, never by default:

1. **Ask first:** they are other people's footage. On a monetised channel YouTube can take the revenue, block the Short in some countries, or a rights holder can file a strike. Real clips are the user's call; the alternatives are AI look-alike reactions (credits) or none.
2. **Match the music, then the moment.**
   - First look at what the sound's own Shorts use: its sound page (`youtube.com/source/<track id>/shorts`) and searches like "<film> crying meme". On Cornfield Chase the top emotional meme is Cooper crying at the messages in Interstellar ("Her entire life was just a few hours for him", 21M views).
   - Then pick one reaction per turn of the data: the climb, the peak, the slide, the plunge, the last value landing, the reveal, the end.
   - Keep the tone of the track. Comic reactions (Michael Scott's "NO", a streamer screaming) clash with an epic, emotional score; the user asked for reactions that "match with the theme/tone of the music and content".
   - Follow the data's mood: a happy climb and a happy peak (no crying on the peak), the drama only where the chart turns red. In the Stack Overflow Short that meant the music's own scene (the cornfield drone chase) on the climb, Leo's toast on the peak, and the tesseract ("Don't let me leave, Murph") on the red part.
   - One scene can carry the whole arc. Cooper's 23-years-of-messages scene goes from smiling to stunned to sobbing, which is the shape of a decline.
   - Show the list with each clip's link, length and size, and download only what the user approves, with sound if any clip's audio may be used. Then `media ingest` and `media use`.
3. **Cut each slot exactly** with ffmpeg, as `input/react/cut.py` in the Stack Overflow project does:
   - the moment, inside one shot (find the cuts with `select='gt(scene,0.18)'`), slowed to fill its slot if needed (0.65× still reads);
   - 30 fps, 16:9;
   - green screens keyed (`chromakey` + `despill`) onto the panel colour;
   - a film's letterbox and corner labels cropped away.

   Then `react.json` lists the slots and which looks use them.
4. **Where:** in the empty bottom zone, under the cards, with no text on the clips. The user didn't like the cards written over the clip ("the text overlap on the reactions is not looking good"); captions above, reactions below. The bottom zone sits under YouTube's title and channel overlay, so keep the faces in the box's upper half.
   - Make it move: a slow push-in through each clip, a soft vignette, a short flash on each change.
   - Keep the box in the bottom zone to the end. On the Stack Overflow Short it first rose over the chart for the ending, and the user said "i dont like how the bottom reaction component moved above… keep it on the bottom side only". For the climax, cut to the most iconic reaction (there, Cooper sobbing) on the last beat for a short moment instead.
5. **Sound, optional per clip** (the user: "sometimes we might want the audio of that reaction (with low volume) too"):
   - each slot is muted, or on at a level relative to "low under the music" (−28 dB mean, about 14 dB under master A's −14 LUFS);
   - `cut.py` builds the look's reaction stem and master A's `mix-<look>.wav`;
   - master B for that look carries the stem alone instead of silence, and the user sets the balance against the added sound in the app;
   - by default only the ending's clip is on, and only when it says something. Breathing and sobbing under the music read as noise (the user: "i hear some breathing audio at the last section, remove it"). When no clip is on, master B stays silent.
6. **Placements are looks** (`mm render --look=…`, `getInputProps().look`). Render them at half size and preview them on the real sound. The Stack Overflow Short has:
   - A: none;
   - B, C, D: first pass;
   - E: matched mix;
   - F: one scene.
7. **Not in the description's music credit:** list the clips in `sources.md` as third-party, with their links.

## 4. The music and the timing

**The cut follows the track:**
1. Find the track for master A as in `make-techyon-shorts` step 5 (library, then Pixabay without Content ID, then ElevenLabs `compose_music`).
2. Measure it with `music-grid.py`.
3. Set `sound.music.{file, from, grid}`. `timing.ts` then times every beat in bars, and the loop lands on the grid.
   - **The whole Short must be a whole number of bars,** not each beat. When the sound's hit isn't on a bar line, the beats can be fractional: on the Stack Overflow Short the first downbeat was at 1.97 s, so the cover is 0.79 bar and the last beat 1.21 bars (9 bars in all).
   - Effects marked on a beat land on its bar line (`mix.py`, fixed 11 Nov).

**Two masters** (the user's pick, 11 Nov 2026: "Both: free track + phone version"):
- **A: free track,** for the YouTube upload through Browse Hack.
  - `mix.py` sees `"voice": false`, so nothing is ducked: music plus sparse effects at −14 LUFS, seamless.
  - Then the usual render, `remux.sh`, preflight.
- **B: silent,** for a trending sound added in the phone app.
  - **Find the sound:** ask the user which trending sound they want, or offer 2–3 from research (in the tech and data niche, this week). The user may name one that isn't on the list ("what about the interstellar theme?"). Offer it as a **source Short** for "Use this sound": one with high views, at least as long as the cut, whose sound chip names a library track (not "Original sound"). The user turned down a 6 s source ("this sound is very short").
    - A fast way to find one: YouTube search with the Shorts filter, then each Short's length and its sound chip (the `MUSIC_NOTE_SYMBOL` button in `ytInitialData`). Give each candidate's URL, views and length.
  - **Time it to that Short's own audio,** downloaded with the user's yes as a private timing reference, never to the full track: what "Use this sound" plays is the source Short's clip (the user: "use the audio of the short we are gonna create this is from, i dont want any timing issues later"). Measure its tempo by onset autocorrelation and its hit by the steepest RMS rise.
  - **Tempo:** published tempos disagree (Cornfield Chase was listed at 96, 120 and 126, and librosa's beat tracker read 128), so measure the clip yourself. Then pick A's track at the same tempo (±3 %), or stretch it with ffmpeg `atempo` by up to about 12 % (the channel's 108.8 BPM fallback × 0.8823 matched 96.04 BPM), and say so in `sources.md`. One edit then fits both, and B is A's picture with no audio:
    ```bash
    ffmpeg -i out/<slug>/<slug>.mp4 -an -c:v copy out/<slug>/<slug>-silent.mp4
    ```
    If the tempos differ more, set `sound.music.grid` to the trending sound's bar, re-run `timing.ts` and `mm prepare`, and render B on its own.
  - **Length:** keep B at 60 s or under. On YouTube a longer Short with a claimed sound can be blocked.
  - **Hand it over:** only the YouTube mobile app can add a library sound; Studio on a computer can't. `UPLOAD.md` gets B's instructions:
    1. send B to the phone: AirDrop for an iPhone; for Android, Google Drive (upload on the Mac, then Download in the Drive app) or a USB cable with OpenMTP;
    2. in the YouTube app, open the source Short, tap its sound → **Use this sound** → the gallery → B;
    3. play it once and check the hit lands where it should (the Stack Overflow Short: the peak on the hit at about 0:09.5);
    4. paste the title and description from `post.md`, without A's music credit, and give it the slot time;
    5. AI disclosure on.
  - The same B also suits Reels (and TikTok outside India) with a trending sound.
- **Ask which master goes to YouTube before any upload.** When the user wants the trending sound, B is the YouTube master and A may not be needed at all (the user, 11 Nov: "im not uploading A, i need that cornfield audio only"). On the Stack Overflow Short, A was uploaded before that was settled and left a private draft to delete in Studio.
- **Never post A and B both on YouTube:** it's the same video twice. When A does go to YouTube, B goes to Reels.
- **Never build a commercial song into either file:** it gets a Content ID claim or a block. Trending sounds are only ever added inside the apps.

## 5. post.md

- **Title:** the reveal as a claim or a question, with no spoiler of the exact number ("AI's compute grew by how much since 2012?").
- **Description:**
  - a line on what the chart shows;
  - **"Data:"** each source with its URL and licence (CC BY requires this credit);
  - **"Notes:"** the unit, log scale if used, what was merged or dropped and why, and "animated between yearly points";
  - then the hook's sources and the hashtags.
- **A pinned comment** asking a question about the data is optional ("Which line surprised you?"). The question format has the rules for that.

## 6. Review and finals

As in `make-techyon-shorts`, for master A. The review cut is A (B's picture), because the licensed sound can't go
into a review file.

**Preview B on its sound:** before sign-off, the user will want to see B on the real sound ("can you create some
sample of what it would look like on that audio"). Put the review cut over the source clip with ffmpeg (no render),
once and looped twice, in `out/<slug>/preview-b/` with a do-not-upload note. Keep it out of the finals and the cloud,
and measure that the hit lands on its frame (the Stack Overflow Short: 9 ms early).

Check B too:
- its length and frame count equal A's (or its own timing, when re-timed);
- no audio stream (or only the reactions' stem, when a look uses one);
- its seam is clean.

**Looks:** `remux.sh` only takes the main file, so re-mux each look's render by hand with the same ffmpeg line, and
check looks on their renders (`scripts/stills.ts` has no `--look`).

The finals add `<slug>-silent.mp4`, plus `data/` (`provenance.md`, `series.json`, `recipe.json`, `raw/`) next to the
code in the cloud production.

**Delivering:** `media deliver` the silent master to the channel's folder in Downloads only after the user approves it.

## Common mistakes

| mistake | instead |
|---|---|
| Designing the chart before the data is checked | `clean.py --check`, the decisions and the spot checks come first |
| A CC BY-NC or Statista dataset | The primary source, or another open dataset (`references/data-sources.md`) |
| A gap drawn as a smooth line with no note | Say it on screen, or show the gap |
| A linear axis that doesn't start at zero | Zero, or LOG labelled |
| Interpolated values shown as data points | Labels show real points; the animation only moves between them |
| A trending song built into the file | Only ever added inside the app, on the silent master |
| A and B both on YouTube | One on YouTube, the other on Reels |
| Cards with 15 words | 7 words or fewer, 1.5 s or more each |
| Beats in seconds that drift off the music | Beats in bars (`"bars"`); the loop on the grid |

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add make-techyon-data-shorts "<Short> · <what they said> → <the rule>"   # a new lesson, dated for you
mm notes make-techyon-data-shorts                                                  # your notes for this skill
```

When the user wants them shared, `mm notes promote make-techyon-data-shorts` offers them to this log as a pull request.

- 2026-11-11 · format · "a data/no-narrator Short with trending music (research copyright; deep research and ML data acquisition/cleaning)"; picked "Both: free track + phone version" → this skill: data first (clean.py, provenance, spot checks), on-screen text only, the cut in music bars, master A with a copyright-safe track and silent master B for a trending sound added in the phone app, never both on YouTube.
- 2026-11-11 · Stack Overflow · "the animation is going soo fast that it is completing in half time" → the race fills the whole clip, its turns on the music's moments.
- 2026-11-11 · Stack Overflow · "stack overflow text size is smaller and it could confuse the audience" → the topic as a big title from frame 0.
- 2026-11-11 · Stack Overflow · "use the gifs like how the popular shorts does it… add this gifs/reactions in the skill to be done optionally, create multiple variations" and "by reactions i meant the reaction videos/gifs… of actual people which became meme" → Reactions (optional): real meme clips are the user's call, one per turn of the data, placements as looks.
- 2026-11-11 · Stack Overflow · "the text overlap on the reactions is not looking good… the short bottom part has alot of empty spaces… reactions should be below… make sure the meme reactions you choose match with the theme/tone of the music… look what reactions were used mostly on this audio… interstellar crying reaction at the end… audio of that reaction (with low volume)… mute or unmute" → Reactions: research the sound's memes, keep the music's tone, the bottom zone with no text on the clips, the last one rising at the end, optional per-clip sound.
- 2026-11-11 · Stack Overflow · "use the dont let him leave clip of intersteller at the end red part of the video, dont cry on the peek, keep the first growing part on the happier side" → reactions follow the data's mood: happy through the climb and the peak, the drama on the red part.
- 2026-11-11 · Stack Overflow · "i hear some breathing audio at the last section, remove it… i dont like how the bottom reaction component moved above in its ending transition, keep it on the bottom side only… add the crying clip too at the very very end for short time. dont remove the 'dont let me leave murph' clip" → the box stays at the bottom; the iconic crying clip gets the last beat; no breathing sounds.
- 2026-11-11 · Stack Overflow · "dont use the original audio, use the audio of the short… i dont want any timing issues later" → time B to the source Short's clip only.
- 2026-11-11 · Stack Overflow · "dont add any other sound effects" → effects off by default; the music alone.
- 2026-11-11 · Stack Overflow · "just the graph and its labels", then "add the explainations back" → cards stay; the user wanted fewer words for a moment, then wanted them back. Keep the cards short rather than dropping them.
- 2026-11-11 · Stack Overflow · "im not uploading A, i need that cornfield audio only… i dont have iphone, what is the easiest way?" → ask which master goes to YouTube before any upload; with a trending sound, B is the YouTube master; an Android hand-over (Drive or USB). Master B goes out from the phone on 16 Nov 20:30.
