---
name: restore-backup
description: Find and restore particular files from the user's MediaMake backups on an external hard disk — finished renders, masters, anything backed up by channel (AMZ, GIZ, INVERTED-DEVILS…) — reading the backup's manifest (it works with the disk unplugged, so it can tell which disk to connect), copying the chosen files back and checking each against its SHA-256. Also makes backups: stage files by channel as clones, then copy them to the disk when it's connected. Use when the user says "restore <x> from the backup", "get back the <song> render", "what's on the backup disk", "is <x> backed up", "back up the renders", "copy the backup to the hard disk", "/restore-backup", or wants a file that was moved off the Mac after a backup. Not for project folders archived by cleanup-out (its own archive and restore).
metadata:
  category: cleanup
---

# restore-backup

Backups keep copies of finished work on an external disk, classified by channel, and a manifest
of every file with its SHA-256. This skill reads that manifest, finds what the user asks for, and
copies it back, checked. The command is the media library's
(`apps/studio/scripts/library/backup.ts`); run everything from the repo root as
`mm media <command>` (`media …` below).

## Where things are

- **Staging, on the Mac:** `Downloads/_BACKUP/<CHANNEL>/<what>/<file>`. These are APFS clones of
  the originals, so staging costs no disk space.
- **On the disk:** `<disk>/MediaMake Backup/<CHANNEL>/<what>/<file>`, plus `backup.json` (the
  disk's id) and `manifest.jsonl` (its own record, readable on any Mac).
- **The manifest here:** `_LIBRARY/.catalog/backup/manifest.jsonl`. It survives the staging folder
  being cleared, so `list` answers with the disk unplugged; a connected backup disk's manifest is
  read too.
- `<CHANNEL>` is the channel's folder name in Downloads (from `~/.mediamake/config.json`), and
  `<what>` says what kind of thing it is: `renders`, `masters`, `files`.

## Restore particular files

1. **Find them.** `media backup list <words> [--channel=<id|folder>]`. Words match the file name
   and its path in the backup, so a slug (`gojo`), a channel (`--channel=GIZ`) or both work. Show
   the user what matched: the name, channel, size, and where it is (`staged here`, `on <disk>`).
2. **Pick.** When several match, ask which ones (a render often has a second version, like
   `kokuten` and `kokutenmini`). Restore only what the user picked.
3. **Connect the disk** when the file isn't staged here any more. Tell the user which disk by its
   name from the list, then check with `media backup drives`.
4. **Dry run.** `media restore <words> --from=<disk> [--to=<folder>]` prints where each file goes:
   - back where it was, when that place is free;
   - else `Downloads/<CHANNEL>/restored/`;
   - or `--to=<folder>` when the user names one.

   Nothing is ever overwritten: a name that's taken gets `-2`. Without `--from` it restores from the
   staged clone, while it's still here.
5. **Restore.** Add `--yes`. Every copy is read back and checked against the manifest's SHA-256. A
   copy that doesn't match is removed and reported, never left behind; say so and suggest the
   other disk if the manifest names one.
6. **Show the user.** Give one `open -R "<path>"` line per restored file.

## Make a backup

1. **Stage by channel.** `media backup add <file|folder>… --channel=<id|folder> --as=renders`
   (a dry run), then `--yes`. Decide each file's channel first:
   - a render's last seconds usually show the channel's watermark or end screen;
   - the style says the rest (GIZ: bold motivational lines with a waveform down the left edge;
     Blade & Choir: its waveform line and the song's title at the bottom);
   - files already in a channel folder belong to it.

   Ask about anything still unclear. Staging is instant and takes no space (clones).
2. **Copy to the disk** once the user connects it:
   - `media backup drives` lists the disks, their free space, and which already hold a backup;
   - `media backup copy --to=<disk>` (a dry run: count, size, target), then `--yes`;
   - every file is copied, read back and checked, and only what isn't on that disk yet is copied.
3. **Freeing space is a separate decision.** The originals and the staged clones share their
   bytes, so the space only comes back when both go. Do that only when the user asks, after the
   disk copy checked out, and move them to the Trash (`/usr/bin/trash`), never `rm`.

## Things to know

- A second disk is just another `copy --to=<disk>`. The manifest records each disk, and `list`
  shows every disk a file is on.
- Rename a disk and its id stays the same (`backup.json`); the name in the list is the one it had
  when copied.
- Restoring from the disk never touches the disk's files or its manifest; restores are logged in
  the Mac's manifest only.

## Feedback log

Append dated entries: what the user said → the rule.

- 2026-11-02 · "lets copy them into a backup (but classified by channels of course) once the backup
  folder is done let me know, i will connect harddisk and you can copy there. also provide a skill
  to read backup and restore particular files" → `media backup add|drives|copy|list` and
  `media restore`; staging as clones in `Downloads/_BACKUP/<CHANNEL>/<what>/`, every disk copy and
  restore checked against its SHA-256, a manifest on the Mac and on the disk; this skill.
