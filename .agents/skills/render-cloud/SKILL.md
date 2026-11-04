---
name: render-cloud
description: Render a lyrics_videos project (a lyric video, a waveform video, a remix, a short) on Remotion Lambda through MediaMake instead of this machine, from one command, with the cost reported — pack the project's media for the cloud only as far as the limits need (never more than 500 MB; unused files out, a long clip cut to the stretch that plays, the song encoded or a clip re-encoded only when the pack is over 200 MB or the clip is bigger than the export), pick the right Lambda function preset for the render, test a short window, then render the whole video only when the user says yes to the estimate. Needs a MediaMake API key with cloud rendering access, not the MediaMake MCP. Use when the user says "render it on Lambda / in the cloud", "cloud render", "render this on AWS", "how much would it cost to render on Lambda", "/render-cloud <slug>", or a full-size render is too slow here. Not for the render itself when the user wants it on this Mac (render-project without --lambda). Append new user feedback to the log at the bottom.
metadata:
  category: other
---

# render-cloud

A lyrics project renders on Remotion Lambda through MediaMake from one command:

```bash
npm run render-project -w lyrics_videos -- <slug> --lambda [--window=a-b] [--proxy] [--look=X]
```

The project is bundled alone as its own Lambda site (`lyrics-<slug>`), its media goes up as that
site's public folder (**the pack**), and the render itself goes through MediaMake's render API, so
it sits in the user's render history with its cost in the platform's cost usage and the quota
counted, like a render from the editor. The file comes home where a local render would put it
(`out/<slug>/<slug>.mp4`, `clips/` for a window, `looks/`, the previous master kept in `v<N>/`), with
the cost printed and logged (`out/<slug>/.renders.jsonl`, `lambda.costUsd`). The mechanics live in
`apps/lyrics_videos/scripts/lambda.ts` and are documented in `apps/lyrics_videos/README.md` › Render ›
On Lambda. This skill is the judgement around them: what to pack, which function, when to spend.

**Lambda renders cost money, and the cost is the frames, not the pack.** A chunk downloads the
media it plays once and then renders its 60–150 frames; on a lyric video with overlays and a
visualizer a frame takes a second or two, so the download is a small part of a chunk's time. The
pack's size matters for three things only: the upload, the 500 MB line, and a chunk's timeout.
Optimising it beyond that is time spent for nothing (measured: the same window cost $0.027 with the
song as a 73 MB WAV and as an 8 MB AAC). Nothing in this skill spends without the user's yes:
`plan` and `pack` are free, a window is the test, the whole video comes after the estimate.

## What it needs

| Need | Where | Without it |
|---|---|---|
| A MediaMake API key with **cloud rendering access** | `MEDIAMAKE_API_KEY`, or `npm run media -w lyrics_videos -- cloud login` (Keychain); the site is `MEDIAMAKE_API_URL` or `url` in `~/.mediamake/config.json` | the API answers 403 with the reason: render locally, or ask for Lambda access (admins, the private tier, or a `lambdaRender` grant on the key) |
| AWS keys to deploy the site | `REMOTION_AWS_ACCESS_KEY_ID` / `REMOTION_AWS_SECRET_ACCESS_KEY` in `apps/mediamake/.env` (`REMOTION_AWS_REGION` picks the region) | no site can go up; nothing renders |
| The project prepared | `projects/<slug>/manifest.json` (`npm run prepare-project`) | nothing to pack |

Not needed: the MediaMake MCP. The script talks to `/api/remotion/render` and `/api/remotion/progress`
itself. A local dev server (`MEDIAMAKE_API_URL=http://localhost:3002`) takes requests without a key.
`--direct` renders with the AWS keys alone, outside MediaMake's records: only when the user asks.

## Steps

1. **Plan (free).** `npm run lambda -w lyrics_videos -- plan <slug>`. It stages the pack, weighs the
   project's media against the routing limits (`apps/mediamake/docs/render-routing.md`), says which
   way it leans and why, shows the pack's size against the limits, and names the function preset the
   chooser would take for the whole video, a half-size review and a 20 s window. Tell the user the
   pack size and the lean in one line. A lyric video with overlay clips looping under the whole song
   is "heavy" by the limits (minutes of video played) and still fine on Lambda once the pack is
   trimmed; say so rather than refusing.
