import { useEffect, useMemo, useRef, useState } from 'react';
import {
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { useCanvasSources } from './runtime/assets';
import {
  ScratchPool,
  executePipeline,
  initPipeline,
} from './runtime/pipeline';
import { resolveSeed } from './runtime/random';
import {
  CanvasFrameInfo,
  CanvasOpNode,
  CanvasSourceDef,
} from './types';

export interface UseCanvasPipelineOptions {
  sources?: Record<string, CanvasSourceDef>;
  pipeline: CanvasOpNode[];
  background?: string;
  seed?: number | string;
  /** Stable identity for seeding, usually the component id. */
  id: string;
  /** Sequence duration in frames; defaults to the composition duration. */
  durationInFrames?: number;
}

export interface CanvasPipelineHandle {
  /** True once assets are decoded and op init states are computed. */
  ready: boolean;
  /** Draw the current frame into a 2d context. `scale` maps composition
   * coordinates onto a smaller backing store (used by mask mode). */
  draw: (g: CanvasRenderingContext2D, scale?: number) => void;
  frameInfo: CanvasFrameInfo;
}

/**
 * Core canvas runtime hook: loads sources and runs op inits behind
 * delayRender (render-safe), then exposes a synchronous, deterministic
 * per-frame draw function.
 */
export const useCanvasPipeline = (
  options: UseCanvasPipelineOptions
): CanvasPipelineHandle => {
  const frame = useCurrentFrame();
  const videoConfig = useVideoConfig();
  const assets = useCanvasSources(options.sources);
  const [states, setStates] = useState<Map<string, any> | null>(null);
  const scratchRef = useRef<ScratchPool | null>(null);

  const durationInFrames =
    options.durationInFrames && options.durationInFrames > 0
      ? options.durationInFrames
      : videoConfig.durationInFrames;

  const frameInfo: CanvasFrameInfo = {
    frame,
    fps: videoConfig.fps,
    durationInFrames,
    width: videoConfig.width,
    height: videoConfig.height,
  };

  const seed = useMemo(
    () => resolveSeed(options.seed, options.id),
    [options.seed, options.id]
  );

  // Re-init when the pipeline JSON, seed, or assets change.
  const pipelineKey = useMemo(
    () => JSON.stringify(options.pipeline),
    [options.pipeline]
  );

  useEffect(() => {
    if (!assets) return;
    let cancelled = false;
    const handle = delayRender('canvas: initializing pipeline ops');
    initPipeline(options.pipeline, {
      frame: {
        frame: 0,
        fps: videoConfig.fps,
        durationInFrames,
        width: videoConfig.width,
        height: videoConfig.height,
      },
      assets,
      seed,
    })
      .then((result) => {
        if (!cancelled) setStates(result);
      })
      .catch((err) => {
        console.warn('canvas pipeline init failed', err);
        if (!cancelled) setStates(new Map());
      })
      .finally(() => continueRender(handle));
    return () => {
      cancelled = true;
      continueRender(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    assets,
    pipelineKey,
    seed,
    videoConfig.width,
    videoConfig.height,
    videoConfig.fps,
    durationInFrames,
  ]);

  const ready = assets !== null && states !== null;

  const draw = (g: CanvasRenderingContext2D, scale = 1) => {
    if (!ready || !assets || !states) return;
    if (!scratchRef.current) scratchRef.current = new ScratchPool();

    g.save();
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);
    if (scale !== 1) g.scale(scale, scale);
    if (options.background) {
      g.fillStyle = options.background;
      g.fillRect(0, 0, frameInfo.width, frameInfo.height);
    }
    executePipeline(g, options.pipeline, {
      frame: frameInfo,
      assets,
      seed,
      states,
      scratch: scratchRef.current,
    });
    g.restore();
  };

  return { ready, draw, frameInfo };
};
