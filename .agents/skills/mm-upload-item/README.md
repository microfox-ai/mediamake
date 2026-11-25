---
description: Gets one of your skills, MCPs or apps ready and sends it up. It asks for the details, writes the README, checks it and runs the push to your space, a project or the store.
tags: skills, mcps, apps, readme, spaces, store, upload
nature: shared-use
type: internal
---

# Upload item

Say which item, and where it should go. It asks you what its page needs to say, writes the README,
and pushes it once you have seen what would go up.

## How to use

1. Say to Claude: **upload** the item's name (add "to my space", "to the <project> project" or "to
   the store").
2. Answer its questions. For a skill: who it is for, its type, its tags, and for a subset which
   skill it belongs to. For an MCP or an app: its title, what it does in one line, and what it needs.
3. Read the README it wrote and say yes to the push.

## What it uses

- `mm space` and `mm submit`, from MediaMake: they do the push.
- [[use-mediamake-spaces]]: the same commands, for everything else about spaces.
- [[mm-submit-to-store]]: the store's rules, when the item goes there.
- [[mcp/projectsync|MediaMake Spaces]] (optional): uploads a README's larger footage, such as a video
  of the outputs, to a project's media and gives the link the README plays. Without it, a video is its
  YouTube link or pictures.

## What the skill outputs

The item's `README.md` with its details in the frontmatter, and the item pushed where you asked.
For example, a subset skill's frontmatter ends up like this:

```
nature: shared-use
type: subset
superset: make-kinetictype
tags: kinetic type, shorts
```
