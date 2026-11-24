---
name: research-character
description: Research characters from any story — a film, a TV series, a book, a game, a comic, a play, a myth, or one character by name — and save a report on each (who they are, attitude, style, personality, famous quotes, backstory, famous scenes and why fans love them, with its sources). By default Google's AI Mode answers, asked in the user's Chrome through Browse Hack; without Browse Hack, Google's AI Mode read in a browser Claude drives, and without that, Claude's own web research (web search, deep research). The input can be vague (one character, a work, several works, a list, "what famous ones are we missing"): it works out the cast first — the lead, the allies, the villains, the fan favourites — and skips who is already researched. Then it checks every answer, asks again the ones that came back cut off and puts back the names Google's links drop. Use when the user says "research <character>", "research the characters of <film / series / book / game>", "character reports / profiles / summaries for …", "who are the main characters of … — write them up", "do the same for <work>", "which famous <works> did we miss", "/research-character …". Not for news or topic research, for writing from the reports (lyrics, scripts: the skills that make those), or for a private person. New user feedback goes in your notes (mm notes add research-character), never in this file.
metadata:
  version: 0.1.0
---

# research-character

One report per character, saved as Markdown with its sources. Any character from any story: give it a
name, a work, several works or a loose idea, and it works out who to research, asks one question a
character, checks what came back and fixes what got lost on the way.

The answers come from Google's AI Mode, asked through Browse Hack in the user's Chrome: that is the
default, and every run tries it first. Without it, there are two fallbacks (below): Google's AI Mode in
a browser Claude drives, then Claude's own web research.

