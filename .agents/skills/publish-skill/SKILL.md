---
name: publish-skill
description: Add new Claude Code skills to this repo, where every skill is public — find the user's own skills (variants from fork-skill and ones their team shared, kept in the workspace outside the repo) and folders made in .claude/skills, check each for things that must not be on GitHub (paths on this machine, keys, tokens, emails, personal notes), name the finished production made with it when there is one (maintainers and Cohort members need not), then send it as a pull request into .agents/skills (linked from .claude/skills) without touching the checkout. Also lists every skill. Use when the user says "publish a skill", "publish my variant", "add <skill> to the repo", "commit my new skill", "list the skills", "/publish-skill [category]", or asks to update the skills list.
metadata:
  category: skill
---

# publish-skill

**Every skill in this repo is public.** Nothing about a skill is hidden: its files live in
`.agents/skills/<name>/` (committed) and `.claude/skills/<name>` is a committed symlink to them,
so the skill loads for anyone who opens the repo in Claude Code and shows on GitHub. Apps and MCPs
are the gated ones (`private/` and the catalog releases at `/app/releases`); skills never go
through a gate.

**We publish nothing we don't use.** This is the maintainers' (admins') path, and they need not name a
production: step 3 asks for one, and the pull request carries it when there is one. A member below
Cohort goes through `submit-to-store`, which asks them for it.

A skill starts as the user's own when it isn't in the repo yet: a variant from `fork-skill`, or one
their team shared through `media sync`. Those live in the workspace (`~/MediaMake/skills/<name>`,
outside the repo) and are linked from `~/.claude/skills/<name>`, so every session on that computer
loads them and making one never changes a file git tracks. Publishing is how one becomes public:
a pull request, never an edit on main.

The mediamake app lists every skill by category at `/skills`
(https://mediamake.microfox.app/skills, rebuilt on every deploy) from `skills.json`, the registry.
That file is built, never committed: the app's `build` and `dev` scripts write it from
`.agents/skills` (`node tools/skills.mjs index`), so a new skill needs no index change in its PR.
`node tools/skills.mjs check` fails when any skill holds a key, a token or a path on this machine,
an MCP table it can't read, or a log that tells sessions to edit it; CI runs it on every pull
request.

All of it goes through one script, run from the repo root:

```bash
node tools/skills.mjs list [--category=<c>] [--json]
node tools/skills.mjs publish <name>                # the checks only (a dry run)
node tools/skills.mjs publish <name> --yes --made="<production>" [--made-url=<link>]
                                                    # a branch with it from origin/main, pushed, and a PR
node tools/skills.mjs tidy [--yes]                  # after the PR merged and you pulled: drops your copy
node tools/skills.mjs add <name> | --all            # on a branch you are on: moves or copies it in, links it
node tools/skills.mjs index                         # builds skills.json (the app's build does it)
node tools/skills.mjs check                         # exit 1 when a skill leaks or breaks a rule
```

## 1. Find the new skills

`node tools/skills.mjs list --json` and keep the ones with `"own": true` (the user's, in the
workspace; `list` marks them ◆) and those with `"moved": false` (real folders in `.claude/skills/`,
a skill just written there; `node tools/skills.mjs tidy --yes` makes those the user's too). Skip
the question when there is one, or the user named it; otherwise ask which to publish
(`AskUserQuestion`, `multiSelect: true`), one option per skill with its one-line summary.

## 2. Check each one

`node tools/skills.mjs publish <name>` (without `--yes` it only checks). It stops on **✖** and warns on **⚠**:

- ✖ a path on this machine (`/Users/…`), something that looks like an API key or token, or a
  frontmatter `name` that doesn't match the folder. Fix it in the skill first (a repo-relative
  path, an env var name instead of a value), then check again.
- ✖ an MCP table it can't read (see "MCPs it works with" below).
- ✖ no run sheet, or a row of it that can't be read: every skill has a `## Where it runs` table
  (`| Step | Needs | A person's yes | Safe to repeat | Without it |`) saying what each step needs,
  so a cloud session knows what it can run (`apps/mediamake/docs/cloud-device-runs.md`).
- ⚠ a `depends-on` naming a skill that isn't in the repo, an MCP that isn't ours or listed in
  `apps/mediamake/lib/catalog/third-party.json`, an email address, or a file over 1 MB.

Also read the skill yourself before adding it (the repo is public on GitHub): prices, client
names, private plans, personal notes in its feedback log. Show the user anything that looks
private and let them reword it; never add a skill you haven't read.

**MCPs it works with.** When the skill calls any MCP's tools (ElevenLabs, Browse Hack, fal,
Blender…), it needs a `## First: check the MCPs` section near the top with one table, which the
skill reads when it runs and MediaMake offers when someone installs it (each MCP as a choice,
with what skipping it costs):

```markdown
| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/elevenlabs-connector` | required | Sound effects for intros and end screens (`creative_generate_in_flow`, `node_type: sfx`) | `mcp/elevenlabs` instead, when it is installed; with neither, no sound at all |
| `mcp/elevenlabs` | optional | The fallback for when the hosted connector can't be connected or reached | Nothing, while the connector is connected |
```

`required` only when the skill's main job can't be done without it; an archived MCP is never
`required`: list what replaced it as required and the archived one as `optional`, the fallback; `recommended` when it works
without, worse or slower; `optional` for extras. Name the tools in "Used for" and be concrete in
"Without it": that line is what the person reads when deciding to skip it. Under the table, tell
Claude to look for those tools (load deferred ones with ToolSearch), say before starting what a
missing one costs, and offer its MediaMake install prompt ("Set up mcp/<name> from MediaMake by
following https://github.com/microfox-ai/mediamake/blob/main/install.md"), as `pack-brand-kit`
does. An MCP that isn't ours goes in `third-party.json` first (who makes it, and how it installs).

**Lessons go in notes, not the skill.** A skill that keeps a `## Feedback log` (or `## Lessons log`)
says in it where new lessons go, so sessions never edit the committed file: the block every skill
uses (copy one from `pack-brand-kit`), with `mm notes add <name> "…"` and `mm notes <name>`.
`add` and `check` fail on a log without it, or on an old "append to the log at the bottom" rule.
What the skill and its log say are general rules: one run's details (a prompt that worked once, the
fix for one picture, timings, seeds, file names, a computer's GPU, drives or paths) come out, or
become the rule they teach.

## 3. Ask what was made with it

Ask the user whether a finished production was made with it (its title, and its link when it is
online: the YouTube video, the release, the post). The user's projects (`mm workspace` says where
they are) and the skill's runs in the Library can suggest candidates, but the user names it: never
make one up, and a test render, a demo or "it will be used for…" is not one. A maintainer (an admin)
or a Cohort member may publish without one: leave `--made` out and the pull request says none was
named.

