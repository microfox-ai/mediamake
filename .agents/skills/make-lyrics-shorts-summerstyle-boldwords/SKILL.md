---
name: make-lyrics-shorts-summerstyle-boldwords
description: Make vertical lyric shorts (9:16 YouTube Shorts / Reels / TikTok) of the user's song in Remotion, in the stacked-type style of the "summer leaves quietly" reel — a short phrase a screen, its words filling the black frame top to bottom in huge ultra-bold lowercase, a word or two a row, every row stretched to the same column width (width-fit), the stack centred and filling the frame top to bottom with only a thin black band above and below (letters never stretched), sometimes one word turned vertical down a side, each word lighting up as it is sung, the footage playing inside the letters (a knockout / text mask) on the punch lines and the other lines set over the footage as lockups (one big highlight word, the small words nested beside its letters), a row in solid colour that opens onto the footage, and dives through a letter into the footage full frame on the music's big moments. It picks the best stretches of the song itself (sung, hook-heavy, clean sentence starts and ends, ideally ending on an instrumental hit), casts the user's footage (or footage from a reference video) line by line, cuts 9:16 clips framed on the subject and renders through the shorts path; reviewed through Revisions (revise-video). Use when the user says "make lyric shorts / reels of my song", "shorts with bold stacked words", "words width-fit with the video inside the letters", "text mask shorts", "shorts like this reference" (stacked-type), "/make-lyrics-shorts-summerstyle-boldwords", or asks to change a short under apps/lyrics_videos/projects/<slug>/shorts/ that imports src/lyricshorts. Not for shorts cut from a finished song edit (make-video-music-remix-shorts) or full-length lyric videos (make-lyrics-video, make-waveform-lyric-video). Append new user feedback to the log at the bottom.
---

# make-lyrics-shorts-summerstyle-boldwords

A 15–45 s vertical short of one stretch of a song: the lyrics *are* the picture. Built from the
reference `projects/eyesofpink/input/inspiration/summer-leaves.mp4` (a Pinterest reel, 20 s), whose
anatomy is the default look:

