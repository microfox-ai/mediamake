/**
 * Liquid Lens Focus Effect Preset
 *
 * Creates a fluid underwater text animation where text appears submerged with turbulent blur,
 * slowly rising through refractive distortion as it breaks the surface tension. Features organic
 * water droplet effects that roll off letters, revealing sharp text underneath, with bubbles rising
 * past the text. Creates a dreamy, meditative atmosphere perfect for wellness brands and aquatic
 * themes using sine-wave easing for natural water movement.
 *
 * Features:
 * - Text appears submerged underwater with SVG turbulence filter for ripple effect
 * - Gradual clarity improvement as text "rises" to surface (blur 15px → 0px, scale 0.95 → 1.0)
 * - Organic water droplet effects that roll off letters during surface-breaking phase
 * - Rising bubbles that create secondary animation
 * - Refractive quality with wave distortions and surface tension breaking
 * - Sine-wave easing for natural, undulating water movement
 * - Duration: 3-4 seconds for full effect cycle
 *
 * Use cases:
 * - Wellness and meditation content
 * - Aquatic-themed videos
 * - Spa and relaxation content
 * - Dreamy, ethereal atmospheres
 * - Nature and water-based narratives
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to display with liquid lens effect'),
  duration: z
    .number()
    .min(2)
    .max(10)
    .default(3.5)
    .describe('Total duration of the effect in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(300)
    .default(72)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto", "Montserrat")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  backgroundGradient: z
    .string()
    .default('linear-gradient(180deg, #1a4d5e 0%, #2d7a8e 50%, #4aa8c0 100%)')
    .describe('Background gradient for underwater effect'),
  bubbleCount: z
    .number()
    .min(0)
    .max(10)
    .default(5)
    .describe('Number of rising bubbles'),
  dropletCount: z
    .number()
    .min(0)
    .max(8)
    .default(4)
    .describe('Number of water droplets'),
  turbulenceIntensity: z
    .number()
    .min(0.001)
    .max(0.1)
    .default(0.02)
    .describe('Intensity of water turbulence/ripple effect'),
  maxBlur: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Maximum blur amount in pixels (starting blur)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    backgroundGradient,
    bubbleCount,
    dropletCount,
    turbulenceIntensity,
    maxBlur,
  } = params;

  // Helper: Generate unique IDs
  const generateId = (base: string, index?: number): string => {
    return index !== undefined ? `${base}-${index}` : base;
  };

  // Helper: Create bubble HTML
  const createBubbleHTML = (size: number): string => {
    return `<div style='width: ${size}px; height: ${size}px; background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.2)); border-radius: 50%; box-shadow: inset 0 -2px 4px rgba(0, 0, 0, 0.2);'></div>`;
  };

  // Helper: Create droplet HTML
  const createDropletHTML = (width: number, height: number): string => {
    return `<div style='width: ${width}px; height: ${height}px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(200, 230, 255, 0.6)); border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);'></div>`;
  };

  // Phase timings
  const blurPhaseEnd = duration * 0.35; // First 35% for blur reduction
  const surfaceBreakStart = duration * 0.57; // Surface breaking at 57%
  const dropletsStart = surfaceBreakStart; // Droplets start when breaking surface

  // Create bubbles
  const bubbles: RenderableComponentData[] = [];
  for (let i = 0; i < bubbleCount; i++) {
    const size = 15 + Math.random() * 10; // 15-25px
    const leftPosition = 20 + Math.random() * 70; // 20-90% horizontal spread
    const bubbleStartTime = i * (duration / (bubbleCount + 2)); // Stagger starts
    const bubbleDuration = duration - bubbleStartTime;

    bubbles.push({
      id: generateId('bubble', i),
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: createBubbleHTML(size),
        className: 'absolute',
        style: {
          left: `${leftPosition}%`,
          bottom: '-30px',
        },
      },
      context: {
        timing: {
          start: bubbleStartTime,
          duration: bubbleDuration,
        },
      },
      effects: [
        {
          id: generateId('bubble-rise', i),
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: bubbleDuration,
            mode: 'provider',
            targetIds: [generateId('bubble', i)],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -1200, prog: 1 },
              { key: 'opacity', val: 0.8, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.9 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create droplets
  const droplets: RenderableComponentData[] = [];
  for (let i = 0; i < dropletCount; i++) {
    const width = 7 + Math.random() * 4; // 7-11px
    const height = width * 1.4; // Droplet shape
    const leftPosition = 40 + Math.random() * 20; // 40-60% center area
    const topPosition = 42 + Math.random() * 16; // 42-58% vertical spread
    const dropletStartTime = i * 0.15; // Stagger by 150ms
    const dropletDuration = 1.5 - dropletStartTime; // Shorter durations for later droplets

    droplets.push({
      id: generateId('droplet', i),
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: createDropletHTML(width, height),
        className: 'absolute',
        style: {
          left: `${leftPosition}%`,
          top: `${topPosition}%`,
        },
      },
      context: {
        timing: {
          start: dropletStartTime,
          duration: dropletDuration,
        },
      },
      effects: [
        {
          id: generateId('droplet-fall', i),
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: dropletDuration,
            mode: 'provider',
            targetIds: [generateId('droplet', i)],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: 100, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Text atom ID
  const textId = 'liquid-lens-text';

  // Text component with effects
  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight,
        color: textColor,
        textAlign: 'center',
        textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Blur reduction effect (15px → 0px over first 35%)
      {
        id: 'blur-reduction',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: blurPhaseEnd,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      // Scale effect (0.95 → 1.0 over first 35%)
      {
        id: 'scale-up',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: blurPhaseEnd,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 1.0, prog: 1 },
          ],
        },
      },
      // Opacity fade in (0 → 1 over 23-71%)
      {
        id: 'opacity-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: duration * 0.23,
          duration: duration * 0.48,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // SVG filter for turbulence (water ripple effect)
  const svgFilterId = 'liquid-turbulence-filter';
  const svgFilterHTML = `
    <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
      <defs>
        <filter id="${svgFilterId}" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="${turbulenceIntensity} ${turbulenceIntensity * 1.5}" 
            numOctaves="3" 
            result="turbulence">
            <animate 
              attributeName="baseFrequency" 
              from="${turbulenceIntensity} ${turbulenceIntensity * 1.5}" 
              to="${turbulenceIntensity * 0.5} ${turbulenceIntensity * 0.75}" 
              dur="${duration}s" 
              repeatCount="1" />
          </feTurbulence>
          <feDisplacementMap 
            in="SourceGraphic" 
            in2="turbulence" 
            scale="10" 
            xChannelSelector="R" 
            yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  `;

  const svgFilterComponent: RenderableComponentData = {
    id: 'svg-filter-defs',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: svgFilterHTML,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Layers structure
  const backgroundLayer: RenderableComponentData = {
    id: 'background-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          background: backgroundGradient,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
  };

  const textLayer: RenderableComponentData = {
    id: 'text-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          filter: `url(#${svgFilterId})`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textComponent],
  };

  const bubblesLayer: RenderableComponentData = {
    id: 'bubbles-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: bubbles,
  };

  const dropletsLayer: RenderableComponentData = {
    id: 'droplets-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: dropletsStart,
        duration: duration - dropletsStart,
      },
    },
    childrenData: droplets,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-lens-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      svgFilterComponent,
      backgroundLayer,
      textLayer,
      bubblesLayer,
      dropletsLayer,
    ],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'liquid-lens-text-focus',
  title: 'Liquid Lens Focus Effect',
  description:
    'A fluid text animation where text appears submerged underwater with turbulent blur, slowly rising through refractive distortion as it breaks the surface tension. Features organic water droplet effects that roll off letters, revealing sharp text underneath, with bubbles rising past the text. Creates a dreamy, meditative atmosphere perfect for wellness brands and aquatic themes using sine-wave easing for natural water movement.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'liquid',
    'water',
    'underwater',
    'blur',
    'focus',
    'surface',
    'bubbles',
    'droplets',
    'wellness',
    'meditation',
    'dreamy',
    'aquatic',
    'organic',
    'fluid',
    'ripple',
    'turbulence',
  ],
  defaultInputParams: {
    text: 'Liquid Clarity',
    duration: 3.5,
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#ffffff',
    backgroundGradient:
      'linear-gradient(180deg, #1a4d5e 0%, #2d7a8e 50%, #4aa8c0 100%)',
    bubbleCount: 5,
    dropletCount: 4,
    turbulenceIntensity: 0.02,
    maxBlur: 15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const liquidLensTextFocusPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
