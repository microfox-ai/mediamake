import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MediamakeClient, configFromEnv } from '../../mediamake-mcp/src/client.js';
import { registerBrandKitTools } from './tools/brand-kit.js';
import { registerProductionTools, registerReleaseTools } from './tools/bundles.js';
import { registerMediaTools } from './tools/media.js';
import { registerProjectTools } from './tools/projects.js';
import { registerSharedAssetTools } from './tools/shared.js';
import { registerTodoTools } from './tools/todos.js';

/** MediaMake's own site: where the Spaces MCP points unless the user runs their own. */
export const DEFAULT_API_URL = 'https://mediamake.microfox.app';

const INSTRUCTIONS = `MediaMake Spaces (it was ProjectSync) keeps the files of the user's MediaMake spaces in the cloud. A space is the user's personal one (list_projects marks it personal: only theirs, never shared, renamed or deleted) or a project's (a channel or brand, shared with its team); productions, releases and media always belong to one space, named by its project id. A space's skills, MCPs and apps are not here: they are in its private GitHub repo, which \`mm space sync\` keeps the same on every computer.
- Production: a video's code files and outputs (renders, stills), laid out as code/, output/ and input/. Its inputs go up only when they come to 200 MB or less in all. create_production with the code and output folders.
- Release: a complete release kit (a YouTube upload pack, a DistroKid release folder). create_release with the folder.
- Media: single files (pictures, songs, clips: usually inputs). upload_media. Nothing is analysed on the way in.
- Shared assets: the library files a project's team shares (overlays, footage, art, pictures, references), each with what the media library knows about it (kind, subject, tags), so everyone on the project can download them: list_shared_assets, download_shared_assets (into a folder, or the library's inbox so \`media ingest\` files them), share_assets (owners and editors, under the project's sharing limit: 100 MB in all by default, set_shared_limit raises it, owner only), unshare_assets. Any project can hold them, a channel's or one made just to share files with a team.
- To-dos: a step one place cannot do (an upload that needs a signed-in browser, pictures from Midjourney) waits in the project's queue for a place that can. list_todos shows what waits; post_todo posts one after saving the work to the project; "Pick up to-do td-… in <project>" is claim_todo, then the step, then finish_todo. where_it_runs is the project's register: which cloud environment and which opened computer can do what. A to-do is read by everyone on the project: never a key or a password in it.
Before uploading anything, ask the user whether it should go up as a production, a release or media, and to which project (list_projects); never decide for them. Run create_production / create_release with dryRun first and show them what would go up.
Uploading the same slug again is a new version (update_production / update_release): earlier versions are kept and unchanged files are not sent again. get_production / get_release with saveTo download a version to a folder.
The project's role decides what the user can do: viewers read, owners and editors upload and change, only the owner deletes. Deleting moves things to the project's trash; confirm with the user first.
Brand kits: get_brand_kit before making anything for a brand; upload_brand_kit uploads a pack-brand-kit folder.`;

/** The API config from the environment, MediaMake's own site when no URL is set (an unset .mcpb field arrives as `${user_config.x}`). */
export function apiConfig(env: NodeJS.ProcessEnv = process.env) {
  const url = env.MEDIAMAKE_API_URL?.trim();
  return configFromEnv({ ...env, MEDIAMAKE_API_URL: url && !url.startsWith('${') ? url : DEFAULT_API_URL });
}

/** Builds the MediaMake Spaces MCP server (it was ProjectSync; its id stays `projectsync`): the MediaMake API with a MediaMake key, and files on this computer. */
export function createServer(client = new MediamakeClient(apiConfig())) {
  const server = new McpServer({ name: 'projectsync', title: 'MediaMake Spaces', version: '0.5.0' }, { instructions: INSTRUCTIONS });
  registerBrandKitTools(server, client);
  registerProjectTools(server, client);
  registerProductionTools(server, client);
  registerReleaseTools(server, client);
  registerMediaTools(server, client);
  registerSharedAssetTools(server, client);
  registerTodoTools(server, client);
  return server;
}
