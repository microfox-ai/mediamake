---
'@microfox/mediamake-mcp': patch
---

Item links now point at each item's own page (`/skills/<slug>`, `/mcps/<slug>`, `/apps/<slug>`) instead of `/access?item=<id>`: mm-use's `page`, and mm-release's `plays` and `catalog_add_third_party`'s `itemPage` (was `installPage`).