- **The stack.** Black frame. A short phrase a screen (3–6 words), a word or two a row, lowercase,
  an ultra-bold geometric face with tight tracking (Circular-like: Figtree 900). **Every row is sized
  so its ink spans the same column** (`tell` / `me` / `why`): short words get huge, so the stack is a
  justified block. **It fills the frame top to bottom, centred** (the user's rules, v4 and v6): the
  words are grouped so the rows, ink to ink with tight gaps (≈ 1 % of the width) and margins ≈ 4 %,
  stand about as tall as the frame; what is left is a thin black band above and below (fine), never
  black in the lower half. **The letters keep the font's own proportions** — stretching them to fill
  was rejected ("the fonts appear stretched, don't do that"). One word may be **turned vertical**
  down a side beside a block of rows (`eyes` up the left beside `of / pink / a soul / of`, `bite`
  beside its last two rows).
- **The lockup** (2026-10-28). Most lines don't use the mask: the footage plays full frame and the
  line sits on it — one highlight word big and centred, the small words nested beside its letters (above
  the x-height next to the letters that rise, below the baseline next to the ones that drop), white with a
  soft shadow. The mask is kept for a few punch lines a short.
- **A loop.** The short ends on a bar line at the end of a 4-bar unit and its last beat starts the
  take the short opens on, so it runs straight back into its beginning.
- **Words as sung.** All rows have their place from the start; each word lights up when it is sung,
  at ~40 % and brightening over half a second. Nothing slides or bounces: it is neat.
- **Footage in the letters.** The footage plays only inside the letters (the rest stays black) and
  cuts on the beat *inside* them. A row can come in as **solid colour** and then open onto the
  footage (`to end` / `oh` in red → the sunset). Rows too thin to see through stay solid.
- **The dive.** On the big moment the stack scales up around one letter until its stroke fills the
  frame and only the footage is left — then the footage plays full frame (warm film look, light
  leaks) with no type. A new sentence starts on a fresh black frame (a hard cut). `into` runs the
  dive backwards: full-frame footage pulls back out of a letter into a new stack.

Everything lives in `apps/lyrics_videos`. Engine (committed): `src/lyricshorts/` — `spec.ts` (the cut
list language and the resolver, Node-safe), `layout.ts` (the type set from the font's own outlines with
opentype.js; `solveStack` tries every way to break a phrase into rows, with or without a vertical
word, and keeps the one that fills the frame best with the biggest letters, then centres it; one SVG
path per word; the dive point = centre of the row's thickest stroke), `LyricShort.tsx` (the scene: footage → tint → leaks → grain → the mask
multiplied over it; solid letters on top), `define.ts` (`defineLyricShort`); the script
`scripts/lyric-shorts.ts` (`npm run lyric-shorts`: pick, new, font, clips). Shorts are discovered and
rendered through the shared shorts path (`Root.tsx`, `render-project --short`, `stills --short`) that
make-video-music-remix-shorts set up — keep using it, don't fork it.

Worked example: `projects/eyesofpink` ("Eyes of Pink", a Nezuko song, ~136 BPM) × a Nezuko twixtor
edit; short `s01` = the final chorus into the outro hit.

**Taste comes from the user.** Keep `projects/<slug>/prefs.md` (intake answers, the look, a dated log
of every note, numbered as the user wrote it). Read the lessons log at the bottom before planning.

## Principles (v4 after the user's notes on the JJK twelve, 2026-10-28 — they will keep refining them)

0. **Two kinds of screens: a few masks, the rest lockups.** "When there are so many lines and the lines are
   going fast, visually it is hard to concentrate on both text and the visual" — so only the punch lines
   take the mask (the opener, a repeated word, the dives: 2–4 a short), and every other line is a `cap`
   lockup over the full-frame footage (see "Lockups over the footage" below). A mask screen that would
   fill under ~75 % of the height leaves black bands — "must be avoided as much as possible" — so it
   becomes a lockup (or starts as words over the footage). Pick each lockup's highlight by hand when the
   automatic one lands on a filler (`yeah`, `get`, `just`, `lost` → `cage`, `rampage`, `blue`, `edge`):
   the word that carries the line.

1. **One short phrase a screen, sung within ~1–2 s.** Every row has its place from the screen's
   start and stays black until its word is sung, so a long screen *is* a black screen: v7's couplets
   (6–10 words, last word 3–5 s in) drew "I am seeing black screen for a lot of time, cut the sentences
   shorter". A screen is one clause (`eyes of pink`, `a crimson flame`, `i do not bite`); `clips`
   prints "all words in by +N s" and warns past 2.2 s. A held vocal with no words (`ooh`) plays the
   footage full frame (`full(beat)`) instead of waiting as type. Write `stack('<phrase>')` and let the
   layout break it (one word a row preferred; `i` kept with its word — a lone `i` becomes a pillar; a
   giant `a` is a fine shape). The stack is centred; without stretching, a short clause can't always
   reach full height (`i do / not / break` fills 69 %, `i stand / my / ground` 60 %): the bands are the
   price of short screens, and the user takes them over long black waits. Never stretched letters
   (v5, rejected); never a stack in the top half with black below (v3, rejected).
2. **Large letters, so the footage shows.** Short words a row make huge rows (`of`, `it`, `my` go
   giant — good, put a face behind them). The layout charges for rows set small (`minSize`) and for a
   giant *last* row (the frame sits half empty until it is sung). Long rows that still come out
   small go solid (`minMask`) — masked type only on big, ultra-bold rows (the user's knockout rule).
3. **Rows by default; turn words only on short, fast lines.** Turned type is hard to read ("too many
   vertical wording shots … can't read it", on s02/s03 v1), so a screen turns words only when its line
   is sung in about a second (a word or two, `tucked away`, `sleeping`) or for the giant `i` pillar —
   at most two such screens a short, hand-set ones included (the theme's `columns.max`). Everything
   else is rows, even at 50–65 % fill. Where a word turns, it says something: the first word up the
   left (it lights first: `eyes`), a word lying down (`sleeping`), or the last word down the right
   beside its last row or two (`bite`, `space`, `fall`). Turned three-letter words (`ooh`) read as rings.
3. **The footage says the row.** Cast like a song edit, literally: the eyes inside `eyes`, the flame
   inside `flame`, the bamboo muzzle inside `bite` / `keep it shut`, falling inside `fall`, sunlight
   inside `the light`. Put the subject's *face or eyes behind the biggest row* — details read through
   the mask; a dark corner of the frame turns the letters black.
3b. **Every cut framed on its subject, through the whole shot — "placing the clip correctly is important".** The user (s02/s03
   v2): "you are not putting the right clips, or you are not cropping them correctly, so it fits
   correctly". Mark each shot's face box and eye line in `footage/faces.json`; `framing.ts` crops every
   cut without a hand crop on it: the eye line on the upper third, the face centred and a third of the
   frame tall where the footage shows whole (full screens, black words), the eyes on the biggest lit row
   and the face a little taller than it under the mask; an iris opens on the framed eyes. **Cast shots
   whose subject fits a 9:16 crop** (about a third of a 16:9 frame's width): a face close-up wider than
   that shows a cheek; a profile at the very top of the frame loses its eyes. Where the subject is not
   her face (the flames, a night sky, a body lying down, "small" in the frame), give the cut its own
   `face`. Check `cuts.jpg` every time: it is the crop the render uses.
3c. **Long lines: black words over the footage first, then the mask.** The user: "when there are too
   many words, you can show it in reverse like text is black … when the line is reaching midpoint, since
   most of the screen becomes filled, you can transit to mask style again". Theme `type.reverse`
   (`minWords` 4, `lit` 0.5): such a screen starts with the whole footage showing and each word landing
   in black, and flips to the mask (a soft flash) as the word lands that lights half the stack's ink —
   if that leaves at least `minHold` s of black words; a screen opening on a giant first word stays
   masked. `stack(…, { reverse: true | false | { flip: beat } })` overrides it; `true` also suits a line
   of long words that fills under half the frame (the bands become footage until the flip). **Black on
   bright footage, white on dark** (the user: "sometimes white text is also fine, depends on what is
   visible on the video"): `clips` measures every clip's brightness in 16 bands down the frame
   (`shorts/<id>/luma.json`, imported by index.tsx), and each reversed screen takes the ink of the bands
   behind the rows it shows as words (`inkOf`; under `reverse.white`, 100, white). A whole-frame mean
   misleads: a bright window behind one row, dark hair behind another. `clips` prints each screen's ink
   and its bands; `reverse: { ink: 'white' }` sets it by hand.
4. **Bright footage in the letters.** Dark shots make dim letters (the `floor` tint helps a little).
   s02 v3 (rejected next to s01 and s03: "s02 not good, learn from s01 and s03") put dark blue demon and
   night shots behind most of its words; s03 (liked) has a bright, warm face behind every line. Even a
   fierce line takes a bright fierce shot (fire, a white glare, blood on a pale face).
   Prefer lit faces, fire, sky, colour; save dark, moody shots for full-frame moments.
5. **Dive where the music opens.** A dive (`exit: 'through'`) into full-frame footage belongs on an
   instrumental hit, a held note or the end; 1–3 per short. A drum fill or a pickup before the first
   word can open full frame and pull back `into` the first stack. Nothing else moves the type.
6. **Cut on the beat, with an anime editor's transitions — and move like one camera.** Every cut gets
   twixtor on the beat (`ramp` bursts and `bump` punches on 60 fps footage, a slow `push` on art and 30 fps
   shots) and runs of one camera move made of the crop (`pan` / `tilt`): the same way across a phrase or
   two, tilting up on rising lines and down on falling ones, the subject's eyes on the same spot at each cut
   — it reads as one continuous move (the user: "left pan into left pan, the subject aligned — a good match
   cut"). Nothing moves on the loop seam. 2–4 beats a cut while a stack is up; a new
   shot on each row's key word. Every cut gets a move chosen by the music and the line, like an anime
   shorts editor in CapCut (v9, the user asked for it): `velocity` (the signature — races into the cut,
   eases out of it, with motion trails) and the warp `zoom` on the drum hits, `slash` (a katana wipe
   with a blade of light) on the fierce lines, `whip` along a movement (`down` for falling), `dissolve`
   on the gentle lines, `iris` opening on a face, `flash` (the theme's colour or the line's: crimson,
   fire) and `shake` on the hardest hits, a 2.5 % `pulse` on every kick. A cut where the screen changes
   moves the whole frame — the old words leave with their shot (a slash cuts through the type) — so
   the transition reads even when the new screen has lit only its first word. Nothing on the loop seam.
   Not what this user has rejected elsewhere: RGB glitch, liquid warps, negatives. Twixtor /
   slow-motion shots are 1–3 s; velocity ramps eat extra source: check the lengths (`clips` warns).
7. **Big short words first.** One- and two-letter words set huge look good (`a`, `of`, `it`, `my`) —
   at the *start* of a screen they light up first and fill the frame at once; at the end they leave it
   half black until sung. The layout weighs dark time (each row's share of the frame × how long it
   waits, `darkWeight`), so it puts big rows early; when splitting the lyrics into screens, start a
   screen on a short word where the line allows. **A lone `i` can't run the width** (it would stand
   twice the frame's height), so when "I" should be the biggest word (the user, on `i hold the line`
   and `i stand my ground`) it stands as a **pillar**, and the rest of the line runs down beside it as
   one turned line, tight: `stack('i hold the line', [{ text: 'i', vertical: 'upright' }, { text: 'hold
   the line', vertical: 'down' }])` — every row set down the frame is the *columns* layout: side by
   side, all as tall as each other (here the full height), centred. **Never spread words apart to fill
   a height**: gaps between words "look bad" (v10's rows spread beside the pillar); turn them instead.
   The layout may set a screen as columns by itself, but only within the short's budget
   (`solveShort`): lines of ≤ 3 words sung within `columns.maxSpan` (1.2 s) whose rows fill under
   `columns.belowFill`, best gain first — `ignite | the flame` was columns in s02 v1 and is rows now.
   **A run of turned columns goes right to left** (vertical Japanese: read with the head tilted, the
   rightmost line comes first) — left to right read "ignite | the flame" as "the flame ignite".
   Tied to the height of the rows beside it, a thin letter read as a dot and a stroke.
8. **No wordless stretch inside a short.** An instrumental gap of more than about two bars between
   lines kills it (s02 v1–v3 had 13 beats after its first line): move the window past it (the drums a
   breath before the next line). Full-frame footage belongs to a lead-in of a beat or two, held notes
   and the end.
8b. **Start on the hook, end on a full 4-bar unit, and loop.** Open on a strong anime shot, not fan art (the
   user swapped one out: "I just don't like the first artwork"). The first second already shows a
   striking shot or the first word. The end lands on a bar line at the end of a 4-bar unit of its
   section — a short that stops a bar into the outro "stops mid rhythm" (the picker now charges for
   it). Make it loop (`new --loop`: no fade in, a 20 ms fade out): start on a downbeat, end on one,
   and give the last beat the same take as the first cut — the last cut plays the take's first
   moments, the first cut carries on from there (`in`, with `rate` a little under 1 if the take is
   short) — so the end runs straight back into the start. Nothing on screen at the seam (full-frame
   footage both sides); the engine fades the light leaks out of the seam.
   **When the song lands each line's last word on the downbeat** (most Suno songs: "bite" on beat 1,
   the next line's pickup right after), a downbeat seam cuts that word. Put the seam at the *same place
   in the bar* at both ends instead — just before a pickup (`250 → 314`: both on beat 4), or between a
   held word and the next line (`220.85 → 284.85`) — and keep the length a multiple of 4 beats (16 for a
   phrase), so the loop stays on the grid. `scripts/span.py <slug> <b0> <b1>` prints every word with its
   start–end beats and a `|` at each downbeat; `scripts/setwin.py <slug> <id> <b0> <b1>` sets the window
   (short.json, history.json) from beats. A long first word (`affidavit`, `ninety-nine`, `confiscate`)
   sits small over black until the rest is sung: start that screen as words over the footage (`reverse:
   true`) rather than pulling back `into` it; one held word alone (`zero`, `judge`, `why`, `welcome`)
   reads best as black words over the whole shot (`['word'], { reverse: { flip: <next screen> } }`).
9. **Never lose a render.** Renders are kept in `v<N>/` by `render-project`; keep earlier cut lists in
   `shorts/<id>/archive/edl.v<N>.ts.txt`.

## What it needs

1. **The song** (wav preferred) and **timed words**. Look in mediamake first:
   `mcp__Mediamake__list_transcriptions` (search the song's name) → `get_transcription` with
   `includeWords` and `saveTo: projects/<slug>/input/lyrics.json` (free). Otherwise offer to transcribe
   (ElevenLabs speech-to-text with word timestamps, as in make-waveform-lyric-video step 1 — paid: ask).
   Check the transcription was made from the same mix (same length). **A published song (a YouTube
   link, a playlist)**: download its audio (`uvx yt-dlp --js-runtimes node -x --audio-format wav`) and
   transcribe *that* with ElevenLabs (the user, 2026-10-27: "use elevenlabs for transcribing") — the
   library's transcription is usually of the Suno take, offset or edited against the upload (Yuta's was
   18.75 s early, Higuruma's 29.1 s), and Suno's CDN links are signed now. Then respell the ElevenLabs
   words from the library's text where the two disagree word for word (`difflib` on the word lists: the
   library lines are the user's corrected ones — "wilts", not "wills").
2. **Footage**: the user's videos (or shots from a reference video they name), one or more sources.
   With none given, gather it yourself: **twixtor packs from YouTube** (`ytsearch12:"<character> twixtor
   clips 4k"`; Wyunye's "Twixtor Clips For Edit 4K60FPS" packs are clean, no watermark; "Manga Animation"
   packs add a second look but often carry burned-in captions and a disclaimer card) and **Pinterest
   wallpapers / manga panels** (`uvx gallery-dl --range 1-30 --filter "extension in ('jpg','jpeg','png',
   'webp')" "https://www.pinterest.com/search/pins/?q=<character> wallpaper"`, no login needed), turned
   into an art reel: `scripts/artvideo.py` (each picked picture 4 s, contained over a blurred cover of
   itself, a slow push-in, hard cuts, 2560×1440) — then segregated like any footage.
3. **A style reference** (optional): a reel whose look they want; this skill's default is the one above.

## Workflow

### 0. Intake (short)

The user's shorts rules (set for make-video-music-remix-shorts, 2026-10-26; they hold here too):
**the aspect ratio is always the user's choice — ask every run, never assume** (9:16, 3:4, 4:5: the
latter crop the 9:16 clips); every run checks **three different stretches** with the user before
building and ends with the shorts they picked (three by default); a re-cut of a stretch is fine unless
they called it bad; **never AI-upscale** footage unless asked (a tighter crop's lanczos scale is fine).

Ask with `AskUserQuestion` only what else is open: length (15–45 s), the channel (a sign-off or not; a
brand watermark or not, and which brand — see "A brand's watermark" below),
palette and fps (30; 60 for smooth slow-motion footage doubles render time). Write `brief.md`, seed
`prefs.md`. The first run of this skill (eyesofpink) assumed 9:16 and built one stretch to settle the
style — don't take that as the pattern.

### 1. Project, song, words

`projects/<slug>/input/`: the song, `lyrics.json`, `project.json`, `footage/` (symlinks to big videos are
fine), `inspiration/`. Then make-lyrics-video steps 2–3: `npm run analyze -w lyrics_videos -- <slug>
--plots` (stems, beat grid, CTC word alignment; ~1 min with models cached) and `prepare-project`.
**Set real sections**: print each bar's drums / bass / other / vocal envelope with its lyric (see the
eyesofpink session) and write intro / verse / pre-chorus / chorus / break / bridge / build / outro to
`input/project.json` — derived sections only say "verse-n" and the picker can't find the chorus.

### 2. Map the footage

`uv run --script .claude/skills/analyze-video/scripts/segregate.py "<video>" --out
projects/<slug>/footage --min-shot 0.1` (a 4K60 AV1 3.6-min edit: ~3.5 min). Read `sheets/shots_*.jpg`;
note title cards, burned-in credits, black gaps and **repeated passes** (fan edits often show every
shot twice, graded then "raw": use one of each pair). Further sources: their own folder and a prefix in
`shorts/footage.json`.

Then **mark every shot's subject** in `footage/faces.json` (`{ aspect, shots: { sh0002: [x0, y0, x1,
y1, eyes] } }`, fractions of the source frame: the face box and the y of the eye line; the flame or the
figure where there is no face; leave out title cards and black shots). Draw each shot's middle keyframe
(`footage/frames/`) on a sheet with a 10 × 10 grid and read the boxes off it; the raw pass of a shot gets
its twin's box. A shot that moves or hides a second shot (Nezuko's sh0045: a fight, then her close-up
from 3.4 s) needs the cut's `in` or its own `face`. The short's index.tsx passes the file:
`defineLyricShort({ …, faces })`.

**Several sources** (2026-10-27, the JJK playlist: 3–5 a song): segregate each into
`footage/<name>/` and list them in `shorts/footage.json` (`{ sources: [{ id, prefix, source,
segregation }] }`, a two-letter prefix each: `ya0012` is shot sh0012 of the first). Mark faces per source
in two passes: `scripts/faces.py <footage/name> lbpcascade_animeface.xml` (OpenCV's anime face cascade,
nagadomi/lbpcascade_animeface; `uv run --no-project --python 3.12 --with opencv-python-headless==4.10.0.84
--with numpy`) writes `faces.auto.json` and a `faces_sheet.jpg` of every shot with its box — right on most
anime close-ups, blind to manga, art and profiles; then put boxes by eye for the shots you cast in
`footage/faces.manual.json` (prefixed ids) and run `scripts/mergefaces.py <project>`: it writes each
source's `faces.json` (read by `clips`) and the project's merged `footage/faces.json` (imported by
index.tsx). The faces sheets double as the casting sheets.

### 3. Pick stretches — check with the user

```bash
npm run lyric-shorts -w lyrics_videos -- <slug> pick [--n=3] [--min=15] [--max=45]
```

Scores sentence-aligned stretches (sung share, hook words that come back elsewhere, vocal and drive,
clean start and end, a bonus for ending on an instrumental hit to dive into) and skips ones the user
called bad in `shorts/history.json` (shared with make-video-music-remix-shorts); a stretch that sings
the same words as a short already made (a chorus that comes back) counts as a re-cut. When the picks
come out messy (mid-sentence, too long), choose by the song's structure instead — a whole section or
two on 4-bar units — and scaffold with `new <from>-<to> --loop`. Writes
`shorts/lyric-picks.json` and `out/<slug>/shorts/lyric-picks-<run>/` (A.mp3…, picks.png). Show the
picks (first and last words, length, why) and the png; ask which to make unless the user said to just
go. The generic `npm run shorts … pick` scores drive only and favours instrumental drops — not for
lyric shorts.

### 4. Scaffold and cast — `shorts/<id>/edl.ts`

```bash
npm run lyric-shorts -w lyrics_videos -- <slug> new A            # or a from-to in seconds; --lead=1 adds a bar before
```

Writes `short.json` (window, formats, fps), `edl.ts` (the stretch's words as `word@beat` in its header)
and `index.tsx`. The project's look is `shorts/theme.ts` (shared by its shorts; copy eyesofpink's). The
type is drawn from the font file, so fetch it once per project (any Google font; Google hands curl a TTF):

```bash
npm run lyric-shorts -w lyrics_videos -- <slug> font Figtree --weight=900   # → shorts/fonts/Figtree-900.ttf
```

Make a casting sheet of candidate shots with an x-ruler (`drawgrid=w=48` over 480-px keyframes) and read
each subject's centre off it. Then write screens and cuts, each cut with *why* as a comment (see the
reference below).

### A brand's watermark

```bash
npm run lyric-shorts -w lyrics_videos -- <slug> brand <brand> [--label="Music by"] [--at=top-right] [--width=0.2] [--logo=logo/<file>]
```

Puts a brand's watermark on every short of the project (user, 2026-10-28: "put a watermark at top right,
Music by + the Get into Zone logo … this skill should also accept a brand if it wants a watermark on the
shorts"). It reads the brand's kit profile (`brands/<brand>/thumbnail.json`, from pack-brand-kit), copies its
**compact mark** (the logo a thumbnail job takes as `mark.png` — for Get into Zone the Frame, never the wide
Strip: "don't use strip logo, use the frame logo") and its small-label face into `shorts/brand/`, and sets
`theme.watermark` (`logo`, `label`, `labelFont`, `at`, `width`, `color`). The render draws it still over every
frame — no shake, no transition, through the loop seam — the label in capitals with wide tracking above the
mark, flush with the corner, a soft shadow. The slim render folder must carry `shorts/brand/` too.

### 5. Clips and checks

Tools for the checks (all in `scripts/`, run from `apps/lyrics_videos`): `screens.mjs <slug> <id>` (each
screen's kind, words, fill and beats), `framed.mjs <slug> <id>` (each cut's clip and its start / middle / end
clip times — tile those frames to see the subject through the whole shot), `motion.py <video> <footage dir>`
(each shot's camera motion → motion.json) and `continuity.py` (cuts moving against the one before).
`rollout.py <project> <id> <screens.json>` upgrades an older cut list to this approach (masks only on punch
lines, lockups, beat effects, camera runs) — then check its highlights and framing by eye.

```bash
npm run lyric-shorts -w lyrics_videos -- <slug> clips s01
```

Prints the timeline (every screen with its rows and each word's beat; every cut), cuts the missing
9:16 clips into `derived/lyricshorts/` (cropped at `x`, scaled to 1080×1920, at the short's fps; a
changed cut gets a new file), writes `shorts/<id>/shots.json` (the Revisions map) and
`out/<slug>/shorts/<id>/cuts.jpg` (each cut's middle frame as framed). Fix the warnings (shots run out,
same frames twice, words after their screen ends) and any framing that misses the face. Then stills of
the moments that matter, tiled into one sheet:

```bash
npm run stills -w lyrics_videos -- <slug> 0.4,1.1,4.1,… --only --short=<id>    # seconds of the short
```

Look for: every row's footage readable (not black), the face behind the big row, the solid row
opening on time, dives landing on full footage (no black edge in the last dive frame), every screen
filling the frame top to bottom once its words are in (the user wants it so, even under Shorts' caption
and buttons), and no screen sitting half empty for long while a giant last word waits to be sung.

### 6. Render and review

```bash
npm run render-project -w lyrics_videos -- <slug> --short=<id> --crf=18
```

→ `out/<slug>/shorts/<id>/<slug>-<id>-9x16.mp4` + `.map.json` (~2–3 min for 30 s). **Many shorts at
once: one slim bundle.** `render-project` bundles every time and copies all of `projects/` (21 GB by
2026-10-27) into `$TMPDIR` — twelve renders can't fit. Instead hard-link only what the shorts load
(`manifest.json`, the song, `derived/lyricshorts/*.mp4`, `shorts/fonts/`) into a slim folder, bundle once
(`npx remotion bundle src/index.ts --public-dir=<slim> --out-dir=<bundle>`, ~0.4–1 GB) and render each
short from it (`npx remotion render <bundle> <slug>-<id>-9x16 <out> --crf=18`, ~45 s–2 min each). Rebuild
the bundle after any change to a cut list or a clip. Review with
**`revise-video`**: `/remotion-revision?folder=<slug>/shorts/<id>&video=<slug>-<id>-9x16.mp4` on
mediamake (the user picks `out/<slug>/shorts/<id>/` the first time). Log every note in `prefs.md`, the
general rule in the lessons log here. A liked or rejected stretch:
`npm run shorts -w lyrics_videos -- <slug> mark <id> liked|bad`.

## The cut list — reference

```ts
import { cut, full, stack, type LyricShortEdl } from '../../../../src/lyricshorts/spec.ts';

export const edl: LyricShortEdl = {
  cuts: [                                   // the footage under everything, back to back from each beat
    cut(477, 'sh0006', { x: 0.5 }),         // beat 477: shot sh0006 from its start, 9:16 crop centred at x
    cut(481, 'sh0002', { in: 0.3, x: 0.42 }), // 0.3 s into the shot
    // more: y and zoom (a tighter crop), rate (source speed), mono
  ],
  screens: [
    full(477),                                          // footage full frame from beat 477
    stack('eyes of pink', ['eyes', 'of pink', 'a soul', 'of grace'],
      { at: 479, enter: 'into', through: { beats: 1.5 } }), // pulls back out of a letter of row 0
    stack('a crimson flame', ['a crimson',
      { text: 'flame', fill: 'solid', color: '#E8285A', reveal: 490.5 }, // crimson, opens on the footage at beat 490.5
      'that burns', 'the space']),
    stack('i hold the line', ['i hold', 'the line', 'and bring', 'the light'],
      { exit: 'through', end: 512.5 }),                 // dives into the last row's thickest stroke over 2 beats
    full(512.5),
    stack(['ooh i let', 1], ['ooh', 'i let', 'the petals', 'fall']), // [phrase, nth] inside the window
  ],
};
```

- **Screens** run from their start to the next screen's start. A stack starts as its first word shows
  (or at `at`); `find` locates its first word in the window's sung words, and each row's words are
  matched in order (unsung words in between are skipped with a warning). Words show `TEXT_LEAD`
  (0.12 s) early. `exit`: `cut` (default) · `fade` · `through` (`through.row`, default the last;
  `through.beats`, default 2). `enter: 'into'` (row `through.row`, default 0, lit from the start).
  `align: 'center'` centres rows narrower than the column. Row `fill`: `video` · `solid` (with `color`,
  `reveal` beat); default video when the row is big enough (`minMask`), else solid in `ink`.
- **Layout**: without rows, `find` is the whole phrase and `solveStack` breaks it (`clips` prints
  each screen's rows, `↑`/`↓` for a vertical word with the side and how many rows it runs beside,
  and how much of the height it fills). Rows by hand: `stack('<phrase>', ['row', 'row', { text: 'space',
  vertical: 'up' }])` — a vertical row must be the first (left side) or the last (right side); the
  layout picks how many rows it runs beside. `marks: { flame: { fill: 'solid', color, reveal } }`
  styles the row a word lands in. `through.word` picks the word to dive into (default the last; an
  `into` pulls back out of the first).
- **Cuts** need clips: re-run `clips` after any change to a cut. Clips hold the shot at its own speed
  and frame rate (60 fps twixtor stays 60) for `span` seconds; `clipTime` maps a cut's time to the
  clip (rate, velocity ramps, the tail under the next shot), so the render and the extraction agree.
- **Transitions** on a cut: `tr: 'velocity' | 'zoom' | 'whip' | 'slash' | 'iris' | 'dissolve' | 'spin'`
  or `{ kind, dir, at, v, in, out }` (dir for whip / slash; at = iris centre in frame fractions; v =
  velocity peak; in/out seconds), plus `flash: true | '<colour>'` and `shake: 0..1`. Defaults (s):
  velocity 0.32 in / 0.28 out ×3, zoom 0.26 / 0.16, whip 0.2 / 0.12, slash 0.16, iris 0.3, dissolve 0.32,
  spin 0.26 / 0.14. `clips` marks the ones that move the whole frame (a screen changes on that cut:
  the resolver snaps a screen change within a third of a beat onto the cut). Theme `cuts: { flash,
  blade, pulse }`. Engine: `Footage.tsx` (Fx states for the way in / out, FxLayer, FootageAt).
- **Theme** (`shorts/theme.ts`, `LyricShortTheme`): `type` (`font`: the TTF's static path,
  `'<slug>/shorts/fonts/Figtree-900.ttf'`; tracking em, case, margin, top, bottom, gap — fractions of
  the frame; `stretch` [1, 1]: keep it — the user rejected stretched letters (`[0.8, 1.5]` was v5);
  `spread` (false: tight gaps, the stack centred);
  `maxWords` a row (2); `vertical` (may the layout turn a word beside rows: false since s02/s03 v1);
  `columns` (`max` turned screens a short incl. hand-set, `maxWords`, `maxSpan` s, `belowFill`: when
  the layout may set a short line as columns); `minSize` / `minVertical` (font sizes,
  fractions of the width, under which a row / a vertical word costs the layout); minMask), `colors` (ground, solid, ink), `floor` (how much ink the
  footage letters always carry), `appear` (`from` brightness, `ramp` seconds), `grade` (saturate,
  contrast, brightness, a soft-light `tint`), `leaks` (two colours, amount: over full frames, blooming
  as one opens), `grain`.

### Lockups over the footage, and twixtor on the beat (2026-10-28)

- **Not every screen is a mask.** On fast, wordy lines the eye can't follow the words and the picture at once
  (the user: "only some shots use the mask, the others can come on top of the image"). Keep the mask for the
  punch lines — a vow, a repeated word, the dive — and set the rest as `cap('<line>', { hi, place, color })`:
  the footage plays full frame and the line sits on it as a lockup (`lockup.ts`): the highlight word big
  (`hi`, default the longest-held word that isn't a little one), the words before it nested above the
  x-height in the widest gap beside the letters that rise, the words after it under the baseline beside the
  letters that drop — next to the letters, never across them — else above / below the whole word, flush
  with its edge. White with a soft shadow and a faint scrim; `place` low (default, under the faces), high,
  mid; `color` tints the highlight (the theme's accent). The small words use `type.small` (the face at 700:
  `npm run lyric-shorts -- <slug> font Figtree --weight=700`), at least 62 px.
- **No wide black bands.** A mask screen that fills under ~75 % of the height becomes a lockup (or starts as
  words over the footage, `reverse: true`).
- **Twixtor on the beat** (per cut): `ramp` (0..1, a burst of speed as each beat lands gliding into slow
  motion — the shot's own pace on average, so it needs no more footage; motion trails on the bursts),
  `bump` (a zoom punch on every beat, 0.04–0.07) and `push` (a slow camera push over the cut, 0.05–0.08).
  Ramps on 60 fps twixtor shots, bumps on hits and fights, pushes on calm shots and art.

- **The subject stays in the box through the whole shot**, not just its middle frame (`cuts.jpg`): draw each
  cut's start, middle and end as cropped (`node scripts/framed.mjs <slug> <id>` lists every cut's clip and
  times; tile three frames each) and re-mark the faces that drift or were marked on the wrong spot (a profile
  marked on the back of the head; a walk that starts left of where it ends), or swap the shot.
- **Nested small words grow into their gap**: as wide as the space beside the tall (or dropping) letters, at
  most half again the band's height and under half the highlight's size (the user: the word before
  "absolve" "can be a bit bigger, as there is still space until b").
- **Continuity: runs of one camera move.** Twixtor packs are almost all locked-off shots (`scripts/motion.py`
  on Yuta's footage: 229 of 237 still) — the motion is the characters'. So make the move with the crop:
  `pan` / `tilt` per cut (the 9:16 window slides across the 16:9 source, centred on the framed spot, ~0.04–0.07
  of the width), the same way for every cut of a phrase or two (drift right, tilt up on "rise", tilt down on
  a falling line), the eyes on the same spot at each cut (framing does that) — one continuous move across
  the cuts. Follow a shot's own motion where it has one (`motion.json`, `scripts/continuity.py` flags a cut
  moving against the one before). No move on the loop's last cut or its opening take (the seam).

## Gotchas

- **Transcription lines are length chunks** (ElevenLabs: 7 words), not sentences: the picker works on
  punctuation and breaths, and so should the rows.
- **Long held words fool the alignment**: in "Eyes of Pink" chorus 1, `Eyes` landed 4 s early after
  the held `relentless`. Check the words of the chosen stretch in the `new` header against the
  spectrogram (`analysis/zoom.py`) before casting; fix in `analysis/fixes.json`.
- **The render bundles every project** (src/index.ts): another session's half-finished edit can break
  it. If the bundle fails outside src/lyricshorts, wait or render from a copied entry.
- **AV1 4K60 sources** decode fine with ffmpeg's libdav1d; clips are cut once and cached by their
  parameters, so re-runs are seconds.
- **Never draw the stack as text.** Covering the frame with one stroke of an ultra-black face takes
  an effective font size of ~15 000 px whatever the row's size (a stroke is ~0.2 em), and Chrome stops
  drawing text there: s01's first render had fully black frames at the bottom of each dive. Outlines
  (paths) scale without limit. A dive must also cover the frame before its screen ends (it reaches full
  scale at 85 % and holds), or the cut to full frame flashes a black edge.
- **Never scale a whole composite with CSS.** Chrome dropped the multiply-blended letter mask when a
  whole composite (words + shot) was scaled ~1.4× as one layer — fully black frames. Whole-frame
  transitions split their motion (to the footage and to the words' SVG `<g>` separately) from their
  surface (blur, wipe, fade on a wrapper). And zoom a composite about its lit words, not the frame's
  centre (a top row alone is pushed out of frame). Scan every render for black frames: `ffmpeg -i
  <mp4> -vf signalstats,metadata=print:key=lavfi.signalstats.YMAX:file=- -f null -` (YMAX < 40).
- **Time in frames, not seconds.** Screen windows, transition windows, the active cut and a word's
  first lit frame are compared in frames (`round(t × fps)`): a cut or word a hundredth of a second
  after a frame otherwise showed the new screen a frame early or left a black frame.
- **The crop comes from the layout**: a cut's clip file is named by its framed crop, which needs the
  font and the layout. LyricShort draws nothing until the layout is in (else the first render pass
  asks for the unframed clip, a 404 that fails the render); the `clips` script and the render share
  `frameCuts`, so they always agree.
- **Every render and stills run leaves a ~12 GB bundle in $TMPDIR** (the public folder copied): the disk
  filled up (130 GB) on 2026-10-26. If a bundle fails with ENOSPC, ask the user to clear the old ones
  (`find "$TMPDIR" -maxdepth 1 \( -name 'remotion-webpack-bundle-*' -o -name 'remotion-v4.0.*-assets*' \)
  -mmin +60 -exec rm -rf {} +`); never delete them unasked.
- **The dive needs a thick stroke**: rows of thin letters (`i`, `l`, `t`) give a small circle and a
  long zoom; dive into a row with round letters (`o`, `e`, `g`, `b`, `d`).

- **Twixtor shots are short** (0.3–1.5 s each in most packs): `clips` warns "runs past the shot's end".
  `scripts/fitrate.py <slug> <id> < <clips output>` slows each such cut just enough (`rate`, the 60 fps
  source stays smooth) and flags any that would need under half speed — swap those for a longer shot
  (list durations from `segregation.json`). The same shot twice in a short needs a different `in`.
- **Burned-in text in the footage**: manga-animation packs open on a disclaimer card and caption words
  over shots; anime episodes carry title cards, name cards and staff credits (Japanese text at the
  bottom). Skip those shots or crop above the text (`{ x, y, zoom }` by hand). Letterboxed shots (black
  bars in a 16:9 source) need a hand crop with `zoom ≈ 1.3`.
- **Pinterest pictures can come in rotated** (EXIF orientation ignored by ffmpeg's image input): check
  the art reel's faces sheet and drop or re-export the sideways ones.
- **Transcription respelling**: ElevenLabs and the library's text differ where a word was misheard
  ("wills"/"wilts", "fire's mind"/"fire's mine"); an equal-length difflib swap fixes most, an unequal
  one by hand in `input/lyrics.json`, then `analyze --only align` and `prepare-project` again.

## Timing budget (this machine)

Analysis ~1 min (models cached); footage segregation ~3.5 min for a 3.6-min 4K60 video; `clips` ~1.5 s
a clip (4K AV1); 20 half-scale stills ~2.5 min; a 30-s render at 1080×1920 30 fps ~1.5 min. Check
the dives on a frame sheet of the render (every 2nd frame across each dive), not on stills.

## Lessons log

Append dated entries: what the user asked to change and the general rule behind it.

- 2026-10-26 — Skill created from the "summer leaves quietly" reel for "Eyes of Pink" × a Nezuko twixtor
  edit (s01: the final chorus, 31.5 s, a full-frame drum fill pulling back into `eyes`, a crimson
  `flame` opening onto the fire, dives through `the light` and `give in`). Self-review before showing:
  the type moved from SVG text to font outlines (black frames at the dive's depth), the dive now covers
  the frame before its cut, and a pulled-back row stays lit. v3 shown.
- 2026-10-26 — First notes on v3: "put shorter … you can put one word in vertical as well, the key is
  to have large font so much of the video becomes visible. Also text MUST always fill from top to
  bottom completely." v3's stacks (a sentence of 4 rows, top-anchored) left the lower half black and
  the rows mid-sized. Rebuilt the layout: a short phrase a screen, the layout solver breaks it into
  rows and stretches the letters (0.8–1.5×) so every screen fills between the margins exactly, margins
  cut to ~4 %, rows ink to ink; vertical words (up / down) beside a block of rows. First solver passes
  taught three costs: a thin vertical word or small rows look worse than a little stretch; a giant
  last row leaves the frame half empty until it is sung; a turned 3-letter word doesn't read.
- 2026-10-26 — Notes on v5: "the fonts appear stretched, don't do that, tiny border black … at top and
  bottom is okay, make words centered. Also extend the clip by a bit, it stops mid rhythm and make it
  looping somehow." Stretch off ([1, 1]); the stack is centred, spare height as black bands; the solver
  scores fill (bands acceptable, shrinking worse) and the screens regroup to fill: couplets where a
  single line leaves wide bands, the last line split as `… ooh i will never` + a giant `give / in`
  finale. A vertical last word only beside its last row or two (a tall empty column waiting for it
  read badly). The window grew 4 bars into the outro (31.5 → 36.7 s, ending on a 4-bar unit), and the
  short loops: its last beat starts the opening take, which the first cut continues. Bug found on the
  way: a screen starting a fraction of a frame after the short's first frame left frame 0 black —
  screens are now matched by frame.
- 2026-10-26 — Notes on v7: "since the sentences you pick are too large … I am seeing black screen for a
  lot of time, cut the sentences shorter." The couplets that filled the frame without stretch also
  kept their lower rows black for 3–5 s. Rule: one clause a screen, all its words in within ~2 s
  (`clips` reports and warns); held oohs as full-frame footage; fill is now secondary (bands accepted,
  warned only below ~70 %). The lone-`i` pillar penalty stays; a lone `a` is allowed (it makes a
  striking giant bowl, used twice in a row as a rhyme).
- 2026-10-26 — Notes on v8: "single-letter or 2-letter words when large are looking good, and having
  them at the start of a sentence instead of the end will make it so the user does not have to look at
  black screen more. The shot-to-shot transition, improve it, think like a famous anime shorts editor
  who uses CapCut a lot. The ending connecting to the start, forming a loop, is excellent — keep it."
  → the layout weighs dark time (big rows early); a transition kit (velocity, warp zoom, whip, katana
  slash, iris, dissolve, spin, flash, shake, kick pulse) cast cut by cut on s01; a cut where the screen
  changes moves the whole frame. On the way: Chrome blacked out a whole composite scaled ~1.4× (split
  motion from surface), and frame-vs-seconds rounding showed new screens a frame early. The loop is a
  rule now (principle 8).
- 2026-10-26 — Notes on v9: "i hold the line — I should be the biggest word; i stand my ground — keep I
  in big letters; after i will never give in, change the shot, put something that matches it." → the
  upright pillar (a drop cap sized to the frame, not to its neighbours: the first try, as tall as two
  rows, was a thin stroke and a dot); the outro hit after "never give in" is now her hand bursting into
  blood-demon fire (sh0020) instead of a static demon-form shot. Cast the shot after a line by the line
  too, not only the shots under it.
- 2026-10-26 — Notes on v10: "I don't like the shot after i will never give in" (the burning hand) and
  "make sure there are no gaps between words … beside the enlarged i … you can just simply put them in
  vertical" → the columns layout (giant upright i | the rest of the line turned to read downward, both
  full height, tight); the outro hit is her bloodied, teeth-gritted glare (sh0004, the twin of "break"'s
  shot) — for a defiant line this user wants her face, defiant, not an effect shot.
- 2026-10-26 — s01 approved ("This is good"); "make the next two picked stretches in this style, 9:16,
  looping". The picks repeated s01's chorus (chorus 1 sings the same words) or started mid-sentence, so
  the two were chosen by structure for contrast: s02 the fierce verse 2 + pre-chorus (bars 26–47, 37.4 s)
  and s03 the cute verse 3 (bars 71–87, 28.3 s). Learned on the way: auto columns (with the pillar i)
  rescue short phrases rows can't fill; turned columns run right to left; a single word can stand alone
  as a column when it is literal (`sleeping` lying on its side); a fast dive (0.7 beat) into the last
  word lands a loop that ends on a sung word; one shot and its raw-pass twin never in one short.
- 2026-10-26 — Notes on s02/s03 v1: "too many vertical wording shots, and only use vertical wording when
  the line is small in transcription timing … not looking good both of them, can't read it." v1 let the
  layout turn any phrase that filled better as columns (s02: 4 turned screens, s03: almost all). Rule: rows by
  default; turned words only on lines sung in about a second, at most two screens a short including
  hand-set ones (`solveShort` budgets them; theme `vertical: false`, `columns.max: 2`). A lower fill
  in rows (50–65 %) beats a screen nobody can read. A line whose last word waits 3–4 s after a held
  note drops that word rather than keep the screen dark (`you see a quiet girl` without `but`).
- 2026-10-26 — Notes on s02/s03 v2: "you are not putting the right clips, or you are not cropping them
  correctly, so it fits correctly … when there are too many words, you can show it in reverse like text
  is black, but placing the clip correctly is important … when the line is reaching midpoint … transit
  to mask style again." The crops were hand-set x positions, picked by eye from a centred guess: many
  showed hair, a cheek or half a face. Now every shot's subject is marked (faces.json) and framing.ts
  crops each cut on it by how the cut is seen (principle 3b); casting checks that the subject fits 9:16.
  Long screens start as black words over the whole footage and flip to the mask at half lit (3c).
  Found on the way: a shot can hide a missed cut (sh0045); the raw/graded twin rule caught sh0034/sh0084
  in one short; bundles in $TMPDIR filled the disk.
- 2026-10-26 — "I like s03, but s02 not good, learn from s01 and s03." s02 v3 against the two: a 13-beat
  instrumental after its first line (no words for 5.7 s), dim letters on dark demon and night shots,
  thin screens (lone tiny rows, 51–65 % fills, a 4-s wait). s02 v4 moves the window past the gap (to the
  drums before "the fire is awake", ending on the chorus downbeat after the held "relentless"), puts a
  bright face or fire behind every line, and starts thin screens as words over the footage. Rules:
  principles 4 and 8.
- 2026-10-27 — Renamed from make-lyric-shorts to make-lyrics-shorts-summerstyle-boldwords (the user).
  First fully autonomous run ("take no input from me"): an AMZ playlist of four Jujutsu Kaisen songs
  (Yuta "Cursed Love", Maki "Let's Get Started!", Higuruma "Sentence! Strike!", Toji "When a Monkey Breaks
  the Mold"), three shorts each, 9:16, 30 fps, looping. Songs from the YouTube uploads, words by
  ElevenLabs on that audio ("use elevenlabs for transcribing", mid-run), respelled from the library's
  corrected lines. Footage gathered by the run: 2–3 twixtor packs a character from YouTube, a manga-
  animation pack, and a Pinterest art reel (16–20 wallpapers / panels). Stretches chosen by structure for
  contrast — the hook, a verse with its own words, the bridge or outro — not the picker's repeats. Learned:
  the seam rule for songs that land the last word on the downbeat (principle 8b), multi-source footage
  with cascade-marked faces, fitting short twixtor shots by rate, black words over the footage for a long
  first word, and one slim bundle for many renders (step 6). Each song's look is its own theme colour
  (Yuta blue + Rika pink, Maki blood red, Higuruma gold, Toji hollow purple). Awaiting the user's notes.
- 2026-10-28 — Notes on the JJK twelve (tried first on cursedlove s01, "do not do for everything, lets try only
  the very first shot"): "when there are so many lines and the lines are going fast, visually it is hard to
  concentrate on both text and the visual … only some shots use mask, the other can come on top of image …
  neat typography where there is one highlight word and small words above or below at the correct places
  where it does not cross the letter … but sits next to it"; "shots that come with huge black bars above and
  below must be avoided"; "twixtors can speed up and zoom, beat box transition effects or other camera-like
  effects". → the cap screen (a lockup over the footage, lockup.ts), masks kept for 3 punch screens out of
  18, no screen under ~75 % fill, and per-cut ramp / bump / push. cursedlove s01 v4 rendered for review.
- 2026-10-28 — Notes on cursedlove s01 v4 ("much much better"): "some shots are not positioned correctly, the
  subject is outside the box, either replace them or crop correctly"; the "rise" lockup "done perfectly", but
  the word before "absolve" "can be a bit bigger, as there is still space until b, same with some other
  typos"; "use shots that make you feel continuity, like a left pan into a left pan, the subject aligned —
  a good match cut". → faces checked through each shot (7 re-marked, 1 swapped for the same take running on),
  nested small words grow into their gap, and crop pans / tilts in runs (motion.py found the packs locked-off).
  v5 rendered.
- 2026-10-28 — "roll it out and also update the skill": the s01 approach applied to the other eleven
  (rollout.py: masks kept on 2–4 punch screens a short, every other line a lockup, beat effects and camera runs
  on every cut, nothing moving at the seam), weak auto highlights replaced by hand and fillers taught to the
  picker, every cut's framing checked at its start, middle and end (15 shots swapped: backs of heads, a
  sword light with no face, an arm in the leaves, the art the user disliked). The approach is now the skill's
  default (principles 0, 3b, 6, 8b).
- 2026-10-28 — "put a watermark at top right, Music by + the Get into Zone logo; this skill should also accept a
  brand if it wants a watermark": the `brand` command and `theme.watermark` (logo + a label in the brand's
  label face, still over every frame). First pass used the brand's Strip (its thumbnail credit); the user:
  "don't use strip logo, use the frame logo" → the default is the brand's compact mark (`mark.png` in its
  thumbnail profile), 20 % of the width.
