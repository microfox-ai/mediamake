---
name: cleanup-out
description: Free disk space on this Mac without losing work — delete what rebuilds itself (Remotion's leftover temp bundles, bundle copies in out/, the Next.js cache), move the older versions, working files and sources of finished productions to an external hard disk (each copy checked before anything is removed here), back the finals up there, and remove the local finals only once the user says they're uploaded; restore brings anything back. Brands and the images the skill library and review screens read always stay. Use when the user says "clean up out", "free up space", "the disk is full", "archive old renders / projects to my hard disk", "back up the finals", "I uploaded <video>, clear it", "/cleanup-out", or asks to bring archived files back.
metadata:
  category: cleanup
---

# cleanup-out

Renders, versions and sources pile up fast (a remix keeps every v<N>, a lyric video its stems and
footage). This skill frees the space in three tiers, from safe to final:

| Tier | What | How |
| --- | --- | --- |
| **Rebuildable** | Remotion temp bundles, `out/_entry-*/build`, `out/brands/.public`, `apps/mediamake/.next` | deleted (they rebuild themselves) |
| **Archive** | a finished production's versions, working files and sources | copied to the external disk, each copy hashed, then removed here |
| **Finals** | what ships: the render, shorts, the YouTube pack, a poster's canvas | copied to the disk as a backup; removed here only when the user says they're uploaded |

**Never touched:** `brands/` (every video uses the kits), `apps/mediamake/out` except through
`archive` (copied and checked first), `out/brands/` unless the user names a path in it, git-tracked files, files changed in the last 15 minutes, and everything that isn't heavy.
Only video, audio, arrays and archives move. Images, JSON, notes and code stay, so the skill library,
`/remotion-revision` and `/image-revision` keep working for archived work.

Everything runs through `apps/lyrics_videos/scripts/cleanup-out.ts`. Every command is a dry run until
`--yes`. The folder layout (which file is a final, a version, work or a source) lives only in
`apps/lyrics_videos/scripts/paths.ts`. When the layout changes, update that file, not this skill.

## Steps

1. **Scan.** `npm run cleanup-out -w lyrics_videos -- scan`. Show the user the free space, the
   rebuildable total and the biggest productions (final / version / work / source / on disk).
   If it ends with **broken links** (symlinks under `projects/` whose file is gone), list each with the
   project it breaks and ask the user: put the file back where it points, or remove the link. Never
   remove a link, or anything it points at, without their answer.
2. **Status of each production.** Propose one per production from what you know (memory, the
   production's notes, its last change): **active** (still being worked on or waiting on notes),
   **delivered** (done, not published yet) or **uploaded** (published). Ask the user to confirm or
   correct it in one message. Never assume a production is uploaded: that's what removes its finals.
   `mediamake-renders` (`apps/mediamake/out`, the mediamake app's 2025 renders) needs no status: it
   always goes to the disk (step 5).
3. **Clean.** `… -- clean` lists the rebuildable folders and anything skipped because a render,
   Studio or the dev server is running. On the user's OK: `… -- clean --yes`. The temp folder is
   outside the repo: if the shell sandbox refuses the delete, say so and ask before rerunning it
   outside the sandbox.
4. **Connect the disk.** `… -- drives`. If nothing is listed, ask the user to connect their external
   hard disk and tell you when it's mounted, then run it again. If several are listed, ask which one
   by name. Refuse a READ-ONLY disk (NTFS) and FAT32 for files over 4 GB; exFAT or APFS are fine.
5. **Plan.** A dry run for everything at once, one command per status:
   - delivered: `… -- archive <name>... --to=<disk>` moves versions, work and sources, and backs up finals
   - uploaded: `… -- archive <name>... --to=<disk> --uploaded` moves the finals too
   - mediamake-renders: `… -- archive mediamake-renders --to=<disk> --uploaded`. The user's rule:
     `apps/mediamake/out` is never deleted, only moved. Each file leaves the Mac only after its copy
     on the disk checks out. Never through `clean`, `rm` or anything else
   - active: nothing by default. If it's big, offer `--only=version` (older cuts only) or
     `--only=final` (a backup so far)
   - a path instead of a name archives just that folder, e.g. `out/brands/<brand>/renders`
     (only when the user asks for it)

   Show the plan's per-production lines and totals (`--list` shows every file), and ask once to go
   ahead.
6. **Run** the same commands with `--yes`. Big batches take minutes (a USB disk writes about
   100–400 MB/s, and every copy is read back to check it), so run them in the background and wait to
   be notified when they finish. Report what went to the disk, the free space before → after (the
   script prints it) and any file that failed (it stays here, untouched).
7. Tell the user they can eject the disk, and update the production's memory or notes with where its
   files are now ("versions and sources on <disk>, 2026-…").

**Restore:** `… -- restore <name|path>... --from=<disk>` (dry run, then `--yes`) copies files back and
checks each against the hash in the disk's ledger. `--only=<kinds>` narrows it (e.g. `source` to
re-render, `version` to compare an old cut).

## Things to know

- **Kinds**:
  - **final**: `out/<name>/<name>.*`, a short's own render, `out/youtube/<name>/`, `out/posters/<name>/`,
    loose files in an out folder that isn't a project's, and the mediamake app's renders.
  - **version**: anything in a `v<N>/` folder.
  - **source**: `projects/<name>/` and `thumbnails/jobs/<name>/`.
  - **work**: everything else (clips, stills, parts, previews, storyboards, picks).
- **On the disk**: files sit at `MediaMake Archive/<repo path>`, next to `archive.json` (the disk's
  id) and `ledger.jsonl` (every copy with its SHA-256). A copy of the ledger is kept in
  `apps/lyrics_videos/out/.cleanup/ledger.jsonl`, and `scan` uses it for the "on disk" column. A copy
  that's already on the disk and hashes the same isn't copied again, so a stopped run can be started
  again.
- **APFS clones**: the YouTube pack's video is a clone of the final (`cp -c`), so du counts it twice
  but the disk doesn't. Space comes back only when every copy is gone; trust the script's
  before → after free space, not du.
- **Previous revisions are never deleted** without a checked copy on the disk. That's this skill's
  only exception to keeping every version locally.
- **Why the temp folder filled up**: `bundle()` used to copy the whole `projects/` folder (20+ GB)
  into the temp folder, and a stopped run left the copy behind. Scripts now call `tempBundle()` from
  `apps/lyrics_videos/scripts/bundle.ts`, which links the public folder and removes the bundle
  however the process ends. Any new script that renders through the Node API should use it too.

## Feedback log

Append dated entries: what the user said → the rule.

- 2026-10-27 · "delete the unnecessary files, push the revisions to an external harddisk… ask user to
  connect… copies the final outputs as backups, and deletes in local if user says already uploaded…
  only keep what is required for the skill-browser… no need to delete brands" → the three tiers;
  heavy files only; brands never; finals leave only on "uploaded".
- 2026-10-27 · "do not delete apps/mediamake/out, only delete after copying to external disk" → it
  leaves only through `archive mediamake-renders --uploaded` (each copy checked before its local file
  goes); `clean` and anything else never touch it.
- 2026-10-30 · "I cannot move files once a project is done?" (eyesofpink's footage was a symlink into
  ~/Downloads; the download was deleted and every bundle crashed) → projects own their sources as copies
  (the make-* skills copy with `cp -c`, never link), and `scan` lists any link under `projects/` whose
  file is gone, with its project, removing nothing: the user picks restore or remove.
