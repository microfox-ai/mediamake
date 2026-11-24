---
name: research-character
description: Research characters from any story — a film, a TV series, a book, a game, a comic, a play, a myth, or one character by name — and save a report on each from Google's AI Mode (who they are, attitude, style, personality, famous quotes, backstory, famous scenes and why fans love them, with the sources it cites), asked in the user's Chrome through Browse Hack. The input can be vague (one character, a work, several works, a list, "what famous ones are we missing"): it works out the cast first — the lead, the allies, the villains, the fan favourites — and skips who is already researched. Then it checks every answer, asks again the ones that came back cut off and puts back the names Google's links drop. Use when the user says "research <character>", "research the characters of <film / series / book / game>", "character reports / profiles / summaries for …", "who are the main characters of … — write them up", "do the same for <work>", "which famous <works> did we miss", "/research-character …". Not for news or topic research, for writing from the reports (lyrics, scripts: the skills that make those), or for a private person. New user feedback goes in your notes (mm notes add research-character), never in this file.
metadata:
  version: 0.1.0
---

# research-character

One report per character, from Google's AI Mode, saved as Markdown with the sources it cites. Any
character from any story: give it a name, a work, several works or a loose idea, and it works out who
to research, asks Google one question a character in the user's Chrome, checks what came back and
fixes what Google's page loses on the way.

The helper is `scripts/rc.py` (Python, standard library only; `R` below is this skill's folder):

```bash
python3 $R/scripts/rc.py list      --out <folder>                         # what is researched already
python3 $R/scripts/rc.py batch     --out <folder> --work "<Title>" --names "<Name>" "<Name (alias)>" … [--aspects "a, b, c"]
python3 $R/scripts/rc.py check     --out <folder> [<work-slug> …]         # every answer: saved, complete, names, gaps
python3 $R/scripts/rc.py fix-names --out <folder> [<work-slug> …]         # put back names the first lines lost
python3 $R/scripts/rc.py keep      --out <folder> <work>/<name>-google.md # move a cut-off answer aside before asking again
```

## First: check the MCPs

Before anything else, check this session has the tools below, and tell the user at once if it doesn't:

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/browse-hack` | required | Asks Google AI Mode each question in the user's Chrome and saves the answer as Markdown with its sources (`google_ai_save_answers`); picks the Chrome profile (`list_profiles`, `use_profile`) | No reports: the cast and the batch files are written, and the questions wait for a computer with Browse Hack |

Look for the tools by name (`mcp__browse-hack__google_ai_save_answers` in Claude Code; a connector added
in the Claude app has another prefix, so match on the tool's name). If they are only deferred, load them
with ToolSearch ("browse-hack google ai"), which also waits for servers still connecting. When a tool says
the extension isn't connected, call `get_status` and follow what it says. Missing altogether: offer the
install prompt, "Set up mcp/browse-hack from MediaMake by following
https://github.com/microfox-ai/mediamake/blob/main/install.md".

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

Names in the question decide what Google answers, so write them the way fans search for them:

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

It writes `batches/<work>.json` (what Browse Hack reads), adds the questions to `items.json` and makes
the work's folder. Adding names to a work that has a batch keeps the ones already there. The question:

> `<Name> from <Work>: character, attitude, style, personality, famous quotes, backstory, famous scenes, and why fans love them`

Keep it unless the user wants other angles (`--aspects "voice, way of speaking, look, relationships"`):
it is the one whose answers come back complete. Every character of one work gets the same question.

### 4. Pick the Chrome profile

`list_profiles`. With two or more, ask which to use by its Google account email (never by its number:
people don't know those), then `use_profile`. Keep that profile for the rest of the session.

### 5. Ask Google AI Mode

- `google_ai_save_answers` with `itemsFile: <folder>/batches/<work>.json`, one work a call. Each answer
  takes 10–40 seconds, so a work of 8 takes a few minutes. Keep `format` (markdown) and `header` as they
  are, and never pass `overwrite`: a saved answer is never replaced.
- A failed answer ("The tab took too long to load", an empty one): run the same batch again. Saved
  answers are skipped, so only the failed ones are asked.
- A long list runs work after work without stopping; tell the user how far it got every few works.
- Google's unusual-traffic check, or a sign-in page: stop and ask the user to clear it in that Chrome
  window. Never try to solve one.

### 6. Check every answer

```bash
python3 $R/scripts/rc.py check --out <folder> <work-slug> …
```

| It says | What to do |
|---|---|
| ✖ not saved | Run the batch again |
| ✖ short, or no `<section>` | Read the answer. Cut off part-way: `rc.py keep --out <folder> <file>` (the old answer stays beside it as `.v1.md`), then run the batch again. Complete but short (a minor character with little written about them): it stays |
| · no sources | Google showed no source cards for that answer. It stands |
| · name dropped | Step 7 |
| · gap | Step 7 |

### 7. Put the names back

Google's AI Mode shows the character's name, and sometimes the work's title or a real name, as a link
chip, and the saved text loses it: "is the main protagonist of…", "…their closest confidant in . Born…".

1. `rc.py fix-names --out <folder> <work-slug> …` puts the name in front of every first line that lost it
   (for `Nickname (Full name)`, the half the line doesn't already say).
2. `check` again, and fill each `gap` it lists by hand, with only what the answer itself, its sources or
   the question say was there (the work's title, a real name the answer gives elsewhere). When you can't
   tell what was dropped, leave it and tell the user.
3. Change nothing else. A report is Google's answer as it was saved.

### 8. Tell the user

A line a work: how many saved, asked again, names put back, and anything left (a gap you couldn't fill,
an answer still short). Then where the folder is, and what could come next: more characters for a work,
another work, other angles.

## The folder

```
<folder>/
  items.json                    every question planned here (query, file)
  batches/<work>.json           one work's questions and its angles: what Browse Hack reads
  <work>/<name>-google.md       one report a character
  <work>/<name>-google.v1.md    an answer that was cut off, kept when it was asked again
```

A report: `# <the question>`, a line saying when and from which page it was saved, the answer as Google
wrote it (headings, lists, bold, links), then `## Sources`. Paths in the batches are relative, so the
folder can move or sync to another computer and carry on there.

## Rules

- **Characters and public personas only**, from any medium. Never a private person.
- **Saved answers stay.** Nothing is overwritten; an answer asked again keeps the old one beside it.
- **The report is Google's text.** Only the names it lost are put back. It is research for the user's own
  work: never paste reports into a repo, an issue or a public page.
- **Check a quote before it goes out.** AI Mode can misquote or misattribute a line. Before a quote from a
  report is used in anything published (a lyric, a script, a caption), check it against a source.
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
| 4. Pick the Chrome profile | mcp:browse-hack | yes | yes | a to-do for a computer with Browse Hack |
| 5. Ask Google AI Mode | mcp:browse-hack | no | yes | a to-do for a computer with Browse Hack |
| 6. Check every answer | nothing | no | yes | - |
| 7. Put the names back | nothing | no | yes | - |
| 8. Tell the user | nothing | no | yes | - |

Step 4 waits for the user only when Browse Hack is connected in two or more Chrome profiles. Step 5 is
safe to repeat because saved answers are skipped.

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
