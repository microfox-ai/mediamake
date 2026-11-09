---
name: render-cloud
description: Render a studio project (a lyric video, a waveform video, a remix, a short) on Remotion Lambda through MediaMake instead of this machine, from one command, with the cost reported — pack the project's media for the cloud only as far as the limits need (never more than 500 MB; unused files out, a long clip cut to the stretch that plays, the song encoded or a clip re-encoded only when the pack is over 200 MB or the clip is bigger than the export), pick the right Lambda function preset for the render, test a short window, then render the whole video only when the user says yes to the estimate. Needs a MediaMake API key with cloud rendering access, not the MediaMake MCP. Use when the user says "render it on Lambda / in the cloud", "cloud render", "render this on AWS", "how much would it cost to render on Lambda", "/render-cloud <slug>", or a full-size render is too slow here. Not for the render itself when the user wants it on this Mac (render-project without --lambda). Append new user feedback to the log at the bottom.
metadata:
  category: other
---

# render-cloud

A lyrics project renders on Remotion Lambda through MediaMake from one command:

```bash
mm render <slug> --lambda [--window=a-b] [--proxy] [--look=X]
```

The project is bundled alone as its own Lambda site (`lyrics-<slug>`), its media goes up as that
site's public folder (**the pack**), and the render itself goes through MediaMake's render API, so
it sits in the user's render history with its cost in the platform's cost usage and the quota
counted, like a render from the editor. The file comes home where a local render would put it
(`out/<slug>/<slug>.mp4`, `clips/` for a window, `looks/`, the previous master kept in `v<N>/`), with
the cost printed and logged (`out/<slug>/.renders.jsonl`, `lambda.costUsd`). The mechanics live in
`apps/studio/scripts/lambda.ts` and are documented in `apps/studio/README.md` › Render ›
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
| A MediaMake API key with **cloud rendering access** | `MEDIAMAKE_API_KEY`, or `mm media cloud login` (Keychain); the site is `MEDIAMAKE_API_URL` or `url` in `~/.mediamake/config.json` | the API answers 403 with the reason: render locally, or ask for Lambda access (admins, the private tier, or a `lambdaRender` grant on the key) |
| AWS keys to deploy the site | `REMOTION_AWS_ACCESS_KEY_ID` / `REMOTION_AWS_SECRET_ACCESS_KEY` in `apps/mediamake/.env` (`REMOTION_AWS_REGION` picks the region) | no site can go up; nothing renders |
| The project prepared | `projects/<slug>/manifest.json` (`mm prepare`) | nothing to pack |

Not needed: the MediaMake MCP. The script talks to `/api/remotion/render` and `/api/remotion/progress`
itself. A local dev server (`MEDIAMAKE_API_URL=http://localhost:3002`) takes requests without a key.
`--direct` renders with the AWS keys alone, outside MediaMake's records: only when the user asks.

## Steps

1. **Plan (free).** `mm lambda plan <slug>`. It stages the pack, weighs the
   project's media against the routing limits (`apps/mediamake/docs/render-routing.md`), says which
   way it leans and why, shows the pack's size against the limits, and names the function preset the
   chooser would take for the whole video, a half-size review and a 20 s window. Tell the user the
   pack size and the lean in one line. A lyric video with overlay clips looping under the whole song
   is "heavy" by the limits (minutes of video played) and still fine on Lambda once the pack is
   trimmed; say so rather than refusing.
2. **Pack (free).** `mm lambda pack <slug>`: every file that would go up,
   with what it is and its verdict. Under 200 MB it says so and suggests nothing but the zero-cost
   things (a file nothing uses, a clip taller than the export): take those, skip the rest, move on.
   Over 200 MB, apply the rules below cheapest first until it is under: the ones the tool can do go
   in `projects/<slug>/lambda.json` (`pack --write` writes its suggestions; edit by hand for more),
   the ones that change the project (a cut clip, a dropped file) are edits to `input/` and the
   storyboard, then `mm prepare` again. Run `pack` once more and show the before →
   after. Stop here if the pack stays over 500 MB: the render refuses, and the user renders locally.
