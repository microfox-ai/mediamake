/**
 * Fan Accordion Fold Text Reveal Preset
 *
 * This preset creates an oriental fan or accordion fold reveal effect where text
 * segments unfold from the center like opening a paper fan. Each segment rotates
 * from a folded 90-degree Y-axis position to face forward while spreading outward
 * into an arc formation.
 *
 * Features:
 * - **3D Transform Animation**: Segments rotate from 90deg (folded) to 0deg (facing forward)
 * - **Arc Formation**: Segments spread outward in a fan-like arc with proper positioning
 * - **Mechanical Unfolding**: Staggered timing creates smooth, mechanical motion
 * - **Transform Origin Control**: Pivot points at center-bottom for realistic fan motion
 * - **Depth Effects**: Shadow effects during rotation for enhanced 3D perception
 * - **Customizable Text**: Five configurable text segments
 * - **Adjustable Timing**: Base duration and stagger delay parameters
 *
 * Use cases:
 * - Creating dramatic text reveals for titles and headings
 * - Adding oriental/Asian-inspired typography effects
 * - Building mechanical unfolding animations for brand reveals
 * - Creating eye-catching social media content with 3D text effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  segment0Text: z.string().default('F').describe('Text for center segment (index 0)'),
  segment1Text: z.string().default('A').describe('Text for segment 1'),
  segment2Text: z.string().default('N').describe('Text for segment 2'),
  segment3Text: z.string().default('O').describe('Text for segment 3'),
  segment4Text: z.string().default('U').describe('Text for segment 4'),
  
  fontSize: z.string().default('96px').describe('Font size for all segments'),
  textColor: z.string().default('#FFFFFF').describe('Text color (CSS color value)'),
  fontFamily: z.string().default('Inter').describe('Font family for text'),
  
  baseDuration: z.number().default(1.2).describe('Base animation duration in seconds'),
  staggerDelay: z.number().default(0.05).describe('Delay between each segment animation in seconds'),
  
  arcSpread: z.number().default(30).describe('Arc spread angle in degrees (total spread = arcSpread * 2)'),
  
  startTime: z.number().default(0).describe('Start time of the animation (relative to parent)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    segment0Text,
    segment1Text,
    segment2Text,
    segment3Text,
    segment4Text,
    fontSize,
    textColor,
    fontFamily,
    baseDuration,
    staggerDelay,
    arcSpread,
    startTime,
  } = params;

  // Helper function to create segment component with effects
  const createSegment = (
    index: number,
    text: string,
    angle: number,
    distance: number,
  ): RenderableComponentData => {
    const segmentId = `fan-segment-${index}`;
    const textId = `text-segment-${index}`;
    
    // Calculate stagger based on distance from center
    const stagger = Math.abs(index - 2) * staggerDelay;
    
    // Create rotation and spread effects
    const rotateYEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: baseDuration,
      mode: 'provider',
      targetIds: [segmentId],
      ranges: [
        { key: 'rotateY', val: 90, prog: 0 },
        { key: 'rotateY', val: 0, prog: 1 },
      ],
    };
    
    const spreadEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: baseDuration,
      mode: 'provider',
      targetIds: [segmentId],
      ranges: [
        { key: 'rotateZ', val: 0, prog: 0 },
        { key: 'rotateZ', val: angle, prog: 1 },
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: distance, prog: 1 },
      ],
    };
    
    const opacityEffect: GenericEffectData = {
      type: 'ease-out',
      start: 0,
      duration: baseDuration * 0.5,
      mode: 'provider',
      targetIds: [segmentId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };
    
    return {
      id: segmentId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            transformStyle: 'preserve-3d',
            transformOrigin: 'center bottom',
          },
        },
      },
      context: {
        timing: {
          start: stagger,
          duration: baseDuration + stagger,
        },
      },
      effects: [
        {
          id: `rotate-y-${index}`,
          componentId: 'generic',
          data: rotateYEffect,
        },
        {
          id: `spread-${index}`,
          componentId: 'generic',
          data: spreadEffect,
        },
        {
          id: `opacity-${index}`,
          componentId: 'generic',
          data: opacityEffect,
        },
      ],
      childrenData: [
        {
          id: textId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text,
            style: {
              fontSize,
              color: textColor,
              fontWeight: 'bold',
              textShadow: '0 4px 8px rgba(0,0,0,0.3)',
            },
            font: {
              family: fontFamily,
              weights: ['700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: baseDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  };

  // Calculate positions for 5 segments in arc formation
  // Center segment (index 2) at 0 degrees
  // Segments spread symmetrically: -2, -1, 0, +1, +2
  const segments = [
    { index: 0, text: segment0Text, angleOffset: -2, distance: 120 },
    { index: 1, text: segment1Text, angleOffset: -1, distance: 80 },
    { index: 2, text: segment2Text, angleOffset: 0, distance: 0 },
    { index: 3, text: segment3Text, angleOffset: 1, distance: 80 },
    { index: 4, text: segment4Text, angleOffset: 2, distance: 120 },
  ];

  const segmentComponents = segments.map(({ index, text, angleOffset, distance }) => {
    const angle = angleOffset * arcSpread;
    return createSegment(index, text, angle, distance);
  });

  // Container for all segments
  const fanContainer: RenderableComponentData = {
    id: 'fan-segments-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          transformStyle: 'preserve-3d',
          transformOrigin: 'center bottom',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseDuration + (staggerDelay * 4),
      },
    },
    childrenData: segmentComponents,
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'fan-reveal-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          perspective: '800px',
        },
      },
    },
    context: {
      timing: {
        start: startTime,
        duration: baseDuration + (staggerDelay * 4),
      },
    },
    childrenData: [fanContainer],
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
  id: 'fan-accordion-fold-text-reveal',
  title: 'Fan Accordion Fold Text Reveal',
  description:
    'A typokinetics preset featuring an oriental fan or accordion fold reveal effect. Text segments unfold from the center like opening a paper fan, with each segment rotating from a folded 90-degree Y-axis position to face forward while spreading outward into an arc formation. Uses 3D transforms with perspective, transform-origin manipulation at center-bottom for pivot points, and staggered timing to create a mechanical yet smooth unfolding animation reminiscent of traditional Asian folding fans.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'text',
    '3d',
    'transform',
    'fan',
    'accordion',
    'fold',
    'reveal',
    'oriental',
    'mechanical',
    'arc',
    'rotation',
    'perspective',
  ],
  dependencies: {},
  defaultInputParams: {
    segment0Text: 'F',
    segment1Text: 'A',
    segment2Text: 'N',
    segment3Text: 'O',
    segment4Text: 'U',
    fontSize: '96px',
    textColor: '#FFFFFF',
    fontFamily: 'Inter',
    baseDuration: 1.2,
    staggerDelay: 0.05,
    arcSpread: 30,
    startTime: 0,
  },
};

// Export preset
export const fanAccordionFoldTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};