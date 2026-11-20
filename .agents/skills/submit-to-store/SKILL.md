---
name: submit-to-store
description: Send a skill, MCP or app the user built to the MediaMake store for review — find it in their space or workspace, run the leak checks (keys, tokens, paths on this computer, emails, private notes), ask a member below Cohort for the finished production that was made with it (we publish nothing we don't use; Cohort members and admins need not name one), and submit it privately with `mm submit`; an admin then picks the membership that opens it (Public, Plus, Pro or Cohort) and approves, and it enters as Beta. An admin's own item is published directly, with no review (`--tier`). Accepted, it earns the user a membership for 3 months. Every store item has authors, like a git repo's collaborators: the first is its sender, and an author or an admin adds or removes others by email (`mm submit authors`); a Cohort author's updates are published directly. Use when the user says "make this public", "make my skill / MCP / app public", "submit this to the store", "list it in the store", "publish my skill" (when they are not a maintainer of the repo), "share this with everyone", "how do I get Plus / Pro", "what happened to my submission", "withdraw my submission", "add <someone> as an author / co-author of my skill", "who are the authors of <item>", "remove me as an author", or "/submit-to-store [name]".
metadata:
  category: other
  internal: 'true'
---

# submit-to-store

**We publish nothing we don't use.** A member below Cohort (Public, Plus, Pro) names the finished
production made with it: step 3 asks for it and stops without one. Cohort members and admins need not
name one, and an admin publishes directly, with no review (step 4).

A member's own skills, MCPs and apps live in their space (`mm space`) or, for a skill variant, in
their workspace. Those are private. This skill is how one becomes a store item:

1. It is **sent privately** to MediaMake with its proof. Nothing is on GitHub or in the store yet.
2. An **admin reviews** it on `/app/submissions`, picks the lowest membership that opens it
   (Public, Plus, Pro or Cohort) and approves, asks for changes or declines. The user is mailed.
3. A Public skill becomes a pull request on the public repo and is live when it merges. Everything
   else (a Plus, Pro or Cohort skill, and every MCP and app) goes to the private store repo and is
   released as a package. **Every item enters as Beta**; an admin marks it Ready later, with the
   production.
4. Accepting it **earns the user a membership for 3 months** (a Public or Plus item earns Plus, a
   Pro item Pro, unless the admin chooses otherwise). Contributing again renews it.

All of it goes through one command, from any folder:

```bash
mm submit <name>                    # the checks only (a dry run): what would be sent, what to fix
mm submit <name> --yes --made="<production>" [--made-url=<link>] [--note="<for the reviewers>"]
mm submit status                    # the user's submissions and where each stands
mm submit withdraw <id>             # takes one back before it is decided
mm submit authors <name> [--add=<email> | --remove=<email or name>] [--yes]   # its authors
```

Add `--json` to read the result as data, and `--kind=skill|mcp|app` when two items share a name.
Where there is no MediaMake repo (the Claude web or phone app), mm-use's `submit_item`,
`my_submissions` and `withdraw_submission` do the same: read the item's files and pass them in.

Maintainers who push to the public repo can still open a skill's pull request themselves with
`publish-skill`. Everyone else, and anything that is not a Public skill, comes through here.

## 1. Find the item

The user usually names it, or it is what the session just built. Otherwise `mm space` lists every
item in their spaces and `node tools/skills.mjs list --json` their workspace skills (`"own": true`);
ask which one. A skill that is already in the repo is public already: there is nothing to submit.

Something written in a project folder or in `.claude/skills` is not theirs yet: move it into their
space first (`mm space new <kind> <name>`, or `mm space add <skill>`; `use-mediamake-spaces` has
the rest). The space is made by itself when there is none.

## 2. Check it

`mm submit <name>` (without `--yes` it only checks). It stops on **✖** and warns on **⚠**:

- ✖ a path on this computer (`/Users/…`), something that looks like an API key or a token, a
  SKILL.md whose `name` is not the folder's, or more than 3 MB in all. Fix it in the item (a
  relative path, an env var's name instead of its value), then check again.
- ✖ a skill with no run sheet, or a row of it that can't be read: its `## Where it runs` table says
  what each step needs (`apps/mediamake/docs/cloud-device-runs.md`).
- ⚠ an email address.
- "left out": a file over 1 MB, a link, `.git`, `node_modules`, `.env` files. Builds and media
  never travel with an item; media goes through the media library, named under `media` in the
  item's `item.json`. An MCP is the exception for one file: a built `.mcpb` at the top of its
  folder, under 1 MB, is what lets it be released the moment it is approved. Without one an admin
  builds and releases it by hand, which takes longer.

Also read every file yourself before sending. An admin reads it next, and a Public item ends up on
GitHub for good: prices, client names, private plans, personal notes in a feedback log. Show the
user anything that looks private and let them reword it. Never send an item you haven't read.

An MCP or an app needs an `item.json` with a real `title`, `summary` and `version`
(`mm space new` writes a placeholder summary: replace it). A skill's come from its SKILL.md. A
skill that calls MCP tools needs its `## First: check the MCPs` table (`publish-skill` has the
format), and one that keeps a feedback log sends new lessons to `mm notes`, not into the file.
Its steps and its log hold general rules only: one run's details (a prompt that worked once, timings,
seeds, file names, this computer's GPU, drives or paths) come out, or become the rule they teach.

## 3. Ask what was made with it (members below Cohort)

`mm items` says the user's membership. **Cohort members and admins** need not name a production:
skip this step (or pass one with `--made` when they offer it).

**A member below Cohort** (Public, Plus, Pro) names it: ask which finished production was made with
it, its title, and its link when it is online (the YouTube video, the release, the post). Their
projects (`mm workspace` says where they are) and the skill's runs can suggest candidates, but the
user names it. Never make one up. A test render, a demo or "it will be used for…" is not a
production. With none, stop here and say so: the item stays theirs, works as before, and can be
submitted after its first real use. The server holds to it too: it refuses one without `--made`.

## 4. Send it

Say what will happen before this step: the files leave the computer for MediaMake's admins to
read, and nothing is public until one of them approves. Then:

```bash
mm submit <name> --yes [--made="<title>" [--made-url=<link>]] [--note="<anything the reviewers should know>"]
```

**An admin publishes directly**, with no review: say which membership opens it (the user's word:
Public, Plus, Pro or Cohort), then

```bash
mm submit <name> --yes --tier=<public|plus|pro|cohort>
```

It is released at that membership, in Beta, the moment it arrives, and the command prints its page.

**An update goes out directly** for admins and Cohort authors: a new version of an item already in the
store, sent by an admin or by a Cohort member who is one of its authors (below), is published at once at
the membership it already has. Any other author's update goes to review. Raise its version and run `mm submit <name> --yes` (no `--tier`, no review).
When something stops it (a leak check, a version already released), it waits on `/app/submissions`
and the command says why. A member who passes `--tier` is refused.

Not signed in: run `mm login` yourself and ask the user to click Allow in the tab it opens. Never
ask for an API key.

It says the upload got no answer in time: run `mm submit status` before anything else. It may have
arrived; when it is not listed, send it again (the same item sent again only replaces what was sent).

Tell the user it was sent, that nothing is public yet, that they are mailed when an admin decides,
and that `mm submit status` (or asking you) shows where it stands. Do not promise a tier or a
membership: the admin picks both.

## Afterwards

- **Changes asked for.** `mm submit status` shows what the admin wrote. Make the changes with the
  user, check again (step 2) and send again: the new files replace what was sent, with the same
  production unless that was the problem.
- **Accepted.** A Public skill has a pull request (its link is in the status); it is live when an
  admin merges it, and after the user's next `mm update` the repo's copy loads, so their own copy
  can go (`node tools/skills.mjs tidy --yes`). A packaged item is live at once at
  `https://mediamake.microfox.app/<skills|mcps|apps>/<name>`. Their membership is on
  `/app/subscription`.
- **A new version later.** Raise `version` (in `item.json`, or `metadata.version` in a SKILL.md)
  and submit again (a member below Cohort with a production made with the new version).
- **Declined or withdrawn.** The item stays theirs in their space and works as before.

## Authors

Every store item has authors, like the collaborators on a git repo. The sender of its first accepted
submission is the first. An author or an admin adds or removes others by their MediaMake account's
email; the item always keeps one author. Any author may send a new version (step 4); a Cohort author's
is published directly. Someone who is not an author cannot send a new version of an accepted item.

```bash
mm submit authors <name>                                   # who they are (its authors and admins see this)
mm submit authors <name> --add=<email>                     # a dry run: says what would change
mm submit authors <name> --add=<email> --yes               # adds them
mm submit authors <name> --remove="<email or the name listed>" --yes
```

The person needs a MediaMake account with that email (they sign in once first). Add `--kind=mcp|app`
when the item is not a skill and the user has no copy of it here. The item's page names each author by
GitHub login when their account has GitHub linked, else by display name, never by email.

## Rules

- Never submit without the user's yes in this conversation. A member below Cohort names the
  production; never name one for them.
- Never open a pull request on the public repo for a member's item from here: the admin's
  approval does that, after choosing its tier.
- Never put a key, a token or a private path in an item to make it work for others: name the env
  var or the setting, and say in the item how the person gets their own.
- What the admin wrote back is for the user. Don't copy it into the item's files.
- Add or remove an author only on the user's word, in this conversation, with the email they gave.
  Never put an author's email anywhere public (a commit, a pull request, a README).