2. **Pack (free).** `npm run lambda -w lyrics_videos -- pack <slug>`: every file that would go up,
   with what it is and its verdict. Under 200 MB it says so and suggests nothing but the zero-cost
   things (a file nothing uses, a clip taller than the export): take those, skip the rest, move on.
   Over 200 MB, apply the rules below cheapest first until it is under: the ones the tool can do go
   in `projects/<slug>/lambda.json` (`pack --write` writes its suggestions; edit by hand for more),
   the ones that change the project (a cut clip, a dropped file) are edits to `input/` and the
   storyboard, then `npm run prepare-project` again. Run `pack` once more and show the before →
   after. Stop here if the pack stays over 500 MB: the render refuses, and the user renders locally.
3. **Preset.** The script chooses one (printed with its reason, "Which preset" below). Override with
   `--preset=<key>` or `"preset"` in `lambda.json` only for a reason you can state.
4. **Test a window.** Ask first, with the expected cost (a 20 s window of a 1080p lyric video with
   two overlay clips cost $0.05; a 10 s one $0.03). Then
   `npm run render-project -w lyrics_videos -- <slug> --lambda --window=a-b` on a stretch that shows
   the video's heaviest look (the hook, an overlay, the title). Check the clip (a still, the audio),
   and report the cost line and the estimate for the whole video the script prints.
5. **The whole video, on yes.** Show the estimate and ask. On yes,
   `npm run render-project -w lyrics_videos -- <slug> --lambda --skip-deploy` (the site is already up;
   drop `--skip-deploy` after a code change). A review render is `--proxy` (half size, cheaper);
   the master is full size, once, after sign-off, as everywhere else (revise-video). Report the cost
   the script prints, and that it is in the user's render history.
6. **After.** The review loop and delivery are the usual ones (revise-video, `media deliver`): a Lambda
   render is the same file as a local one. Keep `lambda.json` in the project: the next render reuses
   the derivatives (made once into `out/<slug>/.lambda/derived/`) and the site's unchanged files.

## Pack rules

The pack is exactly what the project needs on Lambda: the manifest, `video/edits.json`, the song,
every file the manifest's `assets` names, every file `edits.json` swaps in, `fonts/`, `derived/`, and
any `'<slug>/…'` path the code writes. `lambda.json` changes what goes up for Lambda only; local
renders, Studio and the editor keep the originals.

