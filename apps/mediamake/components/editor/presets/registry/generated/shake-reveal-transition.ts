/**
 * Shake and Reveal Transition Preset
 *
 * Creates a dynamic transition with impact feel. As the transition begins, the screen shakes
 * briefly (2-3 quick oscillations over 150ms) to signal a change, then the outgoing image
 * rapidly slides out with a motion blur effect while the incoming image slides in from the
 * opposite direction.
 *
 * Features:
 * - Brief screen shake (150ms) with 2-3 oscillations to signal transition
 * - Outgoing image slides left with motion blur
 * - Incoming image slides in from right with motion blur
 * - Total overlap duration: ~550ms
 * - Shake uses small translateX/Y oscillations for mechanical feel
 * - Slide transitions use ease-out for smooth motion
 * - Z-index management ensures incoming image stays on top
 *
 * Use cases:
 * - Energetic YouTube content transitions
 * - Impact-driven scene changes
 * - Fast-paced video content
 * - Dynamic image transitions with attention-grabbing shake
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingImage: z.object({
    src: z.string().describe('Source URL of the outgoing image'),
  }).describe('Outgoing image configuration'),
  incomingImage: z.object({
    src: z.string().describe('Source URL of the incoming image'),
  }).describe('Incoming image configuration'),
  shakeDuration: z.number().default(0.15).describe('Duration of shake phase in seconds (default: 0.15s)'),
  slideDuration: z.number().default(0.4).describe('Duration of slide transition in seconds (default: 0.4s)'),
  shakeIntensity: z.number().default(1).describe('Intensity multiplier for shake effect (default: 1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingImage, incomingImage, shakeDuration, slideDuration, shakeIntensity } = params;

  // Calculate total duration
  const totalDuration = shakeDuration + slideDuration;

  // Shake oscillation values with intensity multiplier
  const shakeValues = [
    0,
    8 * shakeIntensity,
    -8 * shakeIntensity,
    5 * shakeIntensity,
    -5 * shakeIntensity,
    0,
  ];

  // Container component
  const shakeRevealContainer: RenderableComponentData = {
    id: 'shake-reveal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Shake effect on container
      {
        id: 'shake-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: shakeDuration,
          mode: 'provider',
          targetIds: ['shake-reveal-container'],
          ranges: [
            { key: 'translateX', val: shakeValues[0], prog: 0 },
            { key: 'translateX', val: shakeValues[1], prog: 0.2 },
            { key: 'translateX', val: shakeValues[2], prog: 0.4 },
            { key: 'translateX', val: shakeValues[3], prog: 0.6 },
            { key: 'translateX', val: shakeValues[4], prog: 0.8 },
            { key: 'translateX', val: shakeValues[5], prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      // Outgoing image
      {
        id: 'outgoing-image-atom',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: outgoingImage.src,
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            objectFit: 'cover',
            willChange: 'transform',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          // Slide out with blur
          {
            id: 'outgoing-slide-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: shakeDuration,
              duration: slideDuration,
              mode: 'provider',
              targetIds: ['outgoing-image-atom'],
              ranges: [
                { key: 'translateX', val: 0, prog: 0, unit: '%' },
                { key: 'translateX', val: -105, prog: 1, unit: '%' },
                { key: 'filter', val: 'blur(0px)', prog: 0 },
                { key: 'filter', val: 'blur(3px)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Incoming image
      {
        id: 'incoming-image-atom',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: incomingImage.src,
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            objectFit: 'cover',
            willChange: 'transform',
            zIndex: 20,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          // Slide in with blur
          {
            id: 'incoming-slide-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: shakeDuration,
              duration: slideDuration,
              mode: 'provider',
              targetIds: ['incoming-image-atom'],
              ranges: [
                { key: 'translateX', val: 105, prog: 0, unit: '%' },
                { key: 'translateX', val: 0, prog: 1, unit: '%' },
                { key: 'filter', val: 'blur(3px)', prog: 0 },
                { key: 'filter', val: 'blur(0px)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  return {
    output: {
      childrenData: [shakeRevealContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'shake-reveal-transition',
  title: 'Shake and Reveal Transition',
  description: 'Dynamic transition with brief screen shake (2-3 oscillations over 150ms) followed by slide transition with motion blur. Outgoing image slides out left while incoming slides in from right. Total overlap ~550ms. Perfect for energetic YouTube content transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'shake', 'slide', 'blur', 'impact', 'energetic', 'youtube'],
  defaultInputParams: {
    outgoingImage: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    },
    incomingImage: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
    },
    shakeDuration: 0.15,
    slideDuration: 0.4,
    shakeIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const shakeRevealTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
