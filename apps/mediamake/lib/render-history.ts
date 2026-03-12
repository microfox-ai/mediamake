import type { InputCompositionProps } from "@microfox/remotion";

// Custom Lambda configuration type
export interface CustomLambdaConfig {
  memory: number;
  disk: number;
  timeout: number;
  concurrency: number | 'auto';
  framesPerLambda: number | 'auto';
  timeoutInMilliseconds: number;
}

// Configuration mode type
export type ConfigMode = 'preset' | 'custom';

// AWS Render Preset type
export type AwsRenderPreset =
  | 'classic'
  | 'complex-fast'
  | 'complex-slow'
  | 'basic-fast'
  | 'throttled'
  | 'lightweight'
  | 'broadcast'
  | 'enterprise';

export interface RenderRequest {
  id: string;
  fileName: string;
  codec: string;
  composition: string;
  status: "pending" | "rendering" | "completed" | "failed";
  createdAt: string;
  /** Optional project associated with this render (for filtering / grouping). */
  projectId?: string;
  /** Optional tags associated with this render (for filtering). */
  tags?: string[];
  progress?: number;
  error?: string;
  downloadUrl?: string;
  fileSize?: number;
  inputProps?: InputCompositionProps;
  bucketName?: string;
  renderId?: string;
  renderType?: "video" | "audio" | "still";
  audioCodec?: string;
  isDownloadable?: boolean;

  /** AWS region used for this render (when using Lambda). */
  regionUsed?: string;

  /** When true, render is archived (hidden from active list but kept for cost/details). */
  isArchived?: boolean;
  
  // Configuration mode
  configMode?: ConfigMode;
  
  // Preset mode settings
  awsRenderPreset?: AwsRenderPreset;
  
  // Custom mode settings (full config object)
  customConfig?: CustomLambdaConfig;
  
  // Actual values used for rendering (resolved from preset or custom)
  concurrencyUsed?: number;
  framesPerLambdaUsed?: number;
  memoryUsed?: number;
  diskUsed?: number;
  timeoutUsed?: number;
  functionNameUsed?: string;
  
  // Progress data from Remotion
  progressData?: {
    type: string;
    url?: string;
    size?: number;
    renderInfo?: {
      framesRendered?: number;
      bucket?: string;
      renderSize?: number;
      chunks?: number;
      costs?: {
        accruedSoFar?: number;
        displayCost?: string;
        currency?: string;
        disclaimer?: string;
      };
      currentTime?: number;
      done?: boolean;
      encodingStatus?: {
        framesEncoded?: number;
        combinedFrames?: number;
        timeToCombine?: number;
      };
      errors?: any[];
      fatalErrorEncountered?: boolean;
      lambdasInvoked?: number;
      outputFile?: string;
      renderId?: string;
      timeToFinish?: number;
      timeToFinishChunks?: number;
      timeToRenderFrames?: number;
      overallProgress?: number;
      retriesInfo?: any[];
      outKey?: string;
      outBucket?: string;
      mostExpensiveFrameRanges?: Array<{
        timeInMilliseconds: number;
        chunk: number;
        frameRange: [number, number];
      }>;
      timeToEncode?: number;
      outputSizeInBytes?: number;
      type?: string;
      estimatedBillingDurationInMilliseconds?: number;
      timeToCombine?: number;
      combinedFrames?: number;
      renderMetadata?: {
        startedDate?: number;
        totalChunks?: number;
        estimatedTotalLambdaInvokations?: number;
        estimatedRenderLambdaInvokations?: number;
        compositionId?: string;
        siteId?: string;
        codec?: string;
        type?: string;
        imageFormat?: string;
        inputProps?: any;
        lambdaVersion?: string;
        framesPerLambda?: number;
        memorySizeInMb?: number;
        region?: string;
        renderId?: string;
        privacy?: string;
        everyNthFrame?: number;
        frameRange?: [number, number];
        audioCodec?: string | null;
        deleteAfter?: string | null;
        numberOfGifLoops?: number | null;
        downloadBehavior?: any;
        audioBitrate?: number | null;
        muted?: boolean;
        metadata?: any;
        functionName?: string;
        dimensions?: {
          width: number;
          height: number;
        };
        rendererFunctionName?: string;
        scale?: number;
      };
      awsRenderPreset?: string;
      timeoutTimestamp?: number;
      compositionValidated?: number;
      functionLaunched?: number;
      serveUrlOpened?: number;
      artifacts?: any[];
    };
  };
}

/**
 * Helper function to format config display for UI
 */
export function formatRenderConfig(request: RenderRequest): string {
  if (request.configMode === 'custom') {
    return `Custom (${(request.memoryUsed || 3008) / 1024}GB, ${request.timeoutUsed || 900}s)`;
  }
  
  const presetNames: Record<AwsRenderPreset, string> = {
    'classic': 'Classic',
    'complex-fast': 'Complex Fast',
    'complex-slow': 'Complex Slow',
    'basic-fast': 'Basic Fast',
    'throttled': 'Throttled',
    'lightweight': 'Lightweight',
    'broadcast': 'Broadcast',
    'enterprise': 'Enterprise',
  };
  
  return presetNames[request.awsRenderPreset || 'classic'] || 'Classic';
}

/**
 * Helper function to get config summary for display
 */
export function getRenderConfigSummary(request: RenderRequest): {
  mode: string;
  memory: string;
  timeout: string;
  concurrency: string;
  framesPerLambda: string;
  functionName: string;
} {
  return {
    mode: request.configMode === 'custom' ? 'Custom' : `Preset: ${formatRenderConfig(request)}`,
    memory: request.memoryUsed ? `${request.memoryUsed / 1024} GB` : 'N/A',
    timeout: request.timeoutUsed ? `${request.timeoutUsed}s` : 'N/A',
    concurrency: request.concurrencyUsed ? String(request.concurrencyUsed) : 'Auto',
    framesPerLambda: request.framesPerLambdaUsed ? String(request.framesPerLambdaUsed) : 'Auto',
    functionName: request.functionNameUsed || 'N/A',
  };
}
