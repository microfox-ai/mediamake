/**
 * Swiss Grid Typography System Preset
 * 
 * A Swiss design-inspired typography system where text elements slide into position along
 * an invisible grid. Features mathematical timing progression, directional entry animations
 * based on grid position, and subtle grid-reveal effects that create an architectural,
 * blueprint-like aesthetic.
 * 
 * Features:
 * - 12-column CSS Grid system with precise positioning
 * - Pathfinding animations: text slides from off-grid positions to final grid locations
 * - Directional entry vectors: top rows enter from above, left columns from left
 * - Mathematical timing: delay = gridRow * 50ms + gridCol * 30ms
 * - Magnetic snapping effect with subtle overshoot
 * - Grid-reveal: borders fade in during text entry
 * - Helvetica Neue light typography with uppercase headers
 * - Multi-column layouts with visual harmony
 * 
 * Use cases:
 * - Architectural presentation titles
 * - Blueprint-style reveal animations
 * - Swiss design-inspired layouts
 * - Structured, mathematical typography systems
 * - Technical documentation overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(10)
    .describe('Total duration of the preset in seconds'),
  
  headerFont: z
    .string()
    .default('Helvetica:300')
    .describe('Header font (family:weight format, e.g., "Helvetica:300")'),
  
  bodyFont: z
    .string()
    .default('sans-serif')
    .describe('Body text font family'),
  
  headerText1: z
    .string()
    .default('PRECISION')
    .describe('First header text (uppercase recommended)'),
  
  headerText2: z
    .string()
    .default('ARCHITECTURE')
    .describe('Second header text (uppercase recommended)'),
  
  bodyText1: z
    .string()
    .default('Structured layout systems')
    .describe('First body text'),
  
  bodyText2: z
    .string()
    .default('Mathematical precision')
    .describe('Second body text'),
  
  bodyText3: z
    .string()
    .default('Visual harmony')
    .describe('Third body text'),
  
  headerFontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .describe('Header text font size in pixels'),
  
  bodyFontSize: z
    .number()
    .min(12)
    .max(48)
    .default(18)
    .describe('Body text font size in pixels'),
  
  gridRevealDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of grid line reveal animation in seconds'),
  
  textSlideDuration: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.2)
    .describe('Duration of text slide-in animation in seconds'),
  
  headerColor: z
    .string()
    .default('#000000')
    .describe('Header text color (CSS color)'),
  
  bodyColor: z
    .string()
    .default('#4B5563')
    .describe('Body text color (CSS color)'),
  
  gridLineColor: z
    .string()
    .default('rgba(0, 0, 0, 0.1)')
    .describe('Grid line color with opacity'),
  
  backgroundColor: z
    .string()
    .default('#FFFFFF')
    .describe('Background color of the preset'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string for headers
  const parseFont = (fontString: string) => {
    const parts = fontString.split(':');
    return {
      family: parts[0] || 'Helvetica',
      weight: parts[1] || '300',
    };
  };

  const headerFont = parseFont(params.headerFont);
  const bodyFont = { family: params.bodyFont, weight: 'normal' };

  // Calculate grid positions and timing for each text element
  // Headers: row 1, columns 1-5 and 7-12
  // Body texts: row 2, columns 1-4, 5-8, 9-12
  
  const textElements = [
    {
      id: 'header-text-1',
      text: params.headerText1,
      gridRow: 1,
      gridCol: 1,
      colSpan: 5,
      colStart: 1,
      isHeader: true,
    },
    {
      id: 'header-text-2',
      text: params.headerText2,
      gridRow: 1,
      gridCol: 7,
      colSpan: 6,
      colStart: 7,
      isHeader: true,
    },
    {
      id: 'body-text-1',
      text: params.bodyText1,
      gridRow: 2,
      gridCol: 1,
      colSpan: 4,
      colStart: 1,
      isHeader: false,
    },
    {
      id: 'body-text-2',
      text: params.bodyText2,
      gridRow: 2,
      gridCol: 5,
      colSpan: 4,
      colStart: 5,
      isHeader: false,
    },
    {
      id: 'body-text-3',
      text: params.bodyText3,
      gridRow: 2,
      gridCol: 9,
      colSpan: 4,
      colStart: 9,
      isHeader: false,
    },
  ];

  // Calculate animation timing based on grid position
  const calculateTiming = (row: number, col: number) => {
    const baseDelay = (row - 1) * 0.05 + (col - 1) * 0.03; // Mathematical progression
    return Math.min(baseDelay, params.duration * 0.5); // Cap at 50% of duration
  };

  // Calculate entry direction based on grid position
  const calculateEntryVector = (row: number, col: number) => {
    // Top rows enter from above, left columns from left
    const translateY = row === 1 ? -100 : 0;
    const translateX = col <= 6 ? -100 : 0;
    return { translateX, translateY };
  };

  // Create text elements with slide-in effects
  const textComponents = textElements.map((element) => {
    const entryVector = calculateEntryVector(element.gridRow, element.gridCol);
    const delay = calculateTiming(element.gridRow, element.gridCol);
    
    const font = element.isHeader ? headerFont : bodyFont;
    const fontSize = element.isHeader ? params.headerFontSize : params.bodyFontSize;
    const color = element.isHeader ? params.headerColor : params.bodyColor;

    // Slide-in effect with magnetic snapping
    const slideEffect: GenericEffectData = {
      type: 'spring', // Cubic bezier approximated with spring
      start: delay,
      duration: params.textSlideDuration,
      mode: 'provider',
      targetIds: [element.id],
      ranges: [
        // Translate from off-grid position
        ...(entryVector.translateX !== 0 ? [
          { key: 'translateX', val: entryVector.translateX, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
        ] : []),
        ...(entryVector.translateY !== 0 ? [
          { key: 'translateY', val: entryVector.translateY, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ] : []),
        // Fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.6 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    const textComponent: RenderableComponentData = {
      id: element.id,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: element.text,
        className: `${element.isHeader ? 'tracking-wide uppercase' : ''} col-span-${element.colSpan} col-start-${element.colStart}`,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: font.weight,
          color: color,
          gridRow: element.gridRow,
        },
        font: {
          family: font.family,
          weights: [font.weight],
          subsets: ['latin'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: `slide-effect-${element.id}`,
          componentId: 'generic',
          data: slideEffect,
        },
      ],
    };

    return textComponent;
  });

  // Grid line reveal effects (subtle border opacity)
  const gridRevealEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: params.gridRevealDuration,
    mode: 'provider',
    targetIds: ['grid-container'],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 0.3, prog: 1 },
    ],
  };

  // Grid lines container (invisible but reveals during animation)
  const gridLinesContainer: RenderableComponentData = {
    id: 'grid-lines-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      {
        id: 'grid-container',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `
            <div style="
              display: grid;
              grid-template-columns: repeat(12, 1fr);
              gap: 1rem;
              height: 100%;
              padding: 2rem;
            ">
              ${Array(12).fill(0).map((_, i) => `
                <div style="
                  border-left: 1px solid ${params.gridLineColor};
                  height: 100%;
                  opacity: 0;
                "></div>
              `).join('')}
            </div>
          `,
          className: 'absolute inset-0',
          style: {},
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          {
            id: 'grid-reveal-effect',
            componentId: 'generic',
            data: gridRevealEffect,
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Root container with CSS Grid
  const rootContainer: RenderableComponentData = {
    id: 'swiss-grid-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'grid grid-cols-12 gap-4 p-8 absolute inset-0',
        style: {
          backgroundColor: params.backgroundColor,
          gridAutoRows: 'min-content',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      gridLinesContainer,
      ...textComponents,
    ] as RenderableComponentData[],
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
  id: 'swiss-grid-typography',
  title: 'Swiss Grid Typography System',
  description:
    'A Swiss design-inspired typography preset where text elements slide into position along an invisible grid system. Features mathematical timing progression, directional entry animations based on grid position, and subtle grid-reveal effects that create an architectural, blueprint-like aesthetic. Supports multi-column layouts with configurable grid positioning and magnetic snapping animations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'swiss-design',
    'grid',
    'architecture',
    'blueprint',
    'mathematical',
    'structured',
    'layout',
    'text',
    'animated',
  ],
  dependencies: {},
  defaultInputParams: {
    duration: 10,
    headerFont: 'Helvetica:300',
    bodyFont: 'sans-serif',
    headerText1: 'PRECISION',
    headerText2: 'ARCHITECTURE',
    bodyText1: 'Structured layout systems',
    bodyText2: 'Mathematical precision',
    bodyText3: 'Visual harmony',
    headerFontSize: 48,
    bodyFontSize: 18,
    gridRevealDuration: 0.8,
    textSlideDuration: 1.2,
    headerColor: '#000000',
    bodyColor: '#4B5563',
    gridLineColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: '#FFFFFF',
  },
};

// Export preset
export const swissGridTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
