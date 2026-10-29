---
name: make-lyrics-video-like-nakama
description: Variant of make-lyrics-video in the style of the Nakama! lyric video (projects/nakama, Anime Music Zone, finished 2026-10-27): the song as a captain's logbook lying on a sunlit desk among 3D props, full pages of faded log text that writes itself into room as animations leave, every lyric inked and highlighted inside the log or half a line to a page in choruses, three captioned pictures a spread (one colour clip, two traced ink sketches), the franchise word torn out into footage, manga sound effects lettered on the page at the chorus peaks, a multi-view line-art illusion for the intro and a Blender-rendered desk for the outro. Make a lyric video in Remotion from a song plus its timed transcription (lyrics.json), in apps/lyrics_videos — start with a short intake of the song's theme and the user's taste (fonts, colours, ideas), analyze the audio (stems, beat grid, CTC word alignment), prepare a manifest, pitch 5 ideas, gather assets and storyboard the chosen one, write scenes, preview in Studio, render on request. REQUIRES both a song/recording and a timed transcription; not for videos without audio-first lyrics (explainers, slideshows, promos), nor for the one-picture waveform channel format from mediamake timelines (make-waveform-lyric-video). Use only when the user names this variant or asks for the nakama style; otherwise make-lyrics-video.
metadata:
  variant-of: make-lyrics-video
  forked: 2026-10-27
---

# make-lyrics-video-like-nakama

> **Variant of `make-lyrics-video`** (forked 2026-10-27), modelled on **nakama**. Everything below is make-lyrics-video as it was that day, plus what this variant changes. Improvements to make-lyrics-video don't flow in by themselves: port the ones that fit.

## This variant

Built for a warm, triumphant anime sea shanty ("Nakama! – Straw Hat Pirates' Anthem", One Piece) over
13 review rounds; every rule below is something the user asked for, praised or rejected (the dated
quotes are in `projects/nakama/prefs.md`, 130 lines: read it first, then `handoff/SESSION-NOTES.md`).
The engine is reusable for any "the story told as a book" lyric video: copy `projects/nakama/video/`
(scenes, cues, tools) and keep the devices, swap the canon, footage, fonts and props. (Projects are
gitignored: the engine exists on the machine that made it.)

### The concept: a logbook, and how it is staged
- **One book, the whole song.** Intro: the book forms (see "Intro"); verses and pre-choruses: a spread
  per sung line, turned on its first word (`turn` 0.34 s; riffles of 6–12 leaves on drum fills and
  the break); chorus: a spread per line too (not one spread for the whole chorus); outro: the cover
  closes, a wax seal is pressed, the camera pulls back over the desk, then the channel's end screen.
- **The book lies on a desk** seen from above, not in a starry sky ("the background is even bad"):
  walnut planks under a lamp and a low warm sun, the cover's leather and the page block's edges round
  the pages, the camera standing back (0.88) so the desk shows. Charts and wanted posters may slide
  under the book; nothing tall ever sits on the pages.
- **Paper that looks real** ("the book looks ugly"): ivory with mottling, aged darker edges (no drawn
  border), a tea ring, foxing, faint ruling on the baseline grid, a faded red margin rule, the pages
  curving into the spine (`tools/paper2.py`). On a thumbnail, no spine crease ("remove the ridge").
- **The camera** breathes with the bar, pushes on keys, shakes on impacts; in choruses it kicks on
  every kick drum, harder each chorus (0.012 → 0.018 → 0.026). At the end the book lies still: no
  floating warp, sway or breathing once the cover closes (the warp makes fine line art shimmer).

### Every page is full
- **Faded log text on the ruled lines** of every page: canon facts in the crew's voice, justified,
  run-in heads, running heads and folios (`cues/logpool.ts`, `scenes/Log.tsx`). "No empty pages":
  the text fills every page to its foot (filler runs on from the pool), runs into narrow gaps (≥ 96 px),
  flows round each doodle's own shape and beside captions (a caption keeps only its own width).
- **Text writes itself into room an animation leaves** (a line that is gone, emblems leaving their
  ring): obstacles carry an `until`; freed stretches of line get new words inked in, word by word.
- Log ink: Schoolbell, opacity ≈ 0.36 (0.25 read as empty).

### The lyrics
- **Verses and pre-choruses: the lyric is a passage inside the log text** — there faintly before it
  is sung, then inked over by the nib and swept with a **coral highlighter** (#F09A7C at 0.55; teal
  was "bad colour") as each word is sung; it stays.
- **Choruses: only the line being sung**, its first half on the left page and the second on the right,
  hugging the gutter, gone when the line ends; a red-pen ring on its key word.
- **Lyric face: Qwigley, one size** (no size hierarchy: "same large size"), emphasis = bold only
  (the outlines stroked fatter). Qwigley's lowercase v reads as r under bold: draw v from its capital
  (`tools/glyphs.py` SUBST).
- **The franchise word leaves the page:** every "Nakama" tears the page into crew footage, the words
  slammed in the franchise's own lettering (here the user's One Piece font) on an ink brush band, with
  focus lines and a shake.
- All lettering is drawn from glyph outlines (glyphs.json) and **stroked in pixels** (`glyphAt`), never
  stroked in font units under `scale(k,-k)` (that blew "prevail" and the stamps into blobs).

### Pictures: three a spread, all captioned
- **Every spread = 1 colour picture + 2 black-and-white sketches** ("4 is too much"): the colour one is
  footage from the canon scene the line sings about, playing in a ruled panel (it may be a drawn-in
  picture too); the two sketches are canon frames traced as ink line art (`tools/sketch.py`: XDoG +
  stroke order; stretch the levels of dark frames, skip ones that trace badly).
- **Every picture has a short caption** in the franchise lettering, written in after it, in the
  diarist's voice ("captions feel good").
- **Cast from the canon**: research which moment each line alludes to (research.md) and cut that scene;
  the user signed off "the placement of scenes and shots aligns with the story". Keep every clip inside
  one shot (ffmpeg scene detection), or a caption names one crewmate while another's face shows.

