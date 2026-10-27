---
name: create-thumbnail
description: Make YouTube thumbnails (1280×720) in Remotion from the user's picture or a concept, plus the video's details (title, topic, optionally its transcript), with a big impactful headline, saturated contrast, the channel's logo(s) placed where they strike, and fonts chosen with care; by default 4 styles × 3 variants, each labelled with an ID (A1…D3) so the user picks one final or three for YouTube's A/B test (Test & Compare). Use when the user says "make a thumbnail", "thumbnail for this video / song / lyric video", "/create-thumbnail", "thumbnail variants", "A/B test thumbnails", or asks for a brand's thumbnail template or more thumbnail options for a job under apps/lyrics_videos/thumbnails/jobs/. For a brand's video it reads the brand's thumbnail.json from pack-brand-kit; also the thumbnail step of a finished lyric video. Append new user feedback to the log at the bottom.
metadata:
  depends-on: pack-brand-kit
---

# create-thumbnail

Thumbnails are built with the engine in `apps/lyrics_videos/thumbnails/` (committed). **Read
`thumbnails/README.md` once**: it has the spec format, the presets and the layers. Each job is a
folder `thumbnails/jobs/<job>/` with one `thumbs.json`; renders go to `out/thumbnails/<job>/`.
Jobs, renders and the inspiration folder are gitignored; commit engine changes only when asked.

**Keep it cheap.** A thumbnail is a preset plus a few params, so a whole job of 12 is one
`thumbs.json` of ~80 lines and one 10-second render. Don't read the engine's source to make a
thumbnail (the README is the reference), don't write TSX for a look the layers can make, look at
the labelled sheet rather than single files, and while iterating render only the IDs you changed
(`render <job> B2,C1`).

**Defaults:** 4 styles × 3 variants = 12 thumbnails (A1–D3). The user can ask for more styles or
more variants; follow that.

## 1. Intake: ask before building

Collect with `AskUserQuestion` (put the recommended option first; skip what the request or the
folder already answers and say what you assumed):

1. **The video:** title, what it is about, who it is for, the one feeling it should leave. Ask for
   the **transcript** if they have one (optional; save it as `input/transcript.txt`).
2. **The picture:** their image(s) (best), frames from the video, a concept to generate, or a
   type-only thumbnail. See step 2.
3. **The channel and its logo(s):** which channel (a brand under `apps/lyrics_videos/brands/`?)
   and **which logos this video needs**: the channel's, plus any franchise / show / game / artist /
   sponsor logos. They can hand over files, or name them and you fetch them (step 4).
