/**
 * Midjourney Submit Worker (API-based)
 *
 * Submits a prompt to Midjourney via POST https://www.midjourney.com/api/submit-jobs (cookie auth).
 * Optionally polls job-status until completed and returns all 4 image URLs:
 * https://cdn.midjourney.com/<job_id>/0_0.png ... 0_3.png (see MIDJOURNEY-API-CAPTURE.md).
 *
 * Midjourney base URL is hardcoded; no env required.
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import { z } from 'zod';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';

const MIDJOURNEY_BASE = 'https://www.midjourney.com';
const SUBMIT_JOBS_PATH = '/api/submit-jobs';
const JOB_STATUS_PATH = '/api/job-status';
const CDN_BASE = 'https://cdn.midjourney.com';
const DEFAULT_BATCH_SIZE = 4;

const CookieSchema = z.object({
  name: z.string(),
  value: z.string(),
  domain: z.string().optional(),
  path: z.string().optional(),
});

const InputSchema = z.object({
  prompt: z.string().min(1),
  folderTag: z.string().optional().default(''),
  useLastImage: z.boolean().optional().default(false),
  cookies: z.array(CookieSchema).min(1),
  channelId: z.string().optional(),
  mode: z.enum(['fast', 'relax']).optional().default('fast'),
  private: z.boolean().optional().default(false),
  /** Mediamake API base URL (e.g. https://yourapp.com). If set with apiKey, worker will save generated images to media DB. */
  mediaSaveApiUrl: z.string().optional(),
  /** Bearer token for media save API. */
  apiKey: z.string().optional(),
  /** x-client-id for media save API (required if mediaSaveApiUrl is set). */
  clientId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  /** If true, poll job-status until completed and set output.imageUrls (all 4 images). Default false. */
  waitForCompletion: z.boolean().optional().default(false),
  /** Max ms to wait for completion when waitForCompletion is true. Default 10 min. */
  waitForCompletionMaxMs: z.number().optional().default(600_000),
  /** Poll interval in ms for job-status. Default 5 s. */
  pollIntervalMs: z.number().optional().default(5_000),
});

const OutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  submittedAt: z.string().optional(),
  jobId: z.string().nullable().optional(),
  isQueued: z.boolean().optional(),
  /** Set when waitForCompletion is true and job completed: 4 CDN URLs (0_0.png … 0_3.png). */
  imageUrls: z.array(z.string().url()).optional(),
  batchSize: z.number().optional(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export const workerConfig: WorkerConfig = {
  timeout: 660,
  memorySize: 256,
};

const LOG_PREFIX = '[midjourney-submit]';

function buildCookieHeader(cookies: Input['cookies']): string {
  return cookies.map((c) => `${encodeURIComponent(c.name)}=${encodeURIComponent(c.value)}`).join('; ');
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

function getChannelId(input: Input): string {
  if (input.channelId?.trim()) return input.channelId.trim();
  const authCookie = input.cookies.find((c) => c.name === '__Host-Midjourney.AuthUserTokenV3_i');
  if (!authCookie?.value) {
    throw new Error(
      'channelId is required. Pass channelId in input or export cookies that include __Host-Midjourney.AuthUserTokenV3_i.'
    );
  }
  const payload = decodeJwtPayload(authCookie.value);
  const midjourneyId = payload?.midjourney_id;
  if (typeof midjourneyId !== 'string' || !midjourneyId) {
    throw new Error('Could not read midjourney_id from auth cookie. Pass channelId in input.');
  }
  return `singleplayer_${midjourneyId}`;
}

function buildImageUrls(jobId: string, batchSize: number): string[] {
  return Array.from({ length: batchSize }, (_, i) => `${CDN_BASE}/${jobId}/0_${i}.png`);
}

async function saveImageToMedia(
  imageUrl: string,
  index: number,
  prompt: string,
  jobId: string,
  apiBaseUrl: string,
  apiKey: string,
  clientId: string,
  tags: string[] = []
): Promise<{ success: boolean; mediaFileId?: string; error?: string }> {
  try {
    const fileName = `midjourney_${jobId}_${index}.png`;
    const mediaFileData = {
      tags: tags.length > 0 ? tags : ['midjourney', 'ai-generated'],
      contentType: 'image' as const,
      contentMimeType: 'image/png',
      contentSubType: 'png',
      contentSource: 'midjourney',
      contentSourceUrl: `https://www.midjourney.com/jobs/${jobId}?index=${index}`,
      fileName,
      filePath: imageUrl,
      metadata: {
        promptUsed: prompt,
        jobId,
        imageIndex: index,
        platform: 'midjourney',
        platformUrl: `https://www.midjourney.com/jobs/${jobId}?index=${index}`,
      },
    };

    const res = await fetch(`${apiBaseUrl}/api/media-files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'x-client-id': clientId,
      },
      body: JSON.stringify(mediaFileData),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      return { success: false, error: `Media API ${res.status}: ${errorText.slice(0, 200)}` };
    }

    const result = await res.json();
    return { success: true, mediaFileId: result._id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

type JobStatusEntry = { id?: string; current_status?: string; batch_size?: number };

async function pollJobStatus(
  cookieHeader: string,
  apiJobId: string,
  maxMs: number,
  pollIntervalMs: number,
  onProgress?: (status: string, percent?: number) => void
): Promise<{ current_status: string; batch_size: number } | null> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
        const res = await fetch(`${MIDJOURNEY_BASE}${JOB_STATUS_PATH}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
            Cookie: cookieHeader,
            Referer: `${MIDJOURNEY_BASE}/jobs/${apiJobId}?index=0`,
            'x-csrf-protection': '1',
            'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
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
    onProgress?.(status);
    if (status === 'completed') return { current_status: status, batch_size: batchSize };
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  return null;
}

export default createWorker<typeof InputSchema, Output>({
  id: 'midjourney-submit',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input, ctx }: WorkerHandlerParams<Input, Output>) => {
    const jobId = (ctx as any)?.jobId ?? 'unknown';
    const workerId = (ctx as any)?.workerId ?? 'midjourney-submit';
    console.log(`${LOG_PREFIX} handler invoked jobId=${jobId} workerId=${workerId}`);

    let parsed: Input;
    try {
      parsed = InputSchema.parse(input);
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.error(`${LOG_PREFIX} input validation failed: ${msg}`);
      throw parseErr;
    }

    const {
      prompt,
      cookies,
      mode,
      private: privateMode,
      waitForCompletion,
      waitForCompletionMaxMs,
      pollIntervalMs,
      mediaSaveApiUrl,
      apiKey,
      clientId,
      tags,
    } = parsed;
    const channelId = getChannelId(parsed);
    const submittedAt = new Date().toISOString();
    const shouldSaveMedia = !!(mediaSaveApiUrl && apiKey && clientId);

    try {
      await ctx.jobStore?.update({ status: 'running', progressMessage: 'Submitting to Midjourney...' });

      const url = `${MIDJOURNEY_BASE}${SUBMIT_JOBS_PATH}`;
      const cookieHeader = buildCookieHeader(cookies);

      const body = {
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
        prompt: prompt.trim(),
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
          Cookie: cookieHeader,
          Referer: `${MIDJOURNEY_BASE}/imagine`,
          'x-csrf-protection': '1',
          'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
        },
        body: JSON.stringify(body),
      });

      const responseText = await res.text();
      let data: { success?: Array<{ job_id?: string; is_queued?: boolean }>; failure?: unknown[] } = {};
      try {
        if (responseText) data = JSON.parse(responseText) as typeof data;
      } catch {
        // ignore
      }

      if (!res.ok) {
        const errMessage =
          (data as unknown as { message?: string })?.message ||
          responseText.slice(0, 200) ||
          res.statusText;
        throw new Error(`Midjourney API returned ${res.status}: ${errMessage}`);
      }

      const failures = data.failure ?? [];
      if (Array.isArray(failures) && failures.length > 0) {
        const first = failures[0] as { message?: string } | string;
        const msg = typeof first === 'object' && first?.message ? first.message : JSON.stringify(first);
        throw new Error(`Midjourney reported failure: ${msg}`);
      }

      const successList = data.success ?? [];
      const firstSuccess = successList[0];
      const outJobId = firstSuccess?.job_id ?? null;
      const isQueued = firstSuccess?.is_queued ?? false;

      let imageUrls: string[] | undefined;
      let batchSize: number | undefined;

      if (outJobId && waitForCompletion) {
        await ctx.jobStore?.update({ status: 'running', progressMessage: 'Waiting for Midjourney to finish...' });
        const result = await pollJobStatus(
          cookieHeader,
          outJobId,
          waitForCompletionMaxMs,
          pollIntervalMs,
          (status) => ctx.jobStore?.update({ progressMessage: `Midjourney: ${status}` })
        );
        if (result) {
          batchSize = result.batch_size;
          imageUrls = buildImageUrls(outJobId, batchSize);
          console.log(`${LOG_PREFIX} job completed apiJobId=${outJobId} imageUrls=${imageUrls.length}`);

          // Save images to media DB if configured
          if (shouldSaveMedia && imageUrls.length > 0) {
            await ctx.jobStore?.update({ progressMessage: `Saving ${imageUrls.length} image(s) to media library...` });
            const saveResults = await Promise.allSettled(
              imageUrls.map((url, index) =>
                saveImageToMedia(url, index, prompt, outJobId, mediaSaveApiUrl!, apiKey!, clientId!, tags)
              )
            );
            const saved = saveResults.filter(
              (r) => r.status === 'fulfilled' && r.value.success
            ).length;
            const failed = saveResults.filter(
              (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
            );
            if (failed.length > 0) {
              const errors = failed.map((r) =>
                r.status === 'rejected' ? r.reason : r.value.error
              );
              console.warn(`${LOG_PREFIX} failed to save ${failed.length} image(s):`, errors);
            }
            console.log(`${LOG_PREFIX} saved ${saved}/${imageUrls.length} image(s) to media library`);
          }
        }
      }

      const messageParts: string[] = [];
      if (imageUrls?.length) {
        messageParts.push(`Prompt completed. ${imageUrls.length} image(s) ready.`);
        if (shouldSaveMedia) {
          const savedCount = imageUrls.length; // approximate, actual count logged above
          messageParts.push(`${savedCount} saved to media library.`);
        }
      } else {
        messageParts.push('Prompt submitted.');
        if (shouldSaveMedia) {
          messageParts.push('Set waitForCompletion: true to save images to media library.');
        } else {
          messageParts.push('Set waitForCompletion: true to get image URLs.');
        }
      }

      const output: Output = {
        success: true,
        message: messageParts.join(' '),
        submittedAt,
        jobId: outJobId ?? undefined,
        isQueued,
        imageUrls,
        batchSize,
      };

      await ctx.jobStore?.update({ status: 'completed', output });
      console.log(`${LOG_PREFIX} completed jobId=${jobId} apiJobId=${outJobId ?? 'n/a'}`);
      return output;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : '';
      console.error(`${LOG_PREFIX} failed jobId=${jobId}: ${message}`, stack);

      const output: Output = {
        success: false,
        message: `Failed: ${message}`,
        submittedAt,
      };
      try {
        const errorPayload =
          err instanceof Error
            ? { message: err.message, stack: err.stack, name: err.name }
            : { message: String(err) };
        await ctx.jobStore?.update({ status: 'failed', output, error: errorPayload });
      } catch (updateErr: unknown) {
        console.error(`${LOG_PREFIX} jobStore update failed:`, updateErr instanceof Error ? updateErr.message : String(updateErr));
      }
      throw err;
    }
  },
});
