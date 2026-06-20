/**
 * Holographic Text Reveal Preset
 *
 * This preset creates a sophisticated text reveal that simulates a holographic projection
 * forming in 3D space. The text materializes through a combination of 3D rotation, opacity,
 * scan-line effects, and chromatic aberration.
 *
 * Features:
 * - 3D rotation animation from 45deg X/Y to facing forward
 * - Progressive scan-line build effect from bottom to top
 * - Chromatic aberration (RGB split) converging as text solidifies
 * - Flickering materialization effects
 * - Continuous floating animation post-reveal
 * - Futuristic sci-fi aesthetic with holographic blend mode
 *
 * Use cases:
 * - Sci-fi film UI elements
 * - Futuristic title reveals
 * - High-tech branding and intros
 * - Hologram simulation effects
 * - Tech/gaming content presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameters Schema ---
const presetParams = z.object({
  text: z.string().describe('Text content to display with holographic effect'),
  duration: z
    .number()
    .default(3)
    .describe('Total duration of the preset in seconds'),
  fontSize: z
    .number()
    .default(72)
    .describe('Font size of the text in pixels'),
  font: z
    .string()
    .default('Inter:700')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  gradientStart: z
    .string()
    .default('#00d4ff')
    .describe('Start color of the text gradient (cyan default)'),
  gradientEnd: z
    .string()
    .default('#0080ff')
    .describe('End color of the text gradient (blue default)'),
  rotationDuration: z
    .number()
    .default(0.6)
    .describe('Duration of 3D rotation phase as fraction of total (0-1)'),
  scanLineStart: z
    .number()
    .default(0.2)
    .describe('Start time of scan line effect as fraction of total (0-1)'),
  scanLineEnd: z
    .number()
    .default(0.8)
    .describe('End time of scan line effect as fraction of total (0-1)'),
  flickerStart: z
    .number()
    .default(0.4)
    .describe('Start time of flicker effect as fraction of total (0-1)'),
  flickerEnd: z
    .number()
    .default(0.7)
    .describe('End time of flicker effect as fraction of total (0-1)'),
  floatStart: z
    .number()
    .default(0.7)
    .describe('Start time of continuous float as fraction of total (0-1)'),
  chromaticIntensity: z
    .number()
    .default(2)
    .describe('Intensity of chromatic aberration in pixels'),
  floatDistance: z
    .number()
    .default(5)
    .describe('Vertical distance of float animation in pixels'),
  floatSpeed: z
    .number()
    .default(3)
    .describe('Duration of one float cycle in seconds'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const duration = params.duration;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 700;
  }

  // Calculate timing points (absolute seconds)
  const rotationDuration = duration * params.rotationDuration;
  const scanLineStartTime = duration * params.scanLineStart;
  const scanLineEndTime = duration * params.scanLineEnd;
  const flickerStartTime = duration * params.flickerStart;
  const flickerEndTime = duration * params.flickerEnd;
  const floatStartTime = duration * params.floatStart;

  // Component IDs
  const containerId = 'holographic-container';
  const textWrapperId = 'text-wrapper';
  const textId = 'holographic-text';
  const scanLineId = 'scanline-overlay';

  // --- Effects ---
  const effects = [];

  // 1. 3D Rotation Effect (0 to rotationDuration)
  // Animates from rotateX: 45deg, rotateY: 45deg to rotateX: 0, rotateY: 0
  effects.push({
    id: 'rotation-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: rotationDuration,
      mode: 'provider',
      targetIds: [textWrapperId],
      ranges: [
        { key: 'rotateX', val: 45, prog: 0 },
        { key: 'rotateX', val: 0, prog: 1 },
        { key: 'rotateY', val: 45, prog: 0 },
        { key: 'rotateY', val: 0, prog: 1 },
      ],
    },
  });

  // 2. Opacity Fade-In (0 to rotationDuration)
  effects.push({
    id: 'opacity-fade',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: rotationDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  });

  // 3. Chromatic Aberration Convergence (0 to rotationDuration)
  // Use multiple drop-shadow filters to simulate RGB split
  const chromaticIntensity = params.chromaticIntensity;
  effects.push({
    id: 'chromatic-aberration',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: rotationDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        {
          key: 'filter',
          val: `drop-shadow(${chromaticIntensity}px 0 0 rgba(255,0,0,0.8)) drop-shadow(-${chromaticIntensity}px 0 0 rgba(0,255,255,0.8))`,
          prog: 0,
        },
        {
          key: 'filter',
          val: `drop-shadow(${chromaticIntensity * 0.5}px 0 0 rgba(255,0,0,0.5)) drop-shadow(-${chromaticIntensity * 0.5}px 0 0 rgba(0,255,255,0.5))`,
          prog: 0.5,
        },
        {
          key: 'filter',
          val: 'drop-shadow(0 0 0 rgba(255,0,0,0)) drop-shadow(0 0 0 rgba(0,255,255,0))',
          prog: 1,
        },
      ],
    },
  });

  // 4. Scan Line Effect (scanLineStart to scanLineEnd)
  // Animate a horizontal bar from bottom (100%) to top (-100%)
  const scanLineDuration = scanLineEndTime - scanLineStartTime;
  effects.push({
    id: 'scanline-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: scanLineStartTime,
      duration: scanLineDuration,
      mode: 'provider',
      targetIds: [scanLineId],
      ranges: [
        { key: 'translateY', val: '100vh', prog: 0 },
        { key: 'translateY', val: '-100vh', prog: 1 },
      ],
    },
  });

  // 5. Flicker Effect (flickerStart to flickerEnd)
  // Rapid opacity changes using steps easing simulation
  const flickerDuration = flickerEndTime - flickerStartTime;
  effects.push({
    id: 'flicker-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: flickerStartTime,
      duration: flickerDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.6, prog: 0.2 },
        { key: 'opacity', val: 1, prog: 0.4 },
        { key: 'opacity', val: 0.8, prog: 0.6 },
        { key: 'opacity', val: 1, prog: 0.8 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  });

  // 6. Continuous Float Animation (floatStart to duration, infinite loop)
  // Subtle vertical movement
  const floatDuration = params.floatSpeed;
  const floatDistance = params.floatDistance;
  effects.push({
    id: 'float-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: floatStartTime,
      duration: floatDuration,
      mode: 'provider',
      targetIds: [textWrapperId],
      ranges: [
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -floatDistance, prog: 0.5 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    },
  });

  // --- Text Atom ---
  const textAtom = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className:
        'text-transparent bg-clip-text bg-gradient-to-t from-cyan-400 to-blue-500 font-bold',
      style: {
        fontSize: params.fontSize,
        ...fontStyle,
        background: `linear-gradient(to top, ${params.gradientStart}, ${params.gradientEnd})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  } as RenderableComponentData;

  // --- Scan Line Overlay (HTMLBlockAtom for pseudo-element) ---
  const scanLineOverlay = {
    id: scanLineId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; pointer-events: none; overflow: hidden;">
        <div style="position: absolute; left: 0; right: 0; height: 20px; background: linear-gradient(to bottom, transparent 0%, rgba(0, 255, 255, 0.4) 50%, transparent 100%);"></div>
      </div>`,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  } as RenderableComponentData;

  // --- Text Wrapper (for 3D transform and float) ---
  const textWrapper = {
    id: textWrapperId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          transformStyle: 'preserve-3d',
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textAtom, scanLineOverlay] as RenderableComponentData[],
  } as RenderableComponentData;

  // --- Root Container (perspective) ---
  const rootContainer = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden flex items-center justify-center',
        style: {
          perspective: '800px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects,
    childrenData: [textWrapper] as RenderableComponentData[],
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'holographic-text-reveal',
  title: 'Holographic Text Reveal',
  description:
    'A sophisticated text reveal preset that simulates a holographic projection forming in 3D space. Features 3D rotation animation, progressive scan-line build effects, chromatic aberration with converging RGB channels, flickering materialization, and subtle floating post-reveal animation. Perfect for futuristic sci-fi UI elements and high-tech presentations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'holographic',
    '3d',
    'rotation',
    'scanline',
    'chromatic-aberration',
    'flicker',
    'float',
    'futuristic',
    'sci-fi',
  ],
  defaultInputParams: {
    text: 'HOLOGRAM',
    duration: 3,
    fontSize: 72,
    font: 'Inter:700',
    gradientStart: '#00d4ff',
    gradientEnd: '#0080ff',
    rotationDuration: 0.6,
    scanLineStart: 0.2,
    scanLineEnd: 0.8,
    flickerStart: 0.4,
    flickerEnd: 0.7,
    floatStart: 0.7,
    chromaticIntensity: 2,
    floatDistance: 5,
    floatSpeed: 3,
  },
  dependencies: {},
};

// --- Export ---
export const holographicTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