3. **Configuration.** The script works it out and prints it with its reason and an estimate
   ("Configuring the render" below): the function's memory, frames at once, frames a chunk, the
   chunk count and time. Read it before the render starts; a worst chunk near 15 minutes means the
   project is too heavy as it is. Never pick a preset instead unless you can say why.
4. **Test a window, always, on the heaviest stretch.** Never go straight to the whole video, even
   when the user says yes to it: a full render that dies on Lambda's 15 min limit costs the same as
   one that finishes (fma-edwardeleric, 2026-11-04: $2.59 for no file). Ask first, with the expected
   cost (a 20 s window of a 1080p lyric video with two overlay clips cost $0.05; a 10 s one $0.03).
   Then `mm render <slug> --lambda --window=a-b` on the stretch with
   the most on screen (every mask, cutout, visualizer and blur at once: the last chorus, the drop),
   not the quiet intro. Check the clip (a still, the audio), and report the cost line, the
   **slowest chunk's seconds a frame** and the estimate for the whole video the script prints. That
   measurement is what sizes the full render: it goes into `out/<slug>/.renders.jsonl`, and the
   configuration reads it (`plan` shows "Measured: … s a frame" or "Not measured yet").
5. **The whole video, on yes.** Show the estimate and ask. On yes,
   `mm render <slug> --lambda --skip-deploy` (the site is already up;
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

## Configuring the render

The script works out each render's Lambda configuration itself (`chooseConfig` in
`scripts/lambda.ts`) and prints it with its reason before anything is spent:

```
Configuration: 10 GB, 103 frames a chunk, 3 at a time, 82 chunks of ~4m 43s (worst 11m 35s), about $3.16
  assumed 12 s a frame on 3 GB; 10 GB with 3 frames at a time brings a frame to ~2.5 s, …
```

Don't pick from mediamake's presets (`config.mjs`, `AWS_RENDER_CONFIGS`): their descriptions
("Classic: social clips under 3 minutes", "Complex Fast: handles any duration safely") were written
for the editor's timelines and are wrong for a lyrics project, whose frames can take ten times
longer. `--preset=` and `"preset"` in `lambda.json` still exist for a deliberate override; say why
when you use one. The order of concerns is fixed: **the output must arrive, then the cost, then the
speed.**

