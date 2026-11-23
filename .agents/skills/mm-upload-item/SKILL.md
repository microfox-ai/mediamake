---
name: mm-upload-item
description: Get one of the user's own items (a skill, an MCP or an app) ready and send it where it should go, in one pass. It collects the item's details from the user (for a skill who it is for, its type and its superset when it is a subset; for an MCP or an app its title, summary and what it needs; for all of them tags, description, picture, video), writes or fixes its README.md to the MediaMake README guide (a shared-use skill's ends with "What the skill outputs"), bumps its version, checks it, and runs the push (mm space sync to the user's space, mm space share or link for a project, mm submit for the store). Use when the user says "upload this skill / MCP / app", "upload <item>", "push my skill", "send <item> to my space / the project / the store", "write the README for <item> and push it", "release <item>", "/mm-upload-item <name>" or the old "/upload-skill <name>". Not for making a new item (mm-new-item) or an admin's direct release (mm-publish-item).
metadata:
  category: mm
  version: 0.2.0
---

# mm-upload-item

One of the user's items goes up: its details filled in, its README written, then pushed. It works the
same for a skill, an MCP and an app; where they differ, each step says so. What the item does (a
skill's SKILL.md, an MCP's or an app's code) is not this skill's job: only what its page shows and
where it goes.

The rules it follows are MediaMake's: `apps/mediamake/docs/item-readme.md` (the README guide, read it
first when it is on this computer) and the framework's CLAUDE.md. Nothing is sent until the user has
seen the dry run and said yes.

## 1. Find the item and where it goes

