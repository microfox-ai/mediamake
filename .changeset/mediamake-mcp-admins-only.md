---
"@microfox/mediamake-mcp": minor
---

The MediaMake MCP is for admins now (its catalog card is in the vault): it runs the catalog and the video pipeline. Projects (`list_projects`, `get_project`, `create_project`), brand kits (`get_brand_kit`, `upload_brand_kit`, `finish_brand_kit_upload`, `update_brand_kit`) and media (`list_media`, `search_media`, `get_media`, `upload_media`) moved to ProjectSync (`packages/projectsync-mcp`); the project-scoped timeline tools take project ids from ProjectSync's `list_projects`.
