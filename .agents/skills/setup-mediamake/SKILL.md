---
name: setup-mediamake
description: Set up MediaMake on this computer end to end, or repair and tidy a setup that has drifted — the tools it needs (git, GitHub sign-in, Node 22.6+, uv, ffmpeg), the microfox-ai/mediamake checkout (cloned, or brought up to GitHub without losing edits), its dependencies and builds, the `mm` command, the workspace outside the checkout (~/MediaMake), the shared media library, the ElevenLabs key and the MCPs the skills use, then the cleanups (work left in the checkout or in apps/lyrics_videos, stale stashes and branches, untidy skill links, rebuildable leftovers), ending on a clean `mm doctor`. Every step checks first and skips what is already done, so it is safe to run again. Use when the user says "set up MediaMake", "install MediaMake", "set up the repo and everything", "new Mac / new machine", "fix my MediaMake setup", "clean up my MediaMake setup", "mm doesn't work", or "/setup-mediamake". Not for installing one catalog item (install.md), updating items (update-mediamake-items), or freeing disk space (cleanup-out, cleanup-downloads). New user feedback goes in your notes (mm notes add), never in this file.
metadata:
  category: update
---

# setup-mediamake

Gets a computer from nothing (or from a messy, half-updated setup) to "every MediaMake skill works
here". It drives the repo's own commands, never hand-made copies of them:

| Command | What it does here |
| --- | --- |
| `npm run git-health` | reads the checkout's git state (half-done merges, edits or commits on main, behind GitHub, stashes, branches not on GitHub, leftovers). Never changes anything |
| `npm ci` | installs exactly what `package-lock.json` says (never `npm install` on main: it rewrites the lockfile) |
| `mm link` | puts `mm` on the PATH (`npm run mm -- link` until it is) |
| `mm migrate` / `--yes` | sets up the workspace (`~/MediaMake`) and moves the user's work out of the checkout; a dry run until `--yes` |
| `mm update` / `--yes` | brings an existing checkout up to GitHub, then `npm ci`, migrate (dry run) and doctor |
| `mm media init` | the media library's folders, `~/.mediamake/config.json` and the catalog |
| `mm doctor` / `--fix` | checks the machine and the checkout; `--fix` does the installs, builds and downloads it can (never git, never the user's files) |

Work quietly and report at the end. Stop and ask only where a step says **Ask**. Never print a key,
token or install code back, and never write one anywhere but where a step says.

## 0. Where this runs

The setup needs the user's own computer. In the Claude app on the web or a phone, or a cloud sandbox
that isn't their computer, it can't be done from here: give them the one-liner below to run in a
terminal (or ask them to paste "set up MediaMake" into Claude Code on that computer), and stop.

```bash
gh repo clone microfox-ai/mediamake ~/mediamake && cd ~/mediamake && npm ci && npm run mm -- link && npm run mm -- migrate --yes && npm run mm -- doctor --fix
```

Note the OS (macOS is the main one: the library's clones, the watcher and backups are macOS
features; Windows and Linux get the same steps with `winget` / the package manager).

## 1. Find what is already there

Before changing anything, look, and keep a short list of what you found:

- **A checkout.** `mm where` (prints `<checkout>/apps/studio` when `mm` is linked), then the folder
  Claude Code runs in (a `package.json` named `microfox` with `apps/studio`), then `~/mediamake`.
  More than one: **Ask** which one they use; the others are left alone.
- **Config.** `~/.mediamake/config.json` (`workspace`, `library`, `url`, keys). Read it; never print
  its keys.
- **Workspace and library.** `mm workspace` once a checkout exists.
- **A previous run.** `mm doctor --json` in the checkout is the state of everything below: use it to
  skip steps that are `ok`.

## 2. Tools

Check each; install what is missing, saying in one line what you're installing first.

| Tool | Check | Install (macOS · Windows) |
| --- | --- | --- |
| git | `git --version` | `xcode-select --install` or `brew install git` · `winget install --id Git.Git -e` |
| GitHub CLI | `gh auth status` | `brew install gh` · `winget install --id GitHub.cli -e` |
| Node 22.6+ | `node -v` | `brew install node` (or `nvm install 22`) · `winget install OpenJS.NodeJS.LTS` |
| uv | `uv --version` | `brew install uv` · `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| ffmpeg (optional) | `ffmpeg -version` | `brew install ffmpeg` · `winget install Gyan.FFmpeg` |

- No Homebrew on a Mac: **Ask** before installing it (it asks for their password).
- Not signed in to GitHub: **Ask** whether they have an account (if not, https://github.com/signup),
  then `gh auth login --web --git-protocol https` and **Ask** them to enter the code it shows.
- git without a name and email: `mm update`, `mm notes promote` and skill publishing can't commit.
  **Ask** for the name and email to use, then `git config --global user.name/user.email`.
- Node older than 22.6: the studio's scripts run TypeScript directly and won't start. Upgrade before
  going on.

## 3. The checkout

**None found:** **Ask** where to put it only if they mentioned a place; otherwise
`gh repo clone microfox-ai/mediamake ~/mediamake`. Then `cd` into it for every step below.

**Found:** run `npm run git-health` first and tell them what it found before touching anything.

- Clean main: `npm run mm -- update` (pulls `--ff-only`, `npm ci` when dependencies changed, migrate dry
  run, doctor).
- Edits or commits on main: `mm update` lists them and changes nothing. Show the list and run
  `mm update --yes` only once they agree (it keeps them on a `local/<date>` branch, then updates main).
- On another branch: `mm update` moves only the local main; say how far behind the branch is and leave it.
- A half-done merge or rebase, or conflicts: stop, show git-health's lines, and fix only with their OK.
- A checkout too old for `mm update` (no such script): `git pull --ff-only`, then `npm run mm -- update`.

Never `reset --hard`, `checkout --`/`restore` on changed files, `stash drop`, `branch -D`, or
`git clean -x`/`-X` (that last one deletes their projects and renders).

## 4. Dependencies, builds and `mm`

In the checkout:

1. `npm ci` (skip when `mm update` just ran it, or doctor's `deps` check is `ok`).
2. `npm run mm -- link`. If it says the folder isn't on the PATH, add it to their shell profile
   (`~/.zshrc` on a Mac) with their OK, or tell them to use `npm run mm -- <command>`.
   `mm` already pointing at another checkout: **Ask** which one they use before relinking.
3. The rest is doctor's job in step 7 (`@microfox/remotion` build, the studio's presets, Remotion's
   browser). Nothing generated is committed: never `git add` `skills.json` or the presets.

## 5. Workspace and media library

1. `mm migrate` (dry run). On a fresh clone nothing moves: run `mm migrate --yes` to name the
   workspace (`~/MediaMake`). When it lists work to move (projects, renders, brand kits from
   `apps/studio` or `apps/lyrics_videos`), show the list and run `--yes` once they agree. A different
   folder (an external disk): `mm migrate --to=<folder>`, only when they ask.
2. `mm workspace` and say where each thing now lives.
3. The library: doctor says `no media library on this machine yet` → `mm media init` (defaults:
   `~/Downloads/_LIBRARY`, its inbox, delivery to the channel folders in Downloads; pass `--root=` and
   friends only for a place they named). Already there but missing (a disk not plugged in): say so,
   don't make a second one.
4. Optional, **Ask** first, one line each with what it gives:
   - the inbox watcher, `mm media init --watch` (files downloads into the library by itself; macOS);
   - a team: `mm media cloud login`, then `mm media channel list` / `mm media channel link <channel> <projectId>`,
     then `mm media sync status --channel=<id>` (a dry run) and `pull … --yes` once they agree.

## 6. Keys and MCPs

The skills lean on these. Check which this session already has (`claude mcp get <name>`, or the
tools present), and offer only the missing ones, one line each with what skipping it costs:

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/elevenlabs` | recommended | the key `mm transcribe --yes` uses for timed lyrics, voice-overs and sound effects | no timed words for lyric videos, no voice or sound effects |
| `mcp/browse-hack` | recommended | downloads from YouTube, Pinterest, Instagram, Midjourney and Suno straight into the library's inbox | footage, references and Suno takes are fetched by hand |
| `mcp/projectsync` | optional | brand kits, projects and shared assets of the user's MediaMake cloud projects | team sharing only through `mm media sync` |

- ElevenLabs (local first): `claude mcp add --scope user elevenlabs -e ELEVENLABS_API_KEY=<key> -- uvx elevenlabs-mcp`.
  Walk them through the key: open https://elevenlabs.io/app/settings/api-keys, make one, paste it as
  their next message alone. Write it only into that command; never in a `.env` or a file in the repo.
  Someone who'd rather not paste a key gets the line with `<your key>` to run themselves.
- Browse Hack, ProjectSync and anything else from the catalog: follow
  https://github.com/microfox-ai/mediamake/blob/main/install.md ("Set up mcp/browse-hack from
  MediaMake …"). Never register an MCP straight from a checkout of the extensions repo.
- New MCPs show up in the next Claude Code session, not this one: say so.

## 7. Doctor

1. `mm doctor`. Then `mm doctor --fix` when it says it can fix something (builds `@microfox/remotion`,
   the presets, downloads Remotion's browser, `npm ci`, `mm link`).
2. `mm doctor` again. Every `✗` left is a blocker: fix it or say exactly what the user has to do.
   A `!` is worth a line; `·` lines are information.

## 8. Cleanups

Each is a dry run first; act only on their OK, and only on what was listed.

- **git-health leftovers**: stashes and local branches with commits not on GitHub. List them with what
  each holds (`git stash show -p stash@{n} --stat`, `git log origin/main..<branch> --oneline`). Offer
  to push a branch (so it is safe on GitHub) rather than delete it; delete only what they name.
- **Old folders**: work still in `apps/lyrics_videos` or inside `apps/studio` → `mm migrate --yes`
  (step 5). A folder left with only a `MOVED.md` is fine.
- **Skills**: `node tools/skills.mjs tidy` lists copies the repo has now, broken links in
  `~/.claude/skills`, and loose skill folders; `--yes` does it.
- **Rebuildable files**: `mm cleanup-out clean` lists Remotion's leftover temp bundles, bundle copies in
  `out/` and the Next.js cache; `--yes` deletes them. For real disk space (archiving renders, sorting
  Downloads) point to the cleanup-out and cleanup-downloads skills instead of doing it here.
- **Duplicate checkouts or `mm` launchers** found in step 1: name them; never delete a checkout.

## 9. Finish

Tell them, in a few lines:

- what was installed or changed, and what was already fine;
- where things are: the checkout, the workspace, the library, the config;
- the final `mm doctor` (Ready, or what's left and who does it);
- what they skipped and what it costs (an MCP, the watcher, a cleanup);
- how to start: `cd <checkout> && claude`, then a skill such as `/make-lyrics-video`; later,
  "update MediaMake" (update-mediamake-items, which runs `mm update`).

If a step fails, say which step and the exact error, fix what you can, and retry that step only.

## Lessons log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add setup-mediamake "<what they said> → <the rule>"   # a new lesson, dated for you
mm notes setup-mediamake                                        # your notes for this skill
```

`mm notes promote setup-mediamake` turns your notes into a pull request for this log.
