/**
 * Portal Warp Transition Preset
 *
 * This preset creates a sci-fi inspired word transition where outgoing words stretch and distort
 * as they're pulled through invisible portals on either side, while the new word emerges from
 * a central vortex with rotation and scale effects.
 *
 * Features:
 * - **Portal Warping**: Words stretch horizontally (scaleX 1→3) as they accelerate into portals
 * - **Directional Stretching**: Combined with skewX for directional acceleration effect
 * - **SVG Distortion**: Uses SVG feDisplacementMap filters for warping effects
 * - **Central Vortex**: Middle word spirals into existence with 720deg rotation + scale
 * - **Particle Trails**: Pseudo-element particles trail behind moving words
 * - **Portal Glows**: Radial gradients at portal exit points with screen blend mode
 * - **Performance Optimized**: Filters limited to transform endpoints
 *
 * Use cases:
 * - Creating sci-fi word transitions
 * - Building futuristic caption animations
 * - Adding portal/warp effects to text
 * - Creating high-energy word replacements
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionWord,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  words: z
    .object({
      previousWord: z
        .object({
          text: z.string().describe('Text of the previous word'),
          start: z.number().describe('Start time of previous word (relative)'),
          duration: z.number().describe('Duration of previous word'),
        })
        .optional()
        .describe('Previous word data'),
      currentWord: z.object({
        text: z.string().describe('Text of the current word'),
        start: z.number().describe('Start time of current word (relative)'),
        duration: z.number().describe('Duration of current word'),
      }),
      nextWord: z
        .object({
          text: z.string().describe('Text of the next word'),
          start: z.number().describe('Start time of next word (relative)'),
          duration: z.number().describe('Duration of next word'),
        })
        .optional()
        .describe('Next word data'),
    })
    .describe('Word data for transition (previous, current, next)'),
  transitionDuration: z
    .number()
    .default(0.4)
    .describe('Duration of portal warp transition in seconds'),
  fontSize: z
    .number()
    .default(72)
    .describe('Font size for outgoing words in pixels'),
  centerFontSize: z
    .number()
    .default(80)
    .describe('Font size for center vortex word in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for all words'),
  fontWeights: z
    .array(z.string())
    .default(['700'])
    .describe('Font weights to load'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of text in hexadecimal'),
  backgroundColor: z
    .string()
    .default('#0a0a0f')
    .describe('Background color of scene in hexadecimal'),
  portalLeftColor: z
    .string()
    .default('rgba(0,200,255,0.6)')
    .describe('Left portal glow color'),
  portalRightColor: z
    .string()
    .default('rgba(255,100,200,0.6)')
    .describe('Right portal glow color'),
  warpIntensity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Intensity of warp/distortion effect'),
  particleCount: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Number of particle trails per word'),
  enableSVGFilters: z
    .boolean()
    .default(true)
    .describe('Enable SVG displacement filters for warping'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    words,
    transitionDuration,
    fontSize,
    centerFontSize,
    fontFamily,
    fontWeights,
    textColor,
    backgroundColor,
    portalLeftColor,
    portalRightColor,
    warpIntensity,
    particleCount,
    enableSVGFilters,
  } = params;

  const { previousWord, currentWord, nextWord } = words;

  // Calculate total duration: current word duration + transition overlap
  const currentStart = currentWord.start;
  const currentDuration = currentWord.duration;
  const totalDuration = currentDuration + transitionDuration * 2;

  // Helper: Create SVG filter definitions
  const createSVGFilterDefs = (): string => {
    if (!enableSVGFilters) return '';
    
    return `
      <svg width="0" height="0" style="position: absolute;">
        <defs>
          <filter id="portal-warp-left">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="${20 * warpIntensity}" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="portal-warp-right">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="${20 * warpIntensity}" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="vortex-glow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    `;
  };

  // Build children array
  const childrenData: RenderableComponentData[] = [];

  // SVG Filter Definitions (if enabled)
  if (enableSVGFilters) {
    childrenData.push({
      id: 'svg-filter-defs',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: createSVGFilterDefs(),
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData);
  }

  // Portal Glows
  childrenData.push(
    {
      id: 'left-portal-glow',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: '0',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '120px',
            height: '300px',
            background: `radial-gradient(ellipse at center, ${portalLeftColor} 0%, rgba(0,100,200,0.3) 40%, transparent 70%)`,
            filter: 'blur(20px)',
            mixBlendMode: 'screen',
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
          id: 'left-portal-pulse',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['left-portal-glow'],
            ranges: [
              { key: 'opacity', val: 0.4, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0.4, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,
    {
      id: 'right-portal-glow',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            right: '0',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '120px',
            height: '300px',
            background: `radial-gradient(ellipse at center, ${portalRightColor} 0%, rgba(200,50,150,0.3) 40%, transparent 70%)`,
            filter: 'blur(20px)',
            mixBlendMode: 'screen',
          },
        },
      },
      context: {
        timing: {
          start: currentDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'right-portal-pulse',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['right-portal-glow'],
            ranges: [
              { key: 'opacity', val: 0.4, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0.4, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,
  );

  // Previous Word (exits to left portal)
  if (previousWord) {
    const previousChildren: RenderableComponentData[] = [];
    
    // Previous word text
    previousChildren.push({
      id: 'previous-word-text',
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: previousWord.text,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: 'bold',
          color: textColor,
          whiteSpace: 'nowrap',
        },
        font: {
          family: fontFamily,
          weights: fontWeights,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData);

    // Add particle trails for previous word
    for (let i = 0; i < particleCount; i++) {
      const particleDelay = (i * transitionDuration) / (particleCount * 2);
      previousChildren.push({
        id: `prev-particle-${i}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              width: `${8 - i * 1}px`,
              height: `${8 - i * 1}px`,
              backgroundColor: portalLeftColor.replace('0.6', '0.8'),
              borderRadius: '2px',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            },
          },
        },
        context: {
          timing: {
            start: particleDelay,
            duration: transitionDuration - particleDelay,
          },
        },
        effects: [
          {
            id: `prev-particle-trail-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: transitionDuration - particleDelay,
              mode: 'provider',
              targetIds: [`prev-particle-${i}`],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: -200 - i * 20, prog: 1 },
                { key: 'opacity', val: 0.8, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [],
      } as RenderableComponentData);
    }

    childrenData.push({
      id: 'previous-word-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute flex items-center justify-center',
          style: {
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            filter: enableSVGFilters ? 'url(#portal-warp-left)' : 'none',
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
          id: 'previous-warp-exit',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['previous-word-container'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -300, prog: 1 },
              { key: 'scaleX', val: 1, prog: 0 },
              { key: 'scaleX', val: 3, prog: 1 },
              { key: 'skewX', val: '0deg', prog: 0 },
              { key: 'skewX', val: '-15deg', prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: previousChildren,
    } as RenderableComponentData);
  }

  // Current Word (center vortex emergence)
  const currentChildren: RenderableComponentData[] = [];
  
  currentChildren.push({
    id: 'current-word-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: currentWord.text,
      style: {
        fontSize: `${centerFontSize}px`,
        fontWeight: 'bold',
        color: textColor,
        textShadow: '0 0 30px rgba(100,200,255,0.8), 0 0 60px rgba(100,200,255,0.4)',
        whiteSpace: 'nowrap',
      },
      font: {
        family: fontFamily,
        weights: fontWeights,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: currentDuration,
      },
    },
  } as RenderableComponentData);

  childrenData.push({
    id: 'current-word-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute flex items-center justify-center',
        style: {
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          filter: enableSVGFilters ? 'url(#vortex-glow)' : 'none',
        },
      },
    },
    context: {
      timing: {
        start: transitionDuration,
        duration: currentDuration,
      },
    },
    effects: [
      {
        id: 'current-vortex-spiral',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['current-word-container'],
          ranges: [
            { key: 'rotate', val: '720deg', prog: 0 },
            { key: 'rotate', val: '0deg', prog: 1 },
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: currentChildren,
  } as RenderableComponentData);

  // Next Word (enters from right portal)
  if (nextWord) {
    const nextChildren: RenderableComponentData[] = [];
    
    nextChildren.push({
      id: 'next-word-text',
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: nextWord.text,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: 'bold',
          color: textColor,
          whiteSpace: 'nowrap',
        },
        font: {
          family: fontFamily,
          weights: fontWeights,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData);

    // Add particle trails for next word
    for (let i = 0; i < particleCount; i++) {
      const particleDelay = (i * transitionDuration) / (particleCount * 2);
      nextChildren.push({
        id: `next-particle-${i}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              width: `${8 - i * 1}px`,
              height: `${8 - i * 1}px`,
              backgroundColor: portalRightColor.replace('0.6', '0.8'),
              borderRadius: '2px',
              right: '50%',
              top: '50%',
              transform: 'translate(50%, -50%)',
            },
          },
        },
        context: {
          timing: {
            start: particleDelay,
            duration: transitionDuration - particleDelay,
          },
        },
        effects: [
          {
            id: `next-particle-trail-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: transitionDuration - particleDelay,
              mode: 'provider',
              targetIds: [`next-particle-${i}`],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: 200 + i * 20, prog: 1 },
                { key: 'opacity', val: 0.8, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [],
      } as RenderableComponentData);
    }

    childrenData.push({
      id: 'next-word-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute flex items-center justify-center',
          style: {
            right: '50%',
            top: '50%',
            transform: 'translate(50%, -50%)',
            filter: enableSVGFilters ? 'url(#portal-warp-right)' : 'none',
          },
        },
      },
      context: {
        timing: {
          start: currentDuration + transitionDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'next-warp-exit',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['next-word-container'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 300, prog: 1 },
              { key: 'scaleX', val: 1, prog: 0 },
              { key: 'scaleX', val: 3, prog: 1 },
              { key: 'skewX', val: '0deg', prog: 0 },
              { key: 'skewX', val: '15deg', prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: nextChildren,
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'portal-warp-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: currentStart,
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
  id: 'portal-warp-transition',
  title: 'Portal Warp Word Transition',
  description:
    'Sci-fi inspired word transition where outgoing words stretch and warp horizontally as they accelerate into invisible portals on either side, while the new word spirals into existence from a central vortex with rotation and scale effects. Features particle trails behind moving words and radial gradient portal glows with screen blend mode for energy effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'word-transition',
    'portal',
    'warp',
    'distortion',
    'sci-fi',
    'vortex',
    'particles',
    'svg-filters',
    'screen-blend',
  ],
  defaultInputParams: {
    words: {
      previousWord: {
        text: 'PREVIOUS',
        start: 0,
        duration: 1.5,
      },
      currentWord: {
        text: 'CURRENT',
        start: 1.5,
        duration: 2.0,
      },
      nextWord: {
        text: 'NEXT',
        start: 3.5,
        duration: 1.5,
      },
    },
    transitionDuration: 0.4,
    fontSize: 72,
    centerFontSize: 80,
    fontFamily: 'Inter',
    fontWeights: ['700'],
    textColor: '#ffffff',
    backgroundColor: '#0a0a0f',
    portalLeftColor: 'rgba(0,200,255,0.6)',
    portalRightColor: 'rgba(255,100,200,0.6)',
    warpIntensity: 1,
    particleCount: 3,
    enableSVGFilters: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const portalWarpTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};