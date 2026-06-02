import { createWorker } from '@microfox/ai-worker';
import { z } from 'zod';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { ObjectId } from 'mongodb';
import {
  projectsCol,
  projectFilesCol,
  continuityReportsCol,
  hasAccess,
  toObjectId,
  isValidId,
} from '@/lib/db/collections';
// ─── Inlined schemas (was @/lib/continuity/types) ──────────────────────────
// Inlined into the worker file so Lambda bundling can never silently drop
// the schema definitions. The shared type module still exists for the UI;
// this duplication is intentional.

const FileLocationSchema = z.object({
  filePath: z.string(),
  lineStart: z.number().int().min(1),
  lineEnd: z.number().int().min(1),
  quote: z.string(),
});

const IssueSchema = z.object({
  category: z.enum(['contradiction', 'age', 'timeline', 'location', 'character', 'other']),
  severity: z.enum(['low', 'medium', 'high']),
  title: z.string(),
  description: z.string(),
  locations: z.array(FileLocationSchema).min(1).max(8),
  suggestedResolution: z.string(),
  confidence: z.number().min(0).max(1).default(0.7),
});

type Issue = z.infer<typeof IssueSchema>;

const ShardOutputSchema = z.object({
  issues: z.array(IssueSchema).max(30),
  notes: z.string().optional(),
});

const ContinuityReportSchema = z.object({
  issues: z.array(IssueSchema),
});

type ContinuityScope =
  | { type: 'all' }
  | { type: 'folders'; folderIds: string[] };

interface ContinuityReportStats {
  totalFiles: number;
  totalShards: number;
  durationMs: number;
  tokenEstimate: number;
}
// ─── Inlined helpers ─────────────────────────────────────────────────────────
// All shard / prompt helpers live in this single file so the worker bundler
// has no chance of dropping them. Avoids the previous "no shard logs" failure
// mode where a sub-folder import wasn't included in the deployment package.

interface ShardableFile {
  filePath: string;
  content: string;
}

interface FileShard {
  shardIndex: number;
  files: ShardableFile[];
  totalChars: number;
}

function isProseFile(filePath: string, content: string): boolean {
  if (!content || content.trim().length === 0) return false;
  const name = filePath.split('/').pop() ?? filePath;
  if (name.startsWith('.')) return false;
  if (/\.(json|ya?ml|toml|lock|log)$/i.test(name)) return false;
  if (filePath.toLowerCase().startsWith('.writepad/')) return false;
  return true;
}

function shardFiles(files: ShardableFile[], maxCharsPerShard = 250_000): FileShard[] {
  const filtered = files.filter((f) => isProseFile(f.filePath, f.content));
  if (filtered.length === 0) return [];
  const shards: FileShard[] = [];
  let current: ShardableFile[] = [];
  let currentChars = 0;
  for (const file of filtered) {
    const fileChars = file.content.length;
    if (fileChars > maxCharsPerShard) {
      if (current.length > 0) {
        shards.push({ shardIndex: shards.length, files: current, totalChars: currentChars });
        current = [];
        currentChars = 0;
      }
      shards.push({ shardIndex: shards.length, files: [file], totalChars: fileChars });
      continue;
    }
    if (currentChars + fileChars > maxCharsPerShard && current.length > 0) {
      shards.push({ shardIndex: shards.length, files: current, totalChars: currentChars });
      current = [];
      currentChars = 0;
    }
    current.push(file);
    currentChars += fileChars;
  }
  if (current.length > 0) {
    shards.push({ shardIndex: shards.length, files: current, totalChars: currentChars });
  }
  return shards;
}

function buildShardUserPrompt(shard: FileShard): string {
  const blocks: string[] = [];
  for (const file of shard.files) {
    const lines = file.content.split('\n');
    const numbered = lines
      .map((line, idx) => `${String(idx + 1).padStart(4, ' ')} | ${line}`)
      .join('\n');
    blocks.push(`=== FILE: ${file.filePath} ===\n${numbered}\n`);
  }
  return blocks.join('\n');
}

