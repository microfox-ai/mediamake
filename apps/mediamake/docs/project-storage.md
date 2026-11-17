# Cloud project storage: a cap per membership

Cloud projects (the Spaces page, `/app/spaces`: project spaces and the files of a personal space) open at Plus. Storage is
the one thing here that costs money per person, so each membership has a cap,
and an admin can raise one person's.

| Membership | Cap |
| --- | --- |
| Public | none to use: cloud projects open at Plus |
| Plus | 5 GB |
| Pro | 25 GB |
| Cohort | 100 GB |
| Admin | no cap |

The caps are `STORAGE_CAP_BYTES` in `lib/projects/storage.ts`: change a
tier's cap there.

## What counts

Everything kept for the projects a person **owns**, whoever uploaded it
(`storageUsedBy` in `lib/projects/storage-store.ts`):

- productions and releases: every version kept, a file several versions share
  counted once. What is in a project's trash isn't counted.
- project media (`mediaFiles` with the project's id).
- the brand kit's files.

A project shared with someone counts against its owner, not against them.

## Where it is checked

Before upload links are handed out: `POST` and `PUT` of
`/api/project/productions` and `/api/project/releases`, and
`POST /api/project/media/upload`. An upload that doesn't fit is refused with
`413` and says how much is left. Brand kit uploads are counted but not
checked (their sizes aren't known until they are saved). Like the membership
check beside it, the check is off in development.

## Raising one person's cap

An admin raises it from the foot of `/app/spaces` (client id, the new cap
in GB, why), or with the API:

| Route | |
| --- | --- |
| `GET /api/project/storage` | The caller's own: `{ tier, used, cap, left, percent, near, full, raised, byProject }` in bytes; `cap: null` is no cap |
| `GET /api/admin/storage-caps` | Every raised cap |
| `GET /api/admin/storage-caps?clientId=…` | What that person stores, and their cap |
| `POST /api/admin/storage-caps` `{ clientId, gb, note? }` | Raise their cap to `gb` GB |
| `DELETE /api/admin/storage-caps?clientId=…` | Back to their membership's cap |

A raise is kept in MongoDB `storage_caps`, one per person. It counts when it
is more than their membership's cap and stays when their membership changes,
so a raise never lowers anyone.
