/**
 * Default AWS region for Remotion Lambda.
 * Keep `REGION` export for backwards-compat and expose richer region config below.
 * @type {import('@remotion/lambda').AwsRegion}
 */
export const REGION = 'ap-south-1';

// Default region alias used across the app (preferred name going forward)
export const DEFAULT_REGION = REGION;

/**
 * All supported AWS regions for Remotion rendering.
 * Must match regions supported by @remotion/lambda.
 * @type {import('@remotion/lambda').AwsRegion[]}
 */
export const AWS_REGIONS = [
  'us-east-1', // US East (N. Virginia)
  'us-east-2', // US East (Ohio)
  'us-west-1', // US West (N. California)
  'us-west-2', // US West (Oregon)
  'eu-central-1', // Europe (Frankfurt)
  'eu-west-1', // Europe (Ireland)
  'eu-west-2', // Europe (London)
  'eu-west-3', // Europe (Paris)
  'eu-north-1', // Europe (Stockholm)
  'ap-south-1', // Asia Pacific (Mumbai)
  'ap-southeast-1', // Asia Pacific (Singapore)
  'ap-southeast-2', // Asia Pacific (Sydney)
  'ap-northeast-1', // Asia Pacific (Tokyo)
  'ap-northeast-2', // Asia Pacific (Seoul)
  'ap-northeast-3', // Asia Pacific (Osaka)
];

/**
 * Region options with human-readable labels for the UI.
 */
export const AWS_REGION_OPTIONS = AWS_REGIONS.map((value) => {
  const labelMap = {
    'us-east-1': 'US East (N. Virginia)',
    'us-east-2': 'US East (Ohio)',
    'us-west-1': 'US West (N. California)',
    'us-west-2': 'US West (Oregon)',
    'eu-central-1': 'Europe (Frankfurt)',
    'eu-west-1': 'Europe (Ireland)',
    'eu-west-2': 'Europe (London)',
    'eu-west-3': 'Europe (Paris)',
    'eu-north-1': 'Europe (Stockholm)',
    'ap-south-1': 'Asia Pacific (Mumbai)',
    'ap-southeast-1': 'Asia Pacific (Singapore)',
    'ap-southeast-2': 'Asia Pacific (Sydney)',
    'ap-northeast-1': 'Asia Pacific (Tokyo)',
    'ap-northeast-2': 'Asia Pacific (Seoul)',
    'ap-northeast-3': 'Asia Pacific (Osaka)',
  };

  return {
    value,
    label: labelMap[value] ?? value,
  };
});

export const SITE_NAME = 'mediamake';

// ==========================================
// LAMBDA FUNCTION CONFIGURATIONS
// These correspond to deployed Lambda functions
// Deploy using: npx remotion lambda functions deploy --memory=<MB> --timeout=<s> --disk=<MB> --region=us-east-2
// ==========================================

/**
 * Available Lambda memory sizes (in MB)
 * These must be deployed beforehand using the CLI commands
 */
export const LAMBDA_MEMORY_OPTIONS = [
  { value: 1024, label: '1 GB - Lightweight', description: 'Social media clips, simple compositions' },
  { value: 2048, label: '2 GB - Standard', description: 'Most production videos, 1080p content' },
  { value: 3008, label: '3 GB - Performance', description: 'Balanced power, default for most renders' },
  { value: 4096, label: '4 GB - High-Performance', description: 'Complex compositions, 4K content' },
  { value: 6144, label: '6 GB - Maximum', description: 'Broadcast quality, mission-critical' },
  { value: 10240, label: '10 GB - Enterprise', description: 'Ultra-long videos, archival quality' },
];

/**
 * Available timeout options (in seconds)
 * Note: AWS Lambda max timeout is 900 seconds (15 minutes)
 */
export const LAMBDA_TIMEOUT_OPTIONS = [
  { value: 120, label: '2 minutes', description: 'Very short videos only' },
  { value: 180, label: '3 minutes', description: 'Short social media content' },
  { value: 240, label: '4 minutes', description: 'Short videos (classic)' },
  { value: 300, label: '5 minutes', description: 'Standard production' },
  { value: 600, label: '10 minutes', description: 'Medium-length videos' },
  { value: 900, label: '15 minutes (max)', description: 'Long-form content' },
];

