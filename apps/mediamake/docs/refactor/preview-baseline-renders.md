# Preview baseline: every logged render

All 162 renders in `apps/lyrics_videos/out/*/.renders.jsonl` from 2 to 9 Nov 2026, oldest first, as read for [the preview baseline](preview-baseline.md).

- **Render s** is the logged wall time of the whole `render-project` run (bundle, browser, frames, encoding).
- **Video s** comes from the `--frames` range for clips, and otherwise from the output file.
- **Length from** says where the video length came from: *frames* (the `--frames` range), *exact file* (that render's own file) or *same-name file* (the newest file of that name, the same length unless the cut changed).
- **Overlap** is the share of the render's time another logged render was running.
- The size and fps are those of the file that was measured.
- A private channel's project is shown as `private-1`.

| When (UTC) | Project | Kind | Video | Scale | Look | Frames | OK | Render s | Video s | s per video s | Size | fps | Overlap | Length from |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-11-02 15:57 | kingpinxdeadpool | remix | `out/kingpinxdeadpool/kingpinxdeadpool.mp4` | 1 |  |  | **no** | 327.5 | 236.82 | 1.38 | 1920x1080 | 30.0 | 0.1 | same-name file |
| 2026-11-02 16:02 | cookwithclaude-pack-brand-kit | 3d motion graphics | `out/cookwithclaude-pack-brand-kit/cookwithclaude-pack-brand-kit.mp4` | 0.5 |  |  | yes | 119.1 | 131.95 | 0.9 | 1920x1080 | 30.0 | 0.66 | exact file |
| 2026-11-02 16:03 | kingpinxdeadpool | remix | `out/kingpinxdeadpool/kingpinxdeadpool.mp4` | 1 |  |  | yes | 557.4 | 236.82 | 2.35 | 1920x1080 | 30.0 | 0.44 | same-name file |
| 2026-11-02 16:07 | cookwithclaude-pack-brand-kit | 3d motion graphics | `out/cookwithclaude-pack-brand-kit/cookwithclaude-pack-brand-kit.mp4` | 0.5 |  |  | yes | 200.5 | 131.95 | 1.52 | 960x540 | 30.0 | 1.0 | same-name file |
| 2026-11-02 16:26 | honoredone | amv | `out/honoredone/clips/honoredone-1779-2674.mp4` | 0.5 |  | 1779-2674 | yes | 109.6 | 29.87 | 3.67 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-02 16:32 | honoredone | amv | `out/honoredone/clips/honoredone-1779-2674.mp4` | 0.5 |  | 1779-2674 | yes | 174 | 29.87 | 5.83 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-02 16:36 | kingpinxdeadpool | remix | `out/kingpinxdeadpool/kingpinxdeadpool.mp4` | 1 |  |  | yes | 502.6 | 236.82 | 2.12 | 1920x1080 | 30.0 | 0.0 | exact file |
| 2026-11-02 16:46 | cookwithclaude-pack-brand-kit | 3d motion graphics | `out/cookwithclaude-pack-brand-kit/cookwithclaude-pack-brand-kit.mp4` | 0.5 |  |  | yes | 85.5 | 131.95 | 0.65 | 960x540 | 30.0 | 0.0 | exact file |
| 2026-11-02 16:58 | cookwithclaude-pack-brand-kit | 3d motion graphics | `out/cookwithclaude-pack-brand-kit/cookwithclaude-pack-brand-kit.mp4` | 1 |  |  | yes | 126.4 | 130.75 | 0.97 | 1920x1080 | 30.0 | 0.0 | exact file |
| 2026-11-03 07:37 | cookwithclaude-pack-brand-kit-short | 3d motion graphics | `out/cookwithclaude-pack-brand-kit-short/cookwithclaude-pack-brand-kit-short.mp4` | 0.5 |  |  | yes | 84.7 | 114.79 | 0.74 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-03 08:56 | cookwithclaude-pack-brand-kit-short | 3d motion graphics | `out/cookwithclaude-pack-brand-kit-short/cookwithclaude-pack-brand-kit-short.mp4` | 0.5 |  |  | yes | 102.3 | 114.79 | 0.89 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-03 09:40 | cookwithclaude-pack-brand-kit-short | 3d motion graphics | `out/cookwithclaude-pack-brand-kit-short/cookwithclaude-pack-brand-kit-short.mp4` | 1 |  |  | yes | 123.9 | 114.79 | 1.08 | 1080x1920 | 30.0 | 0.0 | exact file |
| 2026-11-03 10:15 | kingpinxdeadpool | remix | `out/kingpinxdeadpool/shorts/s05/kingpinxdeadpool-s05-9x16.mp4` | 1 |  |  | yes | 55.4 | 41.15 | 1.35 | 1080x1920 | 30.0 | 0.0 | same-name file |
| 2026-11-03 10:16 | kingpinxdeadpool | remix | `out/kingpinxdeadpool/shorts/s06/kingpinxdeadpool-s06-9x16.mp4` | 1 |  |  | yes | 87.5 | 46.36 | 1.89 | 1080x1920 | 30.0 | 0.0 | same-name file |
| 2026-11-03 10:17 | kingpinxdeadpool | remix | `out/kingpinxdeadpool/shorts/s07/kingpinxdeadpool-s07-9x16.mp4` | 1 |  |  | yes | 60.9 | 42.79 | 1.42 | 1080x1920 | 30.0 | 0.0 | same-name file |
| 2026-11-03 10:20 | breakingbadxdangerous | remix | `out/breakingbadxdangerous/shorts/s01/breakingbadxdangerous-s01-9x16.mp4` | 1 |  |  | yes | 91.6 | 38.14 | 2.4 | 1080x1920 | 30.0 | 0.81 | same-name file |
| 2026-11-03 10:20 | kingpinxdeadpool | remix | `out/kingpinxdeadpool/shorts/s05/clips/kingpinxdeadpool-s05-9x16-120-360.mp4` | 1 |  | 120-360 | yes | 47.4 | 8.03 | 5.9 | 1080x1920 | 30.0 | 1.0 | frames |
| 2026-11-03 10:21 | quicksilverxkingpin | remix | `out/quicksilverxkingpin/shorts/s01/quicksilverxkingpin-s01-9x16.mp4` | 1 |  |  | yes | 219.9 | 42.75 | 5.14 | 1080x1920 | 30.0 | 1.0 | same-name file |
| 2026-11-03 10:21 | breakingbadxdangerous | remix | `out/breakingbadxdangerous/shorts/s02/breakingbadxdangerous-s02-9x16.mp4` | 1 |  |  | yes | 260.3 | 55.55 | 4.69 | 1080x1920 | 30.0 | 0.74 | same-name file |
| 2026-11-03 10:26 | breakingbadxdangerous | remix | `out/breakingbadxdangerous/shorts/s03/breakingbadxdangerous-s03-9x16.mp4` | 1 |  |  | yes | 128.5 | 38.31 | 3.35 | 1080x1920 | 30.0 | 0.93 | same-name file |
| 2026-11-03 10:26 | kingpinxdeadpool | remix | `out/kingpinxdeadpool/shorts/s06/kingpinxdeadpool-s06-9x16.mp4` | 1 |  |  | yes | 167.2 | 46.36 | 3.61 | 1080x1920 | 30.0 | 0.84 | exact file |
| 2026-11-03 10:28 | quicksilverxkingpin | remix | `out/quicksilverxkingpin/shorts/s02/quicksilverxkingpin-s02-9x16.mp4` | 1 |  |  | yes | 151.3 | 38.68 | 3.91 | 1080x1920 | 30.0 | 0.99 | same-name file |
| 2026-11-03 10:29 | kingpinxdeadpool | remix | `out/kingpinxdeadpool/shorts/s07/kingpinxdeadpool-s07-9x16.mp4` | 1 |  |  | yes | 160.8 | 42.79 | 3.76 | 1080x1920 | 30.0 | 0.95 | exact file |
| 2026-11-03 10:31 | quicksilverxkingpin | remix | `out/quicksilverxkingpin/shorts/s03/quicksilverxkingpin-s03-9x16.mp4` | 1 |  |  | yes | 136.5 | 46.36 | 2.94 | 1080x1920 | 30.0 | 0.92 | same-name file |
| 2026-11-03 10:31 | kingpinxdeadpool | remix | `out/kingpinxdeadpool/shorts/s05/kingpinxdeadpool-s05-9x16.mp4` | 1 |  |  | yes | 129.1 | 41.15 | 3.14 | 1080x1920 | 30.0 | 0.79 | exact file |
| 2026-11-03 10:47 | quicksilverxkingpin | remix | `out/quicksilverxkingpin/shorts/s01/quicksilverxkingpin-s01-9x16.mp4` | 1 |  |  | yes | 78.3 | 42.75 | 1.83 | 1080x1920 | 30.0 | 0.27 | exact file |
| 2026-11-03 10:48 | breakingbadxdangerous | remix | `out/breakingbadxdangerous/shorts/s01/breakingbadxdangerous-s01-9x16.mp4` | 1 |  |  | yes | 148.7 | 38.14 | 3.9 | 1080x1920 | 30.0 | 0.94 | exact file |
| 2026-11-03 10:48 | quicksilverxkingpin | remix | `out/quicksilverxkingpin/shorts/s02/quicksilverxkingpin-s02-9x16.mp4` | 1 |  |  | yes | 158.1 | 38.68 | 4.09 | 1080x1920 | 30.0 | 0.75 | exact file |
| 2026-11-03 10:51 | quicksilverxkingpin | remix | `out/quicksilverxkingpin/shorts/s03/quicksilverxkingpin-s03-9x16.mp4` | 1 |  |  | yes | 104.6 | 46.36 | 2.26 | 1080x1920 | 30.0 | 0.07 | exact file |
| 2026-11-03 10:53 | breakingbadxdangerous | remix | `out/breakingbadxdangerous/shorts/s01/breakingbadxdangerous-s01-9x16.mp4` | 1 |  |  | yes | 86.3 | 38.14 | 2.26 | 1080x1920 | 30.0 | 0.08 | exact file |
| 2026-11-03 10:54 | breakingbadxdangerous | remix | `out/breakingbadxdangerous/shorts/s02/breakingbadxdangerous-s02-9x16.mp4` | 1 |  |  | yes | 80.3 | 55.55 | 1.45 | 1080x1920 | 30.0 | 0.0 | exact file |
| 2026-11-03 10:55 | breakingbadxdangerous | remix | `out/breakingbadxdangerous/shorts/s03/breakingbadxdangerous-s03-9x16.mp4` | 1 |  |  | yes | 42.7 | 38.31 | 1.11 | 1080x1920 | 30.0 | 0.0 | exact file |
| 2026-11-03 23:04 | fma-edwardeleric | waveform/lyric | `out/fma-edwardeleric/fma-edwardeleric.mp4` | 1 |  |  | yes | 1122.3 | 281.0 | 3.99 | 1920x1080 | 30.0 | 0.0 | exact file |
| 2026-11-04 00:14 | wakeup-waveform | waveform/lyric | `out/wakeup-waveform/wakeup-waveform.mp4` | 0.5 |  |  | yes | 874.5 | 264.85 | 3.3 | 960x540 | 30.0 | 0.0 | same-name file |
| 2026-11-04 00:35 | wakeup-waveform | waveform/lyric | `out/wakeup-waveform/wakeup-waveform.mp4` | 1 |  |  | yes | 726.5 | 264.85 | 2.74 | 1920x1080 | 30.0 | 0.0 | exact file |
| 2026-11-04 06:57 | fma-edwardeleric | waveform/lyric | `out/fma-edwardeleric/fma-edwardeleric.mp4` | 1 |  |  | yes | 605.1 | 281.0 | 2.15 | 1920x1080 | 30.0 | 0.0 | exact file |
| 2026-11-04 13:25 | private-1 | waveform/lyric | `out/private-1/private-1.mp4` | 1 |  |  | yes | 167.5 | 118.1 | 1.42 | 1920x1080 | 30.0 | 0.0 | exact file |
| 2026-11-05 21:58 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L1.mp4` | 0.5 | L1 | 1362-1541 | yes | 12.9 | 6.0 | 2.15 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-05 21:59 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L2.mp4` | 0.5 | L2 | 1362-1541 | yes | 14.6 | 6.0 | 2.43 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-05 21:59 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L3.mp4` | 0.5 | L3 | 1362-1541 | yes | 13.5 | 6.0 | 2.25 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-05 22:00 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L1.mp4` | 0.5 | L1 | 1362-1541 | yes | 12.3 | 6.0 | 2.05 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-05 22:01 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L2.mp4` | 0.5 | L2 | 1362-1541 | yes | 15.4 | 6.0 | 2.57 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-05 22:01 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L3.mp4` | 0.5 | L3 | 1362-1541 | yes | 14.5 | 6.0 | 2.42 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-05 22:02 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L1.mp4` | 0.5 | L1 | 1362-1541 | yes | 13.7 | 6.0 | 2.28 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-05 22:03 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L2.mp4` | 0.5 | L2 | 1362-1541 | yes | 16.1 | 6.0 | 2.68 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-05 22:03 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L3.mp4` | 0.5 | L3 | 1362-1541 | yes | 16.6 | 6.0 | 2.77 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-05 22:07 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L3.mp4` | 0.5 | L3 | 1362-1541 | yes | 20.3 | 6.0 | 3.38 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-05 22:07 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L3.mp4` | 0.5 | L3 | 1362-1541 | yes | 18.3 | 6.0 | 3.05 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-05 22:24 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L0.mp4` | 0.5 | L0 | 1362-1541 | yes | 27.1 | 6.0 | 4.52 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-05 22:37 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L0a.mp4` | 0.5 | L0a | 1446-1448 | yes | 11.6 | 0.1 | 116.0 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-05 22:37 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L0b.mp4` | 0.5 | L0b | 1446-1448 | yes | 10.9 | 0.1 | 109.0 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-05 22:37 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L0c.mp4` | 0.5 | L0c | 1446-1448 | yes | 10.7 | 0.1 | 107.0 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-05 22:38 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L0d.mp4` | 0.5 | L0d | 1446-1448 | yes | 11 | 0.1 | 110.0 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-05 22:38 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L0e.mp4` | 0.5 | L0e | 1446-1448 | yes | 10.7 | 0.1 | 107.0 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-05 22:40 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 0.5 |  |  | yes | 557.3 | 195.33 | 2.85 | 960x540 | 30.0 | 0.0 | same-name file |
| 2026-11-05 23:01 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 0.5 |  |  | yes | 397.5 | 195.33 | 2.04 | 960x540 | 30.0 | 0.0 | same-name file |
| 2026-11-05 23:14 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 0.5 |  |  | yes | 434.9 | 195.33 | 2.23 | 960x540 | 30.0 | 0.0 | exact file |
| 2026-11-05 23:21 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 0.5 |  |  | yes | 379.6 | 195.33 | 1.94 | 960x540 | 30.0 | 0.0 | same-name file |
| 2026-11-05 23:36 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 1 |  |  | yes | 540.1 | 195.33 | 2.77 | 1920x1080 | 30.0 | 0.0 | exact file |
| 2026-11-06 06:49 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 0.5 |  |  | yes | 355.7 | 215.33 | 1.65 | 1920x1080 | 30.0 | 0.0 | same-name file |
| 2026-11-07 04:29 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 0.5 |  |  | yes | 332.4 | 195.33 | 1.7 | 960x540 | 30.0 | 0.0 | same-name file |
| 2026-11-07 04:41 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L0.mp4` | 1 | L0 | 1620-1621 | yes | 15.1 | 0.07 | 226.5 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-07 04:41 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L0.mp4` | 1 | L0 | 1620-1621 | yes | 11.8 | 0.07 | 177.0 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-07 04:42 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L0.mp4` | 1 | L0 | 1620-1621 | yes | 11.2 | 0.07 | 168.0 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-07 04:42 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L0.mp4` | 1 | L0 | 609-610 | yes | 15.9 | 0.07 | 238.5 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-07 04:44 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 0.5 |  |  | yes | 336.5 | 195.33 | 1.72 | 960x540 | 30.0 | 0.0 | same-name file |
| 2026-11-07 05:04 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 0.5 |  |  | yes | 616.9 | 195.33 | 3.16 | 960x540 | 30.0 | 0.0 | same-name file |
| 2026-11-07 05:27 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L0.mp4` | 1 | L0 | 96-97 | yes | 14.1 | 0.07 | 211.5 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-07 05:27 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L0.mp4` | 1 | L0 | 96-97 | yes | 13 | 0.07 | 195.0 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-07 05:36 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 0.5 |  |  | yes | 471.2 | 195.33 | 2.41 | 960x540 | 30.0 | 0.0 | same-name file |
| 2026-11-07 05:50 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 0.5 |  |  | yes | 835.5 | 195.33 | 4.28 | 960x540 | 30.0 | 0.0 | exact file |
| 2026-11-07 06:06 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 0.5 |  |  | yes | 377.7 | 195.33 | 1.93 | 960x540 | 30.0 | 0.0 | same-name file |
| 2026-11-07 08:21 | doomcat-c1-ink | doomcat comic/teaser | `out/doomcat-c1-ink/doomcat-c1-ink.mp4` | 0.5 |  |  | yes | 21 | 37.46 | 0.56 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 08:21 | doomcat-c2-kinetic | doomcat comic/teaser | `out/doomcat-c2-kinetic/doomcat-c2-kinetic.mp4` | 0.5 |  |  | yes | 18.3 | 37.46 | 0.49 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 08:22 | doomcat-c3-casefile | doomcat comic/teaser | `out/doomcat-c3-casefile/doomcat-c3-casefile.mp4` | 0.5 |  |  | yes | 18.9 | 37.46 | 0.5 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 08:22 | doomcat-c4-circuit | doomcat comic/teaser | `out/doomcat-c4-circuit/doomcat-c4-circuit.mp4` | 0.5 |  |  | yes | 25.1 | 37.46 | 0.67 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 08:22 | doomcat-c5-ascii | doomcat comic/teaser | `out/doomcat-c5-ascii/doomcat-c5-ascii.mp4` | 0.5 |  |  | yes | 21.7 | 37.46 | 0.58 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 08:23 | doomcat-c4-circuit | doomcat comic/teaser | `out/doomcat-c4-circuit/doomcat-c4-circuit.mp4` | 0.5 |  |  | yes | 20.6 | 37.46 | 0.55 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 08:44 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 0.5 |  |  | yes | 354.4 | 195.33 | 1.81 | 960x540 | 30.0 | 0.0 | same-name file |
| 2026-11-07 09:00 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 0.5 |  |  | yes | 377.9 | 195.33 | 1.93 | 960x540 | 30.0 | 0.0 | same-name file |
| 2026-11-07 09:21 | doomcat-proto-news | doomcat comic/teaser | `out/doomcat-proto-news/doomcat-proto-news.mp4` | 0.75 |  |  | yes | 19.1 | 11.46 | 1.67 | 810x1440 | 30.0 | 0.0 | exact file |
| 2026-11-07 09:37 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 0.5 |  |  | yes | 464.8 | 195.33 | 2.38 | 960x540 | 30.0 | 0.0 | same-name file |
| 2026-11-07 10:12 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 0.5 |  |  | yes | 371.5 | 195.33 | 1.9 | 960x540 | 30.0 | 0.0 | same-name file |
| 2026-11-07 12:58 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/S08.mp4` | 0.5 | S08 | 1422-1661 | yes | 37.3 | 8.0 | 4.66 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-07 12:58 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/W07.mp4` | 0.5 | W07 | 1422-1661 | yes | 32.4 | 8.0 | 4.05 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-07 12:59 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/looks/L0.mp4` | 0.5 | L0 | 1422-1661 | yes | 31.7 | 8.0 | 3.96 | 960x540 | 30.0 | 0.0 | frames |
| 2026-11-07 15:09 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 0.5 |  |  | yes | 403.1 | 195.33 | 2.06 | 960x540 | 30.0 | 0.0 | same-name file |
| 2026-11-07 15:28 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 0.5 |  |  | yes | 403 | 195.33 | 2.06 | 960x540 | 30.0 | 0.0 | same-name file |
| 2026-11-07 15:44 | postcardsfromtomorrow | waveform/lyric | `out/postcardsfromtomorrow/postcardsfromtomorrow.mp4` | 1 |  |  | yes | 514.1 | 195.33 | 2.63 | 960x540 | 30.0 | 0.0 | same-name file |
| 2026-11-07 18:28 | doomcat-teaser-sketch | doomcat comic/teaser | `out/doomcat-teaser-sketch/doomcat-teaser-sketch.mp4` | 0.5 |  |  | yes | 19.7 | 19.95 | 0.99 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 18:28 | doomcat-teaser-ideo-comic | doomcat comic/teaser | `out/doomcat-teaser-ideo-comic/doomcat-teaser-ideo-comic.mp4` | 0.5 |  |  | yes | 19.4 | 19.95 | 0.97 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 18:29 | doomcat-teaser-klein-comic | doomcat comic/teaser | `out/doomcat-teaser-klein-comic/doomcat-teaser-klein-comic.mp4` | 0.5 |  |  | yes | 22.8 | 19.95 | 1.14 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 18:29 | doomcat-teaser-ideo-photo | doomcat comic/teaser | `out/doomcat-teaser-ideo-photo/doomcat-teaser-ideo-photo.mp4` | 0.5 |  |  | yes | 21.9 | 19.95 | 1.1 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 18:29 | doomcat-teaser-klein-photo | doomcat comic/teaser | `out/doomcat-teaser-klein-photo/doomcat-teaser-klein-photo.mp4` | 0.5 |  |  | yes | 20.3 | 19.95 | 1.02 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 18:41 | doomcat-teaser-doc | doomcat comic/teaser | `out/doomcat-teaser-doc/doomcat-teaser-doc.mp4` | 0.5 |  |  | yes | 15.8 | 19.95 | 0.79 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 18:41 | doomcat-teaser-punch | doomcat comic/teaser | `out/doomcat-teaser-punch/doomcat-teaser-punch.mp4` | 0.5 |  |  | yes | 14.6 | 19.95 | 0.73 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 18:42 | doomcat-teaser-editorial | doomcat comic/teaser | `out/doomcat-teaser-editorial/doomcat-teaser-editorial.mp4` | 0.5 |  |  | yes | 14 | 19.95 | 0.7 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 18:55 | doomcat-teaser-doc-video | doomcat comic/teaser | `out/doomcat-teaser-doc-video/doomcat-teaser-doc-video.mp4` | 0.5 |  |  | yes | 26.8 | 19.95 | 1.34 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 18:55 | doomcat-teaser-punch-video | doomcat comic/teaser | `out/doomcat-teaser-punch-video/doomcat-teaser-punch-video.mp4` | 0.5 |  |  | yes | 26 | 19.95 | 1.3 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 18:56 | doomcat-teaser-editorial-video | doomcat comic/teaser | `out/doomcat-teaser-editorial-video/doomcat-teaser-editorial-video.mp4` | 0.5 |  |  | yes | 32.3 | 19.95 | 1.62 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 18:56 | onemorerep-cutouts | footage short | `out/onemorerep-cutouts/onemorerep-cutouts.mp4` | 0.5 |  |  | yes | 15 | 12.5 | 1.2 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 19:26 | onemorerep | footage short | `out/onemorerep/onemorerep.mp4` | 0.5 |  |  | yes | 54.3 | 59.56 | 0.91 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-07 20:00 | doomcat-ep1-v6 | doomcat comic/teaser | `out/doomcat-ep1-v6/doomcat-ep1-v6.mp4` | 0.5 |  |  | yes | 45.8 | 115.46 | 0.4 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 20:12 | screamingtowin | kinetic type | `out/screamingtowin/screamingtowin.mp4` | 0.5 |  |  | yes | 24.7 | 24.04 | 1.03 | 540x960 | 30.0 | 0.17 | same-name file |
| 2026-11-07 20:12 | doomcat-ep1-v6-video | doomcat comic/teaser | `out/doomcat-ep1-v6-video/doomcat-ep1-v6-video.mp4` | 0.5 |  |  | yes | 105.3 | 115.46 | 0.91 | 540x960 | 30.0 | 0.32 | exact file |
| 2026-11-07 20:13 | onemorerep | footage short | `out/onemorerep/onemorerep.mp4` | 0.5 |  |  | yes | 143.5 | 59.56 | 2.41 | 540x960 | 30.0 | 0.2 | exact file |
| 2026-11-07 20:25 | screamingtowin | kinetic type | `out/screamingtowin/screamingtowin.mp4` | 0.5 |  |  | yes | 24.8 | 24.04 | 1.03 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 20:29 | onemorerep | footage short | `out/onemorerep/onemorerep.mp4` | 0.5 |  |  | yes | 69.8 | 65.6 | 1.06 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 20:38 | screamingtowin | kinetic type | `out/screamingtowin/screamingtowin.mp4` | 0.5 |  |  | yes | 23.7 | 24.04 | 0.99 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-07 22:21 | screamingtowin | kinetic type | `out/screamingtowin/screamingtowin.mp4` | 1 |  |  | yes | 40.5 | 24.04 | 1.68 | 1080x1920 | 30.0 | 0.0 | exact file |
| 2026-11-08 00:38 | someonetook | kinetic type | `out/someonetook/someonetook.mp4` | 0.5 |  |  | yes | 21.7 | 24.04 | 0.9 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-09 02:18 | doomcat-type | kinetic type | `out/doomcat-type/looks/V1.mp4` | 0.5 | V1 |  | yes | 14 | 12.47 | 1.12 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:18 | doomcat-type | kinetic type | `out/doomcat-type/looks/V2.mp4` | 0.5 | V2 |  | yes | 13.9 | 12.47 | 1.11 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:19 | doomcat-type | kinetic type | `out/doomcat-type/looks/V3.mp4` | 0.5 | V3 |  | yes | 12.6 | 12.47 | 1.01 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:19 | doomcat-type | kinetic type | `out/doomcat-type/looks/V4.mp4` | 0.5 | V4 |  | yes | 12.4 | 12.47 | 0.99 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:19 | doomcat-type | kinetic type | `out/doomcat-type/looks/V5.mp4` | 0.5 | V5 |  | yes | 14.4 | 12.47 | 1.16 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:19 | doomcat-type | kinetic type | `out/doomcat-type/looks/V6.mp4` | 0.5 | V6 |  | yes | 13.3 | 12.47 | 1.07 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:20 | doomcat-type | kinetic type | `out/doomcat-type/looks/V7.mp4` | 0.5 | V7 |  | yes | 12.8 | 12.47 | 1.03 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:20 | doomcat-type | kinetic type | `out/doomcat-type/looks/V8.mp4` | 0.5 | V8 |  | yes | 12.7 | 12.47 | 1.02 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:21 | doomcat-type | kinetic type | `out/doomcat-type/looks/V1.mp4` | 0.5 | V1 |  | yes | 13.9 | 12.47 | 1.12 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:22 | doomcat-type | kinetic type | `out/doomcat-type/looks/V2.mp4` | 0.5 | V2 |  | yes | 15.6 | 12.47 | 1.25 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:22 | doomcat-type | kinetic type | `out/doomcat-type/looks/V3.mp4` | 0.5 | V3 |  | yes | 12.2 | 12.47 | 0.98 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:22 | doomcat-type | kinetic type | `out/doomcat-type/looks/V5.mp4` | 0.5 | V5 |  | yes | 13.1 | 12.47 | 1.05 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:22 | doomcat-type | kinetic type | `out/doomcat-type/looks/V6.mp4` | 0.5 | V6 |  | yes | 12.8 | 12.47 | 1.03 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:23 | doomcat-type | kinetic type | `out/doomcat-type/looks/V8.mp4` | 0.5 | V8 |  | yes | 12.6 | 12.47 | 1.01 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:23 | doomcat-type | kinetic type | `out/doomcat-type/looks/V1.mp4` | 0.5 | V1 |  | yes | 13.7 | 12.47 | 1.1 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:46 | doomcat-type | kinetic type | `out/doomcat-type/looks/F1.mp4` | 0.5 | F1 |  | yes | 15.4 | 18.86 | 0.82 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-09 02:46 | doomcat-type | kinetic type | `out/doomcat-type/looks/F2.mp4` | 0.5 | F2 |  | yes | 15.2 | 18.86 | 0.81 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-09 02:47 | doomcat-type | kinetic type | `out/doomcat-type/looks/F3.mp4` | 0.5 | F3 |  | yes | 14.3 | 18.86 | 0.76 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-09 02:48 | doomcat-type | kinetic type | `out/doomcat-type/looks/F2.mp4` | 0.5 | F2 |  | yes | 14.5 | 18.86 | 0.77 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-09 02:48 | doomcat-type | kinetic type | `out/doomcat-type/looks/F3.mp4` | 0.5 | F3 |  | yes | 14.3 | 18.86 | 0.76 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-09 02:56 | doomcat-type | kinetic type | `out/doomcat-type/looks/C1.mp4` | 0.5 | C1 |  | yes | 14.6 | 12.47 | 1.17 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:56 | doomcat-type | kinetic type | `out/doomcat-type/looks/C1.mp4` | 0.5 | C1 |  | yes | 13.8 | 12.47 | 1.11 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:57 | doomcat-type | kinetic type | `out/doomcat-type/looks/C10.mp4` | 0.5 | C10 |  | yes | 14.3 | 12.47 | 1.15 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:57 | doomcat-type | kinetic type | `out/doomcat-type/looks/C3.mp4` | 0.5 | C3 |  | yes | 17 | 12.47 | 1.36 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:57 | doomcat-type | kinetic type | `out/doomcat-type/looks/C6.mp4` | 0.5 | C6 |  | yes | 15.2 | 12.47 | 1.22 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:58 | doomcat-type | kinetic type | `out/doomcat-type/looks/C5.mp4` | 0.5 | C5 |  | yes | 14 | 12.47 | 1.12 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:58 | doomcat-type | kinetic type | `out/doomcat-type/looks/C4.mp4` | 0.5 | C4 |  | yes | 16.8 | 12.47 | 1.35 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:58 | doomcat-type | kinetic type | `out/doomcat-type/looks/C7.mp4` | 0.5 | C7 |  | yes | 14.1 | 12.47 | 1.13 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:58 | doomcat-type | kinetic type | `out/doomcat-type/looks/C8.mp4` | 0.5 | C8 |  | yes | 13.1 | 12.47 | 1.05 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:59 | doomcat-type | kinetic type | `out/doomcat-type/looks/C2.mp4` | 0.5 | C2 |  | yes | 13.7 | 12.47 | 1.1 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:59 | doomcat-type | kinetic type | `out/doomcat-type/looks/C9.mp4` | 0.5 | C9 |  | yes | 14.4 | 12.47 | 1.16 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 02:59 | doomcat-type | kinetic type | `out/doomcat-type/looks/C1.mp4` | 0.5 | C1 |  | yes | 15.3 | 12.47 | 1.23 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 03:00 | someonetook-v2 | kinetic type | `out/someonetook-v2/someonetook-v2.mp4` | 0.5 |  |  | yes | 21.5 | 18.56 | 1.16 | 540x960 | 30.0 | 0.71 | same-name file |
| 2026-11-09 03:00 | doomcat-type | kinetic type | `out/doomcat-type/looks/C4.mp4` | 0.5 | C4 |  | yes | 21 | 12.47 | 1.68 | 540x960 | 30.0 | 0.73 | same-name file |
| 2026-11-09 03:01 | doomcat-type | kinetic type | `out/doomcat-type/looks/C8.mp4` | 0.5 | C8 |  | yes | 13.4 | 12.47 | 1.07 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 03:01 | doomcat-type | kinetic type | `out/doomcat-type/looks/C2.mp4` | 0.5 | C2 |  | yes | 13.4 | 12.47 | 1.07 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 03:01 | doomcat-type | kinetic type | `out/doomcat-type/looks/C9.mp4` | 0.5 | C9 |  | yes | 13.7 | 12.47 | 1.1 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 03:34 | doomcat-type | kinetic type | `out/doomcat-type/looks/P0.mp4` | 0.5 | P0 |  | yes | 17.4 | 12.65 | 1.38 | 1080x1920 | 30.0 | 0.0 | same-name file |
| 2026-11-09 03:34 | doomcat-type | kinetic type | `out/doomcat-type/looks/P1.mp4` | 0.5 | P1 |  | yes | 16.7 | 12.65 | 1.32 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 03:36 | doomcat-type | kinetic type | `out/doomcat-type/looks/P0.mp4` | 0.5 | P0 |  | yes | 14.9 | 12.65 | 1.18 | 1080x1920 | 30.0 | 0.0 | exact file |
| 2026-11-09 03:36 | doomcat-type | kinetic type | `out/doomcat-type/looks/P1.mp4` | 0.5 | P1 |  | yes | 14.7 | 12.65 | 1.16 | 540x960 | 30.0 | 0.0 | same-name file |
| 2026-11-09 03:36 | someonetook-v2 | kinetic type | `out/someonetook-v2/someonetook-v2.mp4` | 0.5 |  |  | yes | 20.4 | 18.56 | 1.1 | 540x960 | 30.0 | 0.19 | exact file |
| 2026-11-09 03:36 | doomcat-type | kinetic type | `out/doomcat-type/looks/P2.mp4` | 0.5 | P2 |  | yes | 16.3 | 12.65 | 1.29 | 540x960 | 30.0 | 0.23 | same-name file |
| 2026-11-09 03:37 | doomcat-type | kinetic type | `out/doomcat-type/looks/P0.mp4` | 1 | P0 |  | yes | 18.8 | 12.65 | 1.49 | 1080x1920 | 30.0 | 0.0 | exact file |
| 2026-11-09 03:38 | doomcat-type | kinetic type | `out/doomcat-type/looks/P2.mp4` | 0.5 | P2 | 0-90 | yes | 11.8 | 3.03 | 3.89 | 540x960 | 30.0 | 0.0 | frames |
| 2026-11-09 03:38 | doomcat-type | kinetic type | `out/doomcat-type/looks/P2.mp4` | 0.5 | P2 |  | yes | 16.5 | 12.65 | 1.3 | 540x960 | 30.0 | 0.0 | exact file |
| 2026-11-09 03:39 | doomcat-type | kinetic type | `out/doomcat-type/looks/F1.mp4` | 0.5 | F1 | 0-90 | yes | 12.4 | 3.03 | 4.09 | 540x960 | 30.0 | 0.0 | frames |
| 2026-11-09 03:39 | doomcat-type | kinetic type | `out/doomcat-type/looks/F1.mp4` | 0.5 | F1 | 0-90 | yes | 16.1 | 3.03 | 5.31 | 540x960 | 30.0 | 0.29 | frames |
| 2026-11-09 03:40 | someonetook-v2 | kinetic type | `out/someonetook-v2/someonetook-v2.mp4` | 1 |  |  | yes | 33 | 18.56 | 1.78 | 1080x1920 | 30.0 | 0.45 | exact file |
| 2026-11-09 03:40 | doomcat-type | kinetic type | `out/doomcat-type/looks/P1.mp4` | 0.5 | P1 |  | yes | 19.8 | 12.65 | 1.57 | 540x960 | 30.0 | 0.52 | exact file |
| 2026-11-09 03:40 | doomcat-type | kinetic type | `out/doomcat-type/looks/P2.mp4` | 0.5 | P2 |  | yes | 14.9 | 12.65 | 1.18 | 540x960 | 30.0 | 0.0 | exact file |
