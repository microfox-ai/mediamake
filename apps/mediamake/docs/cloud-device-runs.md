# Cloud and device runs

Some steps of a skill run anywhere (writing, voicing with a key, rendering). Some need a person's
computer: a browser signed in to YouTube or Midjourney, an app, Browse Hack, the media library. This
is how MediaMake knows which is which, and what a Claude cloud environment needs before it can run a
space. The whole plan (the access register, the to-do queue a teammate picks up, resuming a run in
another place) is in the Claude Doc "Cloud and device runs: plan"; this page says what is built.

## Built now

| Part | Where |
| --- | --- |
| The words for what a step needs | `tools/places.mjs`, `tools/places.json`, `apps/mediamake/lib/space/places.ts` |
| A skill's run sheet, read and checked | `tools/skills.mjs` (`runSheet`), `mm submit`, `skills.mjs add / publish / check` |
| What a space's items need, in its report | `tools/space.mjs` (`itemAt`), `PUT /api/space` |
| The space page: what a cloud environment needs | Set up › Run it in the cloud (`lib/space/cloud-setup.ts`, `components/projects/space-cloud.tsx`) |
| The same check inside a cloud session | `mm cloud` (`tools/cloud.mjs`, `needsOf`) |
| The register: what each computer and cloud environment can do | `mm access` (`tools/access.mjs`), `/api/space/places` (`lib/space/register.ts`, `register-store.ts`), the project's page › Where it runs (`components/projects/space-places.tsx`) |
| The to-do queue: a step one place could not do, waiting for a place that can | `mm todo` (`tools/todo.mjs`), `/api/space/todos` (`lib/space/todos.ts`, `todo-store.ts`), the space's page › To do (`components/projects/space-todos.tsx`), the Spaces MCP's `list_todos`, `post_todo`, `claim_todo`, `finish_todo`, `where_it_runs` |

Not built yet: the run record (a run that stops in one place and resumes in another by itself), and the
planner that picks a place. Until then a person carries each hand-over: a session posts the to-do, and
someone pastes its line into Claude on a computer that can do it.

## The words

A place is anywhere a step can run: a shared cloud environment, or a device. A step says what it
needs and a place says what it can do, in the same words:

| Word | Means | Only on a device |
| --- | --- | --- |
| `render` | It can build and render a project | no |
| `key:<name>` | That key is set there: `key:elevenlabs`, `key:mediamake` | no |
| `mcp:<id>` | That MCP is installed there: `mcp:elevenlabs`, `mcp:browse-hack` | the ones in `places.json` › `deviceMcps` (Browse Hack) |
| `app:<name>` | That app is installed there: `app:reaper` | yes |
| `browser:<site>[/<account>]` | A browser there is signed in to that site, as that account when one is named: `browser:youtube/atomic-rap` | yes |
| `media:library` | The media library is on that machine | yes |

A need names a thing, never a secret: a key by its name, a sign-in by its site and account.

`tools/places.json` is the one table the tools and the app both read: the MCPs that work only on a
device, and for each known key the environment variable that carries it, the host it calls and where a
person makes one. A key that isn't in the table is carried by `<NAME>_API_KEY`. A new key or a new
device-only MCP is one line there.

## The run sheet

Every skill has a `## Where it runs` section with one table, a row a step, in the order they run:

```markdown
## Where it runs

| Step | Needs | A person's yes | Safe to repeat | Without it |
|---|---|---|---|---|
| 1. Write the short | nothing | no | yes | - |
| 2. Voice it | `key:elevenlabs` | no | yes | a to-do for a place with the key |
| 3. Build and render | `render` | no | yes | - |
| 4. Upload to YouTube | `mcp:browse-hack`, `browser:youtube/doomcat` | no | no | a to-do: upload the release from a computer signed in to the channel |
```

- **Needs**: the words above, separated by commas; `nothing` for none.
- **A person's yes**: `yes` when the step must not run until a person agreed (publishing under someone's
  name, spending past a limit). Most steps are `no`.
- **Safe to repeat**: `no` when running it twice does harm (an upload, a purchase), so a resumed run
  never repeats it.
- **Without it**: what happens when no place has what the step needs. Required for a step that needs
  a key, an MCP, an app, a sign-in or the library; `-` when it needs nothing, or only `render` (every
  place that is set up renders).

`mm space new skill <name>` starts a skill with the table. `node tools/skills.mjs check` reads every
sheet in the repo; `skills.mjs add`, `publish` and `mm submit` stop on a skill with no sheet or a row
they can't read. The registry (`skills.json`) carries each skill's `steps` and `runsOn`: `anywhere` (no
step needs a device), `device` (every step that needs anything needs one) or `mixed`.

