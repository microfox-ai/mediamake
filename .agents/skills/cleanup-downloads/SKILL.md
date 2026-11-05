---
name: cleanup-downloads
description: Sort the media lying around the Mac — loose files at the top of ~/Downloads and of the channel folders (twixtor packs, Suno mixes, Midjourney images, stock clips), the app's hash-named overlays — into the shared media library (~/Downloads/_LIBRARY), after the user has reviewed every move in /file-revision, leaving folders (boards, batches, kits) whole; set exact copies aside instead of keeping them twice; turn duplicate copies into APFS clones to get disk space back without deleting anything; and tag what the library couldn't place. Every step is a dry run first and every sort can be undone. Use when the user says "clean up my downloads", "sort my downloads", "organise the media", "where is all my footage", "set up the library", "/cleanup-downloads", or after a big batch left Downloads messy. Not for freeing space on renders and project folders (cleanup-out).
metadata:
  category: cleanup
---

# cleanup-downloads

The media library (`apps/lyrics_videos/scripts/library/README.md`) keeps every source once, sorted
by kind and subject, and skills reuse it. This skill brings what already lies around into it, and
keeps Downloads tidy afterwards. Nothing is deleted. Nothing moves before the user has looked,
unless they hand the sort over (step 4b). Every sort can be undone.

All commands: `npm run media -w lyrics_videos -- <command>` (`media …` below).

## Steps

1. **Is the library set up?** Run `media status`.
   - If it says there is no library: run `media init`.
   - Make sure `~/.mediamake/config.json` lists the channels (brand id → its folder in Downloads)
     and `exclude` (the user's personal folders in Downloads). Ask the user which folders in
     Downloads are personal or not media work, once; never guess them.
   - The config is the machine's own: never commit it, never copy its folder names into the repo.
2. **Index.** Run `media scan` in the background: hundreds of GB on a first run. It moves nothing,
   waits while a render runs, and runs at background priority. Wait to be notified, then show the
   user what it found: the library, what lies elsewhere, duplicates, unsorted. From here
   `media find` works on everything.
3. **Duplicates.**
   - Show the plan: `media dedupe` (a dry run; `--list` for every group). The space it names is
     what really comes back: copies that are already clones of the kept file are left alone and
     counted once (a first run here: 18.7 GB of copies, 7.2 GB really separate).
   - On the user's OK: `media dedupe --yes`. The copies become clones: same paths, same bytes,
     their own dates, and the space comes back.
   - Report the space before and after (`df -h /`). Trust that, not du.
4. **Plan the sort.**
   - Run `media sweep --plan`. It proposes **loose files only** (the top of Downloads, the top of
     each channel folder, the app's `overlays/`) and writes the plan and one picture set,
     `_LIBRARY/_review/sweep-<id>/`, with a row per destination and a tile for every file.
   - It never proposes:
     - files inside folders: a folder is someone's set, board or job (a Pinterest board,
       `type-inspo/condensed`, a Midjourney batch with its `state.json`, an exported brand kit)
     - the user's own renders (`<slug>-<13-digit time>.mp4`, delivered finals)
     - loose files it can't tell (no subject and no known tool; personal photos and work
       graphics hide among them)
     - the user's songs in a channel folder (finals, remasters, stems zips, their " (1)"
       copies): songs stay in their channel folder, indexed where they are
     - `release/`, `youtube/` and `remaster/` folders, final masters, personal captures,
       excluded folders, and anything changed in the last 15 minutes
   - The loose files it couldn't tell are listed in `.catalog/sweeps/<id>/unknown.json`, for step 4b.
   - Before sending, look at a sample sheet of each big group (48 tiles) and tell the user what
     you saw. A person's photo or a brand graphic in a group means the rules need a fix first.
   - Send the review link: https://mediamake.microfox.app/file-revision?job=sweep-<id> (the
     first time, open `_LIBRARY/_review/sweep-<id>`). In the review, **Drop** = leave it where it
     is (⇧-click selects a whole row), and a **comment** = retag it ("this is Ace, not Luffy",
     "these are inspo").
   - Tell the user the numbers per destination, and what stays where it is.
4b. **When the user hands the sort over** ("too many files to go through"), sort the loose files
   into the channel (artist) folders in Downloads yourself:
   - Learn each folder first: list what it already holds (songs, renders, art), so a franchise or
     a style has an obvious home. A channel the user isn't running yet folds into its parent.
   - Name rules first (titles, Suno/YouTube titles, Midjourney prompts), then labelled contact
     sheets of what's left (48 tiles a sheet), looked at one by one.
   - Files go to `<CHANNEL>/from-downloads/` (a folder, so the next sweep leaves them be).
     Doubtful ones go to `Downloads/unidentified/`, personal pictures and phone captures to the
     user's personal folder. Never guess between two channels: unidentified.
   - Log every move as `{n, id, from, to, action}` in `.catalog/sweeps/<id>/moves.jsonl` and
     update the catalog's paths, so `media sweep --undo=<id>` brings it all back. Build the
     review set (`media sweep --review=<id>`, rows by destination) before moving, while the
     videos and songs can still be cloned for playback.
   - A comment naming a project ("shots like this into the chainreaction project folder") gets
     `<CHANNEL>/<project>/`: the whole series of those shots, and the project's song with them.
   - "Delete" in a comment means `/usr/bin/trash` (recoverable), never `rm`.
