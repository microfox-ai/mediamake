import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getClientId } from '@/lib/auth-utils';

const MIDJOURNEY_BASE = 'https://www.midjourney.com';
const SUBMIT_JOBS_PATH = '/api/submit-jobs';
const JOB_STATUS_PATH = '/api/job-status';
const CDN_BASE = 'https://cdn.midjourney.com';
const DEFAULT_BATCH_SIZE = 4;

type AuthType = 'cookies';

type Cookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
};

interface PlatformAuth {
  platform: string;
  authType: AuthType;
  credentials: {
    cookies?: Cookie[];
  };
  expiresAt?: Date;
  updatedAt: Date;
  clientId: string;
}

function buildCookieHeader(cookies: Cookie[]): string {
  // Build cookie header exactly as browser sends it - no URL encoding, semicolon-separated
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getChannelIdFromCookies(cookies: Cookie[]): string {
  const authCookie = cookies.find((c) => c.name === '__Host-Midjourney.AuthUserTokenV3_i');
  if (!authCookie?.value) {
    throw new Error(
      'channelId is required. Export cookies that include __Host-Midjourney.AuthUserTokenV3_i from midjourney.com.'
    );
  }
  const payload = decodeJwtPayload(authCookie.value);
  const midjourneyId = payload?.midjourney_id;
  if (typeof midjourneyId !== 'string' || !midjourneyId) {
    throw new Error('Could not read midjourney_id from auth cookie.');
  }
  return `singleplayer_${midjourneyId}`;
}

function buildImageUrls(jobId: string, batchSize: number): string[] {
  return Array.from({ length: batchSize }, (_, i) => `${CDN_BASE}/${jobId}/0_${i}.png`);
}

type JobStatusEntry = { id?: string; current_status?: string; batch_size?: number };

async function pollJobStatus(
  cookieHeader: string,
  apiJobId: string,
  maxMs: number,
  pollIntervalMs: number
): Promise<{ current_status: string; batch_size: number } | null> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const res = await fetch(`${MIDJOURNEY_BASE}${JOB_STATUS_PATH}`, {
      method: 'POST',
      headers: {
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json',
        priority: 'u=1, i',
        'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-csrf-protection': '1',
        cookie: cookieHeader,
        Referer: `${MIDJOURNEY_BASE}/jobs/${apiJobId}?index=0`,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        jobIds: [apiJobId],
        _frontend_source: 'useJobSubmitter_fetchJobStatus',
      }),
    });
    if (!res.ok) return null;
    let data: JobStatusEntry[] = [];
    try {
      data = (await res.json()) as JobStatusEntry[];
    } catch {
      return null;
    }
    const job = data?.find((j) => j.id === apiJobId) ?? data?.[0];
    if (!job) return null;
    const status = job.current_status ?? '';
    const batchSize = typeof job.batch_size === 'number' ? job.batch_size : DEFAULT_BATCH_SIZE;
    if (status === 'completed') return { current_status: status, batch_size: batchSize };
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  return null;
}

type SubmitBody = {
  prompt: string;
  mode?: 'fast' | 'relax';
  private?: boolean;
  waitForCompletion?: boolean;
  waitForCompletionMaxMs?: number;
  pollIntervalMs?: number;
};