### Animation: paper only, and doodles that act out the words
- **Only things drawn on the paper** ("only use paper overlay animations"): pencil and ink, boiling
  lines. Never rays, glows, dust, sparkles, confetti, gold, flashes, rope, vignette, hail rings.
- **Doodles that act out the line** were the user's favourite (c1.7, "take more such inspiration"):
  the crew's emblems pencilled into a turning ring that slides into a row with names on "for chosen
  kin / from first to last"; every raised hand ringed in ink on "hold fast"; the dreams as icons; "he
  cannot sail/cook/read" drawn and crossed out in red; the price tag ringed; the flag set alight; the
  voyage drawn stop by stop; NAKAMA's letters scattered, ringed and gathered at the end.
- **Chorus peak** ("more animations, more impactful"): a manga sound effect lettered onto the page on
  each line's key word (in the franchise lettering, black ink in a paper halo, landing whole — a
  letter-by-letter slam read as flicker), ink speed lines round it, ink blots from chorus 2, an echo on
  the other page in chorus 3. The franchise name goes on one page only (here ONE PIECE, its O drawn as
  the skull); the other page gets another famous line (PIRATE KING!, NAKAMA!).
- **Crew roll** on each "Heave-ho": the Jolly Roger drawn in the middle, wanted posters pinned by daggers
  in a volley along the bottom (never over the emblem), growing 5 → 9 → 10 across the choruses.
- **Chants ("hey")**: a page flips onto a crewmate's photo per hey, stamped HEY!

### Intro: a line-art illusion that becomes the book
- A **multi-view line-art sculpture** (`tools/illusion.py`, `scenes/Illusion.tsx`): the crew's portraits
  (Oda's own sketch, traced frames) and the franchise logo placed in 3D along their cameras' rays; the
  lines draw themselves in, the camera flies round and through them (wireframe blocks and a grid cage
  for parallax) and locks every two beats into a portrait, then the logo from above.
- A locking portrait is **traced over in its own colour with a glowing head like a Tron light cycle**,
  the glow exactly as thick as the line ("the lighting thickness and the white thickness should be
  same"); no white pen-light. Then a dive, every line flies onto the open book's lines, the exposure
  blows out to white and the book is there, open at its title page.

### Outro: real 3D, packed and sunlit
- **A Blender desk** ("render high quality 3D assets"): the crew's things at real scale from the shared
  library `apps/lyrics_videos/assets3d/onepiece` (props.py, made after real replica photos; "we will use
  these 3D models later") placed by `tools/blender_outro.py`; the closed log's cover and its wax seal are
  Blender renders too. "Make it packed": ~30 props round the book.
- **Not dull, not dark** ("too dull", "some items too dark"): a strong low sun, little fill, the renders
  graded (S-curve, saturation ×1.3, lifted shadows: `tools/grade3d.py`), then late sun through a window
  over the end shot: warm light, drifting light shafts, dust catching the light, a soft Orton glow of the
  scene for a hazy feel (`scenes/Sunlight.tsx`). No darkened corners.
- Then the channel's end screen, joined with ffmpeg (no re-render of the video).

### Delivered with it (the pack this video shipped with)
- Thumbnails from the video's own moments (the crew-roll page, the sealed log, a Blender hero shot of the
  hat on the log, the X-marked arm with HOLD FAST, the line-art locks); title on them STRAW HAT LOGS;
  the official franchise logo where asked; both channels' logos on opposite top corners (the solid-cut
  Anime Music Zone logo, the Get into Zone Frame in black or white to suit each picture).
- Title "Straw Hat Logs: Nakama! · One Piece Lyric Video", full lyrics in the description.


Lyric videos built on Remotion. Everything lives in `apps/lyrics_videos`.

**Taste comes from the user, not from defaults.** Each project keeps its own taste doc,
`projects/<slug>/prefs.md`: the intake answers' implications, style-specific rules and a dated log of
every piece of the user's feedback. Read it before the storyboard and before showing any render. When
the user already has a taste doc (an earlier project's `prefs.md`, e.g.
`projects/amz-inexorablemaster2/prefs.md` for anime motion-graphics edits), read it and seed the new
`prefs.md` from what applies.

**What goes where.** This skill holds only general lessons, true for any style (timing, readability,
tooling, render mechanics). Style-specific lessons (fonts that worked, devices the user loved or
rejected, picture rules for this look) go only into the project's `prefs.md`. After every review
round, add what you learned to the right place, so both get better with every iteration.
Read `apps/lyrics_videos/README.md` once for the layout, and `apps/lyrics_videos/analysis/README.md`
for the timing analysis, then follow the steps below **in order**.

## Requirements — check these first

This workflow only works when **both** exist:

1. **A song or recording** (`.mp3`, `.wav`, `.m4a`, ...). The video's length, beats and timing all come from it.
2. **A timed transcription** of that audio as `lyrics.json`: every line has start/end times in seconds
   (word timings optional). Plain lyrics text without timings is not enough.

If either is missing, stop and tell the user before doing anything else:
- No audio: this skill doesn't apply. Say so; a video that isn't driven by a song needs a different setup.
- No transcription: offer to transcribe the song first (mediamake has transcription APIs under
  `apps/mediamake/app/api/transcribe`: AssemblyAI, ElevenLabs, Gemini). Never invent or estimate
  timings. These cost money: ask before calling one.
  - Call it through the Mediamake MCP's `transcribe` (`provider: "elevenlabs-stt"` / `"assembly"`,
    `saveTo: …/input/lyrics.raw.json`): it returns word timings. The ElevenLabs MCP's own
    `speech_to_text` returns plain text only, which is useless for timing.
  - Transcribe the Demucs vocal stem, not the mix: `uv run --project analysis python
    analysis/pipeline.py <slug> --only separate` works before `lyrics.json` exists (~1 min); encode
    `analysis/stems/vocals.wav` to MP3 for the upload.
  - When the song comes as an existing lyric video, read the written lyrics off its frames: sample the
    text half at 4 fps, start a new card when most of the lit text pixels go dark, keep each card's
    last frame, crop the text band and tile the cards into sheets to read.