/**
 * Disk size options (in MB)
 */
export const LAMBDA_DISK_OPTIONS = [
  // { value: 2048, label: '2 GB', description: 'Basic renders, small outputs' },
  // { value: 5120, label: '5 GB', description: 'Standard renders' },
  { value: 10240, label: '10 GB (max)', description: 'Large outputs, 4K content' },
];

/**
 * Concurrency limits
 * Min: 1, Max: 200 (AWS account limit, can be increased)
 */
export const CONCURRENCY_LIMITS = {
  min: 1,
  max: 200,
  default: 50,
};

/**
 * Frames per Lambda limits
 * Controls how many frames each Lambda processes
 */
export const FRAMES_PER_LAMBDA_LIMITS = {
  min: 1,
  max: 500,
  default: 100,
};

// ==========================================
// PRESET CONFIGURATIONS
// Pre-configured render profiles for common use cases
// ==========================================

export const AWS_RENDER_CONFIGS = {
  // 1. CLASSIC (Short Form Only)
  // Original config with strict timeout - Best for quick social media content
  classic: {
    name: 'Classic',
    memory: 3008,
    disk: 10240,
    timeout: 240, // Hard 4 minute limit
    concurrency: undefined,
    timeoutInMilliseconds: 240 * 1000,
    framesPerLambda: undefined, // Auto
    description: 'Legacy high-performance profile with a strict time limit.',
    bestFor: 'Social media clips, Stories, and Shorts (Under 3 minutes).',
    notFor: 'Any video over 3-4 minutes (High risk of 240s timeout failure).',
    icon: 'Zap',
  },

  // 2. COMPLEX & FAST (The "Reliable Beast")
  // High Memory + Max Parallelism
  // Safest option for long-form content because auto-scaling prevents timeouts
  'complex-fast': {
    name: 'Complex Fast',
    memory: 3008,
    disk: 10240,
    timeout: 900,
    concurrency: undefined, // Auto-scale (Critical for long videos)
    timeoutInMilliseconds: 900 * 1000,
    framesPerLambda: 75, // Lower for faster parallel processing
    description: 'Maximum power and speed. Auto-scales to handle any duration safely.',
    bestFor: 'Long-form videos (15m+), heavy motion graphics, and 4K renders.',
    notFor: 'Budget-critical projects where speed is irrelevant.',
    icon: 'Rocket',
  },

  // 3. COMPLEX & SLOW (The "Throttling Shield")
  // High Memory + Restricted Parallelism
  // Good for medium-length videos where you want to avoid hitting AWS account limits
  'complex-slow': {
    name: 'Complex Slow',
    memory: 3008,
    disk: 10240,
    timeout: 900,
    concurrency: 20, // Fixed split. Safe for ~20-30 min videos.
    timeoutInMilliseconds: 900 * 1000,
    framesPerLambda: 100,
    description: 'High stability with controlled concurrency. Prevents "Too Many Requests" errors.',
    bestFor: 'Medium-to-long videos (up to 30 mins) running in parallel with other jobs.',
    notFor: 'Extremely long videos (1hr+) where chunks might exceed the 15min timeout.',
    icon: 'Shield',
  },

  // 4. BASIC & FAST (The "Listicle Engine")
  // Lower Memory + Max Parallelism
  // Best for long videos that are visually simple (text/images)
  'basic-fast': {
    name: 'Basic Fast',
    memory: 2048,
    disk: 10240,
    timeout: 900,
    concurrency: undefined, // Auto-scale
    timeoutInMilliseconds: 900 * 1000,
    framesPerLambda: 100,
    description: 'Economic high-speed render. Good for long duration but low complexity.',
    bestFor: 'Long videos (10m+) with simple slides, text, or stock footage.',
    notFor: 'Heavy visual effects or 4K rendering (Risk of Out-of-Memory crash).',
    icon: 'Gauge',
  },

  // 5. THROTTLED (The "API Safeguard")
  // Low Memory + Very Restricted Parallelism
  // Prevents banning from external APIs
  throttled: {
    name: 'Throttled',
    memory: 2048,
    disk: 10240,
    timeout: 900,
    concurrency: 10, // Strict limit
    timeoutInMilliseconds: 900 * 1000,
    framesPerLambda: 150, // More frames per lambda = fewer parallel calls
    description: 'Slow, serial rendering to protect external API rate limits.',
    bestFor: 'Videos fetching data from strict APIs (e.g., Weather, Stock Market) or simple Podcasts.',
    notFor: 'Standard video editing. It is painfully slow and can be more expensive due to duration.',
    icon: 'Timer',
  },

  // 6. ULTRA-LIGHTWEIGHT (Budget Mode)
  // Minimal resources for maximum cost savings
  lightweight: {
    name: 'Lightweight',
    memory: 1024,
    disk: 2048,
    timeout: 180,
    concurrency: undefined,
    timeoutInMilliseconds: 180 * 1000,
    framesPerLambda: 150,
    description: 'Minimal resources for maximum cost savings. Ultra-simple renders only.',
    bestFor: 'Very short clips (<30s), animated titles, simple text overlays.',
    notFor: 'Any video with complex effects, videos, or over 30 seconds.',
    icon: 'Leaf',
  },

  // 7. BROADCAST (Maximum Quality)
  // High memory for broadcast-quality output
  broadcast: {
    name: 'Broadcast',
    memory: 6144,
    disk: 10240,
    timeout: 900,
    concurrency: 30, // Controlled for stability
    timeoutInMilliseconds: 900 * 1000,
    framesPerLambda: 60, // Fewer frames for maximum quality per chunk
    description: 'Maximum quality for broadcast-ready output. High stability.',
    bestFor: 'Broadcast quality, 4K+, multiple video layers, mission-critical renders.',
    notFor: 'Budget-sensitive projects or quick previews.',
    icon: 'Tv',
  },

  // 8. ENTERPRISE (Ultra-Long Videos)
  // Maximum resources for hour-long content
  enterprise: {
    name: 'Enterprise',
    memory: 10240,
    disk: 10240,
    timeout: 900,
    concurrency: undefined, // Auto-scale with maximum resources
    timeoutInMilliseconds: 900 * 1000,
    framesPerLambda: 50, // Maximum parallelization
    description: 'Enterprise-grade rendering for ultra-long videos and archival quality.',
    bestFor: 'Hour-long videos, extremely complex animations, archival quality.',
    notFor: 'Standard content - overkill for most use cases.',
    icon: 'Building',
  },
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Get the function name that Remotion will generate for given specs
 * This matches what speculateFunctionName() returns
 */
export function getLambdaFunctionInfo(memory, disk, timeout) {
  return {
    memory,
    disk,
    timeout,
    // Remotion generates function names like: remotion-render-{memory}-{timeout}
    estimatedName: `remotion-render-${memory}-${timeout}`,
  };
}

/**
 * Validate custom configuration values
 */
export function validateCustomConfig(config) {
  const errors = [];

  if (config.memory && !LAMBDA_MEMORY_OPTIONS.find(m => m.value === config.memory)) {
    errors.push(`Invalid memory: ${config.memory}. Must deploy a Lambda with this memory first.`);
  }

  if (config.timeout && (config.timeout < 1 || config.timeout > 900)) {
    errors.push('Timeout must be between 1 and 900 seconds.');
  }

  if (config.concurrency && (config.concurrency < CONCURRENCY_LIMITS.min || config.concurrency > CONCURRENCY_LIMITS.max)) {
    errors.push(`Concurrency must be between ${CONCURRENCY_LIMITS.min} and ${CONCURRENCY_LIMITS.max}.`);
  }

  if (config.framesPerLambda && (config.framesPerLambda < FRAMES_PER_LAMBDA_LIMITS.min || config.framesPerLambda > FRAMES_PER_LAMBDA_LIMITS.max)) {
    errors.push(`Frames per Lambda must be between ${FRAMES_PER_LAMBDA_LIMITS.min} and ${FRAMES_PER_LAMBDA_LIMITS.max}.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
