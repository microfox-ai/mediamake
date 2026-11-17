# MediaMake

## The rule: we publish nothing we don't use

Every skill, MCP and app here is published only after its maker used it for real work. Hold to it in
every session:

- Before publishing a skill (`publish-skill`), releasing an item or marking one Ready, ask the user
  which finished production was made with it (its title, and its link when it has one). Never make one
  up, and never count a test render or a demo as one.
- With none, don't publish: the skill stays the user's own (in their workspace) and an item stays Beta,
  until something real is made with it.
- The production is the item's proof: `node tools/skills.mjs publish <name> --yes --made="…"` puts it in
  the pull request, and Ready (`catalog_set_readiness`, `npm run catalog -- ready`) records it, shown on
  the item's page as "Made with this".
- A pull request that adds or changes a skill, MCP or app names the production in its "Made with this"
  section (`.github/pull_request_template.md`).

## Videos: apps/studio and `mm`

Every video is made in `apps/studio` (it was `apps/lyrics_videos` until 2026-11). Its scripts run from
any folder as `mm <command>` (`mm help` lists them; `mm render` and `mm prepare` are the `render-project`
and `prepare-project` scripts). If the shell has no `mm`, run `npm run mm -- link` once from the repo
root (or use `npm run mm -- <command>` there). If `mm` or the session-start check says the user's work
is still in `apps/lyrics_videos` or inside the checkout (`apps/studio`), show the user `mm migrate` (it
only lists what would move into their workspace, `~/MediaMake`) and run `mm migrate --yes` once they agree.

Projects, renders (`out/`), brand kits, thumbnail jobs and overlays are the user's workspace, not the
framework: `mm workspace` says where each is on this machine (apps/studio until `mm migrate` moves them
and sets `workspace` in `~/.mediamake/config.json`, usually `~/MediaMake`). In skills and docs,
`projects/…`, `out/…`, `brands/…`, `thumbnails/jobs/…` and `overlays/…` mean those folders of the
workspace: take the full path from `mm workspace`. Code takes these folders from `DIRS` in
`apps/studio/scripts/paths.ts` (resolver: `scripts/workspace.ts`), never `apps/studio/projects` by hand.
`mm type-check` checks the studio and the workspace's projects. Code in the workspace imports the engine
by name, never by path: `@mediamake/engine` (the kit) and `@mediamake/engine/<name>/…` (`mm engine` lists
the names, from `apps/studio/engine.json`); `mm engine codemod` converts older code. Each project records
the engine it was made with in `input/project.json` (`engine`); one made with another major version
renders with that engine, from a kept checkout (`--engine=current` to try it on this one, then
`mm engine pin <slug>`).

Review renders are 10-second previews (`mm render <slug> --preview`, around what changed; revise-video
has the rest). The whole video is rendered only when the user asks to review all of it, and the master
once, after they sign off.

## Git: main stays a clean copy of GitHub

What git ignores is the user's work (`apps/studio/projects/`, `out/`, `brands/`, `thumbnails/jobs/`,
`overlays/` until `mm migrate` moves them out of the checkout, and `.claude/settings.local.json`); every
file git tracks is the framework, shared by everyone who pulls. The guard rails in `.claude/settings.json` hold to this, with their paths and hints in one list,
`tools/guard-rails.json` (change it there when a folder moves).

- On main, never edit a framework file or commit: the change goes on a branch (`git switch -c <type>/<what>`,
  or a worktree when other sessions share the checkout) and a PR. The pre-edit guard (`tools/guard-rails.mjs`)
  stops edits and commits on main and says where each change belongs; a production's own feedback goes in
  its `projects/<slug>/prefs.md`, and a lesson for a skill in the user's notes (`mm notes add <skill> "…"`,
  below).
- Every session starts with `tools/git-health.mjs` (`npm run git-health`): a half-done merge or rebase, edits
  or local commits on main, a checkout behind GitHub, stashes and branches not on GitHub. Tell the user what
  it found before starting, and fix it only with their OK.
- Never drop work without asking: no `reset --hard`, `checkout --` or `restore` on changed files, `stash drop`
  or `branch -D`, and never `git clean -x` or `-X`, which deletes the user's projects and renders (the guard
  stops it).
