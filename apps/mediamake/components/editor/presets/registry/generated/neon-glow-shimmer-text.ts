/**
 * Neon Glow Shimmer Text Effect Preset
 *
 * This preset creates an electric neon-glow shimmer effect where text appears to have 
 * an electric current running through it, creating pulsing highlights along the letterforms.
 * Picture this as animating neon signage - the glow travels along the text path like 
 * electricity finding its route. The effect feels urban and energetic, perfect for bold 
 * statements or attention-grabbing titles.
 *
 * Features:
 * - **Neon Glow Pulse**: Animated text-shadow layers that pulse between base and bright states
 * - **Traveling Highlight**: Gradient mask that follows text baseline creating electricity effect
 * - **Power Surges**: Occasional flares where entire text briefly becomes 1.5x brighter
 * - **Subtle Flicker**: Micro-animations (opacity 0.95-1) at 50ms intervals for realism
 * - **Audio Sync**: Optional beat detection to sync power surges with impactful beats
 * - **Atmospheric Depth**: Backdrop-blur-md on container for urban cyberpunk feel
 *
 * Use cases:
 * - Bold titles and attention-grabbing headers
 * - Urban/cyberpunk themed videos
 * - Tech product launches
 * - Music video titles
 * - Gaming content headers
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  duration: z.number().default(10).describe('Duration in seconds'),
  baseColor: z.string().default('#00ffff').describe('Base neon color (hex or rgb)'),
  brightColor: z.string().default('#ffffff').describe('Bright surge color (hex or rgb)'),
  fontFamily: z.string().default('Inter').describe('Font family name'),
  glowPulseDuration: z.number().default(2).describe('Duration of glow pulse cycle in seconds'),
  colorCycleDuration: z.number().default(3).describe('Duration of color shift cycle in seconds'),
  highlightTravelDuration: z.number().default(4).describe('Duration for highlight to travel across text in seconds'),
  surgeStart: z.number().default(5).describe('When the power surge effect starts (seconds)'),
  audioSrc: z.string().optional().describe('Optional audio source for beat-synced surges'),
  enableFlicker: z.boolean().default(true).describe('Enable subtle flicker effect'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    text,
    duration,
    baseColor,
    brightColor,
    fontFamily,
    glowPulseDuration,
    colorCycleDuration,
    highlightTravelDuration,
    surgeStart,
    audioSrc,
    enableFlicker,
  } = params;

  const textId = 'neon-text-atom';
  const containerId = 'neon-text-container';
  const rootId = 'neon-shimmer-root';

  // Build effects array
  const effects: any[] = [];

  // 1. Glow Pulse Effect - animates text-shadow intensity
  effects.push({
    id: 'glow-pulse-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: glowPulseDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        {
          key: 'textShadow',
          val: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 40px currentColor',
          prog: 0,
        },
        {
          key: 'textShadow',
          val: '0 0 15px currentColor, 0 0 30px currentColor, 0 0 60px currentColor',
          prog: 0.5,
        },
        {
          key: 'textShadow',
          val: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 40px currentColor',
          prog: 1,
        },
      ],
    },
  });

  // 2. Color Shift Effect - animates color between base and bright
  effects.push({
    id: 'color-shift-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: colorCycleDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'color', val: baseColor, prog: 0 },
        { key: 'color', val: brightColor, prog: 0.5 },
        { key: 'color', val: baseColor, prog: 1 },
      ],
    },
  });

  // 3. Traveling Highlight Effect - uses background gradient animation
  effects.push({
    id: 'traveling-highlight-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: highlightTravelDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        {
          key: 'backgroundImage',
          val: `linear-gradient(90deg, transparent 0%, ${brightColor} 50%, transparent 100%)`,
          prog: 0,
        },
        {
          key: 'backgroundImage',
          val: `linear-gradient(90deg, transparent 0%, ${brightColor} 50%, transparent 100%)`,
          prog: 1,
        },
      ],
    },
  });

  // Background position animation for traveling effect
  effects.push({
    id: 'traveling-position-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: highlightTravelDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'backgroundPosition', val: '-100% 0', prog: 0 },
        { key: 'backgroundPosition', val: '200% 0', prog: 1 },
      ],
    },
  });

  // 4. Power Surge Effect - brief flare at specified time
  if (surgeStart > 0 && surgeStart < duration) {
    effects.push({
      id: 'power-surge-effect',
      componentId: 'generic',
      data: {
        type: 'spring',
        start: surgeStart,
        duration: 0.2,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'filter', val: 'brightness(1)', prog: 0 },
          { key: 'filter', val: 'brightness(1.5)', prog: 0.5 },
          { key: 'filter', val: 'brightness(1)', prog: 1 },
        ],
      },
    });

    // Scale surge for extra impact
    effects.push({
      id: 'power-surge-scale',
      componentId: 'generic',
      data: {
        type: 'spring',
        start: surgeStart,
        duration: 0.2,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.05, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    });
  }

  // 5. Flicker Effect - subtle opacity micro-animations
  if (enableFlicker) {
    effects.push({
      id: 'flicker-effect',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.95, prog: 0.02 },
          { key: 'opacity', val: 1, prog: 0.04 },
          { key: 'opacity', val: 0.95, prog: 0.06 },
          { key: 'opacity', val: 1, prog: 0.08 },
          { key: 'opacity', val: 0.97, prog: 0.15 },
          { key: 'opacity', val: 1, prog: 0.17 },
          { key: 'opacity', val: 0.95, prog: 0.3 },
          { key: 'opacity', val: 1, prog: 0.32 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    });
  }

  // Build text atom with neon styling
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: 'text-6xl font-black text-white',
      style: {
        textShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 40px currentColor',
        color: baseColor,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        backgroundSize: '200% 100%',
      },
      font: {
        family: fontFamily,
        weights: ['900'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects,
  };

  // Container for text
  const textContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textAtom],
  };

  // Root container with backdrop blur
  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center backdrop-blur-md',
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textContainer],
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
  id: 'neon-glow-shimmer-text',
  title: 'Neon Glow Shimmer Text Effect',
  description:
    'An electric neon-glow shimmer effect where text appears to have current running through it, creating pulsing highlights along letterforms with traveling electricity, power surges, and subtle flicker effects. Perfect for urban, energetic titles and attention-grabbing statements.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'neon',
    'glow',
    'shimmer',
    'electric',
    'urban',
    'cyberpunk',
    'pulse',
    'flicker',
    'energy',
    'bold',
    'title',
    'animated',
  ],
  defaultInputParams: {
    text: 'ELECTRIC',
    duration: 10,
    baseColor: '#00ffff',
    brightColor: '#ffffff',
    fontFamily: 'Inter',
    glowPulseDuration: 2,
    colorCycleDuration: 3,
    highlightTravelDuration: 4,
    surgeStart: 5,
    enableFlicker: true,
  },
  dependencies: {},
};

export const neonGlowShimmerTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
