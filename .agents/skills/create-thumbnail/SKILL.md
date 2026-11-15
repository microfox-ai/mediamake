---
name: create-thumbnail
description: Make YouTube thumbnails (1280×720) in Remotion for any kind of channel (tech reviews, tutorials, explainers, documentaries, finance, gaming, cooking, travel, podcasts, fitness, news, music and edits) from the user's picture or a concept, plus the video's details (title, topic, optionally its transcript). It reads three things first (what the video is about, what kind of video it is, whose channel it is on), works from that kind's playbook of what its hit thumbnails share (researched from leading channels' hits and misses), and pulls fresh references for a video on demand (mm thumbs inspire) when a kind is new or a board did not land. It first shows a concept board of 6–8 genuinely different ideas (benchmarked at feed size beside real hits of the kind), then makes 3 variants of each concept picked, each labelled with an ID so the user picks one final or three for YouTube's A/B test (Test & Compare). Use when the user says "make a thumbnail", "thumbnail for this video / song / tutorial / podcast / review", "/create-thumbnail", "thumbnail variants", "A/B test thumbnails", "find thumbnail inspiration for <kind of channel>", or asks for a brand's or series' thumbnail template or more thumbnail options for a job under thumbnails/jobs/. For a brand's video it reads the brand's thumbnail.json from pack-brand-kit; also the thumbnail step of a finished lyric video. New user feedback goes in your notes (mm notes add), never in this file.
metadata:
  depends-on: pack-brand-kit
---

# create-thumbnail

Thumbnails are built with the engine in `apps/studio/thumbnails/` (committed). **Read
`thumbnails/README.md` once**: it has the spec format, the presets and the layers. Each job is a
folder `thumbnails/jobs/<job>/` with one `thumbs.json`; renders go to `out/thumbnails/<job>/`.
Jobs, renders and the inspiration folder are gitignored; commit engine changes only when asked.
`playbooks/` holds one page per kind of channel (what its hit thumbnails share, and archetypes for
the board): read the one for the video's kind, not all of them.

**Keep it cheap.** A thumbnail is a preset plus a few params, so a whole job of 12 is one
`thumbs.json` of ~80 lines and one 10-second render. Don't read the engine's source to make a
thumbnail (the README is the reference), don't write TSX for a look the layers can make, look at
the labelled sheet rather than single files, and while iterating render only the IDs you changed
(`render <job> B2,C1`).

**Defaults:** a **concept board** first — 6–8 one-variant styles (A1, B1 … H1), each a different
idea — then **3 variants of each concept the user picks** (A2, A3 …). The user can ask for more or
fewer; follow that.

## The three reads (before anything else)

A thumbnail is made of three things, and all three are read before a word is designed:

1. **The video's subject**: what it is about and the one thing at stake in it (a product, a claim,
   a place, a person, a result). It becomes the hero and the words.
2. **The video's kind**: review, tutorial, explainer, documentary or essay, finance, gameplay,
   recipe, travel vlog, podcast or interview, fitness, news or commentary, music or edit. It picks
   the **playbook** (`playbooks/README.md` lists them): what the hero usually is, how many words,
   which type voices, bright or dark, which devices, and 7–8 archetypes for the board.
3. **The channel**: its brand (a `thumbnail.json`?), its series frame, its last thumbnails, who
   watches it and which channels it sits beside in the feed. It sets the frame, the fonts and
   colours, and what "different enough to notice" means.

