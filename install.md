# Install from MediaMake

These are instructions for **Claude** (Claude Code, Claude Desktop or the
Claude app with a computer it can use). A person pastes a prompt like:

> Set up mcp/browse-hack from MediaMake (https://your-mediamake-site) with install code mmi_… by following https://github.com/microfox-ai/mediamake/blob/main/install.md

and you install that item and everything it needs. Follow the steps in order.
To bring something installed earlier up to date ("update browse hack",
"update <skill or MCP>", "check MediaMake for updates"), go to
[Update an installed item](#update-an-installed-item) instead.
Work quietly; stop and ask the person **only** where a step says _Ask_, and
when you ask, say exactly what to click or type. Never print their API key or install code
back to them or write it anywhere except where a step says to. The same
goes for the update token from step 5.

## 0. Read the request

- **Item id**: the `<kind>/<name>` in the prompt (`skill/…`, `mcp/…`,
  `app/…`, `tutorial/…`). If there is none, _Ask_ which item they want; they
  can copy the prompt from the item's page on their MediaMake site.
- **Site URL** (`$MEDIAMAKE_URL`): the URL in the prompt. If there is none,
  use `MEDIAMAKE_URL` from the environment or `~/.mediamake/config.json`; if
  still unknown, _Ask_ for the MediaMake site address they were given.
- **Install code**: the `mmi_…` after "install code", if the prompt has
  one. The site adds it when they copy the prompt while signed in.
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

1. **Install code** from the prompt: `$AUTH` = the code. Nothing to ask.
2. `updateToken` in `~/.mediamake/config.json` (saved by step 5 of an
   earlier install): `$AUTH` = that token. It only works for items installed
   with it; if step 3 answers **401**, go on to option 3, then 4.
3. `MEDIAMAKE_API_KEY` from the environment, or `apiKey` in
   `~/.mediamake/config.json`: `$AUTH` = that key.
4. None of these: try step 3 with no `Authorization` header (items open to
   everyone need none). Only if that answers **401**, _Ask_ them to open the
   item's page on `$MEDIAMAKE_URL`, sign in, click **Copy** on the install
   prompt again and paste it to you; use the install code in it. (People
   who want to keep an API key for later can copy theirs from
   `$MEDIAMAKE_URL/core/api-keys` instead; save it to
   `~/.mediamake/config.json` as `{ "url": "<MEDIAMAKE_URL>", "apiKey": "<key>" }`
   and `chmod 600` it.)

An install code works for this one item for 2 hours, which covers asking
for the plan again when its links expire. Never save it; step 5 trades it
for an update token that is saved.

## 3. Get the install plan

```bash
curl -fsS -H "Authorization: Bearer $AUTH" \
  "$MEDIAMAKE_URL/api/catalog/install?item=<item id>"
```

(Leave the `-H` out when step 2 left `$AUTH` empty.)

- **200**: a JSON plan. `steps` are already in order, dependencies first.
  Package links expire at `linksExpireAt` (30 minutes); if one has expired,
  request the plan again.
- **401**: no credential, an expired install code, a wrong key, or an update
  token that doesn't cover this item. Go back to step 2, option 4.
- **404**: the item doesn't exist or isn't shared with this account. Tell
  them that, and that whoever shared it can give access (an invite link opens
  `$MEDIAMAKE_URL/access?code=…`). Stop.
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
   empty, copying the install prompt while signed in on `$MEDIAMAKE_URL`
   (it then carries an install code) brings back the ones shared with them.
4. In step 4, install a step with `forChoices` only if they said yes to at
   least one of those ids. Steps without it are always installed.

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
cd ~/mediamake && npm install
```

They use the skill from Claude Code started in `~/mediamake`
(`cd ~/mediamake && claude`, or that folder opened in the Claude desktop
app's Code tab), not from a chat with no folder.

### `type: "repo"`: clone a GitHub repository

Clone to `~/mediamake` for `microfox-ai/mediamake`, otherwise
`~/<repo name>`. If it's already there, `git -C <path> pull --ff-only`
instead. Use `gh repo clone <repo> <path>` (works for private repos the
person can see). If the repo's README says to install dependencies, do it
(`npm install` at the repo root for mediamake). Remember the path; later
steps' INSTALL.md files may refer to it as `$MEDIAMAKE_REPO`.

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
  `local.env` or `remote.headers`: _Ask_ for each `required` one (`getAt` is
  where they get it). A `secret` one is an API key: have them paste it, never
  show it back, and write it only into the server's config. `format` is how
  it is written (`Bearer {value}`), `default` the value when they give none;
  leave out one that comes out empty. Then add it the way that fits:
  - Claude Code: `local` when there is one. Check its command runs first
    (`uvx` comes with uv: https://docs.astral.sh/uv/getting-started/installation/),
    then `claude mcp add --scope user <name> -e KEY=value … -- <command> <args…>`.
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
    Windows `%APPDATA%\Claude\`; keep what is there), then _Ask_ them to quit
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
     `$MEDIAMAKE_URL/core/api-keys`; never the install code). For Claude
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

So that updates never need an install code again:

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
2. If step 2 used an install code, trade it for an update token. Send the
   one already saved, if any, so it is extended instead of replaced:
   ```bash
   curl -fsS -X POST -H "Authorization: Bearer $AUTH" -H "Content-Type: application/json" \
     -d '{"token": "<updateToken from ~/.mediamake/config.json, or leave this field out>"}' \
     "$MEDIAMAKE_URL/api/catalog/update-token"
   ```
   Save the answer's `token` as `updateToken`, and `$MEDIAMAKE_URL` as `url`,
   in `~/.mediamake/config.json` (merge: keep every other key, such as
   `apiKey` or `library`), then `chmod 600` it. It covers this item and what
   it needs, and lapses after a year without use. Installed MCPs use it to
   update themselves (Browse Hack checks every few hours and installs new
   versions of itself and its Chrome extension); `"autoUpdate": false` in
   the same file turns that off.
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
3. **Credential and site.** `$MEDIAMAKE_URL`: `url` in
   `~/.mediamake/config.json`, else `MEDIAMAKE_URL` from the environment,
   else _Ask_. `$AUTH`: an install code if they pasted a prompt with one,
   else `updateToken` in `~/.mediamake/config.json`, else `apiKey` there or
   `MEDIAMAKE_API_KEY`.
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
   `INSTALL.md`'s check and do step 5 (record the versions; trade an install
   code if you used one).
   An item installed from its source (`"source"` in `installed.json`) has
   no versions on MediaMake, so it isn't in `versions`: a skill that came
   with the MediaMake repo updates with `git -C ~/mediamake pull --ff-only`;
   one fetched from another repo, by fetching its folder again (step 4's
   `type: "source"`); an MCP from its maker updates itself (`uvx` runs the
   latest release when it starts, a hosted one is always current), so only
   say so.
6. **401, or the item is under `missing`:** the token lapsed or wasn't made
   for this item. _Ask_ them to open the item's page on `$MEDIAMAKE_URL`
   while signed in, click **Copy install prompt** and paste it; use its
   install code from step 4 on (step 5 then adds the item to the token).
7. **Report** the new versions, and that a new Claude Code session (or
   reopening Claude Desktop) picks up an updated MCP or skill.
