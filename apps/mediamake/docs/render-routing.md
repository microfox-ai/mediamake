# Render routing: local or Lambda

Every render gets a suggested place to run, with the reason, from `lib/render-routing/plan.ts`. It is a suggestion: the user always picks between Lambda and local.

What drives Lambda cost is media volume. Every Lambda chunk downloads each video or audio file it touches in full and decodes the part it renders, so cost grows with file size and with how many seconds of media the composition plays. A render is **heavy**, so local is suggested, when any of these is reached (`HEAVY_LIMITS`):

| Limit | Default |
| --- | --- |
| One video or audio file | 1 GB |
| All video and audio files together | 500 MB |
| Video played, summed over clips | 5 minutes |
| Audio played, summed over tracks | 30 minutes |

Everything lighter suggests Lambda: images and graphics, a song, one clip, a few short clips. Stills always suggest Lambda.

Time played comes from each atom's timing, else its trim (`startFrom`/`endAt`), else its source duration, else its parent's or the composition's duration, capped at the composition. File sizes come from the atom (`fileSize`/`size`) or a HEAD request (`lib/render-routing/sizes.ts`). When a size is unknown the plan goes by duration and says so.

Two cases leave no choice: media from the user's computer (`/__local-media/…`) can't reach Lambda, and clients without Lambda access (below) render locally.

"Local" means the user's machine: the Browser tab in the editor (or Local Render when the app runs locally), or `remotion render` and the `lyrics_videos` scripts from a terminal.

The limits and the weighing live in `lib/render-routing/limits.ts`, a file with no imports, so the `lyrics_videos` scripts can import it as a file and weigh a project the same way; `plan.ts` walks timelines and builds on it.

## lyrics_videos projects

A lyrics project (`apps/lyrics_videos/projects/<slug>`) renders on Lambda from one command, `npm run render-project -w lyrics_videos -- <slug> --lambda [--window=a-b]` (`apps/lyrics_videos/scripts/lambda.ts`, documented in that app's README). It uses the same bucket, regions and function presets as the app (`config.mjs`), with its own site per project, `lyrics-<slug>`, whose public folder carries the project's inputs; the manifest goes in as inputProps.

The render goes through `POST /api/remotion/render` with `siteName: "lyrics-<slug>[-<region>]"` (only sites of that shape are accepted; `frameRange: [from, to]`, `scale` and `crf` are the video options it takes) and `GET /api/remotion/progress` until it is done, so it is a mediamake render like any other: Lambda access is checked, the render is in the user's history (`siteName` stored on it, tags `lyrics_videos` and the slug), the cost lands in the platform's cost usage and the quota is counted. The script's `--direct` goes straight to AWS with the keys on the machine instead, outside those records.

Its plan comes from the project's manifest rather than a timeline, with the same limits (`weighMedia`): the song plays for the whole video; a clip the project's code names (by its manifest key or path) counts as playing all along, since overlays loop under everything; a clip the manifest lists but nothing names is uploaded but not counted; images are reported, not counted (a chunk fetches only the ones its frames show). `npm run lambda -w lyrics_videos -- plan <slug>` shows the plan without spending anything; a render prints it before it starts. `--lambda` is the user's pick, so a heavy project still renders on Lambda when asked, with the reason shown.

## Who may use Lambda

Lambda is billed to us, so `/api/remotion/render` and `/api/remotion/render/preset` refuse with 403 (and `renderTarget: "local"`) unless the client has render access (`lib/render-routing/lambda-access.ts`):

- admins (`isAdmin` on the Redis user profile);
- the private tier: the `private` access group, or a `'*'` grant;
- a per-client flag: `HSET user:{clientId} lambdaRender true`, or as an admin
  `POST /api/admin/user-config { "type": "lambda_render", "clientId": "…", "allowed": true }`.

`MEDIAMAKE_LAMBDA_ACCESS=any-key` opens Lambda to every API key again (the old behaviour). In development everyone has access.

An API key alone isn't enough, because every signed-in user logs in with one and `/api/signup` gives one to anyone.

## API

- `GET /api/remotion/render/plan` returns `{ lambda: { allowed, reason? } }` for the caller.
- `POST /api/remotion/render/plan` with `{ inputProps, renderType?, sizes? }` returns the full plan: the suggested `target`, `reason`, `lambdaAvailable` and the measured media (`load`). Sizes you don't pass (src → bytes) are looked up with HEAD requests.
- Successful Lambda renders include `routing: { recommended, reason }` in the response.

The editor's render dialog checks the file sizes, opens on the suggested tab, marks it with a green dot, and shows the reason under the tabs with a one-click switch. Every tab stays available. The MCP has `plan_render`, and `render` defaults to `target: "auto"`.

## To do: a render worker on a rented server

Lambda is the right place for light lyrics projects (a picture, a song and type: wakeup-waveform's
whole video is about $0.70 and takes about 4 minutes against 12 on an M3 Pro), for quick parallel
review rounds, and for teammates without a strong machine. For heavy ones it is not: on 2026-11-04 the
fma-edwardeleric video (32 stage masks, cutouts, an overlay) cost $3.97 and took 17 minutes on Lambda,
154 chunks on 10 GB functions, while the user's Mac renders it in 10–19 minutes for nothing. Every
chunk boots its own Chrome, downloads the pack and warms the fonts and images again, three tabs on one
function contend for the CPU, and a Lambda core is slower than a laptop core: per render, Lambda
compute is roughly 20–30 times what a rented box's would be. A Hetzner dedicated 8-core box (~$100 a
month) breaks even at about one heavy render a day; an EC2 c6i.4xlarge started per job and stopped
after costs about $0.20 a render.

The plan, when cloud renders become routine (the portal task "Figure out cloud renders"):

- a worker (`apps/lyrics_videos/scripts/render-worker.ts`) on a Linux box with Node, Chrome and
  ffmpeg that pulls render jobs from mediamake: a worker route next to `/api/remotion/render`, the
  same render history and cost usage as Lambda renders, the box's hourly price recorded as the cost;
- the project's pack fetched the way the Lambda path stages it (`stageProject` in
  `apps/lyrics_videos/scripts/lambda.ts`: the staged folder uploaded once, synced to the worker), the
  bundle built with `ONLY_PROJECT`, the render through `@remotion/renderer` at the machine's
  concurrency, the file uploaded to the Lambda bucket or the media store;
- a provisioning script or Dockerfile for the box, with start/stop automation if it is EC2;
- `render-project -- <slug> --worker` on the lyrics side, polling and downloading like `--lambda`;
- docs here and in `apps/lyrics_videos/README.md`, and a note in the `render-cloud` skill on when
  to pick which.

Ask before renting anything (price per hour, estimated per-render cost). Done means wakeup-waveform
renders end to end through the worker on a real box with its cost recorded in mediamake, the numbers
reported next to Lambda's, and a PR open.
