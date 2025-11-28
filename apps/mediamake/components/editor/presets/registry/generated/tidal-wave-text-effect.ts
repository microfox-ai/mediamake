/**
 * Tidal Wave Text Effect Preset
 *
 * Ultra-dynamic tidal wave text effect featuring typography that rises and falls like massive tsunami waves.
 * Words surge upward with tremendous speed, crest with foam and spray, then crash down with explosive impact.
 * Each word follows a wave sequence with realistic water physics, undertow effects, massive splash impacts,
 * and secondary wave bounces. The waves move with frightening velocity while maintaining realistic motion.
 *
 * Features:
 * - Massive tsunami-scale wave motion with vertical surge
 * - Three-phase wave animation: rise, crest, and crash
 * - Foam caps and spray effects at wave peaks using blur and shadows
 * - Explosive impact compression with scaleY distortion
 * - Screen shake on wave crashes for immersive feedback
 * - Cascading wave sequence with 0.2s stagger between words
 * - Realistic water physics using custom cubic-bezier easing
 * - Deep ocean background with glowing cyan text
 * - Motion blur during fastest motion segments
 * - Transform-origin manipulation for natural rotation pivots
 *
 * Use cases:
 * - Dramatic title reveals with ocean/water themes
 * - Action-packed intro sequences
 * - Nature documentary titles
 * - Music video text effects
 * - Sports highlight intros with impact
 * - Weather/storm-related content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  words: z
    .array(z.string())
    .default(['TSUNAMI', 'WAVE', 'CRASH', 'SURGE'])
    .describe('Array of words to animate as wave sequence'),
  fontSize: z
    .number()
    .min(40)
    .max(300)
    .default(120)
    .describe('Font size in pixels for wave text'),
  font: z
    .string()
    .default('Inter:900')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:900", "BebasNeue:700")'
    ),
  textColor: z
    .string()
    .default('#00d4ff')
    .describe('Color of wave text (glowing cyan by default)'),
  backgroundColor: z
    .string()
    .default('#001a33')
    .describe('Deep ocean background color'),
  waveCycleDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Duration of full wave cycle (rise + crest + crash) in seconds'),
  wordStagger: z
    .number()
    .min(0.05)
    .max(1)
    .default(0.2)
    .describe('Time interval between each word starting its wave motion'),
  zoomIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .describe('Intensity of wave crest expansion (scale multiplier)'),
  rotationRange: z
    .number()
    .min(0)
    .max(45)
    .default(25)
    .describe('Maximum rotation angle at wave crest in degrees'),
  crashRotation: z
    .number()
    .min(-30)
    .max(0)
    .default(-10)
    .describe('Rotation angle during crash phase (negative for forward tilt)'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Screen shake intensity on wave impact in pixels'),
  duration: z
    .number()
    .min(5)
    .max(30)
    .default(10)
    .describe('Total duration of the preset in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:900';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

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

  const words = params.words || ['TSUNAMI', 'WAVE', 'CRASH', 'SURGE'];
  const fontSize = params.fontSize || 120;
  const textColor = params.textColor || '#00d4ff';
  const waveCycleDuration = params.waveCycleDuration || 1.2;
  const wordStagger = params.wordStagger || 0.2;
  const zoomIntensity = params.zoomIntensity || 0.3;
  const rotationRange = params.rotationRange || 25;
  const crashRotation = params.crashRotation || -10;
  const shakeIntensity = params.shakeIntensity || 3;

  // Wave phase durations (proportional to cycle)
  const riseDuration = waveCycleDuration * 0.42; // ~0.5s
  const crestDuration = waveCycleDuration * 0.25; // ~0.3s
  const crashDuration = waveCycleDuration * 0.33; // ~0.4s

  // Helper: Create wave effects for a word
  const createWaveEffects = (
    wordId: string,
    wordIndex: number
  ): RenderableComponentData[] => {
    const startOffset = wordIndex * wordStagger;

    const effects: RenderableComponentData[] = [];

    // Phase 1: Rise (surge upward with expansion)
    effects.push({
      id: `effect-wave-${wordIndex}-rise`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)' as any,
        start: startOffset,
        duration: riseDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -80, prog: 1 },
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: 15, prog: 1 },
          { key: 'scale', val: 0.5, prog: 0 },
          { key: 'scale', val: 1.1, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
        ],
      },
    } as RenderableComponentData);

    // Phase 2: Crest (peak with rotation, blur, foam effect)
    effects.push({
      id: `effect-wave-${wordIndex}-crest`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)' as any,
        start: startOffset + riseDuration,
        duration: crestDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateY', val: -80, prog: 0 },
          { key: 'translateY', val: -100, prog: 1 },
          { key: 'translateX', val: 15, prog: 0 },
          { key: 'translateX', val: 30, prog: 1 },
          { key: 'rotateZ', val: 0, prog: 0 },
          { key: 'rotateZ', val: rotationRange, prog: 1 },
          { key: 'scale', val: 1.1, prog: 0 },
          { key: 'scale', val: 1.3 + zoomIntensity, prog: 1 },
          { key: 'filter', val: 'blur(0px)', prog: 0 },
          { key: 'filter', val: 'blur(2px)', prog: 1 },
        ],
      },
    } as RenderableComponentData);

    // Phase 3: Crash (explosive impact with compression and blur)
    effects.push({
      id: `effect-wave-${wordIndex}-crash`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)' as any,
        start: startOffset + riseDuration + crestDuration,
        duration: crashDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateY', val: -100, prog: 0 },
          { key: 'translateY', val: 20, prog: 1 },
          { key: 'translateX', val: 30, prog: 0 },
          { key: 'translateX', val: 50, prog: 1 },
          { key: 'rotateZ', val: rotationRange, prog: 0 },
          { key: 'rotateZ', val: crashRotation, prog: 1 },
          { key: 'scale', val: 1.3 + zoomIntensity, prog: 0 },
          { key: 'scale', val: 1, prog: 0.7 },
          { key: 'scale', val: 0.95, prog: 1 },
          { key: 'scaleY', val: 1, prog: 0 },
          { key: 'scaleY', val: 0.6, prog: 0.5 },
          { key: 'scaleY', val: 1, prog: 1 },
          { key: 'filter', val: 'blur(2px)', prog: 0 },
          { key: 'filter', val: 'blur(5px)', prog: 0.5 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
        ],
      },
    } as RenderableComponentData);

    return effects;
  };

  // Create word components with effects
  const wordComponents: RenderableComponentData[] = words.map(
    (word, index) => {
      const wordId = `word-${index}`;
      const wordEffects = createWaveEffects(wordId, index);

      return {
        id: wordId,
        componentId: 'TextAtom',
        type: 'atom' as const,
        data: {
          text: word,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontStyle.fontWeight || 900,
            fontStyle: fontStyle.fontStyle,
            color: textColor,
            textShadow: `0 0 20px ${textColor}cc, 0 0 40px ${textColor}99`,
            position: 'absolute',
            left: `${10 + index * 20}%`,
            bottom: '0',
            transformOrigin: 'center bottom',
          } as React.CSSProperties,
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['900'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: wordEffects,
      } as RenderableComponentData;
    }
  );

  // Create container shake effect (triggered on first crash)
  const containerShakeStart = riseDuration + crestDuration;
  const containerShakeDuration = crashDuration + 0.2;

  const containerShakeEffect: RenderableComponentData = {
    id: 'effect-container-shake',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: containerShakeStart,
      duration: containerShakeDuration,
      mode: 'provider',
      targetIds: ['wave-container'],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: -shakeIntensity, prog: 0.1 },
        { key: 'translateX', val: shakeIntensity, prog: 0.2 },
        { key: 'translateX', val: -shakeIntensity * 0.7, prog: 0.3 },
        { key: 'translateX', val: shakeIntensity * 0.7, prog: 0.4 },
        { key: 'translateX', val: -shakeIntensity * 0.3, prog: 0.5 },
        { key: 'translateX', val: shakeIntensity * 0.3, prog: 0.6 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: shakeIntensity * 0.7, prog: 0.15 },
        { key: 'translateY', val: -shakeIntensity * 0.7, prog: 0.3 },
        { key: 'translateY', val: shakeIntensity * 0.3, prog: 0.45 },
        { key: 'translateY', val: -shakeIntensity * 0.3, prog: 0.6 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    },
  } as RenderableComponentData;

  // Root container (ocean scene)
  const rootContainer: RenderableComponentData = {
    id: 'wave-container',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'relative h-screen w-full overflow-hidden',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [containerShakeEffect],
    childrenData: wordComponents,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'tidal-wave-text-effect',
  title: 'Tidal Wave Text Effect',
  description:
    'Ultra-dynamic tidal wave text effect featuring typography that rises and falls like massive tsunami waves. Words surge upward, crest with foam and spray, then crash down with explosive impact. Each word follows a wave sequence with foam caps, undertow effects, massive splash impacts, and rebound waves. Implements realistic water physics with frightening velocity and secondary wave bounces.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'wave',
    'tsunami',
    'water',
    'ocean',
    'crash',
    'surge',
    'impact',
    'kinetic',
    'physics',
    'dramatic',
    'nature',
    'title',
  ],
  dependencies: {},
  defaultInputParams: {
    words: ['TSUNAMI', 'WAVE', 'CRASH', 'SURGE'],
    fontSize: 120,
    font: 'Inter:900',
    textColor: '#00d4ff',
    backgroundColor: '#001a33',
    waveCycleDuration: 1.2,
    wordStagger: 0.2,
    zoomIntensity: 0.3,
    rotationRange: 25,
    crashRotation: -10,
    shakeIntensity: 3,
    duration: 10,
  },
};

// Export preset
export const tidalWaveTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
