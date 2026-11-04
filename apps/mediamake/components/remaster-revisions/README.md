# Remaster revisions

A listening screen for **a ladder: the versions of one song**, at `/remaster-revision`: the loudness
steps make-loudness-remaster builds in `<song folder>/remaster/v<N>/`, a clarity set, any folder of
WAV, MP3 or FLAC files that are the same song. The sibling of `/file-revision` (any set of files)
and `/video-revision` (a render shot by shot). A file picker can't do this: the user wants to hear
*the difference*, so every version is decoded once and plays from **one shared playhead**. Pressing
another version's key switches to it at the same moment in the song (a 10 ms crossfade, no gap, no
restart), a range can loop so a chorus is heard over and over, and the user marks the final and
leaves notes that land **next to the files**, where Claude reads them. Nothing is uploaded;
everything goes through the File System Access API (Chromium only). The page is public
(`app/(public)/`): no sign-in, no API calls.

```
┌ header: song · ladder path · N versions · save state ───────────────────────────┐
│ ladders panel  │ waveform of the version playing, loop range, playhead, pins     │ revision tabs [+]│
│  open / sources│ ▶ 1:23.4 / 4:41.0  −5s +5s  Loop 1:02–1:31  Match levels  vol   │ submit to Claude │
│  recent        │ level warning (louder than 1 LU apart)                          │ note on the whole│
│                │ [1] 00 original   -15.4 LUFS · -1.0 dBTP  ≈ -15.4 · peak -1.2   │   ladder         │
│                │ [A] lift (eq only)                                       ★ ✕    │ final · drop     │
│                │ [C] lift + vocal forward                          FINAL  ★ ✕    │ notes (+ replies)│
│                │ note on the version playing  [at 1:23]                          │                  │
└────────────────┴──────────────────────────────────────────────────────────────────┴──────────────────┘
```

## How a version plays in sync

`lib/remaster-revisions/player.ts`: one `AudioContext`, every version an `AudioBuffer` behind its
own `GainNode`. Play starts an `AudioBufferSourceNode` per version at the same context time, so
they run sample-locked; the version the user listens to has gain 1 and the others 0, and switching
ramps the gains over 10 ms. Seeking and looping stop every source and start them again together
(`loop`, `loopStart`, `loopEnd` on each source keep a looped range in sync too). A version decoded
while the song already plays joins at the same moment. Memory: a 4½-minute 48 kHz stereo song is
about 100 MB decoded, so a five-step ladder takes half a gigabyte while open; fine for a review,
and freed when another ladder opens.

`lib/remaster-revisions/loudness.ts` measures each version as it lands: integrated loudness after
ITU-R BS.1770-4 (the same method as pyloudnorm in the skill's `measure.py`, within ~0.1 LU) and the
sample peak. When versions are more than 1 LU apart the screen says so (a louder file always sounds
better by itself) and offers **Match levels**: every version turned down to the quietest one's
loudness, so the ear judges the sound alone.

## Making a ladder reviewable (the contract)

1. **Nothing at all**: open the folder. Its audio files are the versions, in name order; the ID of a
   version is its file name without the extension; the part of the name that differs is its label,
   and a leading capital letter in it (`A lift`, `D lift + …`) is its key (L, M and N are the screen's own keys: such a version is switched to with its number).
2. **Better: write `<folder>/remaster.json`** (`mediamake.remaster/v1`), so the rows show the
   scripts' own measurements (true peak and LRA can't be measured in the browser), the song's title,
   and the folder's path for Show in Finder and the message to Claude. The remaster skill writes it
   with `scripts/review.py <ladder folder>`:

```jsonc
// <folder>/remaster.json · mediamake.remaster/v1
{
  "schema": "mediamake.remaster/v1",
  "title": "Fullmetal Gregorian",
  "song": "fma-edwardeleric", // the song folder's name
  "path": "/Users/…/fma-edwardeleric/remaster/v1", // absolute: Show in Finder / Copy path / the message to Claude
  "songPath": "/Users/…/fma-edwardeleric",
  "workflow": "make-loudness-remaster",
  "note": "clarity only, level matched at -15.4 LUFS",
  "versions": [
    { "file": "fullmetal-gregorian - 00 original.wav", "key": "0", "label": "original", "lufs": -15.4, "truePeak": -1.0, "lra": 9.1, "plr": 14.4 },
    { "file": "fullmetal-gregorian - C lift + vocal forward.wav", "key": "C", "label": "lift + vocal forward", "note": "A + B", "lufs": -15.4, "truePeak": -1.0 }
  ]
}
```

An `index.json` (`mediamake.image-set/v1`, the file revisions' contract) is read too when the
folder has one: its order, IDs, `title`, `path` and `workflow` win.

## Files the page writes

Exactly what `/file-revision` writes (`lib/file-revisions/revision-file.ts`), so the skills read
the pick back the same way: `<folder>/<folder>.revisions/rev-NNN.json` (`mediamake.image-revision/v1`)
and `rev-NNN.md`. The IDs are the file names without their extension.

- `final`: the version the user picked (one).
- `drop`: versions that are out.
- `comments`: a note on a version is a comment with `images: [<id>]`; one written at a moment
  carries `pin: { image, x: 0, y: 0, t }` (seconds); a note on the whole ladder lists every ID.
- `status`: `draft` → `ready` (Submit to Claude) → `resolved` (Claude sets it, with a `reply` and
  `status: "done"` on each comment; the page re-reads on focus and every 5 s).

Deep link for Claude: `/remaster-revision?job=<path under a source>` (e.g.
`?job=AMZ/fma-edwardeleric/remaster/v1`), found under any source the user added (Downloads, a
channel folder, the song folder) by walking the path or its tail; browsers never expose absolute
paths, so the first open is the user's pick. Always on `https://mediamake.microfox.app`.

## Code

- `lib/remaster-revisions/`: `types.ts` (the sidecar), `ladder.ts` (reading a folder, labels and
  keys, scanning sources for `remaster/v<N>` folders, resolving a link), `loudness.ts`, `player.ts`.
- `components/remaster-revisions/store.ts`: zustand store (the open ladder, decoding, the playback
  mirror, levels, revisions with autosave).
- `LaddersPanel.tsx`, `Timeline.tsx` (waveform, loop drag, transport), `Versions.tsx` (rows, level
  warning, note composer), `RevisionPanel.tsx`, `RemasterRevisionsWorkspace.tsx` (keys, header).
- Shared with `/file-revision`: folder IO (`lib/revisions/fs.ts`), the revision files and Markdown
  (`lib/file-revisions/revision-file.ts`), recents and sources (`lib/file-revisions/history.ts`,
  its own IndexedDB database), Show in Finder (`lib/file-revisions/reveal.ts`).
