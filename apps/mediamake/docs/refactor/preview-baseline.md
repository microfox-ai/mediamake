# Preview baseline (refactor step 0b)

Measured on 9 Nov 2026 on the main production Mac: Apple M3 Pro (12 cores), 18 GB, macOS 15.5, Node 22.16, Remotion 4.0.496,
`main` at `1539381e`. Every later preview change (lane B) is compared against these numbers.

## The short version

- **The logs:** 162 renders from 2 to 9 Nov took **318 minutes for 153 minutes of video**, about 2 s of rendering per second of video.
- **By kind of video**, rendering alone (no other render running at the same time):

  | Kind | Half size | Full size |
  |---|---|---|
  | Kinetic type, Doomcat, 3D motion graphics | 0.75–1.1 s per s | 1.0–1.7 |
  | Waveform / lyric video | 2.05 | 2.69 |
  | Remix | (no half-size renders logged) | 1.45 for shorts, 2.1 for the 4-minute video |
  | AMV (Honoured One) | 4.75 | (none logged) |

- **Every render costs about 10 s before the first frame:** about 7 s of webpack bundling (the cache has been off since 8 Nov) and 3 s for the CLI, Chrome, picking the composition and cleaning up. That is about 9 % of all render time, but **about 65 % of the time spent on look previews** (74 look renders that took about 14 s each for 12 s of video).
- **Half size saves little.** On the same 10 s stretch, Postcards took 29.6–35.4 s at half size and 34.5 s at full size. Deadpool × Kingpin took 29.8–31.5 s at half size and 34.4 s at full size. The logs say the same for waveform videos: 2.05 s per s at half size and 2.69 at full size, about 25 % less work for a quarter of the pixels. Frame time goes to **decoding the source footage at its full resolution**, not to the pixels drawn.
- **Footage decoding is most of the frame time.** For Honoured One, each 960×540 frame waits on 2560×1440, 17 Mbps sources: 615 ms per footage frame on average, and 5.4 s in the slowest 10 %. Postcards decodes its 1920×1080, 29 Mbps loop at about 240 ms a frame, even for a half-size render.
- **Renders that run at the same time take twice as long.** On 3 Nov, remix renders that overlapped another session's render took 3.7 s per s, against 1.7 alone (14 against 8 renders).

## 1. The render logs

The source is every `apps/lyrics_videos/out/*/.renders.jsonl`: 35 projects, 162 renders (161 ok, 1 failed), from 2 Nov 15:57 UTC to 9 Nov 03:40 UTC. The logged `seconds` is the wall time of the whole `render-project` run (bundle, browser, frames, encoding). Video length comes from the `--frames` range for clips, and otherwise from the output file (ffprobe). 79 renders were matched to their exact file. The rest were matched to the newest file of the same name (the later render, or its `v<N>/` copy), which has the same length unless the cut changed. Renders shorter than 1 s of video (11 one- to three-frame stills tests) are left out of the ratios, and section 1.3 uses them to estimate the fixed cost instead.

### 1.1 By scale and kind of render (all ok renders)

| Group | Renders | Median s per video s | Range |
|---|---|---|---|
| Half size (`--proxy`) | 116 | 1.17 | 0.40–5.83 |
| Full size (master) | 33 | 2.35 | 0.97–5.90 |
| 0.75 size | 1 | 1.67 | – |
| Whole video | 65 | 1.34 | 0.40–4.28 |
| Short (`--short`) | 19 | 2.94 | 1.11–5.14 |
| Look, whole video (`--look`) | 45 | 1.12 | 0.76–1.68 |
| Look on a stretch (`--look` + `--frames`) | 18 | 2.91 | 2.05–5.31 |
| Clip (`--frames`) | 3 | 5.83 | 3.67–5.90 |

The half-size median is lower mostly because light projects are reviewed at half size. Compare within one kind of video (1.2).

### 1.2 By kind of video, scale and render (renders with no other render running)

| Kind | Scale | Render | n | Median s/s | Range | Typical video | Typical wall |
|---|---|---|---|---|---|---|---|
| Waveform / lyric | 0.5 | whole | 18 | **2.05** | 1.65–4.28 | 195 s | 400 s |
| Waveform / lyric | 1 | whole | 6 | **2.69** | 1.42–3.99 | 230 s | 573 s |
| Waveform / lyric | 0.5 | look on a stretch | 15 | 2.68 | 2.05–4.66 | 6 s | 16 s |
| Remix | 1 | whole | 1 | **2.12** | – | 237 s | 503 s |
| Remix | 1 | short | 7 | **1.45** | 1.11–2.26 | 43 s | 80 s |
| AMV | 0.5 | clip | 2 | **4.75** | 3.67–5.83 | 30 s | 142 s |
| Kinetic type | 0.5 | whole | 3 | 0.99 | 0.90–1.03 | 24 s | 24 s |
| Kinetic type | 0.5 | look, whole | 41 | 1.11 | 0.76–1.38 | 12 s | 14 s |
| Kinetic type | 0.5 | look on a stretch | 2 | 3.99 | 3.89–4.09 | 3 s | 12 s |
| Kinetic type | 1 | whole | 1 | 1.68 | – | 24 s | 40 s |
| Doomcat comics / teasers | 0.5 | whole | 18 | 0.76 | 0.40–1.62 | 20 s | 21 s |
| 3D motion graphics (Cook with Claude) | 0.5 | whole | 3 | 0.74 | 0.65–0.89 | 115 s | 86 s |
| 3D motion graphics | 1 | whole | 2 | 1.02 | 0.97–1.08 | 123 s | 125 s |
| Footage short (gym short) | 0.5 | whole | 3 | 1.06 | 0.91–1.20 | 60 s | 54 s |

