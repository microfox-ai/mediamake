# MediaMake Spaces (the MCP; it was ProjectSync)

The files half of [MediaMake Spaces](../../apps/mediamake/docs/private-spaces.md). A space is your
**personal** one (only yours) or a **project's** (shared with its team), and it keeps everything for
one body of work: its skills, MCPs and apps in a private GitHub repo (`mm space`), and its files in
MediaMake's storage (this MCP). Its id is still `mcp/projectsync` and its tools keep their names.

A local MCP server (`.mcpb` for Claude Desktop, or stdio for Claude Code) that keeps your MediaMake
spaces' files in the cloud: their **brand kits**, **productions**, **release kits** and **media**, shared with
everyone on the project under the project's permissions. It runs on your computer, so it reads and
writes your files, and it signs in to MediaMake with your **MediaMake API key**.

| What | Is | Tools |
| --- | --- | --- |
| Brand kit | A channel's logo, intros, end screens, fonts, colours, guide | `get_brand_kit`, `upload_brand_kit`, `finish_brand_kit_upload`, `update_brand_kit` |
| Space | Your personal space (`personal` in `list_projects`: never shared, renamed or deleted), or a project: a channel or brand. Everything below belongs to one | `list_projects`, `get_project`, `create_project`, `update_project` |
| Production | A video: its code files and outputs (renders, stills). Its inputs go up only when they come to **200 MB or less** in all | `list_productions`, `get_production`, `create_production`, `update_production`, `delete_production` |
| Release | A complete release kit: a YouTube upload pack, a DistroKid release, … | `list_releases`, `get_release`, `create_release`, `update_release`, `delete_release` |
| Media | Single files (pictures, songs, clips; usually inputs), stored as they are, **never analysed** | `list_media`, `search_media`, `get_media`, `upload_media`, `delete_media` |
| Shared assets | The library files a project's team shares (overlays, footage, art, pictures, references), each with what the media library knows about it (kind, subject, tags), so everyone on the project can download them | `list_shared_assets`, `download_shared_assets`, `share_assets`, `unshare_assets`, `set_shared_limit` |
| To-dos | A step one place cannot do (an upload that needs a signed-in browser, pictures from Midjourney), waiting in the project's queue for a place that can. Only one pick-up succeeds, and its result (the video's link) is kept on it | `list_todos`, `post_todo`, `claim_todo`, `finish_todo` |
| Register | Which cloud environment and which opened computer can do what, by name: renders, keys, MCPs, apps, sign-ins. Never a key | `where_it_runs` |

Whether something goes up as a production, a release or media is **your choice**: Claude asks you each
time, and which project, and shows you what would go up (a dry run) before uploading.

## Setup

You need a MediaMake account with a **Plus membership or above** (cloud projects), and Claude Desktop
or Claude Code.