## 4. Publish

Ask before this step: once pushed, the files are on GitHub and stay in its history.
`node tools/skills.mjs publish <name> --yes [--made="<title>" [--made-url=<link>]]` makes a branch `skill/<name>-<time>` from `origin/main`
in a temporary worktree, with the skill in `.agents/skills/<name>` linked from `.claude/skills`, one
commit, pushed, and a pull request (with `gh` signed in; otherwise it prints the link that opens
one) whose "Made with this" section names the production, or says none was named. The user's checkout, branch and edits are never
touched, so it is safe on main. `--no-push` keeps the commit on a local branch instead.

Give the user the PR link, and once it merges the skill's release page,
`https://mediamake.microfox.app/app/releases/skill/<name>`. The skill enters as Beta; an admin
marks it Ready, with that same production when there is one (`catalog_set_readiness`, or
`npm run catalog -- ready skill/<name> --proof "<title>" --url <link>`), and its page
(`/skills/<name>`) then shows it under "Made with this". Their own copy keeps loading until they
pull the merge; then `node tools/skills.mjs tidy --yes` drops it (only when the repo's files are the
same; a copy that differs is kept, and `list` warns that it shadows the repo's).

`add` is the older way, for a branch you are already on: it moves a `.claude/skills` folder (or
copies one of the user's) into `.agents/skills` and links it, and you commit it. The rule is the
same: name the production in that pull request's "Made with this" section when there is one.

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
| `update-` | keeping what MediaMake installed up to date (`update-mediamake-items`) |
| `*-skill` | managing skills (`publish-skill`, `fork-skill`) |
| `remotion-` | Remotion reference |

A new category is one line in `CATEGORIES` in `tools/skills.mjs`.

**Dependencies are one-way.** A skill that needs another's output names it in its frontmatter,
`metadata: depends-on: <name>[, <name>]` (create-thumbnail depends on pack-brand-kit, which
makes the brand's thumbnail.json); the other skill doesn't mention it back. `list` shows
"(needs …)" and `add` warns when a dependency isn't in the repo. Variants (`<base>-like-<ref>`,
`<base>-v<N>`) come from the `fork-skill` skill.

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add publish-skill "<what the user said> → <the rule>"   # a new lesson, dated for you
mm notes publish-skill                                           # your notes for this skill
```

When the user wants them shared, `mm notes promote publish-skill` offers them to this log as a pull request.

- 2026-10-25 · "create a skill call it publish skill which will list out all the private skills still available of particular category and user can choose which skill to publish… public skills are committed and hence visible on github and also in the application" → this skill, `tools/skills.mjs`, public skills in `.agents/skills/` with committed symlinks (`.gitignore` ignores only real folders under `.claude/skills/`), `SKILLS.md` listing every skill.
- 2026-10-27 · "create-thumbnail has a dependency of pack-brand-kit, but not the pack-brand-kit for create-thumbnails" → dependencies are declared one-way in `metadata.depends-on`; the skill depended on doesn't name the one that uses it.
- 2026-10-27 · "from now on all skills are public by default. nothing hidden, but apps and mcps are hidden and go through gated releases" → every skill is committed in `.agents/skills` (no private skills, no `unpublish`); `publish` is now `add`, which moves a new `.claude/skills` folder in and links it; `check` fails on keys and machine paths in CI; catalog skill items are always public.