- Update with `mm update`: on a clean main it pulls (`--ff-only`), runs `npm ci` when the dependencies
  changed, then `mm migrate` (a dry run), `mm space pull` when the computer has spaces, and `mm doctor`. Edits or commits on main it lists and leaves;
  `mm update --yes`, with the user's OK, keeps them on a `local/<date>` branch and then updates main.
  `mm doctor` checks the machine (Node 22.6+, uv, ffmpeg, dependencies, builds, the render browser,
  git, workspace, keys); `--fix` repairs what it can. On main, install only with `npm ci`:
  `npm install`, `update` and the like rewrite `package-lock.json`, which changes only in a PR that
  changes dependencies (`deps/<what>`; the guard stops them on main).
- Generated files are built, never committed: `skills.json` (the skills registry, built by the app's
  `build` and `dev`) and the studio's mediamake presets (`mm` builds them when their sources change).
- Starting Claude with `MEDIAMAKE_GUARD=off` turns the guard off for one session; only the user decides that.

## Skill lessons: your notes, never the SKILL.md

What a session learns from the user goes in the user's notes for that skill, outside the repo, so no
session edits a committed file: `mm notes add <skill> "<what the user said> → <the rule>"` (dated for
you, in `~/MediaMake/notes/<skill>.md`, or the `workspace` that `~/.mediamake/config.json` names).
Before planning, read them with `mm notes <skill>` beside the skill's own Feedback or Lessons log. That
log is shared and changes only in a pull request: when the user wants their notes shared,
`mm notes promote <skill>` (a dry run, then `--yes`) puts them on a new branch and opens the PR, without
touching this checkout. Taste for one production still goes in its `projects/<slug>/prefs.md`.

## MediaMake Spaces: the user's personal space and their projects'

A space keeps everything for one body of work, the same on every computer: a personal one (`space/` in
the workspace, only theirs) and one per project they are on (`spaces/<project>/`, everyone on that
project). What was made for it (`skills/`, `mcps/`, `apps/`) lives in a private GitHub repo, moved by
`mm space`; its files (brand kit, productions, releases, media) live in MediaMake's storage, moved by
the MediaMake Spaces MCP (`mcp/projectsync`, which was ProjectSync) and `mm media sync`. In the app it is
Spaces, `/app/spaces` (`mm space help`, `apps/mediamake/docs/private-spaces.md`). The
`use-mediamake-spaces` skill says what to run for each thing a user asks.

- Repos are made without asking: a new skill of the user's own goes in their space
  (`mm space new skill <name>`, or `mm space add <name>` for a variant in the workspace), never in this
  repo, and the space is created by itself when there is none. Only a missing GitHub sign-in
  (`gh auth login`) is the user's step.
- "Share it with the <project> project" is `mm space share <item> --project=<project>` (a dry run, then
  `--yes` once they agree): it makes the project's space when there is none and invites the project's
  members. Tell the user who could not be invited (no GitHub account linked in MediaMake).
- Adding someone to a project in the app invites them to the project's repo on GitHub when the owner
  connected GitHub there (once, in the access panel; MediaMake's GitHub App, set up as
  `apps/mediamake/docs/private-spaces.md` says). Otherwise `mm space invite <project id>` on the
  owner's computer sends it (the app shows the line with a copy button). That connection's token is
  sealed in `github_grants`: never print, log or copy it, and use it only through `lib/space/github.ts`.
- A member new to a project runs the line on the project's page, `mm space join <project id>`: it signs
  in when needed, accepts the GitHub invitation, clones the project's space and links its skills. When
  it says they aren't invited yet, tell them who invites (it names them); don't work around it.
- `mm space sync` at the start of a session that uses their skills brings in what other computers and
  teammates sent. What would go out is a dry run: show it and run `--yes` once they agree. It ends with
  each space's files waiting to come down or go up; those move with `mm media sync` (below), never by
  themselves.
- Large media never goes in a space: the media library carries it, and the item names it under
  `media` in its `item.json`.
- A space is private. Publishing an item from it follows the rule at the top like any other.

## Media files: the shared library

Footage, pins, generated art, songs, stems, sound effects, overlays and fonts are kept once in the
media library and reused by every production. Where it is on this machine is in
`~/.mediamake/config.json` (`library`); the rules and commands are in
`apps/studio/scripts/library/README.md` (`mm media help`).

