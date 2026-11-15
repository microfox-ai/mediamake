import { preflight } from '@/lib/mcp/http';
import { mcpHandler } from '@/lib/mcp/serve';

/**
 * mm-use (Streamable HTTP): MediaMake for every member. Explore and install
 * items, report usage (a skill's name and time; local skill names and
 * versions) and send feedback. Add `<app>/mcp/use` as a custom connector in
 * Claude and sign in with a MediaMake account. Who may use it follows the
 * `mcp/mm-use` catalog item (lib/mcp/access: every signed-in account);
 * lib/mcp/serve has the rest.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const handle = mcpHandler('use', maxDuration);

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
export const OPTIONS = preflight;
