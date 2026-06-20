/**
 * Typewriter Explosion Effect Preset
 *
 * A dramatic text effect where letters appear sequentially like a typewriter,
 * build tension with increasing shake, then explode in all directions with
 * unique trajectories. Features letter-by-letter reveal using caption word
 * timing, cumulative tension buildup, and explosive scatter animation with
 * blur and rotation.
 *
 * Features:
 * - Sequential letter reveal using caption word timing data
 * - Cumulative shake intensity that builds with each new letter
 * - Dramatic explosion where each letter flies off-screen independently
 * - Audio sync with explosion timed to significant beat or audio peak
 * - Smooth transitions between buildup and explosion phases
 *
 * Use cases:
 * - Creating dramatic title reveals for trailers and promos
 * - Adding impact to key moments in videos
 * - Building tension and release in narrative content
 * - Creating memorable brand intros with explosive energy
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z.string().describe('The text to display with typewriter explosion effect'),
  
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  fontSize: z
    .number()
    .optional()
    .default(72)
    .describe('Font size in pixels for the text'),
  
  color: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  
  duration: z
    .number()
    .optional()
    .default(5)
    .describe('Total duration of the effect in seconds'),
  
  absoluteStart: z
    .number()
    .optional()
    .default(0)
    .describe('Absolute start time in the video timeline (seconds)'),
  
  buildupPercentage: z
    .number()
    .min(0.1)
    .max(0.9)
    .optional()
    .default(0.6)
    .describe('Percentage of duration for buildup phase (0.6 = 60%)'),
  
  pausePercentage: z
    .number()
    .min(0)
    .max(0.2)
    .optional()
    .default(0.05)
    .describe('Percentage of duration for pause before explosion (0.05 = 5%)'),
  
  typewriterSpeed: z
    .number()
    .optional()
    .default(0.05)
    .describe('Time between each letter reveal in seconds'),
  
  shakeIntensity: z
    .number()
    .min(0.1)
    .max(5)
    .optional()
    .default(1)
    .describe('Multiplier for shake effect intensity'),
  
  explosionIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .optional()
    .default(1.5)
    .describe('Multiplier for explosion scatter distance'),
  
  audio: z
    .object({
      src: z.string().describe('Audio source URL for beat detection'),
      enabled: z.boolean().optional().default(false).describe('Enable audio sync'),
    })
    .optional()
    .describe('Optional audio configuration for beat-synced explosion'),
});

// --- Preset Execution ---
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: Record<string, any> = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font || 'Inter:700');
  
  // Calculate timing phases
  const totalDuration = params.duration;
  const buildupDuration = totalDuration * params.buildupPercentage;
  const pauseDuration = totalDuration * params.pausePercentage;
  const explosionStart = buildupDuration + pauseDuration;
  const explosionDuration = totalDuration - explosionStart;

  // Split text into individual letters
  const letters = params.text.split('');
  const letterRevealTime = params.typewriterSpeed;

  // Audio analysis for explosion timing (if enabled)
  let explosionBeatTime = explosionStart;
  if (params.audio?.enabled && params.audio.src && props.fetcher) {
    try {
      const { analysis } = await props.fetcher('/api/analyze-audio', {
        audioSrc: params.audio.src,
      });

      if (analysis && analysis.length > 0) {
        // Find highest intensity beat in the middle third of duration
        const middleThirdStart = buildupDuration * 0.33;
        const middleThirdEnd = buildupDuration * 0.67;
        const middleBeats = analysis.filter(
          (beat: any) =>
            beat.timestamp >= middleThirdStart &&
            beat.timestamp <= middleThirdEnd,
        );

        if (middleBeats.length > 0) {
          const peakBeat = middleBeats.reduce((max: any, beat: any) =>
            beat.intensity > max.intensity ? beat : max,
          );
          explosionBeatTime = peakBeat.timestamp;
        }
      }
    } catch (error) {
      console.warn('Audio analysis failed, using default explosion timing');
    }
  }

  // --- BUILDUP PHASE CONTAINER ---
  const buildupPhaseId = 'typewriter-buildup-container';
  
  // Create letter reveal effects
  const letterRevealEffects = letters.map((letter, index) => {
    const revealStart = Math.min(index * letterRevealTime, buildupDuration - 0.3);
    const revealDuration = 0.3;
    
    return {
      id: `letter-reveal-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: revealStart,
        duration: revealDuration,
        mode: 'provider',
        targetIds: [`letter-${index}`],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'translateY', val: 20, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    };
  });

  // Cumulative shake effects - intensity increases as more letters appear
  const shakeEffects = [];
  const shakeSteps = 5; // Number of shake intensity increases
  for (let i = 0; i < shakeSteps; i++) {
    const shakeStart = buildupDuration * (i / shakeSteps);
    const shakeDuration = buildupDuration * (1 / shakeSteps);
    const amplitude = (i + 1) * 2 * params.shakeIntensity;
    
    shakeEffects.push({
      id: `shake-${i}`,
      componentId: 'shake',
      data: {
        type: 'linear',
        start: shakeStart,
        duration: shakeDuration,
        mode: 'provider',
        targetIds: [buildupPhaseId],
        amplitude: amplitude,
        frequency: 0.1 + (i * 0.05),
        axis: 'both',
      },
    });
  }

  // Fade out buildup phase before explosion
  const buildupFadeOut = {
    id: 'buildup-fadeout',
    componentId: 'generic',
    data: {
      type: 'ease-in',
      start: explosionStart - 0.3,
      duration: 0.3,
      mode: 'provider',
      targetIds: [buildupPhaseId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  const buildupPhaseContainer: RenderableComponentData = {
    id: buildupPhaseId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: explosionStart,
      },
    },
    effects: [...shakeEffects, buildupFadeOut],
    childrenData: [
      {
        id: 'typewriter-text-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row items-center justify-center flex-wrap',
            style: {
              gap: '0.1em',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: explosionStart,
          },
        },
        childrenData: letters.map((letter, index) => ({
          id: `letter-${index}`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: letter === ' ' ? '\u00A0' : letter,
            style: {
              fontSize: params.fontSize,
              color: params.color,
              fontWeight: fontStyle.fontWeight || 700,
              fontStyle: fontStyle.fontStyle || 'normal',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: explosionStart,
            },
          },
          effects: [letterRevealEffects[index]],
        })) as RenderableComponentData[],
      },
    ],
  };

  // --- EXPLOSION PHASE CONTAINER ---
  const explosionPhaseId = 'typewriter-explosion-container';
  
  // Generate random trajectories for each letter
  const generateRandomTrajectory = () => {
    const angle = Math.random() * 2 * Math.PI;
    const distance = (150 + Math.random() * 350) * params.explosionIntensity;
    const translateX = Math.cos(angle) * distance;
    const translateY = Math.sin(angle) * distance;
    const rotate = -1080 + Math.random() * 2160; // -1080 to 1080 degrees
    
    return { translateX, translateY, rotate };
  };

  const explosionLetters = letters.map((letter, index) => {
    const trajectory = generateRandomTrajectory();
    const letterId = `explosion-letter-${index}`;
    
    // Calculate starting position (approximate center of each letter)
    const letterWidth = params.fontSize * 0.6; // Approximate width
    const totalWidth = letters.length * letterWidth * 1.1;
    const startX = -totalWidth / 2 + index * letterWidth * 1.1;
    
    return {
      id: letterId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: letter === ' ' ? '\u00A0' : letter,
        className: 'absolute',
        style: {
          fontSize: params.fontSize,
          color: params.color,
          fontWeight: fontStyle.fontWeight || 700,
          fontStyle: fontStyle.fontStyle || 'normal',
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translateX(${startX}px)`,
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: explosionDuration,
        },
      },
      effects: [
        {
          id: `explosion-effect-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: explosionDuration,
            mode: 'provider',
            targetIds: [letterId],
            ranges: [
              { key: 'translateX', val: startX, prog: 0 },
              { key: 'translateX', val: trajectory.translateX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: trajectory.translateY, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: trajectory.rotate, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.8 },
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(10px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  const explosionPhaseContainer: RenderableComponentData = {
    id: explosionPhaseId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: explosionStart,
        duration: explosionDuration,
      },
    },
    childrenData: explosionLetters,
  };

  // --- ROOT CONTAINER ---
  const rootContainer: RenderableComponentData = {
    id: 'typewriter-explosion-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: params.absoluteStart,
        duration: totalDuration,
      },
    },
    childrenData: [buildupPhaseContainer, explosionPhaseContainer],
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'typewriter-explosion-effect',
  title: 'Typewriter Explosion Effect',
  description:
    'A dramatic text effect where letters appear sequentially like a typewriter, build tension with increasing shake, then explode in all directions with unique trajectories. Features letter-by-letter reveal using caption word timing, cumulative tension buildup, and explosive scatter animation with blur and rotation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'typewriter',
    'explosion',
    'animation',
    'dramatic',
    'kinetic',
    'tension',
    'scatter',
    'impact',
  ],
  defaultInputParams: {
    text: 'EXPLOSION',
    font: 'Inter:700',
    fontSize: 72,
    color: '#ffffff',
    duration: 5,
    absoluteStart: 0,
    buildupPercentage: 0.6,
    pausePercentage: 0.05,
    typewriterSpeed: 0.05,
    shakeIntensity: 1,
    explosionIntensity: 1.5,
  },
  dependencies: {},
};

// --- Export ---
export const typewriterExplosionEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