The projects in each kind: waveform = postcardsfromtomorrow, wakeup-waveform, fma-edwardeleric and one private-channel video; remix = kingpinxdeadpool, quicksilverxkingpin, breakingbadxdangerous; AMV = honoredone; kinetic type = doomcat-type, screamingtowin, someonetook, someonetook-v2.

### 1.3 The fixed cost per render

- Stills tests of 2–3 frames took **10.7–11.6 s** at half size (Postcards, 5 Nov, cache on) and **11.2–15.9 s** at full size (7 Nov).
- Today's timings split it up: **6.0–7.4 s bundling** and **2.8–3.4 s** for the CLI, browser, composition and cleanup (section 2).
- Over all 162 renders that is about **27 of 318 minutes (8.5 %)**. For look previews it is about **65 %**: 74 look renders took 18.9 minutes, and about 12 of those minutes went to the fixed cost.

### 1.4 Where the render minutes went

| Render | Renders | Minutes | Share |
|---|---|---|---|
| Whole videos | 66 | 254.5 | 80 % |
| Shorts | 19 | 39.1 | 12 % |
| Looks, whole | 45 | 11.0 | 3 % |
| Looks on a stretch | 29 | 7.9 | 2 % |
| Clips | 3 | 5.5 | 2 % |

Postcards from Tomorrow alone took **147 minutes**: 34 renders, mostly 6–7-minute half-size review renders of a 195 s video. Next came Deadpool × Kingpin (29.5), FMA (28.8) and WAKE UP waveform (26.7).

### 1.5 Renders running at the same time

26 renders overlapped another render by at least 10 % of their time. All the remix shorts on 3 Nov ran three projects at once:

| Remix at full size | n | Median s/s |
|---|---|---|
| Alone | 8 | 1.67 |
| With another render running | 14 | 3.68 |

The logs only see `render-project` runs. Studio, stills, Python analysis and other sessions also compete and aren't counted.

## 2. Timed bundle and 10-second clips (9 Nov)

Each clip ran the same command `render-project <slug> --proxy --frames=a-b` runs: `ONLY_PROJECT=<slug> npx remotion render src/index.ts <slug> <out> --scale=0.5 --frames=a-b`, with the webpack cache off as today. The output went to a scratch folder, so no project's `out/` folder or render log changed. Each clip is 300 frames (10.0 s at 30 fps). The full-size runs drop `--scale`.

| Project | Stretch | Size | Bundle | Frames | Encode | CLI, browser, cleanup | **Wall** | **s per video s** |
|---|---|---|---|---|---|---|---|---|
| Postcards from Tomorrow (waveform) | frames 1422–1721 (47–57 s, a lyric line) | half | 6.9 | 24.0 | 1.3 | 3.2 | **35.4** | 3.5 |
| | | half | 6.0 | 19.6 | 1.2 | 2.8 | **29.6** | 3.0 |
| | | full | 6.1 | 20.7 | 4.7 | 3.0 | **34.5** | 3.5 |
| Deadpool × Kingpin (remix) | frames 3000–3299 (100–110 s, 11 shots with impacts and zooms) | half | 7.2 | 18.3 | 1.3 | 3.0 | **29.8** | 3.0 |
| | | half | 6.8 | 20.4 | 1.4 | 2.9 | **31.5** | 3.2 |
| | | full | 6.7 | 20.6 | 4.1 | 3.0 | **34.4** | 3.4 |
| Honoured One (AMV) | frames 1779–2078 (59–69 s, the "I wear the mask" lines) | half | 6.5 | 46.1 | 1.6 | 3.2 | **57.4** | 5.7 |
| | | half | 7.4 | 48.1 | 1.4 | 3.4 | **60.3** | 6.0 |

All times are in seconds. **The bundle is 6.0–7.4 s** for every project, because each render bundles only its own project. Rendering frames alone runs at 2.0–2.4 s per video second for Postcards, 1.8–2.0 for the remix and 4.6–4.8 for the AMV.

### What a frame waits on

