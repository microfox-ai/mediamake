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

- **The key goes to that one process.** `MEDIAMAKE_AGENTS_KEY` or `ANTHROPIC_API_KEY` in the
  environment, else either line in the checkout's `.env` (a worktree reads its main checkout's). It is
  passed to the run's own `claude` and nowhere else, so no export per terminal tab and your own sessions
  stay on the subscription. It is never printed or written to a record.
- **In a cloud environment the variable is `MEDIAMAKE_AGENTS_KEY`.** A cloud session runs on your
  Anthropic account whatever key it is given, and its settings say so when you add a variable called
  `ANTHROPIC_API_KEY`. Under this name only the sub-agent gets the key: it is started as plain Claude
  Code on it, without what marks the session as a cloud one, and `MEDIAMAKE_CLOUD` tells MediaMake's
  tools inside it that they are still in the cloud. The session that starts it stays on the
  subscription; only the sub-agent's work bills the key.
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

## The Sub-agents page

`/app/sub-agents` (the cohort and admins) shows every run of the account, whichever computer or cloud
session it ran in: what is running, waiting or needs you, the credit left, what each run cost turn by
turn, and its conversation (your messages, its replies, each tool call with the start of its result).

```bash
mm agents watch          # this place takes what the page sends, until Ctrl+C
mm agents report off     # runs stay on this computer; on sends them again
mm agents sync           # sends what the page hasn't got (a run made while offline)
```

- **Reporting.** A run's own runner sends it to MediaMake every few seconds while it works, with the
  sign-in the computer already has (`mm login`, or the environment's `MEDIAMAKE_API_KEY`). It sends the
  run's title, model, folder, place, state, cost and turns, and the conversation as the page shows it:
  messages and replies cut at 6,000 characters, a tool's input at 600 and its result at 1,500. Never
  the brief's file, never a key: this computer's keys and anything shaped like one are taken out before
  a line is written or sent, and again on arrival. Only the account that ran it reads it.
  `mm agents report off` stops it; "Remove from this page" on a run deletes what was sent.
- **Answering from the page.** A message sent to a run that is working is read by its runner when the
  turn ends, and becomes the next turn. Stop ends the turn it is on.
- **Listening.** For a run that has ended, or a new one, a place has to be listening:
  `mm agents watch`, started by its owner. While it listens, the page can continue and start runs
  there, within each run's cap and the credit, in a folder a run has already worked in. It never
  passes `--paid` or a permission mode. What the signed-in owner sends from the page is their yes.
- A message the place can't take (the cap is spent, the credit is over) comes back on the page with
  the reason.

The records are `agent_runs`, `agent_events`, `agent_commands` and `agent_places` in MongoDB
(`lib/sub-agents`), behind `/api/sub-agents`, which checks the membership on every call.

## In a cloud session

A sub-agent runs in a Claude Code cloud session too (checked 2026-11: a run and its continue, on the
key, reported to the page). The session that starts it stays on the subscription; the sub-agent's
work bills the key.

What the cloud environment needs:

| | |
| --- | --- |
| `MEDIAMAKE_AGENTS_KEY` | The Anthropic API key, under this name (a cloud environment says a variable called `ANTHROPIC_API_KEY` won't be used) |
| `MEDIAMAKE_API_KEY` | The MediaMake sign-in: the membership check and the reports to the page |
| Network | `mediamake.microfox.app` and `api.anthropic.com` allowed. An environment that allows no extra hosts blocks the membership check, and no run starts |

```bash
npm run mm -- cloud                                              # the session's setup, as for any cloud work
mm agents start --file=<brief> --yes --wait --timeout=<minutes>  # stays until its turn ends
```

- **Start it with `--wait`**, as a background command of the session: a cloud machine is the session's,
  and a run left behind when the session ends is not known to survive it.
- **Nothing is on the machine afterwards.** It is thrown away: what the run made leaves the way any
  cloud work does (`mm run save`, `mm cloud deliver`), and its record is the one on the Sub-agents page.
- **No MCPs, no connectors.** A cloud machine has none installed and the key carries none: steps that
  need one stay on a computer, as the skill's run sheet says.
- **Continuing later** works in the same session. A run from an earlier cloud session has no machine
  to continue on: start a new one with what it found.
- `mm agents watch` is for a computer. A cloud session takes the page's message to a run that is
  working, when its turn ends, and nothing else.

## What a sub-agent has

Everything installed on the computer for every project: skills, hooks, `mm`, local MCPs. Connectors
added on claude.ai (Gmail, hosted ElevenLabs, fal, Vercel) may not load on a key: `mm agents show <id>`
lists the MCPs a run loaded.
