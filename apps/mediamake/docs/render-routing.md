# Render routing: local or Lambda

Every render has a recommended place to run, picked by `lib/render-routing/plan.ts`.

| Timeline | Recommended | Why |
| --- | --- | --- |
| Any video or audio (video atoms, audio atoms, waveforms, beat montages, or media URLs anywhere in the props) | Local | Each Lambda downloads and decodes the same media again, so cost grows with media. Your own machine already has it. |
| An audio-only render | Local | Same reason. |
| Images, text, shapes, Lottie and HTML only | Lambda | Cheap to split across many functions, and much faster there. |
| Any still | Lambda | One frame, a few cents at most. |
| Files from your computer (`/__local-media/…`) | Local | Lambda can't reach them. |
| A client without Lambda access | Local | See below. |

"Local" means the user's machine: the Browser tab in the editor (or Local Render when the app runs locally), or `remotion render` and the `lyrics_videos` scripts from a terminal.

Heavy renders are only a recommendation: someone with Lambda access can still pick the AWS Lambda tab, or pass `target: "lambda"` to the MCP `render` tool.

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
- `POST /api/remotion/render/plan` with `{ inputProps, renderType? }` returns the full plan: `target`, `reason`, `lambdaAvailable` and the media counts (`load`).
- Successful Lambda renders include `routing: { recommended, reason }` in the response.

The editor's render dialog opens on the recommended tab, marks it with a green dot, and shows the reason under the tabs. The MCP has `plan_render`, and `render` defaults to `target: "auto"`.
