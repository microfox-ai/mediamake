# Install from MediaMake

These are instructions for **Claude** (Claude Code, Claude Desktop or the
Claude app with a computer it can use). A person pastes a prompt like:

> Set up mcp/get-into-zone from MediaMake (https://your-mediamake-site) with install code mmi_… by following https://github.com/microfox-ai/mediamake/blob/main/install.md

and you install that item and everything it needs. Follow the steps in order.
Work quietly; stop and ask the person **only** where a step says _Ask_, and
when you ask, say exactly what to click or type. Never print their API key or install code
back to them or write it anywhere except where a step says to.

## 0. Read the request

- **Item id**: the `<kind>/<name>` in the prompt (`skill/…`, `mcp/…`,
  `app/…`, `tutorial/…`). If there is none, _Ask_ which item they want; they
  can copy the prompt from the item's page on their MediaMake site.
- **Site URL** (`$MEDIAMAKE_URL`): the URL in the prompt. If there is none,
  use `MEDIAMAKE_URL` from the environment or `~/.mediamake/config.json`; if
  still unknown, _Ask_ for the MediaMake site address they were given.
- **Install code**: the `mmi_…` after "install code", if the prompt has
  one. The site adds it when they copy the prompt while signed in.
- Note which Claude you are running in. It decides where skills go (step 4).

## 1. GitHub

Every install needs a GitHub account and `git`. Most skills also need the
MediaMake repository cloned.

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
2. `MEDIAMAKE_API_KEY` from the environment, or `apiKey` in
   `~/.mediamake/config.json`: `$AUTH` = that key.
3. Neither: try step 3 with no `Authorization` header (items open to
   everyone need none). Only if that answers **401**, _Ask_ them to open the
   item's page on `$MEDIAMAKE_URL`, sign in, click **Copy** on the install
   prompt again and paste it to you; use the install code in it. (People
   who want to keep an API key for later can copy theirs from
   `$MEDIAMAKE_URL/core/api-keys` instead; save it to
   `~/.mediamake/config.json` as `{ "url": "<MEDIAMAKE_URL>", "apiKey": "<key>" }`
   and `chmod 600` it.)

An install code works for this one item for 2 hours, which covers asking
for the plan again when its links expire. Never save it.

## 3. Get the install plan

```bash
curl -fsS -H "Authorization: Bearer $AUTH" \
  "$MEDIAMAKE_URL/api/catalog/install?item=<item id>"
```

(Leave the `-H` out when step 2 left `$AUTH` empty.)

- **200**: a JSON plan. `steps` are already in order, dependencies first.
  Package links expire at `linksExpireAt` (30 minutes); if one has expired,
  request the plan again.
- **401**: no credential, an expired install code, or a wrong key. Go
  back to step 2, option 3.
- **404**: the item doesn't exist or isn't shared with this account. Tell
  them that, and that whoever shared it can give access (an invite link opens
  `$MEDIAMAKE_URL/access?code=…`). Stop.
- **409**: something the item needs isn't shared with them; the `error`
  says what to ask for. Tell them and stop.

Before installing, tell them in one or two lines what you're about to set up
(the step titles) and anything they'll need to click.

## 4. Install each step, in order

Make a working folder: `~/.mediamake/installs/<item slug>`.

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
  the reload icon on its card. Give them the exact folder path. Follow
  `guide` for anything extra, such as the extension's own settings.
- Anything else: follow `guide`.

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
     path). Replace an older copy of the same skill.
   - **mcpb**: the bundle is `entry` inside the package. For Claude Desktop,
     open it (`open <file>` on macOS, `start "" "<file>"` on Windows) and
     _Ask_ them to click **Install** and fill in any settings it asks for
     (MediaMake URL: `$MEDIAMAKE_URL`; a MediaMake API key only if it
     is required, from step 2 or `$MEDIAMAKE_URL/core/api-keys`). For Claude Code,
     unzip the bundle, read its `manifest.json`, and add the server with
     `claude mcp add` using its `server.mcp_config` command and args
     (`${__dirname}` = the unzipped folder, `${user_config.*}` = the
     settings it asks for).
   - **app**: follow the package's `INSTALL.md`.
   - **manual**: follow the package's `INSTALL.md`.
5. If the package has an `INSTALL.md`, follow it now (for every method). It
   holds the item's own setup and a way to check it works.

## 5. Finish

- Run whatever check the INSTALL.md files gave you (for an MCP: list its
  tools, or call a status tool).
- Tell them in a few lines what's installed, where, and the one thing to try
  first. Mention anything that still needs them (a restart of Claude Desktop
  so a new skill or MCP shows up, an extension to pin).
- Delete the working folder's downloads; keep the unpacked skills,
  extensions and repos where you installed them.

If a step fails, say which step and the exact error, fix what you can, and
retry that step only. Don't re-run steps that already succeeded.
