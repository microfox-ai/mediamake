---
'@microfox/mediamake-mcp': minor
---

The MediaMake MCP is split in two. **mm-release** (admins, hosted at `/mcp/release`) has the catalog and release tools (`catalog_*`). **mm-use** (every member, hosted at `/mcp/use`) explores and installs items (`explore`, `get_item`, `item_versions`, `install_item`), reports usage as a skill's name and time only (`report_skill_run`, `my_usage`), reports the names and versions of local skills (`report_local_skills`) and sends feedback (`send_feedback`). The old server at `/mcp` and in the `.mcpb` keeps the timeline, preset, transcription, worker, agent and render tools, deprecated and for admins only, and no longer has `catalog_*`. The package exports `createReleaseServer`, `createUseServer`, `createLegacyServer` and `createServer(kind, …)`; the stdio entry takes the server as its first argument (`release`, `use` or `legacy`).
