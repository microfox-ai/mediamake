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
