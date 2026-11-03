# Catalog releases and access

MediaMake ships skills, MCPs, apps, tutorials and courses as **catalog
items**. An app, MCP, tutorial or course starts private, is shared with a few
people, then with your network, and finally goes public. The repository is public, so it holds only
the code for this; their content lives in private storage.

**Skills are public by default.** Every skill's files are committed in the repo
(`.agents/skills/`, listed in `SKILLS.md`), so nothing about a skill is hidden:
a `skill/…` item is always public and open to everyone, even while public
releases are locked. It sits in the Public column of the dashboard, `release`
publishes it as public, and `promote`, `schedule` and `vault` refuse it
(`isAlwaysPublic` and `ALWAYS_PUBLIC_KINDS` in `lib/catalog/types.ts`; skill
items stored with another stage from before this rule are moved to public the
next time the dashboard loads). Everything below about stages, gates and the
vault is for apps, MCPs and tutorials.

**So are items made by others.** An open-source MCP or skill, or an MCP its
maker hosts, that an admin lists in the catalog (ElevenLabs, fal, Blender)
has nothing of ours in it to hold back: it is always public too, and it
installs from where it lives, not from a package of ours. See
[Items made by others](#items-made-by-others).

## Where things live

| What | Where | Public? |
| --- | --- | --- |
| Skills | `.agents/skills/` (committed; `.claude/skills/` links to them) | Yes, always |
| MCPs and skills made by others | `lib/catalog/third-party.json` (committed), or MongoDB `catalog_items` for ones added with `npm run catalog -- add` | Yes, always |
| Cards for our apps and the MediaMake MCP | `lib/catalog/items.ts` (committed). A card can carry an `install` spec: the MediaMake MCP installs its hosted connector (`/mcp`), for admins and private testers while it is in development; grants and invites can name a card too | As each card says |
| Your unreleased MCPs and apps | `private/` at the repo root (gitignored, CI-guarded) or any local folder | No |
| Packaged releases (`.tar.gz`) | `catalog-private/<kind>/<slug>/<version>.tar.gz` in `CATALOG_BUCKET` (falls back to `SPACES_BUCKET`), stored without a public ACL | No |
| Card data (title, summary, stage, versions) | MongoDB `catalog_items` | Only what a viewer may see |
| Videos: a skill's intro, tutorials, courses' lessons | MongoDB `catalog_videos` (YouTube links only) | As shared as the item they belong to |
| Grants, groups, invites, requests, download log | MongoDB `access_grants`, `access_groups`, `access_invites`, `access_requests`, `catalog_downloads` | No |

Item ids look like `mcp/browse-hack` or `skill/lyric-video`.

## Items made by others

MediaMake also lists MCPs and skills we don't build, so our skills can point
people at them and one prompt installs them: open-source ones (a repo and a
licence) and hosted ones from their makers. Only admins list them, in one of
two ways:

- **In the repo**: add an entry to
  [`lib/catalog/third-party.json`](../lib/catalog/third-party.json) in a PR.
  It is live on the next deploy, and CI can see it (skills' MCP tables are
  checked against it).
- **Without a deploy**: `npm run catalog -- add elevenlabs.catalog.json`,
  with a file shaped like one of those entries. The stored item wins over
  the repo's.

An entry is a card plus `madeBy` and `install.source`:

```json
{
  "id": "mcp/elevenlabs",
  "title": "ElevenLabs",
  "summary": "Sound effects, speech, voices and transcription, as files on your computer.",
  "madeBy": { "name": "ElevenLabs", "repo": "elevenlabs/elevenlabs-mcp", "license": "MIT" },
  "install": {
    "source": {
      "type": "mcp-server",
      "name": "elevenlabs",
      "local": {
        "command": "uvx",
        "args": ["elevenlabs-mcp"],
        "env": [{ "name": "ELEVENLABS_API_KEY", "description": "Your ElevenLabs API key", "getAt": "https://elevenlabs.io/app/settings/api-keys", "secret": true, "required": true }]
      },
      "guide": "https://github.com/elevenlabs/elevenlabs-mcp#readme"
    },
    "notes": "Needs an ElevenLabs account and uv. Every generation spends credits."
  }
}
```

- `madeBy`: who makes it (`name`), and for open source its `repo` and
  `license`; a hosted one gives its `homepage`. Cards show "Open source · by
  ElevenLabs · MIT", or "By fal".
- `install.source` (`InstallSource` in `lib/catalog/types.ts`):
  - `{ "type": "mcp-server", "name", "local"?, "remote"?, "mcpb"?, "setup"?, "guide"? }`:
    `local` runs on the person's machine (`command`, `args`, `env`), `remote`
    is hosted (`url`, `headers`, and a `connectorUrl` when the Claude apps
    sign in at another URL), `mcpb` is a bundle on a GitHub release. Give at
    least one; install.md picks what fits the person's Claude. Each `env` /
    `headers` entry says what the value is, where to get it (`getAt`), how
    it's written (`format`, e.g. `Bearer {value}`) and whether it's a
    `secret`. `setup` is what comes after adding the server, in order (an
    add-on to enable).
  - `{ "type": "github-skill", "repo", "path", "ref"? }`: a skill folder in a
    public repo.
- They have no versions: `release` refuses one (use `add`), and the gate
  commands refuse them, like skills. The dashboard shows them in Public.

The repo's own skills install the same way, from their folder here
(`github-skill` at `.agents/skills/<name>`), with the MediaMake repo first
(they work on its apps and scripts) and the skills they depend on. A skill
vendored from another repo (`skills-lock.json`, e.g. `remotion-dev/skills`)
is shown as made by its upstream and installs on its own.

## Seeing what is what: the release pages

Releases are mostly done by Claude, from a terminal; the dashboard is where
to look. **`/core/releases`** opens on **Items**: every item by kind, with
who can open it, where it comes from and what it connects to. Each item has
its own page, **`/core/releases/<kind>/<slug>`** (e.g.
`/core/releases/mcp/browse-hack`), that answers everything about it on one
screen:

- **What installing it does**: the plan install.md follows, step by step,
  and the choices it offers (a skill's MCPs).
- **Connections**: what it needs first, what it works with (and what is lost
  without each), and what needs or uses it.
- **Who can open it**: its tier, the gate, the groups and grants that reach
  it (**Manage access** opens the access sheet).
- **Where it lives**: who makes it, its code, its package (version, size,
  storage key), how it installs, and which file or store defines it.
- **History**: versions with their notes (`#v<version>` links straight to
  one) and every stage change.

The page reads `GET /api/admin/catalog/item?id=<id>`, which changes nothing
(the dashboard's own `GET /api/admin/catalog` also settles due gates).
`npm run catalog` prints the item's page after each step, and Claude gives
it to you after any release (the rule is in the repo's CLAUDE.md).

## Archiving

An item that is unused or no longer important can be **archived**: it leaves
the homepage (every tab) and moves to a folded **archived** group at the end
of `/skills`, but nothing else changes. It keeps its tier and access, its page
and install prompt still work, and items that need or use it still install
it. Any item can be archived, a skill from the repo too, so the archive is
kept apart from the items, in MongoDB `catalog_archive` (`ArchiveMark`:
when, by whom, and an optional note shown on its release page). `/skills`
picks changes up within five minutes; the homepage and the release pages at
once.

- On the item's release page: **Archive** / **Unarchive**.
- From a terminal: `npm run catalog -- archive skill/a skill/b [--note "why"]`,
  and `--off` to bring them back.
- From Claude: the MediaMake MCP's `catalog_archive` (below).
- Admin API: `{ type: 'set_archived', itemIds, archived, note? }`.

## Videos: intros, tutorials and courses

Every video is a YouTube video, embedded with YouTube's player: nothing else
is hosted or played. Each one has its own **title, description and
thumbnail**, edited on its item's release page. The thumbnail is one uploaded
there (`create_thumbnail_upload`, public once uploaded) or pasted as a link;
without one it is YouTube's, `https://img.youtube.com/vi/<id>/maxresdefault.jpg`
(swapped for `hqdefault.jpg` on videos too old to have a maxres one).

- **A skill's intro** (or an MCP's or app's): paste its YouTube link under
  **Intro video** on its release page, e.g. `/core/releases/skill/pack-brand-kit`.
  It plays on the item's page (`/access?item=skill/pack-brand-kit`), and its
  thumbnail tops the item's card on the homepage. Like the archive, videos are
  kept apart from the items (`catalog_videos`, keyed by item id), so a skill
  from the repo gets one without being stored as an item.
- **Tutorials** (`tutorial/<slug>`): one YouTube video each, added with **New
  tutorial** on `/core/releases`. A tutorial is its video: its card takes the
  video's title and the first paragraph of its description. It plays on
  `/access?item=tutorial/<slug>`.
- **Courses** (`course/<slug>`): tutorials played in order, added with **New
  course**, their lessons picked and ordered on the course's release page. The
  course page, `/courses/<slug>`, plays each lesson and moves to the next when
  it ends; `?lesson=<n>` opens on one. Its thumbnail defaults to its first
  lesson's.

Tutorials and courses go through the gated releases like apps and MCPs: they
start in development and move on the Board. A course shows each viewer only
the lessons they can open. On the homepage, both are on the Tutorials tab, and
every skill card has a picture on top: its intro's thumbnail, or its name on a
colour of its own (the same colour every time, `placeholderBackground` in
`lib/catalog/video.ts`).

Admin API (`POST /api/admin/catalog`):

- `{ type: 'set_video', itemId, video: { url, title, description?, thumbnail? } }`:
  any item's video; a course gives `lessons` (tutorial ids, in order) instead of
  a `url`. `video: null` removes it. Links that aren't one YouTube video are
  refused (`parseYouTubeId`).
- `{ type: 'create_video_item', kind: 'tutorial' | 'course', slug, video, visibility? }`:
  a new tutorial or course with its video.
- `{ type: 'create_thumbnail_upload', itemId, filename, contentType }`: a signed
  link to upload a thumbnail image to.

From Claude, the MediaMake MCP's `catalog_set_video` and `catalog_add_video_item`
do the same (see below).

## From Claude: the MediaMake MCP's catalog tools

The MediaMake MCP (the hosted connector at `/mcp`, or the local `.mcpb`)
manages the catalog for admins, so releases can be run by asking Claude.
They call the admin API with the person's own key, so they work only for
admins, and each answers with the release page of every item it touched.

| Tool | Does |
| --- | --- |
| `catalog_items` | Every item in a line (`GET /api/admin/catalog/items`): tier, where it comes from, archived, what it works with, what uses it, its page. Filters: kind, tier, archived, words. |
| `catalog_item` | One item's page as data: access and grants, where it lives, the install steps and choices, what uses it, versions and notes. |
| `catalog_archive` | Archive items, or bring them back (`archived: false`), with a note. |
| `catalog_set_stage` | Move one of our apps, MCPs, tutorials or courses to development, community (optionally with a gate), public or the vault, taking it out of the vault first when needed. Skills and items made by others refuse: archive them instead. |
| `catalog_add_third_party` | List or update an MCP or skill made by others (`madeBy` + `install.source`), like `npm run catalog -- add`. |
| `catalog_set_video` | Set, change or remove an item's video (`set_video`): a skill's intro, a tutorial's video, a course's lessons. Fields left out keep what the item has; `remove: true` takes it off. On the local server `thumbnailFile` uploads a thumbnail (`create_thumbnail_upload`) after the rest is saved. |
| `catalog_add_video_item` | Add a tutorial or course (`create_video_item`), its slug made from the title unless given. It starts in development. |
| `catalog_invite` | An invite link that opens gated items for the people it is sent to, or (with `group`) makes them private testers or community members. |
| `catalog_people` | The private testers, the community and everyone else with a key, plus tier invite links and pending requests. |
| `catalog_set_tier` | Make people private testers, community or public, by client id or the name on their key. |
| `catalog_versions` | Live versions and release notes (anyone, for updates). |

## Tiers

Every item sits in one tier, and every person belongs to one. The admin
dashboard at **`/core/releases`** shows both and is where you move things
along; the CLI below does the same from a terminal.

| Item tier | Stored as | Who can open it |
| --- | --- | --- |
| **Vault** | `neverPublish: true` | Admins, and grants that name the item itself. Can't be moved to community or public until taken out of the vault. |
| **In development** | `visibility: private` | Admins, private testers, and grants |
| **Community** | `visibility: network` | The above, plus the community (`network` group) |
| **Public** | `visibility: public` | Everyone, once public releases are open (see below) |

| Person tier | How they get it | What they can do |
| --- | --- | --- |
| **Admin** | `isAdmin` on their Redis profile | Everything. The only one who releases. |
| **Private** | member of the `private` group (or a `*` grant) | Open every item except the vault, with no per-item grants: every MCP, app or tutorial in development opens to them the moment they are added, and so does each one released later. Can't release. |
| **Community** | member of the `network` group (or an invite into it) | Open community and public items before they go public. |
| **Public** | everyone else | Open public items once releases are open. |

An API key only signs someone in; it opens nothing beyond public items by
itself. That includes the hosted MediaMake MCP (`/mcp`): who may connect
follows the `mcp/mediamake` item like any other release, so while it is in
development only admins, private testers and people granted it get past the
consent screen and the endpoint (others see why, and a 403). Moving the item
to community or public opens the connector to them with no code change
(`lib/mcp/access.ts`).

**Adding a private tester** is one step, and it is all they need:
`npm run catalog -- group add private <clientId>`, or set their tier to
Private under **People → API key holders**. The tier decides the rest, and the
admin sets it per person under **People → API key holders** on the dashboard
(`set_tier` in the admin API). Cloud projects are for the community, private
testers and admins (`canUseCloudProjects(tier)`); public users keep projects
local.

`viewerTier(entitlements)` / `getViewerTier(viewer)` in `lib/access` return a
person's tier for features that depend on who someone is (render routing,
for example). Item access always goes through `accessLevel`.

### Gated releases

A community item can carry a gate: `publicAt`, a date when it turns public by
itself. **Mark ready and start gate** on the dashboard (or `schedule`) moves an
item from development to community and sets the gate, 30 days by default.
Access treats the item as public from that moment (`effectiveVisibility`); the
next time the dashboard loads, the change is recorded in `stageHistory` with
`by: 'gate'`. Moving an item by hand (release now, back to development, into
the vault) cancels its gate.

**Releases are locked for now.** Until `MEDIAMAKE_PUBLIC_RELEASES=open` is set,
a `public` item needs a grant too (the community and private testers see it),
and that includes items whose gate has ended. The dashboard says so at the top.
Items a viewer can't open are **hidden**: no card, and their pages and API
links answer 404 as if they didn't exist. Signed-out visitors see nothing.
Setting the variable later opens `public` items to everyone, with no other
change.

Public items install the same way as private ones: open the card, copy the
prompt. Installing always needs a MediaMake account, because the install plan
and packages are fetched with the person's install code or API key.

## Who has access

Every way someone gets access is a record, never a code change:

| Record | Created by | Collection |
| --- | --- | --- |
| Grant to a person or group (with expiry, note, and the invite it came from) | `grant`, `approve`, redeeming an invite | `access_grants` |
| Group membership (`network`, …) | `group add` | `access_groups` |
| Invite links and how often they were used | `invite` | `access_invites` |
| Requests from the "Request access" button | the person | `access_requests` |
| Each package download | `/api/catalog/download` | `catalog_downloads` |

`npm run catalog -- list` prints every item with its live grants (who, until
when, via which invite) and every group with its members. `revoke` marks a
grant revoked rather than deleting it, so the history stays.

## Setup (once)

1. In `.env.local` for the CLI: `MEDIAMAKE_URL` (the deployed app) and
   `MEDIAMAKE_ADMIN_KEY` (an API key of a client with `isAdmin`, set with
   `HSET user:<clientId> isAdmin true`).
2. Optional but recommended: a separate private bucket for releases via
   `CATALOG_BUCKET` (and `CATALOG_SPACES_ENDPOINT`,
   `CATALOG_SPACES_ACCESS_KEY_ID`, `CATALOG_SPACES_SECRET_ACCESS_KEY` if it uses
   other credentials). Keep file listing turned off on it.
3. `npm run catalog -- init` creates the database indexes.

## Day to day

```bash
cd apps/mediamake

# Release (or re-release with a new version). Reads the bundle's manifest (or a
# SKILL.md's front matter) and an optional catalog.json next to it. Leaving
# --stage out keeps the current stage. A skill is always released as public.
# Release notes are required (see below).
npm run catalog -- release ../../private/mcps/browse-hack.mcpb --stage private --version 1.0.0 --notes "What changed"

# Share with a few people
npm run catalog -- grant mcp/browse-hack --to <clientId> --days 30
npm run catalog -- invite mcp/browse-hack --uses 5 --days 30   # prints a /access?code=… link

# Tiers of people
npm run catalog -- group add private <clientId>                  # private testers: everything but the vault
npm run catalog -- group add network <clientId> <clientId>       # community: every `network` item
npm run catalog -- invite --group network --uses 20              # or let them join the community by invite

# Move it along
npm run catalog -- schedule mcp/browse-hack --days 30            # community now, public by itself in 30 days
npm run catalog -- unschedule mcp/browse-hack                    # keep it with the community, no date
npm run catalog -- promote mcp/browse-hack public                # release now
npm run catalog -- vault app/brand-internals                     # never publish (--off to take it out)

# Requests from the "Request access" button
npm run catalog -- requests
npm run catalog -- approve <requestId> --days 30

# Take access back
npm run catalog -- revoke mcp/browse-hack --to <clientId>
npm run catalog -- list
```

`catalog.json` (all optional):

```json
{
  "kind": "skill",
  "slug": "lyric-video",
  "title": "Lyric Video",
  "summary": "Turns a song and its lyrics into a timed lyric video.",
  "version": "1.0.0",
  "visibility": "private",
  "status": "beta",
  "listed": true,
  "tags": ["video", "music"],
  "cover": "https://…/cover.png"
}
```

Versions are immutable: releasing the same version twice is refused, so bump it.

### Release notes

Every release carries notes saying what changed; `publish_version` refuses
one without them. `release` takes them from `--notes "…"`, `--notes-file
notes.md`, or the section for that version in a `CHANGELOG.md`: inside a
skill or app folder, or beside an `.mcpb` (`<name>.CHANGELOG.md` or
`CHANGELOG.md`). Headings like `## 1.2.0`, `## v1.2.0` and
`## [1.2.0] - 2026-11-02` all work.

The live version and the notes show on the item's card and its page
(`/access?item=<id>`, newest first), in `GET /api/catalog/versions`, and in
what installed items report when they update (Browse Hack's `get_status`
and `update_browse_hack` tools).

Browse Hack's MCP (`mcp/browse-hack`, in microfox-ai/extensions) is released
by that repo's CI on every merge to main that changes `mcp/`, with the notes
from `mcp/CHANGELOG.md`; see its `.github/workflows/release-browse-hack-mcp.yml`.

## One-prompt installs

Anyone with access installs an item by pasting this into Claude. Its card on
the homepage has a **Copy install prompt** button and links to
`/access?item=<id>`, which shows the prompt too (`listCatalog` returns it as
`installPrompt`):

> Set up mcp/browse-hack from MediaMake (https://your-site) by following https://github.com/microfox-ai/mediamake/blob/main/install.md

[`install.md`](../../../install.md) walks Claude through GitHub (account,
`git`, `gh auth login`), the person's MediaMake API key, and then the plan
from `GET /api/catalog/install?item=<id>`: every dependency in order, each
once, with 30-minute package links. A dependency the person can't open stops
the plan with a 409 instead of half-installing.

### What an item works with: choices

Some things an item uses are worth having but not worth forcing: a brand kit
can't make sound without ElevenLabs, researches much faster with Browse Hack,
and only sometimes wants fal. Those go in `install.uses`, each with how much
the item needs it, what for, and what the person loses without it:

```json
{ "id": "mcp/elevenlabs", "need": "required", "for": "Sound effects for intros and end screens", "without": "No sound at all" }
```

`need` is `required` (its main job needs it), `recommended` (it works
without, worse or slower) or `optional`. The plan returns them as `choices`
(strongest first, each with its `reasons`), and the steps they bring, their
own dependencies included, are marked `forChoices`. install.md asks the
person which to add, says what each one they skip costs, and installs only
the steps of the ones they take. A choice they can't get from MediaMake (not
shared with them, or not in the catalog) comes back `available: false`, in
the same words either way, instead of failing the plan. Only what is
installed outright brings choices: a choice's own `uses` are left out.

**Skills declare theirs in SKILL.md**, in the table the skill also reads when
it runs (by convention under `## First: check the MCPs`):

```markdown
| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/elevenlabs` | required | Sound effects for intros and end screens (`text_to_sound_effects`) | No sound at all |
| `mcp/browse-hack` | recommended | Pinterest research boards and Midjourney art | Research by hand in the browser |
```

`node tools/skills.mjs index` puts the table in `skills.json` as the skill's
`mcps` (the catalog's `uses`, also for a skill released as a package that
declares none of its own), SKILLS.md and `/skills` show them, and `check`
(CI) fails on a table it can't read. Each MCP is one of ours or an item made
by others; publishing a skill that names another one warns to list it in
`third-party.json`.

Declare what an item needs in `catalog.json` under `install`:

```json
{
  "install": {
    "method": "skill",
    "requires": [
      { "type": "repo", "repo": "microfox-ai/mediamake", "why": "The skill renders with the mediamake presets" },
      { "type": "item", "id": "skill/remotion-basics" },
      {
        "type": "github-release",
        "repo": "microfox-ai/extensions",
        "asset": "browse-hack-chrome.zip",
        "name": "Browse Hack Chrome extension",
        "kind": "chrome-extension",
        "guide": "https://github.com/microfox-ai/extensions#install-browse-hack"
      }
    ],
    "uses": [
      { "id": "mcp/elevenlabs", "need": "optional", "for": "Sound effects on the intro", "without": "A silent intro" }
    ],
    "notes": "Shown to the person before installing."
  }
}
```

- `method` defaults from the kind: skills unpack into `~/.claude/skills/<slug>`,
  MCPs open their `.mcpb` (`entry`), apps follow their INSTALL.md.
- Put an `INSTALL.md` in the package for the item's own setup (settings to
  fill in, a check that it works). It stays private with the package.
- MCPs: `npm run catalog -- release path/to/name.mcpb` releases the bundle
  as is. Name, version and description come from the bundle's
  `manifest.json`; put a `name.catalog.json` beside it (or pass
  `--manifest`) for the title, summary and `install` block, and a
  `name.INSTALL.md` for its setup steps.

## Updates

The end of an install (install.md step 5) leaves two files on the person's
machine: `~/.mediamake/installed.json` (what was installed, which version,
where) and an **update token** in `~/.mediamake/config.json` (`updateToken`,
traded for the install code with `POST /api/catalog/update-token`). The token
stands for the person and the items installed with it plus their
dependencies, works only for `GET /api/catalog/versions` and
`GET /api/catalog/install` on those items, is stored hashed in Redis
(`lib/catalog/update-token.ts`), renews with use and lapses after a year
unused. Access is still checked on every call, so revoking a grant stops
updates as well. Installing another item with an install code adds it to the
same token.

With it:

- "update <item>" in Claude follows install.md's **Update an installed
  item**: compare installed versions with `/api/catalog/versions`, show the
  release notes in between, reinstall what's behind. The
  `update-mediamake-items` skill (installed by step 5 for Claude Code) points
  Claude there.
- MCPs can update themselves. Browse Hack's server polls `versions` every
  few hours, installs a newer `.mcpb` into `~/.mediamake/mcp/browse-hack`
  (checked against the plan's sha256), and updates its Chrome extension from
  GitHub Releases. `"autoUpdate": false` in the config turns that off.

## For the app

```ts
import { getViewer, canAccess } from '@/lib/access';
import { listCatalog } from '@/lib/catalog';

const viewer = await getViewer(); // { clientId } from the session cookie
const skills = await listCatalog(viewer, 'skill');
// → CatalogEntry[]: CatalogItem & { access: 'open' | 'granted' | 'locked' };
//   only items the viewer can open; installable ones carry installPrompt
```

- `canAccess(viewer, { id, visibility })` answers one item.
- `getEntitlements(viewer)` + `accessLevel(entitlements, item)` answer many
  items with one database round trip.
- `lib/catalog/items.ts` holds cards defined in code (only names that are fine
  to be public), the registry's skills and `third-party.json`'s items; a
  database item with the same id wins. `getCatalogRecord(id)`
  (`lib/catalog/records.ts`) gives either, for install plans and pages.
- `lib/catalog/plan.ts` builds install plans (`planInstall`, tested in
  `plan.test.ts`); `lib/catalog/install.ts` hands it the database, storage
  and the viewer's access.
- `/access?item=<id>` shows an item you can open with its install prompt and
  a download; `/access?code=<code>` redeems an invite (the way new people get
  in while releases are locked).

HTTP endpoints (`/api/catalog/*` skip the API-key middleware and resolve the
session cookie or Bearer key themselves):

| Endpoint | Purpose |
| --- | --- |
| `GET /api/catalog?kind=skill` | Catalog as the caller sees it |
| `GET /api/catalog/download?item=<id>[&version=][&redirect=1]` | 5-minute signed link, logged; 404 when locked |
| `GET /api/catalog/install?item=<id>` (Bearer install code, update token or API key) | Ordered install plan with dependencies; 404 when locked, 409 when a dependency is |
| `GET /api/catalog/versions?items=<id>,<id>[&notes=10]` (Bearer update token, install code or API key) | Live version of each item and its releases with notes, newest first; no links, not logged |
| `POST /api/catalog/update-token { token? }` (Bearer install code) | Trades an install code for an update token (or adds the item to `token`) |
| `POST /api/catalog/redeem { code }` | Redeem an invite |
| `GET/POST /api/catalog/access-requests` | List / create the caller's access requests (off while releases are locked) |
| `GET/POST /api/admin/catalog` | Admin: items, versions, grants, groups, invites, requests, API key holders; `schedule_release`, `cancel_release`, `set_never_publish`, `set_archived`, `set_video`, `create_video_item`, `create_thumbnail_upload` |
| `GET /api/admin/catalog/items[?kind=][&tier=][&archived=][&q=]` | Admin: every item in a line (`ItemSummary`), read-only |
| `GET /api/admin/catalog/item?id=<id>` | Admin: one item as its release page shows it, read-only |

`MEDIAMAKE_ACCESS_GRANTS=clientId:skill/lyric-video|mcp/*,clientId2:*` still works as a
fallback when no database is configured.
