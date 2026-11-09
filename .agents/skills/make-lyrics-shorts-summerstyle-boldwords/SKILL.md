---
name: make-lyrics-shorts-summerstyle-boldwords
description: Make vertical lyric shorts (9:16 YouTube Shorts / Reels / TikTok) of the user's song in Remotion, in the stacked-type style of the "summer leaves quietly" reel — a short phrase a screen, its words filling the black frame top to bottom in huge ultra-bold lowercase, a word or two a row, every row stretched to the same column width (width-fit), the stack centred and filling the frame top to bottom with only a thin black band above and below (letters never stretched), sometimes one word turned vertical down a side, each word lighting up as it is sung, the footage playing inside the letters (a knockout / text mask) on the punch lines and the other lines set over the footage as lockups (one big highlight word, the small words nested beside its letters), a row in solid colour that opens onto the footage, and dives through a letter into the footage full frame on the music's big moments. It picks the best stretches of the song itself (sung, hook-heavy, clean sentence starts and ends, ideally ending on an instrumental hit), casts the user's footage (or footage from a reference video) line by line, cuts 9:16 clips framed on the subject and renders through the shorts path; reviewed through Revisions (revise-video). Use when the user says "make lyric shorts / reels of my song", "shorts with bold stacked words", "words width-fit with the video inside the letters", "text mask shorts", "shorts like this reference" (stacked-type), "/make-lyrics-shorts-summerstyle-boldwords", or asks to change a short under projects/<slug>/shorts/ that imports src/lyricshorts. Not for shorts cut from a finished song edit (make-video-music-remix-shorts) or full-length lyric videos (make-lyrics-video, make-waveform-lyric-video). New user feedback goes in your notes (mm notes add), never in this file.
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

Everything lives in `apps/studio`. Engine (committed): `src/lyricshorts/` — `spec.ts` (the cut
list language and the resolver, Node-safe), `layout.ts` (the type set from the font's own outlines with
opentype.js; `solveStack` tries every way to break a phrase into rows, with or without a vertical
word, and keeps the one that fills the frame best with the biggest letters, then centres it; one SVG
path per word; the dive point = centre of the row's thickest stroke), `LyricShort.tsx` (the scene: footage → tint → leaks → grain → the mask
multiplied over it; solid letters on top), `define.ts` (`defineLyricShort`); the script
`scripts/lyric-shorts.ts` (`mm lyric-shorts`: pick, new, font, clips, render). Shorts are discovered
through the shared shorts path (`Root.tsx`, `stills --short`) and rendered with `lyric-shorts render`, the path
make-video-music-remix-shorts set up — keep using it, don't fork it.

Worked example: `projects/eyesofpink` ("Eyes of Pink", a Nezuko song, ~136 BPM) × a Nezuko twixtor
edit; short `s01` = the final chorus into the outro hit.

**Taste comes from the user.** Keep `projects/<slug>/prefs.md` (intake answers, the look, a dated log
of every note, numbered as the user wrote it). Read the lessons log at the bottom and your notes
(`mm notes make-lyrics-shorts-summerstyle-boldwords`) before planning.

## Principles (v4 after the user's notes on the JJK twelve, 2026-10-28 — they will keep refining them)

