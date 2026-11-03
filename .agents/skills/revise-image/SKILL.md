---
name: revise-image
description: Review and revise a set of images with the user through mediamake's File Revisions screen (/file-revision) — make the set reviewable (index.json), give them the review link, read their revision files (finals, keeps, drops, comments pinned to spots with zoomed crops) under <folder>/<set>.revisions/, act on them the way the skill that made the images works (re-render, keep, pick finals), reply and resolve, and log the lessons. Shared by every image skill (thumbnails, posters, logo concepts, Midjourney / fal sets, any create-* skill to come). Use after a round of images the user will look at, or when the user says "rev-002 is ready", "check my image revision / comments", "act on the revisions", "/revise-image <set>", or asks to fix notes left in the File Revisions screen. A set may also hold videos and songs (they play in the zoom view); a Remotion render's own review is revise-video. Append new user feedback to the log at the bottom.
---

# revise-image

The review loop for any set of images on this machine. The making skill builds and renders; this
skill takes the user's picks and notes back from the **File Revisions** screen and closes the
loop. The making skill's own rules (IDs never change once seen, its prime rules, its `brief.md`)
still apply to every fix. The screen itself is documented in
`apps/mediamake/components/file-revisions/README.md`.

## What an image skill must provide

- **A folder of images with stable IDs** (the file name without its extension is enough). Videos
  and audio files may be in it too: they play in the zoom view, and an image of the same name
  (`clip.jpg` beside `clip.mp4`) is the still on their tile (`media` in index.json).
- **`<folder>/index.json`** (`mediamake.image-set/v1`): who made the set (`workflow`: the skill's
  name), its source (`source`, `sourcePath`), its groups and IDs, and what is already picked or
  kept. The stills engine writes it on every render (`thumbs render`); any other folder gets it
  from `npm run image-index -w lyrics_videos -- <folder> [--title=… --workflow=<skill>
  --source=<path> --groups=subfolders]`, run at the end of each round. Without it the folder still
  opens, but Claude can't tell which skill should act on the notes.
- **Its own iterate step**: how a comment becomes a change (a new variant, a re-generation, an
  edit), how finals are delivered, and where lessons go.

## 1. Give the user the review link (after every round they will look at)

```
https://mediamake.microfox.app/file-revision?job=<set>
```

It opens on the deployed app, no local server needed. **Always this base URL,
`https://mediamake.microfox.app`, never a `localhost` link** (2026-11-02: "always use the base url -
mediamake.microfox.app"), even while a local dev server runs. (`/thumbnail-revision` still redirects.)

The first time, the user opens `apps/lyrics_videos/out` there (kept as a source: every thumbnail
and poster set is listed after that) or the set's own folder. There they select files (click; ⌘
click adds; ⇧ click a range; or drag a box), pick finals (a thumbnail: 1, or up to 3 for YouTube's A/B test; a poster: one **Cover**),
keep, drop and comment, zoom in and pin comments to small mistakes (on a video or song the comment
also keeps the time, `pin.t` in seconds, and a video's crop is the frame it was paused on), then
**Submit to Claude**.
Send the sheet (SendUserFile) with the link and one line per ID.

## 2. Read the revision

```
<folder>/<set>.revisions/
  rev-001.json      source of truth: status (draft | ready | resolved), final, keep, drop, comments
  rev-001.md        the same as Markdown, regenerated on every save (read this first)
  rev-001/          a 2× crop around each pinned spot, ring on it: c02_F1.jpg (comment, ID)
```

- Read `rev-NNN.md` first; it says which workflow made the set and what to run.
- Open every pinned crop with the Read tool: the ring marks the spot. Open the full image too
  when the note is about composition.
- A revision records each image's modified time; the page flags images re-rendered since.

## 3. Act on it

Act on revisions whose status is `ready` (the user may also just say "rev-002 is ready"), and on
comments without a `reply`.

**Thumbnails and posters** (sets made by the stills engine in `apps/lyrics_videos/thumbnails/`,
`thumbs render`):

1. `keep` → `npm run thumbs -w lyrics_videos -- keep <job> <IDs>`. `drop` → don't iterate on those.
2. Comments → change the variant (only if it isn't kept) or add new variants with new IDs; re-render
   only those IDs (`thumbs render <job> <IDs>`) and check them on the sheet.
3. `final` → `npm run thumbs -w lyrics_videos -- pick <job> <IDs>` once the comments on those IDs
   are fixed (re-pick after re-rendering); a poster's cover with `--to=<release folder>` when there
   is one.

**Any other set** (logo concepts, Midjourney or fal rounds, a download): act the way the skill in
`workflow` works (re-generate or edit those images, keeping their IDs), then re-run `image-index`
so the set lists what changed.

Then, for every set:

4. In `rev-NNN.json` set each comment's `status` to `"done"` with a short `reply` (what changed,
   or why not), then the revision's `status` to `"resolved"`. Edit only those fields: the open
   page picks them up when it regains focus. Don't rename, delete or reformat revision files.
5. Send the new sheet and the link again for the next round.

## 4. Log what you learned

Job-specific lessons go in the job's `brief.md`; general taste in the making skill's feedback log;
lessons about the review loop itself in the log below.

## Feedback log

Append dated entries: what the user said → the rule.

- 2026-10-25 · split out of the thumbnail skill's "Review in /image-revision" (asked for the image review page as its own skill, the way video review was split out) → this skill; the image skills point here.
- 2026-10-27 · dependencies are one-way → the skills that use this one declare `depends-on: revise-image`; this skill names none of them.
