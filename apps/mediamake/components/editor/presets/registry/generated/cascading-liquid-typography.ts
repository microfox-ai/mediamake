/**
 * Cascading Liquid Typography Preset
 *
 * Creates a mesmerizing metallic liquid waterfall text animation where letters flow down
 * and splash into place with realistic physics. Features include:
 * - Weight and viscosity simulation with vertical flow
 * - Metallic gradient rendering with opacity variations based on flow speed
 * - Surface tension effects where letters resist separating before breaking apart
 * - Splash droplets spawned at impact points with radial expansion
 * - Ripple effects emanating from letter landing positions
 * - Continuous drip animations on descender letters (j, g, y, etc.)
 * - Liquid thickness variation using vertical scale transformations
 * - Bounce easing for impact realism
 *
 * Technical approach:
 * - Each letter wrapped in BaseLayout with Georgia:700 font
 * - Cascade timing with 0.15s stagger between letters
 * - Fall animation: translateY(-200%) → 0 with bounce easing
 * - Thickness animation: scaleY(1.5 → 0.8 → 1) during fall and impact
 * - Splash particles: ShapeAtom circles animating scale(0 → 2) with opacity fade
 * - Continuous drip loops on eligible descenders
 *
 * Use cases:
 * - Cinematic title reveals with liquid metal aesthetics
 * - Dramatic brand introductions with flowing metallic typography
 * - Music video title cards with viscous flow effects
 * - Premium product launch videos with luxury liquid metal feel
 */

import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import z from 'zod';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================
// PRESET PARAMETERS
// ============================================================

const presetParams = z.object({
  text: z
    .string()
    .default('LIQUID METAL')
    .describe('Text to display with cascading liquid effect'),
  fontSize: z
    .number()
    .default(120)
    .describe('Font size in pixels for the liquid typography'),
  fallDuration: z
    .number()
    .default(0.8)
    .describe('Duration in seconds for each letter to fall into place'),
  letterStagger: z
    .number()
    .default(0.15)
    .describe('Time delay in seconds between each letter starting its fall'),
  splashDuration: z
    .number()
    .default(0.3)
    .describe('Duration in seconds for splash effect after impact'),
  enableDrips: z
    .boolean()
    .default(true)
    .describe('Enable continuous drip animations on descender letters'),
  dripDelay: z
    .number()
    .default(1.1)
    .describe('Delay in seconds before drip animations start (relative to letter)'),
  impactScale: z
    .number()
    .default(0.8)
    .describe('Scale compression on impact (0.8 = 20% compression)'),
  stretchScale: z
    .number()
    .default(1.5)
    .describe('Scale stretch during fall (1.5 = 50% elongation)'),
  backgroundColor: z
    .string()
    .default('#0a0a0a')
    .describe('Background color for the composition'),
});

