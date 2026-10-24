# Image revisions

A review screen for **any set of images** on this computer, at `/image-revision` (`/thumbnail-revision`
redirects there): thumbnails, music posters, generated images from an MCP server, a download,
anything in a folder. The sibling of `/remotion-revision` (videos, `components/revisions/`). The
user selects images (several at once), picks finals, keeps, drops and comments, zooms in to catch
small mistakes, and submits a revision file that lands **next to the images**, where Claude reads
it. Nothing is uploaded; everything goes through the File System Access API (Chromium only). The
page is public (`app/(public)/`): no sign-in, no API calls.

```
┌ header: set title · set · N images · save state ───────────────────────────────┐
│ sets panel     │ grid: one row per group, tiles with IDs     │ revision tabs [+]│
│  open / sources│  (click = select several, ⇧ range,          │ submit to Claude │
│  recent        │   double-click = zoom, small-size toggle)   │ selection actions│
│                │                                             │ comments         │
└────────────────┴─────────────────────────────────────────────┴──────────────────┘
zoom view (full window): magnifier · click to pin a comment · small-size copy · filmstrip
```

## Making any workflow reviewable (the contract)

A set is a folder of images. To review it here:

1. **Nothing at all**: open the folder. Its images are listed by file name (the ID is the name
   without the extension). Good for a one-off folder from an MCP server or a download.
2. **Better: write `<folder>/index.json`**, the image-set contract below. Then the folder is listed
   from a source on every visit, images are grouped and labelled, and the revision tells Claude
   which workflow made them and where their sources live, so it can act on the comments. Any
   folder: `npm run image-index -w lyrics_videos -- <folder> [--title=… --workflow=<skill> --source=<path>]`.
   **Workflows that render images with Remotion write it themselves** (the stills engine,
   `apps/lyrics_videos/scripts/thumbs.ts`, does on every render). A new image skill should do the
   same, or call `image-index` at the end of each round.

```jsonc
// <folder>/index.json · mediamake.image-set/v1
{
  "schema": "mediamake.image-set/v1",
  "job": "kingdom-cover", // the set's name (= the folder's)
  "kind": "poster", // thumbnail and poster get their rules (A/B finals, one cover); anything else is a plain set
  "title": "You Can Have the Kingdom",
  "workflow": "make-music-poster", // the skill that made it: Claude acts on revisions the way it works
  "source": "apps/lyrics_videos/thumbnails/jobs/kingdom-cover/poster.json", // what to change
  "location": "apps/lyrics_videos/out/posters/kingdom-cover", // where this folder is (browsers can't tell)
  "path": "/Users/…/apps/lyrics_videos/out/posters/kingdom-cover", // absolute: Show in Finder / Copy path
  "sourcePath": "/Users/…/thumbnails/jobs/kingdom-cover/poster.json", // absolute path of the source
  "size": [3000, 3000], // when every image shares a size; otherwise each tile takes its image's shape
  "pick": { "max": 1, "label": "Cover" }, // optional: how many finals, and what one is called
  "groups": [
    { "id": "A", "name": "Art only", "idea": "…", "items": [{ "id": "A0", "file": "A0.jpg", "note": "plain" }] },
  ],
  "picked": ["A3"], // what the workflow delivered as final
  "kept": ["A0"], // what the workflow locked
}
```

