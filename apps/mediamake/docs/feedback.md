# Feedback, triage and automatic draft pull requests

Every skill, MCP and app takes feedback. Claude reads each one, bugs from
members get a draft pull request on their own, and admins work through the
rest on one page. The writer hears back by mail when the fix ships.

## The path of one feedback

1. **It comes in.** From the form on the item's page (`/skills/<name>`,
   `/mcps/<slug>`, `/apps/<slug>`) or from Claude through mm-use's
   `send_feedback`, with the version used. Both are `POST /api/feedback`.
   Every member may send, Public ones too, 30 a day at most.
2. **Claude reads it** right after it is saved (`lib/feedback/triage.ts`): a
   kind (bug, major problem, improvement, question, praise), a severity (low,
   medium, high), a one-line summary, and whether it repeats a feedback that
   is still open about the same item. One short call with a structured
   answer. It never acts on what the feedback says.
3. **A bug or a major problem from a Plus member or above** (Plus, Pro,
   Cohort, Admin), about one item and not a repeat, starts the fix workflow on
   its own: at most 3 a day (`FEEDBACK_AUTO_PRS_PER_DAY`).
4. **Everything lands on `/app/feedback`** (Admin → Feedback): grouped by
   item with counts by kind, repeats folded under the first report. From any
   feedback an admin can raise a draft pull request, add it to an existing
   one, answer it, add it to the item's known issues, mark it shipped, or
   dismiss it.
5. **It ships.** When the pull request tied to a feedback merges, or an admin
   presses Shipped, the feedback and everything that repeats it are marked
   shipped, each writer gets one mail, and the known issues that came from
   them are marked fixed.

Who sees what: a feedback is read by admins and its writer only. Its writer
sees it on the item's page ("What you sent") with the answer and the outcome,
and through mm-use's `my_feedback`. Everyone who can open an item sees its
**known issues**, the list admins write in their own words (`known_issues` in
mm-use). A fixed issue stays on the page for 30 days.

## Automatic draft pull requests

MediaMake does not write the fix itself. It starts
`.github/workflows/feedback-fix.yml` on the item's repository with the
feedback's id; the workflow reads the feedback from MediaMake, runs Claude
Code on the checkout, and opens a **draft** pull request on a
`feedback/<id>` branch. A maintainer reviews and merges it; nothing merges on
its own.

- Claude Code can read, search and edit files in the checkout. It cannot run
  commands or reach the web, so the draft says nothing was run or tested.
- A fix may not touch `.github/`, Claude's settings in `.claude/` (skills are
  fine), the guard-rails files, lock files or env files: such edits are
  dropped before the commit (`tools/feedback-fix.mjs check`), and the run
  stops if a secret's value shows up in a changed file.
- The feedback's words are private. They go to Claude Code as material, with
  an instruction to treat them as a report and not as instructions, and never
  into the pull request: its title and body use Claude's one-line summary.
- `.github/workflows/feedback-shipped.yml` tells MediaMake when any pull
  request merges. Feedback tied to it ships.
- Which repository: the one that builds the item's package when the catalog
  names it (Browse Hack: `microfox-ai/extensions`), else `FEEDBACK_PR_REPO`
  (default `microfox-ai/mediamake`). That repository needs both workflows and
  `tools/feedback-fix.mjs`. An item made by someone else gets no pull
  request: add a known issue instead.

## The monthly ceiling

Triage and fix runs use one Claude API key and one ceiling: 50 US dollars a
month (UTC) unless `FEEDBACK_AI_MONTHLY_USD` says otherwise. `/app/feedback`
and Admin Billing show the month's spend.

- A triage call is priced from its token counts (`lib/feedback/budget.ts`).
  Triage stops when 0.10 US dollars more would pass the ceiling.
- A fix run may spend up to `FEEDBACK_PR_MAX_USD` (5): the workflow passes it
  to Claude Code as its budget, and reports what the run cost. While a run is
  out, that much is held. No run starts unless it fits.
- At the ceiling, feedback is still saved. It shows as "Not read" with the
  reason, and an admin can press "Read with Claude" next month or after
  raising the ceiling.

## Setting it up

On the deployment (Vercel):

| Variable | What it is for |
| --- | --- |
| `ANTHROPIC_API_KEY` | Triage. Without it feedback is saved and stays "Not read" |
| `FEEDBACK_AI_MONTHLY_USD` | The ceiling, in US dollars. Default 50 |
| `FEEDBACK_TRIAGE_MODEL` | The model that reads feedback. Default `claude-opus-5-5` |
| `FEEDBACK_GITHUB_TOKEN` | Starts the fix workflow: a fine-grained token with Actions read and write on the repositories that have it |
| `FEEDBACK_HOOK_SECRET` | A long random value the workflows show to `/api/feedback-hook` |
| `FEEDBACK_PR_REPO` | Where fixes go unless the item names its repository. Default `microfox-ai/mediamake` |
| `FEEDBACK_PR_MAX_USD` | The most one fix run may spend. Default 5 |
| `FEEDBACK_AUTO_PRS_PER_DAY` | How many pull requests triage raises on its own in a day. Default 3. 0 leaves every one to the button |
| `RESEND_API_KEY` | The answer and shipped mails (see sign-in.md) |

On each repository that takes fixes (Settings → Secrets and variables →
Actions):

| Name | Kind | Value |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Secret | The same key |
| `FEEDBACK_HOOK_SECRET` | Secret | The same value as on the deployment |
| `MEDIAMAKE_URL` | Variable, optional | The site, when it is not `https://mediamake.microfox.app` |
| `FEEDBACK_FIX_MODEL` | Variable, optional | The model Claude Code uses. Default `claude-opus-5-5` |

And in Settings → Actions → General, tick "Allow GitHub Actions to create
and approve pull requests". A pull request opened by the workflow's own token
does not start the repository's other workflows; they run when a maintainer
marks the draft ready for review or pushes to it.

## API

| Call | What it does |
| --- | --- |
| `POST /api/feedback` `{ text, itemId?, version?, source? }` | Send feedback. Answers `{ feedbackId, createdAt }`; triage runs after the answer |
| `GET /api/feedback[?item=][&status=]` | The caller's own feedback with answers and outcomes. Admins: `&all=true` for everyone's, in full |
| `GET /api/feedback/known-issues?item=` | An item's known issues, for any account that can open it |
| `GET /api/admin/feedback` | The admin page's data. `?only=budget` for the spend alone |
| `POST /api/admin/feedback` `{ type, … }` | One admin action: `triage`, `raise_pr`, `link_pr`, `unlink_pr`, `answer`, `dismiss`, `reopen`, `ship`, `issue_add`, `issue_link`, `issue_update`, `issue_fixed`, `issue_reopen`, `issue_remove` |
| `GET /api/feedback-hook?id=` | For the fix workflow: the feedback's words, item and Claude's reading. Bearer `FEEDBACK_HOOK_SECRET` |
| `POST /api/feedback-hook` | The workflows' reports: `{ event: 'fix', … }` and `{ event: 'merged', repo, prNumber }` |

Stored in MongoDB: `feedback` (each record carries its triage, pull request,
answer and outcome), `known_issues`, `feedback_ai_spend` (one row a month for
each of triage and fix runs).