The helper is `scripts/rc.py` (Python, standard library only; `R` below is this skill's folder):

```bash
python3 $R/scripts/rc.py list      --out <folder>                         # what is researched already
python3 $R/scripts/rc.py batch     --out <folder> --work "<Title>" --names "<Name>" "<Name (alias)>" … [--aspects "a, b, c"]
python3 $R/scripts/rc.py todo      --out <folder> [<work-slug> …] [--json] # the questions still unanswered, and the file each goes to
python3 $R/scripts/rc.py save      --out <folder> --file <file from todo> --how browser|web --answer <file>|- [--url <page>] [--source "Title|https://…" …]
python3 $R/scripts/rc.py check     --out <folder> [<work-slug> …]         # every answer: saved, complete, names, gaps
python3 $R/scripts/rc.py fix-names --out <folder> [<work-slug> …]         # put back names the first lines lost
python3 $R/scripts/rc.py keep      --out <folder> <work>/<name>-google.md # move a cut-off answer aside before asking again
```

`scripts/ai-mode-page.js` is for the first fallback: run in a browser on Google's AI Mode page, it waits for
the answer and returns it as Markdown with its sources.

## First: check the MCPs

Before anything else, check this session has the tools below, and tell the user at once what a missing
one changes:

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/browse-hack` | recommended | The default way: asks Google AI Mode each question in the user's Chrome and saves the answer as Markdown with its sources (`google_ai_save_answers`); picks the Chrome profile (`list_profiles`, `use_profile`) | Google AI Mode read in a browser Claude drives instead, one question at a time; with no browser either, Claude's own web research |

Look for the tools by name (`mcp__browse-hack__google_ai_save_answers` in Claude Code; a connector added
in the Claude app has another prefix, so match on the tool's name). If they are only deferred, load them
with ToolSearch ("browse-hack google ai"), which also waits for servers still connecting. When a tool says
the extension isn't connected, call `get_status` and follow what it says. Missing altogether: say which
fallback this run will use, and offer the install prompt, "Set up mcp/browse-hack from MediaMake by
following https://github.com/microfox-ai/mediamake/blob/main/install.md".

### The ways to ask, in order

| Way | When | What it saves |
|---|---|---|
| **1. Browse Hack** (the default) | Its tools are here and the extension is connected | Google AI Mode's answer as Google shows it, with its sources: `<name>-google.md`, written by Browse Hack |
| **2. A browser Claude drives** | No Browse Hack, but a browser tool: the Claude app's built-in browser, Claude in Chrome, or another the agent has | The same Google AI Mode answer, read from the page: `<name>-google.md`, written with `rc.py save --how browser` |
| **3. Claude's own web research** | No browser tool (a cloud session, the API), or Google AI Mode isn't offered there | A report Claude writes from the pages it read, every fact sourced: `<name>-web.md`, written with `rc.py save --how web` |

- Always way 1 when it is here. Drop to the next way only when the one above is missing, or fails for the
  whole run (not for one answer: that one is asked again). Say in one line which way and what it changes.
- The user can name a way ("use web search", "do deep research on them"): then that way, for this run.
- One work keeps one way where it can, so its reports read alike; `list` and `check` treat both kinds of
  report the same.

## What it takes

- **Who.** Vague is fine: a character ("Walter White"), a work ("The Witcher", "Pride and Prejudice",
  "Hamilton"), several works, a list of names, or "which famous ones are missing" from a folder.
- **How many a work** (optional): 8 by default; 10–12 for a big ensemble, 3–5 for a small cast.
- **What to ask** (optional): the default question below, or other angles the user wants (voice and
  way of speaking, look and costume, powers, relationships, their arc), added to it or in its place.
- **Where** (optional): the research folder. By default `research/characters/` in the workspace (its
  root from `mm workspace`, else `~/MediaMake`). A folder the user names, or one already used, carries
  on: its batches say what is there.
- **Who to skip** (optional): characters the user already has elsewhere.

## The steps

### 1. Read the folder and the notes

- `mm notes research-character`: the user's lessons for this skill, beside the log at the bottom.
- `rc.py list --out <folder>`: every work and character already researched there, and any still to ask.

### 2. Work out the cast

For each thing the user named:

- **A character**: find the work they come from. A character with several versions (the book and the
  film, a remake, a reboot, another universe) gets the one the user means; when it is unclear and the
  versions differ, ask once, naming them.
- **A work**: pick its characters by weight in the story: the lead or leads, the main allies, the main
  antagonist, then the fan favourites (the ones people talk about most). For a recent work, or one you
  don't know well, check the cast with a quick web search first. Never invent a character.
- **"Which famous ones are missing"**: compare well-known works of the kind asked with the folder, list
  the biggest gaps first, then the merely popular, and wait for the user's pick.
- **Skip** anyone already saved in the folder (`list`) and anyone the user says is covered elsewhere.
  Ask once, when it matters, whether some are covered elsewhere: the main characters of a work are the
  ones most often done already.

Names in the question decide what comes back, so write them the way fans search for them:

- The full name people use ("Walter White", not "Walt"), and the work's best-known title in full.
- Known by a nickname: `Nickname (Full name)`, as `Maverick (Pete Mitchell)`.
- Known by a title or an epithet: that ("The Bride", "The Man with No Name").
- A one-letter or very common name: add the real name in brackets, as `Q (Major Boothroyd)`.
- No work behind them (a mascot, an original character, a public figure's stage persona): the name
  alone, with `--slug`.

Characters and public personas only. Never a private person.

Show the plan: a line a work, its characters. When the user named the characters or said to go ahead,
start. Otherwise ask once, with the whole list, and let them change it.

### 3. Write the batches

One batch a work:

```bash
python3 $R/scripts/rc.py batch --out <folder> --work "<Title>" --names "<Name>" "<Name>" …
python3 $R/scripts/rc.py batch --out <folder> --slug <name> --names "<Name>"          # no work behind them
```

It writes `batches/<work>.json` (the questions, in the form Browse Hack reads), adds them to `items.json`
and makes the work's folder. Adding names to a work that has a batch keeps the ones already there. The
question:

> `<Name> from <Work>: character, attitude, style, personality, famous quotes, backstory, famous scenes, and why fans love them`

Keep it unless the user wants other angles (`--aspects "voice, way of speaking, look, relationships"`):
it is the one whose answers come back complete. Every character of one work gets the same question, in
every way.

### 4. Pick the way to ask

Browse Hack when it is here (above). With it, `list_profiles`: with two or more profiles, ask which to
use by its Google account email (never by its number: people don't know those), then `use_profile`, and
keep that profile for the rest of the session. Without it, the first fallback this session has.

### 5. Ask every question

**With Browse Hack (the default).**

- `google_ai_save_answers` with `itemsFile: <folder>/batches/<work>.json`, one work a call. Each answer
  takes 10–40 seconds, so a work of 8 takes a few minutes. Keep `format` (markdown) and `header` as they
  are, and never pass `overwrite`: a saved answer is never replaced.
- A failed answer ("The tab took too long to load", an empty one): run the same batch again. Saved
  answers are skipped, so only the failed ones are asked.

**In a browser Claude drives (the first fallback).** For each line of `rc.py todo --out <folder> <work>
--json`, in one tab, one question at a time:

1. Open `https://www.google.com/search?udm=50&q=<the question, URL-encoded>` (Google's AI Mode).
2. Run `scripts/ai-mode-page.js` in the page with the browser's JavaScript tool (with `await` in front
   when the tool doesn't wait for a promise). It waits until the answer stops growing, then returns
   `{ done, url, markdown, sources }`: the answer with its headings, lists and bold, names kept, and the
   source cards' links. It only reads the page. `done: false`, or a short `markdown`: wait and run it again.
3. Write `markdown` to a file outside the folder and save it:
   `rc.py save --out <folder> --file <the todo file> --how browser --answer <that file> --url <the page>
   --source "<title>|<url>" …` (a `--source` for each of `sources`; none when the page showed none).

On a consent page, decline everything that isn't needed. When AI Mode isn't offered there (a region, a
sign-in it wants), move to the next way.

**Claude's own web research (the last fallback).** For each line of `todo`:

1. Search for the character with the work's title: its wiki, interviews with its makers, reviews, the
   places fans talk about it. Read at least three pages, one of them not a fan wiki. A page that won't
   load for an agent (some fan wikis refuse) is replaced by the next one, not retried.
2. Write the report under the question's angles as headings (who they are, personality and attitude,
   style, backstory, famous quotes, famous scenes, why fans love them, or the user's own angles). Every
   fact comes from a page read in this run, never from memory alone. Quotes word for word, with where
   they are said. An angle no page covers says so in a line.
3. Before saving, read each line against what the pages said. A detail you remember but no page gave
   (the scene a quote is from, a name, a date) comes out.
4. Save it: `rc.py save --out <folder> --file <the todo file> --how web --answer <file> --source
   "<Title>|<link>" …`, a source for every page used.

When the agent has a deeper research capability (a deep-research skill, research subagents, a research
mode), use it for a whole work at once, and still save one report a character with `rc.py save`.

**In every way:**

- A long list runs work after work without stopping; tell the user how far it got every few works.
- Google's unusual-traffic check, or a sign-in page: stop and ask the user to clear it in that browser
  window. Never try to solve one.

### 6. Check every answer

```bash
python3 $R/scripts/rc.py check --out <folder> <work-slug> …
```

| It says | What to do |
|---|---|
| ✖ not saved | Ask it again, the same way |
| ✖ short, or no `<section>` | Read the answer. Cut off part-way: `rc.py keep --out <folder> <file>` (the old answer stays beside it as `.v1.md`), then ask it again. Complete but short (a minor character with little written about them): it stays |
| · no sources | Google showed no source cards for that answer. It stands |
| · name dropped | Step 7 |
| · gap | Step 7 |

### 7. Put the names back

Browse Hack's copy of an answer loses the links Google draws as chips: the character's name, and
sometimes the work's title or a real name ("is the main protagonist of…", "…their closest confidant in .
Born…"). The fallbacks' reports don't, so this step finds nothing in them.

1. `rc.py fix-names --out <folder> <work-slug> …` puts the name in front of every first line that lost it
   (for `Nickname (Full name)`, the half the line doesn't already say).
2. `check` again, and fill each `gap` it lists by hand, with only what the answer itself, its sources or
   the question say was there (the work's title, a real name the answer gives elsewhere). When you can't
   tell what was dropped, leave it and tell the user.
3. Change nothing else. A report is the answer as it was saved.

### 8. Tell the user

A line a work: which way it was asked, how many saved, asked again, names put back, and anything left (a
gap you couldn't fill, an answer still short). Then where the folder is, and what could come next: more
characters for a work, another work, other angles.

## The folder

```
<folder>/
  items.json                    every question planned here (query, file)
  batches/<work>.json           one work's questions and its angles
  <work>/<name>-google.md       a report from Google's AI Mode (Browse Hack, or a browser)
  <work>/<name>-web.md          a report from Claude's own web research
  <work>/<name>-google.v1.md    an answer that was cut off, kept when it was asked again
```

A report: `# <the question>`, a line saying how and when it was made (and from which page), the answer
(headings, lists, bold, links), then `## Sources`. Paths in the batches are relative, so the folder can
move or sync to another computer and carry on there.

## Rules

- **Browse Hack first.** The fallbacks are for when it isn't here, or the user asks for one.
- **Characters and public personas only**, from any medium. Never a private person.
- **Saved answers stay.** Nothing is overwritten; an answer asked again keeps the old one beside it.
- **A Google AI Mode report is Google's text.** Only the names it lost are put back. A web-research report
  is Claude's own words, every fact from a page it read. Both are research for the user's own work: never
  paste reports into a repo, an issue or a public page.
- **Check a quote before it goes out.** An answer can misquote or misattribute a line. Before a quote from
  a report is used in anything published (a lyric, a script, a caption), check it against a source.
- **Never ask twice.** `list` before planning, and skip what is saved.

## Where it runs

What each step needs, so it runs in the cloud or on a device (the words: render, key:<name>, mcp:<id>,
app:<name>, browser:<site>[/<account>], media:library; `nothing` for none). A cell holds only those
words, or yes or no: notes go under the table. "Without it" is what a place that lacks the need does
instead, or "a to-do …" when the step has to wait for one that has it.

| Step | Needs | A person's yes | Safe to repeat | Without it |
|---|---|---|---|---|
| 1. Read the folder and the notes | nothing | no | yes | - |
| 2. Work out the cast | nothing | no | yes | - |
| 3. Write the batches | nothing | no | yes | - |
| 4. Pick the way to ask | nothing | yes | yes | - |
| 5. Ask every question | mcp:browse-hack | no | yes | Google AI Mode in a browser Claude drives, else Claude's own web research |
| 6. Check every answer | nothing | no | yes | - |
| 7. Put the names back | nothing | no | yes | - |
| 8. Tell the user | nothing | no | yes | - |

Step 4 waits for the user only when Browse Hack is connected in two or more Chrome profiles. Step 5 is
safe to repeat because saved answers are skipped; in a cloud session, where Browse Hack can't run, it is
Claude's own web research.

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add research-character "<what the user said> → <the rule>"   # a new lesson, dated for you
mm notes research-character                                           # your notes for this skill
```

When the user wants them shared, `mm notes promote research-character` offers them to this log as a pull request.

- 2026-11-12 · "I already covered those characters on a separate machine" → before planning a work's cast, ask once whether some of its characters are covered elsewhere, and skip them.
- 2026-11-25 · "keep things general… applicable for any character research possible via the internet" → any character from any medium; nothing in the skill is tied to one kind of story.
- 2026-11-25 · "the skill should work without Browse Hack as well… but Browse Hack + Google AI is the default, the others are fallbacks" → Browse Hack first, every run; then Google AI Mode in a browser Claude drives, then Claude's own web research, saved in the same shape.
