# Install from MediaMake

These are instructions for **Claude** (Claude Code, Claude Desktop or the
Claude app with a computer it can use). A person pastes a prompt like:

> Set up mcp/browse-hack from MediaMake (https://mediamake.microfox.app) by following https://github.com/microfox-ai/mediamake/blob/main/install.md

and you install that item and everything it needs. Follow the steps in order.
On a computer that is signed in to MediaMake, none of that is pasted: go to
[Signed in on this computer](#signed-in-on-this-computer) first.
To bring something installed earlier up to date ("update browse hack",
"update <skill or MCP>", "check MediaMake for updates"), go to
[Update an installed item](#update-an-installed-item) instead.
Work quietly; stop and ask the person **only** where a step says _Ask_, and
when you ask, say exactly what to click or type. Never print their API key
back to them or write it anywhere except where a step says to. The same
goes for an update token in `~/.mediamake/config.json`.

## Signed in on this computer

When the MediaMake repository is on the computer (`mm` runs, or `npm run mm --`
in the checkout) and it is signed in, the sign-in installs everything: no
install prompt, no site address. Who can install what follows their
membership (Public, Plus, Pro, Cohort); there are no codes to copy.

1. `mm items --json`. `signedIn: false` (exit code 2): go on to step 0, unless
   they want to sign in: run `mm login` yourself and _Ask_ them to click
   **Allow** in the browser tab it opens (signing in to the site there first
   if it asks). Nothing is copied or pasted; the command waits up to 5
   minutes, so give it that long. A computer with no browser: `mm login --key`
   reads an API key on stdin.
   Otherwise it gives the account, its membership (`tier`) and every MCP and
   app the membership opens with its `state` here: `installed`, `behind` or
   `missing`.
2. `mm items install <item id> --yes --json` for the item they asked for, or
   `mm items install --yes --json` for everything the membership opens that is
   `missing` or `behind`. Having access is the yes: don't ask before installing
   what their membership opens. It does steps 2 to 5 below by itself: the plan,
   the downloads (checked against their SHA-256), an `.mcpb` unpacked into
   `~/.mediamake/mcp/<slug>` and added to Claude Code for every project, a
   Chrome extension unzipped into `~/Extensions/<name>`, `installed.json` and
   the update token. A working copy that didn't come from MediaMake is kept.
3. Do what it lists under `left`, in order. An entry with `needsPerson` is
   theirs: _Ask_ them, with the exact words (loading a new Chrome extension:
   `chrome://extensions`, **Developer mode**, **Load unpacked**, that folder).
   The others are yours: an item's own `INSTALL.md` (its setup and its check),
   an app, an item made by someone else (`mm items plan <id>` is its plan;
   step 4's `type: "source"` says how). An MCP server someone else makes that
   runs on the computer (Blender, Figcraft) is added by the install itself,
   with its command as this computer finds it; its own setup comes back here,
   and so do the steps to get its command when the computer hasn't it (then
   run the install again), and a key it needs that the environment doesn't have
   (ask for it as step 4's `type: "source"` says, then run the line it gives).
4. `failed` names what couldn't be installed and why. An item their membership
   doesn't open: say which membership opens it (`mm items` lists those) and
   stop; don't look for a way around it.
5. Finish as step 6 says. `worksWith` are the MCPs the items work with and
   they don't have: offer them once, as [Choices](#choices-the-mcps-it-works-with) says.

Never ask them for the site address or to copy an install prompt while
`mm items` says they are signed in.

## 0. Read the request

- **Item id**: the `<kind>/<name>` in the prompt (`skill/…`, `mcp/…`,
  `app/…`, `tutorial/…`). If there is none, _Ask_ which item they want; they
  can copy the prompt from the item's page on their MediaMake site.
- **Site URL** (`$MEDIAMAKE_URL`): the URL in the prompt. If there is none,
  use `MEDIAMAKE_API_URL` or `MEDIAMAKE_URL` from the environment, else `url`
  in `~/.mediamake/config.json`, else `https://mediamake.microfox.app`. Never
  _Ask_ for it.
- Note which Claude you are running in. It decides where skills and MCPs
  go (step 4).
- **A MediaMake skill** (`skill/…`, unless the plan says someone else makes
  it) always needs the MediaMake repository on their own computer. See
  [MediaMake skills: the repo first](#mediamake-skills-the-repo-first).

## 1. GitHub

Every install needs a GitHub account and `git`. Every MediaMake skill also
needs the MediaMake repository cloned on their computer (step 4).

1. Check `git --version`. If it's missing, install it (macOS:
   `xcode-select --install` or `brew install git`; Windows:
   `winget install --id Git.Git -e`; Linux: the package manager). If you
   can't run commands, _Ask_ them to install Git from https://git-scm.com/downloads.
2. Check `gh auth status` (GitHub CLI). If `gh` is missing, install it
   (`brew install gh`, `winget install --id GitHub.cli -e`, or
   https://cli.github.com).
3. If they're not signed in:
   - _Ask_ whether they have a GitHub account. If not, walk them through it:
     open https://github.com/signup, pick a username, verify the email.
     Wait until they say it's done.
   - Run `gh auth login --web --git-protocol https` and _Ask_ them to enter
     the one-time code shown in the browser page that opens. Confirm with
     `gh auth status`.

## 2. Who is installing

Pick the credential for step 3 (`$AUTH`), in this order. Don't ask for an
API key when an earlier option applies.

1. `mm` on the computer: go to
   [Signed in on this computer](#signed-in-on-this-computer) instead of the
   options below: `mm items install <item id> --yes` uses the sign-in in the
   Keychain, which these steps can't read.
2. `updateToken` in `~/.mediamake/config.json` (saved by an earlier
   `mm items install`): `$AUTH` = that token. It only works for items
   installed with it; if step 3 answers **401**, go on to option 3, then 4.
3. `MEDIAMAKE_API_KEY` from the environment, or `apiKey` in
   `~/.mediamake/config.json`: `$AUTH` = that key.
4. None of these: try step 3 with no `Authorization` header (items open to
   everyone need none). Only if that answers **401**: when mm-use
   (MediaMake's MCP, `$MEDIAMAKE_URL/mcp/use`) is connected in this Claude,
   its `install_item` tool answers with the plan under their own sign-in:
   use that plan from step 3 on. Otherwise _Ask_ them to sign in
   on `$MEDIAMAKE_URL`, copy their API key from `$MEDIAMAKE_URL/app/api-keys`
   and give it to you; save it to `~/.mediamake/config.json` as
   `{ "url": "<MEDIAMAKE_URL>", "apiKey": "<key>" }` (merge: keep every
   other key) and `chmod 600` it. What it can install follows their
   membership.

## 3. Get the install plan

```bash
curl -fsS -H "Authorization: Bearer $AUTH" \
  "$MEDIAMAKE_URL/api/catalog/install?item=<item id>"
```

(Leave the `-H` out when step 2 left `$AUTH` empty.)

- **200**: a JSON plan. `steps` are already in order, dependencies first.
  Package links expire at `linksExpireAt` (30 minutes); if one has expired,
  request the plan again.
- **401**: no credential, a wrong key, or an update token that doesn't
  cover this item. Go back to step 2, option 4.
- **404**: the item doesn't exist or their membership doesn't open it. Tell
  them that, and that their Subscription page (`$MEDIAMAKE_URL/app/subscription`)
  says how to get the membership that opens it (contribute, or ask an admin). Stop.
- **409**: something the item needs isn't shared with them; the `error`
  says what to ask for. Tell them and stop.

Before installing, tell them in one or two lines what you're about to set up
(the step titles) and anything they'll need to click.

### Choices: the MCPs it works with

The plan's `choices` are what the item works with but doesn't need outright,
such as a skill's MCPs (ElevenLabs for a brand kit's sound effects), strongest
first. Each has a `need` (`required`: the item's main job needs it;
`recommended`: it works without, worse or slower; `optional`: an extra) and
`reasons`: what each item uses it for (`for`) and what the person loses
without it (`without`). The steps that are there only for a choice carry its
id in `forChoices`.

1. Leave out choices that are set up already (the MCP is connected:
   `claude mcp get <name>`, its tools in this session, or **Settings →
   Connectors** / **Extensions** in Claude Desktop), saying so in a word.
2. _Ask_ about the rest in the same message as the plan: one line each with
   what it gives and what skipping it loses, recommending the `required` and
   `recommended` ones. Install only what they pick: a choice they turn down is
   skipped, with no second ask. For a `required` one they skip, say plainly
   which parts of the item won't work.
3. A choice with `available: false` can't come from MediaMake for them
   (`unavailable` says why): tell them what they lose. If step 2 left `$AUTH`
   empty, their API key (step 2, option 4) brings back the ones their
   membership opens.
4. In step 4, install a step with `forChoices` only if they said yes to at
   least one of those ids. Steps without it are always installed.
5. A maker's local server and its hosted connector for the same job (ElevenLabs:
   `mcp/elevenlabs` and `mcp/elevenlabs-connector`): on a computer set up the
   local server first: its API key is what MediaMake's `mm transcribe
   --yes` uses, and its files land straight on the computer, no widget. Offer
   the connector only as the alternative its `for` says: where nothing local
   can run (the Claude web or phone app), signing in with no key.

When you finish, list the choices they skipped with what each costs, and the
prompt that adds one later: "Set up <id> from MediaMake by following
https://github.com/microfox-ai/mediamake/blob/main/install.md".

## 4. Install each step, in order

Make a working folder: `~/.mediamake/installs/<item slug>`.

**Already set up?** Before each step, look for what it installs: the repo
folder, the extension on `chrome://extensions` (_Ask_, or read it from a
status tool of an MCP that is already connected), the skill folder, or an
MCP server with the bundle manifest's `name` (Claude Code:
`claude mcp get <name>`; Claude Desktop: **Settings → Extensions** and
`mcpServers` in `claude_desktop_config.json`). If it's there from somewhere
else (their own build or checkout, an older download) and it works, tell
them what you found and _Ask_ whether to keep it (skip this step and go on)
or replace it with this release. Never replace a working setup without
asking. Replacing removes the old copy first, so two don't run side by side;
each section below says how. A copy you installed from MediaMake before
(listed in `~/.mediamake/installed.json`, or under `~/Extensions`,
`~/.claude/skills` or `~/.mediamake/mcp`) is an update: replace it without
asking.

### MediaMake skills: the repo first

Every skill MediaMake makes (a `skill/…` step with no `madeBy`) runs inside
a local git checkout of `microfox-ai/mediamake`: it uses the repo's apps,
scripts and brand kits, and does nothing useful without them. The plan puts
that `repo` step before the skill. If a plan has no such step, clone the
repo anyway (as `type: "repo"` says) before the skill. Never install one of
these skills without the repo.

If you can't run commands on their own computer (the Claude app on the web
or a phone, or a sandbox that isn't their computer), you can't set the skill
up from here. Tell them it needs the MediaMake repo on their computer, and
_Ask_ them to paste the same prompt into Claude Code there
(https://claude.com/claude-code), or to run these in a terminal and then
start Claude Code in that folder:

```bash
gh repo clone microfox-ai/mediamake ~/mediamake
cd ~/mediamake && npm ci && npm run mm -- link && npm run mm -- migrate --yes && npm run mm -- doctor
```

They use the skill from Claude Code started in `~/mediamake`
(`cd ~/mediamake && claude`, or that folder opened in the Claude desktop
app's Code tab), not from a chat with no folder.

### `type: "repo"`: clone a GitHub repository

Clone to `~/mediamake` for `microfox-ai/mediamake`, otherwise
`~/<repo name>`. Use `gh repo clone <repo> <path>` (works for private repos the
person can see). If the repo's README says to install dependencies, do it
(`npm ci` at the repo root for mediamake, which installs exactly what the lockfile says and never
rewrites it, then `npm run mm -- link`, which puts
the `mm` command the skills use on their PATH). For mediamake, then set up the
workspace, where their projects, renders and brand kits live, outside the
checkout (`~/MediaMake`): on a fresh clone run `npm run mm -- migrate --yes`
(nothing moves; it names the workspace and sets it up). Then `npm run mm -- doctor`
checks the rest of the machine (Node 22.6 or newer, uv, ffmpeg, the render
browser, an ElevenLabs key) and says how to fix what's missing; `--fix` does
what it can itself.

If it's already there, update it instead. For mediamake, run
`npm run mm -- update` in it: on a clean main it pulls, runs `npm ci` when the
dependencies changed, then shows what `mm migrate` would move and runs
`mm doctor`. When it lists edits or commits on main, it has changed nothing:
show them what it printed, and run `npm run mm -- update --yes` only once they
agree (it keeps those on a `local/<date>` branch, then updates main). When it
lists work to move into the workspace, run `npm run mm -- migrate --yes` once
they agree. A checkout too old to have the command (npm or mm says there is
no such script or command): `git -C <path> pull --ff-only`, then
`npm run mm -- update`. Any other repo: `git -C <path> pull --ff-only`.
Remember the path; later steps' INSTALL.md files may refer to it as
`$MEDIAMAKE_REPO`.

### `type: "github-release"`: a file from a GitHub release

Download `downloadUrl` into the working folder.

- `kind: "chrome-extension"`: unzip into a folder they'll keep,
  `~/Extensions/<asset name without .zip>`. If that folder already exists,
  replace its contents (same folder keeps the extension's settings). Then
  _Ask_ them to: open `chrome://extensions` (Edge `edge://extensions`, Brave
  `brave://extensions`), turn on **Developer mode** (top right), click
  **Load unpacked**, and pick that folder; or, if it was already loaded, click
  the reload icon on its card. Give them the exact folder path. When it
  replaces a copy loaded from another folder, have them click **Remove** on
  that card first: a new folder gets a new extension id, so both copies would
  run, and its settings start empty. Follow `guide` for anything extra, such
  as the extension's own settings.
- Anything else: follow `guide`.

### `type: "source"`: installed from where it lives

No package of ours: `source` says where it comes from. A step with `madeBy`
is made by someone else (an open-source project, or a service hosted by its
maker); name the maker when you tell them about it, and show `notes` if set.

- **`source.type: "github-skill"`**: a skill folder in a public GitHub repo.
  - When an earlier `repo` step cloned `source.repo` (MediaMake's skills come
    with the MediaMake repo), the skill is there already: its
    `.claude/skills/<slug>` loads when Claude Code runs in that folder. Copy
    nothing; tell them to start Claude Code there (`cd ~/mediamake && claude`)
    to use it.
  - Otherwise fetch just that folder (with `--branch <ref>` when `source.ref`
    is set):
    ```bash
    git clone --depth 1 --filter=blob:none --sparse https://github.com/<repo>.git <working folder>/src
    git -C <working folder>/src sparse-checkout set <path>
    ```
    and install `<working folder>/src/<path>` the way the **skill** method of
    `type: "item"` says (Claude Code: `~/.claude/skills/<slug>`).
- **`source.type: "mcp-server"`**: a server its maker publishes, added under
  `source.name`. If a server by that name is already registered and works,
  it's set up (see **Already set up?**). The values it needs are in
  `local.env` or `remote.headers`: _Ask_ for each `required` one, saying what
  its `description` says. A `secret` one is an API key; walk them through it
  one step at a time:
  1. **Make it**: open `getAt` (signed in), create a key the way its
     `description` says, and copy it straight away (most services show a key
     only once).
  2. **Paste it here**: their next message in this chat, the key alone, no
     other words. Never repeat it in a message, and write it only into the
     server's config: no `.env`, no project file.
  3. **Say where it lives** so they can change it later: Claude Code keeps it
     in `~/.claude.json` (`mcpServers` › `<name>` › `env`, or `headers`);
     Claude Desktop in `claude_desktop_config.json` (below). To change it,
     paste the new one to Claude, or edit that file.
  Someone who would rather not paste a key into a chat can put it in
  themselves: give them the `claude mcp add` line (or the
  `claude_desktop_config.json` entry) with `<your key>` in its place, and
  wait until they say it's done. `format` is how it is written
  (`Bearer {value}`), `default` the value when they give none; leave out one
  that comes out empty. Then add it the way that fits:
  - A `remote` with a `directoryUrl` is listed in Claude's connector
    directory: in the Claude apps (Desktop, the web, a phone) _Ask_ them to
    open that page, add it there and sign in, instead of a custom connector.
    A connector added there also reaches Claude Code signed in with the same
    Claude account, so offer it in Claude Code too when there is no `local`.
  - Claude Code: `local` when there is one. With `mm` on the computer,
    `mm items install <item id> --yes` adds it (see
    [Signed in on this computer](#signed-in-on-this-computer)). Otherwise check
    its command runs first (`uvx` comes with uv:
    https://docs.astral.sh/uv/getting-started/installation/; a command of its
    own, as `local.install` says for this computer's system), then add it with
    the command as this computer finds it: by its full path (`command -v uvx`
    on macOS and Linux, `where.exe uvx` on Windows, its `.exe`; off the PATH,
    in ~/.local/bin or a folder `local.find` names), since the
    Claude app may start servers without the terminal's PATH; on Windows a
    command that is a `.cmd` there (`npx`) goes through `cmd /c`
    (`-- cmd /c npx -y <package>`). Then
    `claude mcp add --scope user <name> -e KEY=value … -- <command> <args…>`.
    Never put it in a repository's `.mcp.json`: that file is everyone's who
    pulls, and a command in it is one computer's.
    Otherwise `remote`:
    `claude mcp add --scope user --transport http <name> <url> --header "<Header>: <value>"`.
    Remove a server already registered under `<name>` first, as for `mcpb`.
    Its tools appear in the next Claude Code session.
  - Claude Desktop: `mcpb` when there is one (download it from that GitHub
    release and open it, as for `mcpb`). Otherwise a `remote` with a
    `connectorUrl`, or with no `headers`: _Ask_ them to add it in **Settings →
    Connectors → Add custom connector** with that URL and sign in. Otherwise
    `local`: add `"<name>": { "command", "args", "env" }` to `mcpServers` in
    `claude_desktop_config.json` (macOS `~/Library/Application Support/Claude/`,
    Windows `%APPDATA%\Claude\`; keep what is there), with the command as this
    computer finds it (as for Claude Code just above), then _Ask_ them to quit
    and reopen Claude Desktop.
  - The Claude app on the web or a phone: only `remote` (its `connectorUrl`,
    else `url`) as a custom connector.
  - Then do the `setup` steps in order, and use `guide`, its maker's own
    setup guide, for anything these don't cover.

### `type: "item"`: a MediaMake package

1. Download `downloadUrl` to `<working folder>/<slug>.tar.gz`, check its
   SHA-256 against `sha256` (`shasum -a 256` / `certutil -hashfile … SHA256`),
   and stop with an error if it differs.
2. Unpack into `<working folder>/<slug>/`.
3. Show `notes` to them if set.
4. By `method`:
   - **skill**: copy the unpacked folder to the skills folder as
     `<slug>/` (it holds `SKILL.md`). Claude Code: `~/.claude/skills/<slug>`.
     Claude Desktop or the Claude app: _Ask_ them to add it in **Settings →
     Capabilities → Skills** (zip the folder for them first and give them the
     path). Replace an older copy of the same skill, unless it's a symlink or
     sits in a git checkout: that's their working copy, so _Ask_ first.
     A MediaMake skill still needs the repo (see
     [MediaMake skills: the repo first](#mediamake-skills-the-repo-first)).
   - **mcpb**: the bundle is `entry` inside the package. For Claude Desktop,
     open it (`open <file>` on macOS, `start "" "<file>"` on Windows) and
     _Ask_ them to click **Install** and fill in any settings it asks for
     (MediaMake URL: `$MEDIAMAKE_URL`; a MediaMake API key only if it
     is required: the key from step 2 if it gave you one, otherwise from
     `$MEDIAMAKE_URL/app/api-keys`). For Claude
     Code, unzip the bundle into `~/.mediamake/mcp/<slug>/` (not the working
     folder, which is deleted at the end; on an update, replace that folder's
     contents), read its `manifest.json`, and add the server for all their
     projects from its `server.mcp_config`:
     `claude mcp add --scope user <name> -e KEY=value … -- <command> <args…>`
     (`${__dirname}` = `~/.mediamake/mcp/<slug>`, `${user_config.*}` = that
     setting's `default`, or _Ask_ when it's `required` without one; leave
     out an `env` entry that comes out empty). If a server named `<name>` is
     already registered, `claude mcp remove <name> --scope <its scope>`
     first. `claude mcp get <name>` should then say Connected; its tools
     appear in the next Claude Code session, not this one.
   - **app**: follow the package's `INSTALL.md`.
   - **manual**: follow the package's `INSTALL.md`.
5. If the package has an `INSTALL.md`, follow it now (for every method). It
   holds the item's own setup and a way to check it works.

## 5. Keep it up to date

So that updates need nothing pasted:

1. Record what you installed in `~/.mediamake/installed.json` (create it;
   keep entries already there):
   ```json
   { "items": { "mcp/browse-hack": { "version": "0.8.0", "title": "Browse Hack", "method": "mcpb", "path": "~/.mediamake/mcp/browse-hack", "installedAt": "2026-11-02T10:00:00Z" } } }
   ```
   One entry per `type: "item"` step, with the plan's `version` and where it
   went (skill folder, `~/.mediamake/mcp/<slug>`, repo, or `"claude-desktop"`).
   A `type: "source"` step gets one too, with `"source": "<source.type>"`
   instead of a version (it has none on MediaMake), and `path` the skill
   folder, the repo it came with, or the MCP server's name.
2. Make sure `~/.mediamake/config.json` has `$MEDIAMAKE_URL` as `url`
   (merge: keep every other key, such as `apiKey`, `updateToken` or
   `library`), then `chmod 600` it. Installed MCPs update themselves with the
   `updateToken` or `apiKey` there (Browse Hack checks every few hours and
   installs new versions of itself and its Chrome extension);
   `"autoUpdate": false` in the same file turns that off. (`mm items install`
   saves the update token by itself.)
3. Claude Code: if `~/.claude/skills/update-mediamake-items` isn't there,
   download
   https://raw.githubusercontent.com/microfox-ai/mediamake/main/.agents/skills/update-mediamake-items/SKILL.md
   into it, so "update <item>" works in any later session.

## 6. Finish

- Run whatever check the INSTALL.md files gave you (for an MCP: list its
  tools, or call a status tool).
- Tell them in a few lines what's installed (with its version), where, and
  the one thing to try first (for a MediaMake skill: start Claude Code in
  `~/mediamake` and type `/<slug>`), and that saying "update <item>" later brings it
  up to date (the item's page on `$MEDIAMAKE_URL` shows the live version and
  release notes). Mention anything that still needs them (a restart of Claude Desktop
  or a new Claude Code session so a new skill or MCP shows up, an extension
  to pin).
- Delete the working folder once they've added anything you handed them
  from it (a zipped skill, an `.mcpb` opened in Claude Desktop). Nothing
  installed lives there: skills, `~/Extensions/…`, `~/.mediamake/mcp/…` and
  repos stay where you put them.

If a step fails, say which step and the exact error, fix what you can, and
retry that step only. Don't re-run steps that already succeeded.

## Update an installed item

People say "update browse hack", "update <skill or MCP>", "update everything
from MediaMake" or "check MediaMake for updates", or paste a prompt like
"Update mcp/browse-hack from MediaMake …". Work quietly, as above.

1. **What's installed.** Read `~/.mediamake/installed.json`. Also look for
   installs from before that file existed: MCPs in
   `~/.mediamake/mcp/<slug>/manifest.json` (item `mcp/<slug>`, `version` in
   the manifest), skills in `~/.claude/skills/<slug>` that aren't symlinks
   or inside a git checkout (item `skill/<slug>`, version unknown), and
   Chrome extensions in `~/Extensions/<asset name without .zip>/manifest.json`.
   Match their words to an id, slug or title ("browse hack" →
   `mcp/browse-hack`). "Everything" means all of them. Something that isn't
   installed is an install: go to step 0 with it.
2. **Browse Hack.** For `mcp/browse-hack`, if its `update_browse_hack` tool
   is in this session, call it: it updates the MCP and the Chrome extension
   and reloads the extension in every Chrome profile by itself. Report what
   it says and stop.
3. **Credential and site.** Signed in on this computer (`mm items` lists
   each item as `installed`, `behind` or `missing`): `mm items install --yes`
   updates everything that is behind, or `mm items install <id> --yes` one
   item, and the rest of this section isn't needed. Otherwise
   `$MEDIAMAKE_URL`: `url` in `~/.mediamake/config.json`, else
   `MEDIAMAKE_API_URL` or `MEDIAMAKE_URL` from the environment, else
   `https://mediamake.microfox.app`. `$AUTH`: `updateToken` in
   `~/.mediamake/config.json`, else `apiKey` there or `MEDIAMAKE_API_KEY`.
4. **Compare.**
   ```bash
   curl -fsS -H "Authorization: Bearer $AUTH" \
     "$MEDIAMAKE_URL/api/catalog/versions?items=<id>,<id>"
   ```
   Each entry in `items` has the live `version` and `releases`, newest
   first, each with its `notes`. Ids under `missing` aren't covered by the
   token or aren't shared with them (step 6). For a Chrome extension the
   live version is the highest `vX.Y.Z` tag in
   `https://api.github.com/repos/<repo>/releases` that has the asset; compare
   it with the folder's `manifest.json` `version`. An item is behind when its
   installed version is lower or unknown. Tell them, one line per item, the
   installed and live versions and, briefly, the notes of each release in
   between. Nothing behind: say so, with the versions, and stop.
5. **Update** each item that's behind: get its plan (step 3 above, with this
   `$AUTH`) and do step 4 for its steps as an update: replace the old copy
   without asking, and skip steps that are already at the live version. An
   MCP's update only replaces the files in `~/.mediamake/mcp/<slug>/`;
   re-register it (`claude mcp add`) only when the new `manifest.json`'s
   `server.mcp_config` differs from the old one. Then follow its
   `INSTALL.md`'s check and do step 5 (record the versions).
   An item installed from its source (`"source"` in `installed.json`) has
   no versions on MediaMake, so it isn't in `versions`: a skill that came
   with the MediaMake repo updates with the repo (`npm run mm -- update` in
   `~/mediamake`, as step 4's `type: "repo"` says);
   one fetched from another repo, by fetching its folder again (step 4's
   `type: "source"`); an MCP from its maker updates itself (`uvx` runs the
   latest release when it starts, a hosted one is always current), so only
   say so.
6. **401, or the item is under `missing`:** the token lapsed or wasn't made
   for this item. Signed in on this computer: `mm items install <id> --yes`
   needs no token. Otherwise use their API key (step 2, option 4 of the
   install) from step 4 on. Still missing with the key: their membership
   doesn't open it; say which membership does and stop.
7. **Report** the new versions, and that a new Claude Code session (or
   reopening Claude Desktop) picks up an updated MCP or skill.
