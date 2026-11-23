---
name: mm-new-item
description: Make a new MediaMake item from nothing (a skill, an MCP or an app) the MediaMake way. It first asks what it is — for a skill its kind (make videos, create designs, pack kits and so on), who it is for, its type (internal, superset, subset or MCP use) and, for a subset, its superset, picked from the skills that exist — then starts it in the user's space or a project's with `mm space new`, reads the guide for its kind (MediaMake's standard for that kind of skill, kept by its admins in this skill's guides/ folder), and only then writes it the way the generic skill-creator on this agent says, with MediaMake's steps and the kind's guide winning wherever they differ. Use when the user says "make a skill", "new skill", "create a skill for …", "turn this into a skill", "make an MCP / an app for my space", "start a new item", "/mm-new-item", or asks how skills are made in MediaMake. Not for a style or a kept version of an existing skill (mm-fork-skill), an item's README and its push (mm-upload-item), or the store (mm-submit-to-store, mm-publish-item). New user feedback goes in your notes (mm notes add), never in this file.
metadata:
  category: mm
  version: 0.1.0
---

# mm-new-item

Every MediaMake item is made in the same order, and the order is the point:

1. **Say what it is.** The answers decide its name, its folder and which guide applies.
2. **MediaMake's steps.** `mm space new` starts it where it belongs, with its run sheet and README.
3. **The guide for its kind.** MediaMake's standard for that kind of skill, kept by its admins.
4. **The generic skill-creator.** It knows how to write a good skill, and nothing about MediaMake.
5. **Finish and check.** Then stop: sending it anywhere is another skill, on the user's word.

This skill is one of five that look after items, all named `mm-…`:

| Skill | What it does |
|---|---|
| `mm-new-item` | Makes a new skill, MCP or app (this one) |
| `mm-fork-skill` | Makes a variant of a skill: one project's style, or a version kept as it was |
| `mm-upload-item` | Writes an item's README and details, and pushes it to a space, a project or the store |
| `mm-submit-to-store` | Sends an item to the store for an admin's review |
| `mm-publish-item` | The admins' direct path: a public skill's pull request, or a release with no review |

## Before anything

1. Read the user's notes: `mm notes mm-new-item`.
2. `mm space` shows their spaces and every item in them. "No space on this computer yet" is fine:
   step 2 makes it. A missing GitHub sign-in (`gh auth login`) is the only step that is the user's.
3. An item of the user's own is never made in the MediaMake repo, and never by hand in
   `.claude/skills`: it starts in a space. One that should be public gets there later, through
   `mm-submit-to-store` or `mm-publish-item`.

## 1. Ask what it is

Ask before anything is made. Put the questions together, as choices (the agent's question tool when it
has one), and skip the ones the user already answered. **Never guess one of these.**

**Which item.** A skill (steps Claude follows), an MCP (tools Claude calls) or an app (something a
person opens). It is usually plain from what they asked. An MCP or an app: go to "An MCP or an app"
below. The rest of this section is for a skill.

**Its kind: what it makes.** The kind is the verb its name starts with, and it picks the guide.

| Kind | Name starts with | For | Its guide |
|---|---|---|---|
| make | `make-` | Media making: videos and audio | `guides/make.md` |
| create | `create-` | Images and artwork: designs, posters, thumbnails | `guides/create.md` |
| pack | `pack-` | Kits and packs that bundle several outputs | `guides/pack.md` |
| revise | `revise-` | Review loops with the user | the general guide only |
| analyze | `analyze-` | Breaking media down for later edits | the general guide only |
| write | `write-` | Text: titles, descriptions, metadata | the general guide only |
| cleanup | `cleanup-` | Housekeeping: disk space, archives, backups | the general guide only |
| other | any other verb | Everything else (`use-<mcp or app>` for one that mostly uses an MCP or app) | the general guide only |

The kinds are `CATEGORIES` in `tools/skills.mjs` (`node tools/skills.mjs list` shows each with its
skills), and the `guides/` folder says which have a guide: list it, since admins add to it. When
nothing fits, ask what the skill's one deliverable is and pick the nearest kind with the user;
`other` is the last choice.

