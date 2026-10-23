# Revisions

A review screen for rendered videos on this computer, at `/revisions`. The user watches a render,
jumps between shots, and leaves comments that land as files **next to the video**, where Claude
reads them in the next session. Nothing is uploaded; everything goes through the File System
Access API (Chromium only, like the rest of local media). The page is public (`app/(public)/`): no sign-in, no API calls.

```
┌ header: folder / video · fps · revision status ─────────────────────────────┐
│ files panel   │ video stage                          │ revision tabs  [+]   │
│  history      │  (current shot id + frame overlay)   │ composer (anchor)    │
│  this folder  │                                      │ comment list         │
├───────────────┴──────────────────────────────────────┴──────────────────────┤
│ timeline: ruler · sections · shots · comments · selection · playhead        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Files on disk

Everything for `render.mp4` lives beside it:

```
out/my-song/
  render.mp4
  render.map.json            shot map, written by the renderer (map.json also works)
  render.revisions/
    rev-001.json             the revision (source of truth)
    rev-001.md               the same, written for reading (regenerated on every save)
    rev-001/                 snapshots for point comments
      c01_h1.3_f000372.jpg
```

### `<video>.map.json`

```jsonc
{
  "schema": "mediamake.video-map/v1",
  "video": "render.mp4",
  "source": {
    "path": "/abs/path/out/my-song/render.mp4",
    "project": "my-song",
  }, // optional
  "fps": 30,
  "duration": 251.6,
  "width": 1920,
  "height": 1080,
  "sections": [{ "id": "h1", "label": "hook-1", "from": 0, "to": 17.96 }],
  "shots": [
    {
      "id": "h1.3",
      "section": "h1",
      "from": 4.7,
      "to": 6.87,
      "label": "Reticle on W19 eye",
      "lyric": "Infallible calculate",
    },
  ],
  "markers": [{ "id": "drop", "time": 33.5, "label": "crescendo" }], // optional extra points
}
```

A bare array of shots (the older `handoff/revision-N/shots.json` files) is accepted too. Times are
seconds of the video. Shot IDs must stay stable between renders (split a shot as `v1.1a`/`v1.1b`).

### `rev-NNN.json`

```jsonc
{
  "schema": "mediamake.revision/v1",
  "id": "rev-001",
  "title": "Revision 1",
  "status": "draft", // draft | ready | resolved
  "video": {
    "file": "render.mp4",
    "size": 0,
    "lastModified": 0,
    "duration": 0,
    "fps": 30,
  },
  "map": "render.map.json",
  "comments": [
    {
      "id": "c01",
      "kind": "point",
      "text": "…",
      "time": 12.4,
      "frame": 372,
      "shot": { "id": "h1.3", "label": "…" },
      "snapshot": "rev-001/c01_h1.3_f000372.jpg",
      "status": "open",
    }, // open | done
    {
      "id": "c02",
      "kind": "range",
      "text": "…",
      "from": 12,
      "to": 15.2,
      "fromFrame": 360,
      "toFrame": 456,
      "shots": ["h1.3", "h1.4"],
      "status": "open",
    },
  ],
}
```

Claude may set a comment's `status` to `done` and add a `reply`. The page re-reads revisions when
its window regains focus and every 5 s while visible, so those edits show up without a reload
(a revision with unsaved edits in the page keeps the page's version).

## Flow

1. **Open** a folder (one picker + Chrome's "allow edits" prompt), a video (file picker, then the
   folder picker opens in the video's folder), or drop either on the page.
2. The folder is listed; picking a video loads it plus `<name>.map.json` or `map.json`.
3. The latest revision opens (or a new one is created on the first comment).
4. Every control has a tooltip naming its shortcut. Comments autosave (debounced). `⌘S` saves now.
5. History (IndexedDB, per browser + origin) remembers folders and the last video, so reopening is
   one click plus a permission prompt (none with Chrome's "Allow on every visit").
6. **Sources**: add a folder of project folders once (e.g. `apps/lyrics_videos/out`). Every
   folder up to 3 levels down that holds a video is listed on each visit and rescanned when the
   window regains focus, so new renders show up without opening anything. Chrome asks for one
   "Reconnect" click per source per visit unless "Allow on every visit" was chosen.

Deep link for Claude: `/revisions?folder=<folder name>&video=<file name>` picks the matching
history entry and asks for access with one click. Browsers never expose absolute paths and no URL
can grant folder access, so the first open of a folder is always the user's pick.

## Interactions

| Input                                                     | Action                                                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| click / drag on timeline                                  | scrub                                                                                         |
| double-click + drag (mouse), double-tap + drag (trackpad) | select a range                                                                                |
| double-click a shot                                       | select that shot                                                                              |
| Shift + click / drag                                      | extend the selection from the playhead                                                        |
| drag a selection edge                                     | adjust it                                                                                     |
| `I` / `O`                                                 | set selection in / out at the playhead                                                        |
| `Esc`                                                     | clear the selection                                                                           |
| `⌘/Ctrl ←` `→`                                            | previous / next shot (comment pins when there is no map); works anywhere, text boxes included |
| `⌘/Ctrl ⇧ ←` `→`                                          | previous / next section                                                                       |
| `Space`                                                   | play / pause (loops the selection when loop is on)                                            |
| `⌥ Space` (Mac) / `Ctrl Space`                            | play / pause from anywhere, text boxes included (`⌘ Space` is Spotlight on macOS)             |
| `,` `.`                                                   | previous / next frame (same as `←` `→`)                                                       |
| scroll on the video                                       | frame by frame; `⇧` scroll moves by the second                                                |
| `N`                                                       | new revision                                                                                  |
| `M`                                                       | mute / unmute                                                                                 |
| `-` `=` `0`                                               | zoom the timeline out / in / to fit                                                           |
| `?`                                                       | list every shortcut                                                                           |
| `←` `→` / `⇧←` `⇧→`                                       | one frame / one second                                                                        |
| `C` or `Enter`                                            | write a comment                                                                               |
| `⌘/Ctrl Enter`                                            | add the comment                                                                               |
| `⌘S`                                                      | save now                                                                                      |

Point comments anchor to the playhead when added (the video pauses while typing, so what you see is
what is attached) and save a JPEG of that frame. Range comments save no stills; the `.md` lists an
`ffmpeg` command per range so Claude can extract the frames it needs.

## Known limits

- Chromium only (Chrome, Edge, Arc, Brave). Safari and Firefox lack the folder APIs.
- Chrome refuses to grant the root of `~`, `~/Desktop` or `~/Downloads`; use a subfolder.
- Frame numbers are exact for constant-frame-rate renders (Remotion); variable-rate phone footage
  gets the nearest frame. fps comes from the map, else the header field (default 30).
- Codecs are whatever Chrome plays: H.264/H.265/VP9/AV1 yes, ProRes no.
- A revision remembers the render's size and modified time. When the file has been re-rendered
  since, the page warns that comments point at an older cut.
- History lives in this browser at this origin: localhost and the deployed app keep separate lists.

## Code

- `lib/revisions/` — pure helpers: types, map parsing, frame math, folder IO, revision files,
  markdown, IndexedDB history.
- `components/revisions/store.ts` — zustand store: folder, video, map, playback, selection,
  revisions and autosave.
- `components/revisions/*Panel.tsx`, `VideoStage.tsx`, `RevisionTimeline.tsx` — the UI.
- `apps/lyrics_videos/scripts/map.ts` writes the map after `render-project`.
