# Editor Collaboration — Versioning, Publishing and Merging

How two people work on the same project without wiping out each other's changes.

Covers timeline versioning, layer state versioning, the 3-way merge, history
panels, the diff viewer, and project sharing roles.

---

## How it works

The editor saves locally first. You edit freely, and nothing reaches the team
until you publish. Three copies of the data matter:

| Copy | Where it lives | What it is |
|---|---|---|
| **local** | Zustand store + `localStorage` | What you are looking at right now. |
| **base** | `publishedBaselineById` / `loadBaselineById` | The team's version your edits started from. |
| **remote** | MongoDB | The latest published version, which a teammate may have moved on. |

Publishing sends **local** to the server and moves **base** forward. If
**remote** changed while you were editing, all three go into a 3-way merge.

This happens on two separate tracks:

- **Timelines** — the preset list, configuration, and default data.
- **Layer state** — per-node overrides, structure, hidden and locked layers.

They version and publish separately. So editing layers never blocks a teammate
from publishing a timeline.

---

## Version checking

Every timeline document has a `version` number that goes up by one each publish,
plus a `lastClientId`.

`PUT /api/project/timeline` compares the version you send against the stored
one:

```ts
const storedVersion = timeline.version ?? 0;
const clientVersion = updates.version;
if (typeof clientVersion === 'number' && clientVersion !== storedVersion) {
  return NextResponse.json({
    error: 'Version conflict: another client published this timeline after you loaded it.',
    code: 'VERSION_CONFLICT',
    currentVersion: storedVersion,
    lastClientId: timeline.lastClientId ?? 'unknown',
  }, { status: 409 });
}
```

Two things were done on purpose here:

- **The check only runs if you send a version.** Anything that does not send one
  keeps the old last-write-wins behaviour. So older code keeps working.
- **The version you send is the one the server last gave you** — from your last
  load or publish. It is never the version sitting on the edited timeline object
  in memory. Undoing and redoing locally can leave a stale version on that
  object, and sending it would cause conflicts that are not real.

Layer state does the same thing with `stateVersion` in the layer-state store.

### A known problem

The check reads and then writes, instead of doing both in one step. `PUT` calls
`findOne`, compares, then calls `updateOne({ _id })` — and that filter does not
check the version again.

Two publishes landing in the same millisecond can both read version *N*, both
pass the check, and both write. The window is small, but it is real.

The fix is to put the version in the update filter and check `matchedCount`:

```ts
const res = await collection.updateOne(
  { _id: objectId, version: storedVersion },
  { $set: updateData }
);
if (res.matchedCount === 0) return conflict409();
```

---

## The 3-way merge

Getting a 409 does **not** mean "your work is gone, start again". It starts a
merge.

### Timelines — `lib/editor/timeline-merge.ts`

`mergeTimelines(base, local, remote)` looks at every preset id found in any of
the three copies. For each one it works out `localChanged` and `remoteChanged`,
then:

| You changed it | They changed it | Result |
|---|---|---|
| no | no | keep it as it is |
| yes | no | use yours, note it in `autoMerged` |
| no | yes | use theirs, note it in `autoMerged` |
| yes | yes, same result | use it, no conflict |
| yes | yes, differently | **conflict** |

Adding and removing fall out of this on their own: if it is missing from `base`
it was added, if it is missing from `local` it was removed. `configuration` and
`defaultData` go through the same rules.

The function gives you back:

```ts
{
  conflicts: TimelineConflict[],   // only the real ones
  autoMerged: string[],            // plain-English list of what merged by itself
  build: (choices) => Timeline     // apply the user's picks
}
```

`build` works out the preset **order** in a fixed way — your order first, then
presets only they have, then presets only in the base. It starts from the remote
document so the merged timeline keeps the remote `version` and `lastClientId`.
The caller then publishes at that remote version.

### Layer state — `lib/editor/layer-state-merge.ts`

Same idea, on two things:

- **Overrides**, keyed by node id. This is the common case, and it is why
  per-node merging matters: two people styling different layers never clash.
- **Structure** (`childrenData` — nodes added, removed or reordered). This is
  all-or-nothing, because merging half of one person's structure with half of
  another's would give you a tree nobody designed.

`hiddenLayerIds` and `lockedLayerIds` are combined rather than merged. They are
just view settings, and losing someone's "hidden" flag is worse than keeping
both.

### What happens after a 409

`publishTimeline` does this:

1. Fetch the remote document.
2. Merge it against `publishedBaselineById` (or `loadBaselineById` if that is
   missing).
3. **No conflicts** → apply the merge, set the local version to the remote one,
   and publish again. You see *"Merged teammate's changes & published"* and are
   never interrupted.
4. **Conflicts** → save a `pendingTimelineMerge` and open the dialog.

A module-level `_tlMergeRetry` flag stops this looping. A second 409 during the
retry is treated as a real conflict.

### The conflict dialogs

`TimelineMergeDialog` and `LayerMergeDialog` show one row per conflict with a
**Mine / Theirs** switch, plus the `autoMerged` list so you can see what was
handled for you. The default pick is `mine`.

