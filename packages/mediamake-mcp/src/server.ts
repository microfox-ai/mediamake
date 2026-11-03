import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { MediamakeClient, configFromEnv } from './client.js';
import { registerBrandKitTools } from './tools/brand-kit.js';
import { registerCatalogTools } from './tools/catalog.js';
import { registerGenerationTools } from './tools/generations.js';
import { registerMediaTools } from './tools/media.js';
import { registerPresetTools } from './tools/presets.js';
import { registerProjectTools } from './tools/projects.js';
import { registerRenderTools } from './tools/renders.js';
import { registerTranscriptionTools } from './tools/transcription.js';
import { registerWorkerTools } from './tools/workers.js';
import type { ToolOptions } from './util.js';

export { MediamakeClient, MediamakeApiError, configFromEnv } from './client.js';
export type { MediamakeConfig } from './client.js';
export type { ToolOptions } from './util.js';

export interface ServerOptions extends ToolOptions {
  /** Shown by clients next to the server's name (the hosted route passes the brand mark). */
  icons?: Implementation['icons'];
  websiteUrl?: string;
}

const INSTRUCTIONS = `Mediamake turns JSON into Remotion videos.
A project holds timelines. A timeline is a list of preset instances (a full/scene preset such as base-scene, then tracks such as sub-vertical-float captions or waveform, then effects) plus defaultData.references (captions, audio, images) that preset inputs point at.
Timelines come in three formats: "tree" (current, has a nodes instance tree), "flat" (older, presets only) and "legacy-preset-data" (oldest, deprecated). Learn from tree timelines first.
Typical flows: transcribe a song -> create_timeline / add_preset_to_timeline -> render_presets or render. Use survey_timelines and get_timeline to see how existing videos are built before making new ones.
A project is a channel or brand: get_brand_kit has its look, list_generations its song takes made with Suno (rated keeper, maybe or reject with rate_generation).
Workers (run_worker) and renders cost money; confirm with the user before large batches.
Admins manage the catalog (skills, MCPs, apps, tutorials, courses) with catalog_items, catalog_item, catalog_archive, catalog_set_stage, catalog_add_third_party and catalog_invite, its YouTube videos (a skill's intro, tutorials, courses) with catalog_set_video and catalog_add_video_item, and people with catalog_people and catalog_set_tier (private testers get every MCP in development with no per-item grants). Each answers with the items' release pages: give the user those links after every change.`;

const HOSTED_NOTE = `
This is the hosted connector: it runs on the Mediamake servers and cannot read or write files on the user's computer. Bring media in by public https URL (upload_media with sourceUrl). upload_brand_kit takes the kit's file list and returns upload URLs for the big files: PUT them (curl from the kit folder), then call finish_brand_kit_upload.`;

/**
 * Builds the Mediamake MCP server. The stdio entry (index.ts) and the hosted
 * /mcp route in apps/mediamake both use it; the hosted one passes
 * `{ localFiles: false }`.
 */
export function createServer(
  client = new MediamakeClient(configFromEnv()),
  options: ServerOptions = { localFiles: true },
) {
  const server = new McpServer(
    {
      name: 'mediamake',
      title: 'MediaMake',
      version: '0.1.0',
      ...(options.icons ? { icons: options.icons } : {}),
      ...(options.websiteUrl ? { websiteUrl: options.websiteUrl } : {}),
    },
    {
      instructions: options.localFiles
        ? INSTRUCTIONS
        : INSTRUCTIONS + HOSTED_NOTE,
    },
  );
  registerProjectTools(server, client);
  registerBrandKitTools(server, client, options);
  registerGenerationTools(server, client);
  registerPresetTools(server, client);
  registerMediaTools(server, client, options);
  registerTranscriptionTools(server, client, options);
  registerWorkerTools(server, client);
  registerRenderTools(server, client, options);
  registerCatalogTools(server, client, options);
  return server;
}
