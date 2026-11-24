# Stem Player

A listening screen at `/stem-player`: open folders of audio, move through the tracks with the
keyboard, and hear one track or several together from **a playhead that never resets**. It is for
understanding audio by ear: the stems of a song (Suno's zips, a session's bounces), or the versions
of a song to choose between (the loudness steps make-music-remaster-loudness builds in
`<song folder>/remaster/v<N>/`). It replaced Remaster Revisions (`/remaster-revision` redirects
here). Nothing is uploaded: folders are read through the File System Access API (Chromium only), or
by path on the local app. The page is public (`app/(public)/`): no sign-in, no API calls.

```
┌ Stem Player · base - FINAL · Vocals + Bass ───────────────────── saved · [Notes] ┐
│ [Open folder]        │ Vocals ▁▃▅▇▅▃▁▁▂▅▇▇▅▃▂▁▁▃▅▇▅▂▁                │ rev-001 [+]│
│ ▾ sukuna-dark-amb… 3 │ Bass   ▂▂▃▃▅▅▃▃▂▂▃▃▅▅▇▇▅▅▃▃▂▂                │ submit      │
│     burn yourself    │        ──────────│─────────▒▒ loop ▒▒──        │ note on the │
│     base - FINAL     │ ▶ 1:23.4 / 3:21   Loop   Match levels   vol    │   track     │
│   ▾ base - FINAL   9 │ level hint (versions more than 1 LU apart)     │ note on all │
│     ● Vocals    3:21 │ Space play · ↑ ↓ move · ⇧↑ ⇧↓ select more      │ final · drop│
│     ● Bass      3:21 │                                                │ notes       │
│   ▸ better bg Stems  │                                                │             │
└──────────────────────┴────────────────────────────────────────────────┴─────────────┘
   the sidebar is the navigation      one lane a selected track        only for versions
```

## The rules

- **The selection is what you hear.** A click selects one track; ⌘/Ctrl-click adds or removes one;
  Shift-click selects a range; ↑ ↓ move to the previous or next track shown (on into the next
  unfolded folder); Shift+↑ ↓ grow or shrink the range. ⌘/Ctrl A is every track of the folder,
  1–9 its nth track. Selected tracks play together. Tracks of different folders can be selected
  together. Once something is selected the selection is never empty.
