---
description: Makes a new skill, MCP or app the MediaMake way. It asks what it is first, starts it in your space, follows MediaMake's guide for that kind of skill, then writes it with the skill-creator your agent has.
tags: skills, mcps, apps, spaces, new
nature: shared-use
type: internal
---

# New item

Say what you want to make. It asks what kind of thing it is, starts it in your space, and writes it to
MediaMake's standard for that kind.

## How to use

1. Say to Claude: **make a skill** for what you want done (or "make an MCP", "make an app").
2. Answer its questions: what kind of skill it is (make videos, create designs, pack kits…), who it
   is for, and its type. For a subset, pick the skill it belongs to.
3. Read the skill it wrote. Nothing is sent anywhere until you ask.

## What it uses

- `mm space new`, from MediaMake: it starts the item in your space or a project's.
- The guides in its own `guides/` folder: MediaMake's standard for each kind of skill, kept by its
  admins.
- The generic skill-creator your agent has (Anthropic's `skill-creator`, or another): it writes the
  skill, under those guides. Without one, the guides alone are followed.
- [[mm-fork-skill]], [[mm-upload-item]], [[mm-submit-to-store]] and [[mm-publish-item]]: what comes
  after, when you want a variant, a README and a push, or the store.

## What the skill outputs

A new skill in your space, ready to use in your next session: `skills/<name>/SKILL.md` with its steps
and its run sheet, and a `README.md` whose frontmatter holds what you answered. For a subset:

```
nature: private-use
type: subset
superset: make-kinetictype
```
