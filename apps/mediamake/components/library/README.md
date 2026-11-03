# Library

One page, `/library`, over everything a channel's work is made of: **channels → productions**
(the media each used, the skills run on it, what was delivered), **skills** (each one's best
approved output, runs, variants and how far they drifted) and **media** (search, facets, inbox
triage, duplicates). It replaces `/skill-library`, which redirects here (`?view=skills`).

It is a public page like `/file-revision`: no sign-in, no API calls, nothing uploaded. It reads a
folder on this computer with the File System Access API (Chromium only).

```
┌ header: Channels · Productions · Skills · Media │ search (/) │ sort · S M L │ edits waiting │ _LIBRARY ┐
│ filters per view      │ cards                                          │ detail panel        │
│  productions: channel │  channels: logo, counts, recent productions    │  production: media  │
│   and status          │  productions: by channel                       │   used, skills run, │
│  skills: type, used,  │  skills: by category, variants after their base│   deliveries        │
│   category            │  media: grid · inbox triage · duplicates       │  skill: runs, drift │
│  media: kind, subject,│   (hover a card for a bigger look)             │  item: rate, tag    │
│   tags, quality, …    │                                                │                     │
└───────────────────────┴────────────────────────────────────────────────┴─────────────────────┘
```

## What it reads

Only three things, so a visit costs a dozen small reads and no folder walk:

| What | Where | Written by |
| --- | --- | --- |
| The skill registry | `skills.json` at the repo root (`mediamake.skills/v1`), read at build time | `node tools/skills.mjs index` |
| The library's export | `<root>/.catalog/export/*.json` (`mediamake.library-export/v1`) | the media CLI |
| Thumbnails and previews | `<root>/.catalog/thumbs/**` (paths in the export are relative to `.catalog/`) | the media CLI |

The viewer picks the `_LIBRARY` folder once, in **read** mode; it is remembered (IndexedDB) and
Chrome asks again on a new visit unless "Allow on every visit" was chosen. When the window comes
back the page reads `meta.json` alone and reloads only if `generatedAt` changed.

### The export (`lib/library/types.ts`)

- `meta.json`: `{ schema, generatedAt, counts: { items, productions, channels, skills }, root? }`
- `channels.json`: `[{ id, name, folder, projectId?, logo?, productions: [slug] }]` (`projectId`: the cloud project its team shares, `media channel link`)
- `productions.json`: `[{ slug, title, artist?, channel?, song?, status: active|delivered|uploaded, skills: [], deliverFolder?, thumbnail?, updatedAt, uses, deliveries: [{ what, path, at, status }] }]`
- `skills.json`: `[{ ...the registry entry, runs, lastRun?, productions: [slug], bestOutput?, drift? }]`
- `media-<kind>.json` for footage, overlays, images, art, music, sfx, references, fonts, 3d,
  unsorted: `[{ id, path, kind, subject?, title, tags, bytes, width?, height?, duration?, fps?, hasAudio?, rating?, notes?, source?: { tool, ref, url, pageUrl?, title, prompt?, model?, excludeStyles?, instrumental?, relation? }, lyrics?, related?: [{ relation, id }], uses: [slug], thumb?, preview?, guess?, status: online|cold|missing|remote, remote?: { channel, file }, shared?: [{ channel, uploaded }], dupes?: [path] }]`
- `runs.json`: `[{ skill, session, at, production?, verdict? }]`

Optional fields the page uses when they are there: `meta.root` (the library's absolute path, so
paths can be copied whole and shown in Finder), `preview` (a short muted loop or an audio clip in
`thumbs/`, played on hover and in the panel), `guess` (what an unsorted item probably is),
`bestOutput` as `{ thumb, production?, what?, path?, at? }` (a bare thumb path works too) and
`drift` as `node tools/skills.mjs diff --all --json` prints it. `rating` is 1–5 (a number or its
string); the `_unsorted` kind is read as `unsorted`. A missing file is empty, a broken one is
listed in a toast, and the rest still shows.

A song shows its styles (`source.prompt`), lyrics, what it was made from (`related`) and plays
(its `preview` is the song itself or a small m4a). A teammate's item (`status: remote`, from
`media sync pull`) says which channel it came through and how to bring its file here. A footage,
image, art, overlay or reference item of a linked channel has **Share with team**.

## What it writes

Nothing but **request files**, and only after the viewer edits something: the page then asks for
write access (once) and writes `<root>/.catalog/requests/<time>-<rand>.json`, which the media CLI
applies. It never writes into a skill folder or a production.

```jsonc
{ "schema": "mediamake.library-request/v1", "op": "rate", "target": "<item id>", "rating": 4, "at": "…", "from": "library-page" }
```

| `op` | `target` | fields |
| --- | --- | --- |
| `tag` | item id | `add?: []`, `remove?: []` |
| `rate` | item id | `rating`: 1–5, or `null` to clear |
| `sort` | item id | `kind` (not `unsorted`), `subject?`, `tags?`: inbox triage |
| `set-channel` | production slug | `channel`: a channel id or `null` |
| `set-thumbnail` | production slug | `item`: the library item whose picture it takes |
| `share`, `unshare` | item id | `channel?`: the user's OK for the channel's team to have the file (`media sync push` uploads it), or taking it back |

Until an export newer than an edit arrives, the edit shows as waiting (dashed) and the header
counts it.

## On the dev server

`/api/dev-library/…` (development only, like `dev-lyrics`) serves the same two folders read-only
from the library in `~/.mediamake/config.json` (`MEDIAMAKE_CONFIG` points at another file), so
`localhost` opens the library without picking a folder; edits still ask for the folder.
`/library?dev-root=<absolute path>` reads another library, e.g. a test fixture.

## Skills

The registry is the one list of skills: `tools/skills.mjs` writes it from each SKILL.md's
frontmatter (`check` fails when it is stale, in CI too), and the app imports it
(`lib/skills/registry.ts`) for the skill pages (`/skills/<name>`), this page, the catalog's skill cards and the Public
column of `/core/releases`. A
variant says `variant-of`, and `forked-from: <base>@<commit>` when `fork` made it;
`node tools/skills.mjs diff <variant>` shows what it changed against its base at the fork and what
the base changed since. Runs come from the `PostToolUse` hook on `Skill`
(`tools/skill-runs.mjs`), which appends to `<root>/.catalog/runs.jsonl` for the CLI to export.

Keys: `1`–`4` views, `/` search, `Esc` close or clear. In the inbox: `1`–`9` kind, `Enter` sort,
`←` `→` move.

Deep links: `/library?view=channels|productions|skills|media`, `&channel=<id>`,
`&production=<slug>`, `&skill=<name>`, `&item=<id>`, `&mode=inbox|dupes`.

## Code

- `lib/library/types.ts`: the registry, the export, requests and the page's shapes.
- `lib/library/source.ts`: reading the export (picked folder or dev server), writing requests.
- `lib/library/model.ts`: the export and registry as one library (pure).
- `lib/library/filter.ts`: search, facets and counts (pure).
- `lib/library/history.ts`: the picked folder and settings in IndexedDB.
- `lib/skills/registry.ts`: `skills.json` for the skill pages and `/library` (server, build time).
- `app/api/dev-library/[...path]/route.ts`: the dev server's read-only copy.
- `components/library/`: the zustand store and the UI. Folder helpers come from
  `lib/revisions/fs.ts`, Show in Finder from `lib/file-revisions/reveal.ts`.
