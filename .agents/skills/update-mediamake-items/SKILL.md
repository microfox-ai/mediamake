---
name: update-mediamake-items
description: Bring MCPs, skills, apps and the Browse Hack Chrome extension installed from MediaMake up to date, showing the installed and live version numbers and the release notes in between, without asking for an install code again. Use when the user says "update browse hack", "update <an MCP or skill from MediaMake>", "update everything from MediaMake", "check for updates", "what version of <item> do I have", "is <item> up to date", or pastes an "Update <item> from MediaMake" prompt.
metadata:
  category: update
---

# update-mediamake-items

Items installed from MediaMake (skills, MCPs, apps, and the Chrome extensions they need) are
recorded in `~/.mediamake/installed.json`, and the install leaves an update token in
`~/.mediamake/config.json` (`updateToken`, with the site as `url`). Together they let you update
an item without the person copying a new install prompt. Never print the token.

## Browse Hack

Browse Hack updates itself: its MCP checks every few hours and installs new versions of the
MCP and of its Chrome extension, then reloads the extension in each Chrome profile. When the
person asks to update it or what version they have, call its `update_browse_hack` tool if this
session has it (`get_status` shows the versions too) and report what it says: the MCP version
this session runs, the one installed for the next session, the extension version in each Chrome
profile (named by its Google account email), and the release notes of what was installed.

A Chrome profile that runs Browse Hack from a build in a git checkout (a developer's own copy) is
never overwritten. When it's behind, its profile entry says so and lists `update.commands` (pull,
then rebuild). Show them to the person and run them only if they agree; then call
`update_browse_hack` again, which reloads Chrome on the new build.

## The MediaMake repo, and the skills that came with it

A checkout of `microfox-ai/mediamake` (usually `~/mediamake`), and every skill that runs from it
(`~/.claude/skills/<name>` linking into the checkout, or `"source"` in `installed.json`), updates
with `mm update` run in the checkout (`npm run mm -- update` until `mm` is linked). It has no version
on MediaMake: its version is GitHub's main (`git log -1 --format='%h %cs'` in the checkout).

- On a clean main it does it all: pulls, runs `npm ci` when the dependencies changed, shows what
  `mm migrate` would move into the workspace, and runs `mm doctor`. Report the commits it brought in
  and anything doctor flags.
- Edits or commits on main stop it, and it lists them without changing anything. Show the person
  that list and run `mm update --yes` only once they agree: it keeps them on a `local/<date>` branch
  (`--push` sends that branch to GitHub so it can become a PR), then updates main. Never discard
  them yourself.
- On another branch it updates only the local main and says how to bring it into the branch.
- Work `mm migrate` lists for the workspace moves with `mm migrate --yes`, once they agree.
- A checkout too old to have the command (npm or mm says there is no such script or command):
  `git pull --ff-only` in it, then `mm update`.

## Anything else (or Browse Hack without its tools)

Fetch and follow the **Update an installed item** section of
https://github.com/microfox-ai/mediamake/blob/main/install.md
(raw: https://raw.githubusercontent.com/microfox-ai/mediamake/main/install.md). In short:

1. Find what's installed (`installed.json`, `~/.mediamake/mcp/*/manifest.json`,
   `~/.claude/skills/*`, `~/Extensions/*`) and match the person's words to an item id.
2. `GET $MEDIAMAKE_URL/api/catalog/versions?items=<ids>` with `Authorization: Bearer <updateToken>`
   gives each item's live `version` and its `releases` with notes.
3. Tell the person, per item: installed version → live version, and the notes in between.
4. Update what's behind from the install plan, as install.md's step 4 says for updates.
5. A 401, or the item under `missing`, means the token doesn't cover it: ask them to copy the
   item's install prompt from its page on the MediaMake site and paste it.

The item's page on the MediaMake site (`/access?item=<id>`) shows the same live version and
release notes, so the person can check there too.

`"autoUpdate": false` in `~/.mediamake/config.json` stops items from updating on their own;
asking for an update still works.
