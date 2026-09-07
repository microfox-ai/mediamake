import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkersConfigKey } from '@microfox/ai-worker';

/**
 * GET /api/workflows/workers-config
 *
 * Proxies the full workers-config response directly from the serverless API.
 * Returns the raw config (workers, schemas, queues, …) so clients get everything
 * in one request without going through the registry abstraction.
 */
export async function GET(_req: NextRequest) {
  const base = (process.env.WORKERS_CONFIG_API_URL || process.env.WORKER_BASE_URL)?.trim().replace(/\/+$/, '');
  if (!base) {
    return NextResponse.json(
      { error: 'WORKERS_CONFIG_API_URL or WORKER_BASE_URL is not configured' },
      { status: 503 },
    );
  }

  const configUrl = base.endsWith('/workers/config') ? base : `${base}/workers/config`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Resolve the same key every other consumer path uses: explicit
  // WORKERS_CONFIG_API_KEY / WORKERS_API_KEY, else the projectId-derived key
  // (sha256('microfox-workers:'+MICROFOX_PROJECT_ID)). A raw env read here would
  // miss the projectId-derived key the deployed Lambda enforces → 401.
  const apiKey = resolveWorkersConfigKey();
  if (apiKey) headers['x-workers-config-key'] = apiKey;

  try {
    const res = await fetch(configUrl, { method: 'GET', headers });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[workers-config] Upstream error', res.status, text.slice(0, 200));
      return NextResponse.json(
        { error: `Upstream workers-config failed: ${res.status} ${res.statusText}` },
        { status: res.status },
      );
    }
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error('[workers-config] Fetch failed:', err?.message);
    return NextResponse.json({ error: err?.message ?? 'Failed to fetch workers config' }, { status: 500 });
  }
}
