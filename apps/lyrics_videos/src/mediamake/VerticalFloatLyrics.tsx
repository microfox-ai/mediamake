import React, { useMemo } from 'react';
import type { SceneProps } from '../kit/contract';
import { toCaptions } from './captions';
import { applyContainerLayout, presetTree, runPreset } from './presets';
import { PresetTree } from './PresetTree';

type TextStyle = {
  /** Font, e.g. 'BebasNeue' or 'Roboto:600:italic'. */
  font?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  /** e.g. '0.04em' */
  letterSpacing?: string;
  /** Size relative to avgFontSize. */
  textScale?: number;
  isGlowEnabled?: boolean;
};

export type VerticalFloatAnimation =
  | 'word-fade-letterspace-float'
  | 'scentence-highlight-letterspace-float'
  | 'scentence-highlight-float'
  | 'aggressive-pulse-shake-float'
  | 'melodic-fade-blur-float'
  | 'melodic-wave-breathing'
  | 'melodic-color-flow'
  | 'melodic-gentle-drift'
  | 'horizontal-slide-reveal'
  | 'horizontal-typewriter'
  | 'horizontal-bounce-flow'
  | 'horizontal-ripple-expand'
  | 'horizontal-zoom-cascade';

/** The `sub-vertical-float` preset's inputs, minus the captions (they come from the manifest). */
export type VerticalFloatStyle = {
  avgFontSize?: number;
  colors?: { primary?: string; secondary?: string; accent?: string };
  highlightTextStyle?: TextStyle;
  subTextStyle?: TextStyle;
  textAlign?: 'left' | 'center' | 'right';
  /** Pixels (number) or percent ('12%'). */
  position?: {
    left?: number | string;
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
  };
  subtitleSync?: {
    animationStyle?: VerticalFloatAnimation;
    layout?: 'horizontal' | 'vertical';
    /** Seconds each line shows before its first word. */
    negativeOffset?: number;
    /** 0.1 subtle … 2 intense. */
    impact?: number;
    floatThreshold?: number;
    disableMetadata?: boolean;
    /** Pick a highlight word when htmlText has no bold word. */
    autoHighlight?: boolean;
    ignoreBolds?: boolean;
    maxLines?: number;
    noGaps?: { enabled?: boolean; maxLength?: number };
  };
  /** The editor's layout box for the whole caption track (a timeline node's containerProps). */
  containerProps?: { style?: Record<string, unknown> };
};

export type VerticalFloatLyricsProps = {
  style?: VerticalFloatStyle;
  /** Only lines that start inside the layer (default), or every line that overlaps it. */
  lines?: 'starting' | 'overlapping';
};

/**
 * Lyrics through mediamake's `sub-vertical-float` caption preset, the same code the editor runs.
 * Lines carry their mediamake metadata through (htmlText `<b>` highlights, `<br/>` breaks) when
 * lyrics.json came from mediamake.
 */
export const VerticalFloatLyrics: React.FC<SceneProps<VerticalFloatLyricsProps>> = ({
  manifest,
  section,
  style,
  lines = 'starting',
}) => {
  const tree = useMemo(() => {
    const source =
      lines === 'starting'
        ? manifest.lyrics.filter(l => l.start >= section.from && l.start < section.to)
        : manifest.lyrics.filter(l => l.end > section.from && l.start < section.to);
    const inputCaptions = toCaptions(source, section.from);
    if (!inputCaptions.length) return [];
    const { containerProps, ...params } = style ?? {};
    return applyContainerLayout(
      presetTree(runPreset('sub-vertical-float', { ...params, inputCaptions })),
      containerProps,
    );
  }, [manifest, section.from, section.to, style, lines]);

  if (!tree.length) return null;
  return <PresetTree tree={tree} duration={section.to - section.from} />;
};
