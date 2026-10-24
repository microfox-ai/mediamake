# Thumbnail revisions

A review screen for thumbnail renders on this computer, at `/thumbnail-revision`: the sibling of
`/remotion-revision` (videos, `components/revisions/`). The user selects thumbnails (several at
once), picks finals, keeps, drops and comments, zooms in to catch small mistakes, and submits a
revision file that lands **next to the renders**, where Claude reads it. Nothing is uploaded;
everything goes through the File System Access API (Chromium only). The page is public
(`app/(public)/`): no sign-in, no API calls.

```
┌ header: job title · job · N thumbnails · save state ───────────────────────────┐
│ jobs panel     │ grid: one row per style, tiles with IDs     │ revision tabs [+]│
│  open / sources│  (click = select several, ⇧ range,          │ submit to Claude │
│  recent        │   double-click = zoom, feed-size toggle)    │ selection actions│
│                │                                             │ comments         │
└────────────────┴─────────────────────────────────────────────┴──────────────────┘
zoom view (full window): magnifier · click to pin a comment · feed-size copy · filmstrip
```

## Files on disk

A job folder is what `npm run thumbs -w lyrics_videos -- render <job>` writes:

```
apps/lyrics_videos/out/thumbnails/<job>/
  index.json                     styles → variants (id, file, note), picked, kept  (read by the page)
  A1.jpg … H3.jpg                the renders
  kept/, final/                  written by `thumbs keep` / `thumbs pick`
  <job>.revisions/
    rev-001.json                 the revision (source of truth)
    rev-001.md                   the same, written for reading (regenerated on every save)
    rev-001/c02_F1.jpg           a 2× crop around each pinned spot, with a ring on it
```

### `rev-NNN.json`

```jsonc
{
  "schema": "mediamake.thumbnail-revision/v1",
  "id": "rev-001",
  "title": "Revision 1",
  "status": "draft", // draft | ready (submitted to Claude) | resolved (Claude is done)
  "job": "id-you-can-have-the-kingdom",
  "final": ["B2", "E1", "F1"], // 1 = the final, 2–3 = YouTube's Test & Compare
  "keep": [], // lock as is (thumbs keep)
  "drop": [], // not worth more work
  "comments": [
    { "id": "c01", "thumbs": ["B2", "E1", "F1"], "text": "Make the logo a bit smaller", "status": "open" },
    {
      "id": "c02",
      "thumbs": ["F1"],
      "text": "The script e looks clipped",
      "pin": { "thumb": "F1", "x": 0.6, "y": 0.84 }, // fractions of the thumbnail
      "snapshot": "rev-001/c02_F1.jpg",
      "status": "done",
      "reply": "Gave the script line more room; re-rendered F1.", // written by Claude
    },
  ],
  "renders": { "F1": 1792840000000 }, // render times the revision saw (warns when re-rendered)
}
```

Claude may set a comment's `status` to `done`, add a `reply`, and set the revision's `status` to
`resolved`. The page re-reads revisions, `index.json` and the renders on focus and every 5 s, so
replies and re-renders show up without a reload (a revision with unsaved edits keeps the page's
version). Editing a resolved revision starts a new one.

## Flow

1. **Open thumbnails**: pick `out/thumbnails/<job>/`, or `out/thumbnails` (or `out`), which is
   kept as a **source**: every job in it is listed on each visit (one "Reconnect" click per visit
   unless Chrome's "Allow on every visit" was chosen). Recent jobs are remembered in IndexedDB.
2. Select thumbnails, then **Final** (F), **Keep** (K), **Drop** (D) or a comment (C, ⌘Enter).
   The first action creates `rev-001`; everything autosaves.
3. **Zoom** (Space, or double-click a tile): the selection (or everything) one at a time, a
   magnifier under the pointer, a feed-size copy, ← → to move. Click the picture to pin a comment
   to that spot; the crop is saved with it.
4. **Submit to Claude**: status `ready`, and the message to send is copied.

Deep link for Claude: `/thumbnail-revision?job=<job>` opens the job when a source lists it (or
asks for one click). Browsers never expose absolute paths, so the first open is the user's pick.

## Code

- `lib/thumbnail-revisions/`: types, revision files + markdown + pin crops, job scanning, history.
- `components/thumbnail-revisions/store.ts`: zustand store (job, renders, selection, zoom, revisions, autosave).
- `JobsPanel.tsx`, `ThumbGrid.tsx`, `ZoomView.tsx`, `RevisionPanel.tsx`, `ThumbnailRevisionsWorkspace.tsx`: the UI.
- Folder IO, `Hint` and shortcut helpers are shared with `/remotion-revision` (`lib/revisions/fs.ts`, `components/revisions/keyboard.tsx`).
