# @microfox/mediamake-mcp

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