3a. **Watermarks: always ask which channel or channels to put on the thumbnail** (a song can belong
   to more than one: the channel that posts it and the artist's channel, e.g. Anime Music Zone +
   Get into Zone). Offer the brands under `apps/lyrics_videos/brands/` as options (multi-select),
   plus "none". For each one picked, use the brand's logo that reads on any ground: a transparent
   logo in black or white chosen per picture (dark logo on light corners, light on dark), or a solid
   cut of a picture logo; never a tile with its own background unless they ask. Two channels go on
   opposite top corners (never bottom right: YouTube's timestamp).
4. **The title on the thumbnail: always ask.** Must the video's title (or a set phrase, a name)
   be on the thumbnail, word for word? Options: *the title must be on it* (it becomes the hero
   text) · *title optional* · *never the title* (words that complement it). Never assume: some
   channels brand every thumbnail with the song name.
5. **Fonts: always ask.** Any font or font family they want (by name, e.g. "Nova fonts"), a mood,
   or fonts they hate. Names often mean a family: "Nova" is Google's Nova Square, Cut, Flat,
   Round, Oval, Slim, Script and Mono. Check the names on Google Fonts, and say what you took the
   name to mean. Their choice **overrides the brand's fonts** for this job (the logo stays).
6. **Taste:** moods or colours they want or hate, anything from earlier thumbnails. Point them at
   `thumbnails/inspiration/` (their references) if it exists, and read it yourself.

Questions 3a, 4 and 5 are asked even when everything else is already answered (put them in the
same `AskUserQuestion` call as the rest). Write the answers into `jobs/<job>/brief.md` (`init` makes a
template).

## 2. The picture

In order of preference:

- **The user's image.** Measure it (`sips -g pixelWidth -g pixelHeight`). Portrait or square
  pictures: frame them with `hero.focus` / `zoom` / `offset`, or outcrop them to 16:9 with the
  `midjourney-outcrop` skill when the subject would be cut badly.
- **Frames from the video** (a file, or a YouTube link downloaded with the Get into zone
  extension): pull candidates with exact seeks (`ffmpeg -ss <t> -i video -frames:v 1`), tile them,
  pick the most expressive face or moment. Thumbnails sell emotion: eyes, a reaction, a peak.
- **A concept to generate:** Midjourney through Get into zone (`midjourney-style-reference` when
  they have a look in mind). fal costs money: ask first. Generate at 16:9 with room for words.
- **No picture:** the `poster` preset (type is the picture).

Put pictures in `input/`. For anything that goes behind or in front of words, make a cutout:

```bash
npm run thumbs -w lyrics_videos -- cutout <job> input/hero.jpg --model=birefnet-portrait   # people
# birefnet-general for objects and scenes, isnet-anime for drawn art; --point=x,y keeps the part under a point
```

Check `cutouts/<name>.check.jpg` (green background) before using it. The cutout must be the same
size as its picture (the tool keeps it) so `photo` and `cutout` line up through `hero`.

## 3. The hook and the words

**When the title must be on it** (intake question 4), the title is the text: set it with a
hierarchy, never as one flat line. Make its strongest word the hero and the rest the kicker
(KINGDOM, with "YOU CAN HAVE THE" small above or split either side of the subject), or stack it so
the strong word is biggest (`fit: each` does this: shorter lines come out larger). Hook words
from the lyrics or transcript may still go in as a small sub line.

**Otherwise** the thumbnail and the title work together: **the words should not repeat the
title.** From the title, the brief or the transcript, find the one thing that makes someone
click (a claim, a feeling, a stake, a name) and say it in **1 to 3 words**, plus at most a small
kicker and a sub line. Read the transcript for the moment with the most emotion or the biggest claim; quote its
strongest word if it lands. Offer different word choices across variants: they are the cheapest
and strongest thing to A/B test.

## 4. Logos

- Copy the channel's logos with `init --brand=<brand>` (from the brand's thumbnail profile, see
  "Brands"), or put the user's files in `assets/`.
- When the user names logos for you to fetch (a show, a game, a sponsor): find the official
  logo as a transparent PNG or SVG (Wikimedia Commons, the official site's press or media kit;
  SVGs work as they are, the renderer is Chrome), check it really is transparent (look at it on
  a coloured background), save it in `assets/` and note the source in `brief.md`.
