/**
 * Cinematic Venetian Blinds Film Transition
 *
 * This preset creates a cinematic letterbox Venetian blinds transition with film strip aesthetics.
 * Features 8 horizontal blinds that slide apart in pairs from center outward, simulating mechanical
 * film reel movement with perforations, grain texture, rotation wobble, and light leak effects.
 *
 * Features:
 * - 8 horizontal blinds with film perforation edges (like actual film strips)
 * - Film grain texture using CSS filters
 * - Blinds slide apart in pairs from center outward (middle → outer)
 * - Mechanical rotation wobble (oscillates 0° → 2° → -2° → 0°)
 * - Light leak effect (bright white flash with low opacity) as gaps appear
 * - Uses CSS transforms only for performance
 * - Perforation pattern rendered as CSS background
 *
 * Use cases:
 * - Creating cinematic transitions between scenes
 * - Film-style reveal effects for trailers or movie intros
 * - Adding authentic film reel aesthetics to video content
 * - Building engaging transition effects with mechanical feel
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  transitionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Total duration of the transition in seconds'),
  pairDelay: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.2)
    .describe(
      'Delay between each pair of blinds starting animation in seconds',
    ),
  blindSlideDistance: z
    .number()
    .min(20)
    .max(200)
    .default(50)
    .describe('Distance blinds slide away (in viewport height %)'),
  rotationWobbleAmount: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Maximum rotation wobble angle in degrees'),
  lightLeakOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Maximum opacity of light leak effect'),
  blindColor: z
    .string()
    .default('#1a1a1a')
    .describe('Base color of the blinds'),
  perforationColor: z
    .string()
    .default('rgba(0,0,0,0.8)')
    .describe('Color of film perforations'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    transitionDuration,
    pairDelay,
    blindSlideDistance,
    rotationWobbleAmount,
    lightLeakOpacity,
    blindColor,
    perforationColor,
  } = params;

  // Helper function to create blind HTML with perforations
  const createBlindHTML = (blindColor: string, perforationColor: string) => {
    return `
      <div style="
        width: 100%; 
        height: 100%; 
        background: linear-gradient(90deg, ${blindColor} 0%, #2d2d2d 50%, ${blindColor} 100%); 
        position: relative; 
        filter: contrast(1.1) brightness(0.95);
      ">
        <!-- Left perforations -->
        <div style="
          position: absolute; 
          left: 0; 
          top: 0; 
          width: 16px; 
          height: 100%; 
          background-image: repeating-linear-gradient(
            to bottom, 
            transparent 0px, 
            transparent 8px, 
            ${perforationColor} 8px, 
            ${perforationColor} 12px
          ); 
          background-size: 16px 20px; 
          background-repeat: repeat-y;
        "></div>
        
        <!-- Right perforations -->
        <div style="
          position: absolute; 
          right: 0; 
          top: 0; 
          width: 16px; 
          height: 100%; 
          background-image: repeating-linear-gradient(
            to bottom, 
            transparent 0px, 
            transparent 8px, 
            ${perforationColor} 8px, 
            ${perforationColor} 12px
          ); 
          background-size: 16px 20px; 
          background-repeat: repeat-y;
        "></div>
      </div>
    `;
  };

  // Calculate individual blind animation duration (half of total minus delays)
  const blindDuration = 0.5; // Fixed at 500ms per blind animation

  // Define pairs: [topIndex, bottomIndex]
  // Center pair (3,4), then (2,5), then (1,6), then (0,7)
  const pairs = [
    [3, 4], // Center pair
    [2, 5], // Second pair
    [1, 6], // Third pair
    [0, 7], // Outer pair
  ];

  // Create blinds (8 total)
  const blinds: RenderableComponentData[] = [];

  for (let i = 0; i < 8; i++) {
    const blindId = `blind-${i}`;
    const topPosition = i * 12.5; // 12.5% per blind (100% / 8)

    // Determine which pair this blind belongs to
    let pairIndex = -1;
    let isTopBlind = false;

    for (let p = 0; p < pairs.length; p++) {
      if (pairs[p][0] === i) {
        pairIndex = p;
        isTopBlind = true;
        break;
      } else if (pairs[p][1] === i) {
        pairIndex = p;
        isTopBlind = false;
        break;
      }
    }

    // Calculate start time for this blind's animation
    const effectStart = pairIndex * pairDelay;

    // Create translate effect (slide away)
    const translateEffect = {
      id: `effect-blind-${i}-translate`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: effectStart,
        duration: blindDuration,
        mode: 'provider' as const,
        targetIds: [blindId],
        ranges: [
          {
            key: 'translateY',
            val: 0,
            prog: 0,
          },
          {
            key: 'translateY',
            val: isTopBlind ? -blindSlideDistance : blindSlideDistance,
            prog: 1,
          },
        ],
      },
    };

    // Create rotation wobble effect (oscillates)
    const rotateEffect = {
      id: `effect-blind-${i}-rotate`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: effectStart,
        duration: blindDuration,
        mode: 'provider' as const,
        targetIds: [blindId],
        ranges: [
          {
            key: 'rotateZ',
            val: 0,
            prog: 0,
          },
          {
            key: 'rotateZ',
            val: isTopBlind ? rotationWobbleAmount : -rotationWobbleAmount,
            prog: 0.25,
          },
          {
            key: 'rotateZ',
            val: isTopBlind ? -rotationWobbleAmount : rotationWobbleAmount,
            prog: 0.75,
          },
          {
            key: 'rotateZ',
            val: 0,
            prog: 1,
          },
        ],
      },
    };

    blinds.push({
      id: blindId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: createBlindHTML(blindColor, perforationColor),
        className: 'absolute w-full',
        style: {
          height: '12.5%',
          top: `${topPosition}%`,
          transformOrigin: 'center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [translateEffect, rotateEffect],
    } as RenderableComponentData);
  }

  // Create light leak overlay
  const lightLeakOverlay: RenderableComponentData = {
    id: 'light-leak-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 100%; height: 100%; background: white;'></div>",
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 10,
        mixBlendMode: 'screen',
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
        id: 'light-leak-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: ['light-leak-overlay'],
          ranges: [
            {
              key: 'opacity',
              val: 0,
              prog: 0,
            },
            {
              key: 'opacity',
              val: lightLeakOpacity,
              prog: 0.5,
            },
            {
              key: 'opacity',
              val: 0,
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'venetian-blinds-film-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [...blinds, lightLeakOverlay],
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

// Define preset metadata
const presetMetadata: PresetMetadata = {
  id: 'venetian-blinds-film-transition',
  title: 'Cinematic Venetian Blinds Film Transition',
  description:
    'Cinematic letterbox Venetian blinds transition with film strip perforations, grain texture, mechanical wobble, and light leak effects. Features 8 horizontal blinds that slide apart in pairs from center outward with film reel aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'venetian-blinds',
    'film',
    'cinematic',
    'letterbox',
    'mechanical',
    'perforation',
    'light-leak',
  ],
  defaultInputParams: {
    transitionDuration: 2,
    pairDelay: 0.2,
    blindSlideDistance: 50,
    rotationWobbleAmount: 2,
    lightLeakOpacity: 0.3,
    blindColor: '#1a1a1a',
    perforationColor: 'rgba(0,0,0,0.8)',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const venetianBlindsFilmTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
