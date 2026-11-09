import React from 'react';
import { AbsoluteFill } from 'remotion';
import {
  ComponentRenderer,
  CompositionProvider,
  type RenderableComponentData,
} from '@microfox/remotion';

/**
 * Renders a mediamake component tree (a preset's output) inside the current Sequence.
 * Timings in the tree are seconds from the start of that Sequence.
 */
export const PresetTree: React.FC<{
  tree: RenderableComponentData[];
  /** Seconds; how long the tree may run. */
  duration: number;
  style?: React.CSSProperties;
}> = ({ tree, duration, style }) => (
  // The tree's own root, so hierarchy and timing inheritance resolve inside it.
  <CompositionProvider value={{ root: tree, duration }}>
    <AbsoluteFill style={style}>
      {tree.map(node => (
        <ComponentRenderer key={node.id} {...node} />
      ))}
    </AbsoluteFill>
  </CompositionProvider>
);