An MCP or an app says the same in its `item.json`: `"needs": ["key:elevenlabs"]`.

## What a cloud environment needs

A space's computers report, with each item, the needs its run sheet names (`mm space report --dry`
shows it). From that the space's page (Set up › Run it in the cloud) lists, for a Claude cloud session
or a routine:

1. **The repositories to add**: `microfox-ai/mediamake`, the space's own repo, and the repo of each
   item linked to it.
2. **The keys to set**, by the name of the environment variable: `MEDIAMAKE_API_KEY` always (it signs
   the session in to MediaMake; made on `/app/api-keys`), then one per `key:<name>` with the skills
   that use it and where to get one. A skill with no run sheet is named, because its keys aren't known.
   For an environment whose network access is Limited it also names the hosts the keys call.
3. **The line each session starts with**: `npm run mm -- cloud`.

Under them: what stays on a computer (the device-only needs, and which skills have them).

MediaMake knows the names only. A key's value is set in Claude, in the environment's settings, and
never comes to MediaMake.

Inside the session `mm cloud` checks the same list against the machine: a tick for each key that is
set, ✖ for one a skill needs that isn't, the skills with no run sheet, and what is only on a device.
It names keys and never prints one.

## The register

The register says what each place can do, so a project knows where a step can run. A place is a
member's computer or a Claude cloud environment, and it reports itself in the words above.

**A computer** is its owner's. `mm access` shows what it can do and tells MediaMake:

- Detected: `render` (the checkout's dependencies are installed), the known keys by name (set in the
  environment, in an MCP's settings in Claude, or MediaMake's sign-in; never a value), the MCPs MediaMake
  installed, the media library, and of the apps and MCPs its spaces' skills ask for, the ones that are
  there.
- Said by its owner, because nothing can detect it: `mm access add browser:youtube/doomcat` (a browser
  sign-in), `app:<name>`, `key:<name>`. `mm access remove <need>` takes it back.
- `mm access name "Studio Mac"` is the name the project's people see.

A computer is **closed to every project** until its owner opens it: `mm access open <project>` lets
that project's runs use it with nobody at it, `mm access close <project>` takes it back, and
`mm access busy` / `free` pauses it for every project. Only its owner does any of this, here or with
the buttons on the project's page. Closed, nobody else sees it. Its owner can always use it.

**A cloud environment** belongs to the projects whose space repos it holds: `mm cloud` reports it, and
everyone on those projects sees it. It is never opened or closed, and it never has what only a device
has. Its name is `MEDIAMAKE_PLACE` in the environment's variables (`cloud` without one); two
environments of one account need two names. It is listed under the account whose `MEDIAMAKE_API_KEY`
it uses.

**A spend limit** is a few words beside a key, written by whoever set the key: on a computer
`mm access limit elevenlabs "unlimited"` (`--clear` removes it), in a cloud environment a variable
beside the key's own, `ELEVENLABS_API_KEY_LIMIT=unlimited`. It is shown with the key. Nothing enforces
it yet: the planner that reads it comes with the to-do queue.

