/**
 * Anamorphic Light Leak Wipe Transition Preset
 * 
 * Creates a cinematic anamorphic light leak wipe transition between two images/videos.
 * Features:
 * - Horizontal light streak sweeps from left to right with warm amber gradient
 * - Outgoing image fades out and slides left with brightness pulse simulation
 * - Incoming image fades in and slides from right to center
 * - Warm orange-amber color grading with sepia and saturation filters
 * - 1.5-second overlap duration with synchronized animations
 * - Z-index layering: outgoing (10) → incoming (20) → light streak (30)
 * 
 * Technical Implementation:
 * - Single BaseLayout container with overflow-hidden
 * - ImageAtom/VideoAtom for outgoing: translateX 0→-5%, opacity 1→0, brightness 1→2.5→1
 * - ImageAtom/VideoAtom for incoming: translateX 5%→0%, opacity 0→1
 * - HTMLBlockAtom for light streak: horizontal amber gradient, translateX -100%→100%
 * - All effects synchronized via provider mode with targetIds
 * - Warm color grading: sepia(0.2) saturate(1.3)
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingMedia: z.object({
    src: z.string().describe('Source URL of the outgoing image or video'),
    type: z.enum(['image', 'video']).describe('Type of outgoing media'),
    duration: z.number().describe('Duration of outgoing media in seconds'),
  }).describe('Outgoing media configuration'),
  
  incomingMedia: z.object({
    src: z.string().describe('Source URL of the incoming image or video'),
    type: z.enum(['image', 'video']).describe('Type of incoming media'),
    duration: z.number().describe('Duration of incoming media in seconds'),
  }).describe('Incoming media configuration'),
  
  overlapDuration: z.number().default(1.5).describe('Duration of the transition overlap in seconds'),
  
  lightStreakDelay: z.number().default(0.2).describe('Delay before light streak animation starts (seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingMedia, incomingMedia, overlapDuration, lightStreakDelay } = params;
  
  // Calculate total container duration (subtract overlap to avoid extending timeline)
  const containerDuration = outgoingMedia.duration + incomingMedia.duration - overlapDuration;
  
  // Determine component IDs based on media type
  const outgoingComponentId = outgoingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId = incomingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  
  // Build the composition
  const childrenData: RenderableComponentData[] = [
    // Outgoing media (z-index: 10)
    {
      id: 'outgoing-image',
      type: 'atom',
      componentId: outgoingComponentId,
      data: {
        src: outgoingMedia.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingMedia.duration,
        },
      },
      effects: [
        // Fade out effect
        {
          id: 'outgoing-fade-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            mode: 'provider',
            targetIds: ['outgoing-image'],
            start: outgoingMedia.duration - overlapDuration,
            duration: overlapDuration,
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Slide left effect
        {
          id: 'outgoing-slide-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            mode: 'provider',
            targetIds: ['outgoing-image'],
            start: outgoingMedia.duration - overlapDuration,
            duration: overlapDuration,
            ranges: [
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '-5%', prog: 1 },
            ],
          },
        },
        // Brightness pulse effect (simulates exposure)
        {
          id: 'outgoing-brightness-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            mode: 'provider',
            targetIds: ['outgoing-image'],
            start: outgoingMedia.duration - overlapDuration,
            duration: overlapDuration,
            ranges: [
              { key: 'brightness', val: 1, prog: 0 },
              { key: 'brightness', val: 2.5, prog: 0.5 },
              { key: 'brightness', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Incoming media (z-index: 20)
    {
      id: 'incoming-image',
      type: 'atom',
      componentId: incomingComponentId,
      data: {
        src: incomingMedia.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 20,
          filter: 'sepia(0.2) saturate(1.3)',
        },
      },
      context: {
        timing: {
          start: outgoingMedia.duration - overlapDuration,
          duration: incomingMedia.duration + overlapDuration,
        },
      },
      effects: [
        // Fade in effect
        {
          id: 'incoming-fade-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            mode: 'provider',
            targetIds: ['incoming-image'],
            start: 0,
            duration: overlapDuration,
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Slide from right effect
        {
          id: 'incoming-slide-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            mode: 'provider',
            targetIds: ['incoming-image'],
            start: 0,
            duration: overlapDuration,
            ranges: [
              { key: 'translateX', val: '5%', prog: 0 },
              { key: 'translateX', val: '0%', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Light streak overlay (z-index: 30)
    {
      id: 'light-streak-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background: linear-gradient(90deg, transparent 0%, rgba(255, 165, 80, 0.6) 20%, rgba(255, 220, 150, 0.9) 40%, rgba(255, 255, 255, 1) 50%, rgba(255, 220, 150, 0.9) 60%, rgba(255, 165, 80, 0.6) 80%, transparent 100%);"></div>',
        className: 'absolute inset-0',
        style: {
          zIndex: 30,
          width: '150%',
          height: '100%',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: outgoingMedia.duration - overlapDuration,
          duration: overlapDuration,
        },
      },
      effects: [
        // Sweep effect (delayed start for better timing)
        {
          id: 'light-streak-sweep-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            mode: 'provider',
            targetIds: ['light-streak-overlay'],
            start: lightStreakDelay,
            duration: overlapDuration - lightStreakDelay,
            ranges: [
              { key: 'translateX', val: '-100%', prog: 0 },
              { key: 'translateX', val: '100%', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'anamorphic-light-leak-wipe-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: containerDuration,
      },
    },
    childrenData,
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
  id: 'anamorphic-light-leak-wipe',
  title: 'Anamorphic Light Leak Wipe Transition',
  description: 'Horizontal anamorphic light streak sweeps across frame from left to right, creating warm amber light leak effect. Outgoing image fades and slides left while incoming image is revealed behind the light. Features warm orange-amber color grading with exposure simulation through brightness and contrast filters. 1.5-second overlap duration with synchronized slide, fade, and sweep animations.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'anamorphic', 'light-leak', 'wipe', 'cinematic', 'amber', 'warm', 'youtube'],
  defaultInputParams: {
    outgoingMedia: {
      src: 'https://example.com/image1.jpg',
      type: 'image',
      duration: 5,
    },
    incomingMedia: {
      src: 'https://example.com/image2.jpg',
      type: 'image',
      duration: 5,
    },
    overlapDuration: 1.5,
    lightStreakDelay: 0.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const anamorphicLightLeakWipePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
