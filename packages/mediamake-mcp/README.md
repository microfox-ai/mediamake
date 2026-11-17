# @microfox/mediamake-mcp

MediaMake's MCP servers. One package builds three, each a thin wrapper over the `/api/*` routes in `apps/mediamake`:

| Server | For | Hosted at | What it does |
| --- | --- | --- | --- |
| **mm-use** | every member | `https://<your-mediamake-host>/mcp/use` | Explore the skills, MCPs and apps, get install plans, check versions, report usage (a skill's name and time; local skill names and versions), send feedback |
| **mm-release** | admins | `https://<your-mediamake-host>/mcp/release` | The catalog and releases: every `catalog_*` tool |
| **mediamake** (deprecated) | admins | `https://<your-mediamake-host>/mcp` | The old video tools of MediaMake Core: timelines, presets, transcription, Suno takes, workers, agents and renders. Nothing new is added |

Until 0.5.0 these were one server, the MediaMake MCP. Projects, brand kits, productions, release kits and media are **ProjectSync**'s ([`packages/projectsync-mcp`](../projectsync-mcp/README.md)), the local MCP for everyone on a project.

Each comes two ways:

- **Hosted, by URL** (easiest): add the address as a connector and sign in with your MediaMake account. Nothing to install.
- **Local** (stdio): `node dist/index.js release|use|legacy` with an API key. `release` is the one to run locally when a catalog tool should read a file on your computer (`thumbnailFile`); `legacy` when the old video tools should (`filePath`, `saveTo`), which is also what the `.mcpb` runs.

## Add by URL (hosted connectors)

- **Claude (claude.ai and Claude Desktop)**: Settings → Connectors → Add custom connector, with the address from the table. Claude opens the MediaMake sign-in page; sign in, then press Allow.
- **Claude Code**: `claude mcp add --transport http mm-use https://<your-mediamake-host>/mcp/use` (or `mm-release … /mcp/release`), then `/mcp` in a session to sign in. Or skip the sign-in with a key: add `--header "Authorization: Bearer <api key>"`.
- **Any other MCP client** that speaks Streamable HTTP and OAuth works the same way.
- From MediaMake: paste "Set up mcp/mm-use from MediaMake by following https://github.com/microfox-ai/mediamake/blob/main/install.md" into Claude (or `mcp/mm-release`).

Who may connect follows each connector's catalog item (`apps/mediamake/lib/mcp/connectors.ts`):

- `mcp/mm-use` is open to every signed-in account, Public members included.
- `mcp/mm-release` and `mcp/mediamake` are in the vault (`neverPublish`): admins, and anyone granted the item by name. Everyone else is told so on the consent screen and gets a 403 from the endpoint.

A sign-in is the account's, not one connector's: the consent screen reads which connector the client asked for (the `resource` it sends) to explain what it will do, and each endpoint checks who may use it on every request.

A connector acts as your account: it calls the API with one of your API keys, so your membership and access grants apply exactly as they do anywhere else. Disabling that key on the API keys page disconnects it within the hour (when its access token expires); signing out of the connector in the client revokes its tokens straight away.

The hosted servers can't see your files:

- `transcribe` and `get_transcription` take URLs only (no `filePath` or `saveTo`).
- `catalog_set_video` and `catalog_add_video_item` take an https thumbnail link (no `thumbnailFile`).
- mm-use installs nothing itself: `install_item` gives the plan and Claude carries it out on your computer as [install.md](../../install.md) says.

How it works, in `apps/mediamake`:

| Path | What it is |
| --- | --- |
| `/mcp/use`, `/mcp/release`, `/mcp` | The three MCP servers (Streamable HTTP, stateless JSON responses), all through `lib/mcp/serve.ts`. Each accepts an OAuth access token or a plain API key as `Authorization: Bearer`. |
| `/.well-known/oauth-protected-resource[/mcp[/use\|/release]]` | RFC 9728 metadata pointing clients at the OAuth server, naming the address asked for as its `resource` |
| `/.well-known/oauth-authorization-server` | RFC 8414 OAuth server metadata |
| `/oauth/register` | Dynamic client registration (RFC 7591), which is how Claude registers itself |
| `/oauth/authorize` | Sends signed-out users to `/login`, then shows an Allow / Cancel screen (authorization code + PKCE S256) |
| `/oauth/token`, `/oauth/revoke` | Code and refresh-token exchange (refresh tokens rotate), and revocation |

Clients, codes and tokens live in Upstash Redis (`oauthClients`, `oauthCodes`, `oauthAccessTokens`, `oauthRefreshTokens`), keyed by the SHA-256 of each token. Access tokens last an hour and refresh tokens 30 days. Two optional environment variables on the app:

| Variable | Default | |
| --- | --- | --- |
| `MEDIAMAKE_PUBLIC_URL` | the request's host | The public origin used in the OAuth metadata. Set it behind a custom domain or proxy. |
| `MCP_API_BASE_URL` | the public origin | Where the MCP routes send their `/api/*` calls. Set it when the public URL can't call itself, for example a preview deployment behind Vercel Deployment Protection. |

Tool calls run inside the route's function, so each one is bounded by its `maxDuration` (300 s for `/mcp`, 60 s for the other two). A render with `wait: true` stops waiting after about four and a half minutes and returns its progress; `render_status` picks it up from there.

## Local setup

```bash
npm run build --workspace @microfox/mediamake-mcp
```

| Variable               | Default                 |                                                                                           |
| ---------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| `MEDIAMAKE_API_URL`    | `http://localhost:3000` | Base URL of the Mediamake app                                                             |
| `MEDIAMAKE_API_KEY`    | none                    | API key from Settings → API keys. Not needed against a dev server that sets `DEV_API_KEY` |
| `MEDIAMAKE_TIMEOUT_MS` | `300000`                | Per-request timeout                                                                       |

| `MEDIAMAKE_MCP_SERVER` | `legacy`                | Which server the stdio entry runs when no argument names one: `release`, `use` or `legacy`  |

The repo's `.mcp.json` already registers all three (`mm-release`, `mm-use`, `mediamake`) for Claude Code sessions opened at the repo root (build the package first). Elsewhere:

```bash
claude mcp add mm-release -e MEDIAMAKE_API_URL=https://your-mediamake-host -e MEDIAMAKE_API_KEY=... -- node /path/to/mediamake/packages/mediamake-mcp/dist/index.js release
```

### Install in Claude Desktop (.mcpb)

```bash
npm run build:mcpb --workspace @microfox/mediamake-mcp   # writes packages/mediamake-mcp/mediamake.mcpb
```

The bundle is the deprecated server (the old video tools). Double-click `mediamake.mcpb` (or drag it into Claude Desktop's Settings → Extensions). It asks for the Mediamake URL and API key, and the key is stored in the OS keychain. The bundle is one self-contained `server/index.js` and needs only the Node runtime Claude Desktop ships with.

## Tools

### mm-use (every member)

| Area | Tools |
| --- | --- |
| Explore | `explore` (every item with the membership that opens it, whether this account can open it, Beta or Ready), `get_item`, `item_versions` |
| Install | `install_item` (the item's install plan for this account; Claude carries it out) |
| Usage | `report_skill_run` (a skill's name and the time, nothing else), `my_usage`, `report_local_skills` (names and versions) |
| Store submissions | `submit_item` (a skill, MCP or app the user built, sent privately for review with the finished production made with it), `my_submissions` (where each stands), `withdraw_submission` |
| Feedback | `send_feedback` (the user's words, about one item or MediaMake as a whole), `my_feedback` (what they sent and what came of it), `known_issues` (an item's known issues, the list admins keep) |

Usage is described in [usage.md](../../apps/mediamake/docs/usage.md): what is sent, where it is kept, and how to turn it off (`mm usage off`).

### mm-release (admins)

`catalog_items`, `catalog_item`, `catalog_versions`, `catalog_archive`, `catalog_set_health`, `catalog_set_readiness`, `catalog_set_stage`, `catalog_add_third_party`, `catalog_set_video`, `catalog_add_video_item`, `catalog_invite`, `catalog_people`, `catalog_set_tier`, `catalog_membership` (see "Managing the catalog").

### mediamake (deprecated, admins)

| Area                   | Tools                                                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Timelines              | `list_timelines`, `get_timeline`, `survey_timelines`, `create_timeline`, `update_timeline`, `list_legacy_timelines`, `get_legacy_timeline` (project ids come from ProjectSync's `list_projects`) |
| Generations            | `list_generations`, `rate_generation` (song takes made with Suno; Plus members and above)                                                                                                |
| Presets                | `list_presets`, `get_preset`, `add_preset_to_timeline`                                                                                                                                       |
| Transcription          | `transcribe`, `list_transcriptions`, `get_transcription`                                                                                                                                     |
| Workers and agents     | `list_workers`, `get_worker_schema`, `run_worker`, `get_worker_job`, `list_agents`, `run_agent`                                                                                              |
| Renders                | `plan_render`, `render`, `render_presets`, `render_status`, `list_renders`, `get_render_input_props`                                                                                                        |

There are no delete tools on purpose.

### Managing the catalog

Admins run MediaMake's releases from Claude with mm-release's catalog tools; for anyone else the API answers
403. `catalog_items` lists every skill, MCP, app, tutorial and course with the lowest membership that opens it,
whether it is Beta or Ready, its health, where it comes from and whether it is archived; `catalog_item` shows one in full. `catalog_archive` takes unused items off
the homepage (they stay public and installable by their link), `catalog_set_health` says whether items of any kind work (healthy,
inactive, archived, or failed with the reason, shown on their cards and pages), `catalog_set_readiness` marks items
Ready with the finished productions that prove it (or back to Beta), `catalog_set_stage` sets the lowest
membership that opens one of our apps, MCPs, tutorials, courses or packaged skills (public, plus, pro, cohort or
the vault), `catalog_add_third_party`
lists an open-source or hosted MCP or skill made by others, and `catalog_invite` makes an invite link
(to items, or into a tier). Videos are YouTube links only: `catalog_set_video` sets a skill's intro (or
an MCP's or app's), a tutorial's video or a course's lessons, keeping the fields left out, and
`catalog_add_video_item` adds a tutorial or course (it starts with the cohort). On the local server
`thumbnailFile` uploads a thumbnail from this computer; on the hosted one, pass an https link. People: the memberships are a
strict ladder (Public, Plus, Pro, Cohort, Admin), each opening everything below it. `catalog_people` shows who holds
each one, how they got it and how long it lasts; `catalog_set_tier` gives people a Plus, Pro or Cohort membership
(or takes it away) by client id or name, with its source (an admin grant, a contribution, an invite); and
`catalog_membership` makes one permanent, renews it for a new contribution or ends it. A membership earned by
contributing lasts 3 months unless an admin makes it permanent.
Every answer carries the release page of each item (`/core/releases/<kind>/<slug>`) to give the user.
See [catalog-releases.md](../../apps/mediamake/docs/catalog-releases.md).

### Timeline formats

Saved timelines exist in three shapes, and every timeline this server returns says which one in `format`:

- `tree`: current. `nodes` holds the preset instance tree (scenes, tracks, modifiers with explicit timing); `presets` holds each instance's input.
- `flat`: older. A `presets` array only; the editor derives one root scene on load.
- `legacy-preset-data`: oldest, deprecated. Lives in the `presetData` collection; import it with `create_timeline` and `legacyId`.

`get_timeline` returns a compact summary by default (config, references, preset list, node outline, warnings such as deprecated presets). `detail: "full"` returns the document with embedded preset code removed and, with `maxArrayItems`, long caption arrays cut short. `survey_timelines` aggregates many timelines at once (formats, preset usage per format, canvas sizes), which is the starting point for learning how existing videos are built.

### Projects, brand kits and media

They moved to ProjectSync (`packages/projectsync-mcp`): `list_projects`, `get_project`, `create_project`, `update_project`, the brand kit tools (`get_brand_kit`, `upload_brand_kit`, `finish_brand_kit_upload`, `update_brand_kit`) and the media tools, with productions and release kits beside them, all under each project's permissions.

### Generations

Every song take made for a channel with Suno (songs, covers, extends, remasters) is saved on its project: Browse Hack records each one as it is made, with its styles, lyrics, model, settings, audio and parent take. `list_generations` reads them newest first and filters by rating (`keeper`, `maybe`, `reject`, `unrated`), model, kind, parent take or words in the title, styles and lyrics (a suno.com/song link finds that take and the ones made from it). `rate_generation` sets the rating, adds a note, and records the productions a take was used in (`usedIn`) or the media library item it was filed as (`libraryItem`). Reading needs anyone the project is shared with; rating needs its owner or an editor. The routes are in [apps/mediamake/docs/generations.md](../../apps/mediamake/docs/generations.md).

### Lyric videos

`transcribe` and `get_transcription` take `saveTo` to write the captions straight to a `studio` project's `input/lyrics.json`; the file is the mediamake caption format that `apps/studio` already reads.

### Renders

`render_presets` runs a list of preset instances server-side and renders on Lambda. It runs them in list order and does not apply a tree timeline's `nodes` timing, so for an exact editor match export the composition from the editor and use `render` with those `inputProps` (or reuse a past render's with `get_render_input_props`). `render` with `target: "local"` renders on the machine running the app (dev server only), which helps while Lambda is being redeployed.

`render` defaults to `target: "auto"`, which asks the app where the render should run (`plan_render` shows the same answer without rendering). The suggestion weighs how much media the composition plays and how big the files are: minutes of video, a 1 GB+ file or 500 MB+ of media in all are cheaper on your own machine, while a song, a clip or a few short clips render fine on Lambda. `auto` renders on Lambda when that is the suggestion and otherwise returns the plan with `rendered: false`, so you can show the user why and let them choose. Lambda is also only open to API keys with render access (admins, the private tier, or a per-client `lambdaRender` flag). Pass `target: "lambda"` to render a heavy timeline on Lambda anyway.

## Development

```bash
npm test --workspace @microfox/mediamake-mcp    # unit tests for timeline format detection
npm run type-check --workspace @microfox/mediamake-mcp
```
