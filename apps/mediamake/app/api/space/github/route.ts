import { NextRequest, NextResponse } from 'next/server';
import { githubConfigured } from '@/lib/space/github';
import { githubGrants } from '@/lib/space/github-store';

/**
 * GET    /api/space/github   whether this account connected GitHub for its projects, and as whom
 * DELETE /api/space/github   disconnects: the grant is taken back at GitHub and deleted here
 * Connecting starts at /api/space/github/start. Behind the middleware: x-client-id is the caller.
 */
export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ available: githubConfigured(), ...(await githubGrants.status(clientId)) });
}

export async function DELETE(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ removed: await githubGrants.remove(clientId), connected: false });
}
