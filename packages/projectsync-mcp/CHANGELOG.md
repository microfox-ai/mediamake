# @microfox/projectsync-mcp

## 0.1.5

### Patch Changes

- c0815ad: Changes from PR #531: project-thread-9lumba
- 3a1ceab: Changes from PR #539: project-thread-42czmp

## 0.1.4

### Patch Changes

- 5fb8f09: Changes from PR #506: shared-project-assets

## 0.3.0

A project's shared assets: the library files a team shares (overlays, footage, art, pictures, references), each with what the media library knows about it (kind, subject, title, tags), so everyone on the project can download them. `list_shared_assets` lists them with the project's sharing limit; `download_shared_assets` saves them into a folder, checked against their sha256, with a `.source.json` beside each that the media library's `media ingest` reads (save into the library's inbox to have them filed); `share_assets` uploads files from this computer with their kind, subject and tags (owners and editors, under the limit, 100 MB in all by default); `unshare_assets` stops sharing; `set_shared_limit` changes the limit (owner only). Any project can hold shared assets, a channel's or one made just to share files with a team; they are the same files `media share --project=<id>` and `media sync --project=<id>` move in the media CLI.

## 0.2.0

Choose a brand kit's main logo, the picture shown for its project: `update_brand_kit` takes `logo`, the path (or URL) of an image already in the kit, and `null` goes back to the automatic pick. `upload_brand_kit` reads `logo` from the kit's `brand.json` when that image goes up in the same upload, and says so when it doesn't. `get_brand_kit` and the upload summary show which image it is. If the logo's own file fails to upload, the rest of the kit is still saved, without the logo.

## 0.1.3

### Patch Changes

- 5e33c7f: Changes from PR #499: brand-kit-main-logo

## 0.1.2

### Patch Changes

- 80b4618: Changes from PR #490: projectsync-live

## 0.1.1

### Patch Changes

- ae8cc8f: Changes from PR #488: projectsync-mcp

## 0.1.0

First release. Keep MediaMake projects in the cloud from Claude: brand kits, projects, productions (a video's code and outputs, inputs up to 200 MB), release kits (YouTube, DistroKid) and media (never analysed), each tied to a project and governed by its permissions: viewers read, owners and editors upload, only the owner deletes (to the project's trash). Versions upload only changed files and keep earlier ones; get_production and get_release download a version to a folder.
