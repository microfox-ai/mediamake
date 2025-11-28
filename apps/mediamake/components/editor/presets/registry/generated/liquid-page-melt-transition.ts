/**
 * Liquid Page Melt Transition Preset
 *
 * Creates a liquid page-melt transition where the current scene appears to liquefy
 * and drip down like melting wax or paint, revealing the next content underneath.
 * The top of the image remains stable initially while the bottom begins to stretch
 * and drip with irregular, organic edges.
 *
 * Features:
 * - Multiple drip streams with varying speeds and lengths
 * - Surface tension effects with wobble and ripple
 * - Refraction-like distortions in melting areas
 * - Organic, artistic fluid animation
 * - SVG filters for turbulence and displacement
 * - Independent clip-path animations for each drip layer
 *
 * Use cases:
 * - Creative transitions for experimental content
 * - Artistic video transitions
 * - Abstract visual effects
 * - Liquid/fluid themed presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingSceneImage: z
    .string()
    .describe('Source URL of the outgoing scene image'),
  incomingSceneImage: z
    .string()
    .describe('Source URL of the incoming scene image'),
  transitionDuration: z
    .number()
    .default(2.0)
    .describe('Duration of the transition in seconds'),
  dripIntensity: z
    .number()
    .min(0.5)
    .max(2.0)
    .default(1.0)
    .describe('Intensity of the drip effect (0.5 = subtle, 2.0 = extreme)'),
  wobbleAmount: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Amount of wobble/ripple in pixels'),
  turbulenceIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.03)
    .describe('Intensity of turbulence distortion'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingSceneImage,
    incomingSceneImage,
    transitionDuration,
    dripIntensity,
    wobbleAmount,
    turbulenceIntensity,
  } = params;

  // Generate unique filter ID
  const filterId = `melt-turbulence-${Date.now()}`;

  // Helper function to generate clip-path for drip effect
  const generateDripClipPath = (
    progress: number,
    dripIndex: number,
    totalDrips: number,
  ): string => {
    // Each drip has different timing and speed
    const dripDelay = dripIndex * 0.15;
    const adjustedProgress = Math.max(0, (progress - dripDelay) * 1.3);

    if (adjustedProgress <= 0) {
      return 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
    }

    // Calculate drip points with organic variation
    const leftX = (dripIndex / totalDrips) * 100;
    const rightX = ((dripIndex + 1) / totalDrips) * 100;
    const centerX = (leftX + rightX) / 2;

    // Drip extends downward with acceleration
    const dripExtension = adjustedProgress * 120 * dripIntensity;

    // Organic wobble using sine waves
    const wobbleLeft = Math.sin(adjustedProgress * 5 + dripIndex) * wobbleAmount;
    const wobbleRight =
      Math.sin(adjustedProgress * 5 + dripIndex + Math.PI) * wobbleAmount;

    // Top remains stable
    const topLeftX = leftX;
    const topRightX = rightX;

    // Bottom stretches and drips
    const bottomLeftX = Math.max(0, Math.min(100, leftX + wobbleLeft));
    const bottomRightX = Math.max(0, Math.min(100, rightX + wobbleRight));
    const bottomY = Math.min(100 + dripExtension, 200);

    return `polygon(
      ${topLeftX}% 0%,
      ${topRightX}% 0%,
      ${bottomRightX}% ${bottomY}%,
      ${centerX}% ${bottomY + 10}%,
      ${bottomLeftX}% ${bottomY}%
    )`;
  };

  // Create SVG filter for turbulence
  const svgFilterHTML = `
    <svg style="position: absolute; width: 0; height: 0;">
      <defs>
        <filter id="${filterId}">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="${turbulenceIntensity}"
            numOctaves="4"
            result="turbulence"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turbulence"
            scale="30"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  `;

  // Number of drip layers
  const numDrips = 3;

  // Create drip layers
  const dripLayers: RenderableComponentData[] = [];

  for (let i = 0; i < numDrips; i++) {
    const dripLayerId = `drip-layer-${i}`;
    const dripContentId = `drip-content-${i}`;

    // Calculate horizontal position for this drip
    const leftPosition = (i / numDrips) * 100;
    const width = (1 / numDrips) * 100;

    dripLayers.push({
      id: dripLayerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute pointer-events-none overflow-visible',
          style: {
            zIndex: 15 + i,
            left: `${leftPosition}%`,
            width: `${width}%`,
            top: '0',
            height: '100%',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: dripContentId,
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: outgoingSceneImage,
            className: 'w-full h-full object-cover',
            style: {
              width: `${100 * numDrips}%`,
              marginLeft: `-${leftPosition}%`,
              filter: `url(#${filterId})`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            // Clip-path animation (dripping effect)
            {
              id: `drip-clip-${i}`,
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: [dripLayerId],
                ranges: [
                  {
                    key: 'clipPath',
                    val: generateDripClipPath(0, i, numDrips),
                    prog: 0,
                  },
                  {
                    key: 'clipPath',
                    val: generateDripClipPath(0.5, i, numDrips),
                    prog: 0.5,
                  },
                  {
                    key: 'clipPath',
                    val: generateDripClipPath(1, i, numDrips),
                    prog: 1,
                  },
                ],
              },
            },
            // ScaleY stretching effect
            {
              id: `drip-stretch-${i}`,
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: transitionDuration * 0.7,
                mode: 'provider',
                targetIds: [dripContentId],
                ranges: [
                  { key: 'scaleY', val: 1.0, prog: 0 },
                  { key: 'scaleY', val: 1.0 + 0.05 * i, prog: 0.3 },
                  { key: 'scaleY', val: 1.15 + 0.1 * i, prog: 1 },
                ],
              },
            },
            // Wobble effect (horizontal oscillation)
            {
              id: `drip-wobble-${i}`,
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: [dripContentId],
                ranges: [
                  { key: 'translateX', val: '0px', prog: 0 },
                  { key: 'translateX', val: `${wobbleAmount}px`, prog: 0.2 },
                  { key: 'translateX', val: `-${wobbleAmount}px`, prog: 0.4 },
                  { key: 'translateX', val: `${wobbleAmount * 0.5}px`, prog: 0.6 },
                  { key: 'translateX', val: `-${wobbleAmount * 0.5}px`, prog: 0.8 },
                  { key: 'translateX', val: '0px', prog: 1 },
                ],
              },
            },
            // Blur and brightness variations
            {
              id: `drip-distortion-${i}`,
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: transitionDuration * 0.3,
                duration: transitionDuration * 0.7,
                mode: 'provider',
                targetIds: [dripContentId],
                ranges: [
                  {
                    key: 'filter',
                    val: `url(#${filterId}) blur(0px) brightness(1)`,
                    prog: 0,
                  },
                  {
                    key: 'filter',
                    val: `url(#${filterId}) blur(2px) brightness(1.1)`,
                    prog: 0.5,
                  },
                  {
                    key: 'filter',
                    val: `url(#${filterId}) blur(4px) brightness(1.2) saturate(1.2)`,
                    prog: 1,
                  },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData);
  }

  const childrenData: RenderableComponentData[] = [
    // SVG filter definitions
    {
      id: 'svg-filter-defs',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: svgFilterHTML,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
          zIndex: 1,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,

    // Incoming scene layer (revealed underneath)
    {
      id: 'incoming-scene-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 5,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-content',
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: incomingSceneImage,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Outgoing scene layer (base layer, fades out)
    {
      id: 'outgoing-scene-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-content',
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: outgoingSceneImage,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            // Fade out the base outgoing layer
            {
              id: 'outgoing-fade',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: transitionDuration * 0.4,
                duration: transitionDuration * 0.6,
                mode: 'provider',
                targetIds: ['outgoing-scene-layer'],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Add all drip layers
    ...dripLayers,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'liquid-melt-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
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
  id: 'liquid-page-melt-transition',
  title: 'Liquid Page Melt Transition',
  description:
    'A liquid melt transition that simulates the appearance of the current scene melting and dripping down like wax or paint to reveal the next content. Features multiple drip streams, surface tension wobble, turbulence distortions, and organic fluid animation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'liquid',
    'melt',
    'drip',
    'fluid',
    'organic',
    'artistic',
    'creative',
    'experimental',
  ],
  defaultInputParams: {
    outgoingSceneImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    incomingSceneImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
    transitionDuration: 2.0,
    dripIntensity: 1.0,
    wobbleAmount: 3,
    turbulenceIntensity: 0.03,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidPageMeltTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
