import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MediamakeClient, configFromEnv } from '../../mediamake-mcp/src/client.js';
import { registerBrandKitTools, registerFinishBrandKitUpload } from '../../mediamake-mcp/src/tools/brand-kit.js';
import { registerProductionTools, registerReleaseTools } from './tools/bundles.js';
import { registerMediaTools } from './tools/media.js';
import { registerProjectTools } from './tools/projects.js';

/** MediaMake's own site: where ProjectSync points unless the user runs their own. */
export const DEFAULT_API_URL = 'https://mediamake.microfox.app';

const INSTRUCTIONS = `ProjectSync keeps the user's MediaMake projects in the cloud. A project is a channel or brand; productions, releases and media always belong to one project.
- Production: a video's code files and outputs (renders, stills), laid out as code/, output/ and input/. Its inputs go up only when they come to 200 MB or less in all. create_production with the code and output folders.
- Release: a complete release kit (a YouTube upload pack, a DistroKid release folder). create_release with the folder.
- Media: single files (pictures, songs, clips: usually inputs). upload_media. Nothing is analysed on the way in.
Before uploading anything, ask the user whether it should go up as a production, a release or media, and to which project (list_projects); never decide for them. Run create_production / create_release with dryRun first and show them what would go up.
Uploading the same slug again is a new version (update_production / update_release): earlier versions are kept and unchanged files are not sent again. get_production / get_release with saveTo download a version to a folder.
The project's role decides what the user can do: viewers read, owners and editors upload and change, only the owner deletes. Deleting moves things to the project's trash; confirm with the user first.
Brand kits: get_brand_kit before making anything for a brand; upload_brand_kit uploads a pack-brand-kit folder.`;

/** The API config from the environment, MediaMake's own site when no URL is set (an unset .mcpb field arrives as `${user_config.x}`). */
export function apiConfig(env: NodeJS.ProcessEnv = process.env) {
  const url = env.MEDIAMAKE_API_URL?.trim();
  return configFromEnv({ ...env, MEDIAMAKE_API_URL: url && !url.startsWith('${') ? url : DEFAULT_API_URL });
}

/** Builds the ProjectSync MCP server: the MediaMake API with a MediaMake key, and files on this computer. */
export function createServer(client = new MediamakeClient(apiConfig())) {
  const server = new McpServer({ name: 'projectsync', title: 'ProjectSync', version: '0.1.0' }, { instructions: INSTRUCTIONS });
  registerBrandKitTools(server, client, { localFiles: true });
  registerFinishBrandKitUpload(server, client);
  registerProjectTools(server, client);
  registerProductionTools(server, client);
  registerReleaseTools(server, client);
  registerMediaTools(server, client);
  return server;
}
