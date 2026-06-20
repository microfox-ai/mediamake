/**
 * Retro 80s Wireframe to Chrome Text Animation Preset
 *
 * This preset creates a classic 80s-style wireframe text animation that transforms into
 * chrome-filled text with metallic sheen. Features include:
 * - Geometric wireframe outlines in cyan/magenta (neon colors)
 * - 3D rotation (rotateY 0-360deg) revealing text depth
 * - Chrome gradient fill with sweeping metallic sheen effect
 * - Scanline overlay for authentic retro aesthetic
 * - Digital grid background with synthwave colors
 * - Neon glow effects using drop-shadow filters
 *
 * Timeline:
 * - 0-30% (0-1.8s): Wireframe outline visible with neon glow
 * - 30% (1.8s): 3D rotation begins
 * - 40-70% (2.4-4.2s): Chrome fill sweeps across text
 * - 100% (6s): Complete 360deg rotation with full chrome fill
 *
 * Use cases:
 * - Retro 80s title sequences
 * - Synthwave music video titles
 * - Tech/gaming content intros
 * - Nostalgic digital aesthetic overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('SYNTHWAVE')
    .describe('Text to display with wireframe-to-chrome animation'),
  fontSize: z
    .number()
    .min(40)
    .max(300)
    .default(120)
    .optional()
    .describe('Font size in pixels (40-300)'),
  font: z
    .string()
    .default('Orbitron:700')
    .optional()
    .describe(
      'Font family with optional weight (e.g., "Orbitron:700", "RussoOne")',
    ),
  duration: z
    .number()
    .min(3)
    .max(15)
    .default(6)
    .optional()
    .describe('Total animation duration in seconds (3-15)'),
  strokeColor: z
    .string()
    .default('#00FFFF')
    .optional()
    .describe('Wireframe stroke color (default: cyan #00FFFF)'),
  strokeWidth: z
    .number()
    .min(1)
    .max(6)
    .default(3)
    .optional()
    .describe('Wireframe stroke width in pixels (1-6)'),
  glowColor1: z
    .string()
    .default('rgba(0, 255, 255, 0.8)')
    .optional()
    .describe('Primary glow color for neon effect'),
  glowColor2: z
    .string()
    .default('rgba(255, 0, 255, 0.6)')
    .optional()
    .describe('Secondary glow color for neon effect'),
  chromeColors: z
    .array(z.string())
    .default(['#c0c0c0', '#ffffff', '#e0e0e0', '#c0c0c0', '#ffffff'])
    .optional()
    .describe('Array of chrome gradient color stops'),
  backgroundGradient: z
    .string()
    .default('linear-gradient(to bottom right, #4a148c, #1a237e)')
    .optional()
    .describe('Background gradient (default: purple to blue)'),
  scanlineOpacity: z
    .number()
    .min(0)
    .max(0.1)
    .default(0.03)
    .optional()
    .describe('Scanline overlay opacity (0-0.1)'),
  glitchEffect: z
    .boolean()
    .default(false)
    .optional()
    .describe('Enable random glitch effects at specific keyframes'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Orbitron:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  const duration = params.duration ?? 6;
  const fontSize = params.fontSize ?? 120;
  const strokeColor = params.strokeColor ?? '#00FFFF';
  const strokeWidth = params.strokeWidth ?? 3;
  const glowColor1 = params.glowColor1 ?? 'rgba(0, 255, 255, 0.8)';
  const glowColor2 = params.glowColor2 ?? 'rgba(255, 0, 255, 0.6)';
  const chromeColors = params.chromeColors ?? [
    '#c0c0c0',
    '#ffffff',
    '#e0e0e0',
    '#c0c0c0',
    '#ffffff',
  ];
  const backgroundGradient =
    params.backgroundGradient ??
    'linear-gradient(to bottom right, #4a148c, #1a237e)';
  const scanlineOpacity = params.scanlineOpacity ?? 0.03;
  const enableGlitch = params.glitchEffect ?? false;

  // Create chrome gradient string
  const chromeGradient = `linear-gradient(90deg, ${chromeColors.join(', ')})`;

  // Component IDs
  const rootContainerId = 'retro-80s-wireframe-chrome-root';
  const scanlineOverlayId = 'retro-80s-scanline-overlay';
  const textContainerId = 'retro-80s-text-container';
  const textAtomId = 'retro-80s-text-atom';

  // Rotation effect: 0deg -> 360deg over full duration
  const rotationEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textContainerId],
    ranges: [
      { key: 'rotateY', val: 0, prog: 0 },
      { key: 'rotateY', val: 360, prog: 1 },
    ],
  };

  // Chrome fill sweep effect: background-position from -200% to 0%
  // Start at 40% of duration (2.4s), end at 70% (4.2s)
  const fillStartTime = duration * 0.4;
  const fillDuration = duration * 0.3; // 30% of total duration

  const chromeFillEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: fillStartTime,
    duration: fillDuration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'backgroundPositionX', val: '-200%', prog: 0 },
      { key: 'backgroundPositionX', val: '0%', prog: 1 },
    ],
  };

  // Optional glitch effect: random translateX at specific keyframes
  const glitchEffects: GenericEffectData[] = [];
  if (enableGlitch) {
    // Glitch at 20%, 50%, 80%
    const glitchPoints = [0.2, 0.5, 0.8];
    glitchPoints.forEach((point, index) => {
      const glitchStartTime = duration * point;
      const glitchDuration = 0.1;
      const randomOffset = (Math.random() - 0.5) * 10; // -5 to +5 px

      glitchEffects.push({
        type: 'linear',
        start: glitchStartTime,
        duration: glitchDuration,
        mode: 'provider',
        targetIds: [textAtomId],
        ranges: [
          { key: 'translateX', val: randomOffset, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      } as GenericEffectData);
    });
  }

  // Scanline overlay HTML
  const scanlineHTML = `<div style="position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0, 255, 255, ${scanlineOpacity}) 0px, rgba(0, 255, 255, ${scanlineOpacity}) 2px, transparent 2px, transparent 4px); pointer-events: none; z-index: 10;"></div>`;

  // Build component tree
  const scanlineOverlay: RenderableComponentData = {
    id: scanlineOverlayId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: scanlineHTML,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'font-bold tracking-widest uppercase',
      style: {
        fontSize: `${fontSize}px`,
        color: 'transparent',
        WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
        textStroke: `${strokeWidth}px ${strokeColor}`,
        backgroundImage: chromeGradient,
        backgroundSize: '200% 100%',
        backgroundPosition: '-200% 0',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        filter: `drop-shadow(0 0 20px ${glowColor1}) drop-shadow(0 0 40px ${glowColor2})`,
        transformStyle: 'preserve-3d',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        subsets: ['latin'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: `${textAtomId}-chrome-fill`,
        componentId: 'generic',
        data: chromeFillEffect,
      },
      ...glitchEffects.map((effect, index) => ({
        id: `${textAtomId}-glitch-${index}`,
        componentId: 'generic',
        data: effect,
      })),
    ],
  };

  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textAtom],
    effects: [
      {
        id: `${textContainerId}-rotation`,
        componentId: 'generic',
        data: rotationEffect,
      },
    ],
  };

  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full flex items-center justify-center',
        style: {
          background: backgroundGradient,
          perspective: '1000px',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [scanlineOverlay, textContainer],
  };

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
  id: 'retro-80s-wireframe-chrome',
  title: 'Retro 80s Wireframe to Chrome Text',
  description:
    'A retro 80s-style text animation featuring geometric wireframe outlines in cyan/magenta that transform into chrome-filled text with metallic sheen while rotating in 3D space. Includes synthwave aesthetics with grid background, neon glow effects, scanline overlay, and a sweeping chrome gradient fill animation synchronized with 3D rotation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'retro',
    '80s',
    'synthwave',
    'wireframe',
    'chrome',
    '3d',
    'rotation',
    'neon',
    'gradient',
    'glitch',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'SYNTHWAVE',
    fontSize: 120,
    font: 'Orbitron:700',
    duration: 6,
    strokeColor: '#00FFFF',
    strokeWidth: 3,
    glowColor1: 'rgba(0, 255, 255, 0.8)',
    glowColor2: 'rgba(255, 0, 255, 0.6)',
    chromeColors: ['#c0c0c0', '#ffffff', '#e0e0e0', '#c0c0c0', '#ffffff'],
    backgroundGradient: 'linear-gradient(to bottom right, #4a148c, #1a237e)',
    scanlineOpacity: 0.03,
    glitchEffect: false,
  },
};

export const retro80sWireframeChromePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