**After transcribing, re-cut the lines.** Transcribers split captions by time or length, not by meaning,
so lines break mid-phrase. Keep every word and its timing exactly, and only regroup words into lines:
- If the user has the written lyrics, use their line breaks and map the transcribed words onto them
  (fix misheard words to the written ones, keeping the timings).
- Otherwise cut where the sentence or clause ends (punctuation, a rhyme at the line end, a breath gap of
  ≳ 0.3 s), aiming for one line per bar or two. No line longer than it can be read (about 8–10 words),
  and no 1–2 word fragments unless they are a shouted hook ("Let's go").
- Save the raw transcription as `input/lyrics.raw.json` and the re-cut one as `input/lyrics.json`. Show
  the user the numbered line list and let them correct it before analysis. Offer the same clean-up when
  a supplied `lyrics.json` is cut mid-phrase. Re-check the cuts against the bar grid after step 2.

`prepare` enforces this and fails without both.
For Remotion technique (springs, captions, audio viz, fonts, transitions, three.js) consult the
`remotion-best-practices` skill and its `remotion-markup` / `remotion-captions` references.

Arguments: a project slug, or a path to a folder of inputs.

## 0. Intake — ask before building (every new project)

Before analysis or any design, collect the song's theme and the user's taste with the
`AskUserQuestion` tool (up to 4 questions per call, 2–4 options each, "Other" is always available;
put a recommended option first). Skip a question only when the brief, the folder or a taste skill
already answers it, and say what you assumed. Ask in two or three short rounds:

1. **The song:** what it is about, who the subject is (an artist, a character, a story, abstract), and
   the one feeling it should leave (hype, menace, heartbreak, nostalgia, romance, triumph, dread).
2. **Look:** style family (cinematic anime edit / clean kinetic typography / gritty film / neon
   synthwave / minimal editorial / hand-drawn), palette (a few named options derived from the theme,
   e.g. "black + crimson + bone"), and how bright the pictures may be.
3. **Type:** font personality (condensed bold caps / heavy grotesk / elegant serif / handwritten /
   mixed: one voice + one punch + one whisper) and how much text per line (whole line / hero word +
   small labels / one word at a time). Offer concrete Google fonts for each.
4. **Pictures and motion:** what they will supply (images, clips, references in `input/inspiration/`)
   vs. what you should source; energy curve (where the song should hit hardest: hook, chorus, a
   highlight line); any must-have set pieces or effects, and anything they hate.
5. **Delivery:** size and aspect (16:9 YouTube / 9:16 Shorts / 1:1), fps, credits or a channel name
   to show, and how they want to review (stills per shot, a preview of the hook first).

Write the answers into `projects/<slug>/brief.md` (theme, mood, palette as hex, fonts with roles,
devices wanted/banned, picture rules, energy map, delivery) and start `projects/<slug>/prefs.md` from
them (plus any earlier taste doc of this user). The ideas (step 4) and the storyboard (step 5) must
cite them.

## 1. Set up the project folder

- Slug: kebab-case, `[a-z0-9-]`, not starting with `_` (underscore folders are ignored by discovery).
- If the user gave an outside folder, copy its files into `apps/lyrics_videos/projects/<slug>/input/`:
  copies, never symlinks, so the project owns its sources and the user can move or delete the
  originals once it is done (`cp -c` clones a big video at no disk cost on the same disk).
  Never edit or delete files in `input/` after that — it is the user's source of truth.
- Inputs:
  - **required:** the song (`song.mp3`, `.wav`, `.m4a`, ...). With several formats, point `project.json`
    `audio` at the lossless one (wav/flac): it is what plays and what gets analyzed.
  - **required:** `lyrics.json`, the timed transcription. Any of: `[{ text, start, end }]` lines; mediamake caption format
    (`{ text, absoluteStart, absoluteEnd, words: [{ text, absoluteStart, absoluteEnd }] }`);
    or either wrapped as `{ lines: [...] }` / `{ captions: [...] }`. Times in seconds.
  - `project.json`: optional `{ title, artist, audio, sections: [{ label, from, to }] }`
  - `brief.md`: the intake answers from step 0 (mood, palette, fonts, references, energy map)
  - any images/videos: optional; they show up in `manifest.assets`

## 2. Analyze (do this for every real project)

```bash
npm run analyze -w lyrics_videos -- <slug> --plots
```

This is the method of [mexicat/pdoom-video](https://github.com/mexicat/pdoom-video) (see
`analysis/README.md`). It produces Demucs stems, a beat grid with downbeats (constant, or *tracked* when
the tempo wanders), 100 fps envelopes (mix bands + each stem), kick/snare/hat/vocal onsets, and
CTC-forced-aligned word timings cross-checked by two acoustic models, both stereo channels and Whisper.
The first run sets up `analysis/.venv` with uv and downloads ~4 GB of models (run it in the background).

Read what it prints, don't just run it:
- **Tempo:** the constant vs tracked fit per window, and the BPM. Sanity check: lines in rap/pop usually
  come one per bar (or two), so the median gap between line starts should be close to a bar.
  If the tempo is an octave or a 3:4 off, set `tempo_range` in `analysis/config.json` and re-run.
- **Downbeats:** the evidence table (kick-on-1, snare-on-2&4, bass, chord change, line starts). If the
  cues disagree, open `qa/audio_*.png` and set `downbeat_phase` if needed. Drum fills resolve onto
  beat 1 and chords change there, so trust those over the sung stresses: a melody can open every
  phrase on beat 3 (a two-beat pickup), and then the line-start cue points at the wrong phase.