**Its name.** `<the kind's prefix><what it makes>`, lower-case words joined by hyphens, 2 to 5 words
a person would say (`make-lyrics-video`, `pack-youtube`). Check it is free: `node tools/skills.mjs
list` and `mm space`.

**Who it is for (its nature).**

| Nature | Means |
|---|---|
| `private-use` | For the user or their team. A loose README is fine, and it needs no production to prove it. The usual start |
| `shared-use` | For other people, so it can be listed in the store. It needs the full README, and a finished production made with it before it is published |

**Its type: how it sits among other skills.**

| Type | Means |
|---|---|
| `internal` | Other skills run it as a step, or it looks after the computer. People rarely start it themselves |
| `superset` | The main skill of a family, much like a plugin: its subset skills are narrower takes on it |
| `subset` | One style or one part of a superset skill. Every subset names its superset |
| `mcp-use` | Mostly uses one MCP or app, and says how to use it well |
| none | None of these fits: leave it out |

**A subset's superset.** When they choose subset, ask which skill it is a style or a part of, and
have them pick from the skills that exist:

1. List them: `node tools/skills.mjs list --json` (the repo's skills and the user's own) and `mm space`
   (the ones in their spaces). Without the repo, mm-use's explore tools list the store's.
2. Offer the likeliest few as choices (the same kind, a name the new one starts with), with any other
   skill still open to them.
3. The superset must exist. One that doesn't yet is made first, with this skill, as a `superset`.
4. When what they want is an existing skill in another style, or frozen as it is today, that is a
   copy of it: `mm-fork-skill`, not a new skill.

**Where it lives.** Their own space (only theirs), or a project's (everyone on the project gets it):
ask when they are on projects and haven't said.

## 2. Start it

```bash
mm space new skill <name> --nature=<private-use|shared-use> [--type=<internal|superset|subset|mcp-use>] [--superset=<skill>] [--project=<project>]
```

It makes the space when there is none, then `skills/<name>/` with a SKILL.md that already has its run
sheet (`## Where it runs`) and a README.md with those answers in its frontmatter. `--type=subset`
stops without `--superset`. It loads in sessions started from now on, not this one: work on its files
directly here.

## 3. Read the guides for its kind

In this skill's folder: **`guides/general.md` first** (every skill), **then `guides/<kind>.md`** when
the kind has one. Read them whole, every time: they change.

- They are MediaMake's standard for that kind of skill. What a guide says, the new skill does.
- They are kept by MediaMake's admins and change only in a pull request. Never edit one in a
  session. Something the user says that belongs in a guide goes in the notes (`mm notes add
  mm-new-item "…"`); `mm notes promote mm-new-item` offers it to the admins.
- A kind with no guide follows the general one alone. Say so to the user, once.

## 4. Write it with the generic skill-creator

Now, and not before, use the generic skill-creator this agent has. Look through the skills the
session lists: Anthropic's is `skill-creator` (it may show with a prefix, as
`anthropic-skills:skill-creator` does). Any other skill whose job is to create or improve skills
counts; with several, take Anthropic's. Start it, tell it the skill already exists at the folder from
step 2 and is to be written there, and follow it for what it is good at:

- drawing out what the skill should do and when it should start
- the description: what it does, the words people will say, and what it is not for
- a short SKILL.md, with long reference material and scripts in files beside it
- trying the draft on real prompts and improving it

Wherever it and MediaMake differ, MediaMake's steps and the kind's guide win:

| The generic skill-creator wants | Here |
|---|---|
| To make the skill's folder, or pick where it goes | The folder from step 2. Never a new one, never in the repo |
| To choose or change the name | The name from step 1 |
| Its own frontmatter | Keep `name` and `metadata.version`. Nature, type and superset stay in README.md |
| To package it (a `.skill` file, a zip) or install it | Nothing: `mm space sync` and `mm-upload-item` move it |
| To write what it learned into the skill | General rules only. A user's lesson goes in `mm notes add <skill>` |
| To prove it with test runs | Test it, but a test run is never the production that proves a skill |
| A test that costs money (a render farm, a paid model) | Show the price and ask first |

