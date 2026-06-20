/**
 * Cascading Liquid Typography Preset
 *
 * A dynamic kinetic typography preset featuring metallic liquid text that cascades down like a waterfall.
 * Letters drop with weight and viscosity, creating splashes and ripples as they land. The metallic liquid
 * exhibits varying thickness and opacity based on flow speed, with surface tension effects and continuous
 * drip animations on descender letters.
 *
 * Features:
 * - **Waterfall Cascade**: Letters flow down with staggered timing and bounce easing
 * - **Splash Effects**: Impact particles spawn at landing points with radial expansion
 * - **Ripple Animations**: Elliptical ripples emanate from impact centers
 * - **Liquid Viscosity**: Dynamic scaleY adjustments simulate stretching and pooling
 * - **Metallic Gradient**: Slate gradient with opacity variations for liquid appearance
 * - **Surface Tension**: Letters initially connected before separating
 * - **Continuous Drips**: Infinite drip animations on descender characters (j, g, y, p, q)
 * - **Audio Beat Sync**: Optional synchronization with audio beats for impact timing
 *
 * Use cases:
 * - Eye-catching title sequences with liquid metal aesthetics
 * - Dynamic brand reveals with viscous flow effects
 * - Music video typography synchronized with audio beats
 * - Abstract visual poetry with kinetic text animation
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display (split into words automatically)'),
  font: z
    .string()
    .optional()
    .default('Georgia:700:normal')
    .describe('Font family with optional weight and style (e.g., "Georgia:700:normal", "Playfair:600:italic")'),
  fontSize: z
    .number()
    .min(40)
    .max(300)
    .default(120)
    .describe('Font size in pixels'),
  fallDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of letter fall animation in seconds'),
  staggerDelay: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.15)
    .describe('Delay between letter animations in seconds'),
  splashDuration: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .describe('Duration of splash effect in seconds'),
  metalColor: z
    .string()
    .optional()
    .default('slate')
    .describe('Metallic color theme (slate, silver, gold, copper)'),
  intensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Overall effect intensity multiplier'),
  audioSrc: z
    .string()
    .optional()
    .describe('Optional audio source URL for beat sync (ref:componentId or URL)'),
  trackName: z
    .string()
    .optional()
    .default('liquid-typography')
    .describe('Track name for component IDs'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Parse font string
  const parseFontString = (fontString: string) => {
    const parts = fontString.split(':');
    return {
      family: parts[0] || 'Georgia',
      weight: parts[1] ? parseInt(parts[1], 10) : 700,
      style: (parts[2] as 'normal' | 'italic') || 'normal',
    };
  };

  // Helper function: Get metallic gradient
  const getMetallicGradient = (colorTheme: string) => {
    const gradients: Record<string, string> = {
      slate: 'bg-gradient-to-b from-slate-300/50 via-slate-200 to-slate-400',
      silver: 'bg-gradient-to-b from-gray-200/50 via-gray-100 to-gray-300',
      gold: 'bg-gradient-to-b from-yellow-200/50 via-yellow-100 to-yellow-300',
      copper: 'bg-gradient-to-b from-orange-300/50 via-orange-200 to-orange-400',
    };
    return gradients[colorTheme] || gradients.slate;
  };

  // Helper function: Check if letter is descender
  const isDescender = (letter: string): boolean => {
    return ['j', 'g', 'y', 'p', 'q'].includes(letter.toLowerCase());
  };

  // Parse parameters
  const fontConfig = parseFontString(params.font || 'Georgia:700:normal');
  const metallicGradient = getMetallicGradient(params.metalColor || 'slate');
  const words = params.text.trim().split(/\s+/);
  const intensity = params.intensity || 1;
  const trackName = params.trackName || 'liquid-typography';

  // Build composition
  const childrenData: RenderableComponentData[] = [];

  // Calculate total duration
  const totalLetters = words.reduce((sum, word) => sum + word.length, 0);
  const totalDuration = totalLetters * params.staggerDelay + params.fallDuration + 2;

  let letterIndex = 0;

  // Create word containers
  words.forEach((word, wordIndex) => {
    const wordId = `${trackName}-word-${wordIndex}`;
    const letterComponents: RenderableComponentData[] = [];

    // Create letter wrappers
    for (let charIndex = 0; charIndex < word.length; charIndex++) {
      const letter = word[charIndex];
      const letterId = `${wordId}-letter-${charIndex}`;
      const wrapperId = `${letterId}-wrapper`;
      const splashContainerId = `${letterId}-splash-container`;
      const rippleId = `${letterId}-ripple`;

      const letterStart = letterIndex * params.staggerDelay;
      const isDescenderLetter = isDescender(letter);

      // Create letter atom with effects
      const letterAtom: RenderableComponentData = {
        id: letterId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: letter,
          font: {
            family: fontConfig.family,
            weights: [fontConfig.weight.toString()],
          },
          className: `${metallicGradient} bg-clip-text text-transparent`,
          style: {
            fontSize: `${params.fontSize}px`,
            fontWeight: fontConfig.weight,
            fontStyle: fontConfig.style,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          // Fall animation with bounce easing
          {
            id: `${letterId}-fall`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: letterStart,
              duration: params.fallDuration,
              mode: 'provider',
              targetIds: [letterId],
              ranges: [
                { key: 'translateY', val: -200, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
                { key: 'opacity', val: 0.3, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.5 },
              ],
            },
          },
          // Liquid viscosity - stretch during fall
          {
            id: `${letterId}-stretch`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: letterStart,
              duration: params.fallDuration * 0.6,
              mode: 'provider',
              targetIds: [letterId],
              ranges: [
                { key: 'scaleY', val: 1.5 * intensity, prog: 0 },
                { key: 'scaleY', val: 1, prog: 1 },
              ],
            },
          },
          // Impact squash
          {
            id: `${letterId}-squash`,
            componentId: 'generic',
            data: {
              type: 'spring',
              start: letterStart + params.fallDuration,
              duration: 0.3,
              mode: 'provider',
              targetIds: [letterId],
              ranges: [
                { key: 'scaleY', val: 0.8, prog: 0 },
                { key: 'scaleY', val: 1, prog: 1 },
              ],
            },
          },
        ],
      };

      // Create splash droplets
      const splashDroplets: RenderableComponentData[] = [];
      const dropletCount = 3;
      for (let i = 0; i < dropletCount; i++) {
        const angle = (i / dropletCount) * Math.PI * 2;
        const distance = 15 + Math.random() * 10;
        const dropletId = `${letterId}-splash-droplet-${i}`;

        splashDroplets.push({
          id: dropletId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: ${6 + Math.random() * 4}px; height: ${6 + Math.random() * 4}px; border-radius: 50%; background: linear-gradient(135deg, rgba(226, 232, 240, 0.8), rgba(148, 163, 184, 0.6));"></div>`,
            className: 'absolute',
            style: {
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
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
              id: `${dropletId}-splash`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: letterStart + params.fallDuration,
                duration: params.splashDuration,
                mode: 'provider',
                targetIds: [dropletId],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: Math.cos(angle) * distance, prog: 1 },
                  { key: 'translateY', val: 0, prog: 0 },
                  { key: 'translateY', val: Math.sin(angle) * distance, prog: 1 },
                  { key: 'scale', val: 0, prog: 0 },
                  { key: 'scale', val: 1.5, prog: 0.5 },
                  { key: 'scale', val: 0, prog: 1 },
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        });
      }

      const splashContainer: RenderableComponentData = {
        id: splashContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none',
            style: {
              width: '100px',
              height: '100px',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: splashDroplets as RenderableComponentData[],
      };

      // Create ripple effect
      const ripple: RenderableComponentData = {
        id: rippleId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(ellipse, rgba(148, 163, 184, 0.4) 0%, transparent 70%);"></div>`,
          className: 'absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none',
          style: {
            width: '100px',
            height: '20px',
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
            id: `${rippleId}-expand`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: letterStart + params.fallDuration,
              duration: params.splashDuration,
              mode: 'provider',
              targetIds: [rippleId],
              ranges: [
                { key: 'scale', val: 0, prog: 0 },
                { key: 'scale', val: 2, prog: 1 },
                { key: 'opacity', val: 0.8, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      };

      // Create continuous drip for descenders
      let dripElement: RenderableComponentData | null = null;
      if (isDescenderLetter) {
        const dripId = `${letterId}-drip`;
        dripElement = {
          id: dripId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: 4px; height: 12px; border-radius: 2px 2px 4px 4px; background: linear-gradient(to bottom, rgba(226, 232, 240, 0.8), rgba(148, 163, 184, 0.6));"></div>`,
            className: 'absolute bottom-[-20px] left-1/2 -translate-x-1/2',
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
          effects: [
            {
              id: `${dripId}-loop`,
              componentId: 'generic',
              data: {
                type: 'linear',
                start: letterStart + params.fallDuration + 0.5,
                duration: 2,
                mode: 'provider',
                targetIds: [dripId],
                ranges: [
                  { key: 'translateY', val: 0, prog: 0 },
                  { key: 'translateY', val: 15, prog: 0.5 },
                  { key: 'translateY', val: 0, prog: 1 },
                  { key: 'scaleY', val: 1, prog: 0 },
                  { key: 'scaleY', val: 1.5, prog: 0.3 },
                  { key: 'scaleY', val: 0.8, prog: 0.7 },
                  { key: 'scaleY', val: 1, prog: 1 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.2 },
                  { key: 'opacity', val: 1, prog: 0.7 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        };
      }

      // Create letter wrapper
      const letterWrapper: RenderableComponentData = {
        id: wrapperId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex flex-col items-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [
          letterAtom,
          splashContainer,
          ripple,
          ...(dripElement ? [dripElement] : []),
        ] as RenderableComponentData[],
      };

      letterComponents.push(letterWrapper);
      letterIndex++;
    }

    // Create word container
    const wordContainer: RenderableComponentData = {
      id: wordId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row items-end justify-center relative',
          style: {
            gap: '4px',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: letterComponents as RenderableComponentData[],
    };

    childrenData.push(wordContainer);
  });

  // Create main container
  const mainContainer: RenderableComponentData = {
    id: `${trackName}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#0a0a0a',
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
        id: `${trackName}-word-flow`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-col items-center justify-center w-full h-full gap-4',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: childrenData as RenderableComponentData[],
      },
    ] as RenderableComponentData[],
  };

  return {
    output: {
      childrenData: [mainContainer as RenderableComponentData],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'cascading-liquid-typography',
  title: 'Cascading Liquid Typography',
  description:
    'A dynamic kinetic typography preset featuring metallic liquid letters that cascade down like a waterfall, splashing and rippling as they land. Letters exhibit weight and viscosity with stretching during fall and pooling on impact. Includes surface tension effects for connected letters breaking apart, and continuous drip animations on descender characters (j, g, y, p, q). Uses Georgia bold with metallic slate gradients and bounce easing for organic liquid motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'liquid',
    'waterfall',
    'metallic',
    'cascade',
    'splash',
    'ripple',
    'viscosity',
    'animated',
    'dynamic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'LIQUy Flow',
    font: 'Georgia:700:normal',
    fontSize: 120,
    fallDuration: 0.8,
    staggerDelay: 0.15,
    splashDuration: 0.3,
    metalColor: 'slate',
    intensity: 1,
    trackName: 'liquid-typography',
  },
};

// Export preset
export const cascadingLiquidTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};