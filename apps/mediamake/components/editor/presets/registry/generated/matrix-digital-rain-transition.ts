/**
 * Matrix Digital Rain Transition Preset
 *
 * A cyberpunk-inspired transition effect where the outgoing scene dissolves into cascading columns
 * of glowing green/cyan code characters (digital rain) that reform to reveal the incoming scene.
 *
 * Features:
 * - **Digital Rain Effect**: Cascading columns of random glowing characters (Katakana, numbers, symbols)
 * - **Pixelation Breakup**: Outgoing scene pixelates and dissolves into matrix columns
 * - **Light Trails & Sparks**: Falling characters leave glowing trails and occasional bright flashes
 * - **Depth Layers**: Background matrix at lower opacity creates visual depth
 * - **Scan Line Distortion**: Horizontal scan line periodically sweeps across creating glitch effects
 * - **Scene Reconstruction**: Incoming scene materializes as characters align to form the new image
 * - **Performance Optimized**: GPU-accelerated effects-based animations
 *
 * Use cases:
 * - Cyberpunk/tech-themed video transitions
 * - Digital/virtual reality scene changes
 * - Hacker/coding aesthetic content
 * - Futuristic presentation transitions
 * - Tech product reveals and demonstrations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ==================== PARAMS SCHEMA ====================

const presetParams = z.object({
  outgoingMedia: z
    .object({
      src: z
        .string()
        .describe(
          'Source URL of the outgoing video/image that will dissolve into matrix rain',
        ),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration of outgoing media in seconds'),
    })
    .describe('Outgoing media item'),
  incomingMedia: z
    .object({
      src: z
        .string()
        .describe(
          'Source URL of the incoming video/image that will materialize from the matrix rain',
        ),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration of incoming media in seconds'),
    })
    .describe('Incoming media item'),
  transitionDuration: z
    .number()
    .default(2.5)
    .describe('Duration of the transition overlap in seconds'),
  columnCount: z
    .number()
    .default(25)
    .describe('Number of foreground matrix rain columns (20-30 recommended)'),
  bgColumnCount: z
    .number()
    .default(15)
    .describe(
      'Number of background matrix rain columns for depth (10-20 recommended)',
    ),
  matrixColor: z
    .enum(['green', 'cyan', 'green-cyan-mix'])
    .default('green-cyan-mix')
    .describe('Color scheme for the matrix characters'),
  pixelateIntensity: z
    .number()
    .default(1.0)
    .describe('Intensity of pixelation effect on outgoing scene (0.5-2.0)'),
  sparkCount: z
    .number()
    .default(15)
    .describe(
      'Number of random spark flashes during transition (10-20 recommended)',
    ),
  scanLineSpeed: z
    .number()
    .default(2.0)
    .describe('Speed of horizontal scan line movement in seconds per cycle'),
});

type PresetParams = z.infer<typeof presetParams>;

// ==================== EXECUTION FUNCTION ====================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingMedia,
    incomingMedia,
    transitionDuration,
    columnCount,
    bgColumnCount,
    matrixColor,
    pixelateIntensity,
    sparkCount,
    scanLineSpeed,
  } = params;

  // Calculate BaseLayout duration: sum of media durations minus overlap
  const baseLayoutDuration =
    outgoingMedia.duration + incomingMedia.duration - transitionDuration;

  // Calculate overlap start time (when incoming media should start)
  const overlapStart = outgoingMedia.duration - transitionDuration;

  // Helper: Generate random matrix characters
  const generateRandomChar = (): string => {
    const chars =
      'ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ0123456789ABCDEFZ:・."=*+-<>¦｜';
    return chars[Math.floor(Math.random() * chars.length)];
  };

  // Helper: Get color based on scheme
  const getMatrixColors = () => {
    if (matrixColor === 'green') {
      return {
        primary: '#00ff41',
        secondary: '#00ff41',
        glow: 'rgba(0, 255, 65, 0.8)',
      };
    } else if (matrixColor === 'cyan') {
      return {
        primary: '#00ffff',
        secondary: '#00ffff',
        glow: 'rgba(0, 255, 255, 0.8)',
      };
    } else {
      return {
        primary: '#00ff41',
        secondary: '#00ffff',
        glow: 'rgba(0, 255, 200, 0.8)',
      };
    }
  };

  const colors = getMatrixColors();
  const viewportWidth = props.config?.width || 1920;
  const viewportHeight = props.config?.height || 1080;

  // Helper: Create matrix column
  // Note: Timing is relative to parent (matrix layer), so start at 0
  const createMatrixColumn = (
    columnId: string,
    xPosition: number,
    isForeground: boolean,
  ): RenderableComponentData => {
    const charCount = isForeground ? 30 : 20;
    const characters: RenderableComponentData[] = [];

    // Faster falling animation - characters should fall quickly during transition
    const baseDuration = isForeground
      ? 0.8 + Math.random() * 0.7 // 0.8-1.5s for foreground (faster)
      : 1.0 + Math.random() * 0.8; // 1.0-1.8s for background

    const delay = Math.random() * 0.3; // Shorter delay for quicker start

    // Generate character elements for this column
    for (let i = 0; i < charCount; i++) {
      const charColor = Math.random() > 0.5 ? colors.primary : colors.secondary;
      const opacity = 0.3 + Math.random() * 0.7;

      characters.push({
        id: `${columnId}-char-${i}`,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: generateRandomChar(),
          style: {
            fontSize: isForeground ? '28px' : '20px', // Larger for visibility
            color: charColor,
            fontFamily: 'monospace',
            fontWeight: 'bold',
            textShadow: `0 0 10px ${colors.glow}, 0 0 20px ${colors.glow}, 0 0 30px ${colors.glow}, 0 0 40px ${colors.glow}`,
            opacity: Math.max(0.8, opacity), // Higher minimum visibility
            display: 'block',
            lineHeight: '1.1',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            margin: '0',
            padding: '0',
            width: '100%',
            textAlign: 'center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration, // Characters exist during transition only
          },
        },
      } as RenderableComponentData);
    }

    const columnWidth = isForeground ? 50 : 40; // Increased for larger characters

    // Create falling effect for the column
    // Matrix rain should be active during the transition period
    const fallEffect = {
      id: `${columnId}-fall-effect`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: delay, // Relative to column start (which is at overlapStart)
        duration: baseDuration,
        mode: 'provider',
        targetIds: [columnId], // Target the column itself
        ranges: [
          { key: 'translateY', val: -viewportHeight, prog: 0 },
          { key: 'translateY', val: viewportHeight, prog: 1 },
        ],
      },
    };

    return {
      id: columnId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'absolute top-0 flex flex-col items-center overflow-hidden',
          style: {
            left: `${xPosition}px`,
            width: `${columnWidth}px`,
            height: '100%',
            pointerEvents: 'none',
            zIndex: isForeground ? 35 : 30, // Ensure proper z-index
          },
        },
        repeatChildrenProps: {
          style: {
            display: 'block',
            width: '100%',
            textAlign: 'center',
            flexShrink: 0,
          },
        },
      },
      context: {
        timing: {
          start: 0, // Relative to parent matrix layer (which starts at overlapStart)
          duration: transitionDuration,
        },
      },
      effects: [fallEffect],
      childrenData: characters,
    } as RenderableComponentData;
  };

  // Helper: Create spark effects
  // Note: Timing is relative to parent (matrix foreground layer), so start at 0-relative time
  const createSparkEffects = (): RenderableComponentData[] => {
    const sparks: RenderableComponentData[] = [];

    for (let i = 0; i < sparkCount; i++) {
      const xPos = Math.random() * 100;
      const yPos = Math.random() * 100;
      // Sparks should appear during the transition overlap period
      // Relative to parent matrix layer (which starts at overlapStart)
      const sparkStart = Math.random() * (transitionDuration - 0.2);
      const sparkDuration = 0.1 + Math.random() * 0.15;

      const sparkId = `spark-${i}`;

      // Create spark flash effect
      const sparkFlashEffect = {
        id: `spark-${i}-flash-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: sparkDuration,
          mode: 'provider',
          targetIds: [sparkId], // Target the spark itself
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'scale', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'scale', val: 2, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 0, prog: 1 },
          ],
        },
      };

      sparks.push({
        id: sparkId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute rounded-full',
            style: {
              left: `${xPos}%`,
              top: `${yPos}%`,
              width: '4px',
              height: '4px',
              backgroundColor: Math.random() > 0.5 ? '#00ffff' : '#ffffff',
              boxShadow: `0 0 20px ${colors.glow}, 0 0 40px ${colors.glow}`,
            },
          },
        },
        context: {
          timing: {
            start: sparkStart,
            duration: sparkDuration,
          },
        },
        effects: [sparkFlashEffect],
      } as RenderableComponentData);
    }

    return sparks;
  };

  // Generate foreground matrix columns
  const fgColumns: RenderableComponentData[] = [];
  const columnSpacing = viewportWidth / (columnCount + 1);

  for (let i = 0; i < columnCount; i++) {
    const xPos = (i + 1) * columnSpacing;
    fgColumns.push(createMatrixColumn(`fg-column-${i}`, xPos, true));
  }

  // Generate background matrix columns
  const bgColumns: RenderableComponentData[] = [];
  const bgColumnSpacing = viewportWidth / (bgColumnCount + 1);

  for (let i = 0; i < bgColumnCount; i++) {
    const xPos = (i + 1) * bgColumnSpacing + Math.random() * 50 - 25;
    bgColumns.push(createMatrixColumn(`bg-column-${i}`, xPos, false));
  }

  // Create spark effects
  const sparks = createSparkEffects();

  // Determine component IDs
  const outgoingComponentId =
    outgoingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId =
    incomingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Build the complete structure
  // IMPORTANT: Order matters! Higher z-index items must come LAST in the array
  const childrenData: RenderableComponentData[] = [
    // 1. Outgoing scene layer (zIndex 10) - LOWEST, comes first
    {
      id: 'matrix-outgoing-scene-layer',
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
          duration: outgoingMedia.duration,
        },
      },
      effects: [
        {
          id: 'pixelate-in-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: overlapStart,
            duration: transitionDuration * 0.4, // Faster pixelation - scene breaks up quickly
            mode: 'provider',
            targetIds: ['matrix-outgoing-scene-layer'], // Target the outgoing scene layer
            ranges: [
              { key: 'filter', val: 'none', prog: 0 },
              {
                key: 'filter',
                val: `blur(${pixelateIntensity * 10}px) brightness(0.3)`,
                prog: 1,
              },
            ],
          },
        },
        {
          id: 'fade-out-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: overlapStart + transitionDuration * 0.2, // Start fading after pixelation begins
            duration: transitionDuration * 0.8, // Gradual fade as matrix takes over
            mode: 'provider',
            targetIds: ['matrix-outgoing-scene-layer'], // Target the outgoing scene layer
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'matrix-outgoing-media',
          type: 'atom',
          componentId: outgoingComponentId,
          data: {
            src: outgoingMedia.src,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingMedia.duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // 2. Incoming scene layer (zIndex 20)
    // Starts invisible, materializes as matrix fades out
    {
      id: 'matrix-incoming-scene-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 20,
            opacity: 0, // Start invisible until fade-in effect
          },
        },
      },
      context: {
        timing: {
          start: overlapStart,
          duration: incomingMedia.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'fade-in-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: transitionDuration * 0.7, // Start materializing as matrix fades out
            duration: transitionDuration * 0.3, // Quick materialization
            mode: 'provider',
            targetIds: ['matrix-incoming-scene-layer'], // Target the incoming scene layer
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'matrix-incoming-media',
          type: 'atom',
          componentId: incomingComponentId,
          data: {
            src: incomingMedia.src,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingMedia.duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // 3. Background matrix layer (zIndex 30)
    // Fades in as outgoing dissolves, fades out as incoming materializes
    {
      id: 'matrix-background-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 30,
            filter: 'blur(2px)',
            opacity: 0, // Start invisible, fade in
          },
        },
      },
      context: {
        timing: {
          start: overlapStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'bg-matrix-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration * 0.3, // Fade in quickly as outgoing dissolves
            mode: 'provider',
            targetIds: ['matrix-background-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
        {
          id: 'bg-matrix-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionDuration * 0.7, // Start fading out as incoming materializes
            duration: transitionDuration * 0.3,
            mode: 'provider',
            targetIds: ['matrix-background-layer'],
            ranges: [
              { key: 'opacity', val: 0.3, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: bgColumns,
    } as RenderableComponentData,

    // 4. Foreground matrix layer (zIndex 35) - Characters should be visible here
    // Fades in as outgoing dissolves, fades out as incoming materializes
    {
      id: 'matrix-foreground-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 35,
            opacity: 0, // Start invisible, fade in
          },
        },
      },
      context: {
        timing: {
          start: overlapStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'fg-matrix-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration * 0.3, // Fade in quickly as outgoing dissolves
            mode: 'provider',
            targetIds: ['matrix-foreground-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'fg-matrix-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionDuration * 0.7, // Start fading out as incoming materializes
            duration: transitionDuration * 0.3,
            mode: 'provider',
            targetIds: ['matrix-foreground-layer'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [...fgColumns, ...sparks],
    } as RenderableComponentData,

    // 5. Scan line layer (zIndex 40) - HIGHEST, comes last
    // Fades in/out with matrix
    {
      id: 'matrix-scan-line-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 40,
            opacity: 0, // Start invisible, fade in
          },
        },
      },
      context: {
        timing: {
          start: overlapStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'scan-line-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration * 0.3,
            mode: 'provider',
            targetIds: ['matrix-scan-line-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'scan-line-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionDuration * 0.7,
            duration: transitionDuration * 0.3,
            mode: 'provider',
            targetIds: ['matrix-scan-line-layer'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'matrix-scan-line',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute left-0 right-0',
              style: {
                height: '2px',
                background:
                  'linear-gradient(to bottom, transparent, rgba(103, 232, 249, 0.8), transparent)',
                boxShadow:
                  '0 0 20px rgba(103, 232, 249, 0.6), 0 0 40px rgba(103, 232, 249, 0.3)',
              },
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
              id: 'scan-line-move-effect',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: scanLineSpeed,
                mode: 'provider',
                targetIds: ['matrix-scan-line'], // Target the scan line itself
                ranges: [
                  { key: 'translateY', val: -viewportHeight, prog: 0 },
                  { key: 'translateY', val: viewportHeight, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'matrix-digital-rain-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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

// ==================== METADATA ====================

const presetMetadata: PresetMetadata = {
  id: 'matrix-digital-rain-transition',
  title: 'Matrix Digital Rain Transition',
  description:
    'A cyberpunk-inspired transition effect where the outgoing scene dissolves into cascading columns of glowing green/cyan code characters (digital rain) that reform to reveal the incoming scene. Features pixelation breakup, falling characters with light trails and sparks, depth layers with background matrix, and periodic scan line distortions for an authentic matrix/cyberpunk aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'matrix',
    'digital-rain',
    'cyberpunk',
    'tech',
    'code',
    'glitch',
    'futuristic',
    'hacker',
    'sci-fi',
    'green',
    'cyan',
    'neon',
    'cascade',
    'pixelate',
  ],
  defaultInputParams: {
    outgoingMedia: {
      src: 'https://example.com/outgoing-video.mp4',
      type: 'video',
      duration: 5,
    },
    incomingMedia: {
      src: 'https://example.com/incoming-video.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 2.5,
    columnCount: 25,
    bgColumnCount: 15,
    matrixColor: 'green-cyan-mix',
    pixelateIntensity: 1.0,
    sparkCount: 15,
    scanLineSpeed: 2.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ==================== EXPORT ====================

export const matrixDigitalRainTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