- **Placement is a design decision for each variant**, not a fixed corner:
  - never bottom-right (YouTube draws the video length there; `render` warns),
  - never on the face or across the hero word,
  - in calm space with contrast (a plate or glow when it's busy), small: ~130–200 px wide for a
    lockup, ~80 px for a monogram,
  - where it supports the read: centred under the title (a franchise mark), a top corner on the
    text's side, or bottom-left / bottom-centre under the subject.
  - Several logos: group them (e.g. two franchise logos with an "×" between), or split them
    (channel top-left, franchise under the title). Keep a variant's logo placement consistent
    with its layout.

## 5. Fonts: of extreme importance

The user's answer to the font question comes first: use the fonts they named in every variant
(spread the family's members across the variants and roles). Only without one: if a
font-choosing skill is listed (e.g. `font-choose`), invoke it with the video's tone, the words
and the brand, and use what it returns. Otherwise choose yourself:

- A **brand's fonts** first, when the channel has a brand (its rules say where each goes).
- Otherwise pick per style from Google Fonts by the feeling, and **try at least two families
  across the variants** of a style. Starting points that work at thumbnail size:

| feeling | hero fonts | kicker / sub |
|---------|------------|--------------|
| cinematic, epic | Cinzel 900, Playfair Display 900, Marcellus | Cormorant Garamond italic, Montserrat 600 tracked |
| dark, legendary, demonic | Grenze Gotisch 800, Pirata One, UnifrakturCook, Metal Mania | Montserrat 600 tracked |
| tall, punchy | Anton, Bebas Neue, League Gothic, Oswald 700, Big Shoulders Display 900 | Montserrat, Inter |
| wide, modern, motivational | Michroma, Unbounded 900, Syncopate 700, Krona One, Lexend Zetta | wide tracked caps |
| fast, aggressive | Kanit 900 italic, Archivo Black, Exo 2 900 italic, Russo One | Montserrat 800 |
| fun, loud (vlogs, challenges) | Luckiest Guy, Bangers, Titan One, Bowlby One, Lilita One | Archivo Black |
| handwritten, personal | Permanent Marker, Rock Salt, Caveat Brush | — |
| Telugu / Hindi | Dhurjati, Ramabhadra, Suranna / Teko, Rozha One, Khand | Noto Sans Telugu / Devanagari |

List every family and weight in `thumbs.json` `fonts`; `render` downloads them into the job and
warns about a layer using a font that isn't listed (it would fall back to a system font).

## 6. Styles and variants

**Four styles that are genuinely different ideas** (composition, device, mood), not one layout in
four colours. Each style gets **three variants** that change the things worth testing: the words,
the font, the colour or grade, the crop, the logo spot. Give every style a `name` and an `idea`,
and every variant a short `note`: the sheet prints them.

Build from presets first (README), then `patch` / `add` / `remove`, then raw `layers`, and only
as a last resort a `custom/` component. Treatments (`"treatment": "film"`, see the README) give a whole
thumbnail a look (film, noir, vhs…) in one word; `create-music-poster` uses the same engine for
square album artwork. When a new look works and could serve other videos,
promote it into `thumbnails/presets/` (an engine change: keep it additive, re-render the demo jobs
to check nothing else moved, and add it to the README table).

What makes a thumbnail work (from the user's references, Oct 2026):

- **One dominant hue + contrast.** Grade the picture (`grade`: punch / dark / mono / duotone) and
  let one saturated accent carry the eye (a red word, a red moon, a red bar). Saturated
  colour against dark, or dark against a saturated field.
- **The subject is the hero; the word is the second hero.** Big, heavy or striking type, often
  across the full width.
- **Words behind the subject** (`behind`): the cutout may hide part of the word, but **the word
  must still read**: put it where the subject is narrowest (head and neck height, usually `y:
  top`), keep the hidden part to about a third at most, and prefer words people can complete
  (a name, a common word). If shoulders cover the middle, move the word up, zoom the hero out, or
  use another style.
- **Three-tier type:** a small, widely tracked kicker ("THE NAME MEANS", "I AM THE"), the hero
  word, and a sub in a contrasting voice (serif italic, script, or wide tracked caps), or an
  accent word spread between the lines (`overlay`). Thin tracked labels are only ever supporting
  lines next to a heavy hero, never alone.
- **Text on the calm side.** Subject on one side, words on the other (`side`), or the words in
  the darkened lower third (`lower`).
- **Faces and eyes stay clear** of words and logos.
- **Readable at feed size:** the hero word must read in `sheet-small.jpg` (tiles ~250 px wide,
  the size of YouTube's feed). Kickers may blur there; the hero may not.

## 7. Render, check, show

```bash
npm run thumbs -w lyrics_videos -- init <job> [--brand=<brand>] [--title="…"]
# write thumbs.json, then:
npm run thumbs -w lyrics_videos -- render <job>
```

Fix every warning `render` prints. Then **look at `out/thumbnails/<job>/sheet.jpg` and
`sheet-small.jpg` yourself** before showing anything: the word reads (and isn't eaten by the
cutout), faces are clear, nothing clips the frame edge, the logo sits in calm space, the four
styles really differ. Fix and re-render those IDs.

Then send the user `sheet.jpg` (SendUserFile), list the IDs with one line each, and give them the
`/image-revision?job=<job>` link (the `revise-image` skill). They pick **one
final** or **three for an A/B test** (YouTube Studio → Details → Thumbnail → Test & Compare takes
up to three) and comment there, or give feedback by ID in chat; both work.

## 8. Iterate and deliver

- Feedback comes by ID ("B2 but with the A1 font", "C3, logo smaller"). Change that variant, or
  add a new one: **IDs never change once the user has seen them**; new variants continue the
  numbering (A4, B4) or start a new style letter (E).
- When they like one ("I like B2, save it as it is"), lock it: `npm run thumbs -w lyrics_videos --
  keep <job> B2`. Its image and spec are snapshotted in `out/thumbnails/<job>/kept/`, renders skip
  it, and `render` warns if its spec ever changes. Build what they ask next as new variants.
- Write what you learned into `brief.md` (this job) and the feedback log below (general taste).
- When they pick: `npm run thumbs -w lyrics_videos -- pick <job> B2` (or `A1,B2,D3`). The finals
  land in `out/thumbnails/<job>/final/` as JPEGs under YouTube's 2 MB limit; tell them where, and
  for an A/B test that YouTube picks the winner by watch time.
- **Three finals → three titles.** When they pick three for the A/B test, the video also gets three
  YouTube titles, one written for each thumbnail (it adds what that thumbnail doesn't say);
  `write-youtube-metadata` writes them (its step 3).

## Brands

A brand under `apps/lyrics_videos/brands/<brand>/` hands its thumbnail material to jobs through
`graphics/brand/thumbnail.json` (gitignored, like the rest of the brand): `logos` (kit files and
the names they get in `assets/`), `fonts` (files + family, weight, role), `palette`, default
`params` and the brand's thumbnail `rules` (copied into each job's `brief.md`). INVERTED Devils
and Subhodayam have one. For a new brand (from `pack-brand-kit`), write it from the brand's
`brandguide.md` ("Thumbnails and titles") and `colors.json`, then make a first job with
`--brand=<brand>` to check it.

## Review in /image-revision

Follow the **`revise-image`** skill: it gives the user the `/image-revision?job=<job>` link, reads
their revision (finals, keeps, drops, pinned comments) and closes it with `thumbs keep`, re-renders
and `thumbs pick`. Fix each comment the way this skill works (IDs never change once seen).

## Feedback log

Add entries at the bottom: date · job / channel · what they said → the rule.

- 2026-10-24 · engine · Asked for the skill: thumbnails from an image or a concept plus the video's details (transcript optional); saturated contrast; one or a few big impactful words, partly hidden by a segmented subject when it stylises the image; fonts of extreme importance (a font-choose skill later); the channel's logo(s) at a striking spot, the user may give several or name them for download; 4 styles × 3 variants by default with IDs for a final pick or a 3-way A/B test; cheap to run; outputs gitignored; /thumbnail-edit later.
- 2026-10-24 · engine · Gave `thumbnails/inspiration/` (13 anime / motivation edit thumbnails: ITACHI, GOAT, URAHARA, MONSTER, I CAN, JUST GRIND…) → the cinematic presets (`behind`, `lower`, `side`), the three-tier type and the taste list in step 6.
- 2026-10-24 · demo · In test renders, a word behind a broad-shouldered subject at chest height lost its middle letters (INE…BLE) → put behind-words at head height, hide at most about a third.
- 2026-10-24 · You Can Have the Kingdom (INVERTED Devils) · Own check before showing: with `behind` at head height, a kicker above the word crossed the subject's horns and hair → skip the kicker in `behind` when the subject's head reaches the top, use the sub instead. A 4-letter word with its middle letter hidden (gothic FREE → "FI EE") doesn't read → use 6+ letters, or a font whose letters can't be mistaken. Blackletter in small tracked caps is unreadable → subs in Montserrat or a script.
- 2026-10-24 · You Can Have the Kingdom (INVERTED Devils) · "ask the user any font preference… and if the title must be there in the thumbnail. here the title is a must; fonts are nova fonts; I like B2, save it as it is" → intake always asks about fonts and title (questions 4 and 5); a required title becomes the hero text with a hierarchy (KINGDOM big, "YOU CAN / HAVE THE" small either side of her head); the user's fonts override the brand's; `thumbs keep` locks a liked thumbnail. The `side` preset got a `height` option and a bar that follows the text.
- 2026-10-24 · engine · "create a /thumbnail-revision tab (public page): all the thumbnails, select multiple, actions like add comments, select for final… saves a revision file submitted back to claude… a zoom-in popup to see tiny mistakes; take inspo from /revision, rename it /remotion-revision" → the Thumbnail Revisions screen (mediamake `components/thumbnail-revisions/`) and the "Review in /thumbnail-revision" steps; `/revisions` → `/remotion-revision` (old links redirect).
- 2026-10-24 · You Can Have the Kingdom · "improve the exposure by a bit in all thumbnails" → new `exposure` param (brightness multiplier for the picture on top of `grade`; text and logos unchanged); 1.15 reads as "a bit". A kept thumbnail stays as it is (set `exposure: 1` on it) and gets a new sibling variant with the change.
- 2026-10-25 · Just Hit It (ATOMIC RAP) · "title is 'Just Hit It'; dont put any logos, only atomic rap in letter spaced michroma font" → for ATOMIC RAP no logo images: the channel name as a small `ATOMIC RAP` text layer in Michroma tracked ~0.6 em (or the `sub`). Frames from an edit with burned-in words: take the same shot from the source film (the edit's map/EDL gives the shot id), crop the letterbox (`cropdetect`). A wide subject (raised arm, bag) behind one word hides a letter whatever the framing: split the words either side of the cutout (`remove: ["title"]`, two text layers `under: "cut"`).
- 2026-10-25 · Just Hit It (ATOMIC RAP) · "i dont like a single thumbnail, the intro card was fantastic, the racer shot where a racecar get warped into the racer text is also fantastic … should match the video style … none of the thumbnails have this high polished aura feel that high quality edit videos have" → a thumbnail for an edit is built from the edit's own graphic moments (its title card, its word pops, its signature effect such as the warp zoom), in its palette and fonts, not a frame plus a generic preset: read the project's theme and gfx, pull the frames where its graphics peak, and rebuild them as raw layers (glows, gradient-filled type, cutouts with speed trails, bloom made in Python). Presets alone look flat next to a polished edit.
- 2026-10-25 · Just Hit It (ATOMIC RAP) · Round 2: "i like f2, keep it as it is … alll the rest are bad, grab snaps from original videos, and use high quality images, the red feels too much as well" → frames come from the best source file only (here the 1080p one, never the 720p one upscaled), the sharpest frame of the shot (measure the Laplacian variance over the shot rather than taking its middle), framed at zoom ≤ 1; an accent colour (red) once, not as glow over everything; vignette and grain go under the type.
- 2026-10-25 · Just Hit It (ATOMIC RAP) · Round 3: "only i3 is good … try using the words in outline ui, also try one where f1 stays in the background … below the car a small x and below it wide spaced Hit it" → the quiet wide-tracked Michroma line over a strong close-up beat every heavy filled Anton headline; offer hollow (outlined) lettering as a style: a text layer's `stroke` is an outside outline under filled letters, so hollow words need a job `custom/` component (`-webkit-text-stroke` with a transparent fill). A liked thumbnail is the base for new ideas: copy its layers and change one thing.
- 2026-10-25 · Just Hit It (ATOMIC RAP) · "for youtube title and thumbnail always preview and ask for user suggestions" → every round is shown (sheet + review link) with a question for suggestions; nothing is picked or called final without the user's answer.
- 2026-10-25 · Breaking Bad × Dangerous (ATOMIC RAP) · Round 1 picked at once: A3 (roaring face left, "I AM THE" over DAN[Ge]R on the calm side), B3 (the hat in profile, SAY MY [Na]ME on the dark side), C1 (the hat at sunset, DANGEROUS hollow behind him) → when the user asks for the video's own fonts, build from the edit's type device (here the element boxes) and quotes from the show; a strong face with the words on its calm side, and a hollow word behind a mid shot, beat words over close-ups. A giant word centred behind a close-up loses its middle (a head is ~500 px wide): close-ups get side layouts, only mid shots keep the word behind. `focus` is CSS object-position (slides ≤ the frame's slack); `flip` mirrors about the focus point, so flip only at focus 0.5.
- 2026-10-26 · Quicksilver × Kingpin (ATOMIC RAP) · "B2, C1 (but put the text to left), also use the STORY NEVER TOLD" → picked the red KINGPIN at a mid shot's shoulder and the close-up with a stacked lyric on its calm side; a variant whose words must swap sides mirrors the picture (`flip` at focus 0.5) rather than squeezing the words onto the face. A lyric the edit made into a big moment (its width-fit column) is a thumbnail candidate: rebuild it on the shot it is sung over, in the edit's colour. Own check: a raised hand crosses a word beside a mid shot as easily as a head does; drop the cutout when the word sits beside the subject.
- 2026-10-26 · Quicksilver × Kingpin (ATOMIC RAP) · "increase TOLD so it fits the width of the other words" → "no, it is not, check image": `fit: each` inside one text layer is capped by the box height, so a short last line (TOLD) stayed narrower and I said it fit without measuring. For a true width-fit stack, give each line its own text layer and box of the same width (`fit: each`), then compare the lines' left and right edges in the render before saying they match.
- 2026-10-27 · Nakama! (Anime Music Zone) · Round 1 feedback by ID: "D but title is STRAW HAT LOGS", "C1 but only the logo and all the bounties placed surrounding it", "B3 but put the One Piece logo (download official) at centre bottom and remove the subtitle", "remove the ridge line in the book" → new IDs for each (D4/D5, C4, B4); an official franchise logo comes from Wikipedia/Commons via the API (`prop=imageinfo`), checked on a coloured ground; a composition of the video's own elements (its drawn emblem, its posters) is rebuilt cleanly in Python rather than cropped from a busy frame (cut the drawing by ink and colour, multiply it onto clean paper, paint out a book's spine crease). Engine gotchas: the `side` preset's `width`/`height` are px (a fraction makes the title vanish), photo `fade.size` is a fraction, a raw-`layers` style ignores `params.logos` (add a `logo` layer), and a style-level `patch` fails on variants without that layer; move a subject sideways by extending the picture first (blurred mirror), not with `offset`.
- 2026-10-27 · Nakama! (Anime Music Zone + Get into Zone) · "in all the finalised thumbnails add logos of both Get into Zone and Anime Music Zone" … "put them each on one side" … "use the transparent logo in black or white colours depending on the image" … "in the thumbnail skill, make sure to ask what channel or channels to attach as watermarks" → intake question 3a (which channels, multi-select, always asked); each channel's logo transparent, black or white per picture (a glass or photo logo gets a solid cut on black first: brands/animemusiczone/graphics/tools/solid_logo.py); two channels on opposite top corners. "if doing 3 thumbnail variations, then give three YouTube titles as well" → three finals get three titles, one per thumbnail.
