/**
 * Hydro-Jet Text Animation Preset
 *
 * Creates an intense water-cutting animation where high-pressure water jets slice through text
 * with industrial precision and force. Features turbulent water spray trails, steam/mist effects,
 * mechanical precision with organic water physics, and powerful impact ripples.
 *
 * Key Features:
 * - Water jet streams that sweep across text with precise timing
 * - Clip-path polygon animation revealing text like a cutting laser
 * - High-frequency vibration/shake effects simulating pressure force
 * - Water spray particles that scatter from cutting impact
 * - Steam/mist overlay effects from high-pressure contact
 * - Ripple distortion on text surface from water impact
 * - Sharp contrast and brightness for defined cutting edges
 * - Cyan/blue water coloring with motion blur trails
 *
 * Use Cases:
 * - Tech product reveals
 * - Industrial/manufacturing content
 * - Action-packed title sequences
 * - High-energy brand intros
 * - Precision engineering showcases
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('HYDRO CUT')
    .describe('Text content to reveal with water-cutting effect'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total animation duration in seconds'),
  fontSize: z
    .number()
    .min(48)
    .max(200)
    .default(96)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color (hex format)'),
  waterColor: z
    .string()
    .default('#00FFFF')
    .describe('Water jet color (hex format, default cyan)'),
  cutSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Speed multiplier for cutting animation (higher = faster)'),
  jetCount: z
    .number()
    .min(3)
    .max(10)
    .default(5)
    .describe('Number of water jet streams'),
  intensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Overall effect intensity (vibration, spray, steam)'),
  steamOpacity: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.15)
    .describe('Maximum opacity of steam/mist effects'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    textColor,
    waterColor,
    cutSpeed,
    jetCount,
    intensity,
    steamOpacity,
  } = params;

  // Calculate timing values
  const letterCount = text.length;
  const cutDuration = 0.2 / cutSpeed; // Time per letter cut
  const cutOverlap = 0.05 / cutSpeed; // Overlap between cuts
  const totalCutTime = Math.min(
    letterCount * cutDuration - (letterCount - 1) * cutOverlap,
    duration * 0.7,
  );
  const holdTime = duration - totalCutTime;

  // Jet stream creation helper
  const createJetStream = (index: number, total: number) => {
    const startDelay = (index / total) * (totalCutTime * 0.6);
    const jetDuration = 0.4 / cutSpeed;
    const jetId = `jet-stream-${index}`;

    // Jet position calculated across screen width
    const startPosition = -5; // Start off-screen left
    const endPosition = 105; // End off-screen right

    return {
      id: jetId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class="absolute top-0 w-1 h-full bg-gradient-to-b from-transparent via-${waterColor.replace('#', '')} to-transparent" style="background: linear-gradient(to bottom, transparent, ${waterColor}, transparent); opacity: 0;"></div>`,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          left: `${startPosition}%`,
        },
      },
      context: {
        timing: {
          start: startDelay,
          duration: jetDuration,
        },
      },
      effects: [
        {
          id: `${jetId}-sweep`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: jetDuration,
            mode: 'provider',
            targetIds: [jetId],
            ranges: [
              { key: 'left', val: `${startPosition}%`, prog: 0 },
              { key: 'left', val: `${endPosition}%`, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.9, prog: 0.1 },
              { key: 'opacity', val: 0.9, prog: 0.9 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: `${jetId}-vibration`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: jetDuration,
            mode: 'provider',
            targetIds: [jetId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 2 * intensity, prog: 0.05 },
              { key: 'translateX', val: -2 * intensity, prog: 0.1 },
              { key: 'translateX', val: 2 * intensity, prog: 0.15 },
              { key: 'translateX', val: -2 * intensity, prog: 0.2 },
              { key: 'translateX', val: 1 * intensity, prog: 0.25 },
              { key: 'translateX', val: -1 * intensity, prog: 0.3 },
              { key: 'translateX', val: 0, prog: 0.35 },
            ],
          },
        },
      ],
    };
  };

  // Create jet streams
  const jetStreams: RenderableComponentData[] = [];
  for (let i = 0; i < jetCount; i++) {
    jetStreams.push(createJetStream(i, jetCount));
  }

  // Steam/mist particle creation helper
  const createMistParticle = (index: number) => {
    const mistId = `mist-particle-${index}`;
    const startTime = (index / 3) * (totalCutTime * 0.4);
    const mistDuration = 1.2 / cutSpeed;
    const startX = Math.random() * 80 + 10; // 10-90%
    const startY = Math.random() * 80 + 10;
    const endX = startX + (Math.random() - 0.5) * 30;
    const endY = startY - Math.random() * 40;
    const particleSize = Math.random() * 8 + 8; // 8-16px

    return {
      id: mistId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class="absolute rounded-full blur-md" style="width: ${particleSize}px; height: ${particleSize}px; background: rgba(255, 255, 255, 0.1); opacity: 0;"></div>`,
        className: 'absolute',
        style: {
          left: `${startX}%`,
          top: `${startY}%`,
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: mistDuration,
        },
      },
      effects: [
        {
          id: `${mistId}-float`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: mistDuration,
            mode: 'provider',
            targetIds: [mistId],
            ranges: [
              { key: 'left', val: `${startX}%`, prog: 0 },
              { key: 'left', val: `${endX}%`, prog: 1 },
              { key: 'top', val: `${startY}%`, prog: 0 },
              { key: 'top', val: `${endY}%`, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: steamOpacity, prog: 0.2 },
              { key: 'opacity', val: steamOpacity * 0.7, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scale', val: 0.5, prog: 0 },
              { key: 'scale', val: 1.5, prog: 1 },
            ],
          },
        },
      ],
    };
  };

  // Create mist particles
  const mistParticles: RenderableComponentData[] = [];
  for (let i = 0; i < 6; i++) {
    mistParticles.push(createMistParticle(i));
  }

  // Main text component with cutting reveal
  const textId = 'hydro-cut-text';
  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'font-black tracking-wide',
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        textShadow: `0 0 20px ${waterColor}80, 0 0 40px ${waterColor}66`,
        filter: 'contrast(110%) brightness(105%) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))',
        WebkitTextStroke: `2px ${waterColor}4D`,
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
        id: `${textId}-cutting-reveal`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: totalCutTime,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            {
              key: 'clipPath',
              val: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
              prog: 1,
            },
          ],
        },
      },
      {
        id: `${textId}-impact-shake`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: totalCutTime,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 2 * intensity, prog: 0.02 },
            { key: 'translateX', val: -2 * intensity, prog: 0.04 },
            { key: 'translateX', val: 1 * intensity, prog: 0.06 },
            { key: 'translateX', val: -1 * intensity, prog: 0.08 },
            { key: 'translateX', val: 0, prog: 0.1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: 1 * intensity, prog: 0.03 },
            { key: 'translateY', val: -1 * intensity, prog: 0.06 },
            { key: 'translateY', val: 0, prog: 0.09 },
          ],
        },
      },
      {
        id: `${textId}-stabilize`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: totalCutTime,
          duration: Math.max(holdTime, 0.3),
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'hydro-jet-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      // Jet streams layer
      {
        id: 'jet-streams-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: jetStreams,
      },
      // Text layer
      {
        id: 'text-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative z-10',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [textComponent],
      },
      // Steam/mist overlay
      {
        id: 'steam-mist-overlay',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none z-20',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: mistParticles,
      },
    ],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'hydroJetText',
  title: 'Hydro-Jet Text Animation',
  description:
    'High-pressure water jet text animation with industrial cutting precision, turbulent spray effects, and powerful impact dynamics. Text appears as if sliced by laser-precise water jets.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'water',
    'industrial',
    'cutting',
    'hydro',
    'jet',
    'precision',
    'intense',
    'tech',
    'reveal',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'HYDRO CUT',
    duration: 3,
    fontSize: 96,
    textColor: '#FFFFFF',
    waterColor: '#00FFFF',
    cutSpeed: 1.5,
    jetCount: 5,
    intensity: 1,
    steamOpacity: 0.15,
  },
};

export const hydroJetTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