const CONTINUITY_SYSTEM_PROMPT = `You are a continuity editor for long-form prose (novels, screenplays, narrative non-fiction).

Your job: read the provided files and identify CONCRETE continuity issues. You must return a JSON object matching the supplied schema — no prose preamble.

## Categories of issues you must look for

- **contradiction** — two passages assert incompatible facts (e.g. "the cabin had a red door" vs "the cabin's blue door slammed shut").
- **age** — character ages stated or strongly implied that don't add up (e.g. "Sarah was 17 in chapter 2" vs "her 16th birthday party" later).
- **timeline** — temporal contradictions, gaps, day-of-week mismatches, durations that don't add up.
- **location** — geography or setting inconsistencies.
- **character** — physical traits, names, relationships, occupation, possessions changing inconsistently.
- **other** — clear continuity issues that don't fit the above.

## Rules

1. Every issue MUST cite at least one location with a verbatim file path from the input and 1-indexed line numbers within the visible content.
2. The \`quote\` for each location must be a literal substring from the file at those line numbers.
3. Do NOT report stylistic or grammatical issues, just continuity.
4. Do NOT invent facts. If you're unsure, set \`confidence < 0.5\` and severity \`low\`.
5. Prefer fewer, higher-quality issues over many speculative ones. Hard cap: 30 issues.
6. \`severity\`: \`high\` for plot-breaking issues, \`medium\` for noticeable inconsistencies, \`low\` for nits.
7. \`suggestedResolution\` must be concrete and actionable.`;

function buildShardSystemPrompt(shardIndex: number, totalShards: number): string {
  if (totalShards <= 1) return CONTINUITY_SYSTEM_PROMPT;
  return (
    CONTINUITY_SYSTEM_PROMPT +
    `\n\nNote: this is shard ${shardIndex + 1} of ${totalShards}. Focus on issues fully observable within the files in this shard. Cross-shard issues will be merged in a later step.`
  );
}

const MERGE_SYSTEM_PROMPT = `You are merging continuity-issue lists produced by multiple shard analyses of the same project.

Your tasks:
1. **Deduplicate** — collapse near-duplicate issues describing the same underlying contradiction.
2. **Elevate cross-shard contradictions** — merge into one issue with severity raised by one level.
3. **Drop low-confidence noise** — any issue with confidence < 0.4 unless severity is "high".
4. **Preserve all locations** when merging.
5. Return a JSON object matching the schema. Do not invent new issues.

Hard caps: at most 50 issues in the final output.`;

function buildMergeUserPrompt(shardOutputs: Array<{ shardIndex: number; issues: unknown[] }>): string {
  const blocks = shardOutputs.map(
    (s) => `=== SHARD ${s.shardIndex} ===\n${JSON.stringify(s.issues, null, 2)}`,
  );
  return `Below are issue lists from each shard. Merge per the rules in the system prompt.\n\n${blocks.join('\n\n')}`;
}

/**
 * Continuity Orchestrator Worker
 *
 * Single long-lived Lambda that runs the entire continuity-check pipeline
 * inline (no child-worker fan-out — that pattern was brittle in practice):
 *   1. Loads project files (Mongo) for the requested scope
 *   2. Shards files by token budget
 *   3. Calls `generateObject` for each shard with bounded concurrency
 *   4. Optional final merge pass to dedupe cross-shard issues
 *   5. Persists report into `continuity_reports`
 *
 * Status updates flow back to the client via `ctx.jobStore.update`. The job's
 * `output.reportId` lets the UI fetch the full persisted report.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY ?? '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';

/**
 * Build version stamp — bump this when you change this file so you can verify
 * which version the deployed Lambda is running. If the user's logs show an
 * older version here, they need to run `npx ai-worker push` again.
 */
const BUILD_VERSION = '2026-05-07T06:00Z-fix-concurrency-default-v4';

/** Diagnostic log helper — prefixed so it's easy to find in CloudWatch. */
function logStep(step: string, data?: Record<string, unknown>) {
  // Use a single recognizable prefix so CloudWatch filtering is easy.
  console.log(`[continuity-orchestrator] ${step}`, data ?? {});
}

