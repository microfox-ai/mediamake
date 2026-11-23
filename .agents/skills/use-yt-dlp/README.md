---
description: Research and download videos with yt-dlp on a Mac or Windows. Find which videos did best, read transcripts and top comments, watch channels for new uploads, and bring what you may use into your media library at 720p, skipping what you already have.
tags: yt-dlp, youtube, research, transcripts, comments, channel analytics, watch channels, download, audio, chapters, sponsorblock, live stream, media library
nature: shared-use
type: mcp-use
---

# Use yt-dlp

Give Claude a channel, a search, a playlist or a link and say what you want to know or keep. It can tell
you which videos did best and what they share, read you what a video says and what its comments agree on,
keep an eye on channels for new uploads, and download what you have the right to use (your own uploads,
Creative Commons, licensed material) into your media library at 720p unless you ask for more. Claude sets
yt-dlp up the right way for your computer first.

## How to use

1. Say what you want, for example:
   - **which of @somechannel's videos did best in the last 3 months, and what do they have in common?**
   - **get the transcript of this video and summarise it with timestamps**
   - **what are people saying in the comments of these 5 videos?**
   - **the top 10 YouTube results for "ai news this week", with views and likes**
   - **watch these 4 channels and tell me what they post each morning**
   - **back up my channel's Shorts into my library**
   - **download this video**, **just 1:10 to 1:40 of it**, **the audio as a WAV**
   - **split this lecture into its chapters**, **without the sponsor parts**
   - **record this live stream from the start**
2. The first time, Claude says what it will install (yt-dlp, with Homebrew on a Mac or winget on
   Windows) and installs it. An old yt-dlp is updated, since YouTube breaks old versions.
3. Research reads only and downloads nothing; comments come without their authors' names. For a
   download, Claude asks first when it isn't clearly yours to use, and for anything big it says how
   much will come down.
4. Research lands in a folder you can open (a table, best first, and a page a video). Downloads land in
   your media library, ready for any production: `mm media find` shows them.

## What it uses

- **yt-dlp**: reads and downloads. `mm doctor --fix` installs and updates it.
- **ffmpeg**: joins the video and its sound, cuts parts and chapters, converts the audio.
- **The media library** (`mm media`): the inbox, the source of every file, and the check for what you
  already have. Without one, downloads go to the production's own folder instead.
- **SponsorBlock**: the community's marks of sponsor segments, only when you ask to cut or mark them.
- **mm transcribe** (ElevenLabs), only for a video with no captions and only after you say yes to its
  price.

## What the skill outputs

- **A research folder** (`research/yt-dlp/<name>/` in your workspace): `index.md`, a table best first, as
  in this run on three Doomcat Shorts:

  | # | Date | Title | Views | Likes | Length | Score |
  |---|---|---|---|---|---|---|
  | 1 | 2026-11-19 | The Viral AI Jobs Clip Left Out One Word | 483 | 9 | 1:03 | ×5.55 |
  | 2 | 2026-11-19 | AI Found a Hole in Java in an Hour | 87 | 2 | 0:57 | ×1 |

  and a page a video with its numbers, licence, chapters, description, transcript (`[0:31] doing them
  comes later…`) and top comments.
- **A watch list's feed** (`research/watch/<list>/`): a research folder for each run's new videos, and
  a log of the runs.
- **Files in your media library**, each with where it came from: a 720p H.264 video
  (`footage/doomcat/shorts/shorts-grok-bot-worked-night-shift-1080p.mp4`, 720×1280), its thumbnail
  (`references/youtube-thumbnails-misc/9S9ujP96w3g.jpg`), the sound alone, or one file a chapter
  (`001 Best animation award.m4a`, `002 Best design award.m4a`, …).
