/**
 * Hierarchy Breakdown Typokinetic Preset
 *
 * This preset creates a cascading drill-down animation visualizing data hierarchy 
 * as nested text boxes that expand on interaction. The first word of the caption 
 * becomes the parent category (centered, large, bold), while remaining words become 
 * child categories arranged below in smaller text.
 *
 * Features:
 * - **Parent-Child Hierarchy**: First word as parent (bold 700), remaining as children (weight 400)
 * - **Drill-Down Animation**: Parent zooms to fill frame while children slide up
 * - **Accordion Expansion**: Vertical stacking with words restacking during animation
 * - **Connecting Lines**: Animated lines between parent and children nodes
 * - **Visual Metaphor**: Org-chart or tree-map navigation through text alone
 *
 * Use cases:
 * - Visualizing organizational structures
 * - Displaying categorized information
 * - Creating hierarchical text animations
 * - Building tree-map style visualizations
 */

import z from 'zod';
import { 
  PresetMetadata, 
  PresetOutput, 
  PresetPassedProps,
  TranscriptionSentence 
} from '../../types';
import { 
  GenericEffectData,
  RenderableComponentData 
} from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  captions: z.array(
    z.object({
      text: z.string().describe('Full caption text'),
      absoluteStart: z.number().describe('Absolute start time in seconds'),
      duration: z.number().describe('Duration in seconds'),
      words: z.array(
        z.object({
          text: z.string().describe('Word text'),
          start: z.number().describe('Start time relative to caption'),
          duration: z.number().describe('Word duration'),
        })
      ).optional().describe('Array of word objects (optional)'),
    })
  ).describe('Array of captions with hierarchical word structure'),
  
  parentFontSize: z.number()
    .default(60)
    .describe('Font size for parent words in pixels'),
  
  childFontSize: z.number()
    .default(24)
    .describe('Font size for child words in pixels'),
  
  font: z.string()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  textColor: z.string()
    .default('#FFFFFF')
    .describe('Text color for all words'),
  
  lineColor: z.string()
    .default('#FFFFFF')
    .describe('Color for connecting lines between parent and children'),
  
  lineWidth: z.number()
    .default(2)
    .describe('Width of connecting lines in pixels'),
  
  verticalGap: z.number()
    .default(60)
    .describe('Vertical gap between parent and children containers in pixels'),
  
  childGap: z.number()
    .default(16)
    .describe('Horizontal gap between child words in pixels'),
  
  trackName: z.string()
    .default('hierarchy-track')
    .describe('Name of the track (used for ID generation)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  const {
    captions,
    parentFontSize,
    childFontSize,
    font,
    textColor,
    lineColor,
    lineWidth,
    verticalGap,
    childGap,
    trackName,
  } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') 
      ? fontString.split(':')[0] 
      : fontString;
    
    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle: parentFontStyle } = parseFontString(font);
  const parentWeight = parentFontStyle.fontWeight || 700;
  const childWeight = 400;

  // Build hierarchy nodes for each caption
  const hierarchyNodes: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const captionId = `${trackName}-caption-${captionIndex}`;
    
    // Split caption into words
    const words = caption.words && caption.words.length > 0
      ? caption.words.map(w => w.text)
      : caption.text.split(' ');

    // Parent word (first word)
    const parentWord = words[0] || 'Parent';
    
    // Children words (remaining words)
    const childWords = words.slice(1);

    // IDs
    const parentContainerId = `${captionId}-parent-container`;
    const parentWordId = `${captionId}-parent-word`;
    const lineContainerId = `${captionId}-line-container`;
    const lineSvgId = `${captionId}-line-svg`;
    const childrenContainerId = `${captionId}-children-container`;

    // Timing
    const captionStart = caption.absoluteStart;
    const captionDuration = caption.duration;

    // Parent zoom effect: 0-0.4s
    const parentZoomEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: 0.4,
      mode: 'provider',
      targetIds: [parentContainerId],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1.5, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -30, prog: 1 },
      ],
    };

    // Line draw effect: 0.2-0.5s (start at 0.2s, duration 0.3s)
    const lineDrawEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0.2,
      duration: 0.3,
      mode: 'provider',
      targetIds: [lineSvgId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.1 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    // Children slide effects: staggered from 0.4s
    const childrenSlideEffects: any[] = [];
    childWords.forEach((_, childIndex) => {
      const childWordId = `${childrenContainerId}-child-${childIndex}`;
      const staggerDelay = 0.4 + childIndex * 0.1;
      
      childrenSlideEffects.push({
        id: `${childWordId}-slide`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: staggerDelay,
          duration: 0.5,
          mode: 'provider',
          targetIds: [childWordId],
          ranges: [
            { key: 'translateY', val: 50, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      });
    });

    // Parent word component
    const parentWordComponent: RenderableComponentData = {
      id: parentWordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: parentWord,
        style: {
          fontSize: `${parentFontSize}px`,
          color: textColor,
          fontWeight: parentWeight,
        },
        font: {
          family: fontFamily,
          weights: [parentWeight.toString()],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: captionDuration,
        },
      },
    };

    // Parent container
    const parentContainer: RenderableComponentData = {
      id: parentContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: captionDuration,
        },
      },
      childrenData: [parentWordComponent],
      effects: [
        {
          id: `${parentContainerId}-zoom`,
          componentId: 'generic',
          data: parentZoomEffect,
        },
      ],
    };

    // Connecting line SVG
    const lineSvg: RenderableComponentData = {
      id: lineSvgId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="position: absolute; top: 0; left: 0; pointer-events: none;"><line x1="50%" y1="40%" x2="50%" y2="60%" stroke="${lineColor}" stroke-width="${lineWidth}" /></svg>`,
        className: 'w-full h-full',
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: captionDuration,
        },
      },
    };

    // Line container
    const lineContainer: RenderableComponentData = {
      id: lineContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: captionDuration,
        },
      },
      childrenData: [lineSvg],
      effects: [
        {
          id: `${lineSvgId}-draw`,
          componentId: 'generic',
          data: lineDrawEffect,
        },
      ],
    };

    // Child word components
    const childWordComponents: RenderableComponentData[] = childWords.map((word, childIndex) => ({
      id: `${childrenContainerId}-child-${childIndex}`,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `${childFontSize}px`,
          color: textColor,
          fontWeight: childWeight,
        },
        font: {
          family: fontFamily,
          weights: [childWeight.toString()],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: captionDuration,
        },
      },
    }));

    // Children container
    const childrenContainer: RenderableComponentData = {
      id: childrenContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-wrap justify-center items-center',
          style: {
            gap: `${childGap}px`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: captionDuration,
        },
      },
      childrenData: childWordComponents,
      effects: childrenSlideEffects,
    };

    // Root hierarchy container for this caption
    const hierarchyRoot: RenderableComponentData = {
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-col items-center justify-center w-full h-full',
          style: {
            gap: `${verticalGap}px`,
          },
        },
      },
      context: {
        timing: {
          start: captionStart,
          duration: captionDuration,
        },
      },
      childrenData: [
        parentContainer,
        lineContainer,
        childrenContainer,
      ],
    };

    hierarchyNodes.push(hierarchyRoot);
  });

  return {
    output: {
      childrenData: hierarchyNodes as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'hierarchy-breakdown-typokinetic',
  title: 'Hierarchy Breakdown Typokinetic',
  description: 'Cascading drill-down animation visualizing data hierarchy as nested boxes with parent-child relationships. Parent zooms to fill frame while children slide up and become new parent level. Features accordion-style vertical expansion with weight/size changes (bold 700 for parents, 400 for children) and connecting lines that animate drawing between nodes. Visual metaphor: org-chart or tree-map navigation through text alone.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'hierarchy', 'drill-down', 'animation', 'text', 'kinetic', 'org-chart', 'tree-map', 'accordion', 'nested'],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        text: 'Company Sales Marketing Development Support',
        absoluteStart: 0,
        duration: 5,
        words: [
          { text: 'Company', start: 0, duration: 1 },
          { text: 'Sales', start: 1, duration: 1 },
          { text: 'Marketing', start: 2, duration: 1 },
          { text: 'Development', start: 3, duration: 1 },
          { text: 'Support', start: 4, duration: 1 },
        ],
      },
    ],
    parentFontSize: 60,
    childFontSize: 24,
    font: 'Inter:700',
    textColor: '#FFFFFF',
    lineColor: '#FFFFFF',
    lineWidth: 2,
    verticalGap: 60,
    childGap: 16,
    trackName: 'hierarchy-track',
  },
};

// --- Export ---

export const hierarchyBreakdownTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
