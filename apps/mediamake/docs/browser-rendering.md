# Browser Rendering

Client-side video and still rendering via `@remotion/web-renderer` — no Lambda
round-trip. Covers the render flow, the presigned-upload helper, and the
editor's Renders tab.

---

## Why

The Lambda path is the right tool for long, heavy renders, but it costs a
deploy-and-poll cycle for everything. Short clips, previews and stills spend
more time in queueing and cold starts than in encoding.

`@remotion/web-renderer` encodes in the browser with WebCodecs. The output is
uploaded straight to DigitalOcean Spaces via a presigned URL, so the file never
passes through the Next.js server.

> **Requires Remotion 4.0.496.** The stable web-renderer API is not in 4.0.355.
> See [Deployment](#deployment) — this is a breaking infra change.

---

## The flow

```
 client                        Next.js API                    Spaces
   │
   │ 1. calculateCompositionLayoutMetadata()
   │    (same metadata resolution as the Lambda path)
   │
   │ 2. canRenderMediaOnWeb({ container, width, height })
   │    └─ bails early with the browser's own reason if unsupported
   │
   │ 3. POST /api/remotion/render/browser ──────►
   │                                    creates render_requests doc
   │                                    (status "rendering",
   │                                     renderSource "browser",
   │                                     no bucketName)
   │                                    checks quota, mints presigned PUT
   │    ◄────────────────── { renderId, uploadUrl, outputKey }
   │
   │ 4. renderMediaOnWeb({ composition, ... onProgress })
   │    encodes locally, reports progress 0..1
   │
   │ 5. PUT uploadUrl (the blob) ─────────────────────────────►
   │
   │ 6. PATCH /api/remotion/render/browser ────►
   │                                    marks completed, derives
   │                                    downloadUrl from outputKey
   │    ◄────────────────── { downloadUrl }
```

### Phases

`useBrowserRender()` exposes a `BrowserRenderPhase`:

`idle` → `preparing` → `rendering` → `uploading` → `done` (or `error`).

`progress` is the encoder's own 0..1 during `rendering`, pinned to 1 during
`uploading`. `cancel()` aborts via an `AbortController` threaded through
metadata calculation and encoding.

### Bundle cost

`@remotion/web-renderer` is imported **lazily**:

```ts
const { renderMediaOnWeb, renderStillOnWeb, canRenderMediaOnWeb } =
  await import('@remotion/web-renderer');
```

The encoder is large, and most editor sessions never render. Keeping it out of
the initial chunk matters.

### Metadata parity

The hook calls `calculateCompositionLayoutMetadata` with `isRendering: true` —
the same function the Lambda path uses. Duration, fps, dimensions and per-layer
timings therefore resolve identically, so a browser render and a Lambda render
of the same timeline produce the same composition. Falls back to 1920×1080@30
if metadata resolves nothing.

### Capability check

For video, `canRenderMediaOnWeb` runs before any work. When it fails the hook
surfaces the browser's own error-severity message rather than a generic one —
usually "WebCodecs unavailable", which is the honest answer on Safari and older
Firefox.

---

## The API route

`app/api/remotion/render/browser/route.ts`

**`POST`** — register a render and mint an upload target.

- Requires `getClientId(req)`; 401 otherwise.
- Validates `renderType` (`video` | `still`) and `container` against a
  content-type map (`mp4`, `webm`, `mkv`, `png`, `jpeg`, `webp`).
- Enforces platform quota via `userQuotaDB.checkPlatform(clientId, 'render')`,
  skipped for admins.
- Creates a `render_requests` document with `status: "rendering"` and
  `renderSource: "browser"`, and **deliberately no `bucketName`** — that is the
  flag the Lambda progress poller uses, so it never tries to poll a render that
  has no Lambda function behind it.
- Returns `{ renderId, uploadUrl, outputKey }`.

**`PATCH`** — finalize.

- Re-authenticates and re-fetches the request scoped to the caller
  (`renderRequestDB.getById(renderId, clientId)`).
- Marks `completed` or `failed`. The `downloadUrl` is derived **server-side**
  from the stored `outputKey`, never accepted from the client — otherwise a
  caller could point a completed render at an arbitrary URL.
- Increments usage on success, skipped for admins.

---

## Presigned uploads — `lib/spaces-upload.ts`

Extracted from the upload route so the browser-render route could share it.

```ts
export function getPublicUrl(key: string): string
export async function createPresignedUpload({ ... }): Promise<PresignedUpload>
```

Reads `SPACES_ENDPOINT`, `SPACES_ACCESS_KEY_ID`, `SPACES_SECRET_ACCESS_KEY`,
`SPACES_BUCKET` and optionally `SPACES_CDN_ENDPOINT`. `getPublicUrl` prefers the
CDN endpoint and otherwise rewrites the origin endpoint into the bucket's
virtual-host form.

Imported only by `app/api/remotion/render/browser/route.ts` and
`app/api/upload-url/route.ts` — both server routes. Credentials never reach the
client; the browser only ever sees a presigned URL.

---

## Renders tab

A third left-sidebar tab in the editor, next to **Timelines** and **Layers**.

| Panel | Component | Shows |
|---|---|---|
| Left | `RendersTree` | The render list, filtered and paginated. |
| Middle | `RenderPreviewPanel` | The selected render's video/image, or a progress placeholder. |
| Right | `RenderDetailsPanel` | Full detail — the render page's `HistoryContent` view, reused verbatim. |

Selection state lives in `stores/renders-store.ts` (`selectedRenderId`,
`selectedRequest`, plus `applyUpdatedRequest` / `markDeleted` so the list and
the panels stay in sync).

**Filters:** All / Video / Image (server-side `renderType`), This project / All
scope, Archive, and a client-side filename filter over the loaded page.

**States:** completed renders show the media with Open/Download; in-progress
renders show an animated "Rendering… %" placeholder that polls every 3s; failed
renders show the error.

It reuses `/api/remotion/history` (which excludes `inputProps` for speed) and the
existing `HistoryContent` detail view, so **the standalone `/video-history` and
`/image-history` pages are untouched**.

### Progress polling without an API key

Previously the progress poller required an API key. The middleware already
injects `x-client-id` from the session cookie on every `/api/*` request, so a
logged-in user is authenticated — the client simply was not sending it.

- `hooks/use-progress.ts` — `fetchAndUpdateProgress(request, auth)` now takes
  `{ apiKey?, clientId? }` and sends `x-client-id`, `Bearer`, or both.
- `history-content.tsx` — new optional `clientId` prop. Progress polling,
  input-props loading and delete gate on `hasAuth = apiKey || clientId`.
- `RenderDetailsPanel.tsx` passes `session.clientId`.

**When `clientId` is not passed — i.e. the standalone history pages — behaviour
is byte-for-byte what it was before.** Those pages remain API-key-only.

### Project scoping

`MainEditor` seeds `RenderProvider` with `initialSettings={{ projectId }}` from
the `?id=` query, so the render modal's Project selector defaults to the open
project and new renders land under the Renders tab's *This project* scope
immediately. The user can still switch it to "none" or another accessible
project.

Non-editor usages (the player page's render button) mount their own
`RenderProvider` with no project and are unaffected.

---

## Deployment

**Remotion 4.0.355 → 4.0.496 is a breaking infrastructure change.**

Deployed Lambda functions and serve-sites are still on 4.0.355. Remotion
requires the deployed function version to match the client library, so **AWS
renders will fail until both are redeployed in every region** listed in
`config.mjs` → `AWS_REGION_OPTIONS`.

Browser rendering does not depend on the Lambda deploy — but it is not a
substitute either: it needs WebCodecs, so it is Chromium-and-modern-Firefox
only, and it encodes on the user's machine.

---

## Files

- `components/editor/player/use-browser-render.ts`
- `app/api/remotion/render/browser/route.ts`
- `lib/spaces-upload.ts`
- `components/editor_main/stores/renders-store.ts`
- `components/editor_main/panels/left/editor/RendersTree.tsx`
- `components/editor_main/panels/middle/editor/RenderPreviewPanel.tsx`
- `components/editor_main/panels/right/editor/RenderDetailsPanel.tsx`
- `hooks/use-progress.ts`, `history-content.tsx` (clientId auth)

See also: [Render Provider System](./render-provider-system.md) for how render
settings and methods are shared across the app.
