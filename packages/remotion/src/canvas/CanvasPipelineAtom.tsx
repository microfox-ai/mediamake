import React, { useEffect, useRef } from 'react';
import { getRemotionEnvironment, useCurrentScale } from 'remotion';
import { BaseRenderableProps, ComponentConfig } from '../core/types';
import { useAnimatedStyles } from '../components/effects';
import { CanvasPipelineData, CanvasPipelineDataSchema } from './types';
import { useCanvasPipeline } from './useCanvasPipeline';
import './ops';

/**
 * CanvasPipeline atom — declarative canvas drawing driven by the op
 * registry. Presets emit `{ sources, pipeline }` JSON; the runtime handles
 * asset loading (render-safe), op precomputation, deterministic randomness,
 * and per-frame drawing. See src/canvas/ops for the op standard library.
 */

interface CanvasPipelineAtomProps extends BaseRenderableProps {
    data: CanvasPipelineData;
}

/**
 * Preview-adaptive backing resolution: in the Player the canvas is displayed
 * scaled down, so drawing the full composition resolution every frame wastes
 * most of the pixels. Follow the player scale (quantized so the backing
 * store isn't resized on every zoom tick). During server rendering
 * (isRendering) always draw at full resolution.
 */
export const useAdaptiveCanvasScale = (renderScale?: number): number => {
    const currentScale = useCurrentScale({ dontThrowIfOutsideOfRemotion: true });
    const { isRendering } = getRemotionEnvironment();
    const explicit = renderScale ?? 1;
    if (isRendering) return explicit >= 1 ? 1 : explicit;

    const dpr =
        typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const target = (currentScale || 1) * dpr * explicit;
    // Quantize to 1/4 steps, clamp to [0.25, 1].
    return Math.min(1, Math.max(0.25, Math.ceil(target * 4) / 4));
};

export const Atom: React.FC<CanvasPipelineAtomProps> = ({ data, id, context }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overrideStyles = useAnimatedStyles(id);
    const resolution = useAdaptiveCanvasScale(data.renderScale);

    const { ready, draw, frameInfo } = useCanvasPipeline({
        sources: data.sources,
        pipeline: data.pipeline ?? [],
        background: data.background,
        seed: data.seed,
        id,
        durationInFrames: context?.timing?.durationInFrames,
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !ready) return;
        const w = Math.max(1, Math.round(frameInfo.width * resolution));
        const h = Math.max(1, Math.round(frameInfo.height * resolution));
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        const g = canvas.getContext('2d');
        if (!g) return;
        draw(g, resolution);
    });

    return (
        <canvas
            ref={canvasRef}
            id={id}
            className={data.className}
            style={{
                width: '100%',
                height: '100%',
                ...data.style,
                ...overrideStyles,
            }}
        />
    );
};

export const config: ComponentConfig = {
    displayName: 'CanvasPipeline',
    type: 'atom',
    isInnerSequence: false,
    props: CanvasPipelineDataSchema,
};
