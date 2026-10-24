# Remotion editor

A screen at `/remotion-editor` that opens a lyric video from `apps/lyrics_videos` as live Remotion
(not a render) and lets the user move, scale, rotate, re-font and retype what is on screen. Edits
are saved beside the project as `projects/<slug>/video/edits.json`, and the lyric kit applies them
in every render (Studio, stills, `render-project`). The page is public (`app/(public)/`), like
`/revisions`, and works on the deployed site: there the user picks the folder.

## Where projects come from

- **A folder** (`lib/remotion-editor/folder-source.ts`), anywhere, Chromium only: the user picks
  `apps/lyrics_videos` (or the repo, or a folder holding `lyrics_videos/`) with the File System
  Access API, drops it on the page, or reopens one from the list (IndexedDB, per browser and
  origin). Chrome asks once per visit for edit access unless the user chose "Allow on every
  visit"; then the last folder reopens by itself. Nothing is uploaded. When a project opens, every
  file under `projects/<slug>/` (except `analysis/`, `archive/`, `handoff/`, `tools/`, `out/`) gets
  a blob URL up front, since `staticFile()` must answer synchronously; the files stay on disk until
  played. Blob URLs answer Range requests, so audio and video seek.
- **The local repo** (`repoSource`), `next dev` only: the dev-lyrics routes read the folder, no
  picking. It's the default on localhost; the source menu in the header switches.

```
┌ header: project · source · compile state · reload · undo/redo · save state ─┐
│ on screen now   │ Player + selection overlay          │ inspector:          │
│ layers          │ (drag, corner scale, top-dot rotate)│ position, font,     │
│ edited          │                                     │ content fields      │
├─────────────────┴─────────────────────────────────────┴─────────────────────┤
│ transport: play, time, current lyric · scrubber with sections and edit marks│
└─────────────────────────────────────────────────────────────────────────────┘
```

## How it works

1. **Files.** A `ProjectSource` (`lib/remotion-editor/source.ts`) lists projects and files, reads
   code, writes `edits.json` and turns `staticFile()` paths into URLs. The dev-lyrics routes behind
   the repo source 404 outside `next dev`, stay inside the lyrics folder, skip `node_modules` and
   dotfiles, and write nothing but `video/edits.json`; the folder source writes only that file too.
2. **Compile in the browser.** `lib/remotion-editor/compile.ts` walks the import graph from
   `projects/<slug>/video/index.tsx` and the kit, turns each file into CommonJS with sucrase, and
   runs it with a small `require`. Packages (React, Remotion, three, fonts…) come from this app
   (`host-modules.ts`), so there is one React and one three. `staticFile()` is swapped for URLs the
   source serves.
3. **Play.** The kit's own `makeProjectVideo` renders in a `<Player>` with
   `inputProps = { manifest, edits }`. The manifest's asset paths become URLs first, because
   `@microfox/remotion` atoms call their own `staticFile()`.
4. **Select.** Scenes mark elements with the kit's `editable()` (`data-edit-*` attributes). The
   overlay measures them in the Player's DOM every animation frame. A click picks the smallest
   visible element under the pointer, unless it lands on the selection or inside it (then it drags
   the selection); Alt-click walks outwards; double-click goes in and opens the text. Every layer is
   selectable from the list as `layer:<key>`.
5. **Apply.** The kit's `EditsApplier` writes `elements` edits as the CSS `translate`, `scale` and
   `rotate` properties (they stack with the scene's own `transform`) and a font family, after
   every frame. `props` edits are written into the layer's props before it renders.
6. **Save.** Changes autosave 0.6 s after the last one (never mid-drag); ⌘S saves now. The page
   checks the disk every 2 s: changed code recompiles in place (the last good version keeps
   playing on a compile error), and an `edits.json` changed by someone else is reloaded when the
   page has no unsaved edits.

## Files

- `store.ts`: source, project, compile, edits with undo/redo, save, selection
- `ConnectPanel.tsx`: choose / reopen a folder, or use the repo
- `Stage.tsx`: Player, overlay, gestures; `dom.ts`: measuring and hit-testing marked elements
- `Inspector.tsx`: position, font and content fields (types and choices are read from the props)
- `ElementsPanel.tsx`, `Transport.tsx`, `EditorHeader.tsx`, `RemotionEditorWorkspace.tsx`
- `apps/lyrics_videos/src/kit/edits.tsx`: `editable()`, `EditsApplier`, `applyPropEdits`, file format

## Limits

- The folder source needs Chrome, Edge, Arc or Brave (no folder access in Safari or Firefox).
- A folder's files are snapshots: after replacing a picture on disk, press Reload (code changes
  reload by themselves, and map the files again).
- `@microfox/remotion` atoms take blob: and data: URLs as they are (`utils/mediaSrc.ts`); before
  that they sent them through `staticFile()`.
- Only what scenes mark can be picked individually; anything else moves with its whole layer.
- A font swap doesn't re-run canvas text measurement in scenes that measure text; letters drawn
  from glyph outlines (traced words) take their shape from the cue's `font`, not a font family.
- `props` paths index cue arrays: adding or removing cues in code can move an edit onto another
  cue. The inspector warns when an element's label differs from the one it was edited with.

## Testing the folder source without the picker

The picker is a native dialog. On `next dev` the page exposes
`window.__remotionEditor.openFolder(handle)`: copy `src/` and a project into the origin private
file system (`navigator.storage.getDirectory()`, fetching files from the dev-lyrics routes) and
open that handle. It needs no permission prompt, so it also checks reopening on reload.

## Other ways to reach projects

- **Local bridge:** the dev-lyrics routes as a small server on the user's machine; the deployed
  page calls `http://localhost:<port>` (needs CORS and Chrome's private network access headers).
- **Cloud modules:** see `todos/cloud-code-modules.md`.
