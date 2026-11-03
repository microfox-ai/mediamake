# Revisions

A review screen for rendered videos on this computer, at `/video-revision` (`/remotion-revision`
and `/revisions` redirect there). Its sibling for images (thumbnails, posters, any image set) is `/file-revision` (`components/file-revisions/`). The user watches a render,
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
      c01_h1.3_f000372.jpg       the frame, with any marks and the spot drawn in
      c01_h1.3_f000372_zoom.jpg  2× crop around the spot (only when the comment has one)
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
      // optional: marks drawn on the frame (fractions of the frame, x across, y down)
      "drawing": [
        {
          "tool": "circle",
          "color": "red",
          "points": [
            [0.41, 0.2],
            [0.55, 0.36],
          ],
        },
        {
          "tool": "arrow",
          "color": "yellow",
          "points": [
            [0.48, 0.3],
            [0.7, 0.3],
          ],
        },
      ],
      "spot": { "x": 0.52, "y": 0.31 }, // optional: the exact spot
      "zoom": "rev-001/c01_h1.3_f000372_zoom.jpg", // 2× crop around the spot
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
    // the whole video: no time, listed first
    { "id": "c03", "kind": "general", "text": "…", "status": "open" },
  ],
}
```

Marks: `tool` is `pen` or `brush` (every point of the stroke), `arrow` (tail, then head), `box` or
`circle` (two opposite corners). `color` says what the mark asks for: `red` fix or remove, `green`
add here, `yellow` move (an arrow shows where). The still has the marks and the spot drawn in, so
Claude can look at it directly; the zoom crop is clean apart from a ring on the spot. The `.md`
describes each mark in words ("red circle over 41–55% across, 20–36% down").

Claude may set a comment's `status` to `done` and add a `reply`. The page re-reads revisions when
its window regains focus and every 5 s while visible, so those edits show up without a reload
(a revision with unsaved edits in the page keeps the page's version).

Comments keep any extra field when the page saves them. Machine notes written by
`apps/lyrics_videos/scripts/preflight.ts` (checks run on a render before the user sees it) are
ordinary range comments with `source: "preflight"`, the `check` that found them (`black`, `freeze`,
`silence`, …) and text starting with `Preflight ·`. They open the video's next revision, so the
user's own comments land beside them. `preflight.json` in the same folder (effects marked intended)
is not a revision and is ignored.

## Live review (no render)

A lyric project can also be reviewed straight from its code: **Live projects** in the files panel
(or `/video-revision?live=<slug>`) asks once for the `apps/lyrics_videos` folder (or the repo), lists
its projects, and plays the chosen one in a Remotion Player, compiled in the browser the way
`/remotion-editor` does it (`lib/remotion-editor/compile.ts`). The folder is remembered in the same
IndexedDB list as the editor's.

- The shot map is built from the project (`lib/revisions/live-map.ts`, a port of
  `apps/lyrics_videos/scripts/map.ts`): `video/shots.json`, or one shot per lyric line, so the IDs
  match the ones a render of it gets.
- Revisions go in `out/<slug>/live.revisions/` (created when missing) and carry
  `"live": {"project": "<slug>"}`; the `.md` says it was a live review.
- The Player is dressed as the `<video>` element the store drives (`live-media.ts`: currentTime,
  paused, play/pause, timeupdate/seeked), so the transport, timeline and markup work unchanged.
- A Player shows DOM, not pixels, so a point comment's still renders that frame again with
  `@remotion/web-renderer`, in the background: the comment is added at once and its still follows a
  few seconds later. That renderer misses some CSS (radial gradients, some filters), so every live
  comment in the `.md` also gets a `npm run stills` line to render its frames for real.
- The magnifier shows the frame as DOM (a Remotion `<Thumbnail>` at 3×), so it is exact; it needs
  the video paused.
- When the window regains focus and the project's code or `video/edits.json` changed, it compiles
  again and seeks back to where it was.
- The timeline gets a lane with the project's bars, beats and sung words, as it plays them (words
  retimed in the editor are outlined), and a range selection shows its length in beats.
- **Tweak it yourself** (header) opens the project in `/remotion-editor` on the same folder
  (`?source=folder`): moves, text, a scene's knobs, swapped pictures, clips and sounds. Back here, the
  reload above plays the change; swapped files are listed again when the project compiles.
- Heavy scenes can drop frames while playing; a render never does. Judge smoothness on a render.

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

Deep link for Claude: `/video-revision?folder=<folder name>&video=<file name>` picks the matching
history entry and asks for access with one click (`?live=<slug>` opens a project live). Browsers never expose absolute paths and no URL
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
| `Esc`                                                     | stop drawing, then close the magnifier, then leave General, then clear the selection          |
| `⌘/Ctrl ←` `→`                                            | previous / next shot (comment pins when there is no map); works anywhere, text boxes included |
| `⌘/Ctrl ⇧ ←` `→`                                          | previous / next section                                                                       |
| `Space`                                                   | play / pause (loops the selection when loop is on)                                            |
| `⌥ Space` (Mac) / `Ctrl Space`                            | play / pause from anywhere, text boxes included (`⌘ Space` is Spotlight on macOS)             |
| `,` `.`                                                   | previous / next frame (same as `←` `→`)                                                       |
| scroll on the video                                       | frame by frame; `⇧` scroll moves by the second                                                |
| `N`                                                       | new revision                                                                                  |
| `M`                                                       | mute / unmute                                                                                 |
| `F`                                                       | fullscreen the video with its transport (`Esc` or `F` leaves)                                 |
| `-` `=` `0`                                               | zoom the timeline out / in / to fit                                                           |
| `?`                                                       | list every shortcut                                                                           |
| `←` `→` / `⇧←` `⇧→`                                       | one frame / one second                                                                        |
| `D`                                                       | draw on the frame (pauses; `D` again stops, the marks stay for the next comment)              |
| `P` `B` `A` `R` `E`                                       | pencil, brush, arrow, box, circle (the same key again stops drawing)                          |
| `S`                                                       | spot: click the exact spot; the comment saves a 2× crop around it                             |
| `1` `2` `3`                                               | red (fix or remove), green (add here), yellow (move)                                          |
| `⌘/Ctrl Z`                                                | undo the last mark (outside text boxes)                                                       |
| `Z`                                                       | magnifier: 3× under the pointer; with no tool on, a click pins the spot                       |
| `C` or `Enter`                                            | write a comment                                                                               |
| `G`                                                       | write a general comment (the whole video, no time); `G` again goes back to the frame          |
| `⌘/Ctrl Enter`                                            | add the comment                                                                               |
| `⌘S`                                                      | save now                                                                                      |

Point comments anchor to the playhead when added (the video pauses while typing, so what you see is
what is attached) and save a JPEG of that frame. Range comments save no stills; the `.md` lists an
`ffmpeg` command per range so Claude can extract the frames it needs. General comments (**General**
on the chip above the box, or `G`) are about the whole video: no time, no still, listed first in the
`.md` and the panel. The switch stays on for the next comment until `G`, `Esc`, a range, a drawing
tool or a timed comment turns it off.

### Drawing and the spot

The tools sit above the comment box (and `D` / the pencil in the transport). Picking one pauses the
video and clears the range selection: marks belong to one frame, so the next comment becomes a point
comment on the frame they were drawn on, even if the playhead moved since (the chip above the box
says which frame, with **Go to**). Drawing on another frame starts over there (a toast offers Undo).
Marks of the highlighted comment show on its frame whenever no tool is on; waiting marks show faded
on other frames and hide while the video plays. The magnifier works with or without a tool and
draws the marks too. Picking a colour with no tool on brings back the last tool.

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
- `lib/revisions/marks.ts` — how marks look, are drawn (the overlay and the saved still share it)
  and read in the `.md`; `components/revisions/MarkupLayer.tsx` — drawing and the magnifier.
- `apps/lyrics_videos/scripts/map.ts` writes the map after `render-project`.
- `lib/revisions/live.ts`, `live-map.ts`, `components/revisions/LivePlayer.tsx`, `live-media.ts` —
  live review.
