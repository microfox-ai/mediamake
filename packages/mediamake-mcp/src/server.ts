import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { MediamakeClient, configFromEnv } from './client.js';
import { registerCatalogTools } from './tools/catalog.js';
import { registerGenerationTools } from './tools/generations.js';
import { registerPresetTools } from './tools/presets.js';
import { registerTimelineTools } from './tools/timelines.js';
import { registerRenderTools } from './tools/renders.js';
import { registerTranscriptionTools } from './tools/transcription.js';
import { registerUseTools } from './tools/use.js';
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

const RELEASE_INSTRUCTIONS = `mm-release is for MediaMake admins: it runs the catalog (skill, MCP, app, tutorial and course releases) and the memberships.
Admins manage the catalog with catalog_items, catalog_item, catalog_archive, catalog_set_stage (the lowest membership that opens an item: public, plus, pro, cohort or vault), catalog_set_health (any kind; failed needs its reason), catalog_set_readiness (Beta, or Ready with the productions that prove it), catalog_add_third_party and catalog_invite, its YouTube videos (a skill's intro, tutorials, courses) with catalog_set_video and catalog_add_video_item, and people with catalog_people, catalog_set_tier and catalog_membership. The memberships are a strict ladder (Public, Plus, Pro, Cohort, Admin): each opens everything below it, and a membership earned by contributing lasts 3 months unless an admin makes it permanent. Each answers with the items' release pages: give the user those links after every change.
Using MediaMake (exploring and installing items, usage, feedback) is mm-use's, the connector every member has.`;

const USE_INSTRUCTIONS = `mm-use is MediaMake for every member: the skills, MCPs and apps for making content, from Claude.
explore lists what there is (with the membership that opens each item, and Beta or Ready), get_item shows one, item_versions says what is live, and install_item gives an item's install plan: this server is hosted and installs nothing itself, so carry the plan out on the user's computer as https://github.com/microfox-ai/mediamake/blob/main/install.md says.
Usage is a skill's name and the time it ran, never its arguments, files or folders: report_skill_run where no MediaMake hook runs, my_usage to read it back, report_local_skills for the names and versions of the skills on their computer. A user who turned usage reports off (mm usage off) gets none sent.
send_feedback sends the user's own words to the MediaMake team, only when they say yes. When a MediaMake item went wrong in this conversation, read known_issues for it, then offer once to send what happened. my_feedback shows what they sent before and the team's answers.
Memberships are a ladder (Public, Plus, Pro): each opens everything below it. Plus and Pro come from contributing or from an admin, never from paying.`;

const LEGACY_INSTRUCTIONS = `Deprecated: this is the old MediaMake MCP, kept for MediaMake admins who still use MediaMake Core's video pipeline. The catalog and releases moved to mm-release, and everything a member does (explore, install, usage, feedback) is in mm-use. Nothing new is added here.
Mediamake turns JSON into Remotion videos. A project holds timelines. A timeline is a list of preset instances (a full/scene preset such as base-scene, then tracks such as sub-vertical-float captions or waveform, then effects) plus defaultData.references (captions, audio, images) that preset inputs point at.
Timelines come in three formats: "tree" (current, has a nodes instance tree), "flat" (older, presets only) and "legacy-preset-data" (oldest, deprecated). Learn from tree timelines first.
Typical flows: transcribe a song -> create_timeline / add_preset_to_timeline -> render_presets or render. Use survey_timelines and get_timeline to see how existing videos are built before making new ones. list_generations has a project's song takes made with Suno (rated keeper, maybe or reject with rate_generation).
Projects, brand kits and media are ProjectSync's (the local ProjectSync MCP): list_projects there gives the project ids these tools take.
Workers (run_worker) and renders cost money; confirm with the user before large batches.`;

const HOSTED_NOTE = `
This is the hosted connector: it runs on the Mediamake servers and cannot read or write files on the user's computer. Bring media in by public https URL.`;

/** The three servers this package builds, by the name the stdio entry and the hosted routes use. */
export const SERVER_KINDS = ['release', 'use', 'legacy'] as const;
export type ServerKind = (typeof SERVER_KINDS)[number];

const ABOUT: Record<ServerKind, { name: string; title: string; instructions: string }> = {
  release: { name: 'mm-release', title: 'MediaMake Release', instructions: RELEASE_INSTRUCTIONS },
  use: { name: 'mm-use', title: 'MediaMake', instructions: USE_INSTRUCTIONS },
  legacy: { name: 'mediamake', title: 'MediaMake (deprecated)', instructions: LEGACY_INSTRUCTIONS },
};

function build(kind: ServerKind, options: ServerOptions) {
  const about = ABOUT[kind];
  return new McpServer(
    {
      name: about.name,
      title: about.title,
      version: '0.2.0',
      ...(options.icons ? { icons: options.icons } : {}),
      ...(options.websiteUrl ? { websiteUrl: options.websiteUrl } : {}),
    },
    { instructions: options.localFiles ? about.instructions : about.instructions + HOSTED_NOTE },
  );
}

/**
 * mm-release, for admins: the catalog and releases (`catalog_*`). Served at
 * /mcp/release by apps/mediamake, and by the stdio entry as `release`.
 */
export function createReleaseServer(client = new MediamakeClient(configFromEnv()), options: ServerOptions = { localFiles: true }) {
  const server = build('release', options);
  registerCatalogTools(server, client, options);
  return server;
}

/**
 * mm-use, for every member: explore and install items, usage (a skill's name
 * and time; local skill names and versions) and feedback. Served at /mcp/use.
 * None of its tools read or write files, so it is the same hosted or local.
 */
export function createUseServer(client = new MediamakeClient(configFromEnv()), options: ServerOptions = { localFiles: true }) {
  const server = build('use', options);
  registerUseTools(server, client);
  return server;
}

/**
 * The old MediaMake MCP, deprecated with Core and for admins only: timelines,
 * presets, transcription, Suno takes, workers, agents and renders. Served at
 * /mcp (the hosted route passes `{ localFiles: false }`) and by the .mcpb.
 */
export function createLegacyServer(client = new MediamakeClient(configFromEnv()), options: ServerOptions = { localFiles: true }) {
  const server = build('legacy', options);
  registerTimelineTools(server, client);
  registerGenerationTools(server, client);
  registerPresetTools(server, client);
  registerTranscriptionTools(server, client, options);
  registerWorkerTools(server, client);
  registerRenderTools(server, client, options);
  return server;
}

const BUILDERS = { release: createReleaseServer, use: createUseServer, legacy: createLegacyServer } as const;

/** One of the three by name. */
export function createServer(kind: ServerKind, client = new MediamakeClient(configFromEnv()), options: ServerOptions = { localFiles: true }) {
  return BUILDERS[kind](client, options);
}