0. **Two kinds of screens: a few masks, the rest lockups.** "When there are so many lines and the lines are
   going fast, visually it is hard to concentrate on both text and the visual" — so only the punch lines
   take the mask (the opener, a repeated word, the dives: 2–4 a short), and every other line is a `cap`
   lockup over the full-frame footage (see "Lockups over the footage" below). A mask screen that would
   fill under ~75 % of the height leaves black bands — "must be avoided as much as possible" — so it
   becomes a lockup. Pick each lockup's highlight by hand when the automatic one lands on a filler
   (`yeah`, `get`, `just`, `lost` → `cage`, `rampage`, `blue`, `edge`): the word that carries the line.
   **Only these two — never words set over the footage in black (or white) as a stack** (the user,
   2026-11-02: "the black text on the screen is looking ugly, instead either go with mask or … 1 highlight
   word and fitting text above and/or bottom"). No `reverse` screens, no `type.reverse` in the theme;
   `clips` warns on any.
0b. **The text never sits on the subject's face** (the user, 2026-11-02: "sometimes the text placement is
   messing up the image behind it, overlaying text on important character, if it's semi important it's
   fine, but if it's important, either change position or recrop the background image so as to keep the
   subject clear of the text"). The important part is the head of each cut's marked subject (faces.json:
   the box's top down to a little under the eye line); the rest of the body and the background may take
   the text. Leave `place` unset: the engine puts each lockup low, high, mid, or right under / over the
   head — wherever it covers least of the heads under it — and frames every auto-cropped cut under a
   lockup with the head in the part of the frame the text leaves free (`placeCaps`, `framing.ts`). A shot
   cropped at its source's full height can't move up or down, so there the text moves. `clips` prints each
   lockup's place and how much of a head it covers, and warns past 15 %: then pick a wider shot for that
   line, make the line a mask (a big face suits the letters), or crop the cut by hand.

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
   frame tall where the footage shows whole (full screens), the head in the part the text leaves free
   under a lockup (0b), the eyes on the biggest lit row and the face a little taller than it under the
   mask; an iris opens on the framed eyes. Leave crops automatic unless a shot needs a hand crop (text in
   the picture, letterbox): the engine can only move the subject clear of the text on automatic cuts. **Cast shots
   whose subject fits a 9:16 crop** (about a third of a 16:9 frame's width): a face close-up wider than
   that shows a cheek; a profile at the very top of the frame loses its eyes. Where the subject is not
   her face (the flames, a night sky, a body lying down, "small" in the frame), give the cut its own
   `face`. Check `cuts.jpg` every time: it is the crop the render uses.
3c. **Long lines are lockups, not black words.** Until 2026-11-02 a long screen started as black (or white)
   words over the whole footage and flipped to the mask at half lit (`type.reverse`, `reverse: …`); the
   user called the black text ugly. A line too long for a mask that fills is a lockup; a long line that
   must be a punch is split into a lockup and a short mask for its last words (`you just out-thought` +
   `them all`), or joined with the next short line into one stack that fills (75–91 %). The engine still
   reads `reverse` for older cut lists; new ones never use it.
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
   sits small over black until the rest is sung: make that line a lockup rather than pulling back `into`
   it; one held word alone (`zero`, `judge`, `why`, `welcome`) is a lockup of one word (`cap('word')`) or,
   if it is short and bold, a one-row mask.
9. **Never lose a render.** Renders are kept in `v<N>/` by `lyric-shorts render`; keep earlier cut lists in
   `shorts/<id>/archive/edl.v<N>.ts.txt`.

## What it needs

1. **The song** (wav preferred) and **timed words**, transcribed with ElevenLabs Scribe, never taken from
   MediaMake's transcriptions (the user, 2026-11-03: "should not use mediamake mcp instead use elevenlabs
   directly"). Separate the vocals and transcribe the vocal stem as CLAUDE.md › Transcription says
   (make-waveform-lyric-video step 1): `mm transcribe <slug>` first gives back the
   song's cached words, or makes the stem's MP3 and prints the price. It is paid: ask first.
   - **The ElevenLabs MCP's key, first choice** (`mcp/elevenlabs`, the official open-source server with an
     API key): `--yes` sends the MP3 to Scribe with it (`--letters` adds letter times), writes
     `input/lyrics.raw.json` with every word's start and end and keeps the words in the media library's
     cache. No widget. Not the MCP's own `speech_to_text`: it returns the text only, no times.
   - **Only where no local MCP runs** (the Claude web or phone app), the hosted ElevenLabs connector
     (`mcp/elevenlabs-connector`, added from https://claude.ai/directory/elevenlabs, its tools named
     `creative_*`): `creative_transcribe_audio` with `estimate_only: true` for the price, then for real. A
     file on this computer goes in through `creative_upload_flow_reference` (modality `audio`: the user picks
     `analysis/stems/vocals.mp3` in the picker widget), wired in with `connect_from`; a direct https link
     through `creative_attach_reference_file`. Every word comes back with its start and end seconds in
     `transcripts[].words` (`creative_get_flow_run_status`), the full list at `words_download_url`: download
     it, then `mm transcribe <slug> --save=<that file>` keeps the words the same way.
   Check the transcription is of the same mix (same length). **A published song (a YouTube link, a
   playlist)**: download its audio (`uvx yt-dlp --js-runtimes node -x --audio-format wav`) and transcribe
   *that* (the user, 2026-10-27: "use elevenlabs for transcribing"): an upload is often offset or edited
   against the Suno take (Yuta's was 18.75 s off, Higuruma's 29.1 s). Then respell the ElevenLabs words
   from the user's written lyrics (the video's description, a lyrics file) where the two disagree word for
   word (`difflib` on the word lists: the written lyrics are the corrected ones — "wilts", not "wills").
