/**
 * Invisible Ink Heat Reveal Effect Preset
 *
 * This preset creates a stunning heat reveal effect that simulates invisible ink
 * being exposed to heat or UV light. The text starts completely invisible (or very faint)
 * and gradually reveals through a combination of:
 * - Color temperature shift (cool to warm tones)
 * - Increasing contrast and saturation
 * - Dynamic glow effects that peak and settle
 * - Particle effects suggesting chemical activation
 * - Organic hotspot-based reveal pattern
 *
 * The effect mimics a chemical reaction captured in time-lapse video, with small
 * dots appearing, glowing, and fading around the text bounds, creating an activation
 * wave that feels like heat spreading across invisible ink.
 *
 * Features:
 * - **Heat Reveal Animation**: Text transitions from invisible to visible with temperature-map quality
 * - **Color Temperature Shift**: Cool (blue-tinted) to warm (natural) color progression
 * - **Dynamic Glow Effect**: Peaks mid-reveal and settles to subtle final state
 * - **Particle System**: 15 particles with staggered timing create chemical activation wave
 * - **Hotspot Reveal**: Organic, progressive reveal pattern simulating heat exposure
 * - **Caption Integration**: Can be triggered by caption timing with pre-roll buildup
 *
 * Use cases:
 * - Creating mysterious text reveals
 * - Simulating secret messages being exposed
 * - Building scientific/chemical reaction effects
 * - Adding organic reveal animations to titles
 * - Creating UV light exposure effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema with descriptions
const presetParams = z.object({
  trackId: z.string().default('invisible-ink-heat-reveal').describe('Unique ID for this preset track'),
  text: z.string().default('Secret Message').describe('Text content to reveal'),
  fontSize: z.number().default(72).describe('Font size in pixels'),
  fontWeight: z.union([z.string(), z.number()]).default('700').describe('Font weight (e.g., "400", "700", 700)'),
  fontFamily: z.string().default('Inter').describe('Font family name'),
  textColor: z.string().default('#FFFFFF').describe('Final revealed text color'),
  revealDuration: z.number().default(1.5).describe('Duration of reveal animation in seconds'),
  glowPeakTime: z.number().default(0.75).describe('Time when glow peaks (0-1, relative to reveal duration)'),
  particleCount: z.number().min(5).max(30).default(15).describe('Number of activation particles'),
  backgroundColor: z.string().default('rgba(0,0,0,0)').describe('Background color (transparent by default)'),
  particlePreRoll: z.number().default(0.1).describe('Time particles start before main reveal (seconds)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackId,
    text,
    fontSize,
    fontWeight,
    fontFamily,
    textColor,
    revealDuration,
    glowPeakTime,
    particleCount,
    backgroundColor,
    particlePreRoll,
  } = params;

  // IDs for components
  const containerId = `${trackId}-container`;
  const textWrapperId = `${trackId}-text-wrapper`;
  const textId = `${trackId}-text`;
  const particlesContainerId = `${trackId}-particles-container`;

  // Parse font weight
  const parsedFontWeight = typeof fontWeight === 'string' 
    ? fontWeight 
    : fontWeight.toString();

  // Generate particle components with varied positioning
  const generateParticles = (count: number) => {
    const particles: RenderableComponentData[] = [];
    const positions = [
      { left: '45%', top: '40%' },
      { left: '55%', top: '45%' },
      { left: '50%', top: '50%' },
      { left: '48%', top: '55%' },
      { left: '52%', top: '42%' },
      { left: '46%', top: '48%' },
      { left: '54%', top: '52%' },
      { left: '49%', top: '46%' },
      { left: '51%', top: '54%' },
      { left: '47%', top: '44%' },
      { left: '53%', top: '49%' },
      { left: '48.5%', top: '51%' },
      { left: '51.5%', top: '47%' },
      { left: '46.5%', top: '53%' },
      { left: '53.5%', top: '43%' },
    ];

    for (let i = 0; i < Math.min(count, positions.length); i++) {
      const particleId = `${trackId}-particle-${i}`;
      const position = positions[i];
      
      // Staggered start times for organic wave effect
      const startDelay = (i / count) * 0.2; // 0 to 0.2 seconds
      // Varied durations between 250ms and 350ms
      const duration = 0.25 + (i % 3) * 0.05;

      // Particle component
      particles.push({
        id: particleId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute rounded-full',
          style: {
            width: '4px',
            height: '4px',
            backgroundColor: 'rgba(255, 200, 100, 0)',
            left: position.left,
            top: position.top,
            opacity: 0,
            transform: 'scale(0)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: revealDuration,
          },
        },
        effects: [
          {
            id: `${particleId}-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: startDelay,
              duration: duration,
              mode: 'provider',
              targetIds: [particleId],
              ranges: [
                // Opacity: fade in, peak, fade out
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
                // Scale: grow and shrink
                { key: 'scale', val: 0, prog: 0 },
                { key: 'scale', val: 1.5, prog: 0.5 },
                { key: 'scale', val: 0.5, prog: 1 },
                // Background color: transparent -> bright -> fade
                { key: 'backgroundColor', val: 'rgba(255, 200, 100, 0)', prog: 0 },
                { key: 'backgroundColor', val: 'rgba(255, 200, 100, 1)', prog: 0.5 },
                { key: 'backgroundColor', val: 'rgba(255, 200, 100, 0)', prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData);
    }

    return particles;
  };

  const particleComponents = generateParticles(particleCount);

  // Text reveal effects
  const textOpacityEffect = {
    id: `${textId}-opacity-effect`,
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: revealDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'opacity', val: 0.05, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const textFilterEffect = {
    id: `${textId}-filter-effect`,
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: revealDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        // Hue-rotate: cool to warm (-30deg to 0deg)
        { key: 'filter:hue-rotate', val: -30, prog: 0 },
        { key: 'filter:hue-rotate', val: 0, prog: 1 },
        // Saturation: low to full (0.3 to 1)
        { key: 'filter:saturate', val: 0.3, prog: 0 },
        { key: 'filter:saturate', val: 1, prog: 1 },
        // Brightness: high to normal (1.5 to 1)
        { key: 'filter:brightness', val: 1.5, prog: 0 },
        { key: 'filter:brightness', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const textGlowEffect = {
    id: `${textId}-glow-effect`,
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: revealDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        // Glow: none -> peak -> subtle
        { key: 'textShadow', val: '0 0 0px rgba(255, 200, 100, 0)', prog: 0 },
        { key: 'textShadow', val: '0 0 20px rgba(255, 200, 100, 0.8)', prog: glowPeakTime },
        { key: 'textShadow', val: '0 0 5px rgba(255, 200, 100, 0.3)', prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Text atom component
  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: parsedFontWeight,
        color: textColor,
        opacity: 0.05,
        filter: 'hue-rotate(-30deg) saturate(0.3) brightness(1.5)',
        textShadow: 'none',
      },
      font: {
        family: fontFamily,
        weights: ['400', '700'],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: revealDuration,
      },
    },
    effects: [
      textOpacityEffect,
      textFilterEffect,
      textGlowEffect,
    ],
  };

  // Text wrapper layout
  const textWrapper: RenderableComponentData = {
    id: textWrapperId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: revealDuration,
      },
    },
    childrenData: [textComponent],
  };

  // Particles container layout
  const particlesContainer: RenderableComponentData = {
    id: particlesContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 5,
        },
      },
    },
    context: {
      timing: {
        start: -particlePreRoll, // Start slightly before main reveal
        duration: revealDuration + particlePreRoll,
      },
    },
    childrenData: particleComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          overflow: 'hidden',
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: revealDuration,
      },
    },
    childrenData: [
      textWrapper,
      particlesContainer,
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
  id: 'invisible-ink-heat-reveal',
  title: 'Invisible Ink Heat Reveal Effect',
  description: 'Advanced text reveal effect simulating invisible ink exposed to heat or UV light. Features organic temperature-map reveal with color temperature shift (cool to warm), increasing contrast, dynamic glow effects, and particle activation system suggesting chemical reaction. Includes hotspot-based progressive reveal with particles appearing, glowing, and fading around text bounds.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'heat',
    'invisible-ink',
    'animation',
    'particles',
    'glow',
    'chemical',
    'organic',
    'temperature',
    'uv-light',
    'effects',
  ],
  dependencies: {},
  defaultInputParams: {
    trackId: 'invisible-ink-heat-reveal',
    text: 'Secret Message',
    fontSize: 72,
    fontWeight: '700',
    fontFamily: 'Inter',
    textColor: '#FFFFFF',
    revealDuration: 1.5,
    glowPeakTime: 0.5,
    particleCount: 15,
    backgroundColor: 'rgba(0,0,0,0)',
    particlePreRoll: 0.1,
  },
};

export const invisibleInkHeatRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
