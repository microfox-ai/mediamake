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

Not built yet: the to-do queue and the run record. Until then the register only shows where a step
could run; a step that needs a device is still done by a person on that device.

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
