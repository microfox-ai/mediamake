/**
 * Refraction Prism Text Effect Preset
 *
 * This preset creates a water distortion text effect that simulates viewing text 
 * through a glass of water or prism. Features chromatic aberration with RGB channel 
 * separation, ghost images that phase in and out, vertical distortion bands simulating 
 * water currents, and blur effects during maximum separation.
 *
 * The text appears to split into spectral components (red, green, blue) and reassemble, 
 * creating an optical physics-inspired visual. Vertical bands of distortion move 
 * horizontally across the text, simulating water streams or currents passing in front.
 *
 * Features:
 * - **RGB Channel Separation**: Red, green, and blue layers with different transform origins
 * - **Chromatic Aberration**: Phase-shifted animations create natural interference patterns
 * - **Ghost Images**: Multiple offset layers that phase in and out
 * - **Vertical Distortion Bands**: Moving water current simulation
 * - **Blur Effects**: Dynamic blur during maximum color separation
 * - **Screen Blend Mode**: Color layers blend using screen mode for additive color mixing
 * - **GPU Acceleration**: Transform-based animations for smooth performance
 *
 * Use cases:
 * - Creating water refraction text effects
 * - Building prism/glass distortion visuals
 * - Adding optical physics-inspired text animations
 * - Creating liquid/fluid text effects
 * - Building chromatic aberration title cards
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Input parameters schema
const presetParams = z.object({
  text: z.string().describe('Text to display with refraction effect'),
  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(120)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter:700')
    .describe('Font family with optional weight (e.g., "Inter:700", "Roboto:600")'),
  duration: z
    .number()
    .min(1)
    .max(60)
    .default(10)
    .describe('Duration of the effect in seconds'),
  chromaticIntensity: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe('Intensity multiplier for chromatic aberration (higher = more separation)'),
  distortionSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Speed multiplier for distortion band movement'),
  blurIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Maximum blur amount in pixels during peak separation'),
  baseOpacity: z
    .number()
    .min(0.2)
    .max(1)
    .default(0.6)
    .describe('Minimum opacity for RGB color layers (0.2-1)'),
  peakOpacity: z
    .number()
    .min(0.4)
    .max(1)
    .default(0.9)
    .describe('Maximum opacity for RGB color layers (0.4-1)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font family and style
  const fontString = params.fontFamily || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
    }
  } else {
    fontStyle.fontWeight = 700; // Default bold
  }

  const intensity = params.chromaticIntensity ?? 1.5;
  const speedMult = params.distortionSpeed ?? 1;
  const maxBlur = params.blurIntensity ?? 2;
  const minOpacity = params.baseOpacity ?? 0.6;
  const maxOpacity = params.peakOpacity ?? 0.9;

  // Component IDs
  const containerId = 'refraction-prism-root';
  const baseTextId = 'base-text-layer';
  const redChannelId = 'red-channel-layer';
  const greenChannelId = 'green-channel-layer';
  const blueChannelId = 'blue-channel-layer';
  const band1Id = 'distortion-band-1';
  const band2Id = 'distortion-band-2';
  const band3Id = 'distortion-band-3';

  // Base text layer (white, always visible)
  const baseTextLayer: RenderableComponentData = {
    id: baseTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: fontStyle.fontWeight,
        fontStyle: fontStyle.fontStyle,
        color: '#ffffff',
        position: 'relative',
        zIndex: 1,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  // Red channel layer (phase-shifted horizontal oscillation)
  const redChannelLayer: RenderableComponentData = {
    id: redChannelId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: fontStyle.fontWeight,
        fontStyle: fontStyle.fontStyle,
        color: '#ff0000',
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mixBlendMode: 'screen',
        transformOrigin: 'left center',
        zIndex: 2,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: `${redChannelId}-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: params.duration,
          mode: 'provider',
          targetIds: [redChannelId],
          ranges: [
            // Horizontal oscillation (-3px to 3px)
            { key: 'translateX', val: -3 * intensity, prog: 0 },
            { key: 'translateX', val: 3 * intensity, prog: 0.25 },
            { key: 'translateX', val: -3 * intensity, prog: 0.5 },
            { key: 'translateX', val: 3 * intensity, prog: 0.75 },
            { key: 'translateX', val: -3 * intensity, prog: 1 },
            // Opacity oscillation
            { key: 'opacity', val: minOpacity, prog: 0 },
            { key: 'opacity', val: maxOpacity, prog: 0.25 },
            { key: 'opacity', val: minOpacity, prog: 0.5 },
            { key: 'opacity', val: maxOpacity, prog: 0.75 },
            { key: 'opacity', val: minOpacity, prog: 1 },
            // Blur during peak separation
            { key: 'filter', val: `blur(0px)`, prog: 0 },
            { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0.25 },
            { key: 'filter', val: `blur(0px)`, prog: 0.5 },
            { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0.75 },
            { key: 'filter', val: `blur(0px)`, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Green channel layer (phase-shifted, different timing)
  const greenChannelLayer: RenderableComponentData = {
    id: greenChannelId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: fontStyle.fontWeight,
        fontStyle: fontStyle.fontStyle,
        color: '#00ff00',
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mixBlendMode: 'screen',
        transformOrigin: 'center center',
        zIndex: 2,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: `${greenChannelId}-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: params.duration,
          mode: 'provider',
          targetIds: [greenChannelId],
          ranges: [
            // Horizontal oscillation (-2px to 4px, asymmetric)
            { key: 'translateX', val: -2 * intensity, prog: 0 },
            { key: 'translateX', val: 4 * intensity, prog: 0.3 },
            { key: 'translateX', val: -2 * intensity, prog: 0.6 },
            { key: 'translateX', val: 4 * intensity, prog: 0.85 },
            { key: 'translateX', val: -2 * intensity, prog: 1 },
            // Opacity oscillation (phase-shifted)
            { key: 'opacity', val: maxOpacity, prog: 0 },
            { key: 'opacity', val: minOpacity, prog: 0.3 },
            { key: 'opacity', val: maxOpacity, prog: 0.6 },
            { key: 'opacity', val: minOpacity, prog: 0.85 },
            { key: 'opacity', val: maxOpacity, prog: 1 },
            // Blur during separation
            { key: 'filter', val: `blur(${maxBlur * 0.5}px)`, prog: 0 },
            { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0.3 },
            { key: 'filter', val: `blur(0px)`, prog: 0.6 },
            { key: 'filter', val: `blur(${maxBlur * 0.5}px)`, prog: 0.85 },
            { key: 'filter', val: `blur(0px)`, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Blue channel layer (phase-shifted, third timing pattern)
  const blueChannelLayer: RenderableComponentData = {
    id: blueChannelId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: fontStyle.fontWeight,
        fontStyle: fontStyle.fontStyle,
        color: '#0000ff',
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mixBlendMode: 'screen',
        transformOrigin: 'right center',
        zIndex: 2,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: `${blueChannelId}-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: params.duration,
          mode: 'provider',
          targetIds: [blueChannelId],
          ranges: [
            // Horizontal oscillation (-4px to 2px)
            { key: 'translateX', val: -4 * intensity, prog: 0 },
            { key: 'translateX', val: 2 * intensity, prog: 0.2 },
            { key: 'translateX', val: -4 * intensity, prog: 0.45 },
            { key: 'translateX', val: 2 * intensity, prog: 0.7 },
            { key: 'translateX', val: -4 * intensity, prog: 1 },
            // Opacity oscillation (different phase)
            { key: 'opacity', val: minOpacity, prog: 0 },
            { key: 'opacity', val: maxOpacity, prog: 0.2 },
            { key: 'opacity', val: minOpacity, prog: 0.45 },
            { key: 'opacity', val: maxOpacity, prog: 0.7 },
            { key: 'opacity', val: minOpacity, prog: 1 },
            // Blur effect
            { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0 },
            { key: 'filter', val: `blur(0px)`, prog: 0.2 },
            { key: 'filter', val: `blur(${maxBlur * 0.8}px)`, prog: 0.45 },
            { key: 'filter', val: `blur(0px)`, prog: 0.7 },
            { key: 'filter', val: `blur(${maxBlur * 0.5}px)`, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Distortion band 1 (vertical band moving left to right)
  const distortionBand1: RenderableComponentData = {
    id: band1Id,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-y-0',
        style: {
          width: '15%',
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
          backdropFilter: 'blur(1px)',
          zIndex: 3,
          pointerEvents: 'none' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: `${band1Id}-effect`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: params.duration,
          mode: 'provider',
          targetIds: [band1Id],
          ranges: [
            // Move from left (-20%) to right (120%)
            { key: 'translateX', val: '-20%', prog: 0 },
            { key: 'translateX', val: '120%', prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Distortion band 2 (different speed, narrower)
  const distortionBand2: RenderableComponentData = {
    id: band2Id,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-y-0',
        style: {
          width: '10%',
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
          backdropFilter: 'blur(0.5px)',
          zIndex: 3,
          pointerEvents: 'none' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: `${band2Id}-effect`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: params.duration * (1.2 / speedMult), // Slower
          mode: 'provider',
          targetIds: [band2Id],
          ranges: [
            { key: 'translateX', val: '120%', prog: 0 },
            { key: 'translateX', val: '-20%', prog: 1 }, // Opposite direction
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Distortion band 3 (widest, slowest)
  const distortionBand3: RenderableComponentData = {
    id: band3Id,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-y-0',
        style: {
          width: '20%',
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
          backdropFilter: 'blur(1.5px)',
          zIndex: 3,
          pointerEvents: 'none' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: `${band3Id}-effect`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: params.duration * (0.8 / speedMult), // Faster
          mode: 'provider',
          targetIds: [band3Id],
          ranges: [
            { key: 'translateX', val: '-20%', prog: 0 },
            { key: 'translateX', val: '120%', prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      baseTextLayer,
      redChannelLayer,
      greenChannelLayer,
      blueChannelLayer,
      distortionBand1,
      distortionBand2,
      distortionBand3,
    ] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'refractionPrismText',
  title: 'Refraction Prism Text Effect',
  description:
    'A water distortion text effect that simulates viewing text through a glass of water or prism. Features chromatic aberration with RGB channel separation, ghost images that phase in and out, vertical distortion bands simulating water currents, and blur effects during maximum separation. The text appears to split into spectral components and reassemble, creating an optical physics-inspired visual.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'effect',
    'refraction',
    'prism',
    'water',
    'distortion',
    'chromatic-aberration',
    'rgb-separation',
    'glass',
    'optical',
    'physics',
    'spectral',
    'liquid',
    'fluid',
    'blur',
    'ghost-images',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'REFRACTION',
    fontSize: 120,
    fontFamily: 'Inter:700',
    duration: 10,
    chromaticIntensity: 1.5,
    distortionSpeed: 1,
    blurIntensity: 2,
    baseOpacity: 0.6,
    peakOpacity: 0.9,
  },
};

// Export preset
export const refractionPrismTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
