# Catalog releases and access

MediaMake ships skills, MCPs, apps and tutorials as **catalog items**. An item
starts private, is shared with a few people, then with your network, and
finally goes public. The repository is public, so it holds only the code for
this; the content itself lives in private storage.

## Where things live

| What | Where | Public? |
| --- | --- | --- |
| Your unreleased content | `private/` at the repo root (gitignored, CI-guarded) or any local folder | No |
| Packaged releases (`.tar.gz`) | `catalog-private/<kind>/<slug>/<version>.tar.gz` in `CATALOG_BUCKET` (falls back to `SPACES_BUCKET`), stored without a public ACL | No |
| Card data (title, summary, stage, versions) | MongoDB `catalog_items` | Only what a viewer may see |
| Grants, groups, invites, requests, download log | MongoDB `access_grants`, `access_groups`, `access_invites`, `access_requests`, `catalog_downloads` | No |

Item ids look like `skill/lyric-video`.

## Stages

| Stage | Who can open it |
| --- | --- |
| `private` | Admins and anyone with a grant |
| `network` | The above, plus members of the `network` group |
| `public` | Everyone, once public releases are open (see below) |

**Releases are locked for now.** Until `MEDIAMAKE_PUBLIC_RELEASES=open` is set,
a `public` item needs a grant too (members of the `network` group see it).
Items a viewer can't open are **hidden**: no card, and their pages and API
links answer 404 as if they didn't exist. Signed-out visitors see nothing.
Setting the variable later opens `public` items to everyone, with no other
change.

Public items install the same way as private ones: open the card, copy the
prompt. While releases are locked, a `public` item still needs a grant (or
the `network` group); after `MEDIAMAKE_PUBLIC_RELEASES=open` everyone sees
its card, signed in or not. Installing always needs a MediaMake account,
because the install plan and packages are fetched with the person's API key.

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

# Release (or re-release with a new version). Reads SKILL.md front matter and
# an optional catalog.json next to it. Leaving --stage out keeps the current stage.
npm run catalog -- release ../../private/skills/lyric-video --stage private --version 1.0.0

# Share with a few people
npm run catalog -- grant skill/lyric-video --to <clientId> --days 30
npm run catalog -- invite skill/lyric-video --uses 5 --days 30   # prints a /access?code=… link

# Bring people into your network circle (they see every `network` item)
npm run catalog -- group add network <clientId> <clientId>
npm run catalog -- invite --group network --uses 20              # or let them join by invite

# Move it along
npm run catalog -- promote skill/lyric-video network
npm run catalog -- promote skill/lyric-video public

# Requests from the "Request access" button
npm run catalog -- requests
npm run catalog -- approve <requestId> --days 30

# Take access back
npm run catalog -- revoke skill/lyric-video --to <clientId>
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

## One-prompt installs

Anyone with access installs an item by pasting this into Claude. Its card on
the homepage has a **Copy install prompt** button and links to
`/access?item=<id>`, which shows the prompt too (`listCatalog` returns it as
`installPrompt`):

> Set up mcp/get-into-zone from MediaMake (https://your-site) by following https://github.com/microfox-ai/mediamake/blob/main/install.md

[`install.md`](../../../install.md) walks Claude through GitHub (account,
`git`, `gh auth login`), the person's MediaMake API key, and then the plan
from `GET /api/catalog/install?item=<id>`: every dependency in order, each
once, with 30-minute package links. A dependency the person can't open stops
the plan with a 409 instead of half-installing.

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
        "asset": "get-into-zone-chrome.zip",
        "name": "Get into zone Chrome extension",
        "kind": "chrome-extension",
        "guide": "https://github.com/microfox-ai/extensions#install-get-into-zone"
      }
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
  to be public); a database item with the same id wins.
- `/access?item=<id>` shows an item you can open with its install prompt and
  a download; `/access?code=<code>` redeems an invite (the way new people get
  in while releases are locked).

HTTP endpoints (`/api/catalog/*` skip the API-key middleware and resolve the
session cookie or Bearer key themselves):

| Endpoint | Purpose |
| --- | --- |
| `GET /api/catalog?kind=skill` | Catalog as the caller sees it |
| `GET /api/catalog/download?item=<id>[&version=][&redirect=1]` | 5-minute signed link, logged; 404 when locked |
| `GET /api/catalog/install?item=<id>` (Bearer API key) | Ordered install plan with dependencies; 404 when locked, 409 when a dependency is |
| `POST /api/catalog/redeem { code }` | Redeem an invite |
| `GET/POST /api/catalog/access-requests` | List / create the caller's access requests (off while releases are locked) |
| `GET/POST /api/admin/catalog` | Admin: items, versions, grants, groups, invites, requests |

`MEDIAMAKE_ACCESS_GRANTS=clientId:skill/lyric-video|mcp/*,clientId2:*` still works as a
fallback when no database is configured.
