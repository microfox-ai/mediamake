# Editor Collaboration — Versioning, Publish & Merge

How two people work on the same project without silently overwriting each other.

Covers timeline versioning, layer state versioning, the 3-way merge, history
panels, the diff viewer, and project sharing roles.

---

## The model

The editor is **local-first**. You edit freely; nothing reaches the team until
you publish. Three states matter:

| State | Where it lives | Meaning |
|---|---|---|
| **local** | Zustand store + `localStorage` | What you are looking at right now. |
| **base** | `publishedBaselineById` / `loadBaselineById` | The team state your edits diverged from. |
| **remote** | MongoDB | The latest published state, which a teammate may have advanced. |

Publishing pushes `local` and advances `base`. When `remote` moved while you
were editing, the three are fed to a 3-way merge.

This applies to two independent axes:

- **Timelines** — the preset list, configuration and default data.
- **Layer state** — per-node overrides, structure, hidden/locked layers.

They version and publish separately, so editing layers does not block a
teammate's timeline publish.

---

## Optimistic locking

Every timeline document carries a monotonically incrementing `version` and a
`lastClientId`.

`PUT /api/project/timeline` compares the client's `version` to the stored one:

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

Two deliberate design points:

- **The check is opt-in.** It only runs when the client sends a `version`.
  Callers that omit it keep the old last-write-wins behaviour, so nothing that
  predates this system breaks.
- **The version the client sends is the *synced server* version** — from the
  last load or publish — never the version baked into the edited timeline. A
  local edit/undo cycle can leave a stale version on the in-memory object, and
  sending that would produce false conflicts.

Layer state uses the same pattern via `stateVersion` in the layer-state store.

### Known limitation

The version check is a read-then-write, not an atomic compare-and-swap. `PUT`
does `findOne`, compares, then `updateOne({ _id })` — the filter does not
re-assert the version. Two publishes landing in the same millisecond can both
read version *N*, both pass the check, and both write. The window is narrow but
real.

The fix is to move the version into the update filter and check `matchedCount`:

```ts
const res = await collection.updateOne(
  { _id: objectId, version: storedVersion },
  { $set: updateData }
);
if (res.matchedCount === 0) return conflict409();
```

---

## The 3-way merge

A 409 does **not** mean "your work is lost, please revert". It triggers a merge.

### Timelines — `lib/editor/timeline-merge.ts`

`mergeTimelines(base, local, remote)` walks the union of preset ids across all
three sides. For each id it computes `localChanged = !eq(base, local)` and
`remoteChanged = !eq(base, remote)`, then:

| local | remote | Result |
|---|---|---|
| unchanged | unchanged | keep as-is |
| changed | unchanged | take yours, log to `autoMerged` |
| unchanged | changed | take theirs, log to `autoMerged` |
| changed | changed, same value | take it, no conflict |
| changed | changed, differently | **conflict** |

Add and remove fall out of this naturally: `base` undefined is an add, `local`
undefined is a remove. `configuration` and `defaultData` go through the same
logic as scalars.

The function returns:

```ts
{
  conflicts: TimelineConflict[],   // only genuine ones
  autoMerged: string[],            // human-readable log of what merged silently
  build: (choices) => Timeline     // apply the user's per-conflict picks
}
```

`build` resolves preset **order** deterministically — local order first, then
remote-only presets, then base-only — and starts from the remote document so the
merged timeline inherits its `version` and `lastClientId`. The caller then
re-publishes at the remote version.

### Layer state — `lib/editor/layer-state-merge.ts`

Same shape, two dimensions:

- **Overrides**, keyed by node id — the common case, and why per-node merging
  matters: two people styling different layers never conflict.
- **Structure** (`childrenData` — added, removed or reordered nodes) — a single
  all-or-nothing conflict, since a partial structural merge would produce trees
  neither person authored.

`hiddenLayerIds` and `lockedLayerIds` are unioned rather than merged; they are
view state, and losing someone's "hidden" flag is worse than keeping both.

### The retry loop

`publishTimeline` on a 409:

1. Fetch the remote document.
2. Merge against `publishedBaselineById` (falling back to `loadBaselineById`).
3. **No conflicts** → apply the merge, set the local version to the remote
   version, and re-publish. The user sees *"Merged teammate's changes &
   published"* and is never interrupted.
4. **Conflicts** → store a `pendingTimelineMerge` and let the dialog open.

A module-level `_tlMergeRetry` flag guards the recursion, so a second 409 during
the retry surfaces as a real conflict instead of looping.