1. **Get your API key.** Open [MediaMake → API keys](https://mediamake.microfox.app/core/api-keys) and
   create a key (or copy one you have). It is a password: don't paste it into a chat or a repo.
2. **Install it**, one of these ways (with `mm login` done, `mm items install --yes` does it by itself):
   - **One prompt (easiest).** On its MediaMake page
     ([/mcps/projectsync](https://mediamake.microfox.app/mcps/projectsync)) click
     **Copy install prompt** and paste it into Claude Code or Claude Desktop. Claude downloads the
     `.mcpb` and walks you through the rest.
   - **Claude Desktop, by hand.** Download `projectsync.mcpb` from the same page, double-click it (or
     drag it into **Settings → Extensions**), then click **Install**. It asks for:
     - **MediaMake API key**: paste the key from step 1. It is kept in your system keychain.
     - **MediaMake URL**: leave `https://mediamake.microfox.app`.
   - **Claude Code.** Build it once (see Development), then:
     ```bash
     claude mcp add --scope user projectsync -e MEDIAMAKE_API_KEY=<your key> -- node /path/to/mediamake/packages/projectsync-mcp/dist/index.js
     ```
3. **Check it works.** Ask Claude: *"List my MediaMake spaces."* You should see
   your projects and your role on each. A 401 means the key is wrong or disabled; a 403 about a Plus
   membership means your account can't use cloud projects yet (ask a MediaMake admin).

To update, install the newer `.mcpb` the same way (or say "update MediaMake Spaces" to Claude). To remove it,
uninstall it in **Settings → Extensions** (Claude Desktop) or `claude mcp remove projectsync`, and
disable the key on the API keys page if you no longer need it.

## Permissions

Everything follows the project's sharing (owner, editor, viewer):

| Role | Read | Upload and change | Delete |
| --- | --- | --- | --- |
| Owner | ✓ | ✓ | ✓ |
| Editor | ✓ | ✓ | – |
| Viewer | ✓ | – | – |

`get_project` says what your role lets you do. Deleting moves a production, release or media file to
the project's **trash**: it disappears from every list, and its files are kept.

## How it works

- **Productions and releases** are versioned. The first upload of a slug is version 1; uploading it again
  (`update_production` / `update_release` with the folders) makes the next version. Every file is listed
  with its sha256 and only files the cloud doesn't have yet are uploaded; earlier versions are kept.
  Files are stored privately and read through signed links that last an hour. A production is laid out
  as `code/`, `output/` and `input/` (a folder named `input/` inside the code folder counts as inputs);
  hidden files, `node_modules`, `.git` and `dist` are skipped. `get_production` / `get_release` with
  `saveTo` download a version into a folder, skipping files already there unchanged.
- **Media** goes into the project's media library as it is (no image description, no audio analysis);
  a file the project already has (same content) isn't uploaded twice.
- **Shared assets** are the files the media CLI's `media share` and `media sync` move
  (`apps/studio/scripts/library`): `share_assets` sends each file's details (kind, subject, title,
  tags, size) and then the file, under the project's sharing limit (100 MB in all by default; the owner
  raises it with `set_shared_limit`); `download_shared_assets` checks every download against its sha256
  and writes a `<file>.source.json` beside it, so saving into the library's inbox
  (`<inbox>/mediamake-sync/<project>`) has `media ingest` file them with their kind and subject. Any
  project can hold shared assets, a channel's or one made just to share files with a team.
- **Brand kits** use the same tools as the MediaMake MCP: `upload_brand_kit` reads a `pack-brand-kit`
  folder; `finish_brand_kit_upload` adds files already PUT to their upload links (an upload that stopped
  part way). The main logo (the picture shown for the project) is `logo` in `update_brand_kit` or in the
  kit's `brand.json`: the path of an image in the kit. Without one, the server picks a still logo itself.

The MediaMake routes it calls, in `apps/mediamake` (code in `lib/projectsync/`):

| Route | Does |
| --- | --- |
| `GET/POST/PUT/DELETE /api/project/productions`, `POST …/finish` | List, read (with signed links), create, change or add a version, move to the trash; `finish` checks a version's files arrived |
| `GET/POST/PUT/DELETE /api/project/releases`, `POST …/finish` | The same for release kits |
| `GET/POST/DELETE /api/project/media`, `POST …/upload` | List and search, record uploaded files, move to the trash; `upload` hands out upload links |
| `GET/PUT /api/channel-sync`, `GET/PUT …/items`, `POST/PUT/DELETE …/files` | Shared assets (code in `lib/channel-sync/`): the project's limit and role, each asset's details, upload links, confirmations and withdrawals |
| `GET/POST /api/space/todos`, `GET /api/space/places` | A project's to-do queue and its register (code in `lib/space/todos.ts`, `lib/space/register.ts`; `docs/cloud-device-runs.md`) |
| `GET/POST/PUT /api/project`, `/api/project/brand-kit` | Projects and brand kits (owners and editors may rename a project) |

## Development

```bash
npm run build --workspace @microfox/projectsync-mcp       # dist/index.js (stdio)
npm run build:mcpb --workspace @microfox/projectsync-mcp  # projectsync.mcpb
npm test --workspace @microfox/projectsync-mcp
```

It reuses the MediaMake MCP's API client and brand kit tools from `../mediamake-mcp/src`; the build
bundles them in. Point it at a dev server with `MEDIAMAKE_API_URL=http://localhost:3000`.

Release it to the catalog (admins): the card comes from `projectsync.catalog.json` and the notes from
`CHANGELOG.md`, both beside the `.mcpb`. Bump `version` in `package.json` and `mcpb/manifest.json` first.

```bash
cd apps/mediamake
npm run catalog -- release ../../packages/projectsync-mcp/projectsync.mcpb --stage private
```