export async function POST(req: NextRequest) {
  try {
    const clientId = getClientId(req);
    if (!clientId) {
      return NextResponse.json({ error: 'Client ID required (x-client-id)' }, { status: 401 });
    }

    const body = (await req.json()) as SubmitBody;
    const prompt = body.prompt?.trim();
    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const mode = body.mode ?? 'fast';
    const privateMode = body.private ?? false;
    const waitForCompletion = body.waitForCompletion ?? false;
    const waitForCompletionMaxMs = body.waitForCompletionMaxMs ?? 600_000;
    const pollIntervalMs = body.pollIntervalMs ?? 5_000;

    const db = await getDatabase();
    const authDoc = await db
      .collection<PlatformAuth>('platformAuth')
      .findOne({ clientId, platform: 'midjourney' });

    if (!authDoc || authDoc.authType !== 'cookies' || !authDoc.credentials.cookies?.length) {
      return NextResponse.json(
        { error: 'No Midjourney cookies stored for this client.' },
        { status: 401 }
      );
    }

    const cookies = authDoc.credentials.cookies;
    
    // Validate critical cookies are present
    const hasCfClearance = cookies.some((c) => c.name === 'cf_clearance');
    const hasCfBm = cookies.some((c) => c.name === '__cf_bm');
    const hasAuthToken = cookies.some((c) => c.name === '__Host-Midjourney.AuthUserTokenV3_i');
    
    if (!hasCfClearance) {
      console.warn('[midjourney-submit] WARNING: cf_clearance cookie missing! Cloudflare will likely block this request.');
    }
    if (!hasCfBm) {
      console.warn('[midjourney-submit] WARNING: __cf_bm cookie missing!');
    }
    if (!hasAuthToken) {
      return NextResponse.json(
        { error: 'Missing __Host-Midjourney.AuthUserTokenV3_i cookie. Re-export cookies from extension.' },
        { status: 401 }
      );
    }
    
    const cookieHeader = buildCookieHeader(cookies);

    let channelId: string;
    try {
      channelId = getChannelIdFromCookies(cookies);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const submitUrl = `${MIDJOURNEY_BASE}${SUBMIT_JOBS_PATH}`;
    const submitBody = {
      f: { mode, private: privateMode },
      channelId,
      roomId: null as null,
      metadata: {
        isMobile: null,
        imagePrompts: 0,
        imageReferences: 0,
        characterReferences: 0,
        depthReferences: 0,
        lightboxOpen: null,
      },
      t: 'imagine' as const,
      prompt,
    };
    // Log for debugging (remove in production)
    console.log('[midjourney-submit] Submitting with', {
      url: submitUrl,
      cookieCount: cookies.length,
      cookieNames: cookies.map((c) => c.name),
      hasCfClearance,
      hasCfBm,
      channelId,
    });

    const submitHeaders = {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'content-type': 'application/json',
      priority: 'u=1, i',
      'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-csrf-protection': '1',
      cookie: cookieHeader,
      Referer: `${MIDJOURNEY_BASE}/imagine`,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
    };

    const res = await fetch(submitUrl, {
      method: 'POST',
      headers: submitHeaders,
      body: JSON.stringify(submitBody),
    });

    const responseText = await res.text();

    if (!res.ok) {
      // Debug: log what Cloudflare returned (status, headers, body snippet)
      const isCloudflareChallenge =
        res.status === 403 && responseText.includes('Just a moment');
      console.error('[midjourney-submit] Request failed:', {
        status: res.status,
        statusText: res.statusText,
        cfRay: res.headers.get('cf-ray') ?? null,
        server: res.headers.get('server') ?? null,
        contentType: res.headers.get('content-type') ?? null,
        bodySnippet: responseText.slice(0, 400),
        isCloudflareChallenge,
      });
      // Cloudflare often blocks server-side requests: cf_clearance is bound to the IP/TLS
      // fingerprint of the browser that solved the challenge; server IP and Node TLS differ.
      return NextResponse.json(
        {
          error: isCloudflareChallenge
            ? 'Cloudflare 403: cf_clearance is bound to the browser IP/TLS that solved the challenge. Requests from this server use a different IP or TLS fingerprint, so Cloudflare blocks them. Submit from the extension while on midjourney.com, or use a browser-based proxy.'
            : `Midjourney API returned ${res.status}: ${responseText.slice(0, 200)}`,
        },
        { status: 502 }
      );
    }

    let data: { success?: Array<{ job_id?: string; is_queued?: boolean }>; failure?: unknown[] } = {};
    try {
      if (responseText) data = JSON.parse(responseText) as typeof data;
    } catch {
      // ignore parse error, treat as generic success
    }

    const failures = data.failure ?? [];
    if (Array.isArray(failures) && failures.length > 0) {
      const first = failures[0] as { message?: string } | string;
      const msg = typeof first === 'object' && first?.message ? first.message : JSON.stringify(first);
      return NextResponse.json(
        { error: `Midjourney reported failure: ${msg}` },
        { status: 502 }
      );
    }

    const successList = data.success ?? [];
    const firstSuccess = successList[0];
    const apiJobId = firstSuccess?.job_id ?? null;

    if (!apiJobId) {
      return NextResponse.json(
        { error: 'No job_id returned from Midjourney.' },
        { status: 502 }
      );
    }

    if (!waitForCompletion) {
      return NextResponse.json({
        success: true,
        message: 'Prompt submitted. Check Midjourney for results.',
        jobId: apiJobId,
      });
    }

    const status = await pollJobStatus(cookieHeader, apiJobId, waitForCompletionMaxMs, pollIntervalMs);
    if (!status) {
      return NextResponse.json(
        {
          success: true,
          message: 'Prompt submitted, but job-status polling timed out. Check Midjourney manually.',
          jobId: apiJobId,
        },
        { status: 200 }
      );
    }

    const imageUrls = buildImageUrls(apiJobId, status.batch_size);
    return NextResponse.json({
      success: true,
      message: `Prompt completed. ${imageUrls.length} image(s) ready.`,
      jobId: apiJobId,
      batchSize: status.batch_size,
      imageUrls,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[midjourney-submit-api] error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

