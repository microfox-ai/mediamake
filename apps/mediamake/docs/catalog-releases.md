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

| Stage | Who can open it | Card on the homepage |
| --- | --- | --- |
| `private` | Admins and anyone with a grant | Shown locked to everyone else |
| `network` | The above, plus members of the `network` group | Shown locked to everyone else |
| `public` | Everyone, signed in or not | Open |

Set `"listed": false` in `catalog.json` to hide an item's card from people who
cannot open it yet (its name stays secret, and its URLs answer 404).

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

## For the app

```ts
import { getViewer, canAccess } from '@/lib/access';
import { listCatalog } from '@/lib/catalog';

const viewer = await getViewer(); // { clientId } from the session cookie
const skills = await listCatalog(viewer, 'skill');
// → CatalogEntry[]: CatalogItem & { access: 'open' | 'granted' | 'locked' };
//   locked entries have no href, unlisted locked items are left out
```

- `canAccess(viewer, { id, visibility })` answers one item.
- `getEntitlements(viewer)` + `accessLevel(entitlements, item)` answer many
  items with one database round trip.
- `lib/catalog/items.ts` holds cards defined in code (only names that are fine
  to be public); a database item with the same id wins.
- Locked cards link to `/access?item=<id>`, where people sign in, request
  access, or redeem an invite. `/access?code=<code>` opens with the code filled in.

HTTP endpoints (`/api/catalog/*` skip the API-key middleware and resolve the
session cookie or Bearer key themselves):

| Endpoint | Purpose |
| --- | --- |
| `GET /api/catalog?kind=skill` | Catalog as the caller sees it |
| `GET /api/catalog/download?item=<id>[&version=][&redirect=1]` | 5-minute signed link, logged; 401/403 when locked |
| `POST /api/catalog/redeem { code }` | Redeem an invite |
| `GET/POST /api/catalog/access-requests` | List / create the caller's access requests |
| `GET/POST /api/admin/catalog` | Admin: items, versions, grants, groups, invites, requests |

`MEDIAMAKE_ACCESS_GRANTS=clientId:skill/lyric-video|mcp/*,clientId2:*` still works as a
fallback when no database is configured.