5. **Act on the review.** When the user says it's ready:
   - Run `media sweep --apply=<id>` (a dry run). It lists the comments.
   - For each comment, set those plan entries' `to`, `kind` and `subject` in
     `.catalog/sweeps/<id>/plan.json`, or mark them `"skip": true`.
   - Then run `media sweep --apply=<id> --yes`. On one disk these are renames, so they are instant.
     A file that is open, or changed since the scan, stays and is listed.
   - Folders are not sorted by the sweep. If the user wants one sorted, it moves whole (its
     inside kept as it is), never file by file, and only after asking.
6. **Tag what's left.**
   - `media find --kind=… --limit=60 --sheet` over `_unsorted/` gives contact sheets; look at them
     and propose kinds and subjects in one message.
   - On the user's OK, run `media mv <id> --kind=… --subject=…` for each.
   - New franchises or characters go into `apps/lyrics_videos/scripts/library/taxonomy.json`, so
     the next files sort themselves.
7. **Paths in memory and notes.** Memory entries and project notes that name a moved path (e.g.
   `Downloads/AMZ/honoredone/…`) get the new one. `media where "<old path>"` finds it.
8. **Undo, if asked:** `media sweep --undo=<id>` (a dry run, then `--yes`) moves everything back.

## Afterwards, from time to time

- **Inbox:** the inbox files itself through the watcher (`media init --watch`, installed only on
  the user's OK). Without it, run `media ingest`. `_INBOX/_duplicates/` is emptied only when the
  user says so.
- **New clutter:** when Downloads fills up again, run the same steps (2, then 4 to 6).

## Things to know

- **Where the library is:** `library.root` in `~/.mediamake/config.json` (default
  `~/Downloads/_LIBRARY`). Chrome can only save inside Downloads, which is why the inbox lives
  there too.
- **Projects keep clones** of what they use (`media use`), never links, so sorting the library
  can't break a render.
- **Disk space:** clones share disk space. Freeing space means removing the last copy:
  cleanup-out's archive does that for project folders, and items it moved to an external disk
  show as cold in the catalog.

## Feedback log

Append dated entries: what the user said → the rule.

- 2026-11-02 · "all the input/downloaded/created footage will be kept in a shared folder…
  outputs copied to the higher channel folders in downloads… classification and organisation is
  very important" → the library at `~/Downloads/_LIBRARY` with an inbox. Outputs are copied to
  `Downloads/<CHANNEL>/<slug>/` only on approval. The backlog is indexed first, then sorted with a
  picture review.
- 2026-11-02 · "too many files to go through, can you intelligently (reading titles/snapshot-frames) add them
  into the artist folders in downloads, if cant find relevant - put them in unidentified" + "keep personal stuff
  like my pics aor others in PERSONAL folder" → for a big backlog, Claude sorts it itself: name rules first, then
  contact sheets of what's left; files go to `<ARTIST>/from-downloads/`, doubtful ones to `Downloads/unidentified`,
  personal pictures and phone captures to `PERSONAL/`; every move logged in `.catalog/sweeps/<id>/moves.jsonl`
  (`--undo` works), and a review set grouped by destination for the user's second pass. "Delete" in a comment =
  `/usr/bin/trash`, never rm.
- 2026-11-02 · second pass: "solstice zone files are for now kept in AMZ only" + "mark shots like this into
  chainreaction project folder" → a channel the user isn't running yet folds into its parent channel; a comment
  naming a project folder gets `<CHANNEL>/<project>/` with the whole series of those shots and the project's song.
- 2026-11-05 · "keep my songs in the channel folder, keep it in preference as well" → the sweep never proposes
  audio or stems zips loose in a channel folder (rule in `sweep.ts`, tested): the user's songs stay in
  `Downloads/<CHANNEL>/`, duplicates of them are left to `media dedupe`. Never move them by hand either.
- 2026-11-05 · "identify the 639 loose files as well, segregate them into an UNKNOWN folder each segregated by your
  most possible guess" → step 4b for what the sweep can't tell: `unknown.json` lists them; they go to
  `Downloads/UNKNOWN/<best guess>/`, every move logged so `--undo` works, with a review set by guess.
