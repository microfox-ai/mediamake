import { InputCompositionProps } from "@microfox/remotion";

export interface RenderRequest {
  id: string;
  fileName: string;
  codec: string;
  composition: string;
  status: "pending" | "rendering" | "completed" | "failed";
  createdAt: string;
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
  awsRenderPreset?:
    | 'complex-fast'
    | 'complex-slow'
    | 'basic-fast'
    | 'throttled'
    | 'classic';
  concurrencyUsed?: number;
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
