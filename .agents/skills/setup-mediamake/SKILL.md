---
name: setup-mediamake
description: Set up MediaMake on this computer end to end, or repair and tidy a setup that has drifted — the tools it needs (git, GitHub sign-in, Node 22.6+, uv, ffmpeg), the microfox-ai/mediamake checkout (cloned, or brought up to GitHub without losing edits), its dependencies and builds, the `mm` command, the workspace outside the checkout (~/MediaMake), the shared media library, the MCPs the skills use (each optional, skippable), then the cleanups (work left in the checkout or in apps/lyrics_videos, stale stashes and branches, untidy skill links, rebuildable leftovers), ending on a clean `mm doctor`. Every step checks first and skips what is already done, so it is safe to run again. Use when the user says "set up MediaMake", "install MediaMake", "set up the repo and everything", "new Mac / new machine", "fix my MediaMake setup", "clean up my MediaMake setup", "mm doesn't work", or "/setup-mediamake". Not for installing one catalog item (install.md), updating items (update-mediamake-items), or freeing disk space (cleanup-out, cleanup-downloads). New user feedback goes in your notes (mm notes add), never in this file.
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
| `mm login` | signs the computer in to MediaMake once, through the browser: the user clicks Allow, nothing is pasted (`mm login status`, `mm logout`) |
| `mm items` / `mm items install --yes` | who is signed in, their membership and the MCPs and apps it opens; installs them with that sign-in, no install prompt |
| `mm doctor` / `--fix` | checks the machine and the checkout; `--fix` does the installs, builds and downloads it can (never git, never the user's files) |

Work quietly and report at the end. Stop and ask only where a step says **Ask**. Never print a key or
token back, and never write one anywhere but where a step says.

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
| yt-dlp | `yt-dlp --version` | `brew install yt-dlp` · `winget install --id yt-dlp.yt-dlp -e` (`--skip-dependencies` when ffmpeg is already there) |

- yt-dlp is what `mm thumbs inspire`, `mm yt-grab` and the downloads of the user's skills run.
  `mm doctor --fix` (step 7) installs it the way the table says (uv's tools on a computer with neither
  Homebrew nor winget) and updates a copy older than two months the way it was installed: YouTube
  breaks old versions.

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
   - a team: `mm login` (the browser sign-in of step 6a, if not signed in yet), then `mm media channel list` / `mm media channel link <channel> <projectId>`,
     then `mm media sync status --channel=<id>` (a dry run) and `pull … --yes` once they agree.

## 6. What their MediaMake membership opens, then keys

### 6a. Their MediaMake items: installed with the sign-in

Browse Hack, MediaMake Spaces (it was ProjectSync) and every other MCP or app of MediaMake's come from the user's account.
Never ask for the site address or an install prompt: `mm` knows the site
(`mediamake.microfox.app` unless their config names another) and the sign-in says what they may
have.

1. `mm items --json`.
   - `signedIn: true`: it lists the account, its membership (`tier`) and each item it opens as
     `installed`, `behind` or `missing`, and under `connectors` MediaMake's hosted connectors it
     opens (mm-use for every member, mm-release for admins) as `added` or `missing`. Go to 2.
   - `signedIn: false`: **Ask** once whether they have a MediaMake account. Yes: run `mm login`
     yourself (allow it 5 minutes: it waits for the browser) and tell them a browser tab is opening
     where they sign in if asked and click **Allow**. Nothing is copied or pasted: never ask for an
     API key. It makes one key on their account for this computer and keeps it in the Keychain.
     Then `mm items --json` again. Only on a computer with no browser: `mm login --key` with a key
     on stdin. No account, or they'd rather not: skip 6a; it is final for this run.
2. Anything `missing` or `behind`: `mm items install --yes --json`, without asking. Their membership
   is the yes. It downloads and checks each package, unpacks the MCPs into `~/.mediamake/mcp/`, adds
   them to Claude Code for every project, unzips a Chrome extension into `~/Extensions/`, and saves
   `installed.json` and the update token. A working copy that didn't come from MediaMake is kept.
   It also adds the hosted connectors it opens (mm-use, and mm-release for an admin) to Claude Code
   by their address (`claude mcp add --transport http --scope user`).
3. Do what it lists under `left`, in order:
   - `needsPerson` (a new Chrome extension): **Ask** them to open `chrome://extensions`, turn on
     **Developer mode**, click **Load unpacked** and pick the folder it names. Chrome has no command
     for this; it is the only click an install needs.
   - `needsPerson` (a hosted connector: mm-use, mm-release): **Ask** them to run `/mcp` in Claude
     Code, pick it, sign in to MediaMake in the browser window that opens and click **Allow**. It
     signs in with their account; no key is pasted. A new connector shows up in the next session.
   - an item's own `INSTALL.md` (Browse Hack: sign in from its popup, then its check): follow it.
   - anything else as https://github.com/microfox-ai/mediamake/blob/main/install.md says.
4. `failed`: say what and why. Items a higher membership opens are listed by `mm items`; mention them
   in one line, never as something to fix.

In the report, say what the membership is and what was installed for it (with versions).

### 6b. MediaMake Spaces: their personal space and their projects'

Only when 6a left the computer signed in. A space holds the skills, MCPs and apps made for one body
of work (a private GitHub repo) and its files (the MediaMake Spaces MCP, `mcp/projectsync`, which 6a
installs when their membership opens it). How to use them afterwards is the `use-mediamake-spaces`
skill, which comes with the checkout: nothing to install.

1. `gh auth status`. Not signed in to GitHub: **Ask** them to run `gh auth login` (the one step that
   is theirs). They'd rather not: skip 6b and say spaces wait for it.
2. `mm space ensure`: connects their personal space, making its private repo
   (`<their login>/mediamake-space`) when they have none. Never ask them to create or name a repo.
3. `mm space sync`: brings down every space they are on (their other computers' skills, and each
   project's once they are invited), links the skills into Claude, shows what would go up and each
   space's files waiting. Nothing goes up without `--yes`, and only once they agree.
4. A project it says they aren't invited to yet: tell them who invites (it names them), and that
   `mm space join <project id>`, the line on the project's page, sets it up later.

In the report, list the spaces now on this computer and how many items each has.

### 6c. Keys and other MCPs (optional, all of them)

Every MCP here can be skipped, and the setup is complete without any of them. Check which this
session already has (`claude mcp get <name>`, or the tools present), then offer the missing ones
once, in one message, one line each with what skipping it costs, and install only the ones the user
picks. A skip is final for this run: no second ask, and no `✗` or "not ready" for it at the end
(doctor's ElevenLabs line stays a `!`, which is fine).

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/elevenlabs` | optional | the key `mm transcribe --yes` uses for timed lyrics, voice-overs and sound effects (open source) | no timed words for lyric videos, no voice or sound effects |
| `mcp/blender` | optional | 3D sets and scenes in a live Blender (needs Blender open with its add-on) | no Blender from Claude |
| `mcp/figcraft` | optional | editable layouts Claude builds (thumbnails, banners, posts) and the person finishes by hand; create-thumbnail's final edit | no editable layers for a picked thumbnail |

These are the MCPs setup offers. Anything else in the catalog (Gemini, fal) is added on its own, from
its page's install prompt, when the person asks for it. The repo registers no MCP (no `.mcp.json`):
every one is added on this computer, for every project, with its command as this computer finds it
(a Mac's `/opt/homebrew/bin/uvx` isn't on Windows, where `npx` goes through `cmd /c`).

- Each of them: `mm items install mcp/<name> --yes --json`. It adds the server with its command's
  full path here, takes a key from the environment when it is set there, and lists under `left` what
  remains: a command to get first (Figcraft's `figcraft-cli`, a download for the computer's system:
  run `mm items install` again once it's there), its own setup (Blender's add-on), or a key to ask
  for with the line that adds it.
- A key (ElevenLabs): walk them through it: open https://elevenlabs.io/app/settings/api-keys, make
  one, paste it as their next message alone. Write it only into the line `left` gives; never in a
  `.env` or a file in the repo. Someone who'd rather not paste a key gets the line with `<your key>`
  to run themselves.
- Never register an MCP straight from a checkout of the extensions repo, and never in a repo's
  `.mcp.json`.
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
- the final `mm doctor` (Ready, or what's left and who does it; a skipped MCP is never a blocker);
- what they skipped and what it costs (an MCP, the watcher, a cleanup);
- how to start: `cd <checkout> && claude`, then a skill such as `/make-lyrics-video`; "sync my
  spaces" (use-mediamake-spaces) at the start of a session; later, "update MediaMake"
  (update-mediamake-items, which runs `mm update`: the checkout, its skills and their spaces).

If a step fails, say which step and the exact error, fix what you can, and retry that step only.

## Lessons log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add setup-mediamake "<what they said> → <the rule>"   # a new lesson, dated for you
mm notes setup-mediamake                                        # your notes for this skill
```

`mm notes promote setup-mediamake` turns your notes into a pull request for this log.
