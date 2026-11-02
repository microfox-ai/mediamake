# MediaMake

## Media files: the shared library

Footage, pins, generated art, songs, stems, sound effects, overlays and fonts are kept once in the
media library and reused by every production. Where it is on this machine is in
`~/.mediamake/config.json` (`library`); the rules and commands are in
`apps/lyrics_videos/scripts/library/README.md` (`npm run media -w lyrics_videos -- help`).

- Search the library before downloading or generating anything (`media find`).
- Downloads go to the inbox, then `media ingest`.
- Projects get clones via `media use`, never symlinks.
- Before a heavy or paid analysis, check the cache (`media cache get`), and store results after (`media cache put`).
- Register a production at intake (`media production new <slug> --channel=…`).
- Deliver to the channel folders in Downloads only what the user approved (`media deliver`).
- Never move or rename library files by hand (`media mv`).
