# Sub-agents on the API key

A sub-agent is a headless Claude Code run (`claude -p`) that bills an Anthropic API key instead of the
subscription. It is still full Claude Code: the same folder, CLAUDE.md, skills, hooks, `mm` commands,
local MCPs and renders as a session on that computer, so API credit turns into real productions.
`mm agents` (`tools/agents.mjs`) starts them, keeps a record of each and continues them.

For admins and Cohort members only: `start` and `continue` check the account `mm login` signed in.

```bash
mm agents                                   # the sub-agents here: state, cost, what each is doing
mm agents start "<task>"                    # what would start and the most it can spend; starts nothing
mm agents start "<task>" --yes              # starts it and returns its id (--wait stays until its turn ends)
mm agents show <id>                         # its record and conversation (--full adds tool results)
mm agents wait <id>                         # until its turn ends, then its reply
mm agents continue <id> "<message>" --yes   # the next turn of the same conversation
mm agents stop <id>                         # ends the turn it is on; the conversation is kept
mm agents usage                             # spent by day and by model, against the credit
mm agents credit --total=200 --ends=2026-11-29T05:30
mm agents defaults --model=opus --effort=high --cap=15 --max=2
```

`start` takes `--file=<brief>` instead of the task in quotes, `--title=`, `--model=` (opus, fable,
sonnet, haiku or a full id), `--effort=` (low to max), `--cap=<dollars>`, `--cwd=<folder>` (where it
works; the folder you are in by default) and `--from="<what asked for it>"`.

## What it does

- **The key goes to that one process.** `ANTHROPIC_API_KEY` in the environment (a cloud environment's
  variable), else the line in the checkout's `.env` (a worktree reads its main checkout's). It is passed
  to the run's own `claude` and nowhere else, so no export per terminal tab and your own sessions stay
  on the subscription. It is never printed or written to a record.
- **It runs on the key or not at all.** Claude says at start where its key came from; a run that did
  not take the key is stopped before it spends the subscription.
- **A clean start.** What a Claude session leaves in its shell (its session id, its sign-in) is taken
  out, so a sub-agent started from inside a session is its own conversation.
- **No questions mid-run.** A headless run cannot ask. It is told to stop where a choice is yours and
  end its reply with the question; it then shows as *needs you* and `continue` answers it.
- **Permissions.** `auto` by default: a classifier lets safe actions through and stops risky ones, and
  the checkout's guard rails still apply. `--mode=acceptEdits|dontAsk|plan|manual` changes it for a run
  or as a default. `bypassPermissions` is never a default: it is typed for one run, by the user.
- **Two at a time.** More than `max` (2) wait their turn, longest wait first.
- **One level.** A sub-agent does not start sub-agents of its own.

## Spending

- `start` and `continue` without `--yes` only say what would run and the sentence to ask. Add `--yes`
  after the person agrees.
- A run stops at its cap (`--cap`, $15 for the whole run). `continue --cap=<a higher total>` lets a
  capped one go on.
- `mm agents credit` names the credit the ledger counts against. No run starts after its end, or
  within its last $10, unless `--paid` says the key may bill its own balance: only on the user's word.
- Costs are Claude Code's own count, reported when a turn ends, not while it runs. The Console is the bill.

## The record

`agents/<id>/` in the workspace (`mm workspace`):

| File | What |
| --- | --- |
| `run.json` | title, task, model, effort, permissions, cap, folder, place, the session that started it, state, every turn (message, reply, cost, tokens, tool calls, time) and what loaded (tools, MCPs, key source) |
| `events.jsonl` | every line Claude printed (messages, tool calls and their results), with a marker at each turn |
| `stderr.log` | what Claude wrote to stderr |

States: *waiting*, *running*, *done*, *needs you*, *blocked*, *at its cap*, *failed*, *stopped*, and
*lost* (its process ended without saying). A run is continued by its Claude session id
(`claude -p --resume`), so the conversation goes on from where it was.

## What a sub-agent has

Everything installed on the computer for every project: skills, hooks, `mm`, local MCPs. Connectors
added on claude.ai (Gmail, hosted ElevenLabs, fal, Vercel) may not load on a key: `mm agents show <id>`
lists the MCPs a run loaded.
