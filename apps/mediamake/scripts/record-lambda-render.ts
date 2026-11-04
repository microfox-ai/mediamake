/**
 * Record a Lambda render that mediamake started but could not write down (its start call lost the
 * Mongo connection, 2026-11-04), with the progress and cost Lambda reports, through the app's own
 * DB classes, so the render shows in the history and its cost in the platform's cost usage.
 *
 *   cd apps/mediamake && npx tsx scripts/record-lambda-render.ts <renderId> <clientId> [--composition=<id>] [--site=<siteName>] [--file=<name>] [--region=<region>] [--function=<functionName>] [--bucket=<bucketName>]
 *
 * Region, function and bucket default to the ones in config.mjs / .env: the default region, the
 * 3 GB 900 s function, Remotion's bucket for the region. Reads .env itself.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const name of ['.env', '.env.local']) {
  const file = path.join(APP, name);
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2');
  }
}

const args = process.argv.slice(2);
const flag = (k: string) => args.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [renderId, clientId] = args.filter(a => !a.startsWith('--'));
if (!renderId || !clientId) {
  console.error('Usage: npx tsx scripts/record-lambda-render.ts <renderId> <clientId> [--composition=…] [--site=…] [--file=…] [--region=…] [--function=…] [--bucket=…]');
  process.exit(1);
}

const { getRenderProgress, getOrCreateBucket } = await import('@remotion/lambda');
const { speculateFunctionName } = await import('@remotion/lambda/client');
const { DEFAULT_REGION, AWS_RENDER_CONFIGS } = await import('../config.mjs');
const { renderRequestDB } = await import('../lib/render-mongodb');
const { platformCostUsageDB } = await import('../lib/cost-usage-mongodb');

const region = (flag('region') ?? process.env.REMOTION_AWS_REGION ?? DEFAULT_REGION) as import('@remotion/lambda').AwsRegion;
const bucketName = flag('bucket') ?? (await getOrCreateBucket({ region })).bucketName;
const fallback = AWS_RENDER_CONFIGS['complex-fast'];
const functionName = flag('function') ?? speculateFunctionName({ memorySizeInMb: fallback.memory, diskSizeInMb: fallback.disk, timeoutInSeconds: fallback.timeout });

const progress = await getRenderProgress({ renderId, bucketName, region, functionName });
const composition = flag('composition') ?? progress.renderMetadata?.compositionId ?? 'unknown';
const startedAt = new Date(progress.renderMetadata?.startedDate ?? Date.now()).toISOString();
const status = progress.fatalErrorEncountered ? 'failed' : progress.done ? 'completed' : 'rendering';
const memory = Number(functionName.match(/mem(\d+)mb/)?.[1]) || undefined;
const disk = Number(functionName.match(/disk(\d+)mb/)?.[1]) || undefined;
const timeout = Number(functionName.match(/-(\d+)sec$/)?.[1]) || undefined;

const existing = await renderRequestDB.getById(renderId, clientId);
if (existing) {
  console.log(`Record exists (${existing.status}); updating its progress and cost.`);
  await renderRequestDB.update(renderId, { progressData: progress as never, status, downloadUrl: progress.outputFile ?? undefined, fileSize: progress.outputSizeInBytes ?? undefined }, clientId);
} else {
  await renderRequestDB.create({
    clientId,
    renderId,
    fileName: flag('file') ?? `${composition}.mp4`,
    codec: progress.renderMetadata?.codec ?? 'h264',
    composition,
    status,
    bucketName,
    isDownloadable: true,
    renderType: 'video',
    audioCodec: 'aac',
    regionUsed: region,
    siteName: flag('site'),
    configMode: 'custom',
    memoryUsed: memory,
    diskUsed: disk,
    timeoutUsed: timeout,
    functionNameUsed: functionName,
    downloadUrl: progress.outputFile ?? undefined,
    fileSize: progress.outputSizeInBytes ?? undefined,
    progressData: progress as never,
    createdAt: startedAt,
  } as never);
  console.log(`Record created: ${composition}, ${status}, started ${startedAt}.`);
}
await platformCostUsageDB.upsertAwsRenderCost({
  renderId,
  clientId,
  bucketName,
  createdAt: startedAt,
  cost: { amount: progress.costs.accruedSoFar, currency: progress.costs.currency ?? 'USD', amountUSD: progress.costs.accruedSoFar },
});
console.log(`Cost recorded: ${progress.costs.displayCost} (${progress.lambdasInvoked} Lambdas, ${progress.framesRendered} frames${progress.fatalErrorEncountered ? ', failed' : progress.done ? ', done' : ', still rendering'}).`);
process.exit(0);
