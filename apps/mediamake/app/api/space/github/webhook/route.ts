import { NextRequest, NextResponse } from 'next/server';
import { githubGrants } from '@/lib/space/github-store';
import { readHook, signatureOk, webhookSecret } from '@/lib/space/github-webhook';
import { spaceDB } from '@/lib/space/store';

/**
 * POST /api/space/github/webhook
 * The webhook URL of MediaMake's GitHub App (docs/private-spaces.md, "The
 * GitHub App"). For GitHub, not for people, and outside the middleware: a
 * delivery is taken only when its X-Hub-Signature-256 is the one
 * GITHUB_APP_WEBHOOK_SECRET gives its raw body. What each event does:
 * lib/space/github-webhook.ts.
 */
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const secret = webhookSecret();
  if (!secret) return NextResponse.json({ error: 'GITHUB_APP_WEBHOOK_SECRET is not set on this deployment' }, { status: 503 });
  const raw = await req.text();
  if (!signatureOk(raw, req.headers.get('x-hub-signature-256'), secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const event = req.headers.get('x-github-event');
  let payload: unknown = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Send JSON (the App\'s webhook content type is application/json)' }, { status: 400 });
  }
  const act = readHook(event, payload);
  if (!act) return NextResponse.json({ ok: true, did: 'nothing' });

  try {
    if (act.do === 'forget-grant') {
      const forgotten = await githubGrants.forgetGithubAccount(act.githubId, act.revoke);
      return NextResponse.json({ ok: true, did: act.do, connections: forgotten });
    }
    if (act.do === 'rename-repo') return NextResponse.json({ ok: true, did: act.do, spaces: await spaceDB.renameRepo(act.from, act.to) });
    return NextResponse.json({ ok: true, did: act.do, spaces: await spaceDB.forgetRepo(act.repo) });
  } catch (error) {
    // a 5xx makes the delivery show as failed on the App's page, where it can be sent again
    console.error(`[spaces] GitHub webhook ${event} failed:`, error instanceof Error ? error.message : 'error');
    return NextResponse.json({ error: 'Could not apply that delivery' }, { status: 503 });
  }
}