**On the project's page**, the Where it runs tab has a card for what the space's skills need (which
open place has each, and what no place has yet), a card per place (cloud environments, the computers
open to the project, and the viewer's own computers with their Open, Close and busy buttons) and the
line that adds a computer. A personal space has no such tab. `mm access project <project>` prints the
same. Someone who leaves the project takes their places with them.

| Call | What |
| --- | --- |
| `GET /api/space/places?project=<id>` | That project's register, for anyone on it. Without `project`, the account's own places |
| `PUT /api/space/places` | What one computer or cloud session can do: `{ kind, device, name?, can, limits?, repos? }`. Known words only |
| `POST /api/space/places` | Its owner's ask: `{ action: "open" \| "close", place, project }`, `{ action: "busy" \| "free" \| "forget", place }`, `{ action: "name", place, name }` |

What MediaMake is told is the computer's random label, the name its owner gave it, those words and
limits, and for a cloud environment the names of its space repos. Never a key, a password, a path or a
file. `mm access --dry` shows the exact report, `mm usage off` stops it, and `mm access forget` takes
the computer out of the register (`mm usage forget` deletes usage, not the register).

## The to-do queue

A to-do is a step one place could not do, posted for a place that can. A cloud session that reaches the
upload (it needs a browser signed in to the channel) saves its work to the project, posts a to-do and
ends. It never waits. Someone on the project with a computer that has what the step needs picks it up.
To-dos live in MediaMake with the project, not in git, so one shows at once and two people never
conflict over it. A personal space has a queue too: a cloud session of yours, then your own computer.

A to-do holds:

- what to do, in a line, and notes for whoever picks it up
- the skill and the step, as the skill's run sheet names them
- what the step needs, in the words above, so only a place that has them all is offered it
- what it works on, by reference: a release or a production of the project (its slug), which version,
  and the commit of the space's code
- whether it waits for a person's yes, and whether doing it twice does harm
- what comes after it, when the work continues somewhere else
- its state, who posted it and from where, who has it and on which computer, and what came of it

Everyone on the project reads a to-do, so it never holds a key, a password or anything private. A post
or a result that looks like one is refused.

| State | Means |
| --- | --- |
| open | It waits for a place that has what it needs |
| claimed | One person picked it up, on one computer |
| done | Finished, with its result (the video's link) |
| failed | It failed 3 times and waits for a person to look |
| cancelled | No longer wanted: a newer version replaced it, or someone cancelled it |

The rules, each with one answer:

- **Only one pick-up succeeds.** Every change is saved over the version it read; the second person is
  told who has it and on which computer.
- **A claim nobody finished ends after 2 hours** (the computer slept, the session died), and so does
  the claim of someone who left the project. The to-do is open again.
- **A failure opens it again with the reason.** The third stops it until a person opens it again.
  Giving one back (`release`) is not a failure.
- **A step that must not happen twice** (`Safe to repeat: no` on the run sheet) is checked first by
  whoever picks it up: a link on the release, the video on the channel. If it happened, they only
  record the result.
- **The same step of the same work and version is posted once**: posting it again gives back the one
  that waits. A newer version cancels the older one that still waits, and posts its own.
- **A step that waits for a person's yes** is not finished before it has one, recorded with their name
  (`mm todo yes <id>`, or Say yes on the page). A session says yes only when the user said so in it.
- **A choice only a person can make** (which thumbnail) uses the same queue, with its options. It is
  answered on the page, or by a session with the user's answer; it is never picked up.
- **Owners and editors** post and work a project's to-dos; viewers read them.

Where people and sessions meet it:

| Where | What |
| --- | --- |
| The space's page › To do | A card per to-do: what it needs, which place can do it, the line to paste with a copy button, who has it, what came of it. Cancel, Open it again, Say yes, and the buttons of a choice |
| `mm todo` | What waits in your projects and which of it this computer can do. `mm todo <project>`, `show <id>`, `post`, `pick`, `done`, `fail`, `release`, `yes`, `cancel`, `reopen` |
| The line, pasted into Claude | "Pick up to-do td-… in <project>" is `mm todo pick <id>` |
| The start of a session | One line when something waits that this computer can do (`tools/todo.mjs --hook`). It is quiet otherwise, and Claude picks one up only when the user says so |
| The MediaMake Spaces MCP | `list_todos`, `post_todo`, `claim_todo`, `finish_todo`, and `where_it_runs` for the register, for a Claude with no MediaMake repo |
| Portal | Where the Portal MCP is connected, the session that posts a to-do adds it as a task for the people who can do it, and the one that finishes it logs the work there |

`mm todo post <project> "<what to do>" --needs=<need,need>` posts one, with `--skill`, `--step`,
`--release` or `--production`, `--version`, `--commit`, `--notes`, `--then`, `--yes` (it waits for a
person's yes), `--repeat` (doing it twice does no harm) and `--options="A|B|C"` (a choice).

`mm todo pick <id>` picks one up:

1. It checks this computer has everything the to-do needs (what `mm access` shows). If not, it says what
   is missing and which place can do it, and claims nothing.
2. It claims the to-do, in this computer's name.
3. It brings the project's space up to GitHub and checks the space has the commit the to-do names. If
   the space can't be brought up to date (edits here that conflict), or its skill isn't on this
   computer, the to-do is given back and it says what to do.
4. It prints what to do: the skill and step, what it works on and how to get it, the check before a
   step that must not happen twice, the yes it waits for, and the lines that finish it
   (`mm todo done <id> --result="<link>"`, `mm todo fail <id> --reason="…"`, `mm todo release <id>`).

| Call | What |
| --- | --- |
| `GET /api/space/todos?project=<id>` | That project's to-dos, each with the places that can do it. `?id=<td-…>` is one; with neither, what waits in every project the account works on |
| `POST /api/space/todos` | `{ action: "post", project, title, needs, … }`, or `{ action: "claim" \| "done" \| "fail" \| "release" \| "yes" \| "cancel" \| "reopen", id, … }`. A claim that loses is answered 409 with who has it |

Not in the queue yet: a notice sent to the people who can do a to-do (today it is the count on the tab,
the session-start line and the Portal task), a device's line when two runs want it, and starting the
next part by itself when a to-do is done. Those come with the run record and the planner.