- **Alignment:** lines marked `<-- check`. Zoom into them
  (`uv run --project analysis python analysis/zoom.py <slug> lines 5 46`) and look at the PNGs with the
  Read tool. Fix only what the spectrogram clearly shows, in `analysis/fixes.json`
  (`"5:0": {"start": 18.52}`, or `"46": "input"` for an echo/ad-lib the CTC can't place); spell odd
  tokens in `analysis/pron.json`. Re-run with `--only align`.
  The fricative rule starts a sung "h" word ("Heave") on the breath, up to 0.3 s before the voice,
  which lights the word early: find the voiced onset in `work/vocal_feats.npz` (`voiced` and
  `rms_db` > −15 dB) and pin the start ~0.06 s before it.

- **Ad-libs and echoes the lyrics don't list.** A word the vocal repeats as an effect (a rapped
  "choke… choke… choke" reverb tail, a backing-vocal echo) is not in `lyrics.json`, but the highlight
  should hit on it. Find the repeats on the vocal stem: print the RMS envelope (20 ms hops) for the
  window after the word and look for the dips and rises, then confirm candidates by MFCC similarity to
  the sung word (librosa onsets + correlation ≥ ~0.5). Store them as offsets from the sung word
  (`plus(word(...), dt)`), not as absolute seconds. Don't run a paid transcription API to check
  without asking.

Skip this step only for throwaway tests. Without it, prepare falls back to a rough onset estimate.

## 3. Prepare (deterministic, never hand-write the manifest)

```bash
npm run prepare-project -w lyrics_videos -- <slug>
```

This writes `projects/<slug>/manifest.json`: duration, beat grid + downbeats, envelopes, onsets, lyric
lines with (aligned) word timings, sections, assets, brief. With analysis present, section boundaries
are **snapped to the grid**: each section starts on the last downbeat at/before the first word of its
first line (the beat, if no downbeat is within 2 beats). The printout shows each moved boundary.
If the sections look wrong (e.g. a chorus labelled verse), fix them by adding `sections` to
`input/project.json` **after asking the user**, then re-run prepare. Re-run prepare whenever any input
or analysis output changes.

## 4. Idea selection — stop for the user's choice

Pitch **5 different ideas** for the video, grounded in the brief, `prefs.md`, the lyrics' meaning and
whatever is in `input/inspiration/`. Make them genuinely different concepts, not five palettes of one.
Each idea gets:
- a name and a one-sentence central concept (the thing the whole video is about visually);
- how the hook/chorus, the verses and the song's highlight would look (one signature device each);
- what assets it needs (artwork, clips, 3D, generated images, typography only) and where they would
  come from, and roughly how much work it is.

Write all five to `projects/<slug>/ideas.md` and present them in chat (`AskUserQuestion` holds only
4 options, so list the five in text and let the user pick by number, mix two, or ask for more).
Mark the chosen idea in `ideas.md` and **keep the others**: if the user later wants to try another
one, clone the whole project folder (`cp -R projects/<slug> projects/<slug>-v2`), set the clone's
`id` in `video/index.tsx` to the new folder name, and build that idea there.

## 5. Assets and storyboard — stop for approval

Gather the assets the chosen idea needs and write the storyboard, **in parallel or one after the
other depending on the idea**: when the idea lives on found pictures or footage, source a pool of
candidates first and storyboard from what exists; when it lives on typography or 3D, storyboard first
and then make only what the storyboard needs.

**Assets — take active guidance from the user.** Before sourcing, tell them what the idea needs and ask
whether they already have assets or ideas for them (they often have better ones); use theirs first.
Then source the rest:
- **Artwork / images:** search Pinterest and download in bulk with the Browse Hack extension
  (broad searches work best); Midjourney (Browse Hack, the `midjourney-outcrop` / `-restyle` /
  `-style-reference` skills) to outcrop portraits to the video's aspect or fill gaps, only as needed.
  Show the picks as a labelled contact sheet and let the user choose.
- **Video:** browse YouTube and download with Browse Hack, **only videos under 5 minutes** (check
  the length first; long videos bloat the project and the context). For anime, search Twixtor clips
  and anime edits of the character as well as scenes.
- **3D:** build models in Blender (the Blender connector: generate, import from libraries, or model)
  or another platform, only when the idea really needs a 3D set piece.
- **Don't** remove watermarks or segment subjects yet: do that while building the scene that uses the
  picture, because pictures get rejected along the way.
- Put sourced files under `input/<kind>/` (e.g. `input/pinterest/`, `input/clips/`, `input/outcrops/`)
  and keep `projects/<slug>/assets.md`: every asset with its ID, source, what it is for and its status
  (candidate / picked / rejected). The extension can disconnect mid-download and skip files silently:
  check every file exists. When several Chrome profiles are connected, ask which one to use by each
  profile's Google account email, never by its number (the user doesn't know the numbers).

**Research what each line refers to** when the song is about a story, a franchise or a person
(an anime crew, a film, a life): search for the moments, names and episodes the lyrics allude to,
check odd words in their rhyme ("vows / plows / rows" makes *rows* a quarrel, not rowing), and write
`projects/<slug>/research.md` (each line → the moment it refers to, with sources). Cast pictures from
that, not from what merely looks good; the user notices when a picture is generic.

**Storyboard.** Write `projects/<slug>/storyboard.md`: a table of section → time → layers (scene + props) → notes,
grounded in the brief, `prefs.md`, the chosen idea and the manifest's sections, naming the asset (its
ID in `assets.md`) for every shot. See `projects/sample-pulse/storyboard.md`.
Show it to the user and **wait for approval** before writing scene code. Iterating here is cheap.
If the user wants to judge a key part first (usually the hook/chorus), build only that part to a
previewable standard, show it in Studio together with the storyboard, and continue only once they like it.

Plan with the grid, not with seconds: big changes on downbeats, hits on kicks/snares, phrases of 2/4
bars, motion that eases *into* the next downbeat.

## 6. Build scenes

- `projects/<slug>/video/index.tsx` default-exports `defineProject({ id: '<slug>', fps, width, height, layers })`.
  `id` must equal the folder name. Use `layer({ scene, at, props })` so props are type-checked.
