## Summary

Three large, mostly independent workstreams from the editor branch, plus the
refactors they needed. **148 files, ~34k insertions / ~13k deletions** against
`main`, across 59 commits.

| # | Workstream | Scope |
|---|---|---|
| 1 | [Declarative canvas pipeline](#1-canvas-pipeline--breaking) | `packages/remotion` — **breaking change to the published package** |
| 2 | [Timeline & layer version control](#2-timeline--layer-version-control) | Multi-user editing without silent overwrites |
| 3 | [Browser rendering](#3-browser-rendering) | Client-side render via `@remotion/web-renderer` |
| 4 | [Renders tab](#4-renders-tab-in-the-editor) | Third left-sidebar tab |
| 5 | [Workflow auth & local dev](#5-workflows) | Both `mediamake` and `writepad` |
| 6 | [Preset form inputs](#6-preset-form-inputs) | `inputType` metadata, colour picker, slider |
| 7 | [Smaller items](#7-smaller-items) | Autofix agents, fixes |

`origin/main` is merged in — see [Merge notes](#merge-notes) for the four
conflicts and how each was resolved.

### Documentation

Five new documents ship with this PR, in a self-contained
[`NEW_FEATURES_2026-09-04/`](./NEW_FEATURES_2026-09-04) directory so the existing docs trees are untouched:

| Document | Covers |
|---|---|
| [`NEW_FEATURES_2026-09-04/canvas-pipeline.md`](NEW_FEATURES_2026-09-04/canvas-pipeline.md) | Data model, op library, execution model, migration |
| [`NEW_FEATURES_2026-09-04/editor-collaboration.md`](NEW_FEATURES_2026-09-04/editor-collaboration.md) | Versioning, merge, history, roles |
| [`NEW_FEATURES_2026-09-04/browser-rendering.md`](NEW_FEATURES_2026-09-04/browser-rendering.md) | Render flow, uploads, Renders tab |
| [`NEW_FEATURES_2026-09-04/workflow-auth-and-local-dev.md`](NEW_FEATURES_2026-09-04/workflow-auth-and-local-dev.md) | Auth paths, local job store, env vars |
| [`NEW_FEATURES_2026-09-04/preset-form-inputs.md`](NEW_FEATURES_2026-09-04/preset-form-inputs.md) | Widget metadata, colour and slider widgets |

---

## 1. Canvas pipeline — BREAKING

**Docs:** [canvas-pipeline.md](NEW_FEATURES_2026-09-04/canvas-pipeline.md) ·
author-facing: [ATOM_CANVAS_PIPELINE.md](apps/mediamake/components/editor/presets/presetwritingguide/ATOM_CANVAS_PIPELINE.md)

### The problem

Canvas effects were hand-written React components. Each re-implemented its own
frame loop, asset loading, RNG and precomputation, and each was a closed box.
Two consequences drove the rewrite:

1. **Presets could not describe canvas work.** A preset emits JSON, not a React
   component — so canvas effects were unreachable from the preset system and
   from the AI preset generator.
2. **They violated the effect contract.** An effect is a treatment applied to
   its children. These ignored their children: `CanvasWipeReveal` could only
   reveal an `imageUrl` it loaded itself, so it could never wrap a `VideoAtom`,
   a `TextAtom` or a layout subtree.

### What replaces it

Drawing is now a tree of composable **ops** resolved from a registry — the
canvas-level mirror of the existing component registry. Presets emit:

```jsonc
{
  "sources": { "hero": { "type": "image", "src": "…" } },
  "pipeline": [
    {
      "op": "clip:reveal",
      "timing": { "start": "10%", "duration": "60%", "easing": "ease-out" },
      "params": { "shape": "wipe", "angle": 45, "edge": "burn" },
      "children": [{ "op": "draw:image", "params": { "source": "hero" } }]
    },
    { "op": "post:grain", "params": { "amount": 0.15 } }
  ]
}
```

**14 built-in ops:** `draw:image` · `draw:text` · `draw:shape` ·
`draw:gradient` · `group` · `clip:reveal` · `mask:content-aware` · `particles` ·
`glitch` · `post:glow` · `post:vignette` · `post:grain` · `post:scanlines` ·
`embers`.

Every op carries a zod schema, so the library is introspectable — that is what
backs the new in-app `CanvasPipelineEditor` and the AI generator.

### Execution model

Work splits into two phases:

- **`init`** — heavy, async, cached, run behind `delayRender`. Pixel sampling,
  burn maps, noise tiles, particle formations. Cached by
  `(node path, params, assets)`.
- **`apply`** — pure, synchronous, per frame. No large allocations.

**Determinism matters here.** Remotion renders frames in parallel across
workers, so `Math.random()` would produce different pixels on adjacent frames.
Every op gets a Mulberry32 PRNG seeded from `(atom seed, node path)`, re-seeded
identically each frame; ops mix `frame` in themselves when they want per-frame
variation.

Zod parse results are cached in a `WeakMap` keyed by node — pipeline JSON is
stable between frames, so re-parsing every node every frame would be pure waste.

### Two entry points

`CanvasPipeline` (atom) — the pipeline *is* the content.

`CanvasFx` (effect) — the pipeline is a treatment for its children:

| `mode` | Behaviour |
|---|---|
| `mask` | The pipeline's alpha becomes a CSS mask on the children |
| `overlay` / `underlay` | Canvas draws above / below the children |
| `content` | Pipeline is the content; children not rendered |

`mask` is the payoff: organic burn edges, zig-zag and content-aware ordering now
work on **any** child — video, text, a whole subtree — without pixel-copying it.

### Removed from the public API

| Removed | Replacement |
|---|---|
| `CanvasAtom`, `CanvasAtomConfig`, `CanvasAtomDataProps` | `CanvasPipeline` atom |
| `CanvasReveal` | `clip:reveal` |
| `CanvasWipeReveal` | `clip:reveal` with `shape: 'wipe'` |
| `CanvasContentAwareReveal` | `mask:content-aware` |
| `CanvasGlitchEffect` | `glitch` |
| `CanvasParticleEffect` | `particles` |

`CanvasAtom` was dropped rather than ported: a bare `<canvas>` is not drivable
from preset JSON, which is what made it useless to the preset system.

A **`major` changeset** is included — the release bot's auto-generated changeset
defaults to `patch`, which would ship these removals as a patch release.

> **Migration:** a saved layer referencing a removed component id will log
> `Component type <id> not found in registry`. Re-apply the preset. In-repo
> presets are already ported, and a new `particle-morph-reveal` preset is added.

### Performance, incidentally

The ops are not straight translations — several fixed real problems:

- `mask:content-aware` precomputes ordering in `init`. `CanvasReveal`
  re-allocated a canvas and ran a full `getImageData` **every frame**.
- `glitch` is offset-based, no `getImageData` in the frame loop.
- `clip:reveal` clips arbitrary children.

---

## 2. Timeline & layer version control

**Docs:** [editor-collaboration.md](NEW_FEATURES_2026-09-04/editor-collaboration.md)

The editor is local-first: you edit freely, nothing reaches the team until you
publish. Three states matter — **local**, **base** (what your edits diverged
from), **remote** (what a teammate may have advanced).

Timelines and layer state version and publish **separately**, so editing layers
never blocks a teammate's timeline publish.

### Optimistic locking

Timeline documents carry `version` and `lastClientId`. `PUT /api/project/timeline`
returns **409 `VERSION_CONFLICT`** when the client's version is stale.

Two deliberate design points:

- **The check is opt-in** — it only runs when the client sends a `version`, so
  callers that predate the system keep last-write-wins and nothing breaks.
- **The version sent is the synced *server* version**, from the last load or
  publish — never the one baked into the edited timeline. A local edit/undo
  cycle leaves a stale version on the in-memory object; sending that would
  produce false conflicts.

### 3-way merge — a 409 is not "revert your work"

`mergeTimelines(base, local, remote)` walks the union of preset ids:

| local | remote | Result |
|---|---|---|
| unchanged | unchanged | keep |
| changed | unchanged | take yours, log to `autoMerged` |
| unchanged | changed | take theirs, log to `autoMerged` |
| changed | changed, same value | take it, no conflict |
| changed | changed, differently | **conflict** |

Add and remove fall out naturally (`base` undefined = add, `local` undefined =
remove). `configuration` and `defaultData` go through the same logic.

`mergeLayerSnapshots` does the same on two dimensions: **overrides** keyed by
node id (so two people styling different layers never conflict) and
**structure**, which is all-or-nothing since a partial structural merge produces
trees neither person authored. `hiddenLayerIds` / `lockedLayerIds` are unioned —
they are view state, and losing someone's "hidden" flag is worse than keeping
both.

**The retry loop:** on 409 the store fetches remote, merges against the
baseline, and if there are **no conflicts** re-publishes automatically — the user
sees *"Merged teammate's changes & published"* and is never interrupted. Only
genuine conflicts open `TimelineMergeDialog` / `LayerMergeDialog`, which show a
Mine/Theirs toggle per conflict plus the `autoMerged` list. A module-level retry
flag guards the recursion.

### History

Append-only audit trails for both axes, written on publish, recording
`clientId`, `timestamp`, a `changes` array and a full `snapshot`. Writes are
idempotent (upsert on `{ entryId, projectId, timelineId }`), reads paginated
newest-first with a `before` cursor.

Panels support **preview** (render a past state without committing),
**revert** (restore an entry as a new publishable local edit), and **sync with
team**. A leaf-level `DiffViewModal` shows what changed in an entry.

Local undo/redo is scoped per tab: ⌘Z on **Timelines** moves timeline history,
on **Layers** moves layer history.

### Sharing roles

`owner` / `editor` / `viewer`. Viewers get a badge, a prominent Sync button, and
every write path disabled. `getProjectRole` / `canWrite` live in
`lib/editor/project-access.ts` and are shared by all project-scoped routes.

---

## 3. Browser rendering

**Docs:** [browser-rendering.md](NEW_FEATURES_2026-09-04/browser-rendering.md)

The Lambda path costs a deploy-and-poll cycle for everything. Short clips and
stills spend more time queueing and cold-starting than encoding.

`@remotion/web-renderer` encodes in the browser with WebCodecs; the output goes
straight to Spaces via a presigned PUT, so the file never passes through the
Next.js server.

```
1. calculateCompositionLayoutMetadata()   ← same fn the Lambda path uses
2. canRenderMediaOnWeb()                  ← bail early with the browser's reason
3. POST  /api/remotion/render/browser     → { renderId, uploadUrl, outputKey }
4. renderMediaOnWeb({ onProgress })       ← encodes locally
5. PUT   uploadUrl                        → Spaces
6. PATCH /api/remotion/render/browser     → downloadUrl derived server-side
```

Details worth flagging for review:

- **The web-renderer import is lazy.** The encoder is large and most sessions
  never render, so it stays out of the initial chunk.
- **Metadata parity.** The hook calls the same `calculateCompositionLayoutMetadata`
  with `isRendering: true`, so a browser render and a Lambda render of the same
  timeline produce the same composition.
- **No `bucketName` on the render document.** That is the flag the Lambda
  progress poller keys on — omitting it stops the poller touching a render with
  no Lambda function behind it.
- **`downloadUrl` is derived server-side** from the stored `outputKey`, never
  accepted from the client, so a caller cannot point a completed render at an
  arbitrary URL.
- Quota is enforced on POST and incremented on PATCH, both skipped for admins.

`lib/spaces-upload.ts` extracts the presigned-upload helper, now shared by the
browser-render and upload-url routes. Both are server routes — credentials never
reach the client.

---

## 4. Renders tab in the editor

A third left-sidebar tab next to Timelines / Layers. `RendersTree` (list) →
`RenderPreviewPanel` (middle) → `RenderDetailsPanel` (right, reusing the render
page's `HistoryContent` verbatim).

Filters: All/Video/Image (server-side), This project/All, Archive, plus a
client-side filename filter. In-progress renders show an animated
"Rendering… %" placeholder polling every 3s.

**Progress polling no longer needs an API key.** Middleware already injects
`x-client-id` from the session cookie on every `/api/*` call — the client simply
was not sending it. `use-progress.ts` now takes `{ apiKey?, clientId? }`, and
`history-content.tsx` gained an optional `clientId` prop gating on
`hasAuth = apiKey || clientId`.

> When `clientId` is **not** passed — i.e. the standalone `/video-history` and
> `/image-history` pages — behaviour is byte-for-byte what it was before. Those
> pages remain API-key-only and are untouched.

`MainEditor` seeds `RenderProvider` with the open project, so new renders land
under *This project* immediately. The player page's render button mounts its own
provider with no project and is unaffected.

---

## 5. Workflows

**Docs:** [workflow-auth-and-local-dev.md](NEW_FEATURES_2026-09-04/workflow-auth-and-local-dev.md)

The workflow routes queue jobs, dispatch worker steps and resume HITL pipelines
with reviewer-supplied input — **and were open to anonymous callers.**

`authorizeWorkflowRequest` now authorizes via any of three paths:

1. **A real user session** — `session_token` cookie resolved against the Upstash
   session store, with an explicit `expires` check.
2. **The internal shared secret** — `x-workflow-secret` matching
   `WORKFLOW_INTERNAL_SECRET` (falling back to `WORKERS_API_KEY`), for trusted
   Lambda → app callbacks that have no session. Compared **timing-safely**; a
   plain `===` on a secret leaks its prefix.
3. **`WORKFLOW_ALLOW_PUBLIC=true`** — explicit local-demo opt-out that warns on
   every request.

Otherwise 401, with an error naming all three fixes. Applied in both `mediamake`
and `writepad`.

Also:
- **Local dev job store** — `WORKER_DATABASE_TYPE=local` +
  `WORKER_BASE_URL` proxies job state to a running `ai-worker dev` server
  instead of Redis/Mongo.
- **Pipelined Redis reads** when listing jobs by worker — previously one round
  trip per job, and each Upstash round trip is a full HTTPS request.
- **Per-run poll timers** in `useWorkflowJob`. Starting a second run left the
  first run's timer alive, polling and writing into shared state.
- Step retry config and HITL input schemas resolved locally.
- `@microfox/ai-worker` 1.0.5 → 1.1.2.

---

## 6. Preset form inputs

**Docs:** [preset-form-inputs.md](NEW_FEATURES_2026-09-04/preset-form-inputs.md)

Preset authors can now request an editor widget explicitly instead of relying on
name heuristics:

```ts
z.string().meta({
  [paramMetaTypes.inputType]: paramInputTypes.color,
  [paramMetaTypes.inputOptions]: { allowAlpha: false, presets: ['#fff'] },
})
```

Widgets: `color`, `slider`, `textarea`, `text` (the last one to opt *out* of a
heuristic).

Without an explicit type, colour fields are still inferred — but the matching is
now **word-based, not substring-based**, which is what makes it safe:
`artistColor` and `burn_glow_color` get pickers; `colorMode`, `borderRadius` and
`backgroundImage` do not. Enums stay dropdowns.

The picker has an SV plane, hue/alpha sliders, the native **EyeDropper** API
(Chromium only — samples cross-origin pixels the canvas cannot read; hidden
elsewhere rather than throwing), **harmony** generation (complementary, triadic,
analogous, split-complementary, tetradic) and a shade ramp. A free-text input
sits alongside it deliberately, so CSS variables, `currentColor` and gradients
stay editable.

---

## 7. Smaller items

- **Autofix agents** — segmentation and reference-lyrics support. The track's
  Suno lyrics are the authority for *what* was sung, ElevenLabs for *when*; the
  model returns indexed single-word edits applied in code, never a re-emitted
  transcript. Documented in
  [`app/ai/agents/autofix/README.md`](apps/mediamake/app/ai/agents/autofix/README.md).
- Upload dialog configuration persisted to local storage.
- **Fixes:** duplicate layer ids; stale preset cache on a cold tab (blank
  preview in a fresh tab); timeline ruler drifting while scrolling; raw timeline
  output on the Timelines tab.

---

## ⚠️ Infrastructure — action required before merge

**Remotion 4.0.355 → 4.0.496.** Required by the stable web-renderer API.

Deployed Lambda functions and serve-sites are still on 4.0.355, and Remotion
requires the deployed function version to match the client library. **AWS
renders will fail until both are redeployed in every region** listed in
`config.mjs` → `AWS_REGION_OPTIONS`.

Browser rendering does not depend on that deploy, but it is not a substitute:
it needs WebCodecs, so it is Chromium-and-modern-Firefox only, and it encodes on
the user's machine.

---

## Merge notes

`origin/main` merged in at `24ea4d99`. Four files conflicted:

| File | Resolution |
|---|---|
| **`EditorMenubar.tsx`** | "Save Current Timeline" (menu item, toolbar button, ⌘S) now runs the version-checked `publishTimeline` flow instead of a direct `saveToDatabase` overwrite, and stays viewer-gated. `main`'s new *Save All Timelines* / *Save Project* actions kept as-is. Publish toasts reuse `main`'s `save-timeline` toast id so the loading toast is dismissed. |
| **`timeline-edits-store.ts`** | Union — `main`'s cloud/local `updatedAt` sync tracking and this branch's publish/history/merge API are disjoint. **Restored `isDirty`** on the state, in the initial state, and in the localStorage round-trip: `main`'s rewrite of `saveToStorage` dropped it while this branch's `loadFromPersistence` still reads it back. |
| **`compile-store.ts`** | Kept this branch's fresh-cache preset read. `main` still carried the `presetInfo!.preset = fetchedPreset` crash that blanked the preview on a cold cache. |
| **`MainEditor.tsx`** | Union of both sides' store wiring. |

Dead code the resolution left behind (`currentTimelineUnsynced` memo, `CheckIcon`
and `isTimelineUnsyncedWithCloud` imports) was removed.

---

## 🔒 Security fix found while reviewing (`b5ccd941`)

Both new history routes shipped with **no authentication or authorisation at
all**:

- **`GET`** returned every history entry for any `projectId` / `timelineId` a
  caller asked for — including the full published timeline `snapshot`. Any
  caller could read another team's project history.
- **`POST`** took `clientId` from the request body with a `"unknown"` fallback,
  so audit attribution was spoofable.
- The upsert filtered on `{ entryId }` alone, so a caller who knew an `entryId`
  could **overwrite an audit entry belonging to another project**.

Both routes now resolve the caller via `getClientId()` and check project access
before touching the collection: any role may read, only owners and editors may
write, `clientId` comes from the session, and the upsert is scoped to
`{ entryId, projectId, timelineId }`.

The `getProjectRole` helper that already existed in
`app/api/project/timeline/route.ts` was extracted to
`lib/editor/project-access.ts` and is now shared by all three routes.

---

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit` — `apps/mediamake` | ✅ clean |
| `tsc --noEmit` — `packages/remotion` | ✅ clean |
| `next build` | ✅ exit 0, no warnings |
| ESLint on resolved files | ✅ no new violations |

`timeline-edits-store.ts` goes 31 → 44 ESLint errors, all the pre-existing
`require()`-style circular-import break the file already uses throughout (31 of
them on `main` today). `compile-store.ts` is unchanged at 13 on both sides.

---

## Known gaps & follow-ups

- **No tests on the merge logic.** `lib/editor/__tests__/` is empty and
  `apps/mediamake` has no test script. `mergeTimelines` / `mergeLayerSnapshots`
  are pure functions over `(base, local, remote)` — the cheapest high-value
  thing to cover next.
- **TOCTOU in the version check.** `PUT` does `findOne`, compares, then
  `updateOne({ _id })` without re-asserting the version in the filter. Two
  publishes in the same millisecond can both pass. Fix is a CAS:
  `updateOne({ _id, version: storedVersion })` + check `matchedCount`.
- **`eq()` uses `JSON.stringify`**, which is key-order sensitive — semantically
  equal objects with different key insertion order register as a spurious
  conflict. Not observed in practice; latent.
- **`Save All Timelines` / `Save Project` are not viewer-gated in the UI.** The
  server still rejects the writes, so this is an affordance problem rather than
  a hole, but the buttons should be disabled for viewers.
- Manual smoke tests for the Renders tab and the fresh-tab preview fix are
  tracked in `.claude/AI_WORKFLOW/DEV_TASKS.md` and not yet checked off.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