2. **Footage**: the user's videos (or shots from a reference video they name), one or more sources.
   With none given, gather it yourself: **twixtor packs from YouTube** (`ytsearch12:"<character> twixtor
   clips 4k"`; Wyunye's "Twixtor Clips For Edit 4K60FPS" packs are clean, no watermark; "Manga Animation"
   packs add a second look but often carry burned-in captions and a disclaimer card) and **Pinterest
   wallpapers / manga panels** (`uvx gallery-dl --range 1-30 --filter "extension in ('jpg','jpeg','png',
   'webp')" "https://www.pinterest.com/search/pins/?q=<character> wallpaper"`, no login needed), turned
   into an art reel: `scripts/artvideo.py` (each picked picture 4 s, contained over a blurred cover of
   itself, a slow push-in, hard cuts, 2560×1440) — then segregated like any footage.
3. **A style reference** (optional): a reel whose look they want; this skill's default is the one above.

MCPs (check at intake which this session has):

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/elevenlabs` | required | Its API key: the song's timed words, every word's start and end (`mm transcribe --yes`, Scribe on the vocal stem's MP3; not its own `speech_to_text`) | The hosted ElevenLabs connector's `creative_transcribe_audio` then `--save` instead, or the user brings a timed `lyrics.json` |
| `mcp/elevenlabs-connector` | optional | The alternative where no local MCP runs (the Claude web or phone app): `creative_transcribe_audio` on the vocal stem's MP3 through its file picker widget, then `--save` | Nothing, while the ElevenLabs MCP's key is set up |
| `mcp/browse-hack` | optional | Twixtor packs from YouTube and Pinterest pictures straight into the library inbox, skipping what the library has (`youtube_download`, `pinterest_bulk_start`) | yt-dlp and gallery-dl fetch them instead, without the library's check for files it already has |

Look for the tools named above (`mcp__<name>__<tool>` in Claude Code; a connector added in the
Claude app has a random prefix, so match on the tool's name; load deferred ones with ToolSearch).
If one is missing, say what it costs before starting and offer to install it from MediaMake ("Set
up mcp/<name> from MediaMake by following
https://github.com/microfox-ai/mediamake/blob/main/install.md"; its tools show up in the next
session), or go ahead without it.

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
style — don't take that as the pattern. Shorts are under a minute, so build them whole, with no look
previews unless the user asks for them (`revise-video` › Previews or the whole video).

### 1. Project, song, words

`projects/<slug>/input/`: the song, `lyrics.json`, `project.json`, `footage/`, `inspiration/`.
Register the production (`mm media production new <slug> --channel=<brand id>
--skill=make-lyrics-shorts-summerstyle-boldwords`).

**The media library first** (`apps/studio/scripts/library/README.md`):
- `media find "<character> twixtor" --kind=footage --sheet` and `media find "<character> <scene>"
  --kind=images` before any download or Pinterest round. The One Piece run fetched the same Zoro
  packs twice.
- Downloads go to `_INBOX` (Browse Hack's YouTube and Pinterest tools save there and skip what the
  library has), then `media ingest`.
- Every file in `input/` is a clone, never a symlink: `media use <id> <slug>
  --as=input/footage/<name>.mp4`. A link into ~/Downloads broke eyesofpink.

Then make-lyrics-video steps 2–3: `mm analyze <slug>
--plots` (stems, beat grid, CTC word alignment; ~1 min with models cached) and `prepare-project`.
**Set real sections**: print each bar's drums / bass / other / vocal envelope with its lyric (see the
eyesofpink session) and write intro / verse / pre-chorus / chorus / break / bridge / build / outro to
`input/project.json` — derived sections only say "verse-n" and the picker can't find the chorus.

### 2. Map the footage

`uv run --script .claude/skills/analyze-video/scripts/segregate.py "projects/<slug>/input/footage/<name>.mp4"
--out projects/<slug>/footage --min-shot 0.1` (a 4K60 AV1 3.6-min edit: ~3.5 min): run it on the copy in
`input/`, since `segregation.json` keeps the path it was given. First try the cache:
`media cache get projects/<slug>/input/footage/<name>.mp4 segregation --into=projects/<slug>/footage/<name>`.
After a fresh run, or once its faces are marked, put both back: `media cache put … segregation <folder>
--tool=analyze-video` and `media cache put … faces <faces.json>`. Read `sheets/shots_*.jpg`;
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
mm lyric-shorts <slug> pick [--n=3] [--min=15] [--max=45]
```

