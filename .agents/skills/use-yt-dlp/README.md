---
description: Download a video, its sound, a part of it, its thumbnail or subtitles with yt-dlp, on a Mac or Windows, straight into your media library at 720p, skipping what you already have.
tags: yt-dlp, youtube, download, video download, audio, footage, subtitles, thumbnails, media library
nature: shared-use
type: mcp-use
---

# Use yt-dlp

Give Claude a link, a search or a playlist and say what you want from it: the video, just the sound, one
minute of it, its thumbnail or subtitles. Claude sets yt-dlp up the right way for your computer, checks
your media library first, downloads only what you have the right to use (your own uploads, Creative
Commons, licensed material), at 720p unless you ask for more, and files it in the library with where it
came from.

## How to use

1. Say what you want, for example:
   - **download this video:** `https://youtu.be/…`
   - **get the audio of this as a WAV**
   - **just 1:10 to 1:40 of it**
   - **download my last 5 Shorts**
   - **the top 3 YouTube results for "big buck bunny", with their thumbnails**
   - **what formats and licence does this video have?**
2. The first time, Claude says what it will install (yt-dlp, with Homebrew on a Mac or winget on
   Windows) and installs it. An old yt-dlp is updated, since YouTube breaks old versions.
3. When it isn't clearly yours to use, Claude asks before downloading. For a playlist or anything big,
   it says how much will come down first.
4. The file lands in your media library, ready for any production: `mm media find` shows it.

## What it uses

- **yt-dlp**: does the downloading. `mm doctor --fix` installs and updates it.
- **ffmpeg**: joins the video and its sound, cuts a part, converts the audio.
- **The media library** (`mm media`): the inbox, the source of every file, and the check for what you
  already have. Without one, files go to the production's own folder instead.

## What the skill outputs

Files in your media library, each with where it came from:

- a video, 720p H.264 MP4: `footage/doomcat/shorts/shorts-grok-bot-worked-night-shift-1080p.mp4`
  (720×1280, from `youtube` `9S9ujP96w3g`, by DOOMCAT)
- its thumbnail: `references/youtube-thumbnails-misc/9S9ujP96w3g.jpg`
- the sound alone (`.m4a`, `.wav`, `.mp3` or the source's `.opus`), filed under `music/`
- subtitles (`.srt`) and the video's details (`.info.json`) in `out/yt-dlp/` of your workspace, or a
  folder you name
