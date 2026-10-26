import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MediamakeClient, configFromEnv } from './client.js';
import { registerBrandKitTools } from './tools/brand-kit.js';
import { registerMediaTools } from './tools/media.js';
import { registerPresetTools } from './tools/presets.js';
import { registerProjectTools } from './tools/projects.js';
import { registerRenderTools } from './tools/renders.js';
import { registerTranscriptionTools } from './tools/transcription.js';
import { registerWorkerTools } from './tools/workers.js';

const INSTRUCTIONS = `Mediamake turns JSON into Remotion videos.
A project holds timelines. A timeline is a list of preset instances (a full/scene preset such as base-scene, then tracks such as sub-vertical-float captions or waveform, then effects) plus defaultData.references (captions, audio, images) that preset inputs point at.
Timelines come in three formats: "tree" (current, has a nodes instance tree), "flat" (older, presets only) and "legacy-preset-data" (oldest, deprecated). Learn from tree timelines first.
Typical flows: transcribe a song -> create_timeline / add_preset_to_timeline -> render_presets or render. Use survey_timelines and get_timeline to see how existing videos are built before making new ones.
Workers (run_worker) and renders cost money; confirm with the user before large batches.`;

export function createServer(client = new MediamakeClient(configFromEnv())) {
  const server = new McpServer(
    { name: 'mediamake', version: '0.1.0' },
    { instructions: INSTRUCTIONS },
  );
  registerProjectTools(server, client);
  registerBrandKitTools(server, client);
  registerPresetTools(server, client);
  registerMediaTools(server, client);
  registerTranscriptionTools(server, client);
  registerWorkerTools(server, client);
  registerRenderTools(server, client);
  return server;
}

async function main() {
  const config = configFromEnv();
  if (!config.apiKey) {
    // Fine against a dev server with DEV_API_KEY set; anything else answers 401.
    console.error(
      `[mediamake-mcp] MEDIAMAKE_API_KEY is not set; calling ${config.baseUrl} without a key.`,
    );
  }
  const server = createServer(new MediamakeClient(config));
  await server.connect(new StdioServerTransport());
  console.error(`[mediamake-mcp] ready, API ${config.baseUrl}`);
}

main().catch(error => {
  console.error('[mediamake-mcp] fatal:', error);
  process.exit(1);
});