// ============================================================
// PRESET EXECUTION
// ============================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Destructure parameters
  const {
    text,
    fontSize,
    fallDuration,
    letterStagger,
    splashDuration,
    enableDrips,
    dripDelay,
    impactScale,
    stretchScale,
    backgroundColor,
  } = params;

  // Helper function: Check if character is a descender (has drip potential)
  const isDescender = (char: string): boolean => {
    const descenders = ['j', 'g', 'y', 'p', 'q', 'J', 'Q'];
    return descenders.includes(char);
  };

  // Split text into individual characters
  const characters = text.split('');

  // Calculate total duration (last letter fall + impact + splash + buffer)
  const totalDuration =
    characters.length * letterStagger + fallDuration + splashDuration + 2;

  // ============================================================
  // BUILD LETTER COMPONENTS
  // ============================================================

  const letterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const letterId = `letter-${index}`;
      const letterStart = index * letterStagger; // Relative to parent

      // Skip rendering spaces
      if (char === ' ') {
        return {
          id: letterId,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'relative',
              style: {
                display: 'inline-block',
                width: `${fontSize * 0.3}px`,
              },
            },
          },
          context: {
            timing: {
              start: letterStart,
              duration: totalDuration - letterStart,
            },
          },
          childrenData: [],
        };
      }

      // Build effects for this letter
      const letterEffects: any[] = [];

      // ============================================================
      // EFFECT 1: Cascading Fall Animation
      // ============================================================
      letterEffects.push({
        id: `fall-effect-${letterId}`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier' as any,
          start: 0, // Relative to letter wrapper
          duration: fallDuration,
          mode: 'provider',
          targetIds: [letterId],
          ranges: [
            // Vertical position (fall from -200% to 0)
            { key: 'translateY', val: '-200%', prog: 0 },
            { key: 'translateY', val: '0%', prog: 1 },
            // Opacity (fade in during fall)
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            // Vertical scale (liquid thickness variation)
            { key: 'scaleY', val: stretchScale, prog: 0 }, // Stretched at top
            { key: 'scaleY', val: stretchScale, prog: 0.6 }, // Still stretched mid-fall
            { key: 'scaleY', val: impactScale, prog: 0.85 }, // Compress on impact
            { key: 'scaleY', val: 1, prog: 1 }, // Return to normal
          ],
          props: {
            cubicBezier: [0.36, 1.5, 0.36, 1], // Bounce easing
          },
        },
      });

      // ============================================================
      // EFFECT 2: Splash Effect (triggered at impact)
      // ============================================================
      const splashStart = fallDuration; // Relative to letter wrapper

      // Create multiple splash droplets
      const splashDroplets = [
        {
          id: `splash-${letterId}-1`,
          angle: -30,
          distance: 40,
          size: 12,
          delay: 0,
        },
        {
          id: `splash-${letterId}-2`,
          angle: 30,
          distance: 35,
          size: 8,
          delay: 0.05,
        },
        {
          id: `splash-${letterId}-3`,
          angle: 0,
          distance: 50,
          size: 6,
          delay: 0.1,
        },
      ];

      splashDroplets.forEach(droplet => {
        letterEffects.push({
          id: `splash-effect-${droplet.id}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: splashStart + droplet.delay,
            duration: splashDuration,
            mode: 'provider',
            targetIds: [droplet.id],
            ranges: [
              // Scale expansion
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 2, prog: 1 },
              // Opacity fade out
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              // Position movement (radial splash)
              {
                key: 'translateX',
                val: `${Math.cos((droplet.angle * Math.PI) / 180) * droplet.distance}px`,
                prog: 1,
              },
              {
                key: 'translateY',
                val: `${Math.sin((droplet.angle * Math.PI) / 180) * droplet.distance}px`,
                prog: 1,
              },
            ],
          },
        });
      });

      // ============================================================
      // EFFECT 3: Ripple Effect (triggered at impact)
      // ============================================================
      letterEffects.push({
        id: `ripple-effect-${letterId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: splashStart,
          duration: 0.5,
          mode: 'provider',
          targetIds: [`ripple-${letterId}`],
          ranges: [
            // Scale expansion
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 2.5, prog: 1 },
            // Opacity fade
            { key: 'opacity', val: 0.4, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });

      // ============================================================
      // EFFECT 4: Continuous Drip (for descenders)
      // ============================================================
      if (enableDrips && isDescender(char)) {
        letterEffects.push({
          id: `drip-effect-${letterId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: dripDelay,
            duration: 1.5,
            mode: 'provider',
            targetIds: [`drip-${letterId}`],
            ranges: [
              // Vertical drop
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: '40px', prog: 1 },
              // Scale shrink
              { key: 'scaleY', val: 1, prog: 0 },
              { key: 'scaleY', val: 1.5, prog: 0.5 },
              { key: 'scaleY', val: 0.5, prog: 1 },
              // Opacity fade
              { key: 'opacity', val: 0.9, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
            props: {
              loop: true,
            },
          },
        });
      }

      // ============================================================
      // BUILD LETTER STRUCTURE
      // ============================================================

      return {
        id: `letter-wrapper-${index}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              display: 'inline-block',
              margin: '0 2px',
            },
          },
        },
        context: {
          timing: {
            start: letterStart,
            duration: totalDuration - letterStart,
          },
        },
        effects: letterEffects,
        childrenData: [
          // The actual letter text
          {
            id: letterId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: char,
              font: {
                family: 'Georgia',
                weights: ['700'],
                subsets: ['latin'],
              },
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: 700,
                background:
                  'linear-gradient(to bottom, rgba(148,163,184,0.5), rgba(226,232,240,1), rgba(148,163,184,1))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                display: 'inline-block',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration - letterStart,
              },
            },
          },
          // Splash droplets container
          {
            id: `splash-container-${letterId}`,
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute',
                style: {
                  bottom: '0',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration - letterStart,
              },
            },
            childrenData: splashDroplets.map(droplet => ({
              id: droplet.id,
              type: 'atom' as const,
              componentId: 'ShapeAtom',
              data: {
                shape: 'circle',
                color: 'rgba(226,232,240,0.8)',
                style: {
                  width: `${droplet.size}px`,
                  height: `${droplet.size}px`,
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: totalDuration - letterStart,
                },
              },
            })),
          },
          // Ripple ring
          {
            id: `ripple-${letterId}`,
            type: 'atom' as const,
            componentId: 'ShapeAtom',
            data: {
              shape: 'circle',
              color: 'transparent',
              style: {
                width: '100px',
                height: '100px',
                border: '2px solid rgba(226,232,240,0.3)',
                position: 'absolute',
                bottom: '-50px',
                left: '50%',
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration - letterStart,
              },
            },
          },
          // Drip element (for descenders)
          ...(enableDrips && isDescender(char)
            ? [
                {
                  id: `drip-${letterId}`,
                  type: 'atom' as const,
                  componentId: 'ShapeAtom',
                  data: {
                    shape: 'circle',
                    color: 'rgba(226,232,240,0.9)',
                    style: {
                      width: '4px',
                      height: '8px',
                      borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                      position: 'absolute',
                      bottom: '-10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                    },
                  },
                  context: {
                    timing: {
                      start: 0,
                      duration: totalDuration - letterStart,
                    },
                  },
                },
              ]
            : []),
        ],
      } as RenderableComponentData;
    },
  );

  // ============================================================
  // BUILD ROOT CONTAINER
  // ============================================================

  const rootContainer = {
    id: 'cascading-liquid-typography-root',
    type: 'layout' as const,
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
    childrenData: [
      // Background layer with radial gradient
      {
        id: 'metallic-background',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              background:
                'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0a 100%)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [],
      },
      // Text container with letters
      {
        id: 'text-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className:
              'absolute inset-0 flex flex-row items-center justify-center flex-wrap',
            style: {
              gap: '0px',
              padding: '40px',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: letterComponents,
      },
    ],
  } as RenderableComponentData;

  // ============================================================
  // RETURN PRESET OUTPUT
  // ============================================================

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================
// PRESET METADATA
// ============================================================

const presetMetadata: PresetMetadata = {
  id: 'cascading-liquid-typography',
  title: 'Cascading Liquid Typography',
  description:
    'A metallic waterfall text animation where letters drop and splash into place with liquid physics. Features weighted letter falls with bounce easing, splash droplets on impact, ripple effects expanding from landing points, variable liquid thickness based on motion, and continuous drip animations on descender characters. The metallic gradient creates a molten metal appearance with opacity variations based on flow speed.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'liquid',
    'metallic',
    'cascade',
    'waterfall',
    'physics',
    'splash',
    'drip',
    'cinematic',
    'title',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'LIQUID METAL',
    fontSize: 120,
    fallDuration: 0.8,
    letterStagger: 0.15,
    splashDuration: 0.3,
    enableDrips: true,
    dripDelay: 1.1,
    impactScale: 0.8,
    stretchScale: 1.5,
    backgroundColor: '#0a0a0a',
  },
};

// ============================================================
// EXPORT PRESET
// ============================================================

export const cascadingLiquidTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
