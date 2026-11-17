---
name: use-mediamake-spaces
description: Work with MediaMake Spaces (it was ProjectSync plus spaces) — the user's personal space and one space per project they are on, each holding the skills, MCPs and apps made for it (a private GitHub repo, `mm space`) and its files (brand kit, productions, releases, media, shared assets, through the MediaMake Spaces MCP and `mm media sync`). Use when the user says "sync my spaces / my MediaMake space", "set up the <project> project on this computer", "join the project", "share this skill with the <project> project", "make this skill mine / private", "invite <someone> to the project", "upload / sync this production (or release, brand kit, media) to the project", "pull the project's files", "what is in my space", "project sync", "ProjectSync", "who can open this project", or asks how spaces, project sharing or cloud projects work in MediaMake.
metadata:
  category: other
  internal: 'true'
---

# use-mediamake-spaces

A **space** keeps everything for one body of work, the same on every computer. Both kinds are private:

- **Personal**: only the user. `<workspace>/space`, repo `<their GitHub login>/mediamake-space`.
- **A project's**: everyone on that MediaMake project (a channel, a film, a series, a brand).
  `<workspace>/spaces/<project>`, repo `<maker's login>/mediamake-<project>`.

Every space holds two things, moved by two tools. Know which one the ask is about before doing anything:

| What | Where it is kept | Moved by |
| --- | --- | --- |
| Skills, MCPs and apps someone made (`skills/`, `mcps/`, `apps/`) | The space's private GitHub repo | `mm space` |
| Files: brand kit, productions, releases, media, shared assets | MediaMake's storage, against the owner's storage | The MediaMake Spaces MCP (`mcp/projectsync`) and `mm media sync` |

In the app it is **Spaces** (`/app/spaces`): the personal space first, then each project space, each
with its files, its skills, who can open it and the one line that sets it up on a computer. The full
reference is `apps/mediamake/docs/private-spaces.md`; `mm space help` lists every command. Take the
workspace's path from `mm workspace`, never by hand.

## First: check the MCPs

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/projectsync` | optional | MediaMake Spaces (it was ProjectSync): upload and download a space's productions, releases, media, brand kit and shared assets | `mm media sync` still moves a channel's brand kit, productions' details and shared media; whole productions and release kits can't go up |

When it is missing and `mm items` says the computer is signed in, install it without asking:
`mm items install mcp/projectsync --yes`. Never ask for a site address, an install prompt or a code.

## Before anything

1. Read the user's notes: `mm notes use-mediamake-spaces`.
2. `mm space` shows every space on this computer, what changed here and on GitHub, and every item.
   "No space on this computer yet" is fine: the first ask that needs one makes it.
3. Signed in? `mm login status`. Not signed in: run `mm login` and ask them to click Allow in the tab
   it opens. Never ask for an API key.
4. `gh auth status`. A missing GitHub sign-in (`gh auth login`) is the only step that is the user's.

## What they ask, and what to run

Everything that sends something out is a dry run first. Show what it prints, and run it with `--yes`
only once they agree.

| They say | Run |
| --- | --- |
| "Sync my spaces", or the start of a session that uses their skills | `mm space sync`: brings everything down, shows what would go up, then shows each space's files waiting. `mm space sync --yes` sends the skills once they agree |
| "Set up / join the <project> project here" | `mm space join <project id or name>` (the line on the project's page). It signs in when needed, accepts the GitHub invitation, clones, links the skills and shows the project's files |
| "Make me a skill" (their own, not for this repo) | `mm space new skill <name>`, then write it there. Never in this repo. `mm space add <name>` moves a variant from the workspace in |
| "Share it with the <project> project" | `mm space share <item> --project=<project>` (dry run, then `--yes`; `--copy` keeps theirs too). Tell them who could not be invited (no GitHub account linked in MediaMake) |
| "I added <someone> to the project" / "invite them" | With GitHub connected in the app's access panel it already happened. Otherwise `mm space invite <project id>` on the owner's computer, then give the new member `mm space join <project id>` |
| "Upload / sync this production, release or media" | The MCP: ask which space (`list_projects`; the personal one is marked `personal`) and whether it goes up as a production, a release or media. `create_production` / `create_release` with `dryRun` first, show it, then upload. The same slug again is a new version |
| "Get the project's files" | `mm media sync status --project=<id>`, then `mm media sync pull --project=<id>` (dry run, `--yes`); or the MCP's `get_production` / `get_release` with `saveTo`, `download_shared_assets` |
| "Share these overlays / files with the team" | `mm media share <id…> --project=<projectId> --yes` only for files they named, or the MCP's `share_assets` |
| "Use the brand kit" | The MCP's `get_brand_kit` before making anything for a brand; `upload_brand_kit` sends a `pack-brand-kit` folder |
| "What does MediaMake know about my spaces?" | `mm space report --dry` and `apps/mediamake/docs/usage.md` |
| "Take this computer off" / "forget my spaces" | `mm space disconnect` (dry run, `--yes`), `mm space forget`. The repos are untouched |

## Rules

- **Repos are made without asking.** A space is created by itself, under the GitHub account of the
  person who makes it. Never ask the user to create or name a repo.
- **The personal space is only theirs.** It cannot be shared, renamed or deleted as a whole. To work
  with someone, share the item into a project space.
- **Nothing goes up without their say.** `mm space sync` sends skills only with `--yes`, and it only
  shows files. Files move with `mm media sync`, `mm media share` or the MCP, each after they agree.
- **Roles decide.** Owners and editors add and change, viewers read, only the owner deletes and
  decides who has access. When a command says they are a viewer or not invited yet, tell them who
  invites (it names them). Don't work around it.
- **Large media never goes in a space's repo.** `push` refuses a file over 10 MB, or media over 2 MB.
  Put it in the media library (`mm media ingest`) and name it under `media` in the item's `item.json`.
- **Keys stay out.** `push` stops on anything that looks like a key or a token. Take it out of the
  file; `--force` only when they say it is not a secret.
- **The GitHub connection's token** is sealed on the site. Never print, log or copy it.
- **Publishing is separate.** A space is private. Sending an item from it to the public catalog
  follows the rule at the top of `CLAUDE.md`: name the finished production made with it.
- **Memberships.** Skills, MCPs and apps in a personal space are for every member. Files in a space,
  project spaces and the MCP open with Plus and above. A 403 about a membership is not a bug: say what
  it needs.

## When it goes wrong

| It says | Do |
| --- | --- |
| Not invited to the repo yet | The repo's maker invites: they run `mm space sync` (or `mm space invite <project id>`), or connect GitHub in the access panel. Check the GitHub account linked in the app is the one `gh` is signed in as |
| Two computers changed the same file | Nothing was changed. It names the files: settle them with the user, then sync again |
| A public repo is refused | A space must be private. Make the repo private on GitHub, or connect another |
| The files check did not finish | `mm doctor` says what the computer is missing; a Public membership has no files in a space |
| An older checkout has no `mm space` | `mm update`, which also brings their spaces down |

## Keeping this up to date

This skill is a file of the MediaMake checkout, so `mm update` brings its latest instructions with
everything else, then runs `mm space pull` when the computer has spaces. After an update, read
`apps/mediamake/docs/private-spaces.md` again if a command here fails: the doc and `mm space help`
are the truth.

## Lessons log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add use-mediamake-spaces "<what they said> → <the rule>"   # a new lesson, dated for you
mm notes use-mediamake-spaces                                        # your notes for this skill
```

`mm notes promote use-mediamake-spaces` turns your notes into a pull request for this log.
