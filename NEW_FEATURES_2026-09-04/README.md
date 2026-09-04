# New Features — 2026-09-04

Documentation for the features introduced by the
`feat/after-editor-preset-refactor-merge` branch.

Self-contained on purpose: nothing here modifies `apps/mediamake/docs/` or
`packages/remotion/docs/`. Fold these into the main docs trees whenever it
suits — they are plain markdown with no build step.

---

## Contents

| Document | What it covers |
|---|---|
| [PR_DESCRIPTION.md](./PR_DESCRIPTION.md) | The full pull-request write-up. Paste as the PR body. |
| [canvas-pipeline.md](./canvas-pipeline.md) | Declarative canvas drawing for `@microfox/remotion` — data model, the 14-op standard library, the `init`/`apply` execution split, determinism rules, `CanvasPipeline` vs `CanvasFx`, how to add an op, and the migration table off `CanvasAtom`. **Breaking change.** |
| [editor-collaboration.md](./editor-collaboration.md) | Multi-user editing — the local/base/remote model, optimistic locking, 3-way merge for timelines and layer state, history panels, the diff viewer, sharing roles, and storage keys. |
| [browser-rendering.md](./browser-rendering.md) | Client-side rendering via `@remotion/web-renderer` — the render flow, the API contract, presigned Spaces uploads, the editor's Renders tab, and the `clientId` progress-auth change. |
| [workflow-auth-and-local-dev.md](./workflow-auth-and-local-dev.md) | Authenticating the workflow HTTP surface, the local `ai-worker dev` job store, and the environment variables involved. |
| [preset-form-inputs.md](./preset-form-inputs.md) | Choosing an editor widget via `inputType` metadata, the word-based colour-field heuristics, and the colour picker and slider widgets. |

---

## Read these first

**Shipping the branch?** → [PR_DESCRIPTION.md](./PR_DESCRIPTION.md), then the
*Infrastructure* section. Remotion moved 4.0.355 → 4.0.496, so **AWS renders
fail until Lambda functions and serve-sites are redeployed in every region** in
`config.mjs` → `AWS_REGION_OPTIONS`.

**Writing a preset that draws on canvas?** →
[canvas-pipeline.md](./canvas-pipeline.md) for the system, and
`apps/mediamake/components/editor/presets/presetwritingguide/ATOM_CANVAS_PIPELINE.md`
for the author-facing guide.

**A saved layer stopped rendering?** → the *Migration* section of
[canvas-pipeline.md](./canvas-pipeline.md). The symptom is
`Component type <id> not found in registry`.

**Touching publish, merge or history?** →
[editor-collaboration.md](./editor-collaboration.md), including the two known
issues at the bottom (the TOCTOU window in the version check, and the key-order
sensitivity of the `JSON.stringify` comparison).

---

## Related existing docs

These were **not** modified by this branch:

- `apps/mediamake/docs/README.md` — the main documentation index
- `apps/mediamake/docs/render-provider-system.md` — how render settings are
  shared across the app
- `apps/mediamake/app/ai/agents/autofix/README.md` — the autofix agents,
  including the segmentation and reference-lyrics support added here
- `packages/remotion/docs/` — the existing package docs
