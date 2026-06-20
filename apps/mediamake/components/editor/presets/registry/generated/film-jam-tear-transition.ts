/**
 * Film Jam/Tear Transition Preset
 *
 * This preset simulates the dramatic moment when film gets caught in a projector
 * mechanism and tears apart. The outgoing video freezes, develops a bright white
 * hotspot (from the projector bulb), then appears to tear diagonally across the
 * frame with realistic torn edge geometry. The tear reveals the incoming video
 * underneath, which shows signs of mechanical stress (stretching, distortion)
 * before snapping back to normal. Includes melting emulsion effects around the
 * tear, visible film base showing through, and fragments of torn film floating away.
 *
 * Features:
 * - Outgoing video freezes using endAt parameter
 * - White hotspot appears and intensifies (simulating projector bulb)
 * - Diagonal tear with jagged edge geometry using clip-path
 * - Melting emulsion effects (blur + brightness filters)
 * - Incoming video shows mechanical stress (stretch distortion)
 * - Film fragments scatter away from tear line with physics-based movement
 * - Dramatic 1.2s overlap period for maximum impact
 *
 * Use cases:
 * - Creating dramatic transitions between video clips
 * - Adding vintage/analog film effects
 * - Building cinematic scene breaks
 * - Creating horror or suspense transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z
    .object({
      src: z.string().describe('Source URL of the outgoing video'),
      startFrom: z
        .number()
        .optional()
        .describe('Start time for outgoing video (seconds)'),
    })
    .describe('Configuration for outgoing video'),

  incomingVideo: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      startFrom: z
        .number()
        .optional()
        .describe('Start time for incoming video (seconds)'),
    })
    .describe('Configuration for incoming video'),

  freezePoint: z
    .number()
    .default(0.3)
    .describe('Time when outgoing video freezes (relative to transition start)'),

  overlapDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the dramatic overlap/transition period (seconds)'),

  hotspotOrigin: z
    .object({
      x: z.string().default('60%').describe('Horizontal position of hotspot'),
      y: z.string().default('40%').describe('Vertical position of hotspot'),
    })
    .optional()
    .describe('Origin point of the hotspot (projector bulb position)'),

  tearAngle: z
    .number()
    .min(0)
    .max(360)
    .default(135)
    .describe('Angle of the tear line in degrees (0-360)'),

  fragmentCount: z
    .number()
    .min(0)
    .max(6)
    .default(3)
    .describe('Number of film fragments to scatter (0-6)'),

  meltingIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity of melting emulsion effect (0-2)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    freezePoint,
    overlapDuration,
    hotspotOrigin,
    tearAngle,
    fragmentCount,
    meltingIntensity,
  } = params;

  // Helper function: Generate jagged tear edge clip-path based on angle
  const generateTearClipPath = (progress: number, angle: number): string => {
    // Convert angle to radians
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Create a diagonal line from center with jagged edges
    const jaggedPoints: string[] = [];
    const numJags = 12; // Number of jagged teeth along tear

    // Progress determines how much of the frame is torn (0 = no tear, 1 = fully torn)
    const tearProgress = progress;

    // Start point (one edge of frame)
    let startX = 0;
    let startY = 0;

    // End point (opposite edge, depends on angle)
    let endX = 100;
    let endY = 100;

    // Adjust based on angle
    if (angle >= 0 && angle < 90) {
      startX = 0;
      startY = 100;
      endX = 100;
      endY = 0;
    } else if (angle >= 90 && angle < 180) {
      startX = 0;
      startY = 0;
      endX = 100;
      endY = 100;
    } else if (angle >= 180 && angle < 270) {
      startX = 100;
      startY = 0;
      endX = 0;
      endY = 100;
    } else {
      startX = 100;
      startY = 100;
      endX = 0;
      endY = 0;
    }

    // Create polygon points for the "remaining" part of the outgoing video
    jaggedPoints.push('0 0', '100% 0'); // Top edge

    // Add jagged tear line
    for (let i = 0; i <= numJags; i++) {
      const t = i / numJags;
      const baseX = startX + (endX - startX) * t * tearProgress;
      const baseY = startY + (endY - startY) * t * tearProgress;

      // Add jag (random offset perpendicular to tear line)
      const jagSize = 3 + Math.random() * 4; // 3-7% jag size
      const perpX = -sin * jagSize * (Math.random() - 0.5) * 2;
      const perpY = cos * jagSize * (Math.random() - 0.5) * 2;

      jaggedPoints.push(`${baseX + perpX}% ${baseY + perpY}%`);
    }

    // Close the polygon back to start
    if (tearProgress < 1) {
      jaggedPoints.push('100% 100%', '0 100%');
    }

    return `polygon(${jaggedPoints.join(', ')})`;
  };

  // Helper function: Generate fragment styles
  const generateFragmentStyle = (index: number) => {
    const baseTop = parseFloat(hotspotOrigin?.y || '40%');
    const baseLeft = parseFloat(hotspotOrigin?.x || '60%');

    // Spread fragments around hotspot
    const angle = (index / fragmentCount) * 360;
    const distance = 5 + index * 3;

    const offsetX = Math.cos((angle * Math.PI) / 180) * distance;
    const offsetY = Math.sin((angle * Math.PI) / 180) * distance;

    return {
      top: `${baseTop + offsetY}%`,
      left: `${baseLeft + offsetX}%`,
      width: `${60 + Math.random() * 40}px`,
      height: `${80 + Math.random() * 60}px`,
      zIndex: 5,
      opacity: 0,
      transform: 'rotate(0deg)',
    };
  };

  // Calculate timing
  const totalDuration = overlapDuration;

  const childrenData: RenderableComponentData[] = [];

  // 1. Incoming video (underneath, shows through tear)
  childrenData.push({
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      startFrom: incomingVideo.startFrom || 0,
      className: 'w-full h-full object-cover',
      style: {
        objectFit: 'cover',
        zIndex: 1,
        transform: 'scale(1.1, 0.9)', // Initial stretch
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
        id: 'incoming-stretch-snap',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0.6,
          duration: 0.6,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scaleX', val: 1.1, prog: 0 },
            { key: 'scaleX', val: 1, prog: 1 },
            { key: 'scaleY', val: 0.9, prog: 0 },
            { key: 'scaleY', val: 1, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 2. Outgoing video (frozen base layer)
  childrenData.push({
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom || 0,
      endAt: freezePoint,
      className: 'w-full h-full object-cover',
      style: {
        objectFit: 'cover',
        zIndex: 2,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData);

  // 3. Hotspot glow (projector bulb burning)
  const hotspotX = hotspotOrigin?.x || '60%';
  const hotspotY = hotspotOrigin?.y || '40%';

  childrenData.push({
    id: 'hotspot-glow',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 300px; height: 300px; background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 30%, rgba(255,255,255,0) 70%); border-radius: 50%; filter: blur(20px);"></div>`,
      className: 'absolute',
      style: {
        top: hotspotY,
        left: hotspotX,
        transform: 'translate(-50%, -50%)',
        zIndex: 3,
        opacity: 0,
        pointerEvents: 'none',
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
        id: 'hotspot-burn-in',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0.2,
          duration: 0.5,
          mode: 'provider',
          targetIds: ['hotspot-glow'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 4. Outgoing video with torn mask (revealing tear effect)
  childrenData.push({
    id: 'outgoing-torn-mask',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom || 0,
      endAt: freezePoint,
      className: 'w-full h-full object-cover',
      style: {
        objectFit: 'cover',
        zIndex: 4,
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', // Initial: full frame
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
        id: 'tear-reveal',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0.4,
          duration: 0.6,
          mode: 'provider',
          targetIds: ['outgoing-torn-mask'],
          ranges: [
            { key: 'clipPath', val: generateTearClipPath(0, tearAngle), prog: 0 },
            { key: 'clipPath', val: generateTearClipPath(1, tearAngle), prog: 1 },
          ],
        },
      },
      {
        id: 'melting-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0.4,
          duration: 0.6,
          mode: 'provider',
          targetIds: ['outgoing-torn-mask'],
          ranges: [
            {
              key: 'filter',
              val: 'blur(0px) brightness(100%)',
              prog: 0,
            },
            {
              key: 'filter',
              val: `blur(${5 * meltingIntensity}px) brightness(${100 + 100 * meltingIntensity}%)`,
              prog: 1,
            },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 5. Film fragments (scattered pieces)
  for (let i = 0; i < fragmentCount; i++) {
    const fragmentStyle = generateFragmentStyle(i);
    const fragmentDelay = 0.5 + i * 0.05;

    // Create simple torn film fragment using HTMLBlockAtom with styled div
    childrenData.push({
      id: `film-fragment-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, rgba(40,40,40,0.9) 0%, rgba(60,60,60,0.8) 100%); border: 2px solid rgba(80,80,80,0.6); box-shadow: 0 4px 8px rgba(0,0,0,0.5);"></div>`,
        className: 'absolute',
        style: fragmentStyle,
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `fragment-appear-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: fragmentDelay,
            duration: 0.7,
            mode: 'provider',
            targetIds: [`film-fragment-${i}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.1 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: 100 + i * 20, prog: 1 }, // Fall with gravity
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 45 + i * 30, prog: 1 }, // Rotate as falling
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  const rootContainer: RenderableComponentData = {
    id: 'film-jam-tear-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
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
  id: 'film-jam-tear-transition',
  title: 'Film Jam/Tear Transition',
  description:
    'Dramatic film projector jam transition that simulates film catching, burning, and tearing apart with authentic mechanical stress effects and torn fragments',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'film',
    'vintage',
    'tear',
    'projector',
    'dramatic',
    'analog',
    'cinematic',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/incoming.mp4',
      startFrom: 0,
    },
    freezePoint: 0.3,
    overlapDuration: 1.2,
    hotspotOrigin: {
      x: '60%',
      y: '40%',
    },
    tearAngle: 135,
    fragmentCount: 3,
    meltingIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const filmJamTearTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
