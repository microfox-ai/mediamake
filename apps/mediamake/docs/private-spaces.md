# Spaces: what you made, on every computer and for your projects

A space is a private GitHub repo that holds skills, MCPs and apps someone
made. There are two kinds:

- **Yours.** Only you. It is made by itself the first time a skill needs one.
- **A project's.** Everyone on that MediaMake project. It is made the first
  time someone shares an item into the project.

`mm space` clones them into the workspace, links their skills into Claude and
keeps every computer the same with one command, `mm space sync`. Mine in the
app shows each space, its items and whether each is the same everywhere; a
project's page shows the project's. (UI refactor plan, steps 2a and the
sharing half of 2b.)

## The repo

```
skills/<name>/SKILL.md      a skill, with anything it needs beside it (code, small assets)
mcps/<name>/                an MCP: its code, a README that says how to run it, an item.json
apps/<name>/                an app, the same way
<kind>/<name>/item.json     optional: { "title", "summary", "version", "media": ["<library id>"] }
```

An item's version is `version` in its `item.json`, else the SKILL.md's
(`version` or `metadata.version`) or the `package.json`'s, else a short hash
that the app doesn't show.

## On a computer

| | |
| --- | --- |
| `mm space` | Every space on this computer: what changed here and on GitHub, every item |
| `mm space sync` | Bring everything down and show what would go up; `--yes` sends it too |
| `mm space new <skill\|mcp\|app> <name>` | Start an item in your space (`--project=<project>` starts it in a project's) |
| `mm space add <skill>` | Move one of your workspace skills (a variant) into your space (dry run, `--yes`) |
| `mm space share <item> --project=<project>` | Move an item into a project's space, so everyone on it gets it (dry run, `--yes`; `--copy` keeps yours too) |
| `mm space join <project>` | Set one project up on this computer: sign in when needed, accept the GitHub invitation, clone its space, link its skills, show its shared media. The project's page has the line to copy |
| `mm space ensure` | Make and connect your own space when this computer has none |
| `mm space connect <owner/repo>` | Use a repo you already have as your own space. A public repo is refused |
| `mm space pull`, `mm space push` | The two halves of `sync` (`push` is a dry run until `--yes`; `-m "<what>"` names the commit) |
| `mm space report [--dry]` | Tell MediaMake what this computer has; `--dry` shows it without sending |
| `mm space disconnect [--project=<project>]` | Unlink a space from this computer (dry run, `--yes`); the folder stays |
| `mm space forget` | Delete what MediaMake holds of your spaces; the repos are untouched |

`<project>` is a project's name or id; `mm space` lists the ones you are on.

### Repos are made for you

Nobody creates a repo by hand. With the GitHub CLI signed in (`gh auth login`,
once per computer):

- `new`, `add` and `ensure` make `<you>/mediamake-space`, private, when you
  have no space yet, or connect it when it exists already (your second
  computer).
- The first `share` or `new --project` into a project makes
  `<you>/mediamake-<project>`, private, tells MediaMake that this repo is the
  project's space, and invites the project's members on GitHub by the GitHub
  account each linked in MediaMake: editors and the owner may push, viewers
  only pull. It says who could not be invited (no GitHub account linked yet);
  the next share or sync by someone who may change the project invites them.
- A member's next `mm space sync` accepts the invitation and clones the
  project's space. A new member copies one line from the project's page,
  `mm space join <project id>`, which also signs the computer in when it
  isn't. If the repo hasn't invited them yet, it says who invites and what to
  check, and the same line works once they are invited.

Only the owner and editors of a project can make its space or share into it.

### How it stays the same

- Your clone is `<workspace>/space`, a project's `<workspace>/spaces/<project>`
  (`mm workspace`; usually under `~/MediaMake`).
- A skill is linked the way a variant is: `<workspace>/skills/<name>` links to
  the space's folder, and `~/.claude/skills/<name>` links to that, so every
  session loads it. A folder of your own with the same name is never replaced:
  the command says so.
- Git moves the files, with the sign-in the computer already has. MediaMake
  holds no GitHub token and never sees a file.
- `sync`, `pull` and `push` first keep what changed here as a commit on this
  computer, so nothing is lost. When two computers changed the same file,
  nothing is changed and the command names the files; they are merged with
  plain git in the folder, then synced.
- Everything a computer has that GitHub doesn't goes up as one commit, and only
  with `--yes`: show the dry run to the user first.

## Large media

Media does not go in git. `push` refuses any file over 10 MB, and a video,
audio, layered image or archive over 2 MB. Put it in the media library
(`mm media ingest`), name it under `media` in the item's `item.json`, and it
travels with the library (`mm media share`, `mm media sync`). `mm space` and
Mine show what each item needs. `push` also stops on an env file or anything
that looks like a key or a token (`--force` sends it anyway).

## What MediaMake is told

After every command that changes a space, when the computer is signed in and
usage reports are on (`mm usage`):

```
PUT /api/space
{ device, repo, project?, branch, commit, commitAt, pushed,
  items: [{ kind, name, version, title, summary, changed, media }] }
```

`device` is the computer's random label (`mac-3f9a`), `repo` its name
(`owner/name`), `project` the project's id for a project's space, `summary`
one line of at most 200 characters, `media` a count. Never a file, a path or a
token; the server drops anything else (`lib/space/space.ts`). `mm usage off`
stops it, `mm space report --dry` shows it exactly, `mm space forget` deletes
it.

Two calls are part of how sharing works, so they don't depend on that switch:
reading your spaces and projects (so a computer can find a project's repo),
and naming a project's repo when you make its space.

| Route | |
| --- | --- |
| `GET /api/space` | Your space and one per project you are on, as Mine shows them. People who may change a project also get its members' names and GitHub logins, to invite them |
| `PUT /api/space` | What one computer's clone holds now; replaces what that computer said before. For a project: members only, and only for the repo that is its space |
| `POST /api/space` `{ project, repo }` | Names the repo of a project's space (owner and editors) |
| `DELETE /api/space?device=<label>[&project=<id>]` | That computer disconnected |
| `DELETE /api/space` | Forget your space and take your computers off every project's |

## The records

- `spaces`, one per space: `{ id, repo, connectedAt, updatedAt, devices:
  [{ key, clientId, label, branch, commit, commitAt, pushed, reportedAt }] }`.
  `id` is `user:<clientId>` or `project:<projectId>`.
- `space_items`, one per item: `{ space, kind, name, title, summary, version,
  media, devices: [{ device, version, changed }], createdAt, updatedAt }`.

An item lives in one space. Who gets it is who the space belongs to: you, or
the people on the project. An item no computer has any more is removed. In the
app each item has one state: the same on every computer, not sent yet (a
computer changed it and hasn't synced), or an update waiting (a computer has
an older copy or none).

## Not in this step

Sharing an item with single people outside a project, submitting to the store
(2c), and registering a space's MCPs in Claude: an MCP's folder is cloned and
listed, and its README says how to run it.