Confirming calls `build(choices)` and publishes at the remote version.
Cancelling leaves your local edits alone.

---

## History

Both tracks keep a record that only gets added to, written when you publish.

| | Timelines | Layers |
|---|---|---|
| Endpoint | `/api/project/timeline/edit-history` | `/api/project/timeline/layer-history` |
| Collection | `timelineEditHistory` | layer history collection |
| Panel | `TimelineHistoryPanel` | `LayerHistoryPanel` |

Each entry stores `entryId`, `projectId`, `timelineId`, `clientId`, `timestamp`,
`description`, a `changes` list, and a full `snapshot` of what was published.
The snapshot is what makes preview and revert possible.

Writes are safe to repeat — the upsert matches on
`{ entryId, projectId, timelineId }` — so a retried publish does not create a
duplicate entry.

Reads are paged, newest first, using a `before` timestamp and a `limit` capped
at 200.

The panels let you:

- **Preview** — `startTimelinePreview` / `endTimelinePreview` show an old state
  without committing to it.
- **Revert** — `revertToTimelineState` / `resetToTimelineEntry` bring an old
  entry back as a new local edit, so you can still undo it or publish it.
- **Sync with team** — `revertToTeamBase` throws away local work in progress and
  pulls the published state.

Local undo/redo is separate and lives in the same stores (`undo`, `redo`,
`canUndo`, `canRedo`). It is scoped per tab: Ctrl/Cmd+Z on the **Timelines** tab
moves timeline history, and on the **Layers** tab it moves layer history.

### Auth on the history routes

Both routes get the caller from `getClientId(request)` — the middleware puts
`x-client-id` on every `/api/*` request from the session cookie — and then check
project access:

- **GET** — anyone with a role on the project can read.
- **POST** — only `owner` and `editor` can write, and `clientId` comes from the
  session, never from the request body.

---

## Sharing roles

`POST /api/project/share` gives someone `editor` or `viewer` on a project. The
owner is implied (`project.clientId`), and members are stored in
`project.sharedWith`.

`getProjectRole(db, projectId, clientId)` in `lib/editor/project-access.ts`
works out the role and returns `null` if there is no access. `canWrite(role)` is
the owner-or-editor check. Every project route uses this one copy.

In the UI, `isViewer` is worked out in the menubar:

```ts
const isViewer =
  currentProject != null &&
  !currentProject.isOwned &&
  currentProject.sharedRole === 'viewer';
```

Viewers get a **Viewer** badge, a clear **Sync** button, and every write turned
off — save, publish, and Ctrl/Cmd+S.

> **Gap:** *Save All Timelines* and *Save Project* are **not** disabled for
> viewers in the menubar yet. The server still rejects those writes, so this is
> a UI problem rather than a security hole, but the buttons should be greyed out.

---

## Storage keys

| Key | What it holds |
|---|---|
| `timeline-edits-storage-<projectId>` | Edited timelines, cloud and local `updatedAt` maps, `isDirty`. |
| `timeline-edit-history` | Local timeline undo/redo history. |
| `wip-layer-state-<projectId>-<timelineId>` | Layer work in progress. Cleared by *Sync with team* before reloading, so the server state applies cleanly. |

`isDirty` is saved on purpose, and is **not** recalculated from
`editedTimelines.size` when loading. That map keeps entries for timelines that
are already published, so its size does not tell you whether there are unsaved
changes.

---

## Files

**Merge logic**
- `lib/editor/timeline-merge.ts`
- `lib/editor/layer-state-merge.ts`
- `lib/editor/layer-merge.ts`
- `lib/editor/diff-utils.ts`
- `lib/editor/project-access.ts`

**Stores**
- `components/editor_main/stores/timeline-edits-store.ts`
- `components/editor_main/stores/layer-state-store.ts`
- `components/editor_main/stores/layer-history-store.ts`

**UI**
- `components/editor_main/dialogs/TimelineMergeDialog.tsx`
- `components/editor_main/dialogs/LayerMergeDialog.tsx`
- `components/editor_main/dialogs/DiffViewModal.tsx`
- `components/editor_main/panels/left/editor/TimelineHistoryPanel.tsx`
- `components/editor_main/panels/left/editor/LayerHistoryPanel.tsx`

**API**
- `app/api/project/timeline/route.ts` (the versioned PUT)
- `app/api/project/timeline/edit-history/route.ts`
- `app/api/project/timeline/layer-history/route.ts`
- `app/api/project/share/route.ts`

---

## Missing tests

`lib/editor/__tests__/` is empty and `apps/mediamake` has no test script.

`mergeTimelines` and `mergeLayerSnapshots` are plain functions that take
`(base, local, remote)` and touch nothing else. That makes them the cheapest
useful thing to test: the table above is nine cases per track, plus the order
rules and the structure conflict.

One sharp edge worth covering: `eq()` compares using `JSON.stringify`, which
**cares about key order**. Two objects that mean the same thing but had their
keys set in a different order will look like a conflict. We have not seen this
happen — both sides come from the same code — but it is waiting there.
