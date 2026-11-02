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
- A channel's team shares its brand kit, skill variants, productions and media through `media sync` (a dry run, then `--yes`); files go up only after the user says so (`media share`).

## Releases: always give the item's link

Every catalog item (skill, MCP, app, tutorial) has a page for admins,
`https://mediamake.microfox.app/core/releases/<kind>/<slug>` (e.g. `/core/releases/mcp/browse-hack`):
what it is, who can open it, where it lives, what installing it does, and what needs or uses it.
`/core/releases` lists every item.

- After any release step, give the user the link of each item it touched: `npm run catalog --
  release | add | promote | schedule | vault | grant | archive` and the MediaMake MCP's `catalog_*`
  tools (they print or return it), a workflow that publishes a release, a new or changed skill, or an
  edit to `apps/mediamake/lib/catalog/third-party.json`. For a new version, link
  `…/core/releases/<kind>/<slug>#v<version>`.
- With the MediaMake MCP connected, manage releases through its tools: `catalog_items` to see what is
  what, `catalog_item` for one item, `catalog_archive` to take unused items off the homepage (they
  stay public and installable), `catalog_set_stage`, `catalog_add_third_party`, `catalog_invite`.
- How releases work: `apps/mediamake/docs/catalog-releases.md`.
