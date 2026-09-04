# Browser Rendering

Rendering video and stills in the browser with `@remotion/web-renderer`, with no
Lambda round-trip. Covers the render flow, the presigned upload helper, and the
editor's Renders tab.

---

## Why

Lambda is the right choice for long, heavy renders. But it costs a full
deploy-and-poll cycle for everything, even a short clip. Small renders spend
more time waiting in the queue and starting up than actually encoding.

`@remotion/web-renderer` encodes in the browser using WebCodecs. The finished
file uploads straight to DigitalOcean Spaces with a presigned URL, so it never
passes through the Next.js server.

> **Needs Remotion 4.0.496.** The stable web-renderer API is not in 4.0.355.
> See [Deployment](#deployment) — this is a breaking infrastructure change.

---

## The flow

```
 browser                       Next.js API                    Spaces
   │
   │ 1. calculateCompositionLayoutMetadata()
   │    (the same function the Lambda path uses)
   │
   │ 2. canRenderMediaOnWeb({ container, width, height })
   │    └─ stops early with the browser's own reason if it cannot
   │
   │ 3. POST /api/remotion/render/browser ──────►
   │                                    creates a render_requests doc
   │                                    (status "rendering",
   │                                     renderSource "browser",
   │                                     no bucketName)
   │                                    checks quota, makes presigned PUT
   │    ◄────────────────── { renderId, uploadUrl, outputKey }
   │
   │ 4. renderMediaOnWeb({ composition, ... onProgress })
   │    encodes locally, reports progress 0 to 1
   │
   │ 5. PUT uploadUrl (the file) ─────────────────────────────►
   │
   │ 6. PATCH /api/remotion/render/browser ────►
   │                                    marks it completed, builds
   │                                    downloadUrl from outputKey
   │    ◄────────────────── { downloadUrl }
```

### Stages

`useBrowserRender()` reports a `BrowserRenderPhase`:

`idle` → `preparing` → `rendering` → `uploading` → `done` (or `error`).

`progress` is the encoder's own 0-to-1 value while rendering, then pinned to 1
while uploading. `cancel()` stops it using an `AbortController` that is passed
through both the metadata step and the encoding step.

### Keeping the bundle small

`@remotion/web-renderer` is loaded only when needed:

```ts
const { renderMediaOnWeb, renderStillOnWeb, canRenderMediaOnWeb } =
  await import('@remotion/web-renderer');
```

The encoder is big, and most editor sessions never render anything. Keeping it
out of the first chunk matters.

### Matching the Lambda output

The hook calls `calculateCompositionLayoutMetadata` with `isRendering: true` —
the exact function the Lambda path uses. So duration, fps, size and per-layer
timings all work out the same way, and a browser render of a timeline matches a
Lambda render of it. If metadata gives nothing back, it falls back to
1920x1080 at 30fps.

### Checking the browser can do it

For video, `canRenderMediaOnWeb` runs before any work starts. If it fails, the
hook shows the browser's own error message instead of a generic one. That is
usually "WebCodecs unavailable", which is the honest answer on Safari and older
Firefox.

---

## The API route

`app/api/remotion/render/browser/route.ts`

**`POST`** — register a render and hand back an upload target.

- Needs `getClientId(req)`, otherwise 401.
- Checks `renderType` is `video` or `still`, and that `container` is one we know
  (`mp4`, `webm`, `mkv`, `png`, `jpeg`, `webp`).
- Checks the platform quota with
  `userQuotaDB.checkPlatform(clientId, 'render')`. Skipped for admins.
- Creates a `render_requests` document with `status: "rendering"` and
  `renderSource: "browser"`, and **on purpose no `bucketName`**. That field is
  what the Lambda progress poller looks for, so leaving it out stops the poller
  chasing a render that has no Lambda behind it.
- Returns `{ renderId, uploadUrl, outputKey }`.

**`PATCH`** — finish the render.

- Checks auth again and re-fetches the request for that caller only
  (`renderRequestDB.getById(renderId, clientId)`).
- Marks it `completed` or `failed`. The `downloadUrl` is built **on the server**
  from the stored `outputKey`. It is never taken from the client — otherwise
  someone could point a finished render at any URL they liked.
- Adds to the usage count on success. Skipped for admins.

---

## Presigned uploads — `lib/spaces-upload.ts`

Pulled out of the upload route so the browser-render route could use it too.

```ts
export function getPublicUrl(key: string): string
export async function createPresignedUpload({ ... }): Promise<PresignedUpload>
```

Reads `SPACES_ENDPOINT`, `SPACES_ACCESS_KEY_ID`, `SPACES_SECRET_ACCESS_KEY`,
`SPACES_BUCKET`, and optionally `SPACES_CDN_ENDPOINT`. `getPublicUrl` uses the
CDN endpoint if there is one, otherwise it rewrites the normal endpoint into the
bucket's own hostname form.

Only `app/api/remotion/render/browser/route.ts` and
`app/api/upload-url/route.ts` import it, and both are server routes. The keys
never reach the browser — it only ever sees a presigned URL.

---

## Renders tab

A third tab in the left sidebar, next to **Timelines** and **Layers**.

| Panel | Component | What it shows |
|---|---|---|
| Left | `RendersTree` | The list of renders, filtered and paged. |
| Middle | `RenderPreviewPanel` | The selected render's video or image, or a progress placeholder. |
| Right | `RenderDetailsPanel` | Full details, reusing the render page's `HistoryContent` as-is. |

Which render is selected lives in `stores/renders-store.ts`
(`selectedRenderId`, `selectedRequest`, plus `applyUpdatedRequest` and
`markDeleted` so the list and the panels stay in step).

**Filters:** All / Video / Image (done on the server), This project / All,
Archive, and a filename box that filters the loaded page in the browser.

**States:** finished renders show the file with Open and Download buttons.
Renders still going show an animated "Rendering… %" placeholder that checks
every 3 seconds. Failed ones show the error.

It reuses `/api/remotion/history` (which leaves out `inputProps` to stay fast)
and the existing `HistoryContent` view, so **the standalone `/video-history` and
`/image-history` pages are not touched**.

### Progress updates without an API key

The progress checker used to need an API key. But the middleware already adds
`x-client-id` from the session cookie to every `/api/*` request, so a logged-in
user is already authenticated. The client just was not sending it.

- `hooks/use-progress.ts` — `fetchAndUpdateProgress(request, auth)` now takes
  `{ apiKey?, clientId? }` and sends `x-client-id`, a `Bearer` token, or both.
- `history-content.tsx` — new optional `clientId` prop. Progress checks, input
  props loading, and delete all check
  `hasAuth = apiKey || clientId`.
- `RenderDetailsPanel.tsx` passes `session.clientId`.

**When `clientId` is not passed — which is the case on the standalone history
pages — nothing changes at all.** Those pages still work on API keys only.

### Tagging renders with the open project

`MainEditor` gives `RenderProvider` an `initialSettings={{ projectId }}` from the
`?id=` in the URL. So the render modal's Project dropdown already points at the
project you have open, and new renders show up under the Renders tab's *This
project* filter right away. You can still switch it to "none" or another
project.

Other places that use rendering (the player page's render button) create their
own `RenderProvider` with no project, so they are unaffected.

---

## Deployment

**Remotion 4.0.355 → 4.0.496 is a breaking infrastructure change.**

The deployed Lambda functions and serve-sites are still on 4.0.355, and Remotion
needs the deployed function version to match the library version. So **AWS
renders will fail until both are redeployed in every region** listed in
`config.mjs` → `AWS_REGION_OPTIONS`.

Browser rendering does not depend on that redeploy. But it is not a replacement
either: it needs WebCodecs, so it only works in Chromium and recent Firefox, and
it encodes on the user's own machine.

---

## Files

- `components/editor/player/use-browser-render.ts`
- `app/api/remotion/render/browser/route.ts`
- `lib/spaces-upload.ts`
- `components/editor_main/stores/renders-store.ts`
- `components/editor_main/panels/left/editor/RendersTree.tsx`
- `components/editor_main/panels/middle/editor/RenderPreviewPanel.tsx`
- `components/editor_main/panels/right/editor/RenderDetailsPanel.tsx`
- `hooks/use-progress.ts` and `history-content.tsx` (the clientId auth change)

See also: [Render Provider System](../apps/mediamake/docs/render-provider-system.md)
for how render settings are shared across the app.
