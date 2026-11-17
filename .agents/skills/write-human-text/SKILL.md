---
name: write-human-text
description: Humanize AI-written text with Phrasly (through Browse Hack) without losing its meaning. Get several drafts, compare every sentence with the original, keep the best phrasing from each, restore any fact a draft dropped or changed, fix the deliberate typos Phrasly adds, and assemble one clean, human-sounding version. It also humanizes just one sentence or paragraph inside a longer text (a micro-edit) and splices it back. Use only when the user explicitly asks to humanize text, to "make it sound less AI / more human", or to use Phrasly, or when a skill they started asks for it (make-human-voiceover). Never run it unasked on ordinary writing.
metadata:
  category: write
---

# write-human-text

Phrasly (phrasly.ai, the humanizer page) rewrites text so it reads less like AI. That rewriting is also the risk:
in live runs (11 Nov 2026, Ultra / Max / Shorter, the page's stored defaults) every draft changed something that
mattered:
- "valid key" became "public key" or "private key";
- the reader's last action ("restart sshd") was dropped from all three drafts;
- one draft added a condition that wasn't in the original;
- each draft had deliberate slips ("Its allow you", "your using", "distro's", "this effects you").

So this skill never ships a draft as it is. It treats the drafts as a pool of human phrasing:
- pick the best wording sentence by sentence;
- put back every fact;
- fix the slips;
- end with one clean version that still sounds like a person wrote it.

Only run it when asked: humanizing is the user's choice, not a default polish.

## First: check the MCPs

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/browse-hack` | required | `phrasly_humanize` (1–5 drafts a run, 30–5,000 words), `phrasly_settings` (the page's stored defaults), `phrasly_status` (captcha, runs and Ultra count today) | No drafts: offer a careful manual rewrite instead, and say it isn't Phrasly |

- **Version:** the `phrasly_*` tools arrive in Browse Hack MCP 0.17 and extension 0.20. If they're missing, the installed Browse Hack is older; `update_browse_hack` brings it up to date once that version is released.
- **Account:** the user's Phrasly plan is unlimited and must be signed in on phrasly.ai in the same Chrome profile.
- **Ultra runs:** Phrasly may move a plan off Ultra after about 50 Ultra documents in a day. `phrasly_status` counts them and warns from 40, so say so before a big batch.

## The run

### 1. Scope and the facts list

Ask what the text is for (a script, a post, an email) and what must not change. Then, before any Phrasly run,
write the **facts list** (`keep.txt`, one per line):
- names, numbers and ids;
- the exact claim;
- every action asked of the reader;
- quotes;
- anything legal or technical.

The helper can only check what it's told: it recognises names and numbers by itself, but not that "valid key" or
"restart sshd" matter.

Write each fact **minimally**: the number with its noun ("20,000 commits"), the name, and the claim's key words
("much happier", "valid key"). Leave out approximations ("about", "almost") and filler words, so a fair paraphrase
isn't flagged. The helper reads numbers in any form: "twenty thousand", "20k" and "20,000" are the same.

Leave out of the text you send:
- direct quotes;
- code and commands;
- URLs;
- lists of figures.

Put them back after. A humanizer has no business rewording a quote.

### 2. Pieces Phrasly accepts

```bash
python3 .claude/skills/write-human-text/scripts/humanize.py chunk text.txt          # 30–5,000 words a piece
```

Short paragraphs are merged with their neighbours, because a run needs at least 30 words. A single short line on
its own gets context added around it (see Micro-edits).

### 3. Drafts

Check `phrasly_status` first. If a captcha is showing, stop and tell the user (§ Captchas).

`phrasly_humanize` with `drafts: 3` (up to 5 for anything important):
- **Pace:** Browse Hack runs about one job a minute, so 3 drafts take 2–3 minutes. Say so, and carry on with other work while they run.
- **Mode:**
  - The stored default may be strong (Max). For text where facts matter (scripts, news, technical), pass `settings: { mode: "Balanced" }`. It rewrites less and keeps more.
  - Use Strong or Max only when the user wants maximum "human" scoring, and expect more facts to be repaired.
  - `sentences: "Shorter"` suits voice-over scripts.
- **The record:** keep the response as `humanize/<name>/drafts-<piece>.json`.

### 4. Compare, pick, assemble

```bash
python3 .claude/skills/write-human-text/scripts/humanize.py align original.txt drafts.json --keep keep.txt
```

For each original sentence it shows the best match in every draft (Phrasly often splits one sentence into two),
and flags:
- a fact or protected token that was lost or changed;
- a changed number of negations (a flipped meaning);
- deliberate slips;
- draft sentences that match nothing in the original, which are usually added claims.

Then build the final yourself:
1. **For each sentence,** take the candidate that sounds most like a person and has no "lost or changed" flag. If every candidate lost a fact, take the most natural one and work the fact back in, in the same casual register. Fall back to the original's wording for that piece only.
2. **Never keep an added claim.** A draft sentence that matches nothing is cut, unless it only restates the original.
3. **Fix the slips** (its/it's, your/you're, there/their, effects/affects, "an user", stray apostrophes, doubled words). Keep the casual rhythm, contractions and plain words that make it human; remove only the errors. The user wants it human *and* without faults.
4. **Read it once as a whole,** and smooth any join where two drafts meet.

```bash
python3 .claude/skills/write-human-text/scripts/humanize.py check original.txt final.txt --keep keep.txt
```

The final is done when `ok` is true:
- no protected token or fact missing;
- the same number of negations;
- no slips;
- every original sentence has a match;
- and it isn't identical to the original.

### 5. Micro-edits (one sentence or paragraph in a longer text)

To humanize only part of a text, without touching the rest:

```bash
python3 …/humanize.py context text.txt --target "<the exact sentence(s)>"     # the span + context to reach 30 words
# phrasly_humanize on "send" (3 drafts), pick the part that matches the target (align on the target alone)
python3 …/humanize.py splice text.txt --target "<the exact sentence(s)>" --with new-span.txt > text-new.txt
```

`splice` replaces only that span, and the rest stays byte-for-byte the same. Never paste a whole draft back over a
longer text.

### 6. The record and the answer

Keep `humanize/<name>/`:
- `original.txt`;
- `keep.txt`;
- the drafts;
- `final.txt`;
- `picks.md` (which draft each sentence came from, which facts were put back, which slips were fixed).

In the answer, show the final, then one line each on:
- what was restored;
- the settings used;
- the runs used today.

### Captchas, sign-in and the daily count

- **`needsUser: "captcha"`:** Phrasly wants a human check. Browse Hack has already brought its Phrasly tab to the front.
  - Stop and tell the user: "Phrasly is asking for a captcha: please complete it in the Phrasly tab in Chrome, then tell me."
  - Never try to solve or bypass it.
  - When they say done, call `phrasly_humanize` again with the same text and settings. It picks up from the drafts it already has (`resumed`).
- **`needsUser: "signin"`:** ask the user to sign in on phrasly.ai in that Chrome profile, then retry.
- **About 40 Ultra runs in a day:** say so before more. The plan may be moved off Ultra at about 50.

## Common mistakes

| mistake | instead |
|---|---|
| Shipping draft 1 as it came back | Compare all drafts sentence by sentence; restore facts; fix slips |
| No facts list, so nothing flags "public key" | Write `keep.txt` before the first run |
| Humanizing quotes, code, URLs or figures | Keep them out of what's sent; put them back after |
| Leaving Phrasly's deliberate typos in "because they look human" | Fix the errors, keep the casual wording |
| Max mode on a factual script | Balanced for facts; Max only when asked |
| Re-sending a long text to change one line | Micro-edit: `context`, then `splice` |
| Clicking through a captcha, or retrying in a loop | Stop, ask the user, then resume with the same call |

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add write-human-text "<Short> · <what they said> → <the rule>"   # a new lesson, dated for you
mm notes write-human-text                                                  # your notes for this skill
```

When the user wants them shared, `mm notes promote write-human-text` offers them to this log as a pull request.

- 2026-11-11 · skill · "integrate the phrasly usage in browserhack… only done when specifically asked for… remember the default settings… minimum 30 words… maximum 5000… the conversion can change the meaning… create multiple drafts, ai decide and pick the best paragraphs, sentences from those drafts and put together… no faults… micro edits… captchas… ask the user to verify" → this skill: a facts list, 3–5 drafts, sentence-level picking with `humanize.py align`, facts restored, slips fixed, `check` before done, micro-edits by `context` + `splice`, and captchas handed to the user.
