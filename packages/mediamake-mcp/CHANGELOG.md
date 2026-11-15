# @microfox/mediamake-mcp

## 0.5.0

### Minor Changes

- b400e57: The MediaMake MCP is split in two. **mm-release** (admins, hosted at `/mcp/release`) has the catalog and release tools (`catalog_*`). **mm-use** (every member, hosted at `/mcp/use`) explores and installs items (`explore`, `get_item`, `item_versions`, `install_item`), reports usage as a skill's name and time only (`report_skill_run`, `my_usage`), reports the names and versions of local skills (`report_local_skills`) and sends feedback (`send_feedback`). The old server at `/mcp` and in the `.mcpb` keeps the timeline, preset, transcription, worker, agent and render tools, deprecated and for admins only, and no longer has `catalog_*`. The package exports `createReleaseServer`, `createUseServer`, `createLegacyServer` and `createServer(kind, …)`; the stdio entry takes the server as its first argument (`release`, `use` or `legacy`).
- 5b91083: The catalog tools speak the membership ladder (Public, Plus, Pro, Cohort, Admin; each tier opens everything below it). `catalog_set_stage` sets the lowest membership that opens an item (public, plus, pro, cohort or vault) and `catalog_items` filters by it and by readiness. `catalog_set_health` works for every kind and has `failed`, which needs its reason. New `catalog_set_readiness` marks items Ready with the finished productions that prove it, or back to Beta. `catalog_people` shows who holds each membership, how they got it and how long it lasts; `catalog_set_tier` gives Plus, Pro or Cohort with a source, a reference, a length or permanence; new `catalog_membership` makes one permanent, renews it for a new contribution or ends it. `catalog_invite` takes `tier` instead of `group`.

### Patch Changes

- 8c9ac73: Changes from PR #565: project-thread-ouw5d4
- b74b94d: Changes from PR #569: project-thread-0f7sz5
- 89fffed: Changes from PR #570: project-thread-vr8lp0
- 4001471: catalog_set_readiness takes a picture and a clip for each production (https links), shown in the item's "Made with this" gallery.

## 0.4.1

### Patch Changes

- c0815ad: Changes from PR #531: project-thread-9lumba

## 0.4.0

### Minor Changes

- ae85558: The MediaMake MCP is for admins now (its catalog card is in the vault): it runs the catalog and the video pipeline. Projects (`list_projects`, `get_project`, `create_project`), brand kits (`get_brand_kit`, `upload_brand_kit`, `finish_brand_kit_upload`, `update_brand_kit`) and media (`list_media`, `search_media`, `get_media`, `upload_media`) moved to ProjectSync (`packages/projectsync-mcp`); the project-scoped timeline tools take project ids from ProjectSync's `list_projects`.

### Patch Changes

- 556b8e8: Changes from PR #487: shorts-elevenlabs-transcription
- ae8cc8f: Changes from PR #488: projectsync-mcp

## 0.3.0

### Minor Changes

- f7cb3dc: `catalog_set_video` and `catalog_add_video_item`: set a catalog item's YouTube video (a skill's intro, a tutorial's video, a course's lessons; fields left out keep their value, a thumbnail can be uploaded from a local file) and add tutorials and courses, from Claude.

### Patch Changes

- 8426264: Changes from PR #483: catalog-videos-and-courses

## 0.2.1

### Patch Changes

- 4f1c262: Changes from PR #480: project-thread-h9hvnz
- 02c532c: Changes from PR #477: catalog-archive-and-mcp-tools

## 0.2.0

### Minor Changes

- 6abf982: `list_generations` and `rate_generation`: read a channel's Suno song takes (styles, lyrics, model, settings, audio, parent take) and rate them keeper, maybe or reject, with notes and the productions they were used in.

### Patch Changes

- 1d05e02: Changes from PR #472: suno-generations

## 0.1.4

### Patch Changes

- 36e8e89: Changes from PR #470: catalog-updates

## 0.1.3

### Patch Changes

- be81b9a: Changes from PR #443: project-thread-mbswnf
- 8dc15b3: Changes from PR #449: make-lyrics-shorts-summerstyle-boldwords

## 0.1.2

### Patch Changes

- e6d03ad: Changes from PR #439: project-thread-jkksvn

## 0.1.1

### Patch Changes

- 745ba5b: Changes from PR #427: project-thread-jxhzh2
- f23ca8d: Changes from PR #424: project-thread-jxhzh2
