# @microfox/mediamake-mcp

An MCP server that lets Claude (or any MCP client) drive Mediamake through its HTTP API: read projects and saved timelines, browse presets, build timelines, upload media, transcribe songs, run generation workers and agents, and render.

It is a thin wrapper over the existing `/api/*` routes in `apps/mediamake`, authenticated with a Mediamake API key, so it works against production or a local dev server. It comes two ways:

- **Hosted, by URL** (easiest): the Mediamake app serves it at `https://<your-mediamake-host>/mcp`. Add that URL as a connector and sign in with your Mediamake account. Nothing to install.
- **Local** (stdio, `.mcpb` or `node dist/index.js`): runs on your machine with an API key, and is the one to use when Claude should read or write files on your computer.

## Add by URL (hosted connector)

- **Claude (claude.ai and Claude Desktop)**: Settings → Connectors → Add custom connector, URL `https://<your-mediamake-host>/mcp`. Claude opens the Mediamake sign-in page; log in with your client ID and key, then press Allow.
- **Claude Code**: `claude mcp add --transport http mediamake https://<your-mediamake-host>/mcp`, then `/mcp` in a session to sign in. Or skip the sign-in with a key: `claude mcp add --transport http mediamake https://<your-mediamake-host>/mcp --header "Authorization: Bearer <api key>"`.
- **Any other MCP client** that speaks Streamable HTTP and OAuth works the same way.

The connector acts as your account: it calls the API with one of your API keys, so your tier (public, community, private, admin) and access grants apply exactly as they do with the `.mcpb`. Disabling that key on the API keys page disconnects it within the hour (when its access token expires); signing out of the connector in the client revokes its tokens straight away.

It has every tool except the ones that touch files on your computer: no `upload_brand_kit` (upload kits on the Projects page instead), and `upload_media`, `transcribe` and `get_transcription` take URLs only (no `filePath` or `saveTo`).

How it works, in `apps/mediamake`:

| Path | What it is |
| --- | --- |
| `/mcp` | The MCP server (Streamable HTTP, stateless JSON responses). Accepts an OAuth access token or a plain API key as `Authorization: Bearer`. |
| `/.well-known/oauth-protected-resource[/mcp]` | RFC 9728 metadata pointing clients at the OAuth server |
| `/.well-known/oauth-authorization-server` | RFC 8414 OAuth server metadata |
| `/oauth/register` | Dynamic client registration (RFC 7591), which is how Claude registers itself |
| `/oauth/authorize` | Sends signed-out users to `/login`, then shows an Allow / Cancel screen (authorization code + PKCE S256) |
| `/oauth/token`, `/oauth/revoke` | Code and refresh-token exchange (refresh tokens rotate), and revocation |

Clients, codes and tokens live in Upstash Redis (`oauthClients`, `oauthCodes`, `oauthAccessTokens`, `oauthRefreshTokens`), keyed by the SHA-256 of each token. Access tokens last an hour and refresh tokens 30 days. Two optional environment variables on the app:

| Variable | Default | |
| --- | --- | --- |
| `MEDIAMAKE_PUBLIC_URL` | the request's host | The public origin used in the OAuth metadata. Set it behind a custom domain or proxy. |
| `MCP_API_BASE_URL` | the public origin | Where `/mcp` sends its `/api/*` calls. Set it when the public URL can't call itself, for example a preview deployment behind Vercel Deployment Protection. |

Tool calls run inside the `/mcp` function, so each one is bounded by its `maxDuration` (300 s). A render with `wait: true` stops waiting after about four and a half minutes and returns its progress; `render_status` picks it up from there.

## Local setup

```bash
npm run build --workspace @microfox/mediamake-mcp
```

| Variable               | Default                 |                                                                                           |
| ---------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| `MEDIAMAKE_API_URL`    | `http://localhost:3000` | Base URL of the Mediamake app                                                             |
| `MEDIAMAKE_API_KEY`    | none                    | API key from Settings → API keys. Not needed against a dev server that sets `DEV_API_KEY` |
| `MEDIAMAKE_TIMEOUT_MS` | `300000`                | Per-request timeout                                                                       |

The repo's `.mcp.json` already registers it for Claude Code sessions opened at the repo root (build it first). Elsewhere:

