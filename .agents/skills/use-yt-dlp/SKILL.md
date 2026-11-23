---
name: use-yt-dlp
description: Download and research videos with yt-dlp, on macOS and Windows — set yt-dlp up the right way for the computer (Homebrew, winget or uv, with ffmpeg and a JavaScript runtime); research videos, channels, playlists and searches without downloading them (details, views, likes, a score against the channel's median, chapters, licences, transcripts from captions, top comments without their authors); watch lists of channels for new uploads (a feed of their details and transcripts, or a backup of the user's own channel); and download only what the user has the right to use — the video at 720p or less unless they ask for more, just the sound, a part, one file a chapter, with sponsor segments cut, a live stream from its start, thumbnails and subtitles — into the media library's inbox with a source sidecar beside each file, filed with mm media ingest, skipping what the library already has. Use when the user says "download this video / this YouTube link", "get the audio / the song from this video", "just 1:10 to 1:40 of it", "split it by chapters", "cut the sponsor parts", "record this live stream", "download my own uploads / back up my channel", "the top 3 YouTube results for …", "research this channel / these videos", "which of their videos did best", "get the transcript of this video", "what are people saying in the comments", "videos about … from the last month", "watch these channels for new uploads", "what did they post this week", "summarise this video", "what formats / licence does this video have", "install / update yt-dlp", "yt-dlp isn't working", "/use-yt-dlp", or when another skill needs footage, a song, a transcript or a channel's numbers from a video site. Not for Instagram, Pinterest or Suno (Browse Hack has those), or a channel's thumbnails as design references (mm thumbs inspire).
metadata:
  version: 0.2.0
---

# Use yt-dlp

yt-dlp reads and downloads from YouTube and about 1,700 other sites. This skill sets it up, researches
videos without downloading them, watches channels for new uploads, and lands every download in the media
library the way the library expects: in the inbox, with `<file>.source.json` beside it, then
`mm media ingest`. Read `mm notes use-yt-dlp` before planning.

Its scripts are in `<this skill's folder>/scripts/`: `get.mjs` (downloads), `research.mjs` (details,
transcripts, comments), `watch.mjs` (watch lists). Each takes `--help`. Run them with `node`.

## The rules: what may be downloaded, and how others' words are used

- **Download only what the user may use:** their own uploads, videos under a Creative Commons licence or
  in the public domain (the `license` field says "Creative Commons Attribution license (reuse allowed)";
  keep the credit it asks for), stock and music they licensed, or material whose owner gave permission.
  Anything else, **ask** before downloading: whose it is and whether they may use it. A clip only studied
  is a reference: it never goes into a video.
- **Research reads, it doesn't take.** Details, numbers, transcripts and comments of anyone's public
  videos may be read for research. What comes out is the user's notes and briefs, never a copy of
  someone's work: quote a line or two, with the video it came from.
- **Comments stay anonymous.** `research.mjs` never keeps who wrote a comment. Quote comments short,
  never by name, and never to single a person out.
- Never get around a paywall, a membership, DRM or a private video that isn't theirs. Sign in
  (`--cookies-from-browser`) only on the user's word, for their own account's videos.
- **Be gentle with the site.** Small lists (`--max`), one run at a time, a watch run a few times a day at
  most. The scripts wait between requests.

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

- ffmpeg joins the video and the sound, cuts parts and chapters, converts audio: `brew install ffmpeg`,
  or `winget install --id Gyan.FFmpeg -e`.
- yt-dlp needs a JavaScript runtime for YouTube. Deno is its default; Node (which MediaMake has) works
  with `--js-runtimes node`, which the scripts always pass (with `--encoding utf-8`, so Windows keeps
  "—" and "é"). Pass both to plain `yt-dlp` commands too.
- Older than two months: update it before anything else. YouTube breaks old versions.
- Just installed on Windows and `yt-dlp` isn't found: the terminal's PATH is from before the install.
  The scripts and mm find it anyway (WinGet\Links); for a plain command, use a new terminal or the full
  path `%LOCALAPPDATA%\Microsoft\WinGet\Links\yt-dlp.exe`.

## 2. Look before anything

1. **The library first.** `mm media find "<title words>"` (and `--kind=footage`/`music`). It already has
   it: use that copy (`mm media use <id> <slug>`). `get.mjs` checks this too.
2. **One question about one video**, nothing written:
   `yt-dlp --js-runtimes node --print "%(title)s | %(channel)s | %(duration_string)s | %(license)s" <url>`,
   its formats `yt-dlp --js-runtimes node -F <url>`, everything `yt-dlp --js-runtimes node -J <url>`.