export const workerConfig = {
  timeout: 900,
  memorySize: 2048,
  group: "continuity",
};

const inputSchema = z.object({
  projectId: z.string(),
  triggeredBy: z.string(),
  scope: z
    .union([
      z.object({ type: z.literal('all') }),
      z.object({ type: z.literal('folders'), folderIds: z.array(z.string()) }),
    ])
    .default({ type: 'all' }),
  modelId: z.string().default('google/gemini-2.5-pro'),
  /** Maximum chars per shard. Defaults vary by model. */
  maxCharsPerShard: z.number().int().positive().optional(),
  /** Concurrent shards. Default 3. */
  concurrency: z.number().int().min(1).max(8).default(3),
});

const outputSchema = z.object({
  reportId: z.string(),
  totalIssues: z.number(),
  totalFiles: z.number(),
  totalShards: z.number(),
  durationMs: z.number(),
});

function resolveModel(modelId: string) {
  const [provider, ...rest] = modelId.split('/');
  const modelName = rest.join('/');
  if (provider === 'google') return google(modelName);
  if (provider === 'anthropic') return anthropic(modelName);
  if (provider === 'openai') return openai(modelName);
  return google('gemini-2.5-pro');
}

interface FlatFile {
  fileId: string;
  filePath: string;
  content: string;
  parentId: string | null;
}

/** Build full path "folder/sub/name.md" for a file given the flat list. */
function computeFilePath(files: Array<{ id: string; name: string; parentId: string | null }>): Map<string, string> {
  const byId = new Map(files.map((f) => [f.id, f]));
  const out = new Map<string, string>();
  function path(id: string, visited: Set<string> = new Set()): string {
    if (visited.has(id)) return '';
    visited.add(id);
    const f = byId.get(id);
    if (!f) return '';
    if (!f.parentId) return f.name;
    const parent = path(f.parentId, visited);
    return parent ? `${parent}/${f.name}` : f.name;
  }
  for (const f of files) out.set(f.id, path(f.id));
  return out;
}

