import React, { useMemo } from 'react';
import type { SceneProps } from '../kit/contract';
import { toCaptions } from './captions';
import { applyContainerLayout, presetTree, runPreset } from './presets';
import { PresetTree } from './PresetTree';

/** The mediamake caption presets synced into presets.json (npm run sync-presets). */
export type CaptionPresetId =
  | 'sub-vertical-float'
  | 'sub-fast-rap-static'
  | 'sub-kinetic-motion'
  | 'sub-kinetic-gradient-flow'
  | 'sub-scrolling-vertical';

export type CaptionLayerProps = {
  preset: CaptionPresetId;
  /** The preset's own inputs, minus the captions (they come from the manifest). */
  params?: Record<string, unknown>;
  /** The editor's layout box for the whole caption track (a timeline node's containerProps). */
  containerProps?: { style?: Record<string, unknown> };
  /** Only lines that start inside the layer (default), or every line that overlaps it. */
  lines?: 'starting' | 'overlapping';
};

/**
 * Lyrics through any of mediamake's caption presets, the same code the editor runs. Lines carry
 * their mediamake metadata through (htmlText `<b>` highlights, `<br/>` breaks).
 */
export const CaptionLayer: React.FC<SceneProps<CaptionLayerProps>> = ({
  manifest,
  section,
  preset,
  params,
  containerProps,
  lines = 'starting',
}) => {
  const tree = useMemo(() => {
    const source =
      lines === 'starting'
        ? manifest.lyrics.filter(l => l.start >= section.from && l.start < section.to)
        : manifest.lyrics.filter(l => l.end > section.from && l.start < section.to);
    const inputCaptions = toCaptions(source, section.from);
    if (!inputCaptions.length) return [];
    return applyContainerLayout(
      presetTree(runPreset(preset, { ...params, inputCaptions })),
      containerProps,
    );
  }, [manifest, section.from, section.to, preset, params, containerProps, lines]);

  if (!tree.length) return null;
  return <PresetTree tree={tree} duration={section.to - section.from} />;
};
