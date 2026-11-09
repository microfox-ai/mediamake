# The media library

One shared place for everything productions use: downloaded footage, pins, generated art, songs and
their stems, sound effects, overlays, fonts. Each file is kept once, sorted by kind and subject, and
reused. Approved outputs go to the channel folders in Downloads. Every skill follows these rules;
`mm media help` lists the commands (`media …` below).

```
~/Downloads/
  _INBOX/<tool>/          tools download here first (youtube, instagram, pinterest, midjourney, fal, elevenlabs, suno,
                          mediamake-sync for a teammate's files)
  _LIBRARY/
    footage/<franchise>/<character|topic>/   overlays/<type>/   images/<franchise>/<character>/<set>/
    art/<channel>/<set>/   music/<channel>/<song>/   sfx/<category>/   references/<topic>/   fonts/   3d/
    _unsorted/<kind>/      what still needs a tag
    .catalog/              the catalog (library.db), thumbnails, the export the Library page reads
    .cache.noindex/        analyses kept for reuse
  <CHANNEL>/<slug>/        approved outputs (AMZ/, INVERTED-DEVILS/, GIZ/, …)
```

Where these are on a machine, and which folder each channel delivers to, is in `~/.mediamake/config.json`
(`library`: root, inbox, deliverRoot, channels, exclude). That file is never committed. A channel is its
folder (`"animemusiczone": "AMZ"`) or, once linked to its team's MediaMake cloud project,
`{ "folder": "AMZ", "projectId": "…" }`.

## The rules for every skill

1. **Search before downloading or generating anything.** `media find "<character> twixtor"`
   (`--kind=footage --min-height=1080 --unused --sheet`). `--sheet` draws a labelled contact sheet;
   look at it before casting. Items the user rated bad are left out (`--all` shows them).
