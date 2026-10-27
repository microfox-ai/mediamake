---
name: write-youtube-metadata
description: Write the YouTube title and description for a song on one of the user's music channels (a brand under apps/lyrics_videos/brands/, e.g. INVERTED Devils, Subhodayam) from the song's title and its lyrics.json (or any lyrics file). The description is a 2-line intro to the song, the plain lyrics (no timestamps, no section labels), a 1-line outro about the channel and at most 5 hashtags, in the channel's voice; checked against YouTube's limits and saved as title.txt / description.txt. Use when the user says "YouTube title and description for <song>", "write the description with lyrics", "YouTube metadata", "/write-youtube-metadata", or as the metadata step of pack-youtube. Append new user feedback to the log at the bottom.
---

# write-youtube-metadata

A song's YouTube title and description, written in the channel's voice. Everything is plain text
the user pastes into YouTube Studio → Details. The helper `scripts/ytmeta.py` (Python, standard
library only) pulls the plain lyrics and checks the result; the words themselves are yours.

```bash
M=.claude/skills/write-youtube-metadata/scripts/ytmeta.py
```

**Output folder:** the pack folder when `pack-youtube` runs this skill, otherwise
`apps/lyrics_videos/out/youtube/<slug>/` (gitignored). It holds `lyrics.txt`, `title.txt`,
`description.txt` and `metadata.json`.

## 1. Inputs

- **Song title** (as the user wrote it) and the **lyrics file**: a mediamake `lyrics.json` (a
  transcription: `captions` with times, sometimes the written `sunoLyrics`), a plain caption list,
  or `.txt` / `.md` / `.lrc`. A release folder's `distrokid_lyrics.md` is already plain: use it
  as it is.
- **The channel.** Which brand under `apps/lyrics_videos/brands/` (ask if it isn't clear; one
  `AskUserQuestion` with the brands as options). Read from it, once:
  - `brandguide.md`: "Voice and tone (titles, descriptions, posts)" and the **Titles** line of
    "Thumbnails and titles (house style)",
  - `youtube/channel-description.md`: what the channel promises, the schedule, the short version.
  - `youtube/description-template.md`, when the brand has one: the user's own description layout,
    which replaces step 4's (ATOMIC RAP: credits, a fair-use block, its own hashtags; no lyrics).
  A channel without a brand folder: ask for its name and one line on what it is.
- Optional, use when given: artist / feat. credits, what the song is about, the thumbnail's
  words (from `pack-youtube`), the language (Telugu, Hindi…).
- **The lyrics in the description: always ask** (in the same `AskUserQuestion` as anything else
  open): keep the full lyrics, or leave them out. Never decide it yourself. Without lyrics the
  description is the intro, the outro and the hashtags (step 4), checked with `check --no-lyrics`.

## 2. Plain lyrics

```bash
python3 $M lyrics <lyrics file> --out=<out>/lyrics.txt
# a project's sections make better stanzas for timed captions:  --sections=<project>/input/project.json
# force a source:  --source=captions | --source=written
```

The script prefers the written lyrics (labels such as `(Intro)`, `**(Verse 1)**`, `[Chorus]`,
`x2` taken out, a blank line where a section started) and falls back to the captions (one per
line, a new stanza after a pause or a section). Then **read `lyrics.txt` yourself and tidy it**:

- One blank line between verses and choruses; split a stanza longer than ~12 lines where the
  section obviously turns (a chorus coming back, a new rhyme run).
- Capitalise the first letter of each line; a line that runs on ("angel in the disguise," after
  "Devil in the details,") may stay lowercase if that's how it was written. No section labels,
  timestamps, singer names, markdown or links.
- Repeats written out as they are sung (the captions show how many times).
- **Never change the words.** When the written lyrics and the captions disagree, the written
  lyrics win (the captions are a transcription); tell the user about real differences (a verse
  that isn't sung, a line sung differently) and ask which to use.
- Explicit words stay as sung, uncensored, unless the user says otherwise.

Save the tidy version back to `lyrics.txt`: the check compares the description against it.

## 3. Title

Follow the brand's titles rule first (INVERTED Devils: the song's name, then a short feeling —
"Inexorable · for late nights"; Subhodayam: the song and deity in Telugu, then English, then the
moment). Without a rule: `<Song> · <artist or a short feeling>`, plus `(Lyrics)` /
`(Lyric Video)` when it is one.

- At most 100 characters (YouTube's limit); keep the part that matters inside the first ~60
  (search and the feed cut there).
- No clickbait, no all-caps shouting, no emoji, no hashtags, no `<` or `>`.
- Work with the thumbnail, don't repeat it: when the thumbnail's words are known, the title adds
  the song's name and the feeling the thumbnail doesn't say.

Write the one you recommend to `title.txt`, and two alternatives into `metadata.json`.

**Three thumbnails → three titles.** When the video goes out with three thumbnails for YouTube's
A/B test (Test & Compare), write three titles, one per thumbnail, each adding what its thumbnail
doesn't say (`titles.txt`: one line per thumbnail, `<thumbnail file> · <title>`; `metadata.json`
`titlesByThumbnail`). The user's chosen title stays `title.txt` and is paired with the thumbnail it
suits best. Every title passes the same rules (≤ 100 characters, the point inside ~60).

