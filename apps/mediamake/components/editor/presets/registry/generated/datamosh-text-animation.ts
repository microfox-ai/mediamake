/**
 * Datamosh Text Animation Preset
 *
 * This preset creates a datamosh effect that mimics compression algorithm failures
 * where text pixels 'bleed' into adjacent frames. The effect simulates dragging
 * video frames in a timeline where motion vectors get confused - text appears to
 * smear horizontally as if previous frames are bleeding through, creating ghosting
 * trails. The distortion builds up gradually like accumulating compression errors,
 * then suddenly resets to clean text with a bright neon flash.
 *
 * Features:
 * - **Horizontal Pixel Bleeding**: Text smears horizontally with ghost layers
 * - **Motion Vector Confusion**: Multiple ghost layers with decreasing opacity
 * - **Gradual Distortion Buildup**: Uses cubic-bezier easing for smooth accumulation
 * - **Instant Reset**: Snaps back to clean text with linear easing
 * - **Neon Flash Effect**: Bright cyan flash with screen blend mode
 * - **Macroblocking Artifacts**: 8x8 pixel chunk patterns for digital glitch aesthetics
 * - **Scaleform Stretching**: Horizontal stretching to simulate pixel bleed
 *
 * Use cases:
 * - Creating glitch aesthetics for tech content
 * - Adding compression artifact effects to text
 * - Building retro digital corruption visuals
 * - Simulating video codec failures
 * - Creating edgy, modern text animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().default('DATAMOSH').describe('Text content to display'),
  duration: z
    .number()
    .default(3)
    .describe('Total duration of the animation in seconds'),
  distortionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the distortion buildup phase in seconds'),
  resetDuration: z
    .number()
    .default(0.05)
    .describe('Duration of the instant reset in seconds'),
  flashDuration: z
    .number()
    .default(0.1)
    .describe('Duration of the neon flash effect in seconds'),
  fontSize: z
    .number()
    .default(96)
    .describe('Font size of the text in pixels'),
  primaryColor: z
    .string()
    .default('#ffffff')
    .describe('Primary text color (main layer)'),
  ghostColors: z
    .array(z.string())
    .default(['#00ffff', '#ff00ff', '#ffffff', '#00ffff'])
    .describe('Colors for ghost layers (4-5 colors recommended)'),
  maxOffset: z
    .number()
    .default(150)
    .describe('Maximum horizontal offset for ghost layers in pixels'),
  flashColor: z
    .string()
    .default('rgb(0, 255, 255)')
    .describe('Color of the neon flash effect'),
  font: z
    .string()
    .default('monospace')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "monospace")',
    ),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    distortionDuration,
    resetDuration,
    flashDuration,
    fontSize,
    primaryColor,
    ghostColors,
    maxOffset,
    flashColor,
    font,
  } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
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
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Component IDs
  const rootId = 'datamosh-root';
  const mainTextId = 'main-text-layer';
  const flashOverlayId = 'flash-overlay';
  const artifactsLayerId = 'pixel-artifacts-layer';

  // Create ghost layer IDs
  const ghostLayerIds = ghostColors.map((_, i) => `ghost-layer-${i + 1}`);

  // Timing calculations
  const distortionPhaseEnd = distortionDuration;
  const resetPhaseEnd = distortionPhaseEnd + resetDuration;
  const flashPhaseEnd = distortionPhaseEnd + flashDuration;

  // Effects data for ghost layers
  const createGhostEffects = (ghostId: string, index: number) => {
    const totalGhosts = ghostColors.length;
    const offsetMultiplier = (index + 1) / totalGhosts;
    const offset = maxOffset * offsetMultiplier;

    return [
      // Distortion phase: translateX from 0 to offset
      {
        id: `${ghostId}-distortion`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.165, 0.84, 0.44, 1)', // Smooth accumulation
          start: 0,
          duration: distortionDuration,
          mode: 'provider',
          targetIds: [ghostId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: offset, prog: 1 },
          ],
        },
      },
      // Reset phase: instant snap back to 0
      {
        id: `${ghostId}-reset`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: distortionPhaseEnd,
          duration: resetDuration,
          mode: 'provider',
          targetIds: [ghostId],
          ranges: [
            { key: 'translateX', val: offset, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
    ];
  };

  // Main text layer effects
  const mainTextEffects = [
    // Pixel-bleed effect: scaleX stretching during distortion
    {
      id: `${mainTextId}-distortion-scale`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
        start: 0,
        duration: distortionDuration,
        mode: 'provider',
        targetIds: [mainTextId],
        ranges: [
          { key: 'scaleX', val: 1, prog: 0 },
          { key: 'scaleX', val: 1.5, prog: 1 },
        ],
      },
    },
    // Reset scale
    {
      id: `${mainTextId}-reset-scale`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: distortionPhaseEnd,
        duration: resetDuration,
        mode: 'provider',
        targetIds: [mainTextId],
        ranges: [
          { key: 'scaleX', val: 1.5, prog: 0 },
          { key: 'scaleX', val: 1, prog: 1 },
        ],
      },
    },
  ];

  // Flash overlay effects
  const flashOverlayEffects = [
    {
      id: `${flashOverlayId}-flash`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: distortionPhaseEnd,
        duration: flashDuration,
        mode: 'provider',
        targetIds: [flashOverlayId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    },
  ];

  // Pixel artifacts layer effects
  const artifactsEffects = [
    {
      id: `${artifactsLayerId}-fade-in`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
        start: 0,
        duration: distortionDuration,
        mode: 'provider',
        targetIds: [artifactsLayerId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.3, prog: 1 },
        ],
      },
    },
    {
      id: `${artifactsLayerId}-fade-out`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: distortionPhaseEnd,
        duration: resetDuration,
        mode: 'provider',
        targetIds: [artifactsLayerId],
        ranges: [
          { key: 'opacity', val: 0.3, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    },
  ];

  // Create ghost layers
  const ghostLayers: RenderableComponentData[] = ghostLayerIds.map(
    (ghostId, index) => {
      const ghostColor = ghostColors[index] || '#ffffff';
      const opacity = 0.8 - index * 0.2; // Decreasing opacity (0.8, 0.6, 0.4, 0.2, 0.0)

      return {
        id: ghostId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: text,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: 900,
            color: ghostColor,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            fontFamily: fontFamily,
            position: 'absolute' as const,
            opacity: opacity,
            mixBlendMode: 'screen' as const,
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
            duration: duration,
          },
        },
        effects: createGhostEffects(ghostId, index),
      } as RenderableComponentData;
    },
  );

  // Main text layer
  const mainTextLayer: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 900,
        color: primaryColor,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
        fontFamily: fontFamily,
        textShadow: `0 0 20px ${ghostColors[0]}80`,
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
        duration: duration,
      },
    },
    effects: mainTextEffects,
  } as RenderableComponentData;

  // Pixel artifacts layer (8x8 macroblocking pattern)
  const pixelArtifactsLayer: RenderableComponentData = {
    id: artifactsLayerId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; position: absolute; top: 0; left: 0; background-image: repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(0, 255, 255, 0.03) 8px, rgba(0, 255, 255, 0.03) 16px), repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255, 0, 255, 0.03) 8px, rgba(255, 0, 255, 0.03) 16px); image-rendering: pixelated; pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none' as const,
        opacity: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: artifactsEffects,
  } as RenderableComponentData;

  // Flash overlay
  const flashOverlay: RenderableComponentData = {
    id: flashOverlayId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background-color: ${flashColor};"></div>`,
      className: 'absolute inset-0',
      style: {
        mixBlendMode: 'screen' as const,
        opacity: 0,
        pointerEvents: 'none' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: flashOverlayEffects,
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full bg-gray-900 flex items-center justify-center overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      mainTextLayer,
      ...ghostLayers,
      pixelArtifactsLayer,
      flashOverlay,
    ],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'datamoshTextAnimation',
  title: 'Datamosh Text Animation',
  description:
    'A text animation that mimics compression algorithm failures with horizontal pixel bleeding, motion vector confusion, ghosting trails, and macroblocking effects. Features gradual distortion buildup followed by sudden reset with neon flash. Creates authentic digital glitch aesthetics through layered opacity and transform effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'glitch',
    'datamosh',
    'compression',
    'pixel-bleed',
    'ghost',
    'distortion',
    'neon',
    'flash',
    'macroblocking',
    'digital-artifact',
    'tech',
    'modern',
  ],
  defaultInputParams: {
    text: 'DATAMOSH',
    duration: 3,
    distortionDuration: 1.5,
    resetDuration: 0.05,
    flashDuration: 0.1,
    fontSize: 96,
    primaryColor: '#ffffff',
    ghostColors: ['#00ffff', '#ff00ff', '#ffffff', '#00ffff'],
    maxOffset: 150,
    flashColor: 'rgb(0, 255, 255)',
    font: 'monospace',
  },
  dependencies: {},
};

// Export preset
export const datamoshTextAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