- Search the library before downloading or generating anything (`media find`).
- Downloads go to the inbox, then `media ingest`.
- Projects get clones via `media use`, never symlinks.
- Before a heavy or paid analysis, check the cache (`media cache get`), and store results after (`media cache put`).
- Register a production at intake (`media production new <slug> --channel=…`).
- Deliver to the channel folders in Downloads only what the user approved (`media deliver`).
- Never move or rename library files by hand (`media mv`).
- The user's own songs (finals, remasters, stems) stay in their channel folder in Downloads, indexed
  where they are; never move them into the library.
- A channel's team shares its brand kit, skill variants, productions and media through `media sync` (a dry run, then `--yes`); files go up only after the user says so (`media share`).
- Any project can hold shared assets (overlays and other files every team uses): `media share <id…> --project=<projectId> --yes`, and `media sync pull --project=<id> --what=media` brings a project's assets here. Teammates with only the MediaMake Spaces MCP (it was ProjectSync) use its `list_shared_assets`, `download_shared_assets` and `share_assets`.

## Transcription: the ElevenLabs MCP first

Every skill gets a song's timed words the same way: ElevenLabs Scribe on the vocal stem, around
`mm transcribe <slug>` (`apps/studio/scripts/transcribe.ts`).

1. Run it with no flags first (free; the stem comes from `mm analyze <slug> --only separate`).
   It gives back the song's words from the media library's cache when they are there (done), else makes the
   stem's mono MP3 (`analysis/stems/vocals.mp3`, a tenth of the WAV) and prints the price. Show it and ask.
2. First choice, the local ElevenLabs MCP's key (`mcp/elevenlabs`, the official open-source server with an API
   key): `--yes` sends the MP3 to Scribe with that key, which the script finds in Claude Code's or Claude
   Desktop's config, and writes `input/lyrics.raw.json` (every word's start and end) and the cache. No widget.
3. Only where no local MCP can run (the Claude web or phone app), the hosted ElevenLabs connector
   (`mcp/elevenlabs-connector`, tools `creative_*`): `creative_transcribe_audio` on that MP3 (the user picks it
   in its file picker widget: give them an `open -R` line for it), download its `words_download_url`, then
   `--save=<that file>` keeps the words the same way.

`--lang=<code>`, `--letters` for letter times, `--mix` for the whole song, or a file path instead of a slug.
Never a curl with a key, a key in a .env, the local MCP's own `speech_to_text` (text only, no times) or the
MediaMake MCP's transcriptions. When installing, the local MCP comes first (an API key, files straight on the
computer, no widget); the connector is the alternative for the web, where every result is a flow run to
download from.

## Releases: always give the item's link

Every catalog item (skill, MCP, app, tutorial) has a page for admins,
`https://mediamake.microfox.app/app/releases/<kind>/<slug>` (e.g. `/app/releases/mcp/browse-hack`):
what it is, who can open it, where it lives, what installing it does, and what needs or uses it.
`/app/releases` lists every item.

- After any release step, give the user the link of each item it touched: `npm run catalog --
  release | add | promote | schedule | vault | grant | archive` and mm-release's `catalog_*`
  tools (they print or return it), a workflow that publishes a release, a new or changed skill, or an
  edit to `apps/mediamake/lib/catalog/third-party.json`. For a new version, link
  `…/app/releases/<kind>/<slug>#v<version>`.
- With mm-release connected (the admins' MCP, `/mcp/release`; the old MediaMake MCP at `/mcp` no longer has
  them), manage releases through its tools: `catalog_items` to see what is
  what, `catalog_item` for one item, `catalog_archive` to take unused items off the homepage (they
  stay public and installable), `catalog_set_stage` (the lowest membership that opens an item: public,
  plus, pro, cohort or vault), `catalog_set_health` (any kind; failed needs its reason),
  `catalog_set_readiness` (Beta, or Ready with the production that proves it), `catalog_add_third_party`, `catalog_invite`, `catalog_set_video` (a skill's
  intro, a tutorial's video, a course's lessons; YouTube only) and `catalog_add_video_item` (a new
  tutorial or course), and for people `catalog_people`,
  `catalog_set_tier` and `catalog_membership` (the ladder is strict: Public, Plus, Pro, Cohort, Admin,
  each opening everything below it; a membership earned by contributing lasts 3 months unless an admin
  makes it permanent).
