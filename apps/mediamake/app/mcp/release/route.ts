import { preflight } from '@/lib/mcp/http';
import { mcpHandler } from '@/lib/mcp/serve';

/**
 * mm-release (Streamable HTTP): the catalog and releases, for admins. Add
 * `<app>/mcp/release` as a custom connector in Claude and sign in. Who may
 * use it follows the `mcp/mm-release` catalog item (lib/mcp/access: the
 * vault); lib/mcp/serve has the rest.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const handle = mcpHandler('release', maxDuration);

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
export const OPTIONS = preflight;
