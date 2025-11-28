/**
 * Typokinetic Explosion Preset
 * 
 * A high-impact typographic preset where letters explode outward from a center point
 * like a shockwave. Letters start completely collapsed at the center, then blast outward
 * with velocity-based trajectories, feature motion blur during peak velocity, and settle
 * with a subtle bounce-back. Perfect for music video beat drops, emphatic titles, or
 * attention-grabbing captions.
 * 
 * Features:
 * - Letters start collapsed at the center point (like a collapsed star)
 * - Outward explosion with velocity-based trajectories (outer letters travel further/faster)
 * - Motion blur simulation during fastest part of motion (clearing as letters settle)
 * - Micro bounce-back at the end (recoil after explosion)
 * - Maintains readability while delivering powerful visual impact
 * - Multi-word support with each word having its own explosion origin
 * - Organic feel with slight vertical variation
 * 
 * Use cases:
 * - Music video beat drops
 * - High-impact title sequences
 * - Emphatic captions
 * - Attention-grabbing text reveals
 * - Action/sports content titles
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

const presetParams = z.object({
  text: z.string().describe('Text to display with explosion effect'),
  duration: z.number().default(1.2).describe('Total animation duration in seconds (explosion + settle + bounce)'),
  fontSize: z.number().default(72).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter:700').describe('Font family with optional weight (e.g., "Inter:700", "Roboto:900")'),
  textColor: z.string().default('#FFFFFF').describe('Text color (hex or CSS color)'),
  spacing: z.number().default(30).describe('Base spacing between letters (pixels) - outer letters travel further based on this'),
  velocityMultiplier: z.number().default(2.5).describe('Velocity multiplier for outer letters (higher = more dramatic explosion)'),
  explosionDuration: z.number().default(0.3).describe('Duration of initial explosion phase in seconds'),
  settleDuration: z.number().default(0.5).describe('Duration of settle phase in seconds'),
  bounceDuration: z.number().default(0.15).describe('Duration of micro bounce-back in seconds'),
  maxBlur: z.number().default(4).describe('Maximum blur during explosion (pixels)'),
  verticalVariation: z.number().default(5).describe('Random vertical offset for organic feel (pixels, -N to +N)'),
  scaleStart: z.number().default(0.8).describe('Starting scale (collapsed state)'),
  scaleOvershoot: z.number().default(1.1).describe('Scale overshoot during bounce'),
  scaleFinal: z.number().default(1.0).describe('Final resting scale'),
  opacityStart: z.number().default(0.7).describe('Starting opacity (dim/compressed state)'),
  containerClassName: z.string().optional().describe('Additional CSS classes for root container'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter:700';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 700; // Default bold for impact
  }

  // Split text into words
  const words = params.text.trim().split(/\s+/);

  // Helper function: Generate random vertical offset
  const getRandomVerticalOffset = () => {
    return (Math.random() - 0.5) * 2 * params.verticalVariation;
  };

  // Helper function: Create letter explosion effects
  const createLetterExplosionEffect = (
    letterId: string,
    letterIndex: number,
    totalLetters: number,
  ): GenericEffectData[] => {
    const centerIndex = (totalLetters - 1) / 2;
    const distanceFromCenter = letterIndex - centerIndex;
    
    // Calculate trajectory distances
    const horizontalDistance = distanceFromCenter * params.spacing * params.velocityMultiplier;
    const verticalOffset = getRandomVerticalOffset();

    // Timing breakdown (all relative to letter start)
    const explosionStart = 0;
    const explosionEnd = params.explosionDuration;
    const settleStart = explosionEnd * 0.67; // Overlap with explosion
    const settleEnd = explosionEnd + params.settleDuration;
    const bounceStart = settleEnd - params.bounceDuration; // Overlap with settle
    const bounceEnd = params.duration;

    // Calculate progress values (0-1 range for prog)
    const totalDuration = params.duration;
    const explosionProg = explosionEnd / totalDuration;
    const settleProg = settleEnd / totalDuration;

    // Create comprehensive effect
    const effects: GenericEffectData[] = [
      {
        type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Custom easing for explosive acceleration
        start: explosionStart,
        duration: totalDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          // Horizontal explosion (translateX)
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: horizontalDistance, prog: explosionProg },
          { key: 'translateX', val: horizontalDistance * 0.95, prog: settleProg }, // Slight pull-back
          { key: 'translateX', val: horizontalDistance, prog: 1 }, // Final position

          // Vertical variation (translateY)
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: verticalOffset, prog: explosionProg },
          { key: 'translateY', val: verticalOffset * 1.1, prog: settleProg },
          { key: 'translateY', val: verticalOffset, prog: 1 },

          // Scale animation (compressed → overshoot → settle)
          { key: 'scale', val: params.scaleStart, prog: 0 },
          { key: 'scale', val: params.scaleOvershoot, prog: explosionProg },
          { key: 'scale', val: params.scaleOvershoot * 0.95, prog: settleProg },
          { key: 'scale', val: params.scaleFinal, prog: 1 },

          // Opacity ramp
          { key: 'opacity', val: params.opacityStart, prog: 0 },
          { key: 'opacity', val: 1, prog: explosionProg * 0.5 }, // Fade in quickly
          { key: 'opacity', val: 1, prog: 1 },

          // Motion blur simulation
          { key: 'filter', val: `blur(${params.maxBlur}px)`, prog: 0 },
          { key: 'filter', val: `blur(${params.maxBlur}px)`, prog: explosionProg * 0.3 }, // Peak blur
          { key: 'filter', val: 'blur(0px)', prog: explosionProg }, // Clear as velocity reduces
          { key: 'filter', val: 'blur(0px)', prog: 1 },
        ],
      },
    ];

    return effects;
  };

  // Generate word containers with letter explosions
  const wordContainers = words.map((word, wordIndex) => {
    const wordId = `typokinetic-explosion-word-${wordIndex}`;
    const letters = word.split('');

    // Create letter components
    const letterComponents: RenderableComponentData[] = letters.map((letter, letterIndex) => {
      const letterId = `${wordId}-letter-${letterIndex}`;
      const effects = createLetterExplosionEffect(letterId, letterIndex, letters.length);

      return {
        id: letterId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: letter,
          className: 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: effects.map((effectData, effectIndex) => ({
          id: `${letterId}-explosion-effect-${effectIndex}`,
          componentId: 'generic',
          data: effectData,
        })),
      } as RenderableComponentData;
    });

    // Word container (explosion origin)
    return {
      id: wordId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'inline-block relative',
          style: {
            width: `${letters.length * params.spacing}px`,
            height: `${params.fontSize * 1.5}px`,
            marginRight: wordIndex < words.length - 1 ? `${params.fontSize * 0.5}px` : '0px',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: letterComponents,
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetic-explosion-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full flex items-center justify-center ${params.containerClassName || ''}`,
        style: {
          transformOrigin: 'center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: wordContainers,
  } as RenderableComponentData;

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
  id: 'typokinetic-explosion',
  title: 'Typokinetic Explosion Preset',
  description: 'High-impact typographic preset where letters explode outward from a center point like a shockwave. Letters start collapsed at center, blast outward with velocity-based trajectories, feature motion blur during peak velocity, and settle with a subtle bounce-back. Perfect for music video beat drops, emphatic titles, or attention-grabbing captions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'explosion',
    'shockwave',
    'high-impact',
    'title',
    'motion-blur',
    'bounce',
    'velocity',
    'music-video',
    'beat-drop',
    'emphatic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'EXPLOSIVE',
    duration: 1.2,
    fontSize: 72,
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    spacing: 30,
    velocityMultiplier: 2.5,
    explosionDuration: 0.3,
    settleDuration: 0.5,
    bounceDuration: 0.15,
    maxBlur: 4,
    verticalVariation: 5,
    scaleStart: 0.8,
    scaleOvershoot: 1.1,
    scaleFinal: 1.0,
    opacityStart: 0.7,
  },
};

export const typokineticExplosionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