`styles` / `variants` are read the same as `groups` / `items` (the stills engine's names). Item
files may be in subfolders (`batch-2/x.png`). IDs must stay stable between rounds: comments refer
to them.

## Files the page writes

```
<folder>/<set>.revisions/
  rev-001.json                 the revision (source of truth)
  rev-001.md                   the same, written for reading (regenerated on every save)
  rev-001/c02_F1.jpg           a 2× crop around each pinned spot, with a ring on it
```

```jsonc
// rev-NNN.json · mediamake.image-revision/v1
{
  "schema": "mediamake.image-revision/v1",
  "id": "rev-001",
  "title": "Revision 1",
  "status": "draft", // draft | ready (submitted to Claude) | resolved (Claude is done)
  "job": "id-you-can-have-the-kingdom",
  "final": ["B2", "E1", "F1"], // a poster: one cover; thumbnails: 1, or 2–3 for YouTube's Test & Compare
  "keep": [], // lock as is
  "drop": [], // not worth more work
  "comments": [
    { "id": "c01", "images": ["B2", "E1", "F1"], "text": "Make the logo a bit smaller", "status": "open" },
    {
      "id": "c02",
      "images": ["F1"],
      "text": "The script e looks clipped",
      "pin": { "image": "F1", "x": 0.6, "y": 0.84, "size": [1280, 720] }, // fractions of the image; its pixel size
      "snapshot": "rev-001/c02_F1.jpg",
      "status": "done",
      "reply": "Gave the script line more room; re-rendered F1.", // written by Claude
    },
  ],
  "renders": { "F1": 1792840000000 }, // file times the revision saw (warns when re-rendered)
}
```

Files from `/thumbnail-revision` (`thumbs`, `pin.thumb`) are read as `images`, `pin.image`. Claude
may set a comment's `status` to `done`, add a `reply`, and set the revision's `status` to
`resolved`. The page re-reads revisions, `index.json` and the images on focus and every 5 s, so
replies and re-renders show up without a reload (a revision with unsaved edits keeps the page's
version). Editing a resolved revision starts a new one.

## Flow

1. **Open images**: pick any folder of images, or `apps/lyrics_videos/out`, which is kept as a
   **source**: every set in it (folders with an `index.json`) is listed on each visit (one
   "Reconnect" click per visit unless Chrome's "Allow on every visit" was chosen). Recent sets are
   remembered in IndexedDB.
2. Select images, then **Final** (F), **Keep** (K), **Drop** (D) or a comment (C, ⌘Enter). The
   first action creates `rev-001`; everything autosaves.
3. **Zoom** (Space, or double-click a tile): the selection (or everything) one at a time, a
   magnifier under the pointer, a small-size copy (YouTube's feed for thumbnails, a streaming
   list for posters), ← → to move. Click the picture to pin a comment to that spot.
4. **Submit to Claude**: status `ready`, and the message to send is copied.
5. **Show in Finder**: on every tile (hover), in the zoom view and in the header (the set's folder,
   and what it's made from when the index names it). Browsers can't open Finder or see real paths,
   so it uses the `path` the set's index.json records and asks the dev server (`/api/dev-reveal`,
   development only, paths under the home folder, reveal only) to show it. Anywhere else (the
   deployed app) it copies the path instead; **Copy path** buttons do that directly. A folder
   without an index.json has no known path: the name is copied, with a hint to run `image-index`.

Deep link for Claude: `/image-revision?job=<set>` opens the set when a source lists it (or asks
for one click). Browsers never expose absolute paths, so the first open is the user's pick.

## Code

- `lib/image-revisions/`: types (the two contracts), `sets.ts` (index reading, folders without one, source scans), revision files + markdown + pin crops, history.
- `components/image-revisions/store.ts`: zustand store (set, images, selection, zoom, revisions, autosave).
- `SetsPanel.tsx`, `ImageGrid.tsx`, `ZoomView.tsx`, `RevisionPanel.tsx`, `ImageRevisionsWorkspace.tsx`: the UI.
- `lib/image-revisions/reveal.ts` + `app/api/dev-reveal/route.ts`: Show in Finder / Copy path (the route is exempt from API auth in `middleware.ts`, like `dev-lyrics`).
- Folder IO, `Hint` and shortcut helpers are shared with `/remotion-revision` (`lib/revisions/fs.ts`, `components/revisions/keyboard.tsx`).
- `apps/lyrics_videos/scripts/image-index.ts` writes the contract for any folder; `scripts/thumbs.ts` writes it for thumbnails and posters.
