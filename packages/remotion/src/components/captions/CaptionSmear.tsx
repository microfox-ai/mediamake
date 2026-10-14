import React, { useContext, useId, useMemo } from 'react';
import { Internals, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { BaseRenderableData } from '../../core/types/renderable.types';
import { useFont } from '../../hooks/useFontLoader';
import { beatEnvelope, buildCaptionBeats, findActiveBeat } from './caption-smear-math';

// One word (or a short run like "an ant") at a time, synced to caption word timings.
// Each beat enters as a tall, vertically smeared gradient streak, snaps into sharp
// glowing text, then greys out just before the next beat cuts in.
export interface CaptionSmearDataProps {
    captions?: any[];
    font?: string;
    colorSpectrum?: {
        color1?: string;
        color2?: string;
        color3?: string;
        color4?: string;
    };
    textStyle?: {
        fontSize?: number;
        textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
        letterSpacing?: string;
    };
    minChars?: number;
}

export interface CaptionSmearProps extends BaseRenderableData {
    data: CaptionSmearDataProps;
}

const DEFAULT_SPECTRUM = ['#FFFFFF', '#FF2BD6', '#22F0E0', '#FFE14D'];

const parseFont = (value: string | undefined) => {
    const [family, weight, style] = (value || 'CoveredByYourGrace').split(':');
    return {
        family: family.trim() || 'CoveredByYourGrace',
        fontWeight: weight ? Number(weight) || undefined : undefined,
        fontStyle: style || undefined,
    };
};

const letterSpacingInPx = (value: string | undefined, fontSize: number) => {
    const match = /^(-?\d*\.?\d+)\s*(em|px)?$/.exec((value ?? '').trim());
    if (!match) return 0;
    const n = Number(match[1]);
    return match[2] === 'px' ? n : n * fontSize;
};

const alpha = (color: string, percent: number) =>
    `color-mix(in srgb, ${color} ${Math.round(percent)}%, transparent)`;

export const CaptionSmear: React.FC<CaptionSmearProps> = ({ data }) => {
    const { captions, font, colorSpectrum, textStyle, minChars } = data ?? {};
    const frame = useCurrentFrame();
    const sequence = useContext(Internals.SequenceContext);
    const { fps, width } = useVideoConfig();
    const filterId = `caption-smear-${useId().replace(/:/g, '')}`;

    // Caption times are composition-absolute; undo the Sequence offset so the atom
    // stays in sync wherever its track is placed or trimmed.
    const absoluteFrame = frame + (sequence ? sequence.cumulatedFrom + sequence.relativeFrom : 0);
    const time = absoluteFrame / fps;

    const parsedFont = parseFont(font);
    const fontOptions = useMemo(
        () => ({ weights: [String(parsedFont.fontWeight ?? 400)], subsets: ['latin'] }),
        [parsedFont.fontWeight]
    );
    const { fontFamily } = useFont(parsedFont.family, fontOptions);

    const beats = useMemo(() => buildCaptionBeats(captions, { minChars }), [captions, minChars]);
    const beat = findActiveBeat(beats, time);
    if (!beat) return null;

    const spectrum = [
        colorSpectrum?.color1,
        colorSpectrum?.color2,
        colorSpectrum?.color3,
        colorSpectrum?.color4,
    ].map((c, i) => c || DEFAULT_SPECTRUM[i]);
    const pick = (offset: number) => spectrum[(beat.index + offset) % spectrum.length];
    const main = pick(0);
    const edgeTop = pick(2);
    const edgeBottom = pick(3);

    const baseSize = textStyle?.fontSize ?? 140;
    const letterSpacing = textStyle?.letterSpacing ?? '0.04em';
    const chars = beat.text.length;
    const estimatedWidth = chars * baseSize * 0.56 + (chars - 1) * letterSpacingInPx(letterSpacing, baseSize);
    const fontSize = baseSize * Math.min(1, (width * 0.88) / Math.max(1, estimatedWidth));

    const env = beatEnvelope(time - beat.start, beat.end - beat.start);

    const smearScaleY = interpolate(env.smearProgress, [0, 1], [2.6, 2.05]);
    const smearScaleX = interpolate(env.smearProgress, [0, 1], [0.9, 0.96]);
    const blurY = fontSize * interpolate(env.smearProgress, [0, 1], [0.13, 0.08]);
    const blurX = fontSize * 0.012;

    const crispScaleY = interpolate(env.snap, [0, 1], [1.3, 1]);
    const settle = interpolate(env.progress, [0, 1], [1, 1.035]);
    const split = fontSize * interpolate(env.snap, [0, 1], [0.06, 0.018]);
    const glow = 1 - env.dim * 0.85;

    const textBase: React.CSSProperties = {
        fontFamily,
        fontSize,
        fontWeight: parsedFont.fontWeight,
        fontStyle: parsedFont.fontStyle,
        letterSpacing,
        textTransform: textStyle?.textTransform ?? 'uppercase',
        lineHeight: 1,
        whiteSpace: 'nowrap',
    };

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg width="0" height="0" className="absolute" aria-hidden>
                <filter id={filterId} x="-20%" y="-60%" width="140%" height="220%">
                    <feGaussianBlur stdDeviation={`${blurX} ${blurY}`} />
                </filter>
            </svg>
            <div className="relative" style={{ transform: `scale(${settle})` }}>
                {env.smear > 0 && (
                    <span
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                            ...textBase,
                            opacity: env.smear,
                            color: 'transparent',
                            backgroundImage: `linear-gradient(to bottom, ${pick(1)} 10%, ${main} 50%, ${pick(3)} 90%)`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            transform: `scale(${smearScaleX}, ${smearScaleY})`,
                            filter: `url(#${filterId}) brightness(1.25)`,
                        }}
                    >
                        {beat.text}
                    </span>
                )}
                <span
                    className="block"
                    style={{
                        ...textBase,
                        opacity: env.crisp * (1 - env.dim * 0.3),
                        color: main,
                        transform: `scaleY(${crispScaleY})`,
                        filter: env.dim > 0 ? `saturate(${1 - env.dim}) brightness(${1 - env.dim * 0.2})` : undefined,
                        textShadow: [
                            `0 ${-split}px 0 ${alpha(edgeTop, 70 * glow)}`,
                            `0 ${split}px 0 ${alpha(edgeBottom, 70 * glow)}`,
                            `0 0 ${fontSize * 0.08}px ${alpha(main, 90 * glow)}`,
                            `0 0 ${fontSize * 0.28}px ${alpha(main, 55 * glow)}`,
                        ].join(', '),
                    }}
                >
                    {beat.text}
                </span>
            </div>
        </div>
    );
};