- `at` is a section label from the manifest, `'all'`, or `{ from, to }` in seconds. Prefer labels:
  timing then follows the music when prepare is re-run.
- Layers render in order; later ones draw on top and may overlap (e.g. background at `'all'`).
- **Lyrics span section boundaries.** Sections are cut on the beat before the next line's first word,
  so the previous line's last word can still be sounding after the cut. Put the lyric layer at `'all'`
  (or let each lyric scene finish the line that started before it).
- One scene per file in `video/scenes/`, typed `React.FC<SceneProps<MyProps>>`. Import the kit from
  `src/kit` (relative path). Use the kit instead of re-deriving timing:
  - `useSongTime()` — absolute seconds; `useSection()` — `progress`, `elapsed`, `remaining`
  - `useLyrics()` — current `line`, `wordIndex`, `isSinging`, `next`
  - `useBeat()` — `pulse` (1 on the beat, decaying), `bpm`; `useBar()` — bar `index`, `progress`,
    `beatInBar`, `downbeatPulse`
  - `useEnvelope('rms'|'low'|'mid'|'high'|'vocal'|'drums'|'bass'|'other')` — 0..1;
    `useHit('kick'|'snare'|'hat'|'vocal', decay)` — decaying pulse from the last onset; `useEnergy()`
  - pure helpers (`timing.ts`): `findLine(m, 'genjutsu choke', nth)`, `cutBefore(m, query)`,
    `beatAt/timeOfBeat`, `barAt/timeOfBar`, `beatBefore`, `nearestBeat`, `onsetsIn`, `envelopeAt`, `hitAt`.
    **Find lines by content, never hard-code times.**
  - `asset(path)` — resolves `manifest.assets[...]` / `manifest.audio.src` for `<Img>`, `<Video>`
- The kit plays the song; scenes must not add the main `<Audio>` again.
- Reuse `@microfox/remotion` atoms where they fit (waveforms, captions, effects) — see
  `scenes/ChorusWave.tsx`. Load fonts with `@remotion/google-fonts/<Font>` in a `video/fonts.ts`.
  `@remotion/three` (three.js / react-three-fiber) and `@remotion/transitions` are available.
- Everything must be deterministic per frame: no `Math.random()` (use `random(seed)` from remotion),
  no `Date.now()`, no CSS transitions/animations — drive everything from frame/time.
- Use `projects/sample-pulse/video/` as the reference implementation.
- **Mark what the user may want to adjust** with the kit's `editable(id, { label, props, fields })`,
  spread onto the element's root (`<div {...editable(...)}>`): every lyric lockup and its words,
  knockouts, traced words, titles and credits, and each shot's picture. The user then moves, scales,
  rotates, re-fonts and retypes them in mediamake's Remotion editor (step 11). Rules: a block or
  inline-block element (CSS transforms skip inline spans; an SVG `<g>` works with
  `transformBox: 'fill-box'`), not one that sets the CSS `translate`/`scale`/`rotate` properties itself;
  ids stable and content-based (`lockup:<line id>`, `shot:<section>:<i>`), never an index into a
  sorted list; `props` is the cue's path inside the layer's props (`lockups.3.rows.0.1`) and `fields`
  the cue keys worth changing (`text`, `font`, `size`, colours); elements that must move together
  share an id (a picture and its cutout). Whole layers are selectable without any marking.
- **Keep a shot list in `video/shots.json` as you build: every rendered video needs a map.** One
  entry per shot (each cut or picture change, montages count as one shot), in song seconds:
  `[{ "id": "h1.3", "from": 4.7, "to": 6.87, "label": "Reticle on W19 eye", "lyric": "Infallible calculate", "section": "hook-1" }]`.
  IDs are section + shot number (`h1.3` = hook 1 shot 3, `v1.12`, `c2.4`, `b.1`, `o.2`) and **never
  change once the user has seen them**; when a shot splits, use `v1.1a` / `v1.1b`. Update the file
  in the same edit that adds, moves or removes a shot. The user's review comments come back tagged
  with these IDs (see step 10). Without the file, the map falls back to one shot per lyric line,
  whose IDs won't match what is on screen.

Anchor every cue to lyric words or the grid (`word(query, nth, i, dt)`, `wordEnd`, `bar`, `beats`,
`plusBeats`, `plus`); repeated lines need the right `nth`. Never hard-code seconds.