3. **A search, a playlist or a channel's list:**
   `yt-dlp --flat-playlist --print "%(id)s  %(title)s" "ytsearch5:<words>"` (`ytsearchdate5:` newest
   first), or a channel's `https://www.youtube.com/@handle/videos` (`/shorts`, `/streams`).
4. **Show the user** what you found when it isn't exactly what they named (a search's picks, a list's
   size, the licence), and agree on what to take before downloading.

## 3. Research: details, scores, transcripts, comments

`node research.mjs <video | @handle[/shorts] | channel or playlist link | ytsearchN:words>… [options]`
writes a research folder, `<workspace>/research/yt-dlp/<name>/` (or `--out=<folder>`):

- `index.md`: a table of every video (date, title, channel, views, likes, comments, length, score),
  best first. The **score** is views ÷ the median of the same channel's videos in the set (three or
  more): ×3 did three times as well as that channel usually does.
- `videos/<date>-<id>.md` for each: links, numbers, licence, tags, chapters, the description, and when
  asked the transcript and the top comments. `index.json` holds the same for scripts.

| The user wants | Options |
| --- | --- |
| a channel's recent videos | `@handle --max=30` (`@handle/shorts` for its Shorts) |
| only lately | `--since=now-30days` (or `20261101`): a channel stops at the first older video |
| only some | `--match="view_count>100000 & duration>60"` (yt-dlp's match filters) |
| what was said | `--transcripts` (English: the video's own captions, else YouTube's automatic ones); `--transcripts=hi.*,hi` for another language |
| what people think | `--comments` (top 50 by likes; `--comments=200`): text, likes, and whether the channel itself wrote, pinned or hearted it |
| a list someone made | `--ids=<file>` (links or ids, one a line) |
| a search | `"ytsearch10:<words>"`, `"ytsearchdate10:<words>"` |

Then read the folder and answer the question: which videos did best and what they share, what a
video says (a summary with its [m:ss] points), what the comments agree on, what changed this month.
Write the brief as `summary.md` in the same folder when the user wants it kept. The numbers are
YouTube's at that moment: say the date with them.

- **No captions** in the language asked: the video's file says which it has. Try that language, or
  with the user's yes transcribe its sound: `get.mjs <url> --audio --no-ingest`, then
  `mm transcribe <the file>` (ElevenLabs Scribe: it prints the price first; it runs only after the yes).
- **A whole channel's titles, descriptions and transcripts** in one resumable run (hundreds of
  videos): `mm yt-grab @handle --out=<folder>`.
- **A channel's best and worst thumbnails** as design references: `mm thumbs inspire`.
- Comments are slow (a page of them a request): keep `--max` small with `--comments`.

## 4. Watching channels

`watch.mjs` keeps watch lists in `<workspace>/research/watch/<list>/`. Each run looks at every
channel's newest videos, stops at the first one already seen, and handles only what is new.

```bash
node watch.mjs add doomcat-sources @someaichannel @anotherone/shorts   # details: a research folder a run
node watch.mjs add my-channel @mychannel/shorts --download --own --kind=footage --subject=mychannel/shorts
node watch.mjs show
node watch.mjs run doomcat-sources --transcripts      # --dry: say what is new, remember nothing
```

- **Details** (the default): every new video goes into a research folder for that run,
  `<list>/<date-time>/index.md`, with `--transcripts` and `--comments` as in research. `runs.md` logs
  each run, and `seen.txt` remembers every video handled (in yt-dlp's archive format, so
  `yt-dlp --download-archive seen.txt` reads it too).
- **Download** (`--download --own`): the channel's new videos come down through `get.mjs` into the
  library too. Only the user's own channels, or ones whose videos they may use: say `--own` only when
  that is so.
- **A first run** takes a channel's newest 5 (`--first=N`) as new and counts the rest it saw as seen;
  each run looks at the newest 30 (`--look=N`).
- **On a schedule** it becomes a feed: a scheduled task or routine that runs
  `node <skill>/scripts/watch.mjs run <list> --transcripts` and then reads and sums up what is new.
  Set one up only when the user asks, at the times they name; a few times a day at most. It runs on
  a computer: YouTube often refuses cloud machines.

## 5. Download into the inbox

`node get.mjs <url | @handle | ytsearchN:words>… [options]` downloads, writes the sidecar, and files each
file with `mm media ingest`.