**What Lambda imposes** (Remotion's Lambda docs, confirmed on 2026-11-04):

- 15 minutes is a hard limit, for each chunk and for the main function that waits for all of them
  and joins the file. A render whose slowest chunk is still running at 15 minutes fails whole, and
  the money is spent.
- The CPU scales with the memory: 1769 MB is one vCPU, 10240 MB about six. One Chrome tab renders
  one frame at a time, so a big function renders more frames at once with `concurrencyPerLambda`
  (more tabs); that is where the extra memory pays.
- Every chunk pays a fixed overhead: the function starting, Chrome, the pack's media downloading
  (about 25 s). Fewer chunks mean less overhead.
- The bill is GB-seconds (`estimatePrice`): twice the memory for half the time costs the same, so
  memory is free when the CPU is used. What costs is work done twice (retries, overhead) and
  renders that fail.
- The main function invokes every chunk at once; 113 ran together without throttling. Past about
  200 at once a render leans on Remotion's retries against the account's concurrency limit.

**What the project tells**: how long its slowest frame takes on a 3 GB function with one tab,
measured by its last Lambda render (the slowest chunk's seconds a frame, in
`out/<slug>/.renders.jsonl`, normalised to that unit). Unmeasured, the slowest frame seen so far
(12 s, fma-edwardeleric's stage masks) is assumed, so an unmeasured full render is sized to arrive,
not to be cheap. A 20 s window on the heaviest stretch is what measures it: $0.05–0.30.

**The rule** (seconds a frame → the function, the tabs, the chunk):

| Frame on 3 GB, one tab | Function | Frames at once | Chunk |
|---|---|---|---|
| ≤ 1.5 s (images, a song, a waveform) | 2 GB | 1 | as many frames as fit 300 s, up to 150 |
| ≤ 4 s (an overlay clip or two under the type) | 3 GB | 1 | the same |
| heavier (masks, cutouts, a visualizer, blurs together) | 10 GB | 3 | the same, and never a chunk past 700 s even if the extra tabs bring nothing |

A half-size review (`--proxy`) counts a frame at a quarter of its time. Chunks are sized to 300 s
(a third of the limit: room for one retry and the final join) and the count is kept under 200;
the estimate counts every chunk's expected time plus the main function's. After a window, `plan`
shows "Measured: … s a frame" and the whole video's configuration from it.

**Reading the cost line** at the end: `$0.052 for 600 frames on 8 Lambdas`. The "whole video would
be about $X" line scales the window linearly; with the same configuration the full render lands
near it (a little under when frames vary, a little over when retries happen).

## What the numbers looked like (2026-11-04, us-east-2)

| Project | Pack | Render | Lambdas | Time | Cost |
|---|---|---|---|---|---|
| wakeup-waveform (song WAV 73 MB, 2 overlays 91 MB) | 177 MB | 20 s window, 1080p, `complex-fast` | 8 | 200 s | $0.052 |
| the same | 177 MB | 10 s window | 4 | 203 s | $0.027 |
| the same, song as AAC, source clip skipped | 99 MB | 10 s window | 4 | 195 s | $0.027 |
| fma-edwardeleric (32 stage masks, cutouts, a particles overlay, sigils) | 190 MB | whole video, 8,429 frames, `complex-fast` | 113 | **failed at 900 s** | $2.59 |
| the same, heaviest 10 s (frames 5,025–5,324) | 190 MB | 10 GB, 3 at a time, 103 frames a chunk | 3 | 548 s (slowest chunk 481 s, 4.7 s a frame) | $0.17 |
| the same, whole video from that measurement | 190 MB | 10 GB, 3 at a time, 55 frames a chunk | 154 | 1,021 s, **arrived** (slowest chunk 444 s, 8.1 s a frame: the ending, not the stretch the window measured) | $3.97 (estimated $4.70–5.90) |

The last row is how it is meant to go: measured, sized with margin, arrived, at the window's
rate. Its slowest chunk was the ending (8.1 s a frame), not the stretch the window had measured
(4.7 s): a window's stretch is a guess at the heaviest, so the chunk budget (300 s of the 900)
is what carried it. Keep that margin.

The failed row is the other lesson. The pack was fine (612 → 190 MB with the tooling sources skipped
and the song as AAC) and 104 chunks finished, but 9 chunks of the heaviest stretch (frames
5,025–7,574, the stage-mask section) were still running when the main function hit Lambda's hard
15 min limit, so the whole render failed and the money was spent. Its frames take over 12 s each on
a 3 GB function: a 75-frame chunk cannot finish. No window had been rendered on that stretch first;
one would have shown it for $0.05 and the chooser would have taken `enterprise`.

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
- **"The main function timed out after 899999ms", chunks missing**: Lambda's 15 min limit, hard for
  each chunk and for the render as a whole. The missing chunks' frames were too slow for 75 frames a
  chunk on 3 GB. Render a 20 s window on that stretch (its slowest chunk's seconds a frame goes into
  the log), then the full render again: the chooser takes `enterprise` (10 GB, 50 frames a chunk)
  past 8 s a frame. If a frame is slower than about 15 s even there, the project is for a local
  render, or its heaviest layer needs to get cheaper (fewer masks at once, no full-frame blur).
- **A chunk times out** (errors naming a frame range after ~900 s, the render goes on): the same
  cause, one chunk at a time; same cure.
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
- 2026-11-04 — The full fma-edwardeleric render failed on the 15 min limit ($2.59, no file) after
  the user said yes to it without a window test on its heaviest stretch. Step 4 is now unconditional
  and on the heaviest stretch; the slowest chunk's seconds a frame is logged and the chooser takes
  `enterprise` past 8 s a frame.
- 2026-11-04 — "Going with the presets might be bad: the information in the repo is false; configure
  the render yourself every time, output first, cost next, speed next." The preset table became
  "Configuring the render" (chooseConfig: memory, frames at once, frames a chunk from the measured
  slowest frame). The full fma video then arrived: $3.97, 154 chunks of 55 frames on 10 GB × 3.