Karaoke rules (from pdoom-video's treatment):
- Every line is **readable** and **synced per word**: a word appears or lights up exactly at its `start`
  and is complete by its `end`. Showing a line dim up to ~0.4 s early is fine; highlighting never runs
  ahead of the voice.
- **Clean hand-off between lines:** everything of a line is gone (≤ 0.08 s exit) the moment the next
  line's first word appears, and every word stays until it has been read: its sung length, up to
  0.6 s of a held note. Small captions (labels, ≤ 90 px) may lead their word by ~0.2 s, but never
  before the previous word has had 0.3 s on screen. Enforce this in one place (the project's lockup
  resolver) and clamp traced words / knockouts to the same hand-off, instead of fixing lines one by one.
- **Exits must not eat the read time.** A word traced over its sung length is only whole at the end of
  a long held note; trace it in ≲ 0.9 s and hold it. An animated exit (un-draw, shatter) that starts
  1 s before `until` makes the word disappear early: use a plain cut where the next line takes over.
- A transition between two shots starts only after the outgoing line's hero word has been read.
- Keep lyric text in the title-safe area (≥ 96 px from the edges at 1080p). Wide, heavy fonts run
  off the edge easily: check long words at the frame edges in the stills.
- Motion: strong eases (`Easing.out(Easing.exp)`, `Easing.inOut(Easing.cubic)`, springs), holds, then
  snaps. Avoid floaty, constant screensaver drift.

Media: measure every image (`sips -g pixelWidth -g pixelHeight` or ffprobe) before planning, and look
at the clips with **exact** seeks (`ffmpeg -ss <t> -i clip -frames:v 1`); `fps=`-filter contact sheets
mislabel times by up to one interval. Ask, or follow the brief, on whether portrait images may be
cropped to the frame. List what the video uses in `video/media.json` (crop focus per image, clips to
transcode) and run `npm run derive-media -w lyrics_videos -- <slug>`: it writes 16:9 crops and
short-GOP H.264 clips to `derived/` (AV1/4K sources included) plus `derived/index.json`, and warns about
upscales. Never upscale more than ~1.5× without treating the image as texture (blur, grain, duotone).
Check overlay clips frame by frame for watermarks or text before using them.

- **Clip timing:** a clip shot plays `from + (t − shotStart)·rate`, with up to 1.2 s pre-roll for
  transitions. Check that a clip doesn't run into its next scene cut inside the shot's window (slow
  the rate or move `from`). The derived proxy's cuts can sit a few tenths of a second off the source
  file's, so verify with stills of the build at the end of the shot, not only with ffmpeg on the source.
- **Effects locked to a picture feature** (an iris, a fingertip, a headband symbol) are placed in the
  *unmoved* picture's frame coordinates (the image cover-fitted to 1920×1080): crop and grid the
  source image to read them. A move is `translate(x%, y%) scale(s)` about the frame centre, so to
  keep picture point P at screen point Q while zooming, use T = (Q − C) − (P − C)·s for both ends of
  the move (it is linear in s, so the point stays put throughout). Then check the edges stay covered.
- Only now, for the pictures the approved storyboard actually uses: remove watermarks (a masked
  image edit, pasting back only the patch, keeping the original as `.orig`) and segment subjects.
- **Segmentation** (graphics behind the subject, mattes, a subject pushed off his picture): fal
  `fal-ai/birefnet/v2` on the same 16:9 file the shot uses ("General Use (Heavy)"; "Portrait" when it
  keeps background objects), operating resolution 2048. Clean the result to the main component, or
  the component under a chosen point (scipy `ndimage.label`), save it as `input/cutouts/<ID>-cut.png`,
  register `<ID>cut` in `media.json` (`format: 'png'`) and re-run derive-media so it is cropped exactly
  like its picture. Check every cutout on a green background before using it.
  Free local alternative (no API cost): `projects/nakama/tools/cutout.py <id> …` runs BiRefNet on
  the Apple GPU over `derived/img/<id>.jpg` and writes `derived/cut/<id>.png` + a green check.
  Busy, flat-coloured art (a full-frame slash) can come back as the whole frame: put that shot's
  effects over the picture instead.

Three.js scenes (`@remotion/three`) render through ANGLE (set in `remotion.config.ts` and the stills
script). Drive cameras and objects from song time only (no `useFrame`); a transparent canvas composites
over the DOM layers, and additive blending on it also adds alpha, which washes the frame.
Text inside a 3D scene (a word lying on the floor where a prop lands) works as a canvas-texture decal
drawn with the project fonts once `useFontsReady()` is true; floor text only reads from a high camera
(≳ 35° down), so pick the view for it.

A picture can be **drawn in** instead of cut in: ink line art (XDoG) sketched along its strokes, then
its colour washed in like watercolour (`projects/nakama/tools/sketch.py` writes the line art with a
stroke-order map and a wash-order map; `Drawing` in its `scenes/Props.tsx` reveals them with two SVG
colour-matrix filters on plain <Img>s). Anime screenshots give the cleanest lines.

When a page or frame should look **full of writing** (a logbook, a newspaper, a letter), typeset it
for real instead of painting texture: the text on the paper's ruled lines (one baseline grid for
everything), justified, flowing round every picture and prop, with running heads and folios; pages
that hold a lyric start mid-sentence (trim the text from the front so it ends a paragraph right above
the lyric). Keep that text light (≈ 25 % ink) and smaller than the lyric's small words, so the lyric
still wins at a glance; write more text than the pages hold, or pages run dry. `projects/nakama`
`video/scenes/Log.tsx` is a working typesetter (rules × free segments → slots, filled greedily).

CSS/SVG gotchas that cost a round each:
- `mix-blend-mode` only blends inside the nearest wrapper that has `opacity` < 1 (or a transform):
  an effect faded through a wrapper div stops multiplying with the page. Wrap only while fading.
- A `NaN` anywhere in a `transform` drops the whole transform (e.g. `prog(t, Infinity − d, Infinity)`):
  never pass `Infinity` times into easing maths.
- An absolutely positioned, shrink-to-fit element inside a narrow wrapper gets squeezed and its
  `translate(-50%)` shifts: give such wrappers explicit width.
- Graded cutouts: a grade's tint layer must also be applied inside the cutout (mask it with the
  cutout image), or the subject won't match its picture.
- `transform: scale()` on the element that has `overflow: hidden` scales its clip box too, so a
  "cropped" picture spills out of its frame: crop in an outer wrapper, scale an inner one.
- A one-weight font (Schoolbell) gets a true-looking bold from its own outlines: stroke the glyph
  paths (`paint-order: stroke`, ≈ 0.05 em) and add the same amount of tracking.
- A floating / drifting page: an SVG `feTurbulence` (very low frequency) → `feOffset` moved slowly
  with time → `feDisplacementMap` (scale ≈ 10) as a CSS `filter: url(#…)` on the page layer gives a
  smooth warp with no jumps (animating the noise seed or frequency jumps).
- SVG glyph paths drawn with `pathLength` and a stroke can paint a solid box over the word in Chrome
  (seen with large display lettering): stroke a traced glyph only while it is being traced and draw
  the finished letter as fill alone. Effects with `filter` + `mix-blend-mode` that straddle the spine
  paint black while a 3D page or cover turns over them: keep them on one page, or gone before the turn.
- A `mix-blend-mode: multiply` light over the book, inside a transformed parent, lightens whatever is
  outside the book (the parent isolates the blend): draw it only where the pages are.