```bash
claude mcp add mediamake -e MEDIAMAKE_API_URL=https://your-mediamake-host -e MEDIAMAKE_API_KEY=... -- node /path/to/mediamake/packages/mediamake-mcp/dist/index.js
```

### Install in Claude Desktop (.mcpb)

```bash
npm run build:mcpb --workspace @microfox/mediamake-mcp   # writes packages/mediamake-mcp/mediamake.mcpb
```

Double-click `mediamake.mcpb` (or drag it into Claude Desktop's Settings → Extensions). It asks for the Mediamake URL and API key, and the key is stored in the OS keychain. The bundle is one self-contained `server/index.js` and needs only the Node runtime Claude Desktop ships with.

## Tools

| Area                   | Tools                                                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Projects and timelines | `list_projects`, `get_project`, `create_project`, `list_timelines`, `get_timeline`, `survey_timelines`, `create_timeline`, `update_timeline`, `list_legacy_timelines`, `get_legacy_timeline` |
| Brand kits             | `get_brand_kit`, `upload_brand_kit`, `update_brand_kit` (community access or above)                                                                                                       |
| Presets                | `list_presets`, `get_preset`, `add_preset_to_timeline`                                                                                                                                       |
| Media                  | `list_media`, `search_media`, `get_media`, `upload_media`                                                                                                                                    |
| Transcription          | `transcribe`, `list_transcriptions`, `get_transcription`                                                                                                                                     |
| Workers and agents     | `list_workers`, `get_worker_schema`, `run_worker`, `get_worker_job`, `list_agents`, `run_agent`                                                                                              |
| Renders                | `plan_render`, `render`, `render_presets`, `render_status`, `list_renders`, `get_render_input_props`                                                                                                        |

There are no delete tools on purpose.

### Timeline formats

Saved timelines exist in three shapes, and every timeline this server returns says which one in `format`:

- `tree`: current. `nodes` holds the preset instance tree (scenes, tracks, modifiers with explicit timing); `presets` holds each instance's input.
- `flat`: older. A `presets` array only; the editor derives one root scene on load.
- `legacy-preset-data`: oldest, deprecated. Lives in the `presetData` collection; import it with `create_timeline` and `legacyId`.

`get_timeline` returns a compact summary by default (config, references, preset list, node outline, warnings such as deprecated presets). `detail: "full"` returns the document with embedded preset code removed and, with `maxArrayItems`, long caption arrays cut short. `survey_timelines` aggregates many timelines at once (formats, preset usage per format, canvas sizes), which is the starting point for learning how existing videos are built.

### Brand kits

A project is a channel or brand, and its brand kit (logo, animated logo, intros, outros, end screens, channel art, icons, fonts, colours, brand guide, thumbnail profile) lives on it. `upload_brand_kit` takes the folder `pack-brand-kit` exports (`apps/lyrics_videos/brands/<brand>/`) and uploads it in one call (`dryRun` lists it first); `get_brand_kit` is what to read before making anything for that brand. Brand kits need community access or above: public accounts keep their kits locally.

### Lyric videos

`transcribe` and `get_transcription` take `saveTo` to write the captions straight to a `lyrics_videos` project's `input/lyrics.json`; the file is the mediamake caption format that `apps/lyrics_videos` already reads.

### Renders

`render_presets` runs a list of preset instances server-side and renders on Lambda. It runs them in list order and does not apply a tree timeline's `nodes` timing, so for an exact editor match export the composition from the editor and use `render` with those `inputProps` (or reuse a past render's with `get_render_input_props`). `render` with `target: "local"` renders on the machine running the app (dev server only), which helps while Lambda is being redeployed.

`render` defaults to `target: "auto"`, which asks the app where the render should run (`plan_render` shows the same answer without rendering). The suggestion weighs how much media the composition plays and how big the files are: minutes of video, a 1 GB+ file or 500 MB+ of media in all are cheaper on your own machine, while a song, a clip or a few short clips render fine on Lambda. `auto` renders on Lambda when that is the suggestion and otherwise returns the plan with `rendered: false`, so you can show the user why and let them choose. Lambda is also only open to API keys with render access (admins, the private tier, or a per-client `lambdaRender` flag). Pass `target: "lambda"` to render a heavy timeline on Lambda anyway.

## Development

```bash
npm test --workspace @microfox/mediamake-mcp    # unit tests for timeline format detection
npm run type-check --workspace @microfox/mediamake-mcp
```
