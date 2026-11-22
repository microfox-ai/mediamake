---
name: use-yt-dlp
description: Download videos, their sound, thumbnails, subtitles and metadata with yt-dlp, on macOS and Windows — set yt-dlp up the right way for the computer (Homebrew, winget or uv, with ffmpeg and a JavaScript runtime), look a video, a channel, a playlist or a search up before downloading, then download only what the user has the right to use, at 720p or less unless they ask for more, into the media library's inbox with a source sidecar beside each file, and file it with mm media ingest, skipping what the library already has. Use when the user says "download this video / this YouTube link", "get the audio / the song from this video", "just 1:10 to 1:40 of it", "download my own uploads / my Shorts", "the top 3 YouTube results for …", "the first 5 of this playlist", "download its thumbnail / subtitles / transcript file", "what formats does this video have", "get this video's details / metadata", "install / update yt-dlp", "yt-dlp isn't working", "/use-yt-dlp", or when another skill needs footage or a song from a video site. Not for Instagram, Pinterest or Suno (Browse Hack has those), a channel's thumbnails as references (mm thumbs inspire), or a channel's titles and transcripts for research (mm yt-grab).
metadata:
  version: 0.1.0
---

# Use yt-dlp

yt-dlp downloads from YouTube and about a thousand other sites. This skill sets it up, looks before it
downloads, and lands every file in the media library the way the library expects: in the inbox, with
`<file>.source.json` beside it, then `mm media ingest`. Read `mm notes use-yt-dlp` before planning.

## The rule: only what the user has the right to use

Download only what the user may use: their own uploads, videos under a Creative Commons licence or in
the public domain (yt-dlp's `license` field says "Creative Commons Attribution license (reuse allowed)";
keep the credit it asks for), stock and music they licensed, or material whose owner gave permission.

- Anything else, **ask** before downloading: whose it is and whether they may use it. A clip only
  studied (an edit, a style) is a reference: it never goes into a video.
- Never get around a paywall, a membership, DRM or a private video that isn't theirs. Sign in
  (`--cookies-from-browser`) only on the user's word, for their own account's videos.
- Follow the site's terms. Don't hammer a site: lists in small batches, one run at a time.

## 1. Set up yt-dlp

Check: `yt-dlp --version` (a date, like 2026.10.26) and `ffmpeg -version`. On a computer with the
MediaMake checkout, `mm doctor` says the same in its yt-dlp line, and `mm doctor --fix` does the install
or update below by itself.

Say what you are about to install, in one line, before installing. Then:

| | Install | Update | Notes |
| --- | --- | --- | --- |
| macOS | `brew install yt-dlp` | `brew upgrade yt-dlp` | no Homebrew: ask before installing it (it asks for the password), or use uv |
| Windows | `winget install --id yt-dlp.yt-dlp -e --source winget` | `winget upgrade --id yt-dlp.yt-dlp -e --source winget` | add `--skip-dependencies` when `ffmpeg -version` works: winget would add its own ffmpeg and Deno |
| any (uv) | `uv tool install "yt-dlp[default]"` | `uv tool upgrade yt-dlp` | `uv tool update-shell` once, if `~/.local/bin` isn't on the PATH |
| standalone binary | — | `yt-dlp -U` | a downloaded `yt-dlp.exe` or `yt-dlp_macos` updates itself |

- ffmpeg joins the video and the sound and converts audio: `brew install ffmpeg`, or
  `winget install --id Gyan.FFmpeg -e`.
- yt-dlp needs a JavaScript runtime for YouTube. Deno is its default; Node (which MediaMake has) works
  with `--js-runtimes node`, which `scripts/get.mjs` always passes. Pass it to plain `yt-dlp` commands too.
- Older than two months: update it before anything else. YouTube breaks old versions.
- Just installed on Windows and `yt-dlp` isn't found: the terminal's PATH is from before the install.
  `scripts/get.mjs` and mm find it anyway (WinGet\Links); for a plain command, use a new terminal or
  the full path `%LOCALAPPDATA%\Microsoft\WinGet\Links\yt-dlp.exe`.

## 2. Look before downloading

1. **The library first.** `mm media find "<title words>"` (and `--kind=footage`/`music`). It already has
   it: use that copy (`mm media use <id> <slug>`). `scripts/get.mjs` checks this too.
2. **What it is**, nothing downloaded:
   - one video: `yt-dlp --js-runtimes node --print "%(title)s | %(channel)s | %(duration_string)s | %(license)s" <url>`
   - every field: `yt-dlp --js-runtimes node -J <url>` (JSON: title, description, chapters, tags, views, license)
   - its formats: `yt-dlp --js-runtimes node -F <url>`
   - a search: `yt-dlp --flat-playlist --print "%(id)s  %(title)s" "ytsearch5:<words>"`
     (`ytsearchdate5:` for the newest)
   - a playlist or a channel: `yt-dlp --flat-playlist --print "%(playlist_index)s %(id)s %(title)s" <url>`