No generic skill-creator on this agent: say so, and write the skill from the guides alone
(`guides/general.md` has what a SKILL.md needs).

## 5. Finish and check

1. **The run sheet is true**: a row a step, each saying what it needs
   (`apps/mediamake/docs/cloud-device-runs.md` has the words).
2. **The MCP table**, when it calls any MCP's tools: `## First: check the MCPs`
   (`mm-publish-item` has the format).
3. **What it needs from other skills** is in its frontmatter: `metadata: depends-on: <skill>[, <skill>]`.
4. **Its log sends lessons to notes**: a `## Feedback log` with the `mm notes add <name>` block every
   skill uses (copy one from this skill).
5. **General rules only**: nothing from one run (a prompt that worked once, timings, seeds, file names,
   this computer's GPU, drives or paths).
6. **Its README.md** says what it is, for people: `apps/mediamake/docs/item-readme.md`. A private-use
   skill's can be loose. `mm-upload-item` writes the full one when it is sent.
7. `mm space status` reads the run sheet: fix any row it can't read.

Then show the user the SKILL.md and stop. Nothing has left this computer. Sending it is theirs to ask
for: `mm space sync` shows what would go to their other computers, `mm-upload-item` gets it ready for
a project or the store.

## An MCP or an app

```bash
mm space new <mcp|app> <name> [--project=<project>]
```

It makes `mcps/<name>/` or `apps/<name>/` with an `item.json` and a README.md.

1. Ask what it is for and who uses it, then where it lives (their space or a project's).
2. Write its code in that folder, with anything it needs beside it. When this agent has a skill for
   building that kind of thing (an MCP builder, say), use it there, as step 4 does for a skill.
3. Fill its `item.json`: a real `title`, `summary` and `version` (the summary it starts with is a
   placeholder), `needs` in the run sheets' words (`key:<name>`, never the key), and `media` for any
   library files it uses.
4. Its README.md says what it is and how to run or install it on a new computer.
5. Large media never goes in the folder: the media library carries it. Never a key, a token or a
   path on this computer in any file.
6. Never add an MCP to a `.mcp.json` in the repo: an MCP is added on each computer.

A kind's guide for these is `guides/mcp.md` or `guides/app.md` when the folder has one.

## Where it runs

What each step needs, so it runs in the cloud or on a device (the words: render, key:<name>, mcp:<id>,
app:<name>, browser:<site>[/<account>], media:library; `nothing` for none). A cell holds only those
words, or yes or no: notes go under the table. "Without it" is what a place that lacks the need does
instead, or "a to-do …" when the step has to wait for one that has it.

| Step | Needs | A person's yes | Safe to repeat | Without it |
|---|---|---|---|---|
| 1. Ask what it is | nothing | no | yes | - |
| 2. Start it | nothing | no | yes | - |
| 3. Read the guides for its kind | nothing | no | yes | - |
| 4. Write it with the generic skill-creator | nothing | no | yes | - |
| 5. Finish and check | nothing | no | yes | - |

Making a space needs the computer's own GitHub sign-in, which the run sheet's words don't name.

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add mm-new-item "<what the user said> → <the rule>"   # a new lesson, dated for you
mm notes mm-new-item                                           # your notes for this skill
```

When the user wants them shared, `mm notes promote mm-new-item` offers them to this log as a pull request.

- 2026-11-21 · "when a skill gets created, it should also ask if it is superset / internal / subset… if subset is chosen, then ask for a superset skill to be picked" → step 1 asks the type with the kind and the nature, and a subset picks its superset from the skills that exist; `mm space new skill` takes `--type` and `--superset`.
- 2026-11-21 · "after the MediaMake related steps, follow the guidelines of Anthropic's generic skill-creator (or any other generic skill-creator available to that agent)" → step 4 comes after `mm space new` and the guides, and uses whichever generic skill-creator the agent has.
- 2026-11-21 · "a few guidelines will be set for different kinds of skill… continuously updated by admins, it lives in the repo itself and is very important in creating skills" → `guides/`, one file a kind, changed only by pull request; a guide wins over the generic skill-creator.
