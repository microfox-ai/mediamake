import { estimatePrice, type AwsRegion } from '@remotion/lambda/client';

/** Remotion adds this per finished Lambda inside its own billing duration. */
const OVERHEAD_MS_PER_LAMBDA = 100;

/**
 * Remotion's accruedSoFar bills every unfinished chunk for (now - startedDate).
 * A progress read after the render has finished therefore reports far more than
 * the render actually cost. The real Lambda time cannot exceed
 * lambdas × chunk span, so cap the estimate at that ceiling.
 */
export function resolveAwsRenderAmountUSD(args: {
  accruedSoFar: number;
  region: string;
  memorySizeInMb: number;
  diskSizeInMb: number;
  lambdasInvoked?: number | null;
  timeToFinishChunks?: number | null;
}): number {
  const accrued = args.accruedSoFar;
  const lambdas = args.lambdasInvoked ?? 0;
  const chunkMs = args.timeToFinishChunks ?? 0;
  if (
    !(lambdas > 0) ||
    !(chunkMs > 0) ||
    !(args.memorySizeInMb > 0) ||
    !(args.diskSizeInMb > 0) ||
    !(accrued > 0)
  ) {
    return accrued;
  }

  try {
    const capped = estimatePrice({
      region: args.region as AwsRegion,
      memorySizeInMb: args.memorySizeInMb,
      diskSizeInMb: args.diskSizeInMb,
      lambdasInvoked: lambdas,
      durationInMilliseconds: lambdas * (chunkMs + OVERHEAD_MS_PER_LAMBDA),
    });
    if (Number.isFinite(capped) && capped >= 0 && capped < accrued) {
      return capped;
    }
  } catch {
    return accrued;
  }
  return accrued;
}
