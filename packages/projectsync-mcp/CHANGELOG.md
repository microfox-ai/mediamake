# @microfox/projectsync-mcp

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
