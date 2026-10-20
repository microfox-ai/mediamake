import React, { useContext, useId, useMemo } from 'react';
import { Internals, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { BaseRenderableData } from '../../core/types/renderable.types';
import { useFont } from '../../hooks/useFontLoader';
import {
    beatEnvelope,
    buildCaptionBeats,
    findActiveBeat,
    applyLetterSpacingSettle,
    letterSpacingSettle,
} from './caption-smear-math';
import { specialEffectCss } from '../atoms/special-effects-style';

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
    textStyle?: React.CSSProperties;
    /** Max smear length in seconds. Default 0.5. */
    smearThreshold?: number;
    letterSpacingSettle?: {
        enabled?: boolean;
        impact?: number;
    };
    minChars?: number;
}

export interface CaptionSmearProps extends BaseRenderableData {
    data: CaptionSmearDataProps;
}

const DEFAULT_SPECTRUM = ['#FFFFFF', '#FF2BD6', '#22F0E0', '#FFE14D'];

const POSITION_STYLE_KEYS = new Set([
    'position',
    'top',
    'right',
    'bottom',
    'left',
    'inset',
    'insetBlock',
    'insetInline',
    'width',
    'height',
    'minWidth',
    'minHeight',
    'maxWidth',
    'maxHeight',
    'margin',
    'marginTop',
    'marginRight',
    'marginBottom',
    'marginLeft',
    'translate',
    'rotate',
    'scale',
    'transform',
    'transformOrigin',
    'alignSelf',
    'justifySelf',
    'placeSelf',
    'display',
    'alignItems',
    'justifyContent',
    'flexDirection',
    'padding',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
]);

const EFFECT_OWNED_STYLE_KEYS = new Set([
    'color',
    'opacity',
    'background',
    'backgroundImage',
    'backgroundClip',
    'WebkitBackgroundClip',
    'filter',
    'textShadow',
    'transform',
    'letterSpacing',
]);

const parseFont = (value: string | undefined) => {
    const [family, weight, style] = (value || 'CoveredByYourGrace').split(':');
    return {
        family: family.trim() || 'CoveredByYourGrace',
        fontWeight: weight ? Number(weight) || undefined : undefined,
        fontStyle: style || undefined,
    };
};

const familyFromStyle = (style?: React.CSSProperties): string | undefined => {
    const family = style?.fontFamily;
    if (typeof family !== 'string') return undefined;
    const first = family.split(',')[0].replace(/["']/g, '').trim();
    return first || undefined;
};

const numberFromCss = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return undefined;
    const match = /^(-?\d*\.?\d+)/.exec(value.trim());
    return match ? Number(match[1]) : undefined;
};

const letterSpacingInPx = (value: unknown, fontSize: number) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const match = /^(-?\d*\.?\d+)\s*(em|px|%)?$/.exec(String(value ?? '').trim());
    if (!match) return 0;
    const n = Number(match[1]);
    if (match[2] === 'px') return n;
    if (match[2] === '%') return (n / 100) * fontSize;
    return n * fontSize;
};

const splitTextStyle = (style?: React.CSSProperties) => {
    const position: React.CSSProperties = {};
    const text: React.CSSProperties = {};
    if (!style) return { position, text };
    for (const [key, value] of Object.entries(style)) {
        if (value === undefined || EFFECT_OWNED_STYLE_KEYS.has(key)) continue;
        if (POSITION_STYLE_KEYS.has(key)) {
            (position as Record<string, unknown>)[key] = value;
        } else {
            (text as Record<string, unknown>)[key] = value;
        }
    }
    return { position, text };
};

const alpha = (color: string, percent: number) =>
    `color-mix(in srgb, ${color} ${Math.round(percent)}%, transparent)`;

