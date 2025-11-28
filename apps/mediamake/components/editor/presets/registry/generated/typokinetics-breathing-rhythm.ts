/**
 * Typokinetics Breathing Rhythm Preset
 *
 * Creates a meditation-inspired text animation that mimics natural breathing patterns.
 * Text expands on inhale (4 seconds) and contracts on exhale (4 seconds) in perfect 8-second cycles.
 * 
 * Features:
 * - Elliptical breathing motion with different horizontal (scaleX: 1.2) and vertical (scaleY: 1.1) scale ratios
 * - Subtle opacity fade (100% to 85%) during contraction for enhanced depth perception
 * - Word-by-word reveal synchronized with breathing peaks
 * - Soft glow effect (textShadow) that intensifies during expansion
 * - Sentence-based layout with word animations timed to breathing cycle
 * - CSS containment for optimized performance
 * 
 * Use cases:
 * - Wellness and meditation content
 * - Breathing exercise guides
 * - Mindfulness videos
 * - Calming lower-third overlays
 * - Relaxation and stress-relief content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption sentences with word-level timing'),
  font: z.string().default('Inter').optional().describe('Font family with optional weight and style (e.g., "Inter:500", "Roboto:600")'),
  fontSize: z.number().default(32).describe('Base font size in pixels'),
  textColor: z.string().default('#ffffff').describe('Text color (CSS color value)'),
  breathingCycleDuration: z.number().default(8).describe('Duration of complete breathing cycle in seconds (inhale + exhale)'),
  scaleXMax: z.number().default(1.2).describe('Maximum horizontal scale during inhale'),
  scaleYMax: z.number().default(1.1).describe('Maximum vertical scale during inhale'),
  opacityMin: z.number().default(0.85).describe('Minimum opacity during exhale (0-1)'),
  glowIntensity: z.number().default(20).describe('Maximum glow intensity in pixels during expansion'),
  wordRevealDelay: z.number().default(0.3).describe('Delay for word reveal effect in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;

  // Parse font style from font string
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

  // Helper: Calculate breathing phase for word appearance
  const calculateBreathPhase = (wordTime: number): number => {
    const cyclePosition = wordTime % params.breathingCycleDuration;
    const halfCycle = params.breathingCycleDuration / 2;
    
    // Peak of breath occurs at the midpoint of each half-cycle
    if (cyclePosition < halfCycle) {
      // Inhale phase - peak at halfCycle
      return cyclePosition / halfCycle;
    } else {
      // Exhale phase - peak at beginning of exhale
      return 1 - ((cyclePosition - halfCycle) / halfCycle);
    }
  };

  // Helper: Create breathing cycle effect for container
  const createBreathingEffect = (
    targetId: string,
    startTime: number,
    duration: number,
  ): GenericEffectData => {
    const cycleDuration = params.breathingCycleDuration;
    const numCycles = Math.ceil(duration / cycleDuration);
    
    // Create keyframes for multiple breathing cycles
    const ranges: Array<{ key: string; val: any; prog: number }> = [];
    
    for (let i = 0; i <= numCycles; i++) {
      const cycleProgress = i / numCycles;
      const cyclePhase = (i * cycleDuration) / duration;
      
      // Inhale (0 to 0.5 of cycle)
      const inhaleProgress = Math.min(cycleProgress, 1);
      ranges.push(
        { key: 'scaleX', val: 1.0, prog: cyclePhase },
        { key: 'scaleY', val: 1.0, prog: cyclePhase },
        { key: 'opacity', val: 1.0, prog: cyclePhase },
        { key: 'textShadow', val: '0 0 0px rgba(255,255,255,0)', prog: cyclePhase },
      );
      
      // Peak of inhale (0.5 of cycle)
      if (i < numCycles) {
        const peakProgress = cyclePhase + (0.5 * cycleDuration / duration);
        ranges.push(
          { key: 'scaleX', val: params.scaleXMax, prog: peakProgress },
          { key: 'scaleY', val: params.scaleYMax, prog: peakProgress },
          { key: 'opacity', val: 1.0, prog: peakProgress },
          { key: 'textShadow', val: `0 0 ${params.glowIntensity}px rgba(255,255,255,0.5)`, prog: peakProgress },
        );
      }
    }

    return {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: ranges,
    };
  };

  // Helper: Create word reveal effect synchronized to breathing
  const createWordRevealEffect = (
    wordId: string,
    wordStart: number,
    wordDuration: number,
  ): GenericEffectData => {
    const breathPhase = calculateBreathPhase(wordStart);
    const revealStart = wordStart;
    const revealDuration = params.wordRevealDelay;

    return {
      type: 'ease-out',
      start: revealStart,
      duration: revealDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };
  };

  // Process captions into sentence components
  const sentenceComponents: RenderableComponentData[] = captions.map((caption, sentenceIndex) => {
    const sentenceId = `sentence-${sentenceIndex}`;
    const sentenceContainerId = `sentence-container-${sentenceIndex}`;

    // Create word components
    const wordComponents: RenderableComponentData[] = caption.words.map((word, wordIndex) => {
      const wordId = `word-${sentenceIndex}-${wordIndex}`;

      // Word reveal effect synchronized with breathing
      const wordEffect = createWordRevealEffect(
        wordId,
        word.start,
        params.wordRevealDelay,
      );

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${params.fontSize}px`,
            color: params.textColor,
            marginRight: '0.3em',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration, // All words last for full sentence
          },
        },
        effects: [
          {
            id: `word-reveal-${wordId}`,
            componentId: 'generic',
            data: wordEffect,
          },
        ],
      } as RenderableComponentData;
    });

    // Breathing effect for entire sentence
    const breathingEffect = createBreathingEffect(
      sentenceContainerId,
      0,
      caption.duration,
    );

    // Sentence container with word layout
    const sentenceContainer: RenderableComponentData = {
      id: sentenceContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row items-center justify-center flex-wrap',
          style: {
            gap: '0.2em',
            padding: '0.5em',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
      effects: [
        {
          id: `breathing-${sentenceId}`,
          componentId: 'generic',
          data: breathingEffect,
        },
      ],
    };

    return sentenceContainer;
  });

  // Root container with CSS containment
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-breathing-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col items-center justify-center gap-4 p-8',
        style: {
          contain: 'layout style',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? Math.max(...captions.map(c => c.absoluteEnd))
          : 10,
      },
    },
    childrenData: sentenceComponents,
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

const presetMetadata: PresetMetadata = {
  id: 'typokineticsBreathingRhythm',
  title: 'Typokinetics Breathing Rhythm',
  description: 'A meditation-inspired lower-third preset that mimics breathing rhythm. Text expands on inhale (4 seconds, scaleX: 1.0→1.2, scaleY: 1.0→1.1) and contracts on exhale (4 seconds) in perfect 8-second cycles. Features elliptical breathing motion with different horizontal/vertical scale ratios, subtle opacity fade (100%→85%) during contraction for depth perception, word-by-word reveal synchronized to breathing peaks, and a soft glow effect (textShadow) that intensifies during expansion. Ideal for wellness content, meditation guides, and mindfulness videos.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typokinetics', 'breathing', 'meditation', 'wellness', 'captions', 'rhythm', 'breathing-cycle', 'mindfulness', 'lower-third', 'animated-text'],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    font: 'Inter:500',
    fontSize: 32,
    textColor: '#ffffff',
    breathingCycleDuration: 8,
    scaleXMax: 1.2,
    scaleYMax: 1.1,
    opacityMin: 0.85,
    glowIntensity: 20,
    wordRevealDelay: 0.3,
  },
};

export const typokineticsBreathingRhythmPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
