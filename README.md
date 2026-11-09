# MediaMake

> **Work in progress.** Contact [karcreativeworks](https://github.com/karcreativeworks) for access, requests or to contribute.

MediaMake turns JSON into videos. It is built on [Remotion](https://www.remotion.dev): a video is a
timeline of presets (a scene, then tracks such as captions or a waveform, then effects) plus the media
they point at, and the app renders it on AWS Lambda or on your own machine. Around that sit the tools
for making content with Claude: an MCP server, a library of skills, brand kits, review apps and a
catalog for handing all of it out.

## What's in the repo

```
apps/
  mediamake/          The Next.js app: Core dashboard, editor, API, hosted MCP, catalog, review apps
  studio/             Remotion workspace where every video is made: lyric videos, remixes, AMVs, shorts, posters (`mm`)
  writepad/           A separate writing app (Next.js), not part of the MediaMake site
packages/
  remotion/           @microfox/remotion: JSON → Remotion components (scenes, layouts, atoms, effects)
  datamotion/         @microfox/datamotion: data-driven component configs used by the AI agents
  mediamake-mcp/      @microfox/mediamake-mcp: the MCP server (local stdio / .mcpb build)
tools/
  skills.mjs          Lists, forks and publishes skills, builds skills.json, checks them for keys and paths
  eslint-config/, tsconfig/   Shared lint and TypeScript configs
scripts/              Release and CI helper scripts (used by .github/workflows)
private/              Your unreleased MCPs and apps. Gitignored except its README
.agents/skills/       Every skill (all public, committed); .claude/skills links to them
install.md            What Claude follows to install a catalog item
```

## The app (`apps/mediamake`)

The site has a public side and a signed-in side.

- **`/`** is the homepage and catalog: MCPs, skills, apps and tutorials, each with an install prompt.
- **`/apps`** is the launcher for every app below, with the ones you can open marked.
- **`/core/...`** is MediaMake Core (sign in): projects, the editor, presets, media, the transcriber,
  render history, workers, agents, API keys, billing and quota. Admins also get
  **`/core/releases`**, the release dashboard (see below).
- **Review and browser apps**, open to everyone: `/remotion-editor` (edit lyric videos in the
  browser), `/video-revision` and `/file-revision` (comment on renders and image sets, track
  revisions), `/skill-library` (browse the skills on your computer with their variants and the
  projects that used them) and `/skills` (the public skills index).
- **`/access`** handles invites and access requests for catalog items.

### Rendering: Lambda or local

Every render gets a suggestion for where to run, with the reason. Light renders (images, one song, a
few short clips) go to Lambda; heavy ones (big files, many minutes of video) are suggested locally,
because Lambda cost grows with media volume. You can always pick either. Lambda is limited to admins,
the private tier and clients with the `lambdaRender` flag. Local means the editor's Browser render tab,
`remotion render`, or the `studio` scripts. Details:
[render-routing.md](apps/mediamake/docs/render-routing.md).

### Brand kits

A cloud project (a channel or brand) can carry a brand kit: colours, fonts, brand guide, logos,
intros, outros, end screens and sounds. Upload the folder the `pack-brand-kit` skill exports from the
Projects page, or with the MCP's `upload_brand_kit`. Needs community access or above.

### Generations

A cloud project also keeps the channel's song takes: every song, cover, extend and remaster made with
Suno, with its styles, lyrics, model, settings and audio. Browse Hack saves each take as it is made.
The Generations sheet on the Projects page plays them, rates them keeper, maybe or reject, keeps notes
and style presets, and copies a take for Claude to make more from; the MCP has `list_generations` and
`rate_generation`. Same access as brand kits. Routes and fields:
[generations.md](apps/mediamake/docs/generations.md).

### Catalog, tiers and releases

**Skills are public by default**: every skill is committed in this repo and open to everyone, with
nothing hidden. **Apps and MCPs** are the gated ones: they are handed out as catalog items, their
packages live in private storage, and each sits in a tier: **vault** (never published), **in
development**, **community** (ready, pre-release, optionally gated to turn public after a date) and
**public**. People get a tier too (admin, private, community, public), set per API key holder.

- **Install an item**: open its card on the homepage (or `/access?item=<kind>/<name>`), copy the install
  prompt and paste it into Claude. Claude follows [install.md](install.md).
- **Release and share** (admins): `/core/releases` shows a board per tier (skills always sit in Public), the release timeline,
  people per tier and per-item access. From the terminal: `npm run catalog` in `apps/mediamake`.
  See [catalog-releases.md](apps/mediamake/docs/catalog-releases.md).

## The MCP server

Lets Claude (or any MCP client) drive MediaMake: projects and timelines, presets, media,
transcription, workers and agents, brand kits, song takes and renders. Two ways to add it:

- **Hosted, by URL** (nothing to install): add `https://<your-mediamake-host>/mcp` as a custom
  connector in Claude and sign in with your MediaMake account. In Claude Code:
  `claude mcp add --transport http mediamake https://<your-mediamake-host>/mcp`. It can't see your
  files, so media comes in by URL.
- **Local** (`.mcpb` for Claude Desktop, or stdio): runs on your machine with an API key and can read
  and write local files. Build with `npm run build:mcpb --workspace @microfox/mediamake-mcp`. The
  repo's `.mcp.json` registers it for Claude Code sessions opened here.

Full tool list and setup: [packages/mediamake-mcp/README.md](packages/mediamake-mcp/README.md).

## Skills

Claude Code skills for making content: lyric videos and shorts, music remixes, thumbnails, posters,
brand kits, YouTube upload packs and more. Named `<verb>-<thing>` (`make-*` for videos, `create-*` for
images, `pack-*` for bundles, and so on). **Every skill is public**: its files are committed in
`.agents/skills/` and `.claude/skills/` links to them, so they load for anyone who opens the repo.
[mediamake.microfox.app/skills](https://mediamake.microfox.app/skills) lists them all (and
`node tools/skills.mjs list` here). A variant you fork (`fork-skill`) or your team shares starts as
yours, in your workspace (`~/MediaMake/skills/`, linked from `~/.claude/skills/`), and
`node tools/skills.mjs publish <name>` sends it to the repo as a pull request (`publish-skill`);
`node tools/skills.mjs check` (also run in CI) fails when a skill holds an API key, a token or a path
on your machine. The registry the site reads, `skills.json`, is built (by the app's `build` and `dev`),
never committed.

## Getting started

Needs Node 22.6 or newer (the studio's scripts run their TypeScript with Node's own type stripping).
`npm run mm -- doctor` checks this machine (Node, uv, ffmpeg, dependencies, builds, the render
browser, git, your workspace, an ElevenLabs key) and says how to fix what's missing; `--fix` does what
it can itself.

```bash
npm ci                                          # exactly the lockfile; npm install would rewrite it
npm run build --workspace=@microfox/remotion   # the app imports the built package
cd apps/mediamake && npm run dev                # http://localhost:3000
```

Put the app's environment in `apps/mediamake/.env.local` (MongoDB, Upstash Redis, S3/Spaces, Remotion
AWS keys, AI provider keys); see [apps/mediamake/README.md](apps/mediamake/README.md). With
`DEV_CLIENT_KEY` set, the dev server signs your browser in on its own.

Videos are made in [apps/studio](apps/studio/README.md) with the `mm` command: `npm run mm -- link`
once puts it on your PATH, then `mm help` lists its commands (`mm preview` opens Remotion Studio).
`apps/studio` was `apps/lyrics_videos` until November 2026: after pulling that change, `mm migrate`
moves your projects and renders across.

To update, run `mm update`: it brings main up to GitHub's, runs `npm ci` when the dependencies
changed, then `mm migrate` and `mm doctor`. Edits or commits you made on main stop it with a list;
`mm update --yes` keeps them on a `local/<date>` branch first (`--push` sends it to GitHub for a PR).

## More docs

- [apps/mediamake/docs](apps/mediamake/docs/README.md): presets, rendering, ElevenLabs, recording,
  and the [September 2026 feature notes](apps/mediamake/docs/features-2026-09/README.md) (canvas
  pipeline, editor collaboration, browser rendering)
- [packages/remotion/docs](packages/remotion/docs/QUICKSTART.md): the `@microfox/remotion` API
- Related: the [Browse Hack extension and its MCP](https://github.com/microfox-ai/extensions)

## License

MIT for this repository ([LICENSE](LICENSE)). MediaMake is built on Remotion, which needs a company
license for some commercial use; see Remotion's licensing terms.
