# New Features — 2026-09-04

Docs for the features added by the `feat/after-editor-preset-refactor-merge`
branch.

These are kept separate on purpose. Nothing here changes
`apps/mediamake/docs/` or `packages/remotion/docs/`. Move them into the main
docs whenever you want — they are plain markdown with no build step.

---

## What's here

| Document | What it covers |
|---|---|
| [canvas-pipeline.md](./canvas-pipeline.md) | Canvas drawing described as JSON. The 14 built-in ops, how the slow setup and fast per-frame stages work, why random numbers must repeat, `CanvasPipeline` vs `CanvasFx`, how to add your own op, and how to move off `CanvasAtom`. **Breaking change.** |
| [editor-collaboration.md](./editor-collaboration.md) | Two people editing one project. Version checking, the 3-way merge, history panels, the diff viewer, sharing roles, and storage keys. |
| [browser-rendering.md](./browser-rendering.md) | Rendering in the browser with `@remotion/web-renderer`. The render flow, the API, presigned uploads, the Renders tab, and the progress-auth change. |
| [workflow-auth-and-local-dev.md](./workflow-auth-and-local-dev.md) | Locking down the workflow routes, running jobs against a local dev server, and the environment variables. |
| [preset-form-inputs.md](./preset-form-inputs.md) | Letting a preset pick its form widget, how colour fields are guessed from the name, and the colour picker and slider. |

---

## Start here

**Shipping this branch?** Remotion went 4.0.355 → 4.0.496, so **AWS renders will
fail until the Lambda functions and serve-sites are redeployed in every region**
listed in `config.mjs` → `AWS_REGION_OPTIONS`. See the *Deployment* section of
[browser-rendering.md](./browser-rendering.md).

**Writing a preset that draws on canvas?** Read
[canvas-pipeline.md](./canvas-pipeline.md) for how the system works, and
`apps/mediamake/components/editor/presets/presetwritingguide/ATOM_CANVAS_PIPELINE.md`
for the author's guide.

**A saved layer stopped showing up?** See the *Migration* section of
[canvas-pipeline.md](./canvas-pipeline.md). The sign is
`Component type <id> not found in registry` in the console.

**Working on publishing, merging or history?** Read
[editor-collaboration.md](./editor-collaboration.md), including the two known
problems at the end (the race window in the version check, and the key-order
issue in the comparison).

---

## Known problems

Written down here so they do not get lost. Details are in each document.

- **No tests on the merge logic.** `lib/editor/__tests__/` is empty and
  `apps/mediamake` has no test script.
- **Small race window in the version check.** It reads and then writes instead
  of doing both at once. The fix is written out in
  [editor-collaboration.md](./editor-collaboration.md).
- **Merge comparison uses `JSON.stringify`**, which cares about key order. Two
  objects that mean the same thing could look like a conflict.
- **"Save All Timelines" and "Save Project" are not disabled for viewers** in
  the UI. The server still blocks the write, so this is a UI issue only.

### Suno transcription is broken (not part of this branch)

Sending a Suno track to the transcriber fails right now.

- Suno turned on CloudFront signed URLs for `cdn1.suno.ai`.
- The real error is `403 MissingKey`. ElevenLabs reports it as a `400`.
- The URL only works in a logged-in browser. No server can fetch it — not
  ElevenLabs, not our Lambda.
- Sending a browser User-Agent and a Suno `Referer` makes no difference. It
  needs a signature, not headers.
- The extension also never had a real URL. It builds
  `https://cdn1.suno.ai/<songId>.m4a` from the song id on the page, which only
  worked while the CDN was open to everyone.

**Suggested fix.** Download the audio inside the extension, where the Suno
cookies already are, upload it to our own Spaces storage, and give the
transcriber our URL instead. Both pieces already exist: the extension has
`<all_urls>` permission, and `GET /api/upload-url` already hands out presigned
Spaces URLs. Nothing new is needed and no credential leaves the browser.

**Alternative: send the cookies to the worker.** The extension reads Suno's
CloudFront cookies and passes them along, and the worker does the download and
the upload itself.

- It would work. The error message says the CDN accepts a "cookie value", so
  cookies are a valid way in.
- Needs the `cookies` permission added to the extension. Chrome shows that as a
  serious prompt and turns the extension off until it is accepted again.
- `chrome.cookies.getAll()` is the only way to read them, because CloudFront
  cookies are almost certainly `HttpOnly` and page scripts cannot see them.
- **Main drawback:** those cookies are login credentials for the user's Suno
  account, and sending them to the worker writes them into the SQS message and
  the job store (Redis or Mongo), where they sit at rest in a queue.
- CloudFront policies can also be tied to an IP address. If Suno's is, the
  cookies will not work from Lambda anyway, and there is no way to know without
  trying.
- Signed cookies expire after a few hours, so a delayed or retried job could
  fail for no obvious reason.
- The only real gain is that the download and upload happen on a server instead
  of in the browser. Suno tracks are a few MB, so that is not worth much.

---

## Related existing docs

These were **not** changed by this branch:

- `apps/mediamake/docs/README.md` — the main docs index
- `apps/mediamake/docs/render-provider-system.md` — how render settings are
  shared across the app
- `apps/mediamake/app/ai/agents/autofix/README.md` — the autofix agents,
  including the segmentation and reference lyrics work added here
- `packages/remotion/docs/` — the existing package docs