2. **Download into the inbox.**
   - Browse Hack's `youtube_download`, `instagram_download`, `pinterest_bulk_start`,
     `midjourney_download_images` and `suno_download` save into `_INBOX/<tool>/` themselves, and answer
     `alreadyHave` when the library holds the file.
   - Suno takes go to `_INBOX/suno/<channel>/<set>/<Title> [<id8>].mp3`. Their sidecar adds `pageUrl`,
     `author`, `prompt` (the styles), `lyrics`, `excludeStyles`, `instrumental`, `settings`,
     `parentRef` with `relation` (cover, extend, remaster, reuse, upload), `sourceItem` (a library
     item's SHA-256), `workspace` and `channel`.
     - Ingest files them under that channel (the folder's, else the sidecar's): `music/<channel>/<song>/`.
     - Lyrics go beside the song as `<file>.lyrics.txt`.
     - What a take was made from is linked (`media show`): a cover to its original, stems to their
       song, a take of an uploaded track to that track.
     - `media find --kind=music --channel=<id> "<words>"` matches lyrics and styles.
   - Anything else (fal, ElevenLabs, a curl) goes to `_INBOX/<tool>/`, with `<file>.source.json` beside it:
     `{ "schema": "mediamake.source/v1", "tool", "ref", "url", "title", "query", "prompt", "model", "price" }`.
   - Then run `media ingest`. A launchd watcher does this by itself once `media init --watch` is installed.
3. **Give the production clones, never links.** `media use <id|path> <slug> [--as=input/footage/<name>.mp4]`
   puts an APFS clone where the engine reads it and records the use. A file the user handed over
   somewhere else: `media ingest <path> --channel=<id>` clones it in and leaves the original.
4. **Analyse once.**
   - Before a heavy or paid step (segregation, faces, stems, beat grid, transcript, matte, cutout,
     outcrop, upscale): `media cache get <id> <kind> [--params=…] [--into=<folder>]`. It exits 3 when
     nothing is cached.
   - After it: `media cache put <id> <kind> <file|folder> --tool=<skill> --target=<where a production wants it, e.g. footage/{name}>`.
   - `media use … --with=segregation,faces` brings cached results along.
5. **Register the production at intake.** Run `media production new <slug> --channel=<id> [--artist= --song=music/<channel>/<song>] --skill=<skill>`.
   On a later session: `media production touch <slug> --skill=<skill>`.
6. **Deliver only what the user approved.**
   - Run `media deliver <slug> --what=video|shorts|youtube|poster|master|release [--from=…]`: a dry run first, then `--yes`.
   - It clones into `Downloads/<CHANNEL>/<slug>/`, moves an older delivery to `previous/v<N>/`, and
     prints the `open -R` line for the user.
   - Test renders and review rounds stay in `out/`.
   - `media deliver <slug> --uploaded` once it's published.
7. **Feedback is kept on the file.** When the user rejects material ("the twixtors look bad", "360p,
   unusable", "credits burned in"), run `media rate <id> bad --note="…" --production=<slug>`. When it worked,
   run `media rate <id> good`.
8. **Never move or rename library files by hand.** Use `media mv <id> --kind= --subject=` (or
   `--to=<folder>`), so the catalog and the folder's `.media.json` stay right.
9. **Share a channel's work with its team through `media sync`, a dry run first.**
   - Once: `media cloud login` (the API key goes in the macOS Keychain, never in the config), then
     `media channel link <channel> <projectId>` (`media channel list` shows the projects).
   - `media sync status --channel=<id>` shows what would go up and come down: the brand kit
     (`brands/<channel>/`), the skill variants its productions use, its productions'
     `mediamake.json`, its media's details, and keeper Suno takes (`--what=music`).
   - `media sync push|pull --channel=<id> [--what=…]`, then `--yes`. Viewers of the project pull;
     owners and editors push.
   - A pull never overwrites: a file that differs here lands beside it as `<file>.theirs`. Merge it
     and delete the `.theirs`; until then that thing isn't pushed.
   - Files go up only when the user says so (`media share <id> --yes`, or Share with team on the
     Library page) and only within the channel's limit (100 MB in all by default; the owner sets it
     with `media channel limit`).
   - A teammate's items show in `media find` as remote; `media sync pull --ids=<id> --yes` brings
     a file here and files it.
   - **Any project can hold shared assets**, not just a channel's: overlays and other files every
     team uses go to the project the user names, `media share <id…> --project=<projectId> --yes`
     (`media channel list` shows the projects), and `media sync status|pull --project=<id>
     --what=media` then `--ids=` brings a project's assets here. The owner raises a project's limit
     with `media channel limit <projectId> <MB> --yes`. Teammates without the media CLI use
     ProjectSync's `list_shared_assets`, `download_shared_assets` and `share_assets`.

## What lives where

| What | Where | Notes |
| --- | --- | --- |
| A file's record | `<folder>/.media.json` (mediamake.library/v1) | Durable; `media scan --rebuild` makes the catalog again from these |
| The catalog | `.catalog/library.db` (SQLite, `node:sqlite`) | `items` (with a song's `lyrics`), `sources` (UNIQUE tool+ref; a tool's other keys in `extra`), `tags`, `notes`, `locations`, `uses`, `derived`, `productions`, `deliveries`, `runs`, `relations` (item → parent: cover, extend, remaster, stems, variation), `remote` (a teammate's items), `shares` (files the user shared with a channel's team), `synced` (what this Mac last saw on the cloud), FTS `search` |
| Provenance | `<file>.source.json` in the inbox → merged into `.media.json` | Browse Hack writes it; any tool can |
| A song's lyrics | `<file>.lyrics.txt` beside it, and in its `.media.json` entry | From Suno's sidecar (or a `.lyrics.txt` in the inbox) |
| A channel's team | Its MediaMake cloud project: brand kit, `/api/channel-sync` (productions, skill variants, media details), `mediaFiles` with `contentSource: "library-sync"` | `media sync`; `.theirs` beside anything a pull would have changed |
| A production | `projects/<slug>/mediamake.json` (mediamake.production/v2) | channel, artist, song, skills, status, deliverFolder |
| A delivery | `<CHANNEL>/<slug>/delivery.json` (mediamake.delivery/v1) | what came from where, hashes, final → uploaded |
| The Library page | `.catalog/export/*.json` + `.catalog/thumbs/` (mediamake.library-export/v1) | Rewritten after every change; page edits come back as `.catalog/requests/*.json`, applied by `media apply-requests` |
| A backup | staging `<deliverRoot>/_BACKUP/<CHANNEL>/<what>/` (clones), the disk's `MediaMake Backup/` | `.catalog/backup/manifest.jsonl` and the disk's own `manifest.jsonl`: one line per staged, copied or restored file with its SHA-256 (restore-backup skill) |

## Safety

- Anything that moves or replaces files is a dry run until `--yes`. Filing the inbox is the only exception.
- Nothing is deleted. Duplicates are set aside (`_INBOX/_duplicates/`) or, with `media dedupe`, turned
  into APFS clones: same paths, same bytes, space back.
- Heavy commands (scan, ingest, dedupe) run at background priority, one at a time, and wait while a
  render runs.
- `brands/` and `apps/mediamake/out` are never replaced.
- Personal captures (phone, WhatsApp, screen recordings), non-media files and the folders in
  `exclude` are never touched.
- The user's songs in a channel folder (finals, remasters, stems) stay there: the catalog indexes them
  where they are, and the sweep never proposes them.
- Backups copy, never move: every copy to a disk and every restore is read back and checked against
  its SHA-256, a restore never overwrites a file, and the originals stay until the user says otherwise.

Tests: `mm test:library`.
