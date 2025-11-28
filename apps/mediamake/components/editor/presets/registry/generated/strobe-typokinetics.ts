/**
 * Strobe-Light Typokinetics Preset
 *
 * This preset simulates text under aggressive nightclub/rave strobe lighting conditions.
 * Creates a disorienting stop-motion effect with violent pulsing, harsh contrast changes,
 * position jumps, broken/irregular strobe rates, motion trails, and RGB channel strobing.
 *
 * Features:
 * - **Main Strobe Effect**: Rapid opacity pulsing (10-15Hz) with instant visibility changes
 * - **Position Teleportation**: Text jumps between positions rather than smooth animation
 * - **Broken Strobe**: Irregular flash rates for added chaos
 * - **Motion Trails**: Ghostly after-images with decreasing opacity (3 layers)
 * - **RGB Channel Strobing**: Independent color channel flashing
 * - **Flash Overlay**: Full-screen white flash with screen blend mode
 * - **After-Image Inversion**: Alternate frames with color inversion filter
 *
 * Use cases:
 * - Nightclub/rave visual effects
 * - Music video typography
 * - High-energy social media content
 * - Electronic music visualizers
 * - Epileptic-warning content (use responsibly)
 *
 * WARNING: This preset contains rapid flashing effects that may cause seizures
 * in photosensitive individuals. Use with caution and appropriate warnings.
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  duration: z.number().default(10).describe('Duration in seconds'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:900", "BebasNeue:700")',
    ),
  fontSize: z
    .number()
    .default(128)
    .describe('Font size in pixels (default: 128)'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color (default: white)'),
  strobeFrequency: z
    .number()
    .min(5)
    .max(20)
    .default(12)
    .describe('Base strobe frequency in Hz (flashes per second, 5-20)'),
  positionJumpIntensity: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('Position jump distance in pixels (5-50)'),
  brokenStrobeVariation: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.3)
    .describe('Broken strobe timing variation (0-0.5, 0=regular, 0.5=chaotic)'),
  trailOpacity: z
    .number()
    .min(0.1)
    .max(0.8)
    .default(0.5)
    .describe('Motion trail opacity multiplier (0.1-0.8)'),
  flashIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.8)
    .describe('Flash overlay intensity (0.1-1)'),
  rgbStrobeEnabled: z
    .boolean()
    .default(true)
    .describe('Enable RGB channel strobing'),
  invertEnabled: z
    .boolean()
    .default(true)
    .describe('Enable after-image inversion effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    font,
    fontSize,
    textColor,
    strobeFrequency,
    positionJumpIntensity,
    brokenStrobeVariation,
    trailOpacity,
    flashIntensity,
    rgbStrobeEnabled,
    invertEnabled,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter';
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
    fontStyle.fontWeight = 900; // Default to extra bold for strobe effect
  }

  // Calculate effect durations based on strobe frequency
  const mainStrobeDuration = 1 / strobeFrequency; // Base strobe period
  const colorStrobeDuration = 1 / (strobeFrequency / 2); // Half frequency for color changes
  const brokenStrobeDuration =
    mainStrobeDuration * (1 - brokenStrobeVariation);
  const flashOverlayDuration = mainStrobeDuration * 0.5; // Flash lasts half of strobe period

  // Generate random position values for teleportation effect
  const generateRandomPosition = () => {
    const angle = Math.random() * Math.PI * 2;
    const distance = positionJumpIntensity * (0.5 + Math.random() * 0.5);
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };

  // Create position sequences for main text and trails
  const positions = [
    { x: 0, y: 0 },
    generateRandomPosition(),
    generateRandomPosition(),
    generateRandomPosition(),
    generateRandomPosition(),
  ];

  // Generate RGB color sequence
  const rgbColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', textColor];

  // Main text component
  const mainTextId = 'strobe-text-main';
  const mainText: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'font-black uppercase',
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        textShadow: `0 0 20px currentColor, 0 0 40px currentColor`,
        willChange: 'opacity, transform, filter',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['900'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [],
  };

  // Create trail text components (3 layers with decreasing opacity)
  const trailLayers = [
    { id: 'strobe-text-trail-1', opacity: trailOpacity * 0.5, delay: 0.03 },
    { id: 'strobe-text-trail-2', opacity: trailOpacity * 0.3, delay: 0.06 },
    { id: 'strobe-text-trail-3', opacity: trailOpacity * 0.1, delay: 0.09 },
  ];

  const trailTexts: RenderableComponentData[] = trailLayers.map((layer) => ({
    id: layer.id,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'font-black uppercase absolute inset-0',
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        textShadow: `0 0 20px currentColor`,
        opacity: layer.opacity,
        willChange: 'opacity, transform',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['900'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [],
  }));

  // Main strobe opacity effect (rapid on/off)
  const mainStrobeEffect = {
    id: 'main-strobe-opacity',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: mainStrobeDuration,
      loop: true,
      mode: 'provider' as const,
      targetIds: [mainTextId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.1 },
        { key: 'opacity', val: 1, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 0.6 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Position jump effect (teleportation between strobes)
  const positionJumpEffects = positions.map((pos, index) => ({
    id: `position-jump-${index}`,
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: index * (duration / positions.length),
      duration: duration / positions.length,
      loop: false,
      mode: 'provider' as const,
      targetIds: [mainTextId],
      ranges: [
        { key: 'translateX', val: pos.x, prog: 0 },
        { key: 'translateY', val: pos.y, prog: 0 },
        { key: 'translateX', val: pos.x, prog: 1 },
        { key: 'translateY', val: pos.y, prog: 1 },
      ],
    },
  }));

  // RGB color strobe effect
  const rgbStrobeEffect = rgbStrobeEnabled
    ? {
        id: 'rgb-strobe',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: colorStrobeDuration,
          loop: true,
          mode: 'provider' as const,
          targetIds: [mainTextId],
          ranges: rgbColors.map((color, index) => ({
            key: 'color',
            val: color,
            prog: index / rgbColors.length,
          })),
        },
      }
    : null;

  // Broken strobe effect (irregular flashing)
  const brokenStrobeEffect = {
    id: 'broken-strobe',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: duration * 0.3, // Start after 30% of duration
      duration: brokenStrobeDuration,
      loop: true,
      mode: 'provider' as const,
      targetIds: [mainTextId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.2 },
        { key: 'opacity', val: 0, prog: 0.3 },
        { key: 'opacity', val: 1, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 0.55 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // After-image inversion effect
  const invertEffect = invertEnabled
    ? {
        id: 'invert-effect',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: mainStrobeDuration * 2,
          loop: true,
          mode: 'provider' as const,
          targetIds: [mainTextId],
          ranges: [
            { key: 'filter', val: 'invert(0)', prog: 0 },
            { key: 'filter', val: 'invert(1)', prog: 0.5 },
            { key: 'filter', val: 'invert(0)', prog: 1 },
          ],
        },
      }
    : null;

  // Collect all main text effects
  mainText.effects = [
    mainStrobeEffect,
    ...positionJumpEffects,
    brokenStrobeEffect,
    rgbStrobeEffect,
    invertEffect,
  ].filter(Boolean) as any[];

  // Trail effects (delayed position following)
  trailTexts.forEach((trail, index) => {
    const layer = trailLayers[index];
    const trailPositionEffects = positions.map((pos, posIndex) => ({
      id: `trail-${index}-pos-${posIndex}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: posIndex * (duration / positions.length) + layer.delay,
        duration: duration / positions.length,
        loop: false,
        mode: 'provider' as const,
        targetIds: [layer.id],
        ranges: [
          { key: 'translateX', val: pos.x * 0.8, prog: 0 },
          { key: 'translateY', val: pos.y * 0.8, prog: 0 },
          { key: 'translateX', val: pos.x * 0.8, prog: 1 },
          { key: 'translateY', val: pos.y * 0.8, prog: 1 },
        ],
      },
    }));

    // Trail fade effect
    const trailFadeEffect = {
      id: `trail-${index}-fade`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: mainStrobeDuration * 2,
        loop: true,
        mode: 'provider' as const,
        targetIds: [layer.id],
        ranges: [
          { key: 'opacity', val: layer.opacity, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.8 },
          { key: 'opacity', val: layer.opacity, prog: 1 },
        ],
      },
    };

    trail.effects = [...trailPositionEffects, trailFadeEffect] as any[];
  });

  // Flash overlay component (full-screen white flash)
  const flashOverlayId = 'flash-overlay';
  const flashOverlay: RenderableComponentData = {
    id: flashOverlayId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width:100%;height:100%;background:white;"></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        mixBlendMode: 'screen',
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
        id: 'flash-overlay-strobe',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: flashOverlayDuration,
          loop: true,
          mode: 'provider' as const,
          targetIds: [flashOverlayId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: flashIntensity, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'strobe-typokinetics-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'bg-black relative overflow-hidden',
        style: {},
      },
      // Use repeatChildrenProps to center all children
      repeatChildrenProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      flashOverlay,
      ...trailTexts.reverse(), // Reverse so trail-3 is on bottom
      mainText,
    ],
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
  id: 'strobe-typokinetics',
  title: 'Strobe-Light Typokinetics Preset',
  description:
    'An aggressive nightclub/rave strobe effect preset that pulses text violently with irregular flash rates, position teleportation, RGB channel strobing, and motion trail after-images. Creates a disorienting stop-motion experience with multiple overlapping strobe frequencies. WARNING: Contains rapid flashing effects - may cause seizures in photosensitive individuals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'strobe',
    'nightclub',
    'rave',
    'flashing',
    'motion-trails',
    'rgb-strobe',
    'epilepsy-warning',
    'high-energy',
    'glitch',
    'stop-motion',
  ],
  defaultInputParams: {
    text: 'RAVE',
    duration: 10,
    font: 'Inter:900',
    fontSize: 128,
    textColor: '#FFFFFF',
    strobeFrequency: 12,
    positionJumpIntensity: 20,
    brokenStrobeVariation: 0.3,
    trailOpacity: 0.5,
    flashIntensity: 0.8,
    rgbStrobeEnabled: true,
    invertEnabled: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const strobeTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