### The conflict dialogs

`TimelineMergeDialog` and `LayerMergeDialog` present one row per conflict with a
**Mine / Theirs** toggle, plus the `autoMerged` list so the user can see what was
resolved without asking. Choices default to `mine`. Confirming calls `build(choices)`
and re-publishes at the remote version; cancelling keeps local edits untouched.

---

## History

Both axes keep an append-only audit trail, written on publish.

| | Timelines | Layers |
|---|---|---|
| Endpoint | `/api/project/timeline/edit-history` | `/api/project/timeline/layer-history` |
| Collection | `timelineEditHistory` | layer history collection |
| Panel | `TimelineHistoryPanel` | `LayerHistoryPanel` |

An entry records `entryId`, `projectId`, `timelineId`, `clientId`, `timestamp`,
`description`, a `changes` array, and a full `snapshot` of the published state.
The snapshot is what makes preview and revert possible.

Writes are **idempotent** — an upsert keyed on
`{ entryId, projectId, timelineId }` — so a retried publish does not duplicate
the entry.

Reads are paginated newest-first with a `before` timestamp cursor and a `limit`
capped at 200.

The panels support:

- **Preview** — `startTimelinePreview` / `endTimelinePreview` render a past
  state without committing to it.
- **Revert** — `revertToTimelineState` / `resetToTimelineEntry` restore an entry
  as a new local edit (so it is itself publishable and undoable).
- **Sync with team** — `revertToTeamBase` discards local work-in-progress and
  pulls the canonical published state.

Local undo/redo is separate and lives in the same stores (`undo`, `redo`,
`canUndo`, `canRedo`), scoped per tab: ⌘Z on the **Timelines** tab moves timeline
history, on the **Layers** tab it moves layer history.

### Auth on the history routes

Both routes resolve the caller from `getClientId(request)` — the middleware
injects `x-client-id` from the session cookie on every `/api/*` request — and
then check project access:

- **GET** — any role on the project may read.
- **POST** — only `owner` and `editor` may write, and `clientId` is taken from
  the session, never from the request body.

---

## Sharing roles

`POST /api/project/share` grants a client `editor` or `viewer` on a project.
The owner is implicit (`project.clientId`); members live in `project.sharedWith`.

`getProjectRole(db, projectId, clientId)` in `lib/editor/project-access.ts`
resolves the effective role and returns `null` for no access. `canWrite(role)`
is the owner-or-editor predicate. All project-scoped routes share this one
implementation.

In the UI, `isViewer` is derived in the menubar:

```ts
const isViewer =
  currentProject != null &&
  !currentProject.isOwned &&
  currentProject.sharedRole === 'viewer';
```

Viewers get a **Viewer** badge, a prominent **Sync** button, and every write path
disabled — save, publish, and the ⌘S shortcut.

> **Gap:** the *Save All Timelines* and *Save Project* actions are **not**
> currently viewer-gated in the menubar. The server still rejects the writes, so
> this is a UI affordance problem rather than a hole, but the buttons should be
> disabled for viewers.

---

## Storage keys

| Key | Contents |
|---|---|
| `timeline-edits-storage-<projectId>` | Edited timelines, cloud/local `updatedAt` maps, `isDirty`. |
| `timeline-edit-history` | Local timeline undo/redo history. |
| `wip-layer-state-<projectId>-<timelineId>` | Layer work-in-progress. Cleared by *Sync with team* before re-loading, so the canonical server state applies cleanly. |

`isDirty` is persisted deliberately and is **not** recalculated from
`editedTimelines.size` on load. The map keeps entries for already-published
timelines so the UI does not reset its state, which makes size a bad proxy for
dirtiness.

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
- `app/api/project/timeline/route.ts` (versioned PUT)
- `app/api/project/timeline/edit-history/route.ts`
- `app/api/project/timeline/layer-history/route.ts`
- `app/api/project/share/route.ts`

---

## Testing gap

`lib/editor/__tests__/` is empty and `apps/mediamake` has no test script.

`mergeTimelines` and `mergeLayerSnapshots` are pure functions over
`(base, local, remote)` with no I/O, so they are the cheapest high-value thing
to cover: the truth table above is nine cases per axis, plus order resolution
and the structure conflict.

One known sharp edge worth a test: `eq()` compares with `JSON.stringify`, which
is **key-order sensitive**. Two semantically equal objects whose keys were
inserted in a different order register as a conflict. Not observed in practice
(both sides come from the same code paths) but it is a latent false-conflict
source.
