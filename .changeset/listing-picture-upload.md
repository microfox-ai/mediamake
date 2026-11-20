---
"@microfox/mediamake-mcp": minor
---

mm-release uploads a listing's pictures, so a new headshot, icon or screenshot needs no pull request and no deploy. `catalog_upload_picture` gives a signed link to upload one picture from the user's computer, the `curl` line that sends it and the picture's public link for `catalog_set_listing` or `catalog_set_video`; on the local server `catalog_set_listing` takes `headshotFile` and `iconFile` and uploads them itself.
