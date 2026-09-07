import React, { useEffect, useRef } from 'react';
import { BaseRenderableProps, ComponentConfig } from '../core/types';
import { CanvasFxData, CanvasFxDataSchema } from './types';
import { useCanvasPipeline } from './useCanvasPipeline';
import { useAdaptiveCanvasScale } from './CanvasPipelineAtom';
import './ops';

/**
 * CanvasFx — the one generic canvas effect. Unlike the legacy Canvas*
 * effects (which ignored their children and could only draw an imageUrl
 * they loaded themselves), CanvasFx honors the effect contract and treats
 * the pipeline as a treatment for whatever it wraps:
 *
 *  mode: 'mask'     The pipeline's alpha becomes a CSS mask on the children.
 *                   Any reveal geometry (organic burn edges, zig-zag,
 *                   content-aware ordering) now works on VideoAtom, TextAtom,
 *                   whole layout subtrees — anything — without pixel-copying
 *                   the child.
 *  mode: 'overlay'  The pipeline draws above the children (embers, glitch
 *                   slices, grain, particles flying off an element).
 *  mode: 'underlay' Same, drawn behind the children.
 *  mode: 'content'  The pipeline IS the content; children are not rendered.
 */

interface CanvasFxProps extends BaseRenderableProps {
    data: CanvasFxData;
    children?: React.ReactNode;
}

export const CanvasFxEffect: React.FC<CanvasFxProps> = ({
    data,
    id,
    context,
    children,
}) => {
    const parsed = CanvasFxDataSchema.safeParse(data ?? {});
    const fx: CanvasFxData = parsed.success
        ? parsed.data
        : ({ ...data, mode: (data as any)?.mode ?? 'overlay', maskScale: 0.5 } as CanvasFxData);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const maskWrapperRef = useRef<HTMLDivElement>(null);

    const { ready, draw, frameInfo } = useCanvasPipeline({
        sources: fx.sources,
        pipeline: fx.pipeline ?? [],
        background: fx.background,
        seed: fx.seed,
        id: id ?? 'canvas-fx',
        durationInFrames: context?.timing?.durationInFrames,
    });

    const resolution = useAdaptiveCanvasScale(fx.renderScale);

    // Visible canvas modes: content / overlay / underlay.
    useEffect(() => {
        if (fx.mode === 'mask') return;
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

    // Mask mode: draw the pipeline into a reduced offscreen canvas and apply
    // it as a CSS mask on the wrapper. Styles are set via ref (no re-render
    // per frame). The pipeline draws in full composition coordinates; the
    // scale only shrinks the backing store.
    useEffect(() => {
        if (fx.mode !== 'mask') return;
        const wrapper = maskWrapperRef.current;
        if (!wrapper || !ready) return;

        if (!maskCanvasRef.current) {
            maskCanvasRef.current = document.createElement('canvas');
        }
        const maskCanvas = maskCanvasRef.current;
        const scale = fx.maskScale ?? 0.5;
        const w = Math.max(1, Math.round(frameInfo.width * scale));
        const h = Math.max(1, Math.round(frameInfo.height * scale));
        if (maskCanvas.width !== w) maskCanvas.width = w;
        if (maskCanvas.height !== h) maskCanvas.height = h;

        const g = maskCanvas.getContext('2d');
        if (!g) return;
        draw(g, scale);

        const url = `url(${maskCanvas.toDataURL()})`;
        wrapper.style.webkitMaskImage = url;
        wrapper.style.maskImage = url;
        wrapper.style.webkitMaskSize = '100% 100%';
        wrapper.style.maskSize = '100% 100%';
        wrapper.style.webkitMaskRepeat = 'no-repeat';
        wrapper.style.maskRepeat = 'no-repeat';
    });

    const fillStyle: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
    };

    if (fx.mode === 'content') {
        return (
            <canvas
                ref={canvasRef}
                className={fx.className}
                style={{ width: '100%', height: '100%', ...fx.style }}
            />
        );
    }

    if (fx.mode === 'mask') {
        return (
            <div
                ref={maskWrapperRef}
                className={fx.className}
                style={{
                    width: '100%',
                    height: '100%',
                    // Hidden until the first mask frame lands to avoid a
                    // single unmasked flash while assets initialize.
                    ...(ready ? {} : { visibility: 'hidden' as const }),
                    ...fx.style,
                }}
            >
                {children}
            </div>
        );
    }

    const canvasLayer = (
        <canvas ref={canvasRef} style={fillStyle} className={fx.className} />
    );

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', ...fx.style }}>
            {fx.mode === 'underlay' && canvasLayer}
            {children}
            {fx.mode === 'overlay' && canvasLayer}
        </div>
    );
};

export const config: ComponentConfig = {
    displayName: 'CanvasFx',
    description:
        'Generic canvas treatment for wrapped children: mask (alpha reveal), overlay/underlay (drawn layers), or standalone content',
    type: 'layout',
    isInnerSequence: false,
    props: CanvasFxDataSchema,
};