- **Copy** (the sidebar's button, or ⌘/Ctrl C with no text selected) puts the tracks loaded in
  the player on the clipboard as text for Claude: each one's label and file, the folder it is in
  (its full path when the screen knows it), the playhead, the loop and the folder's open notes.
  Paste it and say what you want done (`lib/stem-player/copy.ts`).
- **Notes work in any folder.** N writes a note at the moment the playhead is at, about the
  selected tracks of the current folder (its chip takes the moment off, for a note on the whole
  track). Notes show as pins on the lanes and in the Notes panel, are saved beside the files like a
  versions folder's (below), and go along with Copy. Tracks selected in another folder are named in
  the note's words, since a folder's notes list only its own tracks.
- **Refresh** (the sidebar's button, R, and whenever the tab comes back) reads every unfolded
  folder again: files and folders that are new or gone, and audio written again under the same
  name, which loads again when next heard.
- **Only the folder that was asked for is in the tree.** A picked folder is its own root; a link
  opens the folder it names as its own root, never a folder above it. Folders given before are
  kept by the browser and listed under "Opened before": a click opens one, and links are looked
  up under them without opening them.
- **The playhead survives every change.** One playhead for everything open; a new selection never
  moves it, playing or paused. A track shorter than where the playhead is loads, playback pauses,
  and the playhead sits at that track's end. At the end of the song playback pauses and stays
  there; Space then starts from the beginning.
- **Space plays and pauses** from anywhere but a text box. Sidebar rows never take the keyboard's
  focus, and a button that has it is not clicked by the Space that played.
- **The current project** is the folder of the focused track (the row the arrow keys move from):
  ⌘A, the number keys, Match levels, the notes and the final pick act on it, whatever else is
  selected.
- **Folders are read as they are unfolded**, one level at a time, so a channel folder with a
  hundred songs opens as fast as a stems folder. Hidden folders, `*.revisions`, `_LIBRARY`,
  `_INBOX`, `node_modules` and `Library` are not shown.
- **A stem is listed once.** A track that comes as WAV, MP3 and M4A is one row and the WAV plays
  (the order is `AUDIO_FORMATS` in `lib/stem-player/types.ts`); MIDI and anything a browser can't
  decode (AIFF in Chromium) is not listed.
- **Audio is decoded when it is needed**: a track when it is first selected, then the rest of its
  folder behind it, two at a time, nearest first, so the next arrow press is instant. While
  nothing selected is loaded yet the playhead waits (it does not run on in silence). Decoded audio
  is kept up to `MEMORY_BUDGET` (1.5 GB; a 3:20 stereo track is about 77 MB); past it the tracks
  selected longest ago are freed and decode again when selected.

## How tracks stay in step

`lib/stem-player/player.ts`: one `AudioContext`, a decoded track an `AudioBuffer`. Only the tracks
that are heard run. Every change (a new selection, a seek, a loop, a level) starts the heard
tracks together on one sample frame, at the frame the song has reached, and fades what was playing
out over 12 ms. A track that stays heard is crossfaded with a copy of itself on the same samples,
so it carries on without a gap. `lib/stem-player/clock.ts` holds the arithmetic (whole frames, the
end, the shorter track, the loop), tested in `stem-player.test.ts`.

Measured in the app (a recorder on the engine's output, compared with the files' samples): a track
alone, the same audio added to itself while playing, removed again, and a switch to another track
and back are all bit-exact (the sum is exactly twice the track; one sample off would leave a
residual of about -14 dB), and the level never dips through a switch. In development the engine and
the store are on `window.__stemPlayer` for measuring.

## Folders of versions

A folder is a **versions folder** when it has a `remaster.json` or an `index.json`, or is a
remaster ladder's `v<N>` folder; any other folder becomes one when the user turns on Compare
versions (in Notes). Notes are everywhere; only a versions folder also has:

- **Match levels**: each track's loudness is measured as it loads (`loudness.ts`: ITU-R BS.1770-4,
  the same method as pyloudnorm in the remaster skill's `measure.py`, within ~0.1 LU) or taken
  from `remaster.json`. The switch turns every track down to the quietest one's loudness (tracks
  under -50 LUFS are left out), so the ear judges the sound, not the volume. It applies while one
  track is heard; with several heard the trims are left out, so their balance is never changed.
  Versions more than 1 LU apart show a hint.
- **A final pick and drops**: Enter marks the version you'd keep, Delete drops one, and a note can
  be about all of them. Submit to Claude marks the revision ready.

Stems folders have neither: their quietest stem is often near silence, and matching to it would
bury the rest.

### The contract with the skills (unchanged from Remaster Revisions)

1. **Nothing at all**: open the folder. Its audio files are the tracks, in name order; a track's
   ID is its file name without the extension; the part of the name that differs is its label, and
   a leading capital letter in it (`A lift`, `D lift + …`) is its key (L, M and N are the screen's
   own keys: such a version is selected with its number).
2. **Better: `<folder>/remaster.json`** (`mediamake.remaster/v1`), so the rows show the scripts'
   own measurements, the song's title, and the folder's path for Show in Finder and the message to
   Claude. The remaster skill writes it with `scripts/review.py <ladder folder>`:

```jsonc
// <folder>/remaster.json · mediamake.remaster/v1
{
  "schema": "mediamake.remaster/v1",
  "title": "Fullmetal Gregorian",
  "song": "fma-edwardeleric", // the song folder's name
  "path": "/Users/…/fma-edwardeleric/remaster/v1", // absolute: Show in Finder / Copy path / the message to Claude
  "songPath": "/Users/…/fma-edwardeleric",
  "workflow": "make-music-remaster-loudness",
  "note": "clarity only, level matched at -15.4 LUFS",
  "versions": [
    { "file": "fullmetal-gregorian - 00 original.wav", "key": "0", "label": "original", "lufs": -15.4, "truePeak": -1.0, "lra": 9.1, "plr": 14.4 },
    { "file": "fullmetal-gregorian - C lift + vocal forward.wav", "key": "C", "label": "lift + vocal forward", "note": "A + B", "lufs": -15.4, "truePeak": -1.0 }
  ]
}
```

An `index.json` (`mediamake.image-set/v1`, the file revisions' contract) is read too when the
folder has one: its order, `title`, `path` and `workflow` win.

**Files the page writes** are exactly what `/file-revision` writes
(`lib/file-revisions/revision-file.ts`), so the skills read the pick back the same way:
`<folder>/<folder>.revisions/rev-NNN.json` (`mediamake.image-revision/v1`) and `rev-NNN.md`.
A plain folder's notes are written the same way, as kind `audio` (no final, and the Markdown says
they are notes on tracks).

- `final`: the version the user picked (one). `drop`: versions that are out.
- `comments`: a note is a comment with `images: [<the IDs it is about>]`; one written at a moment
  carries `pin: { image, x: 0, y: 0, t }` (seconds; `image` is the focused track); a note on all of
  them lists every ID.
- `status`: `draft` → `ready` (Submit to Claude) → `resolved` (Claude sets it, with a `reply` and
  `status: "done"` on each comment; the page re-reads the folder under review on focus and every 5 s).

## Links

- `/stem-player?job=<path>` (what the skills print, e.g. `?job=AMZ/fma-edwardeleric/remaster/v1`):
  looked for under what is open and under the folders opened before (the whole path, the rest
  after a folder's own name, or its tail). The nearest one wins, so the song's own folder is used
  before a folder above it, and the folder the link names opens as its own root. Browsers never
  expose absolute paths, so the first open is the user's pick; the folders they picked are kept
  (IndexedDB, the database Remaster Revisions used, so its folders are still there). When none
  holds the link's folder, the page asks for one click: open that folder, or one above it to
  cover later links. Always on `https://mediamake.microfox.app`.
- `/stem-player?path=<absolute folder>` on the local app (`/api/dev-ladder`, development only).
- `&track=<id>` selects that track instead of the folder's first.
- `/remaster-revision` redirects here with its query.

## Code

- `lib/stem-player/`: `types.ts` (the sidecar, the formats, the budget), `tracks.ts` (file names
  to tracks: one a stem, labels, keys), `folders.ts` (reading one folder, walking a link, the set a
  review's files describe), `selection.ts` (the selection rules), `copy.ts` (the selection as text for Claude), `clock.ts` and `player.ts` (the
  playhead and the engine), `loudness.ts`, `dev-folder.ts` (a folder by its path, on the local app).
- `components/stem-player/store.ts`: zustand store (the tree, the decoding queue and its memory,
  the selection, the playback mirror, levels, revisions with autosave).
- `Sidebar.tsx` (the tree), `Lanes.tsx` (waveforms, loop drag, the playhead moved in the DOM so
  nothing renders while playing), `Transport.tsx` (play, loop, Match levels and its hint),
  `NotesPanel.tsx`, `StemPlayerWorkspace.tsx` (keys, header, layout).
- Shared with `/file-revision`: folder IO (`lib/revisions/fs.ts`), the revision files and Markdown
  (`lib/file-revisions/revision-file.ts`), remembered folders (`lib/file-revisions/history.ts`),
  Show in Finder (`lib/file-revisions/reveal.ts`). The Transcript Cleaner uses `loudness.ts`'s
  waveform peaks and `dev-folder.ts`.
- Tests: `npx tsx --test lib/stem-player/stem-player.test.ts` (in `apps/mediamake`).
