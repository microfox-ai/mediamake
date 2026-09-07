/**
 * Canvas pipeline system: declarative, registry-driven canvas drawing.
 *
 * - `CanvasPipeline` atom: `{ sources, pipeline }` JSON → deterministic,
 *   render-safe canvas drawing composed from registered ops.
 * - `effect-CanvasFx`: one generic effect applying a pipeline to wrapped
 *   children as mask / overlay / underlay / standalone content.
 * - `registerCanvasOp`: extend the op library the same way components are
 *   registered.
 */

// Registers the op standard library as a side effect.
import './ops';

import { registerComponent, registerEffect } from '../core/registry';
import {
  Atom as CanvasPipelineAtom,
  config as CanvasPipelineConfig,
} from './CanvasPipelineAtom';
import { CanvasFxEffect, config as CanvasFxConfig } from './CanvasFxEffect';

registerComponent(
  CanvasPipelineConfig.displayName,
  CanvasPipelineAtom,
  'atom',
  CanvasPipelineConfig
);
registerEffect(CanvasFxConfig.displayName, CanvasFxEffect, CanvasFxConfig);

export { CanvasPipelineAtom, CanvasPipelineConfig, CanvasFxEffect, CanvasFxConfig };

export {
  registerCanvasOp,
  getCanvasOp,
  getRegisteredCanvasOps,
} from './registry';

export {
  type CanvasOpNode,
  type CanvasOpDefinition,
  type CanvasOpInitContext,
  type CanvasOpRenderContext,
  type CanvasOpTiming,
  type CanvasKeyframe,
  type CanvasSourceDef,
  type CanvasPipelineData,
  type CanvasFxData,
  type CanvasAssets,
  type CanvasFrameInfo,
  CanvasPipelineDataSchema,
  CanvasFxDataSchema,
  CanvasOpNodeSchema,
} from './types';

export { useCanvasPipeline } from './useCanvasPipeline';
export { useRenderSafeImage, loadImage } from './runtime/assets';
export { mulberry32, hashString, combineSeed, resolveSeed } from './runtime/random';
export {
  computeFitRect,
  traceWipePath,
  traceRadialPath,
  drawEdgeGlow,
  type EdgeStyle,
  type FitMode,
} from './runtime/geometry';