- `require.context` over `projects/` makes webpack hash every file under it: a symlink there with an
  absolute target, or one whose file is gone (2026-10-30: eyesofpink's footage linked from ~/Downloads,
  then deleted), crashes the bundle ("Cannot read properties of undefined (reading 'length')" in
  webpack's FileSystemInfo), and the project that reads the file stays broken. Copy footage into
  `input/` (`cp -c`), never link it. `prepare-project` and `cleanup-out scan` list any link under
  `projects/` whose file is gone; never remove one yourself: ask the user to put the file back or let
  you remove the link.
- Casting a whole song from footage: keep one table of (id, source, from, to) for the colour clips and
  (id, source, time) for the frames to trace as sketches, then check the first, middle and last frame of
  every clip on one contact sheet before rendering (shots in clip packs often start a beat late;
  subtitles can sit at the top of a scene as well as the bottom). Dark, fire and storm frames trace
  faintly: stretch their levels first, or skip them.
- A shared SVG style object spread after an explicit prop overrides it (`fill={x} {...line}` with
  `fill: 'none'` in `line` loses every fill). Keep fills out of shared stroke styles; TS2783 flags it.
- An `<Img>` wider than its parent is capped at the parent's width (`max-width: 100%`), so a background
  bigger than the frame (a desk under a book the camera pulls back from) is squashed or cut off: set
  `maxWidth: 'none'`.
- No empty page: text that flows round on-page animations should know when each one is there. Give
  every obstacle an `until`, lay the text out once with all of them, then, for each time one goes, fill
  only the newly freed stretches of line with more text written in on the spot (word by word, line by
  line); reserve each effect's own shape, not a block round it, and a caption only its own width; let
  filler text run every page to its foot (users read gaps as "empty pages").
- Display lettering fonts can hide picture glyphs (the One Piece fonts draw capital O as the skull):
  check the glyph set before lettering words with them.
- A multi-view line-art illusion (a cloud of 3D lines that locks into a different drawing from each of
  several camera angles) works with no 3D engine: trace each drawing to polylines (skeletonize + simplify),
  place every point along its own camera's ray (`P = C + R·(x/f, −y/f, −1)·depth`, a random depth per
  stroke drifting a little along it), project per frame in JS to SVG paths. From exactly that camera, with
  the same focal length, the strokes land on the drawing; anywhere else they scatter. Opposite views
  mirror each other, so give every view its own axis; and fade the other drawings' lines while one is
  locked, or the drawing drowns in the rest (preview the views in Python first).
- Real 3D props without downloads: model them in Blender from Python (lathe profiles, swept tubes,
  procedural materials), each prop its own collection at real-world size, and render top-down with an
  orthographic camera in the scene's own pixel units so the render drops into the 2D layout. Put the
  scale into the mesh (`data.transform`), not the object, so procedural textures and modifiers work in
  metres; frame previews from mesh vertices (`bound_box` is stale until a depsgraph update); an area
  light of P watts lights a surface d metres away to about P / (π d²) (a few watts for a desk, not
  hundreds). Keep reusable props in a shared library (`assets3d/<theme>/`), not in the project.
- A sound-effect word that "slams" letter by letter at video frame rate reads as flicker; land it whole.
  Small SVGs (1×1 with overflowing content) under a filtered parent can drop out for a frame: draw
  overlays in full-frame SVGs.
- Thick strokes on font outlines drawn in font units under a tiny scale (`scale(k, -k)`, k ≈ 0.07) can
  blow up into blobs on some frames in Chrome (the halo stroke width is ~2000 font units): convert the
  outline to pixel coordinates first and stroke in pixels. Check a stamp frame by frame (render the
  frames as a clip and tile them), not with single stills.
- Clips cut from an edit or a twixtor pack: find the cut points with ffmpeg scene detection
  (`select='gt(scene,0.25)',showinfo`) and keep each clip inside one shot, or a face can arrive a beat
  late (the caption names one crewmate, the picture shows another).
- An SVG displacement filter that moves every frame (a floating-paper warp) makes fine vector line art
  shimmer, worst when the camera has pulled back: switch it off for shots meant to lie still. For a
  hazy, glowing end shot, an overlay with `backdrop-filter: blur(…) brightness(…)` at ~30 % opacity
  gives an Orton glow of the scene itself.

## 7. Verify yourself before showing the user

```bash
npm run type-check -w lyrics_videos
npm run stills -w lyrics_videos -- <slug>            # one frame per section mid-point
npm run stills -w lyrics_videos -- <slug> 12.5,40.2  # extra moments, in seconds
npm run stills -w lyrics_videos -- <slug> 12.5,40.2 --only   # only those moments
npm run render-project -w lyrics_videos -- <slug> --frames=2940-3360 --scale=0.5   # short clip → out/<slug>/clips/
```

`npm run stills` renders at half scale (960×540) and clears the stills folder on every run, so pass
every time you need in one call and halve frame coordinates when cropping. Put several stills in one
contact sheet (PIL) before reading them, to save context. Check its output for ✔ lines: while another
session renders, it can fail with "Timed out … setting up the headless browser" and leave the
previous run's stills in place; retry it. The same timeout also comes from a **full disk**: each
render bundle copies the whole `projects/` folder (≈ 15 GB) into the temp folder. Before retrying,
check `df -h /`; if space is short, look in the temp folder for `remotion-webpack-bundle-*` folders
your own failed runs left (match their creation times to your runs, and check `lsof` shows nothing
using them) and delete only those. `scripts/stills.ts` now removes its bundle on exit, even on failure.

Open the JPEGs in `apps/lyrics_videos/out/<slug>/stills/` with the Read tool and check: text fits the frame
and is readable, lyrics match what's sung at that time, nothing is blank or clipped, the brief's
palette is followed. For motion, extract a few frames of the clip with ffmpeg and check consecutive
frames. Fix and re-run until clean.

## 8. Preview

```bash
npm run studio -w lyrics_videos
```

Start it in the background and tell the user the composition id (= slug). Studio hot-reloads scene
edits; after re-running prepare, reload the page to refetch the manifest.

