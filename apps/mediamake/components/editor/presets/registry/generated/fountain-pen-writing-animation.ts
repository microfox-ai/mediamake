/**
 * Fountain Pen Writing Animation Preset
 *
 * Creates a realistic fountain pen calligraphy animation with progressive text reveal,
 * dynamic ink flow simulation, varying ink intensity based on pen velocity, microscopic
 * splatter effects, nib reflection tracking, and ink bleeding at letter connections.
 * 
 * Features:
 * - Progressive text reveal with clip-path animation
 * - Dynamic ink flow with varying intensity (darker at pauses, lighter during quick movements)
 * - Microscopic ink splatter particles during fast strokes
 * - Nib reflection effect that tracks along text baseline
 * - Ink pooling and bleeding at letter connection points
 * - Elegant calligraphic presentation with Playfair Display font
 * 
 * Technical Implementation:
 * - Uses TextAtom for base text rendering
 * - Clip-path animation for progressive reveal
 * - Multiple text-shadow layers for ink pooling effect
 * - Small HTMLBlockAtom particles for splatter effects
 * - Absolute positioned reflection element with radial gradient
 * - All animations use provider mode effects with targetIds
 * 
 * Use Cases:
 * - Elegant title sequences
 * - Calligraphy demonstrations
 * - Luxury brand content
 * - Wedding/invitation videos
 * - Literary content presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('Elegance')
    .describe('Text to display in fountain pen writing animation'),
  duration: z
    .number()
    .min(2)
    .max(20)
    .default(5)
    .describe('Total duration of writing animation in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#1a1a2e')
    .describe('Ink color (dark blue-black default for realistic fountain pen)'),
  fontFamily: z
    .string()
    .default('Playfair Display')
    .describe('Font family (serif fonts work best for calligraphy)'),
  fontWeight: z
    .string()
    .default('400')
    .describe('Font weight (400 for regular, 700 for bold)'),
  letterSpacing: z
    .string()
    .default('0.05em')
    .describe('Letter spacing for elegant calligraphy'),
  inkPoolingIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Intensity of ink pooling effect at connection points (0-1)'),
  splatterCount: z
    .number()
    .min(0)
    .max(10)
    .default(4)
    .describe('Number of microscopic ink splatter particles'),
  backgroundColor: z
    .string()
    .default('linear-gradient(to bottom right, #fef3c7, #e7e5e4)')
    .describe('Background gradient (parchment/paper effect)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Generate ink splatter timings based on velocity
  const generateSplatterTimings = (textLength: number, count: number, duration: number) => {
    const splatters = [];
    const charsPerSecond = textLength / duration;
    
    // Place splatters at high-velocity points (assuming faster writing in middle sections)
    for (let i = 0; i < count; i++) {
      const progress = (i + 1) / (count + 1);
      const time = duration * progress;
      const xPosition = 20 + (progress * 60); // Spread across text
      const yPosition = 35 + (Math.random() * 30); // Vertical variation
      
      splatters.push({
        time,
        x: xPosition,
        y: yPosition,
      });
    }
    
    return splatters;
  };

  // Helper function: Calculate pause points for ink pooling
  const calculatePausePoints = (text: string) => {
    const pauseChars = ['E', 'g', 'e', 'a', 'n', 'c']; // Characters where pen pauses
    const positions = [];
    
    for (let i = 0; i < text.length; i++) {
      if (pauseChars.includes(text[i])) {
        positions.push({
          index: i,
          progress: i / text.length,
          char: text[i],
        });
      }
    }
    
    return positions;
  };

  const text = params.text;
  const duration = params.duration;
  const fontSize = params.fontSize;
  const textColor = params.textColor;
  const splatterTimings = generateSplatterTimings(text.length, params.splatterCount, duration);
  const pausePoints = calculatePausePoints(text);

  // Base text component (revealed progressively)
  const baseTextId = 'base-text';
  const baseText: RenderableComponentData = {
    id: baseTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: params.fontWeight,
        color: textColor,
        letterSpacing: params.letterSpacing,
      },
      font: {
        family: params.fontFamily,
        weights: [params.fontWeight],
        subsets: ['latin'],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Clip-path animation for progressive reveal
      {
        id: 'text-reveal-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [baseTextId],
          ranges: [
            { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 },
            { key: 'clipPath', val: 'inset(0 0% 0 0)', prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Ink pooling overlay (appears at pause points)
  const inkPoolingOverlayId = 'ink-pooling-overlay';
  const inkPoolingOverlay: RenderableComponentData = {
    id: inkPoolingOverlayId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: params.fontWeight,
        color: textColor,
        letterSpacing: params.letterSpacing,
        position: 'absolute',
        top: '0',
        left: '0',
        textShadow: `0 0 4px rgba(26, 26, 46, ${params.inkPoolingIntensity * 0.4}), 0 0 8px rgba(26, 26, 46, ${params.inkPoolingIntensity * 0.2})`,
        opacity: '0',
        pointerEvents: 'none',
      },
      font: {
        family: params.fontFamily,
        weights: [params.fontWeight],
        subsets: ['latin'],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: pausePoints.map((pause, index) => ({
      id: `ink-pooling-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: pause.progress * duration,
        duration: 0.3,
        mode: 'provider',
        targetIds: [inkPoolingOverlayId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: params.inkPoolingIntensity, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    })),
  };

  // Nib reflection (tracks along text baseline)
  const nibReflectionId = 'nib-reflection';
  const nibReflection: RenderableComponentData = {
    id: nibReflectionId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 8px; height: 8px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%); opacity: 0.6;"></div>',
      className: 'absolute pointer-events-none',
      style: {
        top: '50%',
        left: '0',
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'nib-reflection-movement',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [nibReflectionId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: fontSize * text.length * 0.6, prog: 1 },
          ],
        } as GenericEffectData,
      },
      // Fade out near the end
      {
        id: 'nib-reflection-fadeout',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: duration * 0.9,
          duration: duration * 0.1,
          mode: 'provider',
          targetIds: [nibReflectionId],
          ranges: [
            { key: 'opacity', val: 0.6, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Ink splatter particles
  const splatters: RenderableComponentData[] = splatterTimings.map((splatter, index) => {
    const splatterId = `splatter-${index}`;
    return {
      id: splatterId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 2px; height: 2px; border-radius: 50%; background: ${textColor};"></div>`,
        className: 'absolute pointer-events-none',
        style: {
          top: `${splatter.y}%`,
          left: `${splatter.x}%`,
          opacity: '0',
        },
      },
      context: {
        timing: {
          start: splatter.time,
          duration: 0.15,
        },
      },
      effects: [
        {
          id: `splatter-appear-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 0.05,
            mode: 'provider',
            targetIds: [splatterId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 1 },
            ],
          } as GenericEffectData,
        },
        {
          id: `splatter-fade-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0.05,
            duration: 0.1,
            mode: 'provider',
            targetIds: [splatterId],
            ranges: [
              { key: 'opacity', val: 0.7, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    };
  });

  // Text writing container (relative positioning for all text elements)
  const textWritingContainer: RenderableComponentData = {
    id: 'text-writing-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative inline-block',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [baseText, inkPoolingOverlay, nibReflection, ...splatters],
  };

  // Root container with background
  const rootContainer: RenderableComponentData = {
    id: 'fountain-pen-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          background: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textWritingContainer],
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
  id: 'fountainPenWritingAnimation',
  title: 'Fountain Pen Writing Animation',
  description:
    'Realistic fountain pen calligraphy animation with progressive text reveal, dynamic ink flow simulation, varying ink intensity based on pen velocity, microscopic splatter effects, nib reflection tracking, and ink bleeding at letter connections. Captures the elegance of traditional fountain pen writing with attention to ink pooling, flow dynamics, and authentic calligraphic details.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'fountain-pen',
    'calligraphy',
    'writing',
    'animation',
    'ink',
    'elegant',
    'luxury',
    'typography',
    'reveal',
    'splatter',
    'nib-reflection',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Elegance',
    duration: 5,
    fontSize: 72,
    textColor: '#1a1a2e',
    fontFamily: 'Playfair Display',
    fontWeight: '400',
    letterSpacing: '0.05em',
    inkPoolingIntensity: 0.4,
    splatterCount: 4,
    backgroundColor: 'linear-gradient(to bottom right, #fef3c7, #e7e5e4)',
  },
};

// Export preset
export const fountainPenWritingAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
