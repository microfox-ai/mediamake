/**
 * Quantum Glitch Typography Preset
 *
 * This preset creates a 90s-inspired quantum computing aesthetic where text exists in multiple
 * probability states simultaneously before "collapsing" into final position. Features include:
 *
 * - **Superposition States**: Multiple semi-transparent clones of each word at different positions
 *   that converge to final position using ease-out animations with subtle bounce
 * - **Phase Shifts**: Coordinated opacity and hue-rotate animations creating intangible states
 *   while text shifts through pink/cyan color spaces
 * - **Particle Dispersion**: Individual characters occasionally break apart into scattered pixels
 *   before reforming through reverse scatter transforms
 * - **Entanglement Effects**: Words influence each other's movements through invisible connections,
 *   with complementary transforms based on distance calculations
 *
 * Technical Implementation:
 * - Uses absolute positioning with transform3d for GPU acceleration
 * - Quantum collapse: ease-out timing with opacity 0.3→1 convergence
 * - Phase shifts: coordinated hue-rotate (0deg → 180deg → 360deg) through pink/cyan spectrum
 * - Particle dispersion: characters split into spans with random scatter, then reverse
 * - Entanglement: distance-based complementary transforms using CSS custom properties
 * - Performance optimizations: will-change, staggered timing, limited simultaneous animations
 *
 * Use Cases:
 * - Tech content with quantum/cyberpunk aesthetic
 * - Music videos with experimental digital effects
 * - Social media content with eye-catching glitch effects
 * - Presentations about quantum computing or digital art
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// ═══════════════════════════════════════════════════════════════════════════
// PARAMETER SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        end: z.number(),
        duration: z.number(),
        absoluteStart: z.number(),
        absoluteEnd: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            impact: z.number().optional(),
            keyword: z.string().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption objects with word-level timing'),

  // Superposition settings
  superpositionClones: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Number of superposition clones per word (1-5)'),
  superpositionSpread: z
    .number()
    .min(20)
    .max(150)
    .default(80)
    .describe('Maximum offset distance for superposition clones in pixels'),
  collapseEasing: z
    .enum(['ease-out', 'ease-in-out', 'spring'])
    .default('ease-out')
    .describe('Easing function for quantum collapse animation'),
  collapseDuration: z
    .number()
    .min(0.2)
    .max(2)
    .default(0.5)
    .describe('Duration of collapse animation in seconds'),

  // Phase shift settings
  phaseShiftEnabled: z
    .boolean()
    .default(true)
    .describe('Enable phase shift opacity/color animations'),
  phaseShiftDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(1.2)
    .describe('Duration of phase shift cycle in seconds'),
  phaseShiftIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.6)
    .describe('Intensity of phase shift effects (0.1-1)'),

  // Particle dispersion settings
  particleDispersionEnabled: z
    .boolean()
    .default(true)
    .describe('Enable particle dispersion effects'),
  particleDispersionChance: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Probability that a word will trigger dispersion (0-1)'),
  particleScatterDistance: z
    .number()
    .min(20)
    .max(200)
    .default(100)
    .describe('Maximum scatter distance for particles in pixels'),
  particleDispersionDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of particle dispersion/reform in seconds'),

  // Entanglement settings
  entanglementEnabled: z
    .boolean()
    .default(true)
    .describe('Enable entanglement effects between words'),
  entanglementRadius: z
    .number()
    .min(50)
    .max(500)
    .default(200)
    .describe('Maximum distance for entanglement connections in pixels'),
  entanglementStrength: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Strength multiplier for entanglement effects'),

  // Typography settings
  font: z
    .string()
    .default('JetBrains Mono:700')
    .describe(
      'Font family with optional weight and style (e.g., "JetBrains Mono:700", "Courier New:600")',
    ),
  fontSize: z
    .number()
    .min(16)
    .max(120)
    .default(48)
    .describe('Base font size in pixels'),
  textColor: z.string().default('#ffffff').describe('Primary text color'),
  glowColor: z
    .string()
    .default('#ff00ff')
    .describe('Glow color for text shadows'),

  // Layout settings
  positioning: z
    .enum(['center', 'bottom', 'top'])
    .default('center')
    .describe('Vertical positioning of text'),
  wordSpacing: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .describe('Spacing between words in pixels'),

  // Performance settings
  maxSimultaneousAnimations: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Maximum number of simultaneous particle/entanglement animations'),
  staggerDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe('Delay between word animations in seconds'),
});

// ═══════════════════════════════════════════════════════════════════════════
// PRESET EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  // ─────────────────────────────────────────────────────────────────────────
  // Helper Functions
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Parse font string format: "FontName:weight:style" or "FontName:weight" or "FontName"
   */
  const parseFontString = (fontString: string) => {
    const parts = fontString.split(':');
    const family = parts[0];
    const weight = parts.length > 1 ? parseInt(parts[1], 10) : 400;
    const style = parts.length > 2 ? parts[2] : 'normal';

    return {
      family,
      weight,
      style: style as 'normal' | 'italic',
    };
  };

  /**
   * Generate random offset for superposition clones
   */
  const randomOffset = (spread: number): { x: number; y: number } => {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * spread;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };

  /**
   * Calculate distance between two words based on their index positions
   * (simplified - assumes horizontal layout)
   */
  const calculateWordDistance = (
    index1: number,
    index2: number,
    wordSpacing: number,
    avgWordWidth: number,
  ): number => {
    return Math.abs(index2 - index1) * (avgWordWidth + wordSpacing);
  };

  /**
   * Determine if word should have particle dispersion based on chance
   */
  const shouldDisperse = (
    wordIndex: number,
    totalWords: number,
    chance: number,
  ): boolean => {
    // Use seeded randomness based on word index for consistency
    const seed = (wordIndex * 9301 + 49297) % 233280;
    const random = seed / 233280;
    return random < chance;
  };

  /**
   * Create superposition clone effect (convergence animation)
   */
  const createSuperpositionEffect = (
    targetId: string,
    offset: { x: number; y: number },
    startTime: number,
    duration: number,
    easing: string,
  ): GenericEffectData => {
    return {
      type: easing as any,
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'translateX', val: offset.x, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: offset.y, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
        { key: 'opacity', val: 0.3, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };
  };

  /**
   * Create phase shift effect (opacity + hue-rotate)
   */
  const createPhaseShiftEffect = (
    targetId: string,
    startTime: number,
    duration: number,
    intensity: number,
  ): GenericEffectData => {
    const minOpacity = 0.3 + (1 - intensity) * 0.4; // 0.3 to 0.7 based on intensity
    return {
      type: 'ease-in-out',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: minOpacity, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
        {
          key: 'filter',
          val: 'hue-rotate(0deg) brightness(1)',
          prog: 0,
        },
        {
          key: 'filter',
          val: `hue-rotate(180deg) brightness(${1 + intensity * 0.3})`,
          prog: 0.5,
        },
        {
          key: 'filter',
          val: 'hue-rotate(360deg) brightness(1)',
          prog: 1,
        },
      ],
    };
  };

  /**
   * Create particle dispersion effect for individual characters
   */
  const createParticleDispersionEffect = (
    targetId: string,
    startTime: number,
    duration: number,
    scatterOffset: { x: number; y: number },
  ): GenericEffectData => {
    const halfDuration = duration / 2;
    return {
      type: 'ease-in-out',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Scatter phase
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: scatterOffset.x, prog: 0.5 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: scatterOffset.y, prog: 0.5 },
        { key: 'translateY', val: 0, prog: 1 },
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.3, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: Math.random() * 360 - 180, prog: 0.5 },
        { key: 'rotate', val: 0, prog: 1 },
      ],
    };
  };

  /**
   * Create entanglement effect (complementary transforms)
   */
  const createEntanglementEffect = (
    targetId: string,
    startTime: number,
    duration: number,
    distance: number,
    strength: number,
  ): GenericEffectData => {
    const influence = Math.max(0, 1 - distance / 300) * strength;
    const translateAmount = influence * 10;

    return {
      type: 'ease-in-out',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -translateAmount, prog: 0.5 },
        { key: 'translateY', val: 0, prog: 1 },
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1 + influence * 0.05, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Main Execution
  // ─────────────────────────────────────────────────────────────────────────

  const font = parseFontString(params.font);
  const avgWordWidth = params.fontSize * 5; // Rough estimate

  // Positioning class based on parameter
  const positioningClass =
    params.positioning === 'bottom'
      ? 'items-end pb-16'
      : params.positioning === 'top'
      ? 'items-start pt-16'
      : 'items-center';

  const captionContainers: RenderableComponentData[] = [];

  // Track animation counter for performance limiting
  let activeAnimationCount = 0;

  for (const caption of params.captions) {
    const wordComponents: RenderableComponentData[] = [];
    const allEffects: any[] = [];

    for (let wordIndex = 0; wordIndex < caption.words.length; wordIndex++) {
      const word = caption.words[wordIndex];
      const wordId = `word-${caption.id}-${wordIndex}`;
      const impact = caption.metadata?.impact ?? 1.0;
      const staggerOffset = wordIndex * params.staggerDelay;

      // ─── Main Word Component ───
      const wordTextData: TextAtomData = {
        text: word.text,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          fontWeight: font.weight,
          fontStyle: font.style,
          textShadow: `0 0 10px ${params.glowColor}, 0 0 20px ${params.glowColor}80`,
          marginRight: `${params.wordSpacing}px`,
          position: 'relative',
          display: 'inline-block',
        },
        font: {
          family: font.family,
          weights: [font.weight.toString()],
        },
      };

      const mainWordComponent: RenderableComponentData = {
        id: wordId,
        componentId: 'TextAtom',
        type: 'atom' as const,
        data: wordTextData,
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [],
      };

      // ─── Superposition Clones ───
      const cloneComponents: RenderableComponentData[] = [];
      for (let i = 0; i < params.superpositionClones; i++) {
        const cloneId = `${wordId}-clone-${i}`;
        const offset = randomOffset(params.superpositionSpread);
        const blurAmount = 2 + i;
        const opacity = 0.3 - i * 0.05;

        // Clone color shifts between pink and cyan
        const cloneColor = i % 2 === 0 ? '#ff00ff' : '#00ffff';

        const cloneData: TextAtomData = {
          text: word.text,
          style: {
            fontSize: params.fontSize,
            color: cloneColor,
            fontWeight: font.weight,
            fontStyle: font.style,
            filter: `blur(${blurAmount}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            opacity: opacity,
            pointerEvents: 'none',
          },
          font: {
            family: font.family,
            weights: [font.weight.toString()],
          },
        };

        const cloneComponent: RenderableComponentData = {
          id: cloneId,
          componentId: 'TextAtom',
          type: 'atom' as const,
          data: cloneData,
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects: [],
        };

        // Superposition collapse effect
        const collapseEffect = createSuperpositionEffect(
          cloneId,
          offset,
          staggerOffset,
          params.collapseDuration * impact,
          params.collapseEasing,
        );

        allEffects.push({
          id: `collapse-${cloneId}`,
          componentId: 'generic',
          data: collapseEffect,
        });

        cloneComponents.push(cloneComponent);
      }

      // ─── Phase Shift Effect ───
      if (params.phaseShiftEnabled) {
        const phaseEffect = createPhaseShiftEffect(
          wordId,
          staggerOffset + params.collapseDuration,
          params.phaseShiftDuration * impact,
          params.phaseShiftIntensity,
        );

        allEffects.push({
          id: `phase-${wordId}`,
          componentId: 'generic',
          data: phaseEffect,
        });
      }

      // ─── Particle Dispersion Effect ───
      if (
        params.particleDispersionEnabled &&
        shouldDisperse(
          wordIndex,
          caption.words.length,
          params.particleDispersionChance,
        ) &&
        activeAnimationCount < params.maxSimultaneousAnimations
      ) {
        activeAnimationCount++;

        // Split word into character particles
        const chars = word.text.split('');
        const particleComponents: RenderableComponentData[] = [];

        for (let charIndex = 0; charIndex < chars.length; charIndex++) {
          const char = chars[charIndex];
          const particleId = `${wordId}-particle-${charIndex}`;
          const scatterOffset = randomOffset(params.particleScatterDistance);

          const particleData = {
            html: `<span style="display: inline-block;">${char}</span>`,
            style: {
              fontSize: params.fontSize,
              color: params.textColor,
              fontWeight: font.weight,
              fontStyle: font.style,
              display: 'inline-block',
            },
          };

          const particleComponent: RenderableComponentData = {
            id: particleId,
            componentId: 'HTMLBlockAtom',
            type: 'atom' as const,
            data: particleData,
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects: [],
          };

          // Dispersion effect starts mid-way through word display
          const dispersionStart =
            staggerOffset +
            params.collapseDuration +
            word.duration * 0.3 +
            charIndex * 0.05;

          const dispersionEffect = createParticleDispersionEffect(
            particleId,
            dispersionStart,
            params.particleDispersionDuration,
            scatterOffset,
          );

          allEffects.push({
            id: `dispersion-${particleId}`,
            componentId: 'generic',
            data: dispersionEffect,
          });

          particleComponents.push(particleComponent);
        }

        // Create particle container
        const particleContainerId = `${wordId}-particles`;
        const particleContainer: RenderableComponentData = {
          id: particleContainerId,
          componentId: 'BaseLayout',
          type: 'layout' as const,
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                display: 'inline-block',
                position: 'absolute',
                top: 0,
                left: 0,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          childrenData: particleComponents,
        };

        wordComponents.push(particleContainer);
      }

      // ─── Entanglement Effect ───
      if (
        params.entanglementEnabled &&
        wordIndex > 0 &&
        activeAnimationCount < params.maxSimultaneousAnimations
      ) {
        // Calculate distance to previous word
        const distance = calculateWordDistance(
          wordIndex - 1,
          wordIndex,
          params.wordSpacing,
          avgWordWidth,
        );

        if (distance < params.entanglementRadius) {
          activeAnimationCount++;

          const entanglementStart =
            staggerOffset +
            params.collapseDuration +
            params.phaseShiftDuration * 0.5;

          const entanglementEffect = createEntanglementEffect(
            wordId,
            entanglementStart,
            1.5 * impact,
            distance,
            params.entanglementStrength,
          );

          allEffects.push({
            id: `entangle-${wordId}`,
            componentId: 'generic',
            data: entanglementEffect,
          });
        }
      }

      // ─── Word Group Container ───
      const wordGroupId = `word-group-${caption.id}-${wordIndex}`;
      const wordGroup: RenderableComponentData = {
        id: wordGroupId,
        componentId: 'BaseLayout',
        type: 'layout' as const,
        data: {
          containerProps: {
            className: 'relative inline-flex',
            style: {
              willChange: 'transform, opacity',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: [...cloneComponents, mainWordComponent],
      };

      wordComponents.push(wordGroup);
    }

    // Reset animation counter for next caption
    activeAnimationCount = 0;

    // ─── Caption Container ───
    const captionId = `caption-${caption.id}`;
    const captionContainer: RenderableComponentData = {
      id: captionId,
      componentId: 'BaseLayout',
      type: 'layout' as const,
      data: {
        containerProps: {
          className: `absolute inset-0 flex ${positioningClass} justify-center px-8`,
          style: {
            perspective: '1000px',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      effects: allEffects,
      childrenData: wordComponents,
    };

    captionContainers.push(captionContainer);
  }

  // ─── Root Container ───
  const rootContainer: RenderableComponentData = {
    id: 'quantum-glitch-root',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#0a0a0f',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration:
          params.captions.length > 0
            ? Math.max(
                ...params.captions.map((c) => c.absoluteEnd),
              )
            : 10,
      },
    },
    childrenData: captionContainers,
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

// ═══════════════════════════════════════════════════════════════════════════
// METADATA
// ═══════════════════════════════════════════════════════════════════════════

const presetMetadata: PresetMetadata = {
  id: 'quantum-glitch-typography',
  title: 'Quantum Glitch Typography',
  description:
    '90s-inspired quantum computing typography preset featuring superposition states where words appear in multiple probability positions before collapsing, phase shift animations with pink/cyan color space transitions, particle dispersion effects where characters scatter and reform, and entanglement animations linking related words through invisible quantum connections.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'quantum',
    'glitch',
    'cyberpunk',
    '90s',
    'superposition',
    'phase-shift',
    'particle-dispersion',
    'entanglement',
    'kinetic',
    'experimental',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Quantum Typography',
        start: 0,
        end: 2.5,
        duration: 2.5,
        absoluteStart: 0,
        absoluteEnd: 2.5,
        words: [
          {
            text: 'Quantum',
            start: 0,
            end: 1.0,
            duration: 1.0,
            absoluteStart: 0,
            absoluteEnd: 1.0,
          },
          {
            text: 'Typography',
            start: 1.0,
            end: 2.5,
            duration: 1.5,
            absoluteStart: 1.0,
            absoluteEnd: 2.5,
          },
        ],
        metadata: {
          impact: 1.2,
        },
      },
    ],
    superpositionClones: 3,
    superpositionSpread: 80,
    collapseEasing: 'ease-out',
    collapseDuration: 0.5,
    phaseShiftEnabled: true,
    phaseShiftDuration: 1.2,
    phaseShiftIntensity: 0.6,
    particleDispersionEnabled: true,
    particleDispersionChance: 0.3,
    particleScatterDistance: 100,
    particleDispersionDuration: 0.8,
    entanglementEnabled: true,
    entanglementRadius: 200,
    entanglementStrength: 1,
    font: 'JetBrains Mono:700',
    fontSize: 48,
    textColor: '#ffffff',
    glowColor: '#ff00ff',
    positioning: 'center',
    wordSpacing: 20,
    maxSimultaneousAnimations: 3,
    staggerDelay: 0.1,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const quantumGlitchTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