## 9. Render — only when the user asks

```bash
npm run render-project -w lyrics_videos -- <slug>        # → apps/lyrics_videos/out/<slug>/<slug>.mp4
```

Extra `remotion render` flags pass through (e.g. `--crf=18`, `--frames=0-299` for a test clip).
Full renders take minutes (≈ 20 min for 4 min at 1080p60): run them in the background and keep the
Mac awake. After the render, check the changed shots in the final file with exact ffmpeg seeks.

**Mind the disk with the Remotion CLI.** Every `npx remotion render` / `still` copies the whole
public dir (`projects/`, many GB) into a temp bundle (`$(getconf DARWIN_USER_TEMP_DIR)remotion-webpack-bundle-*`)
and can leave it behind; a few dozen single-frame stills fill the disk (2026-10-26: 130 GB, a render
died with ENOSPC). For scratch-entry renders and stills pass `--public-dir` with a slim folder of
hard links to just the project's manifest and the media it uses (no extra space), batch stills
through `npm run stills` (one bundle) instead of one CLI call per frame, and ask the user before
clearing stale bundles (other sessions may be rendering).

**Never lose an earlier cut.** The user keeps every render as a backup unless they ask for a
cleanup. `render-project` does it: before a full render replaces `out/<slug>/<slug>.mp4` it copies
the previous video, its map and its `.revisions/` folder into `out/<slug>/v<N>/` (skipped when an
identical copy is already kept), and a `--frames` clip goes to `out/<slug>/clips/`, never over the
main file. Don't delete or overwrite anything under `out/<slug>/` by hand either.

**A late fix to one section doesn't need a full render.** Find the last keyframe before the section
(`ffprobe -select_streams v -skip_frame nokey -show_entries frame=pts_time -read_intervals A%B`),
render from that frame to the end of the section with `npx remotion render src/index.ts <slug>
out/<slug>/seg.mp4 --frames=<k>-<end> --crf=18 --muted`, cut the old video's head with
`-frames:v <k>` (not `-t`, which overshoots by a frame or two), concat with `-c copy`, mux the old
file's audio back in, and confirm the frame count equals the full render's. Then write the map for
the spliced file (`npm run map`). For mediamake's render API / Lambda, the
composition takes `inputProps = { manifest }`; asset paths must first be rewritten to public URLs.

Every render also writes **`out/<slug>/<slug>.map.json`** beside the MP4 (the Revisions screen
needs it, see `revise-video`): fps, size, sections and
every shot from `video/shots.json` with its ID and time range in the video's own time (a
`--frames` clip is shifted to start at 0). Check the printed line says `from video/shots.json`.
After the final render, offer thumbnails: the `create-thumbnail` skill, with the strongest frames
of the render (exact seeks) or the project's key art as the picture and the hook line as words.

When an MP4 is renamed, moved, or made some other way (another output name, ffmpeg concat), write
its map yourself:

```bash
npm run map -w lyrics_videos -- <slug> --video=out/<slug>/v5/<slug>.mp4   # → v5/<slug>.map.json
```

A kept render's `.map.json` and `.revisions/` folder go with it into `out/<slug>/v<N>/`: they belong
to that cut. Copy, don't move: the review notes stay next to the main file too.

**A note on the style is not a new concept.** When the user rejects a preview but asks for a
different style ("make it anime", "darker", "more cinematic"), keep the approved idea and every
device in it (its world, its set pieces, its layout) and change only the treatment: the art, the
rendering, the effects. Re-pitching or rebuilding from scratch throws away what they liked. If it is
unclear whether they want a new concept or a new look, ask in one line before rebuilding.

## 10. Review revisions (after every render the user will watch)

Follow the **`revise-video`** skill: it gives the user the `/remotion-revision` link for the render,
reads their revision files in `out/<slug>/<slug>.revisions/`, and closes each comment. Fix every
comment the way this skill works; log style lessons in `prefs.md` and general ones in this skill
(see the top of this file).

## 11. Edits from the Remotion editor

The user can adjust a project by hand in mediamake's **Remotion editor**:
**https://mediamake.microfox.app/remotion-editor?project=<slug>** (Chrome, Edge, Arc or
Brave; the first time they pick `apps/lyrics_videos`, after that it reopens), or
`http://localhost:<port>/remotion-editor?project=<slug>` while mediamake runs `next dev`, which
reads the repo with no picking. Give them the link with the slug filled in. It compiles the project
in the browser from this folder, so code changes show up on their own (after replacing a picture,
they press Reload). What they change is saved to **`projects/<slug>/video/edits.json`**, and every
render (Studio, stills, render-project) applies it on top of the code:

```jsonc
{
  "schema": "lyrics_videos.edits/v1",
  "elements": { "lockup:line-11": { "x": 40, "y": -120, "scale": 1.1, "rotate": -3, "font": "Anton", "label": "HALF-WORN CLOAK", "at": 38.3 } },
  "props": { "type": { "lockups.12.rows.0.1.text": "CLOAK" } }   // layer key → props path → value
}
```

- `elements` are offsets from where the scene puts the element (px in its parent's space), keyed by
  edit id; `label` and `at` say what it showed and when, so a stale edit can be spotted.
- `props` are written into a layer's props before it renders; layer keys are layer names (or
  section labels, `#2` for repeats).
- When you change cues, check `edits.json`: a `props` path is an index into the cue list, so adding
  or removing cues can move it onto another cue. Fix or drop stale entries, and say so.
- On request, **bake** edits into the code (positions into `pos`/`dx`/`dy`, text and fonts into the
  cues) and remove what you baked from `edits.json`. Never hand-edit the file while the page has
  unsaved edits; when the page has none it picks up your change by itself.

## Promoting a scene into the mediamake editor

Scenes are project-specific by default. If one is worth reusing, move it to
`packages/remotion/src/components/`, make it depend only on its own props (no kit hooks or
manifest), and register it with `registerComponent` plus an input schema, like the existing atoms.
Do this only on request.