Scores sentence-aligned stretches (sung share, hook words that come back elsewhere, vocal and drive,
clean start and end, a bonus for ending on an instrumental hit to dive into) and skips ones the user
called bad in `shorts/history.json` (shared with make-video-music-remix-shorts); a stretch that sings
the same words as a short already made (a chorus that comes back) counts as a re-cut. When the picks
come out messy (mid-sentence, too long), choose by the song's structure instead — a whole section or
two on 4-bar units — and scaffold with `new <from>-<to> --loop`. Writes
`shorts/lyric-picks.json` and `out/<slug>/shorts/lyric-picks-<run>/` (A.mp3…, picks.png). Show the
picks (first and last words, length, why) and the png; ask which to make unless the user said to just
go. The generic `mm shorts … pick` scores drive only and favours instrumental drops — not for
lyric shorts.

### 4. Scaffold and cast — `shorts/<id>/edl.ts`

```bash
mm lyric-shorts <slug> new A            # or a from-to in seconds; --lead=1 adds a bar before
```

Writes `short.json` (window, formats, fps), `edl.ts` (the stretch's words as `word@beat` in its header)
and `index.tsx`. The project's look is `shorts/theme.ts` (shared by its shorts; copy eyesofpink's). The
type is drawn from the font file, so fetch it once per project (any Google font; Google hands curl a TTF):

```bash
mm lyric-shorts <slug> font Figtree --weight=900   # → shorts/fonts/Figtree-900.ttf
```

Make a casting sheet of candidate shots with an x-ruler (`drawgrid=w=48` over 480-px keyframes) and read
each subject's centre off it. Then write screens and cuts, each cut with *why* as a comment (see the
reference below).

### A brand's watermark

```bash
mm lyric-shorts <slug> brand <brand> [--label="Music by"] [--at=top-right] [--width=0.2] [--logo=logo/<file>]
```

Puts a brand's watermark on every short of the project (user, 2026-10-28: "put a watermark at top right,
Music by + the Get into Zone logo … this skill should also accept a brand if it wants a watermark on the
shorts"). It reads the brand's kit profile (`brands/<brand>/thumbnail.json`, from pack-brand-kit), copies its
**compact mark** (the logo a thumbnail job takes as `mark.png` — for Get into Zone the Frame, never the wide
Strip: "don't use strip logo, use the frame logo") and its small-label face into `shorts/brand/`, and sets
`theme.watermark` (`logo`, `label`, `labelFont`, `at`, `width`, `color`). The render draws it still over every
frame — no shake, no transition, through the loop seam — the label in capitals with wide tracking above the
mark, flush with the corner, a soft shadow.

**An artist with no logo** (user, 2026-10-31: "logo watermark 'Music by - Virelia' since logo is not available"):

```bash
mm lyric-shorts <slug> credit "<Artist>" [--label="Music by"] [--at=top-right] [--width=0.2]
```

