---
"@microfox/mediamake-mcp": minor
"@microfox/projectsync-mcp": patch
---

mm-use reads the Cloud Library: `list_library`, `search_library`, `get_library_entry`, `read_library_entry` and `library_made_from` (by SHA-256), the same read-only tools as in MediaMake Spaces. `search_library` takes `byMeaning`, which matches the words by what an entry is about and gives the piece of its lyrics or transcript that fits. Nothing is saved or downloaded from the hosted connector.