## 4. Description

**When the brand has `youtube/description-template.md`, fill that in instead** (its spacing and fixed
text exactly as they are, only the `<…>` parts change) and skip the rest of this step. Otherwise,
exactly this layout, blocks split by one blank line:

```
<intro line 1>
<intro line 2>

<the plain lyrics from lyrics.txt, stanzas split by one blank line>

<one line about the channel>

#tag1 #tag2 #tag3 #tag4 #tag5
```

- **Intro, 2 lines:** what the song is and the feeling or moment it is for, in the channel's
  voice (simple words, short sentences, a little mystery; Subhodayam: Telugu first, then a short
  English line). The first ~150 characters show under the video and in search, so line 1 carries
  the song's name or what it is about. No "Lyrics:" heading, no emoji walls.
- **Lyrics:** `lyrics.txt` verbatim, only when the user wants the lyrics in (step 1). Left out, the
  description is just the intro, the outro and the hashtags, split by blank lines.
- **Outro, 1 line:** the channel's promise and schedule, from `channel-description.md` ("Inverted
  Devils · deep female vocals, new music every Monday & Saturday. Subscribe so you catch the
  next one."). No links unless the user gives them.
- **Hashtags, at most 5, on the last line:** YouTube shows the first three above the title, so
  order them: the song (`#Inexorable`), the artist or channel, then the genre / mood / language
  people search (`#DarkPop`, `#TeluguDevotional`, `#LyricVideo`). CamelCase, no spaces or
  punctuation inside a tag, no repeats, nothing misleading, no hashtags anywhere else.

The description must stay under 5000 bytes: Telugu and Hindi letters take 3 bytes each, so a long
Telugu song may not fit; then ask the user (shorten to the first verses and chorus, or drop the
lyrics' repeats).

## 5. Check and show

```bash
python3 $M check <out>          # title.txt + description.txt against lyrics.txt
python3 $M check <out> --no-lyrics   # when the user left the lyrics out
python3 $M check <out> --free        # a brand's template or the user's own text: YouTube's limits only
```

Fix every `error:` and look at each `warning:`. Write `metadata.json`:

```json
{ "song": "Inexorable", "channel": "inverteddevils", "language": "en",
  "title": "…", "titleAlternatives": ["…", "…"], "hashtags": ["#…"],
  "lyricsSource": "written lyrics (sunoLyrics)", "notes": "…" }
```

**Always preview and ask for suggestions:** show the user the title (and the two alternatives) and
the description in one code block each, ready to paste, with the folder path, and ask what they
would change in the title (an `AskUserQuestion` with the title and the alternatives as options, or
the turn's closing question). Nothing is final until the user has seen it and answered, even when
they gave the title themselves. Changes they ask for go into the files, then run the check again.

## Feedback log

Add entries at the bottom: date · song / channel · what they said → the rule.

- 2026-10-24 · skill · Asked for the skill: a title and a description per song; the description has the plain lyrics, at most 5 hashtags, a 2-line intro to the song and a 1-line outro about the channel → this skill, `ytmeta.py lyrics` / `check`.
- 2026-10-25 · Just Hit It (ATOMIC RAP) · "for youtube title and thumbnail always preview and ask for user suggestions. ask if the lyrics have to be kept in description or if not needed." → step 1 always asks whether the lyrics go in; step 5 always previews the title and description and asks for suggestions; `check --no-lyrics` for a description without lyrics.
- 2026-10-25 · Breaking Bad x Dangerous (ATOMIC RAP) · The user set the title "Breaking Bad x Dangerous (NEFFEX)" → ATOMIC RAP edit titles: `<footage> x <song> (<artist>)`, with the plain x as the user types it; the description's first line follows the title's spelling.
- 2026-10-25 · Breaking Bad x Dangerous (ATOMIC RAP) · The user saved their own final description: the title's pair and the story on line 1, then "Media From / Music Track / Music Credits", a fair-use block (Section 107), the schedule line and `#aurafarming #edit` + song, artist, footage, hero (6 tags) → saved as the brand's `youtube/description-template.md`, which replaces step 4's layout for ATOMIC RAP; `check --free` checks only YouTube's limits (≤ 15 hashtags, none repeated) for a layout of the brand's or the user's own.
- 2026-10-27 · Nakama! (Anime Music Zone) · "if doing 3 thumbnail variations, then give three YouTube titles as well" → step 3's three titles, one per thumbnail (`titles.txt`, `titlesByThumbnail`).