| Clip | Footage it decodes | Footage frame fetches | Median wait per fetch | Slowest 10 % |
|---|---|---|---|---|
| Postcards, half | `input/loop-ukiyoe.mp4` 1920×1080, 24 fps, 29 Mbps, plus the 1920×1080 dust overlay | 900 | 240 ms | 344 ms |
| Postcards, full | same | 900 | 206 ms | 308 ms |
| Kingpin, half | `derived/plate.mp4` 1920×804 (the remix engine's pre-rendered plate), plus a slow-motion clip | 760 | 406 ms | 642 ms |
| Kingpin, full | same | 772 | 345 ms | 621 ms |
| Honoured One, half | `derived/src/ftw.mp4` 2560×1440, 29.97 fps, 17 Mbps (1.3 GB), `s2r.mp4` 2560×1440, a matte, two overlays | 1,139 | 615 ms | 5,451 ms |

- The footage is decoded at its own size whatever the render scale. That is why half size barely helps.
- The first frame in each Chrome tab takes **2.0–2.8 s** (opening and seeking the footage). Clips pay it six times, once per tab.
- Honoured One also spends about 660 ms a frame in its WebGL pass (`amv gl pass`). Its run logged 121 "The source image cannot be decoded" warnings from `<Img>`, but the frames came out complete (three stills were checked against the current cut).
- Kingpin's tabs also spent 272 s in all on "Extracting audio" for the slow-motion clip.
- **Parallel encoding was off in every run.** Remotion turns it off when `os.freemem()` is under 2.07 GB, and macOS reported 0.3–3.9 GB "free" on this 18 GB Mac. So encoding (1.2–1.6 s at half size, 4.1–4.7 s at full size) runs after the frames, not during them. Concurrency was 6 tabs on 12 cores (Remotion's default).

## 3. What this says for lane B

| Technique | What the baseline shows |
|---|---|
| P1 cache per project, P2 bundle once | about 7 s saved on every render. That is most of a look round (8 looks × 14 s, about half of it bundling) and little of a whole-video render (7 s of 400). |
| P3 preview server | removes the about 10 s fixed cost and the 2–3 s first-frame seek per tab. Look and stills rounds become several times faster. |
| P6 proxy media | **the biggest lever for AMV and waveform.** Decoding 2560×1440 or 29 Mbps 1080p sources for a 960×540 frame is most of the frame time. Today `--proxy` only shrinks the pixels drawn. |
| P5 draft mode | matters for AMV (the WebGL pass is about 660 ms a frame) and the waveform engine. It matters less for remix, whose plate is already baked. |
| P7 encoder and machine tuning | parallel encoding never turns on here (the free-memory check), and concurrency is 6 of 12 cores. Encoding takes 1–5 s a clip. Worth a benchmark run. |
| P9 bake heavy layers | the remix engine already renders from a baked `derived/plate.mp4`, which is why it costs less per frame than waveform. AMV and waveform have no plate yet. |
| Renders at the same time | doubled render time on 3 Nov. A one-render-at-a-time queue across sessions would help every kind of video. This is not in the plan yet. |

## 4. How to measure again

- **Logs:** read `out/*/.renders.jsonl` again for the renders made after the change. The table of all 162 renders is in [preview-baseline-renders.md](preview-baseline-renders.md), next to this file.
- **Clips:** run the same three stretches with `--log=verbose` and read `Bundling done in`, `Rendering frames done in` and `Stitching done in`:

```bash
cd apps/lyrics_videos
ONLY_PROJECT=postcardsfromtomorrow npx remotion render src/index.ts postcardsfromtomorrow /tmp/pft.mp4 --scale=0.5 --frames=1422-1721 --log=verbose
ONLY_PROJECT=kingpinxdeadpool npx remotion render src/index.ts kingpinxdeadpool /tmp/kp.mp4 --scale=0.5 --frames=3000-3299 --log=verbose
ONLY_PROJECT=honoredone npx remotion render src/index.ts honoredone /tmp/ho.mp4 --scale=0.5 --frames=1779-2078 --log=verbose
```

(after the rename to `apps/studio`, run it there). Time a bundle through a render like these, not with `npx remotion bundle`. That command deep-copies the public folder (all of `projects/`, about 42 GB) into its output, while renders link it.

## Caveats

- The Mac ran on battery (36 % down to 27 %, Low Power Mode off). Spotlight and other system jobs ran in the background (load average 4–8). The same clip varied by up to 20 % between runs, so compare medians of two or more runs.
- The webpack cache was on for renders before 8 Nov 04:49 IST (commit `2659943f`) and off after. The logs can't separate bundle time from the rest, so the 1.x tables mix both. The cached bundle time wasn't measured, because turning the cache on in the shared checkout is what mixed up two sessions' bundles on 4 Nov. Measure it in B1 with the per-project cache.
- Not timed: the all-projects bundle that Remotion Studio builds (the P11 lazy Studio).
- Every `render-project` run deletes Remotion's production webpack cache ("Cache disabled but found. Deleting"), and so did the timed renders.
