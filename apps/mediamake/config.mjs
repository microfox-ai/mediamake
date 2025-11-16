/**
 * Use autocomplete to get a list of available regions.
 * @type {import('@remotion/lambda').AwsRegion}
 */
export const REGION = 'us-east-2';

export const SITE_NAME = 'mediamake';

export const AWS_RENDER_CONFIGS = {
  // 1. COMPLEX & FAST (The "Reliable Beast")
  // High Memory + Max Parallelism.
  // Safest option for long-form content because auto-scaling prevents timeouts.
  'complex-fast': {
    name: 'complex-fast',
    memory: 3008,
    disk: 10240,
    timeout: 900,
    concurrency: undefined, // Auto-scale (Critical for long videos)
    timeoutInMilliseconds: 900 * 1000,
    description: 'Maximum power and speed. Auto-scales to handle any duration safely.',
    bestFor: 'Long-form videos (15m+), heavy motion graphics, and 4K renders.',
    notFor: 'Budget-critical projects where speed is irrelevant.'
  },

  // 2. COMPLEX & SLOW (The "Throttling Shield")
  // High Memory + Restricted Parallelism.
  // Good for medium-length videos where you want to avoid hitting AWS account limits.
  'complex-slow': {
    name: 'complex-slow',
    memory: 3008,
    disk: 10240,
    timeout: 900,
    concurrency: 20, // Fixed split. Safe for ~20-30 min videos.
    timeoutInMilliseconds: 900 * 1000,
    description: 'High stability with controlled concurrency. Prevents "Too Many Requests" errors.',
    bestFor: 'Medium-to-long videos (up to 30 mins) running in parallel with other jobs.',
    notFor: 'Extremely long videos (1hr+) where chunks might exceed the 15min timeout.'
  },

  // 3. BASIC & FAST (The "Listicle Engine")
  // Lower Memory + Max Parallelism.
  // Best for long videos that are visually simple (text/images).
  'basic-fast': {
    name: 'basic-fast',
    memory: 2048,
    disk: 10240,
    timeout: 900,
    concurrency: undefined, // Auto-scale
    timeoutInMilliseconds: 900 * 1000,
    description: 'Economic high-speed render. Good for long duration but low complexity.',
    bestFor: 'Long videos (10m+) with simple slides, text, or stock footage.',
    notFor: 'Heavy visual effects or 4K rendering (Risk of Out-of-Memory crash).'
  },

  // 4. THROTTLED (The "API Safeguard")
  // Low Memory + Very Restricted Parallelism.
  // Prevents banning from external APIs.
  throttled: {
    name: 'throttled',
    memory: 2048,
    disk: 10240,
    timeout: 900,
    concurrency: 10, // Strict limit
    timeoutInMilliseconds: 900 * 1000,
    description: 'Slow, serial rendering to protect external API rate limits.',
    bestFor: 'Videos fetching data from strict APIs (e.g., Weather, Stock Market) or simple Podcasts.',
    notFor: 'Standard video editing. It is painfully slow and can be more expensive due to duration.'
  },

  // 5. CLASSIC (Short Form Only)
  // Original config with strict timeout.
  classic: {
    name: 'classic',
    memory: 3000,
    disk: 10240,
    timeout: 240, // Hard 4 minute limit
    concurrency: undefined,
    timeoutInMilliseconds: 240 * 1000,
    description: 'Legacy high-performance profile with a strict time limit.',
    bestFor: 'Social media clips, Stories, and Shorts (Under 3 minutes).',
    notFor: 'Any video over 3-4 minutes (High risk of 240s timeout failure).'
  },
};
