/**
 * Cinematic Glass Break Transition Preset
 *
 * A dramatic glass break transition where the screen shatters in a spider-web pattern from center,
 * then fragments fall away with physics-based motion to reveal the next video underneath.
 *
 * Features:
 * - Instant spider-web crack appearance from center point
 * - Screen shake effect on impact (0.2s duration)
 * - 20-30 glass fragments with physics-based falling animation
 * - Staggered fragment animations based on radial distance from center
 * - Gravity-based acceleration with rotation
 * - Glass refraction effect using CSS filters (blur, brightness)
 * - 1.5-second total transition duration with 0.3s delay before fragments fall
 * - Incoming video visible through cracks
 *
 * Technical Implementation:
 * - BaseLayout with shake effect on root container
 * - HTMLBlockAtom for SVG spider-web crack overlay
 * - Multiple VideoAtom fragments with clip-path for glass pieces
 * - Generic effects for fragment falling, rotation, and opacity
 * - Radial distance-based stagger delays for natural cascade
 * - CSS backdrop-filter for glass refraction
 *
 * Use cases:
 * - Dramatic scene transitions in action/thriller videos
 * - Impact moments in sports highlights
 * - Breaking news or announcement reveals
 * - Creative video editing with high-impact transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video (revealed underneath)'),
    startFrom: z.number().optional().describe('Start time of incoming video playback (seconds)'),
  }).describe('Incoming video configuration'),
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video (shattering)'),
    startFrom: z.number().optional().describe('Start time of outgoing video playback (seconds)'),
  }).describe('Outgoing video configuration'),
  transitionDuration: z.number().default(1.5).describe('Total duration of the transition in seconds'),
  fragmentCount: z.number().min(20).max(30).default(25).describe('Number of glass fragments to generate (20-30)'),
  shakeIntensity: z.number().min(1).max(10).default(5).describe('Intensity of screen shake on impact (1-10)'),
  fallDuration: z.number().default(1.2).describe('Duration of fragment fall animation in seconds'),
  fallDelay: z.number().default(0.3).describe('Delay before fragments start falling (seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    incomingVideo,
    outgoingVideo,
    transitionDuration,
    fragmentCount,
    shakeIntensity,
    fallDuration,
    fallDelay,
  } = params;

  const { config } = props;
  const width = config?.width || 1920;
  const height = config?.height || 1080;
  const centerX = width / 2;
  const centerY = height / 2;

  // Helper: Generate spider-web crack pattern SVG
  const generateCrackPattern = (): string => {
    const numMainCracks = 8;
    const numBranches = 3;
    let paths = '';

    for (let i = 0; i < numMainCracks; i++) {
      const angle = (i / numMainCracks) * Math.PI * 2;
      const length = Math.min(width, height) * 0.6 + Math.random() * 100;
      const endX = centerX + Math.cos(angle) * length;
      const endY = centerY + Math.sin(angle) * length;

      // Main crack line
      paths += `<line x1="${centerX}" y1="${centerY}" x2="${endX}" y2="${endY}" stroke="white" stroke-width="3" opacity="0.9" />`;

      // Branch cracks
      for (let j = 0; j < numBranches; j++) {
        const branchRatio = 0.4 + Math.random() * 0.4;
        const branchStartX = centerX + Math.cos(angle) * length * branchRatio;
        const branchStartY = centerY + Math.sin(angle) * length * branchRatio;
        const branchAngle = angle + (Math.random() - 0.5) * Math.PI * 0.4;
        const branchLength = length * 0.3 + Math.random() * 50;
        const branchEndX = branchStartX + Math.cos(branchAngle) * branchLength;
        const branchEndY = branchStartY + Math.sin(branchAngle) * branchLength;

        paths += `<line x1="${branchStartX}" y1="${branchStartY}" x2="${branchEndX}" y2="${branchEndY}" stroke="white" stroke-width="2" opacity="0.7" />`;
      }
    }

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
        <g filter="url(#crack-glow)">
          ${paths}
        </g>
        <defs>
          <filter id="crack-glow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    `;
  };

  // Helper: Generate fragment clip-path polygons
  const generateFragmentClipPaths = (): Array<{
    clipPath: string;
    centerX: number;
    centerY: number;
    distance: number;
    rotation: number;
  }> => {
    const fragments: Array<{
      clipPath: string;
      centerX: number;
      centerY: number;
      distance: number;
      rotation: number;
    }> = [];

    const gridCols = 6;
    const gridRows = 5;
    const cellWidth = 100 / gridCols;
    const cellHeight = 100 / gridRows;

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        if (fragments.length >= fragmentCount) break;

        const x = col * cellWidth;
        const y = row * cellHeight;
        const xOffset = (Math.random() - 0.5) * cellWidth * 0.3;
        const yOffset = (Math.random() - 0.5) * cellHeight * 0.3;

        // Create irregular polygon for fragment
        const points = [
          `${x + xOffset}% ${y + yOffset}%`,
          `${x + cellWidth + xOffset}% ${y + yOffset}%`,
          `${x + cellWidth + xOffset}% ${y + cellHeight + yOffset}%`,
          `${x + xOffset}% ${y + cellHeight + yOffset}%`,
        ];

        const fragCenterX = x + cellWidth / 2;
        const fragCenterY = y + cellHeight / 2;
        const dx = fragCenterX - 50;
        const dy = fragCenterY - 50;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const rotation = (Math.random() - 0.5) * 360;

        fragments.push({
          clipPath: `polygon(${points.join(', ')})`,
          centerX: fragCenterX,
          centerY: fragCenterY,
          distance,
          rotation,
        });
      }
    }

    return fragments;
  };

  const fragments = generateFragmentClipPaths();
  const maxDistance = Math.sqrt(50 * 50 + 50 * 50);

  // Create fragment components
  const fragmentComponents: RenderableComponentData[] = fragments.map((frag, index) => {
    const staggerDelay = (frag.distance / maxDistance) * 0.4;
    const fallStart = fallDelay + staggerDelay;

    return {
      id: `glass-fragment-${index}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        startFrom: outgoingVideo.startFrom || 0,
        className: 'absolute inset-0 w-full h-full',
        style: {
          clipPath: frag.clipPath,
          filter: 'brightness(1.1) blur(1px)',
          objectFit: 'cover',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `fragment-fall-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: fallStart,
            duration: fallDuration,
            mode: 'provider',
            targetIds: [`glass-fragment-${index}`],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: height * 1.5, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: frag.rotation, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Root container with shake effect
  const rootContainer: RenderableComponentData = {
    id: 'glass-break-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full overflow-hidden',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'shake-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.2,
          mode: 'provider',
          targetIds: ['glass-break-transition-root'],
          ranges: [
            { key: 'translateX', val: -shakeIntensity, prog: 0 },
            { key: 'translateX', val: shakeIntensity, prog: 0.25 },
            { key: 'translateX', val: -shakeIntensity * 0.6, prog: 0.5 },
            { key: 'translateX', val: shakeIntensity * 0.6, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: -shakeIntensity * 0.6, prog: 0 },
            { key: 'translateY', val: shakeIntensity * 0.6, prog: 0.33 },
            { key: 'translateY', val: -shakeIntensity * 0.4, prog: 0.66 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      // Incoming video (z-index 0)
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          startFrom: incomingVideo.startFrom || 0,
          className: 'absolute inset-0 w-full h-full',
          style: {
            zIndex: 0,
            objectFit: 'cover',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,

      // Fragment container (z-index 5)
      {
        id: 'fragment-container',
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
        childrenData: fragmentComponents,
      } as RenderableComponentData,

      // Crack overlay (z-index 10)
      {
        id: 'crack-overlay',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: generateCrackPattern(),
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 10,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: 'crack-fade-in',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: 0.1,
              mode: 'provider',
              targetIds: ['crack-overlay'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
          {
            id: 'crack-fade-out',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: fallDelay + 0.5,
              duration: 0.3,
              mode: 'provider',
              targetIds: ['crack-overlay'],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
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
  id: 'glass-break-transition',
  title: 'Cinematic Glass Break Transition',
  description:
    'A dramatic glass break transition where the screen shatters in a spider-web pattern from center, then fragments fall away with physics-based motion to reveal the next video underneath. Features instant crack appearance, screen shake, staggered fragment animations, and glass refraction effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'glass', 'shatter', 'break', 'cinematic', 'physics', 'dramatic'],
  defaultInputParams: {
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      startFrom: 0,
    },
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      startFrom: 0,
    },
    transitionDuration: 1.5,
    fragmentCount: 25,
    shakeIntensity: 5,
    fallDuration: 1.2,
    fallDelay: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glassBreakTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