| The user wants | Options |
| --- | --- |
| the video | (none): 720p or less, H.264 and AAC in an MP4, stereo |
| more than 720p (only when they ask) | `--height=1080` |
| the sound | `--audio` (its own format), `--audio=wav` for analysis or stems, `--audio=mp3` / `m4a` |
| a part | `--sections="*1:10-1:40"` (cuts at the nearest keyframes) |
| its chapters | `--chapters` (markers kept in the file); `--split-chapters` (one file a chapter too, as a set) |
| no sponsor segments | `--sponsorblock=remove` (sponsor, self-promotion, "subscribe" cut, from the SponsorBlock community's marks); `--sponsorblock=mark` keeps them as chapters |
| a live stream | `--live` (from its start; waits for one not started yet) |
| a search's top N | `"ytsearch3:<words>"` |
| N of a playlist or channel | `--max=N` (`--playlist` for a watch link's playlist); a list without `--max` or `--all` stops and lists it |
| a set kept together | `--set=<name>` (`_INBOX/<site>/<name>/`) |
| the thumbnail too | `--thumb` (filed under `references/<site>-thumbnails-<set>`) |
| subtitles or the metadata file | `--subs` (`--subs=fr.*`), `--info`: into `--extras=<folder>`, by default `<workspace>/out/yt-dlp/` (a project's `input/` is often better) |
| how the library files it | `--kind=footage --subject=<franchise>/<character> --channel=<id> --tags=a,b` |
| look only | `--dry` (title, format, size, chapters) |

- Big downloads (a playlist, an hour of video, more than 720p, a live stream): `--dry` first and tell
  the user the size.
- The sidecar (`mediamake.source/v1`): `tool` is the site (`youtube`, like Browse Hack's downloads),
  `ref` its id (a chapter `<id>#chapter-001`, a thumbnail `<id>#thumbnail`), then `url`, `title`,
  `author`, `query` (a search's words), `height`, `fps`, `downloadedAt`, and as extras `via: yt-dlp`,
  `duration`, `license`, `uploadDate`, `channelUrl`, `section`, `sponsorblock`. The library knows the
  video by `tool` + `ref`, from yt-dlp and Browse Hack alike.
- `--no-ingest` leaves the files in the inbox; `mm media ingest` files them later.
- A production then takes a clone: `mm media use <id|path> <slug> --as=input/footage/<name>.mp4`.
- Anything yt-dlp itself takes goes after `--`: `… -- --cookies-from-browser firefox` (on the user's
  word only), `--limit-rate 2M`, `--remote-components ejs:github`.

## 6. Without the library, or in a cloud session

No media library here (a cloud session, a new computer): research works the same. Downloads go to the
production's own folder, with the same choices, and tell the user nothing was filed:

```bash
yt-dlp --js-runtimes node -S "res:720,vcodec:h264,channels:2,acodec:aac" --merge-output-format mp4 \
  -P "<project>/input/footage" -o "%(title).120B [%(id)s].%(ext)s" "<url>"
```

YouTube often refuses cloud machines ("Sign in to confirm you're not a bot"): then the step waits for a
computer (a to-do), never a sign-in from the cloud.

## When it goes wrong

| It says | Do |
| --- | --- |
| `Requested format is not available`, `HTTP Error 403`, `Signature extraction failed`, nsig / n challenge | update yt-dlp (step 1), then try again |
| `No supported JavaScript runtime` / missing challenge solver | `--js-runtimes node`; if it asks for the solver scripts, `-- --remote-components ejs:github` (yt-dlp's own, from GitHub) |
| `Sign in to confirm you're not a bot`, `429` | wait and try fewer at a time (smaller `--max`, no `--comments`); on a cloud machine, leave it for a computer |
| `Video unavailable`, private, members only | not theirs to download or read: tell the user |
| `ffmpeg not found`, a 360p file with no merge | install ffmpeg (step 1) |
| `yt-dlp` not found right after installing | a new terminal (Windows: the PATH from before the install); the scripts find it anyway |
| a research run came back with no comments | comments are off on that video, or YouTube served none: say so |

## Where it runs

| Step | Needs | A person's yes | Safe to repeat | Without it |
|---|---|---|---|---|
| 1. Set up yt-dlp | nothing | no | yes | - |
| 2. Look before anything | nothing | no | yes | - |
| 3. Research videos | nothing | no | yes | - |
| 3b. Transcribe a video with no captions | key:elevenlabs | yes | yes | the research says it has no captions |
| 4. Watch channels | nothing | no | yes | - |
| 4b. Download an own channel's new videos | media:library | no | yes | its new videos as details only |
| 4c. Put a watch list on a schedule | nothing | yes | yes | - |
| 5. Download into the inbox | media:library | no | yes | into the production's own input folder, unfiled |
| 5b. File it in the library | media:library | no | yes | skipped: the files stay with the production |

Downloading what isn't the user's own or openly licensed waits for their yes (the rules at the top).
A transcription costs ElevenLabs credits: its price is shown first. A schedule runs on its own, so the
user names the list and the times. YouTube often refuses cloud machines; a step refused there waits for
a computer.
