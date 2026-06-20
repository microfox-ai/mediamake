/**
 * Liquid Morphing Panorama Preset
 *
 * Creates a ferrofluid-inspired panorama where images flow together like liquid mercury.
 * Images start as separate circular droplets that attract each other, merge with organic
 * blob-like transitions using blur/contrast effects for surface tension simulation, and
 * form a continuous fluid stream that scrolls horizontally with subtle wave motion.
 *
 * Features:
 * - **Droplet Attraction Phase**: Images move toward center with horizontal squeeze
 * - **Gooey Surface Tension**: Blur/contrast effects create liquid mercury merge illusion
 * - **Wave Motion**: Continuous sine-like undulation during scroll
 * - **Horizontal Scroll**: Merged panorama flows across screen
 * - **Color Shifts**: Chromatic transitions at merge boundaries
 *
 * Use cases:
 * - Creating cinematic image transitions
 * - Building liquid-style photo galleries
 * - Adding organic visual flow to image sequences
 * - Creating fluid animated panoramas
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
      }),
    )
    .min(3)
    .max(10)
    .describe('Array of images to morph (3-10 images)'),
  trackName: z
    .string()
    .default('liquid-panorama')
    .describe('Name of the track for unique IDs'),
  totalDuration: z
    .number()
    .min(5)
    .max(60)
    .default(15)
    .describe('Total duration of the animation in seconds'),
  attractionDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Duration of droplet attraction phase in seconds'),
  mergeDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Duration of gooey merge phase in seconds'),
  scrollDistance: z
    .number()
    .min(200)
    .max(2000)
    .default(800)
    .describe('Horizontal scroll distance in pixels'),
  waveAmplitude: z
    .number()
    .min(3)
    .max(15)
    .default(8)
    .describe('Amplitude of wave motion in pixels'),
  backgroundColor: z
    .string()
    .default('#0a0a0a')
    .describe('Background color of the container'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    trackName,
    totalDuration,
    attractionDuration,
    mergeDuration,
    scrollDistance,
    waveAmplitude,
    backgroundColor,
  } = params;

  // Helper: Create droplet positions (staggered horizontally)
  const createDropletPositions = () => {
    const positions = [];
    const spacing = 15; // 15% spacing between droplets
    for (let i = 0; i < images.length; i++) {
      positions.push({
        left: `${10 + i * spacing}%`,
        top: i % 2 === 0 ? '50%' : i % 3 === 0 ? '30%' : '35%',
      });
    }
    return positions;
  };

  // Helper: Create droplet sizes (slight variation)
  const createDropletSizes = () => {
    const baseSizes = [300, 280, 320, 290, 310];
    return images.map((_, i) => baseSizes[i % baseSizes.length]);
  };

  // Helper: Create attraction movements (toward center)
  const createAttractionMovements = () => {
    const movements = [];
    const centerIndex = Math.floor(images.length / 2);
    for (let i = 0; i < images.length; i++) {
      if (i < centerIndex) {
        movements.push(100 + (centerIndex - i - 1) * 20);
      } else if (i > centerIndex) {
        movements.push(-60 - (i - centerIndex - 1) * 30);
      } else {
        movements.push(0);
      }
    }
    return movements;
  };

  // Helper: Create wave motion offsets (phase-shifted sine waves)
  const createWaveMotion = (dropletIndex: number) => {
    const phaseShift = dropletIndex * 0.25;
    return [
      { val: 0, prog: 0 },
      { val: -waveAmplitude * (1 + phaseShift * 0.2), prog: 0.25 },
      { val: 0, prog: 0.5 },
      { val: waveAmplitude * (1 + phaseShift * 0.2), prog: 0.75 },
      { val: 0, prog: 1 },
    ];
  };

  const positions = createDropletPositions();
  const sizes = createDropletSizes();
  const movements = createAttractionMovements();

  // Timing calculations
  const mergeStartTime = attractionDuration - 1;
  const scrollStartTime = attractionDuration + 1;
  const scrollDuration = totalDuration - scrollStartTime;

  // Create droplet components
  const dropletChildren: RenderableComponentData[] = images.map(
    (image, index) => {
      const dropletId = `${trackName}-droplet-${index}`;
      const imageId = `${trackName}-image-${index}`;

      return {
        id: dropletId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              width: `${sizes[index]}px`,
              height: `${sizes[index]}px`,
              left: positions[index].left,
              top: positions[index].top,
              transform: 'translateY(-50%)',
              borderRadius: '50%',
              overflow: 'hidden',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [
          {
            id: imageId,
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: image.src,
              className: 'w-full h-full object-cover',
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Create attraction effect ranges
  const attractionRanges = [];
  for (let i = 0; i < images.length; i++) {
    const dropletId = `${trackName}-droplet-${i}`;
    attractionRanges.push(
      { key: 'translateX', val: 0, prog: 0, targetId: dropletId },
      { key: 'translateX', val: movements[i], prog: 1, targetId: dropletId },
    );
  }
  attractionRanges.push(
    { key: 'scaleX', val: 1, prog: 0 },
    { key: 'scaleX', val: 1.15, prog: 0.5 },
    { key: 'scaleX', val: 1.3, prog: 1 },
    { key: 'scaleY', val: 1, prog: 0 },
    { key: 'scaleY', val: 0.95, prog: 0.5 },
    { key: 'scaleY', val: 0.9, prog: 1 },
  );

  // Create wave motion ranges
  const waveRanges = [];
  for (let i = 0; i < images.length; i++) {
    const dropletId = `${trackName}-droplet-${i}`;
    const waveMotion = createWaveMotion(i);
    waveMotion.forEach((keyframe) => {
      waveRanges.push({
        key: 'translateY',
        val: keyframe.val,
        prog: keyframe.prog,
        targetId: dropletId,
      });
    });
  }

  // Create effects provider
  const effectsProvider: RenderableComponentData = {
    id: `${trackName}-effects-provider`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
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
      {
        id: `${trackName}-droplet-attraction`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: attractionDuration,
          mode: 'provider',
          targetIds: dropletChildren.map((d) => d.id),
          ranges: attractionRanges,
        },
      },
      {
        id: `${trackName}-gooey-merge`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: mergeStartTime,
          duration: mergeDuration,
          mode: 'provider',
          targetIds: [`${trackName}-droplet-container`],
          ranges: [
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 12, prog: 0.5 },
            { key: 'blur', val: 0, prog: 1 },
            { key: 'contrast', val: 1, prog: 0 },
            { key: 'contrast', val: 1.8, prog: 0.5 },
            { key: 'contrast', val: 1, prog: 1 },
            { key: 'brightness', val: 1, prog: 0 },
            { key: 'brightness', val: 1.2, prog: 0.5 },
            { key: 'brightness', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: `${trackName}-scroll`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: scrollStartTime,
          duration: scrollDuration,
          mode: 'provider',
          targetIds: [`${trackName}-droplet-container`],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -scrollDistance, prog: 1 },
          ],
        },
      },
      {
        id: `${trackName}-wave-motion`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: scrollStartTime,
          duration: scrollDuration,
          mode: 'provider',
          targetIds: dropletChildren.map((d) => d.id),
          ranges: waveRanges,
        },
      },
      {
        id: `${trackName}-color-shift`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: mergeStartTime + 0.5,
          duration: 2,
          mode: 'provider',
          targetIds: images.map((_, i) => `${trackName}-image-${i}`),
          ranges: [
            { key: 'saturation', val: 1, prog: 0 },
            { key: 'saturation', val: 1.3, prog: 0.5 },
            { key: 'saturation', val: 1, prog: 1 },
            { key: 'hue', val: 0, prog: 0 },
            { key: 'hue', val: 10, prog: 0.5 },
            { key: 'hue', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Droplet container
  const dropletContainer: RenderableComponentData = {
    id: `${trackName}-droplet-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [...dropletChildren, effectsProvider],
  };

  // Main container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-main-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [dropletContainer],
  } as RenderableComponentData;

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
  id: 'liquid-morphing-panorama',
  title: 'Liquid Morphing Panorama',
  description:
    'A liquid mercury-inspired panorama where images flow together like ferrofluid. Images start as separate droplets that move together, merge with organic blob-like transitions using blur/contrast effects for surface tension, and form a continuous fluid stream that scrolls horizontally with subtle wave motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'images',
    'panorama',
    'liquid',
    'ferrofluid',
    'morphing',
    'animation',
    'effects',
    'creative',
    'organic',
  ],
  defaultInputParams: {
    images: [
      { src: 'https://picsum.photos/seed/liquid1/400/400' },
      { src: 'https://picsum.photos/seed/liquid2/400/400' },
      { src: 'https://picsum.photos/seed/liquid3/400/400' },
      { src: 'https://picsum.photos/seed/liquid4/400/400' },
      { src: 'https://picsum.photos/seed/liquid5/400/400' },
    ],
    trackName: 'liquid-panorama',
    totalDuration: 15,
    attractionDuration: 3,
    mergeDuration: 3,
    scrollDistance: 800,
    waveAmplitude: 8,
    backgroundColor: '#0a0a0a',
  },
  dependencies: {},
};

export const liquidMorphingPanoramaPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
