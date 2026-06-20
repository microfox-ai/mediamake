/**
 * Magnetic Repulsion Text Effect Preset
 *
 * This preset creates a dramatic magnetic repulsion text effect where words initially cluster
 * together in the center like magnetized objects, then suddenly repel each other as if their
 * polarity reversed. The animation simulates a slow-motion explosion with clear trajectory paths.
 *
 * Features:
 * - **Phase 1 (Cluster + Tension)**: Words start tightly packed with subtle vibration to show building tension
 * - **Phase 2 (Glow Buildup)**: Brightness and drop-shadow increase at the moment of separation
 * - **Phase 3 (Explosive Scatter)**: Words burst apart along calculated vectors based on initial positions
 * - **Motion Blur**: CSS blur filter during scatter phase simulates motion blur in post-production
 * - **Directional Scatter**: Each word has unique escape trajectory - left words go left, top words go up, etc.
 *
 * Use cases:
 * - Creating explosive title reveals for action content
 * - Building dramatic tension-to-release animations
 * - Adding VFX-style slow-motion explosion effects to text
 * - Creating energetic intro sequences with magnetic/repulsion themes
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  words: z
    .array(z.string())
    .default(['MAGNETIC', 'REPULSION', 'EFFECT', 'TEXT'])
    .describe('Array of words to display and animate with magnetic repulsion'),
  
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(48)
    .describe('Font size in pixels for all words'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto", "Montserrat")'),
  
  fontWeight: z
    .string()
    .default('bold')
    .describe('Font weight (e.g., "bold", "700", "normal")'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color in hex format'),
  
  duration: z
    .number()
    .min(2)
    .max(20)
    .default(5)
    .describe('Total duration of the effect in seconds'),
  
  vibrationIntensity: z
    .number()
    .min(1)
    .max(10)
    .default(2)
    .describe('Intensity of pre-explosion vibration (1-10, higher = more shake)'),
  
  scatterDistance: z
    .number()
    .min(100)
    .max(800)
    .default(300)
    .describe('Maximum distance words scatter in pixels'),
  
  glowIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1.5)
    .describe('Brightness multiplier at moment of separation (1 = normal, 1.5 = 50% brighter)'),
  
  glowColor: z
    .string()
    .default('rgba(255,255,255,0.8)')
    .describe('Drop shadow glow color at separation moment'),
  
  motionBlurAmount: z
    .number()
    .min(0)
    .max(10)
    .default(4)
    .describe('Motion blur amount during scatter phase in pixels'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Calculate scatter vectors based on word position
  const calculateScatterVector = (
    index: number,
    totalWords: number,
  ): { x: number; y: number } => {
    // Arrange words in a rough grid pattern for initial positions
    const cols = Math.ceil(Math.sqrt(totalWords));
    const row = Math.floor(index / cols);
    const col = index % cols;
    const centerRow = (Math.ceil(totalWords / cols) - 1) / 2;
    const centerCol = (cols - 1) / 2;

    // Calculate angle from center
    const dx = col - centerCol;
    const dy = row - centerRow;
    const angle = Math.atan2(dy, dx);

    // If at center, scatter randomly
    if (dx === 0 && dy === 0) {
      const randomAngle = (Math.random() * 2 * Math.PI);
      return {
        x: Math.cos(randomAngle) * params.scatterDistance,
        y: Math.sin(randomAngle) * params.scatterDistance,
      };
    }

    // Calculate scatter distance with some randomization
    const distanceMultiplier = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
    const scatterX = Math.cos(angle) * params.scatterDistance * distanceMultiplier;
    const scatterY = Math.sin(angle) * params.scatterDistance * distanceMultiplier;

    return { x: scatterX, y: scatterY };
  };

  // Calculate phase durations (percentages of total duration)
  const totalDuration = params.duration;
  const vibrationDuration = totalDuration * 0.3; // 0-30%
  const glowDuration = totalDuration * 0.05; // 30-35%
  const scatterDuration = totalDuration * 0.65; // 35-100%
  
  const vibrationStart = 0;
  const glowStart = vibrationDuration;
  const scatterStart = vibrationDuration + glowDuration;

  // Create word components with effects
  const wordComponents: RenderableComponentData[] = params.words.map((word, index) => {
    const wordId = `word-${index}`;
    const scatterVector = calculateScatterVector(index, params.words.length);

    // Phase 1: Vibration effect (pre-explosion shake)
    const vibrationEffect: GenericEffectData = {
      type: 'linear',
      start: vibrationStart,
      duration: vibrationDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // X-axis vibration
        { key: 'translateX', val: -params.vibrationIntensity, prog: 0 },
        { key: 'translateX', val: params.vibrationIntensity, prog: 0.25 },
        { key: 'translateX', val: -params.vibrationIntensity, prog: 0.5 },
        { key: 'translateX', val: params.vibrationIntensity, prog: 0.75 },
        { key: 'translateX', val: 0, prog: 1 },
        // Y-axis vibration (half intensity)
        { key: 'translateY', val: -params.vibrationIntensity * 0.5, prog: 0 },
        { key: 'translateY', val: params.vibrationIntensity * 0.5, prog: 0.25 },
        { key: 'translateY', val: -params.vibrationIntensity * 0.5, prog: 0.5 },
        { key: 'translateY', val: params.vibrationIntensity * 0.5, prog: 0.75 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };

    // Phase 2: Glow buildup effect (energy release)
    const glowEffect: GenericEffectData = {
      type: 'ease-in',
      start: glowStart,
      duration: glowDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Brightness increase
        { key: 'filter:brightness', val: 1, prog: 0 },
        { key: 'filter:brightness', val: params.glowIntensity, prog: 1 },
        // Drop shadow glow
        { key: 'filter:drop-shadow', val: '0 0 0px rgba(255,255,255,0)', prog: 0 },
        { key: 'filter:drop-shadow', val: `0 0 20px ${params.glowColor}`, prog: 1 },
      ],
    };

    // Phase 3: Scatter effect (explosive repulsion)
    const scatterEffect: GenericEffectData = {
      type: 'ease-out',
      start: scatterStart,
      duration: scatterDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // X translation (scatter)
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: scatterVector.x, prog: 1 },
        // Y translation (scatter)
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: scatterVector.y, prog: 1 },
        // Motion blur (peaks mid-movement, then fades)
        { key: 'filter:blur', val: 0, prog: 0 },
        { key: 'filter:blur', val: params.motionBlurAmount, prog: 0.3 },
        { key: 'filter:blur', val: 0, prog: 1 },
        // Brightness fade (glow dissipates)
        { key: 'filter:brightness', val: params.glowIntensity, prog: 0 },
        { key: 'filter:brightness', val: 1, prog: 0.3 },
      ],
    };

    return {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `${params.fontSize}px`,
          fontWeight: params.fontWeight,
          color: params.textColor,
          transformOrigin: 'center',
          willChange: 'transform, filter',
        },
        font: {
          family: params.fontFamily,
        },
        className: 'absolute',
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `${wordId}-vibration`,
          componentId: 'generic',
          data: vibrationEffect,
        },
        {
          id: `${wordId}-glow`,
          componentId: 'generic',
          data: glowEffect,
        },
        {
          id: `${wordId}-scatter`,
          componentId: 'generic',
          data: scatterEffect,
        },
      ],
    } as RenderableComponentData;
  });

  // Cluster container (relative positioned)
  const clusterContainer: RenderableComponentData = {
    id: 'cluster-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center gap-4 flex-wrap',
        style: {
          width: '800px',
          height: '600px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordComponents,
  };

  // Outer container (centering)
  const outerContainer: RenderableComponentData = {
    id: 'magnetic-repulsion-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [clusterContainer],
  };

  return {
    output: {
      childrenData: [outerContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'magnetic-repulsion-text',
  title: 'Magnetic Repulsion Text Effect',
  description:
    'Words cluster tightly in the center like magnetized objects, vibrate with tension, then suddenly repel apart in a slow-motion explosion. Each word scatters along calculated vectors based on initial position with motion blur and glow effects at separation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'magnetic',
    'repulsion',
    'explosion',
    'scatter',
    'vfx',
    'motion-blur',
    'glow',
    'kinetic',
    'dramatic',
  ],
  dependencies: {},
  defaultInputParams: {
    words: ['MAGNETIC', 'REPULSION', 'EFFECT', 'TEXT'],
    fontSize: 48,
    fontFamily: 'Inter',
    fontWeight: 'bold',
    textColor: '#ffffff',
    duration: 5,
    vibrationIntensity: 2,
    scatterDistance: 300,
    glowIntensity: 1.5,
    glowColor: 'rgba(255,255,255,0.8)',
    motionBlurAmount: 4,
  },
};

// Export preset
export const magneticRepulsionTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