1. `mm space status`: the user's spaces and what is in each. The item is in `skills/<name>/`,
   `mcps/<name>/` or `apps/<name>/` of a space (the user's own, or a project's), or `linked/<name>`.
   A skill that is only in the workspace (the workspace's `skills/<name>`, in no space) goes in with
   `mm space add <name>` first.
2. Ask where it should go, when they haven't said. One answer:
   - **My space**: only theirs, on every computer of theirs.
   - **A project**: `share` moves it into the project's space; `link` keeps it theirs and gives the
     project's people a copy. Ask which when they only say "share".
   - **The store**: for everyone, after an admin's review.
3. A skill in MediaMake's own repo (`.agents/skills`) is not uploaded with this: it changes in a pull
   request there.

## 2. Collect its details

Read what the item already says first (a skill's SKILL.md and README.md; an MCP's or an app's
`item.json` and README.md), and ask only for what is missing. Never guess one of these: ask.

**Every item**, in its README.md's frontmatter:

| Detail | Ask | Goes in |
|---|---|---|
| Tags | Words people look for it by, 12 at most | `tags:` with commas between |
| Description | What it is, for people, in a line or two (300 characters) | `description:` |
| Headshot | A 16:9 picture of it: a file in its folder, or an https link. None: leave it out | `headshot:` |
| Video | Its intro on YouTube. Never make one up | Alone on the README's first line |
| Production | For the store, or a shared-use skill: the finished production made with it (title, and link when it is online). A test render or a demo is not one | `--made=` at the push, never in the README |

**A skill**, also in its README.md's frontmatter:

| Detail | Ask | Goes in |
|---|---|---|
| Nature | "Is it for you or your team (private use), or for other people (shared use)?" The store always means shared use | `nature: private-use` or `shared-use` |
| Type | "Is it internal (other skills run it), a superset (the main skill of a family), a subset (one style or part of another skill), or MCP use (mostly uses one MCP or app)?" None fits: leave it out | `type:` |
| Superset | Only for a subset: "Which skill is it a style or a part of?" Have them pick from the skills that exist (`node tools/skills.mjs list`, `mm space`). Every subset has one (make-kinetictype-like-screamingtowin is a subset of make-kinetictype) | `superset: <that skill's name>` |

**An MCP or an app**, in its `item.json`:

| Detail | Ask | Goes in |
|---|---|---|
| Title | Its name as people say it | `title` |
| Summary | What it does, in one line. The one `mm space new` wrote is a placeholder: replace it | `summary` |
| What it needs | The keys, apps or sign-ins it can't run without, in the run sheets' words (`key:<name>`, never the key itself) | `needs` |
| Media | Library files it uses, by their library id | `media` |

A shared-use skill with no production stops here: tell the user it stays private until something real
is made with it, and offer to upload it as private use instead. The same holds for any item a member
below Cohort sends to the store.

## 3. Write the README

`README.md` in the item's folder. It introduces the item to people: never how it works. Keep what the
user already wrote and fill in what is missing.

For a **shared-use skill**, and for **any item going to the store**, every part, in this order:

1. The video link alone on the first line (when there is one).
2. `# Title`.
3. What it is, in a line or two.
4. `## How to use`: the few steps a person takes, and what to say to Claude. For an MCP or an app,
   also how it is run or installed on a new computer.
5. `## What it uses`, when it depends on anything: the skills it runs and the MCPs and apps it works
   with, one line each, saying the part each plays and what happens without it. A skill's come from
   its `depends-on` and its MCP table.
6. An outputs section, always last (`## What the skill outputs` for a skill): what you end up with
   and where it lands, with an example (a picture in the folder, a video or a link). Use a real
   output: ask the user for one when the folder has none.

For a **private-use** item the README can be loose: the title, what it is and how to use it are
enough, and it needs no production.

Never a badge, a rating, a made-up video or a made-up picture. Pictures stay small (2 MB each at most)
and in the item's folder; large media goes through the media library.

Show the user the README and the details before going on, and change what they ask.

## 4. Bump the version and check

1. A change to the item since it last went up: raise its version (a fix a patch, something new a
   minor). A skill's is `metadata.version` in its SKILL.md; an MCP's or an app's is `version` in its
   `item.json`. Only the README or its details changed: leave it.
2. **A skill:** its run sheet (`## Where it runs` in its SKILL.md) is there and true. Missing: write
   it with the user, a row a step. `mm space status` reads it: fix any row it can't read.
3. **A skill:** everything it learned is a general rule, true for the next job on another computer.
   One run's details (the prompt that worked once, the fix for one picture, timings, seeds, file
   names, this computer's GPU, drives or paths) come out, or become the rule they teach: they stay
   in that job's folder or its `prefs.md`.
4. **An MCP going to the store:** a built `.mcpb` at the top of its folder, under 1 MB, lets it be
   released the moment it is approved. Without one an admin builds it by hand, which takes longer.
5. For the store, `mm submit <name>` (no `--yes`; `--kind=mcp|app` when two items share a name): it
   checks for keys, tokens and paths on this computer. Fix what it lists.

## 5. Push

Every push is a dry run first. Show what it prints and run the `--yes` line only once the user agrees.

| Where | Dry run | Then |
|---|---|---|
| Their space | `mm space sync` | `mm space sync --yes` |
| Into a project | `mm space share <name> --project=<project>` | the same with `--yes` |
| To a project, kept theirs | `mm space link <name> --project=<project>` | the same with `--yes` |
| The store | `mm submit <name>` | `mm submit <name> --yes --made="<the production>"` |

The store's rules, who names a production and what happens after are `mm-submit-to-store`'s. An admin
who wants it released with no review uses `mm-publish-item`.

No GitHub sign-in: `gh auth login` is the user's step. Not signed in to MediaMake: run `mm login` and
ask them to click Allow. When a push names people who could not be invited, tell the user who.

## 6. Say where it is

Give the user its page: the item in their space or the project's space at
`https://mediamake.microfox.app/app/spaces` (its card opens its page, with the README, its files and,
for a skill, Edit details), and for the store that it waits for an admin on Submissions. Say which
details were set and which they left open.

## Where it runs

What each step needs, so it runs in the cloud or on a device (the words: render, key:<name>, mcp:<id>,
app:<name>, browser:<site>[/<account>], media:library; `nothing` for none). The space's page reads the
keys from here. A cell holds only those words, or yes or no: notes go under the table. "Without it" is
what a place that lacks the need does instead, or "a to-do …" when the step has to wait for one that has it.

| Step | Needs | A person's yes | Safe to repeat | Without it |
|---|---|---|---|---|
| 1. Find the item and where it goes | nothing | no | yes | - |
| 2. Collect its details | nothing | no | yes | - |
| 3. Write the README | nothing | no | yes | - |
| 4. Bump the version and check | nothing | no | yes | - |
| 5. Push | nothing | yes | yes | - |
| 6. Say where it is | nothing | no | yes | - |

The push needs the computer's own GitHub and MediaMake sign-ins, which the run sheet's words don't name.
