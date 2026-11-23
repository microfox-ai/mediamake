# The guide for every skill

MediaMake's standard for any skill, whatever its kind. `mm-new-item` reads this before a skill is
written, then the guide for the skill's kind (`make.md`, `create.md`, `pack.md`…) when there is one.

**Kept by MediaMake's admins.** It changes only in a pull request, never in a session. Where this
guide and a generic skill-creator differ, this guide wins; where a kind's guide and this one differ,
the kind's guide wins.

## Where a skill lives

- A new skill starts in a space (`mm space new skill <name>`): the user's own, or a project's. Never
  in the MediaMake repo, never by hand in `.claude/skills`.
- Its name is `<verb>-<what it makes>`, lower-case words joined by hyphens. The verb is its kind
  (`make-`, `create-`, `pack-`, `revise-`, `analyze-`, `write-`, `cleanup-`; `use-<mcp or app>` for
  one that mostly uses an MCP or app).
- A style of an existing skill, or a version kept as it was, is a variant (`<base>-like-<ref>`,
  `<base>-v<N>`): `mm-fork-skill` makes it. It is not a new skill.

## Its files

| File | For | Holds |
|---|---|---|
| `SKILL.md` | Claude | The steps, the rules, the run sheet, the log |
| `README.md` | People | What it is and how to use it: its store listing. Never how it works |
| Files beside them | Claude, when a step needs them | Long reference material, scripts, small assets |
| `engine/` | Productions | The skill's own code, imported as `@mediamake/skills/<name>/…` |

- Code a skill needs travels in its own folder, so it runs on another computer and in the cloud.
- Large media never goes in the folder: the media library carries it.

## What its SKILL.md has

1. **Frontmatter.** `name` is the folder's name. `description` says what it does, the words people
   say that should start it ("Use when the user says …"), and what it is not for, naming the skill
   that is. `metadata.version` starts at 0.1.0: a fix raises the patch, something new the minor.
2. **What it needs from other skills**, one-way: `metadata: depends-on: <skill>[, <skill>]`. The
   skill that is depended on never names the one that uses it.
3. **`## First: check the MCPs`**, when it calls any MCP's tools: one table,
   `| MCP | Need | Used for | Without it |`, with what skipping each one costs.
4. **The steps**, numbered, in the order they run. What to ask comes first: the questions that cost
   a round when they are skipped.
5. **`## Where it runs`**, the run sheet: a row a step, saying what the step needs
   (`render`, `key:<name>`, `mcp:<id>`, `app:<name>`, `browser:<site>[/<account>]`, `media:library`,
   or `nothing`), whether it waits for a person's yes, whether it is safe to repeat, and what a
   place without the need does instead.
6. **`## Feedback log`**, with the block that sends new lessons to the user's notes
   (`mm notes add <name> "…"`). A session never edits a skill to record a lesson.

## Rules every skill holds to

- **General rules only.** True for the next job, on another computer. Never one run's details: a
  prompt that worked once, the fix for one picture, timings, seeds, file names, a computer's GPU,
  drives or paths. Turn a correction into the rule it teaches, or leave it out.
- **Taste for one production** goes in that production's `prefs.md`, not the skill.
- **Never a secret.** A need names a thing (`key:elevenlabs`), never the key. No password, token or
  path on one computer in any file.
- **Folders come from `mm workspace`.** `projects/…`, `out/…`, `brands/…` mean the workspace's
  folders. Never a path written by hand.
- **The library first.** Search the media library before downloading or generating anything.
  Downloads go to its inbox. Deliver to the user's folders only what they approved.
- **Ask before spending.** A step that costs money shows the price and waits for the user's yes.
  So does a step that sends something out or can't be undone. The run sheet says which steps wait.
- **Check before paying twice.** A result that was paid for once is looked up before it is made
  again.
- **Previous outputs stay.** A new round is a new version beside the last, never over it.

## Before it is shared

We publish nothing we don't use. A skill is used for a real production before it goes to the store,
and a test run or a demo is not one. Until then it stays in its space and works as it is.
