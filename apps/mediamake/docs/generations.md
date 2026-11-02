# Generations: a channel's song takes

Every take a channel makes with an AI music tool is kept on its cloud project, so everyone the project is shared with can play, rate and reuse it. Suno is the first tool, but nothing is tied to it: each take names its `tool`.

- **Browse Hack** records each Suno take as it is made (`POST /api/generations`), files the keepers into the local media library and then sets their `libraryItem`.
- **The Projects page** has a Generations button on each project card. Its sheet plays each take, shows its styles, settings and lyrics, links to it and its parent on suno.com, and lets owners and editors rate it, add notes and keep its styles as a preset. Copy for Claude puts the take on the clipboard with a request to make more from it.
- **The MediaMake MCP** lists takes with `list_generations` and rates them with `rate_generation`.
- **Channel team sync** pulls the keepers with `GET /api/generations?projectId=<id>&rating=keeper`.

## Access

The brand kit rule (`lib/generations/access.ts`): cloud projects need community access or above (not checked on `next dev`); then anyone the project is shared with may read, and its owner and editors may write. A project the caller can't see is a 404.

## A take

| Field | |
| --- | --- |
| `id` | The take's id here |
| `projectId` | The channel's project |
| `tool`, `ref` | The tool and its id for the take (Suno's clip id), unique together |
| `kind` | `create`, `cover`, `extend`, `remaster`, `reuse` or `upload` |
| `parentRef` | The take it was made from (a cover's or an extend's source) |
| `sourceItem` | SHA-256 of the media library track it covered |
| `batchId` | Shared by the takes one request made |
| `title`, `styles`, `excludeStyles`, `lyrics`, `instrumental`, `model` | As set on the tool |
| `settings` | `vocalGender`, `weirdness`, `styleInfluence`, `audioInfluence`, `variety`, `duration`, `voice`, plus any of the tool's own (string, number or boolean values) |
| `workspace` | `{ id, name }` of the Suno workspace it was made in |
| `status` | `queued`, `generating`, `complete` or `failed` |
| `audioUrl`, `imageUrl`, `duration`, `credits` | Audio and cover URLs, seconds, credits spent |
| `rating` | `keeper`, `maybe`, `reject` or null |
| `notes` | `[{ at, by, text }]`, where `by` is a clientId |
| `usedIn` | Slugs of the productions it was used in |
| `libraryItem` | SHA-256 of its media library item, once filed |
| `clientId`, `createdBy` | Who saved it last, and who saved it first |
| `createdAt`, `updatedAt` | ISO dates. `createdAt` is the tool's when the first save carries one |
| `url`, `parentUrl` | `https://suno.com/song/<ref>` and the parent's (in responses only) |

## Routes

### `POST /api/generations`

Body `{ projectId, items: [...] }`, at most 200 takes. Each is upserted by (`tool`, `ref`), and `tool` defaults to `suno`. Only the fields a take carries are written, so a later save (the finished audio) adds to an earlier one (the prompt). A save never sets or clears `rating`, `notes`, `usedIn` or `libraryItem`, and `status` never goes back: a late `generating` after `complete` is ignored. A new take without a status is `complete` when it has audio and `queued` otherwise; without a kind it is a `create`.

A take stays in the project that first saved it. Saving it again from another project updates it there when the caller may write that project too, and skips it otherwise.

Returns `{ saved, items }`: how many takes were written, and each as stored. When some weren't, `skipped: [{ index?, ref?, error }]` says why: no ref, an unknown kind or status, an audio or image URL that isn't http(s), a `sourceItem` that isn't a SHA-256, and so on.

### `GET /api/generations`

`?projectId=&tool=&q=&rating=&model=&parentRef=&kind=&cursor=&limit=`, newest first. Returns `{ items, nextCursor }`; `nextCursor` is null on the last page, and `limit` is 50 unless set (at most 200).

- `rating`, `kind` and `model` take one value or a comma-separated list. `rating=unrated` is the takes nobody rated.
- `q` is whole words in the title, styles or lyrics (a text index with no stemming), or a suno.com/song link or song id, which finds that take and the takes made from it.
- `parentRef` is the takes made from that take.

### `PATCH /api/generations/[id]`

Body `{ rating?, note?, usedIn?, libraryItem? }`. `rating` replaces the rating (null clears it), `note` is appended as `{ at, by, text }`, `usedIn` (one slug or a list) is added, and `libraryItem` replaces the library item (null clears it). `[id]` is the take's id or its ref (a Suno song id; add `?tool=` for another tool). Owners and editors only. Returns the take.

### `GET|POST|DELETE /api/generations/presets?projectId=`

A preset is a style to start takes from: `{ id, projectId, name, tool, styles, excludeStyles, settings, createdBy, updatedAt }`. Every call returns `{ presets }`, the project's presets by name.

- `GET`, narrowed with `&tool=`.
- `POST` with body `{ name, tool?, styles, excludeStyles, settings }` saves the preset with that name for that tool. With an `id` it replaces that preset, renaming it (409 when another preset has the name).
- `DELETE` with `&id=` removes one.

## Storage

MongoDB `generations`, indexed on (`tool`, `ref`) unique, (`projectId`, `createdAt` -1) and a text index over title, styles and lyrics; and `generationPresets`, unique on (`projectId`, `tool`, `name`). `app/api/generations/model.ts` makes the indexes; `lib/generations/db.ts` holds the parsing, updates and queries (`npx tsx --test lib/generations/generations.test.ts`).
