---
'@microfox/mediamake-mcp': patch
---

Item links now point at each item's own page (`/skills/<slug>`, `/mcps/<slug>`, `/apps/<slug>`) instead of `/access?item=<id>`: mm-use's `page`, and mm-release's `plays` and `catalog_add_third_party`'s `itemPage` (was `installPage`).

Invite codes are retired: `catalog_invite` is gone, `catalog_people` no longer lists invite links, and `catalog_set_tier` takes `admin`, `contribution` or `paid` as the source. A membership is applied for (a contribution, reviewed) or given by an admin.
