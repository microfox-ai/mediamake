/**
 * Datamosh Temporal Glitch Preset
 * 
 * Recreates the aesthetic of corrupted video codecs where I-frames and P-frames desynchronize.
 * Text fragments into temporal echoes with previous and future states bleeding into the present.
 * Features time-smear effects where letters stretch across time with motion trails that glitch
 * between different temporal positions. Includes harsh digital noise bursts where text dissolves
 * into random pixel data before reconstituting. Neon colors strobe between complementary pairs
 * (cyan/red, magenta/green, yellow/blue) creating retinal burn effects.
 * 
 * Technical implementation:
 * - BaseLayout with 'relative overflow-hidden' containing 5-7 temporal echo layers
 * - Absolute positioning with z-index layering for depth
 * - Motion trails via scaleX() transforms with opacity gradients
 * - Temporal echo effects with staggered timing offsets (-100ms to +100ms)
 * - Digital noise via backdrop-filter with rapid value changes
 * - Color strobing using alternating complementary color pairs
 * - Main glitch cycle every 1200ms with micro-glitches every 200-300ms
 * - Frame-like jumping using steps(3) easing and continuous trails with linear easing
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z
    .string()
    .default('DATAMOSH')
    .describe('Text content to display with temporal glitch effects'),
  duration: z
    .number()
    .default(10)
    .describe('Total duration of the composition in seconds'),
  fontSize: z
    .number()
    .default(120)
    .describe('Base font size in pixels for the main text'),
  font: z
    .string()
    .optional()
    .default('Inter:900')
    .describe(
      'Font family with optional weight (format: "FontFamily:weight")',
    ),
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for glitch effects (0.1-3)'),
  noiseIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of noise overlay (0-1)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:900';
  const fontParts = fontString.split(':');
  const fontFamily = fontParts[0];
  const fontWeight = fontParts.length > 1 ? parseInt(fontParts[1], 10) : 900;

  const baseId = 'datamosh-glitch';
  const duration = params.duration;
  const fontSize = params.fontSize;
  const intensity = params.glitchIntensity;

  // Helper: Create temporal echo text layer
  const createEchoLayer = (
    id: string,
    color: string,
    zIndex: number,
    opacity: number,
    timeOffset: number, // milliseconds offset for temporal echo
  ): RenderableComponentData => {
    return {
      id,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: params.text,
        style: {
          position: 'absolute' as const,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color,
          textShadow: `0 0 20px ${color}`,
          mixBlendMode: 'screen' as const,
          zIndex,
          opacity,
          fontFamily,
        },
        font: {
          family: fontFamily,
          weights: [fontWeight.toString()],
          display: 'swap' as const,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [],
    } as RenderableComponentData;
  };

  // Create temporal echo layers (5 layers: 2 future, 1 present, 2 past)
  const echoLayerFuture2 = createEchoLayer(
    `${baseId}-echo-future-2`,
    '#00FFFF', // Cyan
    50,
    0.4,
    100,
  );
  const echoLayerFuture1 = createEchoLayer(
    `${baseId}-echo-future-1`,
    '#FF00FF', // Magenta
    60,
    0.5,
    50,
  );
  const mainTextLayer = createEchoLayer(
    `${baseId}-main-text`,
    '#FFFFFF', // White
    70,
    1,
    0,
  );
  const echoLayerPast1 = createEchoLayer(
    `${baseId}-echo-past-1`,
    '#FF0000', // Red
    40,
    0.5,
    -50,
  );
  const echoLayerPast2 = createEchoLayer(
    `${baseId}-echo-past-2`,
    '#FFFF00', // Yellow
    30,
    0.4,
    -100,
  );

  // Helper: Create time-smear glitch effect (scaleX with opacity)
  const createTimeSmearEffect = (
    targetId: string,
    startTime: number,
    duration: number,
    scaleDirection: 'horizontal' | 'vertical',
  ): GenericEffectData => {
    const effectDuration = 0.3 * intensity;
    return {
      type: 'steps(3)' as any, // Frame-jumping
      start: startTime,
      duration: effectDuration,
      mode: 'provider' as const,
      targetIds: [targetId],
      ranges: [
        {
          key: scaleDirection === 'horizontal' ? 'scaleX' : 'scaleY',
          val: 1,
          prog: 0,
        },
        {
          key: scaleDirection === 'horizontal' ? 'scaleX' : 'scaleY',
          val: 1.5 + intensity * 0.5,
          prog: 0.5,
        },
        {
          key: scaleDirection === 'horizontal' ? 'scaleX' : 'scaleY',
          val: 1,
          prog: 1,
        },
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.6, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };
  };

  // Helper: Create color strobe effect (complementary pairs)
  const createColorStrobeEffect = (
    targetId: string,
    startTime: number,
    color1: string,
    color2: string,
  ): GenericEffectData => {
    const effectDuration = 0.2 * intensity;
    return {
      type: 'linear' as const,
      start: startTime,
      duration: effectDuration,
      mode: 'provider' as const,
      targetIds: [targetId],
      ranges: [
        { key: 'color', val: color1, prog: 0 },
        { key: 'color', val: color2, prog: 0.5 },
        { key: 'color', val: color1, prog: 1 },
      ],
    };
  };

  // Helper: Create digital noise burst effect (opacity pulse with blur)
  const createNoiseBurstEffect = (
    targetId: string,
    startTime: number,
  ): GenericEffectData => {
    const effectDuration = 0.15 * intensity;
    return {
      type: 'linear' as const,
      start: startTime,
      duration: effectDuration,
      mode: 'provider' as const,
      targetIds: [targetId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.2, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
        { key: 'filter', val: 'blur(0px) contrast(1)', prog: 0 },
        { key: 'filter', val: 'blur(5px) contrast(2)', prog: 0.5 },
        { key: 'filter', val: 'blur(0px) contrast(1)', prog: 1 },
      ],
    };
  };

  // Helper: Create motion trail effect (translateX with opacity gradient)
  const createMotionTrailEffect = (
    targetId: string,
    startTime: number,
    direction: number, // -1 for left, 1 for right
  ): GenericEffectData => {
    const effectDuration = 0.25 * intensity;
    const distance = 20 * intensity * direction;
    return {
      type: 'linear' as const,
      start: startTime,
      duration: effectDuration,
      mode: 'provider' as const,
      targetIds: [targetId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: distance, prog: 0.5 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.7, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };
  };

  // Main glitch cycle: 1200ms (1.2s)
  // Micro-glitches: every 200-300ms
  const glitchCycleDuration = 1.2;
  const numberOfCycles = Math.floor(duration / glitchCycleDuration);

  // Build effects for all layers
  const buildLayerEffects = (layerId: string, timeOffset: number) => {
    const effects: any[] = [];

    for (let cycle = 0; cycle < numberOfCycles; cycle++) {
      const cycleStart = cycle * glitchCycleDuration;

      // Micro-glitch 1: time-smear at 0ms
      effects.push({
        id: `${layerId}-smear-${cycle}-1`,
        componentId: 'generic',
        data: createTimeSmearEffect(
          layerId,
          cycleStart + timeOffset / 1000,
          0.3,
          'horizontal',
        ),
      });

      // Micro-glitch 2: color strobe at 300ms
      if (layerId.includes('future-2')) {
        effects.push({
          id: `${layerId}-strobe-${cycle}`,
          componentId: 'generic',
          data: createColorStrobeEffect(
            layerId,
            cycleStart + 0.3 + timeOffset / 1000,
            '#00FFFF',
            '#FF0000',
          ),
        });
      } else if (layerId.includes('future-1')) {
        effects.push({
          id: `${layerId}-strobe-${cycle}`,
          componentId: 'generic',
          data: createColorStrobeEffect(
            layerId,
            cycleStart + 0.3 + timeOffset / 1000,
            '#FF00FF',
            '#00FF00',
          ),
        });
      } else if (layerId.includes('past-1')) {
        effects.push({
          id: `${layerId}-strobe-${cycle}`,
          componentId: 'generic',
          data: createColorStrobeEffect(
            layerId,
            cycleStart + 0.3 + timeOffset / 1000,
            '#FF0000',
            '#00FFFF',
          ),
        });
      } else if (layerId.includes('past-2')) {
        effects.push({
          id: `${layerId}-strobe-${cycle}`,
          componentId: 'generic',
          data: createColorStrobeEffect(
            layerId,
            cycleStart + 0.3 + timeOffset / 1000,
            '#FFFF00',
            '#0000FF',
          ),
        });
      }

      // Micro-glitch 3: motion trail at 600ms
      effects.push({
        id: `${layerId}-trail-${cycle}`,
        componentId: 'generic',
        data: createMotionTrailEffect(
          layerId,
          cycleStart + 0.6 + timeOffset / 1000,
          layerId.includes('future') ? 1 : -1,
        ),
      });

      // Micro-glitch 4: noise burst at 900ms
      effects.push({
        id: `${layerId}-noise-${cycle}`,
        componentId: 'generic',
        data: createNoiseBurstEffect(
          layerId,
          cycleStart + 0.9 + timeOffset / 1000,
        ),
      });
    }

    return effects;
  };

  // Apply effects to each layer with temporal offsets
  echoLayerFuture2.effects = buildLayerEffects(echoLayerFuture2.id, 100);
  echoLayerFuture1.effects = buildLayerEffects(echoLayerFuture1.id, 50);
  mainTextLayer.effects = buildLayerEffects(mainTextLayer.id, 0);
  echoLayerPast1.effects = buildLayerEffects(echoLayerPast1.id, -50);
  echoLayerPast2.effects = buildLayerEffects(echoLayerPast2.id, -100);

  // Noise overlay using HTMLBlockAtom
  const noiseOverlay: RenderableComponentData = {
    id: `${baseId}-noise-overlay`,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width:100%;height:100%;pointer-events:none;mix-blend-mode:overlay;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.03) 2px,rgba(255,255,255,0.03) 4px);"></div>`,
      className: 'absolute inset-0',
      style: {
        zIndex: 1000,
        opacity: params.noiseIntensity,
        pointerEvents: 'none' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: `${baseId}-noise-flicker`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration,
          mode: 'provider' as const,
          targetIds: [`${baseId}-noise-overlay`],
          ranges: [
            { key: 'opacity', val: params.noiseIntensity, prog: 0 },
            { key: 'opacity', val: params.noiseIntensity * 1.5, prog: 0.25 },
            { key: 'opacity', val: params.noiseIntensity, prog: 0.5 },
            { key: 'opacity', val: params.noiseIntensity * 0.5, prog: 0.75 },
            { key: 'opacity', val: params.noiseIntensity, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${baseId}-root`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      noiseOverlay,
      echoLayerFuture2,
      echoLayerFuture1,
      mainTextLayer,
      echoLayerPast1,
      echoLayerPast2,
    ] as RenderableComponentData[],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'datamoshTemporalGlitch',
  title: 'Datamosh Temporal Glitch',
  description:
    'Recreates corrupted video codec aesthetics with temporal echoes, time-smear effects, and harsh digital noise. Features text fragmentation across temporal states with neon color strobing between complementary pairs creating retinal burn effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'glitch',
    'datamosh',
    'temporal',
    'echo',
    'corruption',
    'neon',
    'strobe',
    'effects',
    'digital-noise',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'DATAMOSH',
    duration: 10,
    fontSize: 120,
    font: 'Inter:900',
    glitchIntensity: 1,
    noiseIntensity: 0.3,
  },
};

export const datamoshTemporalGlitchPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
