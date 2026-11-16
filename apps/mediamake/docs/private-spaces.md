# Private spaces: your own skills, MCPs and apps on every computer

A space is a private GitHub repo that belongs to one member and holds what
they made for themselves: skills, MCPs and apps. `mm space` clones it into the
workspace, links its skills into Claude and moves changes between the member's
computers. Mine in the app shows each item, its version and which computers
have it. (UI refactor plan, step 2a. Sharing an item with projects or people
is step 2b and builds on the record described at the bottom.)

## The repo

```
skills/<name>/SKILL.md      a skill, with anything it needs beside it (code, small assets)
mcps/<name>/                an MCP: its code, a README that says how to run it, an item.json
apps/<name>/                an app, the same way
<kind>/<name>/item.json     optional: { "title", "summary", "version", "media": ["<library id>"] }
```

An item's version is `version` in its `item.json`, else the SKILL.md's
(`version` or `metadata.version`) or the `package.json`'s, else a short hash
(`sha:…` of the SKILL.md, `tree:…` of the folder).

## On a computer

| | |
| --- | --- |
| `mm space` | Where the space is, what changed here and on GitHub, every item |
| `mm space connect --create [name]` | Make the private repo (needs `gh`) and connect it |
| `mm space connect <owner/repo>` | Connect one that exists. A public repo is refused |
| `mm space pull` | Bring what the other computers pushed, link new skills, unlink removed ones |
| `mm space push` | What would go up (a dry run); `--yes` commits and pushes it, `-m "<what>"` names it |
| `mm space add <skill>` | Move one of your workspace skills (a variant) into the space (dry run, `--yes`) |
| `mm space new <skill\|mcp\|app> <name>` | Start an item |
| `mm space report [--dry]` | Tell MediaMake what this computer has; `--dry` shows it without sending |
| `mm space disconnect` | Unlink the space from this computer (dry run, `--yes`); the folder stays |
| `mm space forget` | Delete what MediaMake holds of the space; the repo is untouched |

- The clone is `<workspace>/space` (`mm workspace`; usually `~/MediaMake/space`).
- A skill is linked the way a variant is: `<workspace>/skills/<name>` links to
  the space's folder, and `~/.claude/skills/<name>` links to that, so every
  session loads it and `fork`, `publish` and `media sync` see it as yours. A
  folder of your own with the same name is never replaced: the command says so.
- Git moves the files, with the sign-in the computer already has (`gh`, SSH or
  a credential helper). MediaMake holds no GitHub token and never sees a file.
- `pull` and `push` first keep what changed here as a commit on this computer,
  so nothing is lost. When two computers changed the same file, nothing is
  changed and the command names the files; they are merged with plain git in
  the folder, then pushed.
- Everything a computer has that GitHub doesn't goes up as one commit.

## Large media

Media does not go in git. `push` refuses any file over 10 MB, and a video,
audio, layered image or archive over 2 MB. Put it in the media library
(`mm media ingest`), name it under `media` in the item's `item.json`, and it
travels with the library (`mm media share`, `mm media sync`). `mm space` and
Mine show what each item needs. `push` also stops on an env file or anything
that looks like a key or a token (`--force` sends it anyway).

## What MediaMake is told

After `connect`, `pull`, `push`, `add`, `new` and `report`, when the computer
is signed in and usage reports are on (`mm usage`):

```
PUT /api/space
{ device, repo, branch, commit, commitAt, pushed,
  items: [{ kind, name, version, title, summary, changed, media }] }
```

`device` is the computer's random label (`mac-3f9a`), `repo` its name
(`owner/name`), `summary` one line of at most 200 characters, `media` a count.
Never a file, a path or a token; the server drops anything else
(`lib/space/space.ts`). `mm usage off` stops it, `mm space report --dry` shows
it exactly, `mm space forget` deletes it.

| Route | |
| --- | --- |
| `PUT /api/space` | What one computer's clone holds now; replaces what that computer said before |
| `GET /api/space` | The space as Mine shows it |
| `DELETE /api/space?device=<label>` | That computer disconnected |
| `DELETE /api/space` | Forget the whole space |

## The records

- `spaces`, one per account: `{ clientId, repo, connectedAt, updatedAt,
  devices: [{ device, branch, commit, commitAt, pushed, reportedAt }] }`.
- `space_items`, one per item: `{ owner, kind, name, title, summary, version,
  media, devices: [{ device, version, changed }], projects, people, editors,
  createdAt, updatedAt }`.

An item lives in its owner's space, one copy with one history. `projects`
(any number of projects whose members get it), `people` (members named one by
one) and `editors` (who besides the owner may change it) are for step 2b: they
start empty, are indexed, and a computer's report never writes them. An item
no computer has any more is removed, unless it is shared. Step 2b also needs a
GitHub App with read access to the repos a member picks, so MediaMake can hand
one item to the people it is shared with; 2a needs none.

## Not in this step

Sharing and linking to projects (2b), submitting to the store (2c), and
registering a space's MCPs in Claude: an MCP's folder is cloned and listed, and
its README says how to run it.
