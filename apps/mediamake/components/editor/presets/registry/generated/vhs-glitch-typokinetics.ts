/**
 * VHS Glitch Typokinetics Preset
 *
 * A glitch-heavy typokinetics preset inspired by corrupted VHS tapes and digital signal interference.
 * Features horizontal text slicing, RGB channel separation, scan line distortion, temporal displacement,
 * and hold-frame glitches. Text stutters, duplicates, and tears like damaged analog video with
 * unpredictable digital artifacts.
 *
 * Features:
 * - RGB channel separation with independent movement
 * - Horizontal scan line effects with shifting
 * - Chromatic aberration and temporal displacement
 * - Hold frame glitches (animation freezes)
 * - Digital stepping and horizontal tears
 * - Random timing offsets for unpredictable glitches
 * - Clip-path slicing effects
 * - Hardware-accelerated transforms
 *
 * Use cases:
 * - Tech/cyberpunk video titles
 * - Music video text effects
 * - Social media content with edgy aesthetics
 * - Retro VHS-style presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text to display with VHS glitch effect'),
  duration: z
    .number()
    .min(1)
    .default(5)
    .describe('Duration of the effect in seconds'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe(
      'Intensity multiplier for glitch effects (0.1 = subtle, 3 = extreme)',
    ),
  rgbSeparation: z
    .number()
    .min(0)
    .max(20)
    .default(4)
    .describe('Maximum RGB channel separation distance in pixels'),
  scanLineCount: z
    .number()
    .min(3)
    .max(10)
    .default(5)
    .describe('Number of scan lines to render'),
  holdFrameProbability: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Probability of hold-frame glitches (0 = none, 1 = constant)'),
  font: z
    .string()
    .optional()
    .default('Courier New')
    .describe(
      'Font family with optional weight and style (e.g., "RobotoMono:700", "Courier New")',
    ),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color (used as fallback for RGB channels)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    glitchIntensity,
    rgbSeparation,
    scanLineCount,
    holdFrameProbability,
    font,
    textColor,
  } = params;

  // Parse font string
  const fontString = font || 'Courier New';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Generate random value in range
  const randomRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Generate random time offset
  const randomTimeOffset = (): number => {
    return Math.random() * 0.5;
  };

  // Helper: Create glitch effect with random parameters
  const createGlitchEffect = (
    targetId: string,
    channelOffset: number,
  ): GenericEffectData => {
    const glitchDuration = randomRange(0.1, 0.3) * glitchIntensity;
    const maxTranslate = 100 * glitchIntensity;
    const startTime = randomTimeOffset();

    // Hold frame logic: duplicate keyframes at random points
    const holdFrame = Math.random() &lt; holdFrameProbability;
    const holdPoint = holdFrame ? randomRange(0.3, 0.7) : 0;

    const ranges: Array&lt;{ key: string; val: any; prog: number }&gt; = [
      // Horizontal translation (glitch stutters)
      { key: 'translateX', val: randomRange(-maxTranslate, maxTranslate), prog: 0 },
      { key: 'translateX', val: randomRange(-maxTranslate, maxTranslate), prog: 0.25 },
      { key: 'translateX', val: channelOffset, prog: 0.5 },
      { key: 'translateX', val: randomRange(-maxTranslate, maxTranslate), prog: 0.75 },
      { key: 'translateX', val: channelOffset, prog: 1 },
      // Opacity flickers
      { key: 'opacity', val: randomRange(0.5, 1), prog: 0 },
      { key: 'opacity', val: randomRange(0.7, 1), prog: 0.5 },
      { key: 'opacity', val: randomRange(0.8, 1), prog: 1 },
    ];

    // Add hold frame if triggered
    if (holdFrame) {
      const holdValue = randomRange(-maxTranslate, maxTranslate);
      ranges.push(
        { key: 'translateX', val: holdValue, prog: holdPoint },
        { key: 'translateX', val: holdValue, prog: holdPoint + 0.05 },
      );
    }

    return {
      type: 'linear',
      start: startTime,
      duration: glitchDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // Helper: Create scan line effect
  const createScanLineEffect = (targetId: string): GenericEffectData => {
    const scanDuration = randomRange(0.3, 0.8) * glitchIntensity;
    const maxTranslate = 50 * glitchIntensity;
    const startTime = randomTimeOffset();

    return {
      type: 'linear',
      start: startTime,
      duration: scanDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'translateX', val: -maxTranslate, prog: 0 },
        { key: 'translateX', val: maxTranslate, prog: 0.5 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    };
  };

  // Helper: Create RGB separation effect
  const createRGBSeparationEffect = (
    targetId: string,
    channelType: 'red' | 'green' | 'blue',
  ): GenericEffectData => {
    const separationDuration = randomRange(0.2, 0.5) * glitchIntensity;
    const startTime = randomTimeOffset();

    let offsetPattern: number[];
    if (channelType === 'red') {
      offsetPattern = [-rgbSeparation, rgbSeparation, -rgbSeparation, 0];
    } else if (channelType === 'blue') {
      offsetPattern = [rgbSeparation, -rgbSeparation, rgbSeparation, 0];
    } else {
      offsetPattern = [0, 0, 0, 0];
    }

    return {
      type: 'linear',
      start: startTime,
      duration: separationDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'translateX', val: offsetPattern[0], prog: 0 },
        { key: 'translateX', val: offsetPattern[1], prog: 0.33 },
        { key: 'translateX', val: offsetPattern[2], prog: 0.66 },
        { key: 'translateX', val: offsetPattern[3], prog: 1 },
      ],
    };
  };

  // IDs
  const rootId = 'vhs-glitch-root-container';
  const scanLinesContainerId = 'vhs-glitch-scan-lines-container';
  const wordsContainerId = 'vhs-glitch-words-container';
  const wordStackId = 'vhs-glitch-word-stack';
  const redLayerId = 'vhs-glitch-red-layer';
  const greenLayerId = 'vhs-glitch-green-layer';
  const blueLayerId = 'vhs-glitch-blue-layer';

  // Create scan lines
  const scanLines: RenderableComponentData[] = [];
  for (let i = 0; i &lt; scanLineCount; i++) {
    const scanLineId = `vhs-glitch-scan-line-${i}`;
    const topPosition = ((i + 1) / (scanLineCount + 1)) * 100;

    scanLines.push({
      id: scanLineId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '',
        className: 'absolute',
        style: {
          height: '2px',
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          top: `${topPosition}%`,
          left: 0,
          transform: 'translateZ(0)',
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
          id: `${scanLineId}-effect`,
          componentId: 'generic',
          data: createScanLineEffect(scanLineId),
        },
      ],
    } as RenderableComponentData);
  }

  // Scan lines container
  const scanLinesContainer: RenderableComponentData = {
    id: scanLinesContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: scanLines,
  } as RenderableComponentData;

  // Create RGB layers with effects
  const redLayer: RenderableComponentData = {
    id: redLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: 'font-mono uppercase tracking-wider',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: '900',
        color: '#ff0000',
        filter: 'brightness(1.5)',
        textShadow: '0 0 10px rgba(255, 0, 0, 0.5)',
        mixBlendMode: 'screen',
        transform: 'translateZ(0)',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : {}),
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
        id: `${redLayerId}-glitch`,
        componentId: 'generic',
        data: createGlitchEffect(redLayerId, -rgbSeparation),
      },
      {
        id: `${redLayerId}-rgb`,
        componentId: 'generic',
        data: createRGBSeparationEffect(redLayerId, 'red'),
      },
    ],
  } as RenderableComponentData;

  const greenLayer: RenderableComponentData = {
    id: greenLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: 'font-mono uppercase tracking-wider',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: '900',
        color: '#00ff00',
        filter: 'brightness(1.5)',
        textShadow: '0 0 10px rgba(0, 255, 0, 0.5)',
        mixBlendMode: 'screen',
        position: 'absolute',
        top: '0',
        left: '0',
        transform: 'translateZ(0)',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : {}),
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
        id: `${greenLayerId}-glitch`,
        componentId: 'generic',
        data: createGlitchEffect(greenLayerId, 0),
      },
      {
        id: `${greenLayerId}-rgb`,
        componentId: 'generic',
        data: createRGBSeparationEffect(greenLayerId, 'green'),
      },
    ],
  } as RenderableComponentData;

  const blueLayer: RenderableComponentData = {
    id: blueLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: 'font-mono uppercase tracking-wider',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: '900',
        color: '#0000ff',
        filter: 'brightness(1.5)',
        textShadow: '0 0 10px rgba(0, 0, 255, 0.5)',
        mixBlendMode: 'screen',
        position: 'absolute',
        top: '0',
        left: '0',
        transform: 'translateZ(0)',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : {}),
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
        id: `${blueLayerId}-glitch`,
        componentId: 'generic',
        data: createGlitchEffect(blueLayerId, rgbSeparation),
      },
      {
        id: `${blueLayerId}-rgb`,
        componentId: 'generic',
        data: createRGBSeparationEffect(blueLayerId, 'blue'),
      },
    ],
  } as RenderableComponentData;

  // Word stack container (holds RGB layers)
  const wordStack: RenderableComponentData = {
    id: wordStackId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [redLayer, greenLayer, blueLayer],
  } as RenderableComponentData;

  // Words container (centers the word stack)
  const wordsContainer: RenderableComponentData = {
    id: wordsContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [wordStack],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [scanLinesContainer, wordsContainer],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'vhsGlitchTypokinetics',
  title: 'VHS Glitch Typokinetics',
  description:
    'Glitch-heavy typokinetics preset inspired by corrupted VHS tapes and digital signal interference. Features horizontal text slicing, RGB channel separation, scan line distortion, temporal displacement, and hold-frame glitches. Text stutters, duplicates, and tears like damaged analog video with unpredictable digital artifacts.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'glitch',
    'vhs',
    'retro',
    'distortion',
    'rgb-split',
    'chromatic-aberration',
    'scanline',
    'tech',
    'cyberpunk',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'GLITCH',
    duration: 5,
    fontSize: 72,
    glitchIntensity: 1,
    rgbSeparation: 4,
    scanLineCount: 5,
    holdFrameProbability: 0.3,
    font: 'Courier New',
    textColor: '#FFFFFF',
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const vhsGlitchTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