0. **Optimise for the limits, not for the bill.** Encoding and re-encoding cost minutes of ffmpeg
   here and a little quality there, and they do not make the render cheaper: a chunk's time is its
   frames. So the pack is touched for three reasons only: it is over **200 MB** (the warning line:
   the upload and every chunk's fetch grow for nothing), it is over **500 MB** (the render refuses),
   or a clip makes every frame decode more than it shows. `pack` applies this itself: under 200 MB
   its verdict is "nothing to optimise for size", and the song, the bitrate of a clip and big images
   are reported as kept. Don't overrule it to be tidy.
1. **Nothing the video doesn't use (always, it costs nothing).** `prepare-project` puts every file
   under `input/` in the manifest's `assets`, so a source clip, a swapped-out picture or a Suno stem
   that was never deleted goes up with the rest. `pack` marks files nothing in the code names: read
   the project's code before trusting it (a computed name is not a literal), then skip it for Lambda
   (`"skip": ["source/loop-source.mp4"]`) or, better, move it out of `input/` for good (to
   `projects/<slug>/unused/`, or the media library) and `prepare-project` again.
2. **A clip taller than the export (always: it is per-frame work).** 4K footage under a 1080p video
   makes every frame decode four times the pixels it shows, on every chunk. Re-encode it to the
   export's height at h264 crf 20 (`"videos": { "input path": { "height": 1080, "crf": 20 } }`): the
   same frames the render would scale down anyway. A clip with transparency (an alpha WebM, ProRes
   4444) is never re-encoded: h264 would lose the alpha; keep it, or cut it (rule 3).
3. **Only the stretch that plays (when the pack is over the line, or the clip is huge).** When a
   scene plays a stretch of a long clip (a 2-minute clip trimmed to 10 s with `from`/`to`,
   `startFrom`/`endAt` or a shot's in/out, not looped), cut that stretch with ffmpeg and let the
   project name the cut. This is a project edit, because the scene's own offset changes with it:
   `ffmpeg -ss <in> -to <out> -i input/clip.mp4 -c:v libx264 -crf 18 -preset medium -c:a aac
   input/clip.<in>-<out>.mp4` (re-encode, so the cut starts exactly on `<in>`; `-c copy` would snap
   to a keyframe), then point the storyboard at the new file with its offset set to 0, move the whole
   clip out of `input/` (rule 1), `prepare-project`, and check the scene in Studio. `pack` flags
   every clip over a minute with this question; a clip that loops under the whole video (an overlay)
   is used whole and stays.
4. **The song: encode it, never downgrade it (over the line, or over 100 MB on its own).** A
   lossless song (WAV, FLAC, AIFF: 50–80 MB for four minutes) goes up as AAC 256 kbps
   (`"audio": { "codec": "aac", "bitrate": "256k" }`): a tenth of the size and transparent to the
   ear at this bitrate. Never lower than 192k, never re-encode a song that is already lossy (MP3,
   M4A: the tool leaves those). The local master still renders with the WAV. This is the cheapest
   big saving when the pack has to shrink, and pointless when it doesn't.
5. **A clip over the export's bitrate (over the line, or over 100 MB on its own).** A 1080p clip at
   40 Mbps and 300 MB re-encodes to crf 20 at a fraction of the size; the same clip at 5 Mbps and
   75 MB is at the export's size and bitrate and stays. `pack` draws the line at 12 Mbps and 40 MB,
   and only once the pack needs it.
6. **Reasonable is reasonable.** A 16 MB 8 s loop at 16 Mbps, a 75 MB 1080p overlay, a 1 MB cover,
   a 73 MB WAV in a 177 MB pack: `pack` says "kept" for all of them, and that is the answer.
7. **The limits.** Over **200 MB** the render goes ahead with a warning. Over **500 MB** the render
   refuses: trim with the rules above (cheapest first: 1, 4, 3, then 5), or render locally. These
   thresholds are `PACK_WARN_BYTES` / `PACK_MAX_BYTES` in `scripts/lambda.ts`.

Each derivative is made once (ffmpeg, into `out/<slug>/.lambda/derived/`, remembered by the source's
size, date and settings) and swapped into the manifest and `edits.json` the render gets, so a scene
that names the original path by hand still finds it. Local renders never see any of this.

## Which preset

MediaMake's Lambda functions come in presets (`apps/mediamake/config.mjs`, `AWS_RENDER_CONFIGS`).
What matters for a lyrics project is that **every chunk downloads the media it plays before its first
frame**, so the number of chunks drives the cost of a media-heavy render, and a chunk's download plus
its frames must fit the function's timeout. More memory is also more CPU on Lambda (frames render and
decode faster), at a higher price per second. The script picks from this table (`choosePreset`) and
prints the reason; the user, `--preset=` or `lambda.json` can overrule it.

| Render | Preset | Function | Why |
|---|---|---|---|
| ≤ 30 s, no clips, ≤ 30 MB of media (a motion test, a title, a still-image look) | `lightweight` | 1 GB, 2 GB disk, 180 s timeout, 150 frames/Lambda | the smallest function does it for the least; its 3 min timeout only fits a render with nothing to download |
| A review render (`--proxy`, any scale below 1) | `basic-fast` | 2 GB, 900 s, 100 frames/Lambda, auto concurrency | half-size frames need little memory; the long timeout leaves room for the download each chunk makes |
| The whole video with **2+ clips playing all along, or 120 MB+ downloaded per chunk**, 3000+ frames | `broadcast` | 6 GB, 900 s, 30 chunks | 30 big chunks download the media 30 times instead of 100+, and 6 GB decodes two overlays fast; for a short window it would be worse (30 chunks of a few frames each, 30 downloads), so windows stay on `complex-fast` |
| ≤ 3 min of video with ≤ 30 MB of media (an encoded song and images, no clips) | `classic` | 3 GB, **240 s timeout**, auto split | light chunks finish well inside 4 minutes; never with clips in the pack (a 75-frame chunk with 170 MB to fetch took 178 s) |
| Everything else: a full 1080p render with one clip, or a window of a heavy one | `complex-fast` | 3 GB, 900 s, 75 frames/Lambda, auto concurrency | the safe default: enough memory, a 15 min timeout, chunks small enough to parallelise |
| 15–30 min of video | `complex-slow` | 3 GB, 900 s, 20 chunks at a time | a fixed 20 keeps a long render clear of AWS's concurrency limit ("Too Many Requests") |
| Over 30 min | `enterprise` | 10 GB, 900 s, 50 frames/Lambda | the most memory and the finest split keep every chunk inside the timeout |
| never for a lyrics project | `throttled` | 2 GB, 10 chunks at a time, 150 frames/Lambda | made for timelines that call rate-limited APIs; a lyrics render calls none, and it is slow and dear |

Reading a cost line: `$0.052 for 600 frames on 8 Lambdas` is $0.0065 per Lambda-chunk of 75 frames
with 170 MB to fetch each; the same 600 frames with the pack at 99 MB cost less because each chunk
fetched less. The "whole video would be about $X" line scales the window linearly; the real number
comes in a little under when the pack is light and a little over when the cutouts and stage images are
many (each chunk fetches the ones its frames show).

## What the numbers looked like (2026-11-04, us-east-2)

| Project | Pack | Render | Lambdas | Time | Cost |
|---|---|---|---|---|---|
| wakeup-waveform (song WAV 73 MB, 2 overlays 91 MB) | 177 MB | 20 s window, 1080p, `complex-fast` | 8 | 200 s | $0.052 |
| the same | 177 MB | 10 s window | 4 | 203 s | $0.027 |
| the same, song as AAC, source clip skipped | 99 MB | 10 s window | 4 | 195 s | $0.027 |

The last row is why rule 0 exists: the lighter pack uploaded faster (the re-deploy took 104 s and
sent 6 files, 3,688 unchanged) but the chunks are render-bound (75 frames with two 1080p overlays
decoding under a waveform take about 175 s either way), so the cost stayed, and the WAV encode was
time spent for nothing. What saves money on a heavy frame (two clips, a visualizer, blurs) is
`--proxy` for the review rounds and a window for the test, not a smaller pack.

The site deploy (bundle + pack, 263 s to Ohio for 177 MB) happens once; a re-render with
`--skip-deploy` starts at once, and a deploy after a code change uploads only the bundle.

## When it goes wrong

- **403 from the API, "Lambda renders are for mediamake API keys with render access"**: the key has
  no cloud rendering access. Say so; render locally, or the user asks an admin for access. Never
  work around it with `--direct` unless the user asks for that.
- **The terminal dropped, or the start call timed out, after "render … started"**: the render goes
  on in the cloud. `--attach=<renderId>` (the id printed, or from the render history) follows it and
  downloads it; start nothing new until that render is accounted for. Starting a render can take a
  couple of minutes (the props go to S3, the function spins up): the start call waits 10 minutes.
- **"The site has no composition <slug>"**: the site is stale or another project's. Drop
  `--skip-deploy`.
- **"The pack is N MB, over the 500 MB limit"**: rules above, or local.
- **A chunk times out** (errors naming a frame range after ~900 s): too much to fetch per chunk; pack
  smaller (rules 1–3) before trying a bigger preset.
- **The render fails on a file 404**: a scene names a path the pack doesn't hold (a `staticFile()` of
  something outside `projects/<slug>/`, or a skipped file the code does use). Un-skip it, or load it
  through `asset()` / the manifest.
- **Costs look off**: the cost printed is Lambda compute as Remotion accounts it; S3 storage and
  transfer come on top, and renders stay in the bucket a day (`deleteAfter`) through the API path
  as MediaMake keeps them.

## Feedback log

- 2026-11-04 — Made after the first Lambda renders of wakeup-waveform. The user asked for: audio
  optimised without losing much quality, clips packed to the export's size and bitrate, no
  over-optimising of reasonable files (loop.mp4), unused manifest entries removed, only the played
  stretch of a long clip, a warning past 200 MB and a refusal past 500 MB, and a reasoned preset
  choice per kind of render.
- 2026-11-04 — After the measurement (same cost with the song as WAV and as AAC): "unnecessary
  optimisation is time waste, unless there would be waste on timeouts". Rule 0 added; the song,
  bitrate and image rules now apply only over the 200 MB line or for a single huge file; `pack`
  says "nothing to optimise for size" under it.