sets `theme.watermark` with a `name` instead of a `logo`: the label above, the artist's name in capitals
(tracked a little, set in the shorts' own face, `type.font`, as outlines) running the mark's width in the
logo's place. Fonts come from the theme, so it needs no brand kit.

### 5. Clips and checks

Tools for the checks (all in `scripts/`, run from `apps/studio`): `screens.mjs <slug> <id>` (each
screen's kind, words, fill and beats), `framed.mjs <slug> <id>` (each cut's clip and its start / middle / end
clip times — tile those frames to see the subject through the whole shot), `motion.py <video> <footage dir>`
(each shot's camera motion → motion.json) and `continuity.py` (cuts moving against the one before).
`rollout.py <project> <id> <screens.json>` upgrades an older cut list to this approach (masks only on punch
lines, lockups, beat effects, camera runs) — then check its highlights and framing by eye.

```bash
mm lyric-shorts <slug> clips s01
```

Prints the timeline (every screen with its rows and each word's beat; every cut), cuts the missing
9:16 clips into `derived/lyricshorts/` (cropped at `x`, scaled to 1080×1920, at the short's fps; a
changed cut gets a new file), writes `shorts/<id>/shots.json` (the Revisions map) and
`out/<slug>/shorts/<id>/cuts.jpg` (each cut's middle frame as framed). Fix the warnings (shots run out,
same frames twice, words after their screen ends) and any framing that misses the face. Then stills of
the moments that matter, tiled into one sheet:

```bash
mm stills <slug> 0.4,1.1,4.1,… --only --short=<id>    # seconds of the short
```

Look for: every row's footage readable (not black), the face behind the big row, the solid row
opening on time, dives landing on full footage (no black edge in the last dive frame), every screen
filling the frame top to bottom once its words are in (the user wants it so, even under Shorts' caption
and buttons), and no screen sitting half empty for long while a giant last word waits to be sung.

### 6. Render and review

```bash
mm lyric-shorts <slug> render s01        # or: render s01 s03 · render all
```

Bundles the project once (this project alone, the public folder linked — nothing copied into `$TMPDIR`,
a few seconds), then renders the shorts one after another at `--concurrency=3 --crf=18` (~1 min for 30 s) →
`out/<slug>/shorts/<id>/<slug>-<id>-9x16.mp4` + `.map.json`. Each render goes to `<name>.part.mp4` first;
only a finished one replaces the short, and the one it replaces is kept in `v<N>/`. A failed try (Chrome
timing out at start, a font fetch) is retried once. After each it prints the dark frames (YMAX < 40, the
watermark's side cropped off) with their times: 0 is the goal, and still look at a frame of every screen —
a black shot under a white lockup isn't dark to the scan. `--frames=a-b` renders a clip into `clips/`,
`--format=9x16` one format. Run one render at a time on this machine (the Mac overheats, and two
overlapping renders crashed one, 2026-11-02); run it again after any change to a cut list or a clip. No
slim folder, no `tools/bundle.ts` / `render.sh` in the project any more: this command replaces them.
`render-project --short` works too but bundles per short and doesn't scan. **Why the CLI bundle died at
~63 %** (2026-11-01/02, five projects): Tailwind makes `projects/` (and `thumbnails/`, `assets3d/`,
`analysis/`) context dependencies of `src/index.css`, and in production webpack hashed them by reading every
file whole — 20+ GB of footage until macOS killed it. `remotion.config.ts` and `scripts/bundle.ts` now
snapshot by timestamp (`scripts/snapshots.ts`); if a bundle dies silently again, look for a webpack override
that skips `timestampSnapshots`. Bundles link the public folder; only `npx remotion bundle` copies all of
`projects/` — don't use it, and don't copy bundle or render scripts into a project. Before the links,
run preflight on each short (`mm preflight <slug>
--video=out/<slug>/shorts/<id>/<slug>-<id>-9x16.mp4`: frozen frames and the sound, which the dark-frame
scan doesn't cover) and fix or answer what it finds. Review with
**`revise-video`**: `/video-revision?folder=<slug>/shorts/<id>&video=<slug>-<id>-9x16.mp4` on
mediamake (the user picks `out/<slug>/shorts/<id>/` the first time), then start the watcher
(`mm wait-revision <slug>` covers every short). Log every note in `prefs.md`, the
general rule in your notes (`mm notes add make-lyrics-shorts-summerstyle-boldwords "…"`). A liked or rejected stretch:
`mm shorts <slug> mark <id> liked|bad`. Footage the user called wrong or bad
("the twixtors look bad"): `media rate <id> bad --note="…" --production=<slug>`. Approved shorts go
to the channel's folder: `media deliver <slug> --what=shorts` (a dry run), then `--yes`, and give the
`open -R` line.

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
  with its edge. White with a soft shadow and a faint scrim; `place` unset lets the engine keep the heads
  under it clear (0b), or set it by hand: low (under the faces), high, mid; `color` tints the highlight (the
  theme's accent). The small words use `type.small` (the face at 700:
  `mm lyric-shorts <slug> font Figtree --weight=700`), at least 62 px.
- **No wide black bands.** A mask screen that fills under ~75 % of the height becomes a lockup (`clips` warns
  with the fill).
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
- **The render bundles src/ and this project alone** (ONLY_PROJECT): another session's half-finished edit
  in src/ can still break it. If the bundle fails outside src/lyricshorts, wait or render from a copied entry.
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
- **`npx remotion bundle` copies the whole public folder** (~12 GB into $TMPDIR; the disk filled up, 130 GB, on
  2026-10-26): never use it — `lyric-shorts render` and `stills` link the public folder instead. If a bundle
  still fails with ENOSPC, ask the user to clear the old ones
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
- **Transcription respelling**: ElevenLabs and the written lyrics differ where a word was misheard
  ("wills"/"wilts", "fire's mind"/"fire's mine"); an equal-length difflib swap fixes most, an unequal
  one by hand in `input/lyrics.json`, then `analyze --only align` and `prepare-project` again. An ad-lib
  right after a word ("haki, (you pause)") can pull the next line's alignment beats early: drop the ad-lib
  and keep those lines at their ElevenLabs times (`fixes.json`: `"<line>": "input"`).
- **The beat grid can lock onto the wrong tempo**: when every sung line lasts a whole number of tracked
  beats that isn't 4 (Drums of Liberation: 3), check a kick/snare profile by beat position (mod 3 / mod 4)
  and fix it with `tempo_range` in `analysis/config.json`, then `prepare-project` again.
- **Check a mask's fill before you make it one.** Three short words stack to 55–65 % (`give me a future`,
  `take this crown`), two long ones to 27–31 % (`nothing happened`, `avast nakama`), a lone long word to
  ~14 %. Fold a neighbouring short clause in (`to keep his captain whole`: 87 %; two short lines joined into
  one stack reach 75–91 %: `i am the tremor the quake`, `i forgive you for what you've done`), or set the
  line as a lockup. `clips` prints the fill and warns under 75 %.
  A dive that starts before its word is sung hides the word: start it (end − beats) after the word lights.
- **The dark-frame scan is fooled by anything always bright**: the watermark keeps every frame's YMAX above
  40, and so do white lockup words over a black shot. Scan with the watermark corner cropped
  (`crop=iw*0.7:ih:0:0,signalstats`; `lyric-shorts render` scans that way) and still look at one frame of every screen; check the first frames
  of any shot cut from its start (`in: 0`) for a fade from black.
- **Black frames from the cut list**: a window that opens before its first word needs a `full(<start>)`
  screen; a cut that opens a mask before its first word lands (with a zoom transition) leaves a black frame
  — cut on the word. A repeated line inside one window needs `[phrase, nth]` on the later screen, or both
  resolve to the first.
- **`bump` on a mask cut pushes the width-fit rows past the frame's edge** (an "h", a "my" cut off): masks
  take `push`; `bump` stays on lockups and full frames.
- **White on white**: white lockups vanish on white or beige art (manga pages, bubbles, a pale wall) — a
  coloured highlight, `place: 'high'` over a dark part, or another shot.
- **The loop take carries the last mask and its dive**: a take whose lower half is a black cape or a dark
  ground turns them near-black. Pick a loop take bright across the frame.
- **1080p twixtor packs can't take the framing's mask zoom** (1.25× on top of the 9:16 crop is a 2.2×
  upscale): hand-crop them at zoom 1. A pack can carry a faint channel watermark across the middle
  ("Clips in Description") — a 9:16 crop of the middle shows it: skip those shots. Packs and the episode
  uploads share takes (the same shot at another speed or grade): one of each twin a short.
- **Pins in the art reel** (2026-11-02, ten One Piece songs): a landscape pin under ~1000 px tall goes soft in
  a 9:16 crop (a third of its width, upscaled 3–4×) — prefer portrait or big pins for the lines, and give
  small pins tall subject boxes so the framing keeps them at 1×. A portrait pin fills the crop at its full
  width: centre it (any `x` offset shows the blurred cover) and zoom the narrower ones (`zoom ≈ 0.5625 /
  aspect`). Landscape art turned sideways for phones is common in "crew" searches: rotate it back. Pins with
  burned-in subtitles, an artist's signature or a generator mark in a corner: replace them. A 4-s pin holds
  only ~7 beats at 100 BPM and `clips` doesn't warn for pins as it does for twixtor shots — count the beats
  when a pin runs through a dive and its full-frame tail. A big `pan` (0.25–0.3) across a landscape pin
  makes a reveal inside one cut.
- **The story's own scene beats a pin** when the line names a moment the anime shows (Zoro's "nothing
  happened", Arlong Park falling, the Enies Lobby flag): search YouTube for "<character> <moment> 4k scene" /
  "<A> vs <B> twixtor" and official clips (subtitled: crop above) before building that moment from fan art.
  Check frames through the whole range: a scene can tilt along a body and never show the face. Minor
  characters (Squard) barely exist on Pinterest — go to the episode clip. Crunchyroll clips: TOEI mark top
  left, subtitles at the bottom (one line: `zoom 1.2, y 0.38`; two lines: 1.3), a 10-s end card to skip.
  Twixtor packs often end in 3-s canon clips — real story moments to cast. Near-duplicates across sources (a
  pin that is a still of a twixtor shot, two pins of one frame): check `cuts.jpg` for the same picture twice.
- **Pinterest through the Browse Hack extension with several sessions on one Chrome profile**: the
  extension's downloads queue up and trickle in for minutes, so one bulk session split into searches by
  download time fails. One search per folder: `pinterest_bulk_stop` → navigate the tab to
  `in.pinterest.com/search/pins/?q=…` (the www → in redirect can leave a navigation silently undone) →
  `pinterest_bulk_start` with that search's own folder → wait until `pinterest_bulk_status` shows `queued 0`
  → stop. The first few files can still belong to the search before: pick pins by what they show. Exact
  alternative: read the page's pin hashes in your own tab (JS over `img[src*=pinimg]`) and fetch the
  originals from `i.pinimg.com`. A `browser_batch` that times out keeps driving the tab in the background;
  keep batches to ~6 searches.
- **macOS `seq -s, 0 33` ends with a comma** (artvideo.py's `int()` fails on it): build index lists another way.

## Timing budget (this machine)

Analysis ~1 min (models cached); footage segregation ~3.5 min for a 3.6-min 4K60 video; `clips` ~1.5 s
a clip (4K AV1); 20 half-scale stills ~2.5 min; a 30-s short renders in ~1 min (concurrency 3; the bundle a few seconds). Check
the dives on a frame sheet of the render (every 2nd frame across each dive), not on stills.

## Lessons log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add make-lyrics-shorts-summerstyle-boldwords "<what the user asked to change> → <the general rule behind it>"   # a new lesson, dated for you
mm notes make-lyrics-shorts-summerstyle-boldwords                                                                        # your notes for this skill
```

When the user wants them shared, `mm notes promote make-lyrics-shorts-summerstyle-boldwords` offers them to this log as a pull request.

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
- 2026-10-30 — eyesofpink's footage was a symlink into ~/Downloads (and its `segregation.json` pointed
  there too); the download was deleted, the link dangled, and every Remotion bundle crashed. The user:
  "I cannot move files once a project is done?", and agreed that was a bad setup → a project owns its
  sources: footage is copied into `input/footage/` (`cp -c`), never linked, and segregated from that copy.
  `prepare-project` and `cleanup-out scan` list any link under `projects/` whose file is gone; never
  remove one yourself (ask: put the file back, or remove the link).
- 2026-10-31 — "Ace in the Deck" by Virelia (a One Piece / Ace tribute, for anime sounds like), from a YouTube
  link: "generate 3 shorts, for logo watermark 'Music by - Virelia' since logo is not available" → the `credit`
  command (a text credit, MUSIC BY over VIRELIA). Learned on the way: the lyric video's on-screen lines are a
  free check of the transcription (frames at each line's middle, cropped to the text: one fix, "soul" not
  "scroll"); One Piece faces mostly escape the anime cascade (31 of 254 shots) — mark the cast by eye; Oreki's
  and UlkioraaaTwixtor's Ace packs are the same clips (use one); hand-set rows of 3-letter words (`one / ace /
  in the deck`) fill under half the frame — the solver's giant `in` is what fills it; a highlight colour of the
  footage's own hue (orange on fire) disappears — keep highlights white on such shots; a mask over a shot whose
  top is dark hair dims the top rows — put a shot bright across the frame behind a stack. Shown in Studio, then
  rendered on the user's word: "preview first rule only applies for simpler mechanics video, for videos like this,
  the render keeps stucking" — these shorts render for review.
- 2026-10-31 — notes on Ace in the Deck v1: "all three have incorrect shots, the twixtors look bad as well, use them
  minimally, and read lyrics understand context, and find the right pins you need"; "song is about different parts
  of one piece story". v1 cast twixtor packs by mood (a fierce face for a fierce line) — but a story song names its
  scenes (the brothers' sake cups, the kid noble, the old man, the mark on his back) and packs of one character's
  fights can't show them. Rule: read the lyrics as the story first (write each short's line → scene map in
  prefs.md), then search Pinterest per scene (one query a scene, `input/pins/<NN-scene>/`), pick the pins that show
  it, and make them the footage (an art reel at 3414x1920: `artvideo.py … 3414x1920`); twixtor clips only as a rare
  accent where motion is the point.
- 2026-11-02 — The AMZ One Piece playlist (PLCNQnF1wdkTc4WnHxFzG6VzGxMBxS9qmR): ten songs × 4 shorts, fully automatic
  ("use free.themoondevs for downloading twixtors/pins … do everything in auto"). Audio and descriptions from the
  uploads; ElevenLabs Scribe on the vocal stem, re-cut into lines and respelled from the description's written lyrics
  (`projects/_onepiece-shorts/recut.py`: 92–100 % of words matched). Each song cast from its story — one Pinterest
  search a scene through the free.themoondevs Chrome profile, the story's own anime scenes where YouTube had them,
  twixtor packs for the moves. The user asked mid-run to split the work ("do things simultaneously … multiple
  threads"), so each song got its own session over a shared kit (`projects/_onepiece-shorts/README.md`); then the Mac
  overheated with ten at once ("work on 2 threads at a time, system is overheating") — run at most two song sessions
  at a time, heavy steps one at a time inside each. Watermarks follow each description's credit (Get into Zone Frame;
  a typed MUSIC BY / SUPERMEL on Bonney's and To Nami's — "this is music by SuperMel, for now just type it").
  Profanity on screen as `f*ckin'`. The Gotchas above (mask fill, the dark-frame
  scan, pins in the reel, Pinterest with shared Chrome) came out of this run.
- 2026-11-02 — Notes on the One Piece forty: "the black text on the screen is looking ugly, instead either go with mask or
  the current other variations of 1 highlight word and fitting text above and/or bottom" → no reversed screens any more
  (principles 0, 3c): a line is a mask that fills or a lockup; `clips` warns on any `reverse` and on masks under 75 %.
  "Sometimes the text placement is messing up the image behind it, overlaying text on important character … if it's
  important, either change position or recrop the background image so as to keep the subject clear of the text" →
  principle 0b: lockups place themselves (low, high, mid, right under / over a head) where they cover least of the
  heads of the marked subjects under them, and auto-cropped cuts under a lockup put the head in the free part of the
  frame (`placeCaps` and `clearOf` in framing.ts; the render and `clips` share them). Tried on Red Hair's Requiem s04:
  "heart" moved off Luffy's eyes to the top, "fleets" off the ships; the faces it can't clear (a close-up filling the
  frame, a hand-set place or crop) are warned with the shot to swap.
- 2026-11-03 — "should not use mediamake mcp instead use elevenlabs directly ( via elevenlabs mcp )" → the timed words
  come from ElevenLabs Scribe only, never MediaMake's transcriptions (`mcp/mediamake` is off the MCP table).
  Then "make https://claude.ai/directory/elevenlabs as the dependency" → `mcp/elevenlabs-connector` (required). The hosted ElevenLabs connector's `creative_transcribe_audio` returns every
  word's start and end; the open-source `elevenlabs-mcp` (0.12.2) `speech_to_text` keeps only the text, so without the
  connector Scribe's API is called with that MCP's key (word times, or letter times with `character`). Respelling now
  follows the user's written lyrics.
- 2026-11-03 — "lets make a script and put it in default skill setting across all skills, that better convert
  wav to mp3 before running elevenlabs scribe", then "connected hosted elevenlabs mcp (creative_transcription is the
  first choice, if it is not there, then it should do)" → CLAUDE.md › Transcription for every skill:
  `mm transcribe` first (cached words, or the stem's mono MP3 and the price), the ElevenLabs connector on that
  MP3 then `--save`, else `--yes` with the ElevenLabs MCP's key; the connector is the first MCP to install.
- 2026-11-04 — "having the old elevenlabs archived mcp is better than the new one, as it keeps opening a stupid
  widget for transcription. old elevenlabs mcp with api key setup is much cleaner" → flipped back: the ElevenLabs
  MCP's key (`mm transcribe --yes`, no widget) is the first choice and the first MCP to install; the hosted
  connector is only the alternative where no local MCP runs (the Claude web or phone app). Its transcription
  tool is built around a file-picker widget and a flow canvas, and every result is a run to download from.