export const CaptionSmear: React.FC<CaptionSmearProps> = ({ data }) => {
    const { captions, font, colorSpectrum, textStyle, smearThreshold, letterSpacingSettle: settleOpts, minChars } =
        data ?? {};
    const frame = useCurrentFrame();
    const sequence = useContext(Internals.SequenceContext);
    const { fps, width } = useVideoConfig();
    const filterId = `caption-smear-${useId().replace(/:/g, '')}`;

    // Caption times are composition-absolute; undo the Sequence offset so the atom
    // stays in sync wherever its track is placed or trimmed.
    const absoluteFrame = frame + (sequence ? sequence.cumulatedFrom + sequence.relativeFrom : 0);
    const time = absoluteFrame / fps;

    const parsedFont = parseFont(font);
    const familyName = familyFromStyle(textStyle) || parsedFont.family;
    const fontWeight = textStyle?.fontWeight ?? parsedFont.fontWeight ?? 400;
    const fontStyle = textStyle?.fontStyle ?? parsedFont.fontStyle;
    const fontOptions = useMemo(
        () => ({
            weights: [String(fontWeight)],
            style: fontStyle === 'italic' ? ('italic' as const) : undefined,
        }),
        [fontWeight, fontStyle]
    );
    const { fontFamily } = useFont(familyName, fontOptions);

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

    const { position: positionStyle, text: typographyStyle } = splitTextStyle(textStyle);
    const baseSize = numberFromCss(textStyle?.fontSize) ?? 140;
    const targetLetterSpacing = textStyle?.letterSpacing ?? '0.04em';
    const localTime = time - beat.start;
    const duration = beat.end - beat.start;
    const spacing = letterSpacingSettle(localTime, duration, settleOpts);
    const targetSpacingPx = letterSpacingInPx(targetLetterSpacing, baseSize);

    const chars = beat.text.length;
    const estimatedWidth = chars * baseSize * 0.56 + Math.max(0, chars - 1) * Math.max(0, targetSpacingPx);
    const fontSize = baseSize * Math.min(1, (width * 0.88) / Math.max(1, estimatedWidth));
    const letterSpacingPx = applyLetterSpacingSettle(
      letterSpacingInPx(targetLetterSpacing, fontSize),
      fontSize,
      spacing,
    );

    const env = beatEnvelope(localTime, duration, { smearThreshold });

    const smearScaleY = interpolate(env.smearProgress, [0, 1], [2.6, 2.05]);
    const smearScaleX = interpolate(env.smearProgress, [0, 1], [0.9, 0.96]);
    const blurY = fontSize * interpolate(env.smearProgress, [0, 1], [0.13, 0.08]);
    const blurX = fontSize * 0.012;

    const crispScaleY = interpolate(env.snap, [0, 1], [1.3, 1]);
    const settle = interpolate(env.progress, [0, 1], [1, 1.035]);
    const split = fontSize * interpolate(env.snap, [0, 1], [0.06, 0.018]);
    const glow = 1 - env.dim * 0.85;

    const textBase: React.CSSProperties = {
        ...typographyStyle,
        fontFamily,
        fontSize,
        fontWeight,
        fontStyle,
        letterSpacing: `${letterSpacingPx}px`,
        textTransform: textStyle?.textTransform ?? 'uppercase',
        lineHeight: typographyStyle.lineHeight ?? 1,
        whiteSpace: 'nowrap',
    };

    return (
        <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={positionStyle}
        >
            <svg width="0" height="0" className="absolute" aria-hidden>
                <filter id={filterId} x="-20%" y="-60%" width="140%" height="220%">
                    <feGaussianBlur stdDeviation={`${blurX} ${blurY}`} />
                </filter>
            </svg>
            <div className="relative" style={{ transform: `scale(${settle})`, ...specialEffectCss(textStyle) }}>
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
                            typeof textStyle?.textShadow === 'string' ? textStyle.textShadow : '',
                            `0 ${-split}px 0 ${alpha(edgeTop, 70 * glow)}`,
                            `0 ${split}px 0 ${alpha(edgeBottom, 70 * glow)}`,
                            `0 0 ${fontSize * 0.08}px ${alpha(main, 90 * glow)}`,
                            `0 0 ${fontSize * 0.28}px ${alpha(main, 55 * glow)}`,
                        ].filter(Boolean).join(', '),
                    }}
                >
                    {beat.text}
                </span>
            </div>
        </div>
    );
};
