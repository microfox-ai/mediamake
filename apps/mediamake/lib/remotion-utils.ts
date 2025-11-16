/**
 * Calculates the minimum concurrency needed to prevent AWS Timeout.
 * * @param {number} durationInSeconds - Length of the video (e.g., 900 for 15 mins)
 * @param {number} fps - Frames per second (e.g., 30)
 * @param {number} lambdaTimeout - The AWS timeout setting (e.g., 900)
 * @param {number} memoryMB - The memory of the config (used to adjust safety factor)
 * @returns {number} The minimum concurrency required (Integer)
 */
export function getSafeConcurrency(
  durationInSeconds: number,
  fps: number,
  lambdaTimeout: number,
  memoryMB: number,
): number {
  // 1. Calculate Total Workload
  const totalFrames = durationInSeconds * fps;

  // 2. Estimate Render Speed based on Memory
  // If memory is low (Basic), assume rendering takes longer (e.g., 2.5s)
  // If memory is high (Complex), assume standard safe time (e.g., 2.0s)
  const estimatedTimePerFrame = memoryMB < 3000 ? 2.5 : 2.0;

  // 3. Calculate Total "Compute Seconds" needed
  const totalComputeSeconds = totalFrames * estimatedTimePerFrame;

  // 4. Define Safe Runtime per Lambda
  // Leave a 200-second buffer for overhead/stitching
  const safeRuntime = lambdaTimeout - 200;

  if (safeRuntime <= 0) {
    throw new Error('Timeout is too short for the safety buffer!');
  }

  // 5. Calculate Concurrency
  // Formula: TotalSeconds / SecondsPerLambda
  const minConcurrency = Math.ceil(totalComputeSeconds / safeRuntime);

  // 6. Hard Limits
  // AWS account limit is usually 1000. Let's cap at 200 to be polite,
  // or return minConcurrency if it's higher.
  return minConcurrency;
}
