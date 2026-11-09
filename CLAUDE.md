# MediaMake

## Videos: apps/studio and `mm`

Every video is made in `apps/studio` (it was `apps/lyrics_videos` until 2026-11). Its scripts run from
any folder as `mm <command>` (`mm help` lists them; `mm render` and `mm prepare` are the `render-project`
and `prepare-project` scripts). If the shell has no `mm`, run `npm run mm -- link` once from the repo
root (or use `npm run mm -- <command>` there). If `mm` says work is still in `apps/lyrics_videos`, show
the user `mm migrate` (it only lists what would move) and run `mm migrate --yes` once they agree.

## Git: main stays a clean copy of GitHub

What git ignores is the user's work (`apps/studio/projects/`, `out/`, `brands/`, `thumbnails/jobs/`,
`overlays/`, `.claude/settings.local.json`); every file git tracks is the framework, shared by everyone who
pulls. The guard rails in `.claude/settings.json` hold to this, with their paths and hints in one list,
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
- Update with `git pull --ff-only` on a clean main.
- Starting Claude with `MEDIAMAKE_GUARD=off` turns the guard off for one session; only the user decides that.

## Skill lessons: your notes, never the SKILL.md

What a session learns from the user goes in the user's notes for that skill, outside the repo, so no
session edits a committed file: `mm notes add <skill> "<what the user said> → <the rule>"` (dated for
you, in `~/MediaMake/notes/<skill>.md`, or the `workspace` that `~/.mediamake/config.json` names).
Before planning, read them with `mm notes <skill>` beside the skill's own Feedback or Lessons log. That
log is shared and changes only in a pull request: when the user wants their notes shared,
`mm notes promote <skill>` (a dry run, then `--yes`) puts them on a new branch and opens the PR, without
touching this checkout. Taste for one production still goes in its `projects/<slug>/prefs.md`.

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
- Any project can hold shared assets (overlays and other files every team uses): `media share <id…> --project=<projectId> --yes`, and `media sync pull --project=<id> --what=media` brings a project's assets here. Teammates with only ProjectSync use its `list_shared_assets`, `download_shared_assets` and `share_assets`.

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
`https://mediamake.microfox.app/core/releases/<kind>/<slug>` (e.g. `/core/releases/mcp/browse-hack`):
what it is, who can open it, where it lives, what installing it does, and what needs or uses it.
`/core/releases` lists every item.

- After any release step, give the user the link of each item it touched: `npm run catalog --
  release | add | promote | schedule | vault | grant | archive` and the MediaMake MCP's `catalog_*`
  tools (they print or return it), a workflow that publishes a release, a new or changed skill, or an
  edit to `apps/mediamake/lib/catalog/third-party.json`. For a new version, link
  `…/core/releases/<kind>/<slug>#v<version>`.
- With the MediaMake MCP connected, manage releases through its tools: `catalog_items` to see what is
  what, `catalog_item` for one item, `catalog_archive` to take unused items off the homepage (they
  stay public and installable), `catalog_set_stage`, `catalog_add_third_party`, `catalog_invite`, `catalog_set_video` (a skill's
  intro, a tutorial's video, a course's lessons; YouTube only) and `catalog_add_video_item` (a new
  tutorial or course), and for people `catalog_people`
  and `catalog_set_tier` (private testers get every MCP in development, no per-item grants).
- How releases work: `apps/mediamake/docs/catalog-releases.md`.
