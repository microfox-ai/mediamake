---
"@microfox/mediamake-mcp": minor
---

mm-use sets an item's headshot and icon, for the item's authors and for admins, so a listing's pictures no longer need the admins' connector. `upload_item_picture` gives a signed link to upload one picture from the user's computer, the `curl` line that sends it and the picture's public link; `set_item_pictures` puts it on the listing, live at once. The rest of a listing stays in mm-release's `catalog_set_listing`.