3. **Show the user** what you found when it isn't exactly what they named (a search's picks, a
   playlist's size, the licence), and agree on what to take before downloading.

## 3. Download into the inbox

`node "<this skill's folder>/scripts/get.mjs" <url | ytsearchN:words>… [options]` downloads, writes the
sidecar, and files each file with `mm media ingest`. `--help` lists every option.

| The user wants | Options |
| --- | --- |
| the video | (none): 720p or less, H.264 and AAC in an MP4, stereo |
| more than 720p (only when they ask) | `--height=1080` |
| the sound | `--audio` (its own format), `--audio=wav` for analysis or stems, `--audio=mp3` / `m4a` |
| a part | `--sections="*1:10-1:40"` (cuts at the nearest keyframes) |
| a search's top N | `"ytsearch3:<words>"` |
| N of a playlist or channel | `--max=N` (`--playlist` for a watch link's playlist); a list without `--max` or `--all` stops and lists it |
| a set kept together | `--set=<name>` (`_INBOX/<site>/<name>/`) |
| the thumbnail too | `--thumb` (filed under `references/<site>-thumbnails-<set>`) |
| subtitles or the metadata file | `--subs` (`--subs=fr.*`), `--info`: into `--extras=<folder>`, by default `<workspace>/out/yt-dlp/` (a project's `input/` is often better) |
| how the library files it | `--kind=footage --subject=<franchise>/<character> --channel=<id> --tags=a,b` |
| look only | `--dry` (title, format, size) |

- Big downloads (a playlist, an hour of video, more than 720p): `--dry` first and tell the user the size.
- The sidecar (`mediamake.source/v1`): `tool` is the site (`youtube`, like Browse Hack's downloads),
  `ref` its id, then `url`, `title`, `author`, `query` (a search's words), `height`, `fps`,
  `downloadedAt`, and as extras `via: yt-dlp`, `duration`, `license`, `uploadDate`, `channelUrl`,
  `section`. The library knows the video by `tool` + `ref`, from yt-dlp and Browse Hack alike.
- `--no-ingest` leaves the files in the inbox; `mm media ingest` files them later.
- A production then takes a clone: `mm media use <id|path> <slug> --as=input/footage/<name>.mp4`.
- Anything yt-dlp itself takes goes after `--`: `… -- --cookies-from-browser firefox` (on the user's
  word only), `--limit-rate 2M`, `--remote-components ejs:github`.

## 4. Without the library, or in a cloud session

No media library here (a cloud session, a new computer): download into the production's own folder,
with the same choices, and tell the user nothing was filed:

```bash
yt-dlp --js-runtimes node -S "res:720,vcodec:h264,channels:2,acodec:aac" --merge-output-format mp4 \
  -P "<project>/input/footage" -o "%(title).120B [%(id)s].%(ext)s" "<url>"
```

YouTube often refuses cloud machines ("Sign in to confirm you're not a bot"): then the download
waits for a computer (a to-do), never a sign-in from the cloud.

## When it goes wrong

| It says | Do |
| --- | --- |
| `Requested format is not available`, `HTTP Error 403`, `Signature extraction failed`, nsig / n challenge | update yt-dlp (step 1), then try again |
| `No supported JavaScript runtime` / missing challenge solver | `--js-runtimes node`; if it asks for the solver scripts, `-- --remote-components ejs:github` (yt-dlp's own, from GitHub) |
| `Sign in to confirm you're not a bot`, `429` | wait and try fewer at a time; on a cloud machine, leave it for a computer |
| `Video unavailable`, private, members only | not theirs to download: tell the user |
| `ffmpeg not found`, a 360p file with no merge | install ffmpeg (step 1) |
| `yt-dlp` not found right after installing | a new terminal (Windows: the PATH from before the install); `get.mjs` finds it anyway |

## Where it runs

| Step | Needs | A person's yes | Safe to repeat | Without it |
|---|---|---|---|---|
| 1. Set up yt-dlp | nothing | no | yes | - |
| 2. Look before downloading | nothing | no | yes | - |
| 3. Download into the inbox | media:library | no | yes | into the production's own input folder, unfiled |
| 4. File it in the library | media:library | no | yes | skipped: the files stay with the production |

Downloading what isn't the user's own or openly licensed waits for their yes (the rule at the top).
YouTube often refuses cloud machines; a download refused there waits for a computer.
