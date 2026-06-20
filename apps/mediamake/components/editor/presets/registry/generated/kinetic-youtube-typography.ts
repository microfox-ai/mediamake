/**
 * Kinetic YouTube Typography Preset
 * 
 * This preset creates energetic, YouTube-style kinetic typography with modern, attention-grabbing animations.
 * Words slide in from different directions (left, right, top, bottom) with motion blur effects during movement.
 * A dynamic glow system flickers and surges like neon lights warming up. Subtle lens flare "pings" appear when
 * each word locks into place. The composition features a slight perspective tilt (transform3d) giving depth to the text.
 * Includes micro-animations like subtle character spacing changes and baseline shifts that keep text feeling alive.
 * 
 * Features:
 * - **Multi-directional Slide-In**: Words slide from different directions with motion blur
 * - **Neon Glow Effects**: Flickering glow that surges like neon lights warming up
 * - **Lens Flare Pings**: Subtle light bursts when words lock into place
 * - **3D Perspective Tilt**: Depth effect using transform3d
 * - **Micro-animations**: Continuous letter-spacing and baseline shifts
 * - **Staggered Timing**: Words appear in sequence for dynamic reveal
 * 
 * Use cases:
 * - YouTube video intros and outros
 * - Social media content
 * - Modern typography animations
 * - Attention-grabbing text reveals
 * - Energetic video overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption objects with word-level timing data'),
  fontSize: z.number().min(20).max(200).default(72).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family (e.g., "Inter", "Roboto")'),
  fontWeight: z.string().default('900').describe('Font weight (e.g., "400", "700", "900")'),
  textColor: z.string().default('#ffffff').describe('Text color (hex or rgba)'),
  glowColor: z.string().default('rgba(255,200,100,0.8)').describe('Neon glow color'),
  slideDistance: z.number().min(50).max(200).default(120).describe('Distance for slide-in animations (percentage)'),
  entryDuration: z.number().min(0.2).max(1).default(0.4).describe('Duration of slide-in animation (seconds)'),
  staggerDelay: z.number().min(0.05).max(0.3).default(0.1).describe('Delay between word animations (seconds)'),
  perspectiveRotateX: z.number().min(-20).max(20).default(5).describe('Perspective rotation on X-axis (degrees)'),
  perspectiveRotateY: z.number().min(-20).max(20).default(-5).describe('Perspective rotation on Y-axis (degrees)'),
  letterSpacingMin: z.number().min(0).max(0.1).default(0.02).describe('Minimum letter spacing (em)'),
  letterSpacingMax: z.number().min(0).max(0.2).default(0.04).describe('Maximum letter spacing (em)'),
  baselineShift: z.number().min(0.5).max(5).default(1).describe('Baseline shift amount (pixels)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];

  // Helper function to get slide direction based on word index
  const getSlideDirection = (index: number): { x: number; y: number } => {
    const directions = [
      { x: -params.slideDistance, y: 0 },  // Left
      { x: params.slideDistance, y: 0 },   // Right
      { x: 0, y: -params.slideDistance },  // Top
      { x: 0, y: params.slideDistance },   // Bottom
    ];
    return directions[index % 4];
  };

  // Build all word components with effects
  const allWordComponents: RenderableComponentData[] = [];

  captions.forEach((caption) => {
    const words = caption.words || [];

    words.forEach((word, wordIndex) => {
      const wordId = `word-${caption.id}-${wordIndex}`;
      const lensFlareId = `lens-flare-${caption.id}-${wordIndex}`;
      
      // Determine slide direction
      const direction = getSlideDirection(wordIndex);
      
      // Calculate staggered start time
      const effectStartTime = wordIndex * params.staggerDelay;

      // Slide-in effect with motion blur
      const slideInEffect: GenericEffectData = {
        type: 'ease-out',
        start: effectStartTime,
        duration: params.entryDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateX', val: direction.x, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: direction.y, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'blur', val: 4, prog: 0 },
          { key: 'blur', val: 0, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
        ],
      };

      // Neon glow flicker effect
      const glowFlickerEffect: GenericEffectData = {
        type: 'linear',
        start: effectStartTime,
        duration: 0.2,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.7, prog: 0.3 },
          { key: 'opacity', val: 1, prog: 0.6 },
          { key: 'opacity', val: 0.8, prog: 0.8 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      // Letter-spacing micro-animation (starts after lock-in)
      const letterSpacingEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: effectStartTime + params.entryDuration,
        duration: 2,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'letterSpacing', val: `${params.letterSpacingMin}em`, prog: 0 },
          { key: 'letterSpacing', val: `${params.letterSpacingMax}em`, prog: 0.5 },
          { key: 'letterSpacing', val: `${params.letterSpacingMin}em`, prog: 1 },
        ],
      };

      // Baseline shift micro-animation
      const baselineShiftEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: effectStartTime + params.entryDuration,
        duration: 3,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateY', val: -params.baselineShift, prog: 0 },
          { key: 'translateY', val: params.baselineShift, prog: 0.5 },
          { key: 'translateY', val: -params.baselineShift, prog: 1 },
        ],
      };

      // Lens flare ping effect (appears at lock-in)
      const lensFlarePingEffect: GenericEffectData = {
        type: 'ease-out',
        start: effectStartTime + params.entryDuration,
        duration: 0.3,
        mode: 'provider',
        targetIds: [lensFlareId],
        ranges: [
          { key: 'scale', val: 0, prog: 0 },
          { key: 'scale', val: 3, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };

      // Text atom for word
      const textAtom: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${params.fontSize}px`,
            fontWeight: params.fontWeight,
            color: params.textColor,
            textShadow: `0 0 5px currentColor, 0 0 15px ${params.glowColor}, 0 0 25px rgba(255,180,80,0.6)`,
            letterSpacing: `${params.letterSpacingMin}em`,
            marginRight: '0.3em',
          },
          font: {
            family: params.fontFamily,
            weights: [params.fontWeight],
            display: 'swap',
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [
          { id: `${wordId}-slide`, componentId: 'generic', data: slideInEffect },
          { id: `${wordId}-glow`, componentId: 'generic', data: glowFlickerEffect },
          { id: `${wordId}-letter-spacing`, componentId: 'generic', data: letterSpacingEffect },
          { id: `${wordId}-baseline`, componentId: 'generic', data: baselineShiftEffect },
        ],
      };

      // Lens flare element (using HTMLBlockAtom)
      const lensFlare: RenderableComponentData = {
        id: lensFlareId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width:16px;height:16px;border-radius:9999px;background:white;"></div>',
          className: 'absolute',
          style: {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [
          { id: `${lensFlareId}-ping`, componentId: 'generic', data: lensFlarePingEffect },
        ],
      };

      // Word wrapper container
      const wordWrapper: RenderableComponentData = {
        id: `word-wrapper-${caption.id}-${wordIndex}`,
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
            duration: caption.duration,
          },
        },
        childrenData: [textAtom, lensFlare] as RenderableComponentData[],
      };

      allWordComponents.push(wordWrapper);
    });
  });

  // Create perspective container for all words
  const perspectiveContainer: RenderableComponentData = {
    id: 'words-perspective-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-wrap items-center justify-center gap-2',
        style: {
          transform: `rotateX(${params.perspectiveRotateX}deg) rotateY(${params.perspectiveRotateY}deg)`,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.reduce((max, c) => Math.max(max, c.absoluteEnd), 0),
      },
    },
    childrenData: allWordComponents as RenderableComponentData[],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'kinetic-youtube-typography-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: captions[0]?.absoluteStart || 0,
        duration: captions.reduce((max, c) => Math.max(max, c.absoluteEnd), 0) - (captions[0]?.absoluteStart || 0),
      },
    },
    childrenData: [perspectiveContainer] as RenderableComponentData[],
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
  id: 'kinetic-youtube-typography',
  title: 'Kinetic YouTube Typography',
  description: 'Energetic, YouTube-style kinetic typography with multi-directional slide-in animations, motion blur, dynamic neon glow flickering, lens flare pings, 3D perspective tilt, and continuous micro-animations for letter-spacing and baseline shifts. Words slide in from different directions with staggered timing, creating attention-grabbing motion perfect for modern social media content.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'youtube', 'motion', 'animated', 'text', 'captions', 'neon', 'glow', 'perspective', '3d', 'modern', 'social-media', 'energetic'],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: '900',
    textColor: '#ffffff',
    glowColor: 'rgba(255,200,100,0.8)',
    slideDistance: 120,
    entryDuration: 0.4,
    staggerDelay: 0.1,
    perspectiveRotateX: 5,
    perspectiveRotateY: -5,
    letterSpacingMin: 0.02,
    letterSpacingMax: 0.04,
    baselineShift: 1,
  },
};

// Export preset
export const kineticYoutubeTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
