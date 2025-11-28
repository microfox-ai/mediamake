/**
 * Typewriter Compression Effect Preset
 *
 * This preset creates a character-by-character text reveal where each character starts
 * maximally compressed (letter-spacing: -0.4em) and mechanically expands from left to right,
 * like an old typewriter with reverse functionality. Each character 'pops' into its proper
 * spacing with a slight overshoot (expand to 0.05em then settle to 0em) creating a bouncy,
 * mechanical feel. Adds subtle vertical jitter (±1-2px) on each character expansion to
 * simulate typewriter key strikes.
 *
 * Features:
 * - **Character-by-Character Reveal**: Sequential expansion from left to right
 * - **Compression Animation**: Starts at -0.4em letter-spacing, expands with overshoot
 * - **Mechanical Spring Bounce**: Spring easing with overshoot for bouncy feel
 * - **Vertical Jitter**: ±1-2px vertical movement simulating key strikes
 * - **Configurable Timing**: Adjustable character delay (50-80ms per character)
 * - **Optional Sound Effects**: Synchronized typewriter sound with each character expansion
 * - **Font Customization**: Custom font families and styling
 *
 * Use cases:
 * - Creating retro typewriter text effects
 * - Building mechanical text animations
 * - Adding nostalgic text reveals
 * - Creating animated titles with typewriter aesthetic
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time of caption'),
        end: z.number().describe('Relative end time of caption'),
        duration: z.number().describe('Duration of caption'),
        absoluteStart: z.number().describe('Absolute start time in caption timeline'),
        absoluteEnd: z.number().describe('Absolute end time in caption timeline'),
        words: z.array(z.any()).optional(),
        metadata: z.any().optional(),
      })
    )
    .describe('Array of caption objects with text and timing information'),
  
  characterDelay: z
    .number()
    .min(0.03)
    .max(0.15)
    .default(0.08)
    .describe('Delay between each character expansion in seconds (0.05-0.08 recommended)'),
  
  compressionStart: z
    .number()
    .min(-0.8)
    .max(0)
    .default(-0.4)
    .describe('Starting letter-spacing (em) - negative values compress text'),
  
  overshootAmount: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Letter-spacing overshoot amount (em) before settling to 0'),
  
  jitterAmount: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Vertical jitter amount in pixels (±value)'),
  
  expansionDuration: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.3)
    .describe('Duration of each character expansion animation in seconds'),
  
  bufferDuration: z
    .number()
    .min(0)
    .max(2)
    .default(0.5)
    .describe('Additional buffer time after last character expansion'),
  
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  
  fontWeight: z
    .union([z.string(), z.number()])
    .default('600')
    .describe('Font weight (e.g., "400", "bold", 600)'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")'),
  
  position: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of text'),
  
  textAlign: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Text alignment'),
  
  audioSrc: z
    .string()
    .optional()
    .describe('Optional typewriter sound effect URL (synchronized with character expansion)'),
  
  audioVolume: z
    .number()
    .min(0)
    .max(2)
    .default(0.3)
    .describe('Volume of typewriter sound effect (0-2)'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    captions,
    characterDelay,
    compressionStart,
    overshootAmount,
    jitterAmount,
    expansionDuration,
    bufferDuration,
    fontSize,
    fontWeight,
    textColor,
    font,
    position,
    textAlign,
    audioSrc,
    audioVolume,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
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

  // Helper function: Create character expansion effect
  const createCharacterExpansionEffect = (
    charId: string,
    charIndex: number,
    captionStart: number,
  ): GenericEffectData => {
    const effectStart = charIndex * characterDelay;
    
    // Calculate progress points for spring animation
    const overshootProg = 0.67; // Overshoot happens at 67% progress
    const settleProg = 1.0; // Settle at 100% progress
    
    const jitterPeakProg = 0.33; // Jitter peaks at 33% progress
    
    return {
      type: 'spring',
      start: effectStart,
      duration: expansionDuration,
      mode: 'provider',
      targetIds: [charId],
      ranges: [
        // Letter spacing: compressed -> overshoot -> normal
        { key: 'letterSpacing', val: `${compressionStart}em`, prog: 0 },
        { key: 'letterSpacing', val: `${overshootAmount}em`, prog: overshootProg },
        { key: 'letterSpacing', val: '0em', prog: settleProg },
        
        // Vertical jitter: 0 -> -jitter -> 0
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -jitterAmount, prog: jitterPeakProg },
        { key: 'translateY', val: 0, prog: overshootProg },
      ],
    };
  };

  // Helper function: Create audio unmute ranges for each character
  const createAudioUnmuteRanges = (
    characterCount: number,
    captionStart: number,
  ): Array<{ start: number; end: number }> => {
    const ranges: Array<{ start: number; end: number }> = [];
    
    for (let i = 0; i < characterCount; i++) {
      const charStart = i * characterDelay;
      const charEnd = charStart + 0.1; // Short 100ms sound burst per character
      
      ranges.push({
        start: charStart,
        end: charEnd,
      });
    }
    
    return ranges;
  };

  // Helper function: Get position class
  const getPositionClass = (): string => {
    if (position === 'top') return 'items-start pt-20';
    if (position === 'bottom') return 'items-end pb-20';
    return 'items-center';
  };

  // Helper function: Get text alignment class
  const getTextAlignClass = (): string => {
    if (textAlign === 'left') return 'justify-start';
    if (textAlign === 'right') return 'justify-end';
    return 'justify-center';
  };

  // Build caption components
  const captionComponents: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const text = caption.text;
    const characters = text.split('');
    const characterCount = characters.length;
    
    // Calculate total duration for this caption
    const totalDuration = characterCount * characterDelay + expansionDuration + bufferDuration;

    // Create character spans
    const characterSpans = characters.map((char, charIndex) => {
      const charId = `char-${captionIndex}-${charIndex}`;
      const effect = createCharacterExpansionEffect(charId, charIndex, caption.absoluteStart);
      
      return {
        id: charId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: char,
          style: {
            display: 'inline-block',
            fontSize: fontSize,
            fontWeight: fontStyle.fontWeight || fontWeight,
            fontStyle: fontStyle.fontStyle || 'normal',
            color: textColor,
            letterSpacing: `${compressionStart}em`, // Start compressed
            transformOrigin: 'center bottom',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : [fontWeight.toString()],
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
            id: `expansion-effect-${charId}`,
            componentId: 'generic',
            data: effect,
          },
        ],
      } as RenderableComponentData;
    });

    // Create text container for this caption
    const textContainer: RenderableComponentData = {
      id: `typewriter-caption-${captionIndex}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 flex ${getPositionClass()} ${getTextAlignClass()}`,
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: totalDuration,
        },
      },
      childrenData: characterSpans,
    };

    captionComponents.push(textContainer);

    // Add audio if provided
    if (audioSrc) {
      const audioUnmuteRanges = createAudioUnmuteRanges(characterCount, caption.absoluteStart);
      
      const audioComponent: RenderableComponentData = {
        id: `typewriter-audio-${captionIndex}`,
        type: 'atom' as const,
        componentId: 'AudioAtom',
        data: {
          src: audioSrc,
          volume: audioVolume,
          muted: {
            type: 'range' as const,
            values: audioUnmuteRanges,
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: totalDuration,
          },
        },
      };

      captionComponents.push(audioComponent);
    }
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typewriter-compression-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: Math.max(
          ...captions.map(c => {
            const charCount = c.text.length;
            return c.absoluteStart + charCount * characterDelay + expansionDuration + bufferDuration;
          }),
          10
        ),
      },
    },
    childrenData: captionComponents,
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
  id: 'typewriter-compression-preset',
  title: 'Typewriter Compression Effect',
  description:
    'A character-by-character text reveal preset where each character starts maximally compressed (letter-spacing: -0.4em) and mechanically expands with spring overshoot and vertical jitter to simulate typewriter key strikes. Features sequential timing, bouncy mechanical feel, and optional typing sound effects synchronized with character expansion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'typewriter',
    'compression',
    'character-by-character',
    'mechanical',
    'retro',
    'spring',
    'jitter',
    'sequential',
    'text-reveal',
    'sound-effects',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'HELLO WORLD',
        start: 0,
        end: 5,
        duration: 5,
        absoluteStart: 0,
        absoluteEnd: 5,
        words: [],
      },
    ],
    characterDelay: 0.08,
    compressionStart: -0.4,
    overshootAmount: 0.05,
    jitterAmount: 2,
    expansionDuration: 0.3,
    bufferDuration: 0.5,
    fontSize: 48,
    fontWeight: '600',
    textColor: '#FFFFFF',
    font: 'Inter:600',
    position: 'center',
    textAlign: 'center',
    audioVolume: 0.3,
  },
};

export const typewriterCompressionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
