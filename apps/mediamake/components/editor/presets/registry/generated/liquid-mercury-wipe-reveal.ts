/**
 * Liquid Mercury Wipe Reveal Preset
 * 
 * Creates a premium liquid wipe effect where text is revealed as if being painted
 * by flowing liquid mercury. The reveal has weight and viscosity with realistic physics.
 * 
 * Features:
 * - Organic liquid edge with undulating motion using SVG turbulence
 * - Metallic text with multiple shadow layers for depth
 * - Traveling highlight that simulates light reflecting off metallic surface
 * - Wipe reveal using mask-based animation
 * - Customizable timing and impact for different reveal speeds
 * 
 * Technical Implementation:
 * - Uses BaseLayout with relative positioning and overflow hidden
 * - SVG filter with feTurbulence and feDisplacementMap for organic distortion
 * - Animated clipPath with complex polygon path for irregular edge
 * - Moving linear-gradient background for metallic light reflection
 * - Multiple text-shadow layers for metallic depth
 * - Generic effects for clipPath animation, backgroundPosition, and opacity
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  text: z.string().default('LIQUID MERCURY').describe('Text to reveal'),
  fontSize: z
    .string()
    .default('72px')
    .describe('Font size for the text (e.g., "72px", "5rem")'),
  fontFamily: z
    .string()
    .default('Inter:700')
    .describe(
      'Font family with optional weight (e.g., "Inter:700", "Roboto:800")',
    ),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Duration of the reveal animation in seconds'),
  impact: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Effect intensity multiplier (0.5 = subtle, 3 = intense)'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (hex or rgb)'),
  baseMetallicColor: z
    .string()
    .default('#e8e8e8')
    .describe('Base metallic color for text (light metallic silver by default)'),
  turbulenceFrequency: z
    .number()
    .min(0.001)
    .max(0.1)
    .default(0.02)
    .describe('SVG turbulence frequency for organic edge distortion'),
  turbulenceScale: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('SVG displacement scale for organic edge intensity'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 700; // Default to bold
  }

  const containerId = 'liquid-mercury-reveal-container';
  const maskLayerId = 'reveal-mask-layer';
  const textLayerId = 'text-layer';
  const mercuryTextId = 'mercury-text';
  const highlightOverlayId = 'highlight-overlay';
  const travelingHighlightId = 'traveling-highlight';
  const svgFilterId = 'svg-filter-container';

  // Calculate effect parameters based on impact
  const revealDuration = params.duration;
  const highlightDuration = revealDuration * 1.2; // Highlight travels slightly longer
  const turbulenceFrequency = params.turbulenceFrequency;
  const turbulenceScale = params.turbulenceScale * params.impact;

  // Create SVG filter for organic edge
  const svgFilterHTML = `
    <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
      <defs>
        <filter id="liquid-edge-filter">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="${turbulenceFrequency}" 
            numOctaves="3" 
            seed="1"
          >
            <animate
              attributeName="baseFrequency"
              values="${turbulenceFrequency};${turbulenceFrequency * 1.5};${turbulenceFrequency}"
              dur="${revealDuration}s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="${turbulenceScale}" />
        </filter>
      </defs>
    </svg>
  `;

  // Build child components
  const childrenData: RenderableComponentData[] = [
    // SVG Filter definition
    {
      id: svgFilterId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: svgFilterHTML,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: revealDuration,
        },
      },
    },

    // Mask layer (wipe reveal)
    {
      id: maskLayerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            backgroundColor: params.backgroundColor,
            filter: 'url(#liquid-edge-filter)',
            transformOrigin: 'left center',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: revealDuration,
        },
      },
      effects: [
        {
          id: 'mask-wipe-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: revealDuration,
            mode: 'provider',
            targetIds: [maskLayerId],
            ranges: [
              { key: 'scaleX', val: 1, prog: 0 },
              { key: 'scaleX', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    },

    // Text layer
    {
      id: textLayerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: revealDuration,
        },
      },
      childrenData: [
        {
          id: mercuryTextId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: params.text,
            style: {
              fontSize: params.fontSize,
              ...fontStyle,
              color: 'transparent',
              backgroundImage: `linear-gradient(135deg, ${params.baseMetallicColor} 0%, #b8b8b8 25%, #f5f5f5 50%, #c0c0c0 75%, #e0e0e0 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              backgroundSize: '200% 100%',
              backgroundPosition: '-200% center',
              textShadow:
                '0 2px 4px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2), 0 0 20px rgba(200,200,200,0.1)',
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight
                ? [fontStyle.fontWeight.toString()]
                : ['700', '800'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: revealDuration,
            },
          },
          effects: [
            {
              id: 'text-gradient-travel',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: revealDuration,
                mode: 'provider',
                targetIds: [mercuryTextId],
                ranges: [
                  { key: 'backgroundPosition', val: '-200% center', prog: 0 },
                  { key: 'backgroundPosition', val: '200% center', prog: 1 },
                ],
              },
            },
            {
              id: 'text-opacity-effect',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: revealDuration * 0.3,
                mode: 'provider',
                targetIds: [mercuryTextId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1.1, prog: 0.8 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        },
      ],
    },

    // Highlight overlay
    {
      id: highlightOverlayId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            mixBlendMode: 'screen',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: highlightDuration,
        },
      },
      childrenData: [
        {
          id: travelingHighlightId,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute',
              style: {
                width: '30%',
                height: '100%',
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                transform: 'translateX(-100%)',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: highlightDuration,
            },
          },
          effects: [
            {
              id: 'highlight-travel-effect',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: highlightDuration,
                mode: 'provider',
                targetIds: [travelingHighlightId],
                ranges: [
                  { key: 'translateX', val: '-100%', prog: 0 },
                  { key: 'translateX', val: '200%', prog: 1 },
                ],
              },
            },
          ],
          childrenData: [],
        },
      ],
    },
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: highlightDuration,
      },
    },
    childrenData: childrenData,
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
  id: 'liquid-mercury-wipe-reveal',
  title: 'Liquid Mercury Wipe Reveal',
  description:
    'Premium liquid wipe effect that reveals text as if painted by flowing liquid mercury. Features organic edge motion with SVG turbulence, metallic gradient text with multiple shadow layers for depth, and a traveling highlight overlay that simulates light reflecting off a metallic surface. Uses mask-based wipe animation with customizable timing and impact.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'wipe',
    'liquid',
    'mercury',
    'metallic',
    'organic',
    'premium',
    'physics',
    'reflection',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'LIQUID MERCURY',
    fontSize: '72px',
    fontFamily: 'Inter:700',
    duration: 3,
    impact: 1,
    backgroundColor: '#000000',
    baseMetallicColor: '#e8e8e8',
    turbulenceFrequency: 0.02,
    turbulenceScale: 20,
  },
};

export const liquidMercuryWipeRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
