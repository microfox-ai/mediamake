import React, { CSSProperties, ReactNode } from 'react';
import type { ClipTransition } from '../../transitions/clip-transition';

export type Boundaries = {
  left?: number | string;
  top?: number | string;
  width?: number | string;
  height?: number | string;
  right?: number | string;
  bottom?: number | string;
  zIndex?: number;
};

export type Timing = {
  start?: number; // in seconds
  duration?: number; // in seconds
  /**
   * Seconds to skip from the head of this node. Negative.
   * Remotion clips that head when a sequence `from` is negative.
   */
  startOffset?: number;
};

export type CalculatedBoundaries = {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;
  zIndex?: number;
  reset?: boolean;
};

export type CalculatedTiming = {
  startInFrames?: number;
  durationInFrames?: number;
  start?: number;
  duration?: number;
  /** Negative seconds. The head of this node is clipped by that much. */
  startOffset?: number;
  fitDurationTo?: string[] | string;
};

export type Hierarchy = {
  depth: number;
  parentIds: string[];
};

interface BaseRenderableContext {
  overrideStyle?: CSSProperties;
}

export interface RenderableContext extends BaseRenderableContext {
  boundaries?: CalculatedBoundaries;
  timing?: CalculatedTiming;
  hierarchy?: Hierarchy;
}

export interface InternalRenderableContext extends BaseRenderableContext {
  boundaries: CalculatedBoundaries;
  timing?: CalculatedTiming;
  hierarchy: Hierarchy;
}

export type RenderableData = {
  [key: string]: any;
};

export interface BaseComponentData {
  id: string;
  componentId: string;
  type: ComponentType;
  data?: RenderableData;
  context?: RenderableContext;
  childrenData?: RenderableComponentData[];
  effects?: BaseEffect[];
  /** Edge-anchored transitions. Compiled into `effects` from the current duration. */
  transitions?: ClipTransition[];
}

export type BaseEffect =
  | string
  | {
      id: string;
      componentId: string;
      data?: RenderableData;
      context?: RenderableContext;
    };

export type ComponentType =
  | 'atom'
  | 'layout'
  | 'frame'
  | 'scene'
  | 'transition';

interface AtomComponentData extends BaseComponentData {
  type: 'atom';
  data?: RenderableData & {
    boundaries?: Boundaries;
  };
  context?: RenderableContext;
}

interface LayoutComponentData extends BaseComponentData {
  type: 'layout';
  data?: RenderableData & {
    boundaries?: Boundaries;
    timing?: Timing;
  };
  context?: RenderableContext;
}

interface FrameComponentData extends BaseComponentData {
  type: 'frame';
  data?: RenderableData & {
    boundaries?: Boundaries;
    timing?: Timing;
  };
  context?: RenderableContext;
}

interface SceneComponentData extends BaseComponentData {
  type: 'scene';
  data?: RenderableData & {
    timing?: Timing;
  };
}

interface TransitionComponentData extends BaseComponentData {
  type: 'transition';
  data?: RenderableData & {
    timing?: Timing;
  };
}

export type RenderableComponentData =
  | AtomComponentData
  | LayoutComponentData
  | FrameComponentData
  | SceneComponentData
  | TransitionComponentData;

export interface BaseRenderableProps {
  id: string;
  componentId: string;
  type: ComponentType;
  data?: RenderableData;
  context?: InternalRenderableContext;
  children?: ReactNode;
}

export interface BaseRenderableData extends BaseComponentData {
  childrenData?: RenderableComponentData[];
  context?: RenderableContext;
}