export default createWorker({
  id: 'continuity-orchestrator',
  inputSchema,
  outputSchema,
  handler: async ({ input, ctx }) => {
    const start = Date.now();

    // The worker runtime doesn't run input through the Zod schema's `.default()`
    // resolution — it passes the request body through as-is. Apply defaults
    // explicitly here so missing fields don't yield `undefined` (which then
    // turns Math.min(...) into NaN and silently skips ALL shard processing).
    const projectId = input.projectId;
    const triggeredBy = input.triggeredBy;
    const scope: ContinuityScope = input.scope ?? { type: 'all' };
    const modelId = input.modelId ?? 'google/gemini-2.5-pro';
    const concurrency =
      typeof input.concurrency === 'number' && input.concurrency > 0
        ? Math.min(8, input.concurrency)
        : 3;

    logStep('handler.start', {
      buildVersion: BUILD_VERSION,
      jobId: ctx.jobId,
      projectId,
      modelId,
      scope,
      concurrency,
      rawConcurrency: input.concurrency,
      hasGeminiKey: !!GEMINI_API_KEY,
      hasAnthropicKey: !!ANTHROPIC_API_KEY,
      hasOpenAiKey: !!OPENAI_API_KEY,
    });

    /**
     * Top-level error wrapper. ANY thrown error inside the handler is caught
     * here, logged with full stack trace, written to a "failed" continuity
     * report (so the UI can show it even when the worker job log is truncated),
     * and re-thrown so the worker_jobs status flips to 'failed'.
     */
    try {
    const maxCharsPerShard =
      input.maxCharsPerShard ??
      (modelId.startsWith('google/') ? 250_000 : 150_000);

    await ctx.jobStore?.update({
      status: 'running',
      progress: 1,
      progressMessage: 'Loading project files…',
      metadata: { projectId, phase: 'loading', buildVersion: BUILD_VERSION },
    });

    // ─── Auth / load files ─────────────────────────────────────────────
    logStep('auth.start', { projectId, triggeredBy });
    if (!isValidId(projectId)) {
      throw new Error(`Invalid projectId: ${projectId}`);
    }
    const project = await (await projectsCol()).findOne({ _id: toObjectId(projectId) });
    if (!project) throw new Error('Project not found');
    if (!hasAccess(project, triggeredBy)) {
      throw new Error(`Access denied for project ${projectId} (clientId=${triggeredBy})`);
    }
    logStep('auth.ok', { projectName: project.name });

    logStep('files.load.start');
    const allFilesRaw = await (await projectFilesCol()).find({ projectId }).toArray();
    logStep('files.load.done', { totalRows: allFilesRaw.length });
    const fileEntries = allFilesRaw.map((f) => ({
      id: f._id.toHexString(),
      name: f.name,
      type: f.type,
      parentId: f.parentId,
      content: f.content,
    }));
    const pathMap = computeFilePath(fileEntries);

    const flat: FlatFile[] = fileEntries
      .filter((f) => f.type === 'file')
      .map((f) => ({
        fileId: f.id,
        filePath: pathMap.get(f.id) ?? f.name,
        content: f.content,
        parentId: f.parentId,
      }));

    // Apply scope filter
    let scoped = flat;
    if (scope.type === 'folders') {
      const targetIds = new Set(scope.folderIds);
      // Include files whose ancestor chain hits any of the target folder ids
      const allowed = new Set<string>();
      function addDescendants(parentId: string) {
        for (const f of fileEntries) {
          if (f.parentId === parentId) {
            allowed.add(f.id);
            if (f.type === 'folder') addDescendants(f.id);
          }
        }
      }
      for (const fid of targetIds) addDescendants(fid);
      scoped = flat.filter((f) => allowed.has(f.fileId));
    }

    // ─── Shard ─────────────────────────────────────────────────────────
    await ctx.jobStore?.update({
      progress: 5,
      progressMessage: 'Sharding files…',
      metadata: { projectId, phase: 'sharding', totalFiles: scoped.length },
    });

    logStep('shard.start', {
      scopedFiles: scoped.length,
      maxCharsPerShard,
      sampleFiles: scoped.slice(0, 3).map((f) => ({
        path: f.filePath,
        chars: f.content.length,
      })),
    });
    const shards = shardFiles(
      scoped.map((f) => ({ filePath: f.filePath, content: f.content })),
      maxCharsPerShard,
    );
    logStep('shard.done', {
      shardCount: shards.length,
      shardSizes: shards.map((s) => ({
        index: s.shardIndex,
        files: s.files.length,
        chars: s.totalChars,
      })),
    });

    if (shards.length === 0) {
      // Nothing to analyze — persist an empty report and exit cleanly.
      const reportId = await persistReport({
        projectId,
        jobId: ctx.jobId ?? 'unknown',
        triggeredBy,
        scope,
        modelId,
        status: 'completed',
        issues: [],
        stats: {
          totalFiles: 0,
          totalShards: 0,
          durationMs: Date.now() - start,
          tokenEstimate: 0,
        },
      });

      await ctx.jobStore?.update({
        status: 'completed',
        progress: 100,
        progressMessage: 'No prose files to analyze.',
        output: {
          reportId,
          totalIssues: 0,
          totalFiles: 0,
          totalShards: 0,
          durationMs: Date.now() - start,
        },
        metadata: { reportId, phase: 'done' },
      });

      return {
        reportId,
        totalIssues: 0,
        totalFiles: 0,
        totalShards: 0,
        durationMs: Date.now() - start,
      };
    }

    if (shards.length > 40) {
      throw new Error(
        `Project too large for a single continuity check (${shards.length} shards > 40 limit). Narrow your scope to specific folders.`,
      );
    }

    // ─── Pre-flight: API key check ────────────────────────────────────
    // Surface a clear error before we start dispatching expensive work.
    const provider = modelId.split('/')[0];
    if (provider === 'google' && !GEMINI_API_KEY) {
      throw new Error(
        'Missing GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY) on the worker Lambda. ' +
          'Set it in your Lambda environment configuration before running continuity checks with a Google model.',
      );
    }
    if (provider === 'anthropic' && !ANTHROPIC_API_KEY) {
      throw new Error('Missing ANTHROPIC_API_KEY on the worker Lambda.');
    }
    if (provider === 'openai' && !OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY on the worker Lambda.');
    }

    // ─── Analyze shards inline (no child-worker dispatch) ──────────────
    // Calls generateObject directly inside this Lambda with bounded
    // concurrency. Avoids the brittle dispatch/poll round-trip that was
    // returning empty output without ever invoking the child Lambda.
    const projectMeta = { name: project.name, type: project.type };
    const projectHeader = projectMeta?.name
      ? `Project: ${projectMeta.name}${projectMeta.type ? ` (${projectMeta.type})` : ''}\n\n`
      : '';
    const shardOutputs: Array<{
      shardIndex: number;
      issues: Issue[];
      errorMessage?: string;
      durationMs: number;
    }> = [];
    let shardsCompleted = 0;

    async function analyzeShard(shard: FileShard): Promise<void> {
      const shardStart = Date.now();
      const systemPrompt = buildShardSystemPrompt(shard.shardIndex, shards.length);
      const userPrompt = buildShardUserPrompt(shard);
      const promptChars = systemPrompt.length + userPrompt.length + projectHeader.length;

      logStep('shard.analyze.start', {
        shardIndex: shard.shardIndex,
        fileCount: shard.files.length,
        totalChars: shard.totalChars,
        promptChars,
        modelId,
      });

      try {
        const { object } = await generateObject({
          model: resolveModel(modelId) as any,
          schema: ShardOutputSchema,
          system: systemPrompt,
          prompt: projectHeader + userPrompt,
          temperature: 0.2,
        });
        shardOutputs.push({
          shardIndex: shard.shardIndex,
          issues: object.issues,
          durationMs: Date.now() - shardStart,
        });
        logStep('shard.analyze.done', {
          shardIndex: shard.shardIndex,
          issueCount: object.issues.length,
          durationMs: Date.now() - shardStart,
        });
      } catch (e: any) {
        const errorMessage = e?.message ?? String(e);
        const errorStack = e?.stack;
        const errorName = e?.name;
        const errorCode = e?.code ?? e?.cause?.code;
        const errorStatus = e?.status ?? e?.statusCode;
        const errorBody = e?.responseBody ?? e?.body;
        console.error('[continuity-orchestrator] shard.analyze.error', {
          shardIndex: shard.shardIndex,
          errorMessage,
          errorName,
          errorCode,
          errorStatus,
          errorBody:
            typeof errorBody === 'string'
              ? errorBody.slice(0, 1000)
              : errorBody,
          errorStack,
          modelId,
        });
        shardOutputs.push({
          shardIndex: shard.shardIndex,
          issues: [],
          errorMessage,
          durationMs: Date.now() - shardStart,
        });
      } finally {
        shardsCompleted += 1;
        // Shard analysis = 10–80% of overall progress
        const pct = 10 + Math.round((shardsCompleted / shards.length) * 70);
        await ctx.jobStore?.update({
          progress: pct,
          progressMessage: `Analyzed shard ${shardsCompleted}/${shards.length}`,
          metadata: {
            projectId,
            phase: 'analyzing',
            totalShards: shards.length,
            shardsCompleted,
            partialIssueCount: shardOutputs.reduce((s, o) => s + o.issues.length, 0),
          },
        });
      }
    }

    // Manual semaphore over the shard list — runs `parallelCount` shards in
    // parallel via Promise.all, each pulling from a shared queue.
    const parallelCount = Math.max(
      1,
      Math.min(Number.isFinite(concurrency) ? concurrency : 3, shards.length),
    );
    logStep('shards.run.start', {
      totalShards: shards.length,
      concurrency,
      parallelCount,
    });
    if (!Number.isFinite(parallelCount) || parallelCount < 1) {
      // Defensive: should never happen with the clamping above, but if it does
      // we want to fail LOUD instead of silently skipping all shards.
      throw new Error(
        `Invalid parallel count for shard analysis: ${parallelCount} (concurrency=${concurrency}, shards=${shards.length})`,
      );
    }
    const queue = Array.from({ length: shards.length }, (_, i) => i);
    async function pump() {
      while (queue.length) {
        const idx = queue.shift();
        if (idx === undefined) return;
        await analyzeShard(shards[idx]);
      }
    }
    await Promise.all(
      Array.from({ length: parallelCount }, () => pump()),
    );
    logStep('shards.run.done', {
      shardOutputs: shardOutputs.length,
      withErrors: shardOutputs.filter((s) => s.errorMessage).length,
      totalIssues: shardOutputs.reduce((s, o) => s + o.issues.length, 0),
    });

    // Sanity check: if we expected to run shards but somehow got zero outputs,
    // fail loudly. The previous bug silently skipped this path.
    if (shards.length > 0 && shardOutputs.length === 0) {
      throw new Error(
        `Internal error: ${shards.length} shards were prepared but zero were processed. ` +
          `parallelCount=${parallelCount}, concurrency=${concurrency}.`,
      );
    }

    // ─── Merge ─────────────────────────────────────────────────────────
    await ctx.jobStore?.update({
      progress: 85,
      progressMessage: 'Merging shard results…',
      metadata: { projectId, phase: 'merging' },
    });

    const allRawIssues: Issue[] = shardOutputs.flatMap((s) => s.issues);
    let mergedIssues: Issue[] = allRawIssues;

    if (allRawIssues.length > 0 && shards.length > 1) {
      try {
        const { object } = await generateObject({
          model: resolveModel(modelId) as any,
          schema: ContinuityReportSchema,
          system: MERGE_SYSTEM_PROMPT,
          prompt: buildMergeUserPrompt(
            shardOutputs.map((s) => ({ shardIndex: s.shardIndex, issues: s.issues })),
          ),
          temperature: 0.2,
        });
        mergedIssues = object.issues;
      } catch (e: any) {
        console.error('[continuity-orchestrator] merge step failed; using raw issues', e);
        // Fall back to raw issues — better partial result than failure.
      }
    }

    // Validate every merged issue against the schema; drop bad ones quietly.
    mergedIssues = mergedIssues.filter((iss) => IssueSchema.safeParse(iss).success);

    // ─── Aggregate shard errors ────────────────────────────────────────
    // A shard "succeeded" if it returned >0 issues OR explicitly returned
    // empty without an errorMessage. Anything else counts as a failure.
    const shardErrors = shardOutputs
      .filter((s) => s.errorMessage)
      .map((s) => ({ shardIndex: s.shardIndex, message: s.errorMessage! }));

    const successfulShards = shardOutputs.length - shardErrors.length;

    // If EVERY shard failed, this is a real failure — throw so the worker job
    // ends in `status: 'failed'` and the user sees a clear error in the UI.
    if (shardOutputs.length > 0 && successfulShards === 0) {
      const summary = shardErrors
        .slice(0, 3)
        .map((e) => `shard ${e.shardIndex}: ${e.message}`)
        .join(' · ');
      throw new Error(
        `All ${shardErrors.length} shard${shardErrors.length === 1 ? '' : 's'} failed. ${summary}` +
          (shardErrors.length > 3 ? ` (+${shardErrors.length - 3} more)` : ''),
      );
    }

    // ─── Persist ───────────────────────────────────────────────────────
    await ctx.jobStore?.update({
      progress: 95,
      progressMessage: 'Saving report…',
      metadata: { projectId, phase: 'persisting' },
    });

    const tokenEstimate = Math.round(
      shards.reduce((s, sh) => s + sh.totalChars, 0) / 4,
    );

    const reportId = await persistReport({
      projectId,
      jobId: ctx.jobId ?? 'unknown',
      triggeredBy,
      scope,
      modelId,
      // Partial success — some shards failed but at least one returned data.
      status: shardErrors.length > 0 ? 'failed' : 'completed',
      errorMessage:
        shardErrors.length > 0
          ? `${shardErrors.length}/${shardOutputs.length} shards failed: ${shardErrors
              .slice(0, 3)
              .map((e) => `shard ${e.shardIndex} — ${e.message}`)
              .join('; ')}`
          : undefined,
      issues: mergedIssues,
      shardErrors,
      stats: {
        totalFiles: scoped.length,
        totalShards: shards.length,
        durationMs: Date.now() - start,
        tokenEstimate,
      },
    });

    const result = {
      reportId,
      totalIssues: mergedIssues.length,
      totalFiles: scoped.length,
      totalShards: shards.length,
      durationMs: Date.now() - start,
    };

    await ctx.jobStore?.update({
      status: 'completed',
      progress: 100,
      progressMessage: `Found ${mergedIssues.length} issue${mergedIssues.length === 1 ? '' : 's'}.`,
      output: result,
      metadata: {
        projectId,
        phase: 'done',
        reportId,
        totalIssues: mergedIssues.length,
        totalShards: shards.length,
        buildVersion: BUILD_VERSION,
      },
    });

    logStep('handler.done', {
      reportId,
      totalIssues: mergedIssues.length,
      totalShards: shards.length,
      durationMs: Date.now() - start,
    });

    return result;
    } catch (e: any) {
      // ─── Top-level error handler ───────────────────────────────────────
      const errorMessage = e?.message ?? String(e);
      const errorStack = e?.stack;
      console.error('[continuity-orchestrator] handler.fatal', {
        buildVersion: BUILD_VERSION,
        jobId: ctx.jobId,
        projectId,
        durationMs: Date.now() - start,
        errorMessage,
        errorName: e?.name,
        errorCode: e?.code ?? e?.cause?.code,
        errorStatus: e?.status ?? e?.statusCode,
        errorStack,
      });

      // Persist a failed continuity_report so the UI can display the error
      // even if the worker job log is truncated or unavailable.
      let failedReportId: string | undefined;
      try {
        failedReportId = await persistReport({
          projectId,
          jobId: ctx.jobId ?? 'unknown',
          triggeredBy,
          scope,
          modelId,
          status: 'failed',
          issues: [],
          stats: {
            totalFiles: 0,
            totalShards: 0,
            durationMs: Date.now() - start,
            tokenEstimate: 0,
          },
          errorMessage: `[${BUILD_VERSION}] ${errorMessage}`,
          shardErrors: [
            {
              shardIndex: -1,
              message:
                errorStack
                  ? `${errorMessage}\n\nStack:\n${String(errorStack).slice(0, 1500)}`
                  : errorMessage,
            },
          ],
        });
      } catch (persistErr: any) {
        console.error('[continuity-orchestrator] failed to persist failure report', {
          persistError: persistErr?.message ?? String(persistErr),
        });
      }

      // Mark the worker job as failed so the WorkerRunPane shows it.
      await ctx.jobStore?.update({
        status: 'failed',
        error: { message: errorMessage, stack: errorStack },
        metadata: {
          projectId,
          phase: 'failed',
          buildVersion: BUILD_VERSION,
          reportId: failedReportId,
        },
      }).catch(() => {});

      // Re-throw so the worker runtime also marks this as a failure.
      throw e;
    }
  },
});

// ─── Persistence helper ──────────────────────────────────────────────────────

interface PersistArgs {
  projectId: string;
  jobId: string;
  triggeredBy: string;
  scope: ContinuityScope;
  modelId: string;
  status: 'completed' | 'failed';
  issues: Issue[];
  stats: ContinuityReportStats;
  errorMessage?: string;
  shardErrors?: Array<{ shardIndex: number; message: string }>;
}

async function persistReport(args: PersistArgs): Promise<string> {
  const col = await continuityReportsCol();
  const _id = new ObjectId();
  const now = new Date();
  await col.insertOne({
    _id,
    projectId: args.projectId,
    jobId: args.jobId,
    triggeredBy: args.triggeredBy,
    scope: args.scope,
    modelId: args.modelId,
    status: args.status,
    issues: args.issues,
    stats: args.stats,
    errorMessage: args.errorMessage,
    shardErrors: args.shardErrors,
    createdAt: now,
    completedAt: now,
  } as any);
  return _id.toHexString();
}