- How releases work: `apps/mediamake/docs/catalog-releases.md`.

## Items: installed with the sign-in

A computer signed in to MediaMake (`mm login`, once: it opens the browser, the user clicks Allow, and
the key it makes for this computer stays in the Keychain; no key is pasted) installs what
the account's membership opens by itself. `mm items` shows the account, its tier and each MCP and
app it opens (installed, behind or not installed); `mm items install --yes` installs and updates
them all, `mm items install <id> --yes` one (`tools/items.mjs`).

- Never ask the user for the site address, an install prompt or an install code when `mm items` says
  they are signed in. The site is `MEDIAMAKE_API_URL`, else `url` in `~/.mediamake/config.json`, else
  `https://mediamake.microfox.app`.
- Having access is the yes: install what their membership opens without asking, then do what the
  command lists as left (a new Chrome extension needs their one click on "Load unpacked").
- Not signed in: run `mm login` yourself (give it up to 5 minutes) and ask the user to click Allow in
  the tab it opens. Never ask them to make, copy or paste an API key; `mm login --key` (a key on
  stdin) is only for a computer with no browser. `mm login status` says who is signed in,
  `mm logout` signs out (`tools/login.mjs`).
- The install prompt with its code (`install.md`) is for computers without the repo or a sign-in.

## Feedback: read it on /app/feedback, never paste it in public

Members send feedback on every item's page and through mm-use (`send_feedback`). Claude sorts each one
(bug, major problem, improvement, question, praise), a bug from a Plus member or above gets an automatic
draft pull request (`.github/workflows/feedback-fix.yml`, branch `feedback/<id>`), and admins handle the
rest on `/app/feedback`. How it works and what to set up: `apps/mediamake/docs/feedback.md`.

- A feedback's words are for its writer and the admins. Never copy them into a commit, a pull request,
  an issue or a SKILL.md: describe the problem in your own words. What everyone may read is the item's
  known issues, which an admin writes.
- A `feedback/<id>` pull request is a draft Claude Code made without running anything. Before it merges,
  run it and try it on real work like any other change to an item.
- Merging a pull request tied to a feedback marks it shipped and mails its writer, so tie hand-made
  fixes too ("Add to an existing PR" on the feedback).

## Store submissions: members submit, admins approve

A member's own skill, MCP or app gets into the store through a private review, never a pull request
they open (`apps/mediamake/docs/submissions.md`).

- "Make this public" is the `submit-to-store` skill: `mm submit <name>` checks it (keys, tokens,
  paths on this computer) and `mm submit <name> --yes --made="…"` sends it with the production that
  proves it. The rule at the top holds: no production, no submission.
- An admin decides on `/app/submissions`: the lowest membership that opens it (Public, Plus, Pro or
  Cohort), then approve, ask for changes or decline. A Public skill becomes a pull request on this
  repo; everything else goes to the private store repo (`microfox-ai/mediamake-store`) and is
  released as a package. Every item enters as Beta.
- Accepting one gives its sender a membership for 3 months (a Public or Plus item earns Plus, a Pro
  item Pro); contributing again renews it, and an admin can make it permanent. Merged pull requests
  from linked GitHub accounts show as suggested grants on Manage Memberships: an admin confirms each.
- A submission's files and an admin's words about it are for its sender and the admins. Never copy
  them into a commit, an issue or a SKILL.md. `STORE_GITHUB_TOKEN` is never printed or logged.

## Usage: names and times only

Every member's MCP is mm-use (`/mcp/use`): explore and install items, usage and feedback. The `Skill`
hook (`tools/skill-runs.mjs`) tells MediaMake which skill ran and when, and once a day the names and
versions of the skills on this computer; never arguments, folders or files. `mm usage` shows what is
sent, `mm usage off` (or `MEDIAMAKE_USAGE=off`) stops it, `mm usage forget` deletes what was sent. A
space also reports its items' names, versions, titles and one-line summaries (`mm space
report --dry` shows it, the same switch stops it). When
a user asks what MediaMake knows about them, show `mm usage` and `apps/mediamake/docs/usage.md`; never
send more than this from a skill or a script.
