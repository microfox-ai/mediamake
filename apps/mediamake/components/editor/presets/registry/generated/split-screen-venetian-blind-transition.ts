/**
 * Split-Screen Venetian Blind Transition
 *
 * A dynamic transition effect where the screen divides into 5 vertical panels that slide
 * in opposite directions (odd panels up, even panels down) creating a venetian blind effect.
 * 
 * Features:
 * - 5 vertical slices with alternating slide directions
 * - Squeeze anticipation effect (scaleX: 0.95) before slides
 * - Staggered timing (50ms intervals) for dynamic movement
 * - Asymmetric speeds and distances (varied durations 0.8s-1.0s)
 * - Subtle shadows between panels
 * - Custom cubic-bezier easing for smooth acceleration
 * - ClipPath for precise panel slicing
 * 
 * Use cases:
 * - Creating dynamic video transitions
 * - Building stylized scene changes
 * - Adding theatrical reveal effects
 * - Professional video editing transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.4)
    .describe('Total duration of transition effect in seconds (includes squeeze + slide)'),
  squeezeAmount: z
    .number()
    .min(0.8)
    .max(1.0)
    .default(0.95)
    .optional()
    .describe('ScaleX amount for squeeze effect (0.95 = 5% squeeze)'),
  squeezeDuration: z
    .number()
    .default(0.2)
    .optional()
    .describe('Duration of squeeze anticipation effect in seconds'),
  staggerDelay: z
    .number()
    .default(0.05)
    .optional()
    .describe('Stagger delay between panels in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;
  const squeezeAmount = params.squeezeAmount ?? 0.95;
  const squeezeDuration = params.squeezeDuration ?? 0.2;
  const staggerDelay = params.staggerDelay ?? 0.05;

  // Calculate layout duration (outgoing + incoming - overlap)
  const overlapDuration = transitionDuration;
  const baseLayoutDuration = outgoingVideo.duration + incomingVideo.duration - overlapDuration;

  // Transition starts when outgoing video ends minus overlap
  const transitionStartTime = outgoingVideo.duration - overlapDuration;

  // Panel configuration: 5 panels with alternating directions
  const panelCount = 5;
  const panelWidth = 100 / panelCount; // 20% each

  // Slide durations (asymmetric for dynamic effect)
  const slideDurations = [0.8, 0.85, 0.9, 0.95, 1.0];
  
  // Slide distances (in viewport height %)
  const slideDistances = [120, 120, 120, 120, 120]; // All panels slide 120% for complete exit

  // Custom cubic-bezier easing
  const customEasing = 'cubic-bezier(0.77, 0, 0.175, 1)';

  // Create panel data
  const panels = Array.from({ length: panelCount }, (_, index) => {
    const panelNumber = index + 1;
    const isOddPanel = panelNumber % 2 === 1;
    const leftPosition = index * panelWidth;

    // ClipPath for vertical slice (clip to show only this panel's section)
    // Format: inset(top right bottom left)
    // We want to show only the portion of video that corresponds to this panel
    const clipLeft = leftPosition;
    const clipRight = 100 - (leftPosition + panelWidth);
    const clipPath = `inset(0 ${clipRight}% 0 ${clipLeft}%)`;

    // Stagger timing
    const squeezeStart = index * staggerDelay;
    const slideStart = squeezeStart + squeezeDuration;
    const slideDuration = slideDurations[index];

    // Translate direction (odd up, even down)
    const translateDirection = isOddPanel ? -slideDistances[index] : slideDistances[index];

    return {
      id: `panel-${panelNumber}`,
      leftPosition: `${leftPosition}%`,
      clipPath,
      squeezeStart,
      slideStart,
      slideDuration,
      translateDirection,
      isOddPanel,
    };
  });

  // Build panel VideoAtoms with effects
  const panelComponents: RenderableComponentData[] = panels.map((panel) => ({
    id: panel.id,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      className: 'absolute top-0 h-full object-cover shadow-xl',
      style: {
        left: panel.leftPosition,
        width: `${panelWidth}%`,
        clipPath: panel.clipPath,
      },
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      // Squeeze effect (scaleX: 1 -> 0.95 -> 1)
      {
        id: `${panel.id}-squeeze`,
        componentId: 'generic',
        data: {
          type: customEasing as any,
          start: transitionStartTime + panel.squeezeStart,
          duration: squeezeDuration,
          mode: 'provider',
          targetIds: [panel.id],
          ranges: [
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: squeezeAmount, prog: 0.5 },
            { key: 'scaleX', val: 1, prog: 1 },
          ],
        },
      },
      // Slide effect (translateY: 0 -> ±120%)
      {
        id: `${panel.id}-slide`,
        componentId: 'generic',
        data: {
          type: customEasing as any,
          start: transitionStartTime + panel.slideStart,
          duration: panel.slideDuration,
          mode: 'provider',
          targetIds: [panel.id],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: `${panel.translateDirection}%`, prog: 1 },
          ],
        },
      },
    ],
  }));

  // Incoming video (revealed behind panels)
  const incomingVideoComponent: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      className: 'absolute inset-0 object-cover',
      style: {
        zIndex: 0,
      },
      fit: 'cover',
    },
    context: {
      timing: {
        start: transitionStartTime,
        duration: incomingVideo.duration + overlapDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'split-screen-venetian-blind-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative h-full w-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      incomingVideoComponent,
      ...panelComponents,
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
  id: 'split-screen-venetian-blind-transition',
  title: 'Split-Screen Venetian Blind Transition',
  description:
    'A split-screen sliding panel transition where the screen divides into 5 vertical panels that slide in opposite directions (odd panels up, even panels down) with a venetian blind effect. Features staggered timing, asymmetric speeds, squeeze anticipation, and subtle shadows for a dynamic transition reveal.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'venetian-blind', 'split-screen', 'panels', 'slide', 'dynamic'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.4,
    squeezeAmount: 0.95,
    squeezeDuration: 0.2,
    staggerDelay: 0.05,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const splitScreenVenetianBlindTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
