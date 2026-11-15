import { preflight } from '@/lib/mcp/http';
import { mcpHandler } from '@/lib/mcp/serve';

/**
 * The old MediaMake MCP (Streamable HTTP), deprecated with Core and for
 * admins only: timelines, presets, transcription, workers, agents and
 * renders. The catalog moved to mm-release (/mcp/release) and everything a
 * member does to mm-use (/mcp/use). Who may use it follows the
 * `mcp/mediamake` catalog item (lib/mcp/access); lib/mcp/serve has the rest.
 */

export const dynamic = 'force-dynamic';
// Transcriptions and renders wait on the API for minutes.
export const maxDuration = 300;

const handle = mcpHandler('legacy', maxDuration);

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
export const OPTIONS = preflight;
