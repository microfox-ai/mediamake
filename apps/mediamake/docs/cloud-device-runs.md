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

Not built yet: the access register (what each environment and device can do, and whose device is open
to the project), the to-do queue, the run record. Until then a step that needs a device is done by a
person on that device.

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
