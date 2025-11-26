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
 * - **Performance Optimized**: GPU-accelerated CSS animations and transforms
 *
 * Use cases:
 * - Cyberpunk/tech-themed video transitions
 * - Digital/virtual reality scene changes
 * - Hacker/coding aesthetic content
 * - Futuristic presentation transitions
 * - Tech product reveals and demonstrations
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ==================== PARAMS SCHEMA ====================

const presetParams = z.object({
  outgoingMediaSrc: z.string().describe('Source URL of the outgoing video/image that will dissolve into matrix rain'),
  incomingMediaSrc: z.string().describe('Source URL of the incoming video/image that will materialize from the matrix rain'),
  transitionDuration: z.number().default(2.5).describe('Total duration of the transition in seconds'),
  columnCount: z.number().default(25).describe('Number of foreground matrix rain columns (20-30 recommended)'),
  bgColumnCount: z.number().default(15).describe('Number of background matrix rain columns for depth (10-20 recommended)'),
  matrixColor: z.enum(['green', 'cyan', 'green-cyan-mix']).default('green-cyan-mix').describe('Color scheme for the matrix characters'),
  pixelateIntensity: z.number().default(1.0).describe('Intensity of pixelation effect on outgoing scene (0.5-2.0)'),
  sparkCount: z.number().default(15).describe('Number of random spark flashes during transition (10-20 recommended)'),
  scanLineSpeed: z.number().default(2.0).describe('Speed of horizontal scan line movement in seconds per cycle'),
});

type PresetParams = z.infer<typeof presetParams>;

// ==================== EXECUTION FUNCTION ====================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingMediaSrc,
    incomingMediaSrc,
    transitionDuration,
    columnCount,
    bgColumnCount,
    matrixColor,
    pixelateIntensity,
    sparkCount,
    scanLineSpeed,
  } = params;

  // Helper: Generate random matrix characters
  const generateRandomChar = (): string => {
    const chars = 'ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ0123456789ABCDEFZ:・."=*+-<>¦｜';
    return chars[Math.floor(Math.random() * chars.length)];
  };

  // Helper: Get color based on scheme
  const getMatrixColors = () => {
    if (matrixColor === 'green') {
      return { primary: '#00ff41', secondary: '#00ff41', glow: 'rgba(0, 255, 65, 0.8)' };
    } else if (matrixColor === 'cyan') {
      return { primary: '#00ffff', secondary: '#00ffff', glow: 'rgba(0, 255, 255, 0.8)' };
    } else {
      return { primary: '#00ff41', secondary: '#00ffff', glow: 'rgba(0, 255, 200, 0.8)' };
    }
  };

  const colors = getMatrixColors();

  // Helper: Create matrix column
  const createMatrixColumn = (
    columnId: string,
    xPosition: number,
    isForeground: boolean,
  ): RenderableComponentData => {
    const charCount = isForeground ? 30 : 20;
    const characters: RenderableComponentData[] = [];
    
    const baseDuration = isForeground 
      ? 2 + Math.random() * 2  // 2-4s for foreground
      : 3 + Math.random() * 2; // 3-5s for background
    
    const delay = Math.random() * 1.5;
    
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
            fontSize: isForeground ? '14px' : '12px',
            color: charColor,
            fontFamily: 'monospace',
            textShadow: `0 0 10px ${colors.glow}, 0 0 20px ${colors.glow}`,
            opacity: opacity,
            display: 'block',
            lineHeight: '1.5',
            userSelect: 'none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData);
    }

    const columnWidth = isForeground ? 32 : 28;

    return {
      id: columnId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute top-0 flex flex-col overflow-hidden',
          style: {
            left: `${xPosition}px`,
            width: `${columnWidth}px`,
            height: '100%',
            animation: `matrixFall ${baseDuration}s linear ${delay}s infinite`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: characters,
    } as RenderableComponentData;
  };

  // Helper: Create spark effects
  const createSparkEffects = (): RenderableComponentData[] => {
    const sparks: RenderableComponentData[] = [];
    
    for (let i = 0; i < sparkCount; i++) {
      const xPos = Math.random() * 100;
      const yPos = Math.random() * 100;
      const sparkStart = Math.random() * (transitionDuration - 0.2);
      const sparkDuration = 0.1 + Math.random() * 0.15;
      
      sparks.push({
        id: `spark-${i}`,
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
              animation: `sparkFlash ${sparkDuration}s ease-out ${sparkStart}s 1`,
            },
          },
        },
        context: {
          timing: {
            start: sparkStart,
            duration: sparkDuration,
          },
        },
      } as RenderableComponentData);
    }
    
    return sparks;
  };

  // Generate foreground matrix columns
  const fgColumns: RenderableComponentData[] = [];
  const viewportWidth = props.config?.width || 1920;
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

  // CSS keyframes for animations
  const styleSheet = {
    id: 'matrix-rain-styles',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        style: {
          display: 'none',
        },
        dangerouslySetInnerHTML: {
          __html: `
            <style>
              @keyframes matrixFall {
                0% { transform: translateY(-100%); }
                100% { transform: translateY(100vh); }
              }
              
              @keyframes scanMove {
                0% { transform: translateY(-100%); }
                100% { transform: translateY(100vh); }
              }
              
              @keyframes sparkFlash {
                0% { opacity: 0; transform: scale(0); }
                50% { opacity: 1; transform: scale(2); }
                100% { opacity: 0; transform: scale(0); }
              }
              
              @keyframes pixelateIn {
                0% { filter: none; }
                100% { filter: blur(${pixelateIntensity * 10}px) brightness(0.5); }
              }
              
              @keyframes fadeInFromBottom {
                0% { opacity: 0; clip-path: polygon(0 100%, 100% 100%, 100% 100%, 0 100%); }
                100% { opacity: 1; clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
              }
            </style>
          `,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 0.001,
      },
    },
  } as RenderableComponentData;

  // Build the complete structure
  const childrenData: RenderableComponentData[] = [
    styleSheet,
    
    // Outgoing scene layer (dissolves)
    {
      id: 'matrix-outgoing-scene-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 10,
            animation: `pixelateIn ${transitionDuration * 0.6}s ease-in forwards`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration * 0.6,
        },
      },
      childrenData: [
        {
          id: 'matrix-outgoing-media',
          type: 'atom',
          componentId: outgoingMediaSrc.match(/\.(mp4|webm|mov)$/i) ? 'VideoAtom' : 'ImageAtom',
          data: {
            src: outgoingMediaSrc,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration * 0.6,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
    
    // Background matrix layer (depth)
    {
      id: 'matrix-background-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 opacity-30 blur-sm',
          style: {
            zIndex: 15,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: bgColumns,
    } as RenderableComponentData,
    
    // Foreground matrix layer (main rain)
    {
      id: 'matrix-foreground-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 30,
          },
        },
      },
      context: {
        timing: {
          start: transitionDuration * 0.1,
          duration: transitionDuration * 0.9,
        },
      },
      childrenData: [...fgColumns, ...sparks],
    } as RenderableComponentData,
    
    // Scan line layer
    {
      id: 'matrix-scan-line-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 40,
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
          id: 'matrix-scan-line',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute left-0 right-0',
              style: {
                height: '2px',
                background: 'linear-gradient(to bottom, transparent, rgba(103, 232, 249, 0.8), transparent)',
                boxShadow: '0 0 20px rgba(103, 232, 249, 0.6), 0 0 40px rgba(103, 232, 249, 0.3)',
                animation: `scanMove ${scanLineSpeed}s linear infinite`,
              },
            },
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
    
    // Incoming scene layer (materializes)
    {
      id: 'matrix-incoming-scene-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 20,
            animation: `fadeInFromBottom ${transitionDuration * 0.6}s ease-out ${transitionDuration * 0.4}s forwards`,
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: transitionDuration * 0.4,
          duration: transitionDuration * 0.6,
        },
      },
      childrenData: [
        {
          id: 'matrix-incoming-media',
          type: 'atom',
          componentId: incomingMediaSrc.match(/\.(mp4|webm|mov)$/i) ? 'VideoAtom' : 'ImageAtom',
          data: {
            src: incomingMediaSrc,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration * 0.6,
            },
          },
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

// ==================== METADATA ====================

const presetMetadata: PresetMetadata = {
  id: 'matrix-digital-rain-transition',
  title: 'Matrix Digital Rain Transition',
  description: 'A cyberpunk-inspired transition effect where the outgoing scene dissolves into cascading columns of glowing green/cyan code characters (digital rain) that reform to reveal the incoming scene. Features pixelation breakup, falling characters with light trails and sparks, depth layers with background matrix, and periodic scan line distortions for an authentic matrix/cyberpunk aesthetic.',
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
    outgoingMediaSrc: 'https://example.com/outgoing-video.mp4',
    incomingMediaSrc: 'https://example.com/incoming-video.mp4',
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
