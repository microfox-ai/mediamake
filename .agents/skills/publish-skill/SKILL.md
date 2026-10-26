---
name: publish-skill
description: Add new Claude Code skills to this repo, where every skill is public — find skills made as folders in .claude/skills that aren't in .agents/skills yet, check each for things that must not be on GitHub (paths on this machine, keys, tokens, emails, personal notes), then move it to .agents/skills (committed, linked from .claude/skills) and update SKILLS.md. Also lists every skill. Use when the user says "publish a skill", "add <skill> to the repo", "commit my new skill", "list the skills", "/publish-skill [category]", or asks to update SKILLS.md.
metadata:
  category: skill
---

# publish-skill

**Every skill in this repo is public.** Nothing about a skill is hidden: its files live in
`.agents/skills/<name>/` (committed) and `.claude/skills/<name>` is a committed symlink to them,
so the skill loads for anyone who opens the repo in Claude Code and shows on GitHub. Apps and MCPs
are the gated ones (`private/` and the catalog releases at `/core/releases`); skills never go
through a gate.

`SKILLS.md` at the repo root lists every skill by category; the mediamake app shows it at
`/skills` (https://mediamake.microfox.app/skills, rebuilt on every deploy; locally
http://localhost:3002/skills reads the file live). `node tools/skills.mjs check` fails when
`SKILLS.md` is out of date or any skill holds a key, a token or a path on this machine. A Claude
Code hook runs it at session start and after a tool call that touches a skill, and CI runs it on
every pull request.

All of it goes through one script, run from the repo root:

```bash
node tools/skills.mjs list [--category=<c>] [--json]
node tools/skills.mjs add <name> --dry-run          # the checks only
node tools/skills.mjs add <name> | --all            # checks, moves, links, rewrites SKILLS.md
node tools/skills.mjs index                         # rewrites SKILLS.md
node tools/skills.mjs check                         # exit 1 when SKILLS.md is stale or a skill leaks
```

## 1. Find the new skills

`node tools/skills.mjs list --json` and keep the ones with `"moved": false`: real folders in
`.claude/skills/` (a skill just written there). Skip the question when there is one, or the
user named it; otherwise ask which to add (`AskUserQuestion`, `multiSelect: true`), one option
per skill with its one-line summary.

## 2. Check each one

`node tools/skills.mjs add <name> --dry-run`. It stops on **✖** and warns on **⚠**:

- ✖ a path on this machine (`/Users/…`), something that looks like an API key or token, or a
  frontmatter `name` that doesn't match the folder. Fix it in the skill first (a repo-relative
  path, an env var name instead of a value), then check again.
- ⚠ a `depends-on` naming a skill that isn't in the repo, an email address, or a file over 1 MB.

Also read the skill yourself before adding it (the repo is public on GitHub): prices, client
names, private plans, personal notes in its feedback log. Show the user anything that looks
private and let them reword it; never add a skill you haven't read.

## 3. Add

`node tools/skills.mjs add <name>` (or `--all`). Then show `git status --short` for
`.agents/skills/<name>`, `.claude/skills/<name>` and `SKILLS.md`, and ask before committing; push
only when asked. Once pushed, the files stay in git history.

## Naming and categories

The category comes from the name's verb (`metadata.category` in the frontmatter overrides it):

| prefix | category |
|--------|----------|
| `make-` | media making: videos only (`make-lyrics-video`, `make-video-music-remix`) |
| `create-` | images and artwork (`create-thumbnail`, `create-music-poster`) |
| `pack-` | kits and packs (`pack-brand-kit`) |
| `revise-` | review loops (`revise-video`) |
| `analyze-` | breaking media down |
| `write-` | text and metadata |
| `*-skill` | managing skills (`publish-skill`, `fork-skill`) |
| `remotion-` | Remotion reference |

A new category is one line in `CATEGORIES` in `tools/skills.mjs`.

**Dependencies are one-way.** A skill that needs another's output names it in its frontmatter,
`metadata: depends-on: <name>[, <name>]` (create-thumbnail depends on pack-brand-kit, which
makes the brand's thumbnail.json); the other skill doesn't mention it back. `list` shows
"(needs …)" and `add` warns when a dependency isn't in the repo. Variants (`<base>-like-<ref>`,
`<base>-v<N>`) come from the `fork-skill` skill.

## Feedback log

Append dated entries: what the user said → the rule.

- 2026-10-25 · "create a skill call it publish skill which will list out all the private skills still available of particular category and user can choose which skill to publish… public skills are committed and hence visible on github and also in the application" → this skill, `tools/skills.mjs`, public skills in `.agents/skills/` with committed symlinks (`.gitignore` ignores only real folders under `.claude/skills/`), `SKILLS.md` listing every skill.
- 2026-10-27 · "create-thumbnail has a dependency of pack-brand-kit, but not the pack-brand-kit for create-thumbnails" → dependencies are declared one-way in `metadata.depends-on`; the skill depended on doesn't name the one that uses it.
- 2026-10-27 · "from now on all skills are public by default. nothing hidden, but apps and mcps are hidden and go through gated releases" → every skill is committed in `.agents/skills` (no private skills, no `unpublish`); `publish` is now `add`, which moves a new `.claude/skills` folder in and links it; `check` fails on keys and machine paths in CI; catalog skill items are always public.