Write the three as the first line of `brief.md` ("tech review · a folding phone after 30 days ·
Desk Notes: calm studio look, no host on camera") and **read that kind's playbook before
sketching**. A video between two kinds reads both. No playbook for the kind, the user names
channels they admire, or the board did not land: `mm thumbs inspire` (see "Inspiration on demand").

## What makes people click (every kind)

**The product and the host are two different things** (the user, 2026-11-15: "the album cover is
the product not the host … if there is no host or is basically a faceless channel, at least pose a
mascot of sorts or use a famous person as host but there should be a relation and the text on
thumbnail should explain the relation"). The **product** is what the video makes, reviews or
explains (an album cover, a phone, a dish, a map); anything inside it (the character painted on a
cover, the food on the plate) is still the product. The **host** is who presents it: the creator,
or on a faceless channel **its mascot**, or **a famous person with a real relation to the video**
(press pictures, never a generated likeness, never words they did not say). The thumbnail's words
**say the relation** between host and product (the mascot is Claude, so CLAUDE MADE MY ALBUM COVER).
A faceless channel with no mascot yet: propose one from its brand (its logo as a character), make
it once, keep it in the brand kit, and use it in every episode. **The product is never behind the host**
(the user, 2026-11-15: "putting the poster behind the character is bad … none of the ideas you
picked did that"): it sits beside them or is held out in front of them, whole and unblocked, as in
the hits (a UI card in front of the presenter, an object on an open palm, an object beside the
face). Order the frame **words → product → host**: the product next to the words, the host on the
far side, scaled up and cropped at the frame's edge as the hits crop their presenters, so the
product is at least 300 px wide. A generated pose holding its card on the wrong side is mirrored
(the generated image, never the product) before `thumbs swap`.

From YouTube's own guidance and the 2026-11-14 research (550 thumbnails over ten kinds, each
channel's hits against its own misses: `playbooks/README.md`). Every thumbnail passes these; the
playbook adds its kind's own.

1. **One idea, read in a glance.** The one thing that separated hits from misses in every kind was
   how fast the idea reads small. One hero, at most three elements, and at 168×94 (a phone's feed)
   you can still say what the video is.
2. **Show the subject itself.** The product, the dish, the place, the guest, the game's character,
   the map: not a host talking about it. Misses are thumbnails about nothing concrete.
3. **The hero is what this kind's viewer looks for**, and it is not always a face: a face is on
   two thirds of hits and of misses alike, and leads only 30 % of hits. See the playbook.
4. **Big.** Whatever leads (object, face, word, number) takes at least half the frame's height or
   60 % of its width. A hero at a quarter of the frame is a caption on a photo. **And one word always makes
   the impact** (the user, 2026-11-15: "at least one word should make an impact on the user"):
   even in a sentence, one word is set giant (60 %+ of the width or a third of the height) and the
   rest of the line is smaller around it.
5. **Few words, and only words that add.** None to three for most kinds (a podcast's claim and a
   finance explainer's question run longer). The thumbnail asks, reacts or proves and the title
   tells; repeat the title only where search needs the name (a tool, a dish, a country, a game).
6. **The hero comes off its ground**, bright or dark: by brightness, a clean field, a rim of light,
   an outline or depth of field. A bright ground is as right as a dark one (tech, food, travel).
7. **One accent colour**, used once or twice: the word, an arrow, a plate, the product itself.
8. **A promise the video keeps.** YouTube picks a Test & Compare winner by watch-time share, and
   its policy bars thumbnails that show what is not in the video: the real product, real numbers,
   the guest's real words.
9. **The channel's frame when it has one** (a badge, an episode number, a plate style, a corner):
   same place every time, so the viewer knows whose video it is (see "Series").
10. **Clear of YouTube's own marks**: nothing that matters in the bottom-right corner (the video
    length) or the bottom 24 px (the progress bar).

## First: check the MCPs

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/browse-hack` | recommended | Frames from a YouTube link (`youtube_download`), and Midjourney concepts and outcrops in the user's Chrome (`midjourney-style-reference`, `midjourney-outcrop`) | Only the user's own picture or a video file they give, and no Midjourney concepts or outcrops |
| `mcp/fal` | optional | Generated concept art when Midjourney isn't wanted (paid: ask first) | Concepts come from Midjourney or the user's own pictures |

Look for the tools named above (`mcp__<name>__<tool>` in Claude Code; a connector added in the
Claude app has a random prefix, so match on the tool's name; load deferred ones with ToolSearch).
If one is missing, say at intake what it costs and offer to install it from MediaMake ("Set up
mcp/<name> from MediaMake by following
https://github.com/microfox-ai/mediamake/blob/main/install.md"; its tools show up in the next
session), or go ahead without it.

## 1. Intake: ask before building

Collect with `AskUserQuestion` (put the recommended option first; skip what the request or the
folder already answers and say what you assumed):

1. **The video and its kind:** title, what it is about, who it is for, the one feeling it should
   leave, and **what kind of video on what kind of channel** (the three reads above; say which
   playbook you took it to be). Ask for the **transcript** if they have one (optional; save it as
   `input/transcript.txt`).
2. **The picture:** their image(s) (best), frames from the video, a concept to generate, or a
   type-only thumbnail. See step 2.
3. **The channel and its logo(s):** which channel (a brand under `brands/`?)
   and **which logos this video needs**: the channel's, plus any franchise / show / game / artist /
   sponsor logos. They can hand over files, or name them and you fetch them (step 4).
3a. **Watermarks: always ask which channel or channels to put on the thumbnail** (a song can belong
   to more than one: the channel that posts it and the artist's channel, e.g. Anime Music Zone +
   Get into Zone). Offer the brands under `brands/` as options (multi-select),
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
6. **Taste and references:** moods or colours they want or hate, anything from earlier thumbnails,
   and **channels whose thumbnails they admire or compete with** (then `mm thumbs inspire <job>
   @channel…` shows those channels' hits and misses before the board). Point them at the kind's
   review set (`/file-revision?job=inspire-<kind>`) or `thumbnails/inspiration/` when there is one,
   and read what they marked.

Questions 3a, 4 and 5 are asked even when everything else is already answered (put them in the
same `AskUserQuestion` call as the rest). Write the answers into `jobs/<job>/brief.md` (`init` makes a
template).

## 2. The picture

**The kit comes before the board** (the user, 2026-11-15: "thumbnail is not just typography and
placement but also picking the right cutouts, logos, and screenshots"). The hits are built from
real pieces; gather them first and design with them. The kind's playbook lists the pieces its hits
use ("The kit"); for most kinds:

- **the subject's real picture** (below: "Real and accurate pictures first");
- **cutouts**: the person, character or object that reacts or presents, and the result itself
  (`mm thumbs cutout`);
- **screenshots**: the tool's real screen at the moment of the result, and the result where it
  lives (a store page, a Spotify track, a search result, a map): `mm thumbs shot <job> <url>
  [--crop=x,y,w,h]` captures a page at 2× in a throwaway browser profile. Never a vendor's sample
  content that is not this video, never a mock-up of a screen; a screen only the user can open
  (their app, a signed-in page) they send as a screenshot;
- **logos**: the official mark of every tool, brand and destination in the story: `mm thumbs logo
  <job> "<name> logo"` (Wikimedia Commons, with its licence) or the maker's press kit;
- **the channel's own pieces**: its logo, series frame and signature object.

**A host holding the real product** (a mascot presenting a cover, a hand holding a phone): generate
the host holding *a solid bright chroma-key green card* (Midjourney with the mascot's reference as
`--oref`, which needs `--v 7`), then `mm thumbs swap <job> <generated.png> <real picture>
--name=<n>` puts the real picture on the card (warped, lit like it, hands kept in front), cuts the
pair out and keeps the product solid. A plain white card does not work: it is lost in its own
shading and confused with anything white (a chef's hat).

Lay the kit out on one sheet and look at it before sketching. A board without the screenshot, logo
or cutout that the kind's hits are built from is not ready to show.

In order of preference:

- **The user's image.** Measure it (`sips -g pixelWidth -g pixelHeight`). Portrait or square
  pictures: frame them with `hero.focus` / `zoom` / `offset`, or outcrop them to 16:9 with the
  `midjourney-outcrop` skill when the subject would be cut badly.
- **Frames from the video** (a file, or a YouTube link downloaded with the Browse Hack
  extension): pull candidates with exact seeks (`ffmpeg -ss <t> -i video -frames:v 1`), tile them,
  pick the most expressive face or moment. Thumbnails sell emotion: eyes, a reaction, a peak.
- **A concept to generate:** Midjourney through Browse Hack (`midjourney-style-reference` when
  they have a look in mind). fal costs money: ask first. Generate at 16:9 with room for words.
- **The media library** holds the art, outcrops and upscales of earlier rounds and productions
  (`mm media find "<song or character>" --kind=art --sheet`). Look there
  before generating or paying again. New generations go through `_INBOX` and `media ingest`
  (`apps/studio/scripts/library/README.md`).
- **No picture:** the `poster` preset (type is the picture).

**What the hero can be** (the playbook says which the kind expects):

| hero | the picture it needs | built with |
|---|---|---|
| a face or a person | one sharp, lit frame with a real expression; a cutout | `side`, `behind`, `lower`, raw layers |
| an object or product | the real thing, studio-clean; a cutout with room around it | cutout on a `fill`, a `glow`, a price `text` |
| a place | the trip's own best frame, level and bright | full `photo`, a top line, an arrow or ring |
| a screen | a real screenshot cropped to one control | `image` with `radius` and `shadow`, an arrow |
| a number or a price | none: the figure is the picture | giant `text`, a plate, the thing it measures small |
| two faces (interview, versus) | two portraits with the same crop and grade | two `photo` boxes, a centre `text`, plates |
| before / after, A vs B | two frames with the same pose and light | two `photo` boxes, a split line, a label each |
| a character, drawn or from a game | key art or the sharpest captured frame | full `photo` or cutout, the game's logo |
| a map or a diagram | drawn for the thumbnail, 3–5 elements | SVG `image` or a job `custom/` component |
| type only | none | `poster`, or raw `text` on a `fill` |

**Real and accurate pictures first** (the user, 2026-11-15: "real images and accurate should be
used"). The subject of a thumbnail is the real one, shown as it is: the reviewed product, the tool's
real screen, the dish that was cooked, the place visited, the guest, the game. Get it in this order:

1. **The user's own** pictures, frames of their video, or the real output of the work.
2. **Found**, when they have none: Google Images through Browse Hack (`google_images_bulk_start`
   with `largeOnly`, into the library's inbox), the maker's press kit, Wikimedia Commons. Check it
   is the right model, version, place or person before using it, and keep its source in `brief.md`.
   For anything public (space, science, history, museums, landmarks, public figures' press
   pictures), `mm thumbs pic <job> "<what>" [--pick=N] --subject=<library subject>` lists Commons'
   matches with size and licence, files the pick in the library and clones it into
   `input/pictures/`; public domain and CC0 need nothing, a CC BY(-SA) picture needs its credit
   line (in its `.source.json`) in the video's description. A real photo's own words must stay
   true: a museum twin is "one like this", a beam aimed at something else is not the one in the story.
   A place on Earth comes as a real globe: `mm thumbs globe <job> <lat> <lon> --name=…`.
3. **Then improve it, never replace it**: upscale a small one, outcrop it to 16:9, clean its
   ground or vary its light with Midjourney (`midjourney-outcrop`, `--edit`, upscale) or fal (ask
   first: it costs money), and compare the result with the original: the thing must still be
   exactly what it was (the same buttons, cameras, label, face).

Generated pictures are for concepts, invented scenes and subjects, and grounds, never a stand-in
for a real product, person, place or tool.

Put pictures in `input/`. For anything that goes behind or in front of words, make a cutout:

```bash
mm thumbs cutout <job> input/hero.jpg --model=birefnet-portrait   # people
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
click (a claim, a feeling, a stake, a name, a number) and say it in **as few words as the kind
uses** (the playbook's count: none for a product or a dish that speaks for itself, 1 to 3 for most,
a 4–8 word claim in sentence case for a podcast), plus at most a small kicker and a sub line. Read the transcript for the moment with the most emotion or the biggest claim; quote its
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
- Otherwise pick per style from Google Fonts by the voice the kind and the video call for, and
  **try at least two families across the variants** of a style. Starting points that work at
  thumbnail size:

| voice (where it fits) | hero fonts | second voice |
|---|---|---|
| clean, tech (reviews, tutorials, products) | Inter Tight 900, Manrope 800, Sora 800, Plus Jakarta Sans 800, Geist 900, Space Grotesk 700, Figtree 900, Onest 900 | Inter, DM Sans; thin wide-tracked caps |
| friendly explainer (education, how-to) | Poppins 800, Montserrat 900, Outfit 800, Nunito 900, Lexend 800, Red Hat Display 900, Bricolage Grotesque 800 | Caveat 700, Patrick Hand |
| code (developer tutorials) | JetBrains Mono 800, Space Mono 700, IBM Plex Mono 700, Fira Code 700 | Silkscreen 700, Pixelify Sans 700 (a pixel sub line) |
| editorial, documentary (essays, history, a science question) | Playfair Display 900, DM Serif Display, Fraunces 900, Bodoni Moda 900, Instrument Serif, Newsreader 800, Libre Baskerville 700, EB Garamond 800 | Special Elite, Courier Prime 700 (case-file labels); Montserrat 600 tracked |
| news, finance | Archivo Black, Archivo 900, Libre Franklin 900, Barlow 900, Roboto Condensed 900, IBM Plex Sans Condensed 700, Fjalla One | Roboto Slab 900, Zilla Slab 700 (a ticker line) |
| tall, punchy (any loud headline) | Anton, Bebas Neue, League Gothic, Oswald 700, Big Shoulders Display 900, Barlow Condensed 800, Saira Extra Condensed 900, Antonio 700, Sofia Sans Extra Condensed 900 | Montserrat, Inter |
| podcast, interview | Inter Tight 900, Libre Franklin 900, Archivo 900 (claims in title case); Barlow Condensed 800, Saira Condensed 900, Oswald 700 (names, numbers) | Caveat 700, Instrument Serif (a kicker) |
| sport, fitness | Anton, Teko 700, Saira Condensed 900, Kanit 900 italic, Exo 2 900 italic, Squada One, Racing Sans One, Russo One | Barlow Condensed 800 |
| gaming | Rubik 900, Rubik Mono One, Bungee, Lilita One, Chakra Petch 700, Orbitron 900, Black Ops One, Anybody 900; Press Start 2P, Pixelify Sans 700 (retro, block games) | Russo One, Silkscreen |
| fun, loud (vlogs, challenges, kids) | Luckiest Guy, Bangers, Titan One, Bowlby One, Lilita One, Fredoka 700, Baloo 2 800, Chewy, Sniglet 800, Dongle 700 | Archivo Black |
| food, lifestyle | Abril Fatface, Yeseva One, Fraunces 900, DM Serif Display, Gloock, Lobster Two 700, Pacifico | Poppins 800, Caveat Brush |
| handwritten, personal (vlogs, notes, an arrow's label) | Permanent Marker, Rock Salt, Caveat Brush, Caveat 700, Gochi Hand, Patrick Hand, Kalam 700, Shadows Into Light | — |
| calm, minimal (self-improvement, design, luxury) | Italiana, Tenor Sans, Cormorant Garamond 700, Bodoni Moda 900, Manrope 800 in lower case | thin wide-tracked caps |
| retro, vintage | Monoton, Righteous, Shrikhand, Alfa Slab One, Rye, Bungee Shade | — |
| horror, true crime | Creepster, Nosifer, Butcherman, Special Elite, Courier Prime 700 | Bebas Neue |
| cinematic, epic | Cinzel 900, Playfair Display 900, Marcellus | Cormorant Garamond italic, Montserrat 600 tracked |
| dark, legendary, demonic | Grenze Gotisch 800, Pirata One, UnifrakturCook, Metal Mania | Montserrat 600 tracked |
| wide, modern, motivational | Michroma, Unbounded 900, Syncopate 700, Krona One, Lexend Zetta | wide tracked caps |
| fast, aggressive | Kanit 900 italic, Archivo Black, Exo 2 900 italic, Russo One | Montserrat 800 |
| Telugu / Hindi / Tamil / Bengali | Dhurjati, Ramabhadra, Suranna / Teko, Rozha One, Khand, Baloo 2 800, Mukta 800, Hind 700 / Noto Sans Tamil 900 / Noto Sans Bengali 900 | Noto Sans of the script |
| Japanese / Korean / Arabic | Dela Gothic One, Reggae One, RocknRoll One, Noto Sans JP 900 / Black Han Sans, Do Hyeon / Cairo 900, Tajawal 900 | Noto Sans of the script |

Every family above is on Google Fonts at the weight given (checked 2026-11-14). A specimen of them
all at a hero word's width was read at feed size the same day: the thin and the decorated ones
(Rock Salt, Shadows Into Light, Italiana, Tenor Sans, Monoton, Bungee Shade, Nosifer) hold only as
one short word across the full width, never as a three-word line or a label; everything else reads
as a 2–3 word hero. To re-check a new family, add it to a throwaway job's text layer and look at
`sheet-small.jpg`. The kind's playbook
names which voices its hits use; a voice from another row is a way to stand out, on purpose.
Sentence or title case is right where the words are something a person said (a podcast's claim, a
question in a serif); caps for labels, orders and names.

List every family and weight in `thumbs.json` `fonts`; `render` downloads them into the job and
warns about a layer using a font that isn't listed (it would fall back to a system font).

## 6. Styles and variants

**The concept board: 6–8 styles that are genuinely different ideas** (composition, hero, device,
mood, crop), not one layout in several colours, each passing the click list above. **Draw them from
the archetypes in the kind's playbook** (each lists seven or eight, with the channels that use
them), and let at least one come from outside the kind: a quiet one on a loud kind's board, a
type-only one, the channel's own signature moment. Show the board (step 7), the user picks 2–4,
then each picked concept gets **three variants** that change the things worth testing: the words,
the font, the colour or grade, the crop, the logo spot. Give every style a `name` and an `idea`,
and every variant a short `note`: the sheet prints them. A pick straight from the board ends the
round: no forced variants.

Build from presets first (README), then `patch` / `add` / `remove`, then raw `layers`, and only
as a last resort a `custom/` component. Treatments (`"treatment": "film"`, see the README) give a whole
thumbnail a look (film, noir, vhs…) in one word; `create-music-poster` uses the same engine for
square album artwork. When a new look works and could serve other videos,
promote it into `thumbnails/presets/` (an engine change: keep it additive, re-render the demo jobs
to check nothing else moved, and add it to the README table).

Composition rules that hold in every kind (the music and edit rules, the giant word behind the
subject and the rest, are in `playbooks/music-edit.md`):

- **Text on the calm side.** Subject on one side, words on the other (`side`), or the words in a
  darkened or clean band (`lower`); a stacked block sits centred top to bottom with equal gaps.
- **Faces, eyes and the product stay clear** of words, plates and logos.
- **Devices are drawn thick**: an arrow, a ring, an underline or a plate reads at 168 px only when
  its stroke is ≥ 10 px on the 1280 canvas. One or two a thumbnail.
- **Labels sit on what they name**: a price over its product, a year over its panel, a country
  over its place.
- **The hero keeps its edge**: a dark picture on a dark ground (or a pale one on ivory) loses its
  outline and reads as half a picture; give it a fine light edge, pick a lighter picture, or
  change the ground.
- **A before / after only when the change shows at 168 px**: two near-identical pictures read
  as one picture twice.
- **Readable at feed size:** the hero must read in `sheet-small.jpg` (tiles ~250 px wide, the
  size of YouTube's feed). Kickers may blur there; the hero may not.

## 7. Render, check, show

```bash
mm thumbs init <job> [--brand=<brand>] [--title="…"]
# write thumbs.json, then:
mm thumbs render <job>
```

Fix every warning `render` prints. Then **look at `out/thumbnails/<job>/sheet.jpg` and
`sheet-small.jpg` yourself** before showing anything: the word reads (and isn't eaten by the
cutout), faces are clear, nothing clips the frame edge, the logo sits in calm space, the styles
really differ.

**Benchmark against real hits of the kind** every round: tile our thumbnails with 4–6 hits from
the kind's reference set (`mm media find "youtube-thumbnail <kind>" --kind=references`, or
`out/thumbnail-inspiration/inspire-<kind>/`), or the user's own references for this channel
(`thumbnails/inspiration/`), at feed size (168×94 and 360×202, ffmpeg `xstack`) and read it
honestly. Check the click list: one idea, the hero's size, the word count, one accent, the hero
off its ground. If ours wouldn't be clicked over theirs, rework before showing — don't hand the
user the comparison to do. Fix and re-render those IDs. Match their standard, never their design:
a thumbnail that could be mistaken for another channel's is a copy.

Then send the user `sheet.jpg` (SendUserFile), list the IDs with one line each, and give them the
`/file-revision?job=<job>` link (the `revise-image` skill). They pick **one
final** or **three for an A/B test** (YouTube Studio → Details → Thumbnail → Test & Compare takes
up to three) and comment there, or give feedback by ID in chat; both work.

## 8. Iterate and deliver

- Feedback comes by ID ("B2 but with the A1 font", "C3, logo smaller"). Change that variant, or
  add a new one: **IDs never change once the user has seen them**; new variants continue the
  numbering (A4, B4) or start a new style letter (E).
- When they like one ("I like B2, save it as it is"), lock it: `mm thumbs --
  keep <job> B2`. Its image and spec are snapshotted in `out/thumbnails/<job>/kept/`, renders skip
  it, and `render` warns if its spec ever changes. Build what they ask next as new variants.
- Write what you learned into `brief.md` (this job) and your notes (general taste:
  `mm notes add create-thumbnail "…"`, see the feedback log below).
- When they pick: `mm thumbs pick <job> B2` (or `A1,B2,D3`). The finals
  land in `out/thumbnails/<job>/final/` as JPEGs under YouTube's 2 MB limit; tell them where, and
  for an A/B test that YouTube picks the winner by watch time.
- **Three finals → three titles.** When they pick three for the A/B test, the video also gets three
  YouTube titles, one written for each thumbnail (it adds what that thumbnail doesn't say);
  `write-youtube-metadata` writes them (its step 3).

## Series

A show, a course or a podcast has a **frame** that never moves and a **slot** that changes every
episode. Decide the frame once with the user and put it in the brand's `thumbnail.json` `rules`
(or the job's `brief.md` when there is no brand): the badge or logo and its corner, where an
episode number sits and how it is set, the plate style and the accent colour, which side the host
is on. Every episode then changes only the slot: the subject, the words, the highlighted word.

- The frame is small (under a fifth of the picture) and in the same place on every episode.
- Inside it, **each episode still gets a layout made for its own story**: the frame is the
  channel's signature, not last week's composition reused.
- **The series' signature object** (the host, a mascot, a mark, episode 1's prop) is on at least
  one concept of every board: keep the first episode's composition and change the dish.
- First episodes, part 1s and openers are the series' most-clicked thumbnails: they carry the
  series' name large. Later episodes carry the episode's own hook large and the name small.

## Inspiration on demand

The playbooks are a start, not a ceiling. Pull fresh references whenever one of these holds:

- the video's kind has **no playbook**, or sits in a corner of one (a woodworking channel, a
  language-learning channel, a chess channel);
- the user **names channels** they admire or compete with;
- a **board did not land** ("none of these", "not good enough", "find better inspiration"): do
  this before a second board, not after a third.

```bash
mm thumbs inspire <set> @channel @channel …        # each channel's hits and misses (views ÷ its median)
mm thumbs inspire <set> --search="<what a viewer would type>"   # the most-viewed results for a search
```

It needs yt-dlp (no key) and takes a minute: the thumbnails are filed in the media library
(`references/youtube-thumbnails-<set>`), and `out/thumbnail-inspiration/inspire-<set>/` gets a
labelled `sheet.jpg` and a review set. Then:

1. **Find the channels**: 3–5 that make this kind of video for this audience, large and mid-size
   (the user's suggestions first; a web search or `--search` for the rest).
2. **Read the sheet yourself**: what do the hits show that the misses don't; what is the hero; how
   many words; which devices; what frame does each channel keep. Write five lines in `brief.md`.
3. **Let the user mark it** when taste is the question: send the sheet and
   `https://mediamake.microfox.app/file-revision?job=inspire-<set>` ("mark the ones you like"),
   and build the next board from what they marked.
4. For design ideas beyond YouTube (type treatments, poster layouts, colour), Pinterest and
   Dribbble through Browse Hack's bulk tabs, into the library the same way.
5. A kind that comes back gets its own playbook (a pull request; `playbooks/README.md` says how).

References set the standard and the vocabulary. They are other people's work: never copy a
layout whole, never reuse their pictures, never commit or publish them.

## Brands

A brand under `brands/<brand>/` hands its thumbnail material to jobs through
`graphics/brand/thumbnail.json` (gitignored, like the rest of the brand): `logos` (kit files and
the names they get in `assets/`), `fonts` (files + family, weight, role), `palette`, default
`params` and the brand's thumbnail `rules` (copied into each job's `brief.md`). INVERTED Devils
and Subhodayam have one. For a new brand (from `pack-brand-kit`), write it from the brand's
`brandguide.md` ("Thumbnails and titles") and `colors.json`, then make a first job with
`--brand=<brand>` to check it.

A faceless brand's **host** lives in the kit too, once the user approves it: `brands/<brand>/mascot/`
with `card/` (poses holding a chroma-green card for `thumbs swap`, each also mirrored as `-flip`),
`poses/` (cut out, pointing or presenting), `ref/` (the reference that keeps the character in new
generations), `examples/` (the round it was approved in) and a README with its rules and prompt.
`thumbnail.json` names it in `host` (`{ "name", "dir": "mascot", "copy": ["card", "poses"], "note" }`)
and `thumbs init --brand` clones those folders into the job's `input/host/`. Cook with Claude's is
Chef Claude (2026-11-15).

## Review in /file-revision

Follow the **`revise-image`** skill: it gives the user the `/file-revision?job=<job>` link, reads
their revision (finals, keeps, drops, pinned comments) and closes it with `thumbs keep`, re-renders
and `thumbs pick`. Fix each comment the way this skill works (IDs never change once seen).

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add create-thumbnail "<job / channel> · <what they said> → <the rule>"   # a new lesson, dated for you
mm notes create-thumbnail                                                         # your notes for this skill
```

When the user wants them shared, `mm notes promote create-thumbnail` offers them to this log as a pull request.

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
- 2026-10-30 · Devil in the Details (INVERTED Devils) · Picked D3 (close-up, bone DEVIL on the left) and finished the pack, then (2026-10-31): "the thumbnail skill is comparatively better, but only comparatively, the youtube thumbnails I have given as reference or the ones out there in real world are much more click baity, attractive, ours is not up to the mark" → side by side with the 13 references: ours were frames of the video (ring, wave and all) with a word at 25–35 % of the width, red on red, the face small; theirs: one giant word across 60–100 % of the width, a big lit face, a simplified background, one accent. → "What makes people click" (eight checkable rules), a concept board of 6–8 archetypes first, then 3 variants of each picked concept, and a feed-size benchmark against the references before every round is shown.
- 2026-11-02 · Cadence (INVERTED Devils) · Concept board of six (gold Cinzel CADENCE: totality frame, word behind her crown, eye strip, diamond ring in silver, vertical decree, red-lit void); I recommended A/C/F, the user picked **E1** straight from the board as the final, no variants: the title rising full height up the left edge in the video's gold serif, a small tracked kicker beside it, her big and lit on the right with the crescent, the void between left empty → keep a vertical title concept on boards for single-word song titles (≤ 8 letters), even when the horizontal bands read bigger at feed size; a pick straight from the board ends the round (no forced variants).
- 2026-11-02 · Deadpool x Kingpin (ATOMIC RAP) · Board of seven, each a lyric hook stacked in Anton (one width-fit text layer a line, as on the Quicksilver picks) beside the sharpest frame of a strong shot from the 1080p sources; the user picked **B1 · C1 · D1** straight from the board for Test & Compare (NOT TODAY beside the copper-elevator pose, DO NOT / CROSS / ME beside the stare into the lens, GLOW in gold across the glittering mask's chest) → for an edit channel whose picks are stacked lyric hooks, the board can go straight to finals; the sharpest frame of a shot (Laplacian) can miss its moment (mist, a blur mid-move): check it and pull a chosen time instead. Own checks: a picture rotated 180° didn't read as a double take; a soft frame of a kiss read as a head-butt.
- 2026-11-04 · Full Metal Heart (Anime Music Zone) · Board of eight on a back-view engraving (no face: the tattoo is the question), the title on every one in the video's own Metal Mania. Notes by ID: "use this setup but use the grunge original image" (B1's stack → the original engraving), "increase the text size" (the vertical title → full height), "big words in the background filling width and up to 20 % from bottom" (both title lines full width behind him, the stack ending at 80 % of the height) → B2 · F2 · E2, picked straight for Test & Compare. A user may want the words behind the subject bigger than the one-third-hidden rule allows: when they ask, do it and let the figure hide the middle; the video's own fonts override the brand's calm-words rule.
- 2026-11-04 · दीप जले, माँ लक्ष्मी आएँ (Omkara Swar) · Board of seven on the video's text-free poster (her left, calm maroon right): the user picked G ("the lamps": दीप saffron + जले ivory, the rest of the title under it) with "shift title to a bit down" → G2–G4 at 90 px lower; final G3 (also pushed in on her a little, zoom 1.08). For a deity poster with calm space on one side, the title stacked on the calm side with one saffron word beats the behind-the-crown giant word; the user wants the words below the top garland line, not touching it.
- 2026-11-09 · Hollow Soul (Anime Music Zone, Ulquiorra) · Built only from the user's artwork, its cutout and a frame of the video (no generations); board of eight in the video's Pirata One + #4dff7c glow, the big words from the user's list. Picked **A1 · C1 · D1** straight from the board for Test & Compare (HOLLOW / SOUL stacked on the black side, a hollow full-height 4 over ESPADA, the eyes close-up with HOLLOW and a lyric line) → with a subject on one third and black on the rest, the calm-side stack, a giant numeral for a rank or number in the name ("4th Espada") and an extreme close-up all earn a place on the board. Own checks: the white GIZ frame vanished over his bright horns (logos swapped corners: AMZ's solid glass on the bright side, GIZ on the black); a fit-each line is capped by its box height, so give a full-width word a tall box.
- 2026-11-10 · Doomcat ep. 1 (news comedy, not music) · "just create 2 thumbnail varieties its fine - this is not music but news take inspo from highly hooky thumbnails" → no board: two finished news-hook variants, one led by the real figure (€95M giant, kicker + joke line) and one by the punchline in the show's own comic speech bubble (IT SAID / PLEASE.); the user picked the quote reworded "go with 'AI said please'" (B2). For a show built in code, render the host straight from the engine on the brand's plain paper (set emptied through Episode's `dress`, lettering off: projects/doomcat-desk-wide-thumbs) rather than cutting him out of busy frames; a thin ink outline keeps a pale brand pink word readable at feed size.
- 2026-11-10 · Doomcat ep. 1 · B2 on the brand's pale paper "is not looking powerful, blackground with white circle around the cat gives the best feel like youtube pfp", then "remove the watermark … 'AI SAYS PLEASE' … expand circle so ears are inside the circle … the handheld device in pink color" → for Doomcat the channel's profile-picture look wins over the kit's pale-ground rule: ink ground, a cream disc behind him with his ears inside it, cream + pink words, no watermark, a prop he holds recoloured to the accent so it reads against his black coat (B5). Feed size: the dark versions beat the pale ones clearly.
- 2026-11-11 · Doomcat ep. 2: 'it will not stop scroll me, if the text is not super large' → the headline fills the top third (two lines, width-fit across the frame); 'place her on his shoulder spot, that's just empty space unutilised' → fill the empty space beside the subject with the second subject; 'doomcat should still be there … more prominent' → the channel's host big in every variant
- 2026-11-11 · Doomcat Shorts: 'create with jensen picture in the thumbnail somewhere, cat still stays predominant' → the subject as a ringed portrait (≈30% of the frame's width, face centred) in the free corner of the host's disc; the host stays the biggest thing
- 2026-11-11 · Doomcat Shorts, revised: 'all thumbnails look bad … jensen … it is the hook … put cat smaller at bottom center and put the jensen at center circle (use cutouts)' → the story's subject cut out big in the centre disc as the hook, the host smaller in front at the bottom centre (not a small portrait in a corner)
- 2026-11-12 · Final Showdown: 'no text in thumbnail' then 'i need youtube thumbnail with jiren in background image' → for a character poster, the no-text set includes the character's name-letters as art behind him (art + letters + cutout from the full-res layers), close and wide crops
- 2026-11-14 · skill · "most of the thumbnails we designed is for music and song … it will not suit other kind of channels … the thumbnail is core to 3 things - the type/content/stuff of video, the type/style of video, the type/content/context of channel … search for better thumbnail inspiration if user is not satisfied … add more fonts" → the three reads; a playbook per kind of channel (`playbooks/`, from 550 hits and misses of 50 leading channels over ten kinds, plus news); `mm thumbs inspire` for references on demand; heroes beyond a lit face (object, place, screen, number, two faces, before/after, character, map); the font table by voice (21 rows, every family checked on Google Fonts); series frames. The music and edit rules moved to `playbooks/music-edit.md` unchanged. Finding that reshaped the click list: faces, words and dark grounds are as common on misses as on hits; what differs is how fast one concrete idea reads small.
- 2026-11-15 · iteration 1 (tech review, invented $99 phone) · "move on the next" + "real images and accurate should be used (for example user can give or you can use google images & then upscale/variate using midjourney/fal)" → "Real and accurate pictures first" in step 2.
- 2026-11-15 · iteration 2 (Cook with Claude, /create-music-poster) · "No, rework it" without notes. Own check against real tutorial hits: round 1's words were puns and process words at a third of the width, the output was spread over three to six small covers, and the series' spark was missing → round 2 named the output in two giant words (ALBUM / COVER.), showed one cover at ~78 % of the height, and kept episode 1's composition with this episode's dish. Rules: the hero keeps its edge; a before/after only when the change shows small; a series' signature object on every board.
- 2026-11-15 · iteration 2, round 2 · "they are still not good enough (the source ideas u picked were 100% more engaging) thumbnail is not just typography and placement but also picking the right cutouts, logos, and screenshots to show in a software tutorial" → "The kit comes before the board" in step 2, a kit list in every playbook, and two commands to gather it: `thumbs shot` (a real page at 2×) and `thumbs logo` (an official logo from Commons). Round 3 was rebuilt from a kit: the released songs' real Spotify pages, the official Claude, Spotify and DistroKid logos, and the cover characters cut out, composed on the hits' recipes (a title plate, the tool's logo card, a real screen and a figure presenting it; a figure breaking out of the screen; a borrowed face under the tool's badge; logos as app tiles around a figure).
- 2026-11-15 · iteration 2, round 3 · "the album cover is the product not the host (i think you are mistaking that) if there is no host or is basically a faceless channel, at least pose a mascot of sorts or use a famous person as host but there should be a relation and the text on thumbnail should explain the relation" → "The product and the host are two different things" under the click rules; round 3 had used the cover's characters (Gojo, Grimmjow) as hosts. Round 4 gives Cook with Claude a mascot made from episode 1's 3D spark (Chef Claude, Midjourney with the spark as its reference) holding the real covers, with words that say the relation.
- 2026-11-15 · iteration 2, round 4 · "putting the poster behind the character is bad, take a look in none of the ideas u picked, they did that, and also text size was bigger (at least one word should make an impact on the user)" → the product is never behind the host (beside, or held out in front, whole); one word always giant even inside a sentence. Round 5 regenerates Chef Claude holding the card out in front (chest, palm, beside the face) and sets one impact word at 60 %+ of the width.
- 2026-11-15 · iteration 2, round 5 · "Add chef Claude to brandkit and move to next" → round 5 approved (T1 COVER. · U1 COOKED · V1 CLAUDE · W1 COVER, each cover held in front, words → product → host). The mascot went into the brand kit (`brands/cookwithclaude/mascot/`) and `thumbnail.json` got a `host` that `thumbs init --brand` copies into `input/host/` ("Brands").
- 2026-11-15 · iteration 3 (science explainer, "We Left a Mirror on the Moon", invented faceless channel) · board of seven on real NASA and Smithsonian pictures, fetched with the new `thumbs pic`; the user picked A, B, C, E, G, then "i like all of them" for all fifteen variants → approved. The kit was all public domain or CC0, the host a famous person with a real relation (Aldrin, the crew) with the product in front, one giant word everywhere, and words kept true to the picture (the museum unit is "one like this"). Passed over: a real laser photo aimed at something else, and drawn beams on a composite (`playbooks/science-explainer.md`, "Approved in the rounds").
- 2026-11-15 · iteration 4 (documentary essay, "Point Nemo: Where Spacecraft Go to Die", invented map-led channel) · board of seven on real NASA pictures, globes rendered with the new `thumbs globe`, Jules Verne as the host; "all look good" → approved straight from the board, no variants. What held is in `playbooks/documentary-essay.md` ("Approved in the rounds").
- 2026-11-15 · iteration 5 (finance, "The Penny Is Dead", invented money-news channel) · board of six on the U.S. Mint's penny, Lincoln's 1863 portrait as the host and real coin photos, every figure checked first; "All look good" → approved straight from the board. What held is in `playbooks/finance-business.md` ("Approved in the rounds").
