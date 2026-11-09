---
name: fork-skill
description: Make a variant of one of this repo's skills as it improves or changes — a copy named <base>-like-<ref> that captures one finished project's style (e.g. make-video-music-remix-like-f1xhitit), or <base>-v<N> that keeps an older version as it was before a big change — with its differences written down, a description that only triggers when asked for, and its lineage in the frontmatter. Use when the user says "make a variant of <skill>", "save this style as a skill", "fork <skill>", "keep the old version of <skill>", "a skill like <project>", or "/fork-skill <base> <ref>".
metadata:
  category: skill
---

# fork-skill

A skill keeps improving with every project, and sometimes a project's style is worth keeping on
its own (the F1 × Hit It edit), or an old behaviour is worth keeping before the base changes. A
**variant** is a full copy of the base skill plus a section saying what it does differently.

- `<base>-like-<ref>`: the base, steered toward one finished project's look
  (`make-video-music-remix-like-f1xhitit`). `<ref>` is the project slug or a short name for it.
- `<base>-v<N>`: the base frozen as it is now, before a change the user may want to undo.

A new variant starts as **yours**: it lives in your workspace (`~/MediaMake/skills/<name>`, outside
the repo) and is linked from `~/.claude/skills/<name>`, so every session on this computer loads it
and no file git tracks changes. When the user is happy with it, it goes public like every skill,
as a pull request (step 6, and `publish-skill`).

## Steps

1. **Base and reference.** Which skill, and what the variant keeps: a project (read its
   `prefs.md`, its storyboard, its cut list, the base skill's lessons log entries for it and your notes
   for the base, `mm notes <base>`) or a
   version (note what is about to change in the base).
2. **Copy:** `node tools/skills.mjs fork <base> <base>-like-<ref>` (or `<base>-v<N>`). It copies the
   folder to `<workspace>/skills/<name>/` and links it from `~/.claude/skills/<name>`, sets `name`,
   adds `metadata: variant-of: <base>`, `forked: <date>` and `forked-from: <base>@<commit>`, and puts
   a variant note and an empty **This variant** section under the title. It loads in sessions started
   from now on (not this one: read its SKILL.md to work with it here). `--repo` makes it in this
   checkout's `.agents/skills` instead, linked and listed in `SKILLS.md`, for a branch and a PR you
   make yourself. The variant's log points at its own notes (`mm notes add <variant>`);
   `mm notes <variant>` shows those and the base's, so general lessons logged for the base still reach it.
3. **Write "This variant"**: the rules that make the look, concrete and checkable (pacing per
   section, transitions, type, sound, colour, what the user praised and rejected), each with where
   it came from. Then edit the body only where the variant really differs; the rest stays the base
   as of today.
4. **Description**: replace the `<what is different>` placeholder with one sentence. Keep the
   trigger narrow ("Use only when the user names this variant or asks for the <ref> style;
   otherwise <base>"), so the base stays the default and the two never compete.
5. Show the user the new "This variant" section and the description; adjust on their notes.
6. **Publish** once the user is happy with it: `node tools/skills.mjs publish <name>` runs the
   checks (a dry run), and with `--yes` sends it as a pull request from a temporary worktree (this
   checkout is never touched), in `.agents/skills`, linked and listed in `SKILLS.md` and
   `skills.json`. Give the user the PR link, and once it merges the variant's release page,
   `https://mediamake.microfox.app/core/releases/skill/<name>`. Their copy keeps loading until they
   pull the merge; then `node tools/skills.mjs tidy --yes` drops it. Read it for anything private
   first, as `publish-skill` says. Until then, a channel's team gets it with `media sync` (see the
   library README).

## Keeping variants alive

Improvements to the base don't flow into a variant. When the base gets a general fix (a bug, a
tool, a render step), offer to port it to its variants (`node tools/skills.mjs list` shows them
under their base, ◆ for yours; `node tools/skills.mjs diff <variant>` shows what the base changed
since the fork). Port into your own copy directly; a published variant changes on a branch and a
PR. Style changes stay where they were made.

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add fork-skill "<what the user said> → <the rule>"   # a new lesson, dated for you
mm notes fork-skill                                           # your notes for this skill
```

When the user wants them shared, `mm notes promote fork-skill` offers them to this log as a pull request.

- 2026-10-25 · "provide support to create variants of skills as they improve or change, so something like make-video-music-remix-like-f1xhitit" → this skill and `node tools/skills.mjs fork`; variants are `<base>-like-<ref>` or `<base>-v<N>` with `metadata.variant-of`.
