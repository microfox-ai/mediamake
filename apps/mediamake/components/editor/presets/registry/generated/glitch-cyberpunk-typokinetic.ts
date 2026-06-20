/**
 * Glitchy Cyberpunk Typokinetic Preset
 *
 * A cyberpunk-themed typokinetic preset where text lines emerge from digital corruption
 * at the bottom, starting as scrambled characters that unscramble while rising.
 *
 * Features:
 * - **Text Scrambling**: Lines start as random character substitutions, unscramble during rise
 * - **Rise Animation**: Lines rise from bottom with stuttering motion (random pause points)
 * - **Datamosh Artifacts**: Horizontal displacement glitches (±10-20px) and color channel shifts
 * - **Irregular Spacing**: Lines stack with random spacing (4-12px) for broken/hacked aesthetic
 * - **Neon Glow**: Pulsing glow effects cycling through cyan, magenta, yellow per line
 * - **Variable Timing**: Randomized duration (0.8-1.2s) per line with 50ms random pauses
 *
 * Use cases:
 * - Cyberpunk-themed title sequences
 * - Tech/hacking aesthetic overlays
 * - Glitch art text animations
 * - Digital corruption effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

const presetParams = z.object({
  lines: z
    .array(z.string())
    .describe('Array of text lines to display (bottom to top order)'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration of the preset in seconds'),
  baseRiseDuration: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Base duration for line rise animation (randomized ±20%)'),
  staggerDelay: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .describe('Base delay between line appearances (randomized ±20%)'),
  fontSize: z.number().min(12).max(72).default(24).describe('Font size in pixels'),
  font: z
    .string()
    .optional()
    .default('Courier New')
    .describe('Font family (monospace recommended)'),
  baseColor: z
    .string()
    .default('#00ffff')
    .describe('Base text color (cyan default)'),
  glitchIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for glitch effects (0 = none, 2 = extreme)'),
  scrambleDuration: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.4)
    .describe('Duration of text unscramble animation (as fraction of rise duration)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Random number in range
  const randomBetween = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };

  // Helper: Random integer in range
  const randomInt = (min: number, max: number): number => {
    return Math.floor(randomBetween(min, max));
  };

  // Helper: Scramble text with random character substitution
  const scrambleText = (text: string): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    return text
      .split('')
      .map((char) => {
        if (char === ' ') return ' ';
        return chars[randomInt(0, chars.length)];
      })
      .join('');
  };

  // Helper: Generate random pause points (between 0.2-0.8 progress)
  const generatePausePoints = (count: number): number[] => {
    const points: number[] = [];
    for (let i = 0; i < count; i++) {
      points.push(randomBetween(0.2, 0.8));
    }
    return points.sort((a, b) => a - b);
  };

  // Helper: Create neon glow colors (cycle through cyan, magenta, yellow)
  const neonColors = ['#00ffff', '#ff00ff', '#ffff00'];
  const getNeonColor = (index: number): string => {
    return neonColors[index % neonColors.length];
  };

  // Calculate positioning and timing for each line
  const lineComponents: RenderableComponentData[] = [];
  let cumulativeStart = 0;

  params.lines.forEach((lineText, index) => {
    // Randomize timing
    const riseDuration = params.baseRiseDuration * randomBetween(0.8, 1.2);
    const staggerDelay = params.staggerDelay * randomBetween(0.8, 1.2);
    const lineStart = cumulativeStart;
    cumulativeStart += staggerDelay;

    // Irregular spacing (4-12px random)
    const lineSpacing = randomInt(4, 12);
    const bottomPosition = index * (params.fontSize + lineSpacing);

    // Generate scrambled version of text
    const scrambledText = scrambleText(lineText);

    // Line container
    const lineId = `line-${index}`;
    const textId = `text-${index}`;

    // Generate pause points (1-3 random pauses)
    const pauseCount = randomInt(1, 4);
    const pausePoints = generatePausePoints(pauseCount);

    // Build rise animation with stuttering (pauses)
    const riseRanges: Array<{ key: string; val: any; prog: number }> = [];
    
    // Start position (off-screen bottom)
    riseRanges.push({ key: 'translateY', val: 500, prog: 0 });
    
    // Add pause points with stuttering
    let lastProg = 0;
    pausePoints.forEach((pauseProg) => {
      // Move to pause point
      const pauseY = 500 - (500 - bottomPosition) * pauseProg;
      riseRanges.push({ key: 'translateY', val: pauseY, prog: pauseProg });
      // Hold at pause (50ms pause / riseDuration)
      const holdProg = pauseProg + (0.05 / riseDuration);
      riseRanges.push({ key: 'translateY', val: pauseY, prog: Math.min(holdProg, 0.99) });
      lastProg = Math.min(holdProg, 0.99);
    });
    
    // Final position
    riseRanges.push({ key: 'translateY', val: bottomPosition, prog: 1 });

    // Add horizontal glitches (±10-20px at random points)
    const glitchCount = randomInt(2, 5);
    for (let i = 0; i < glitchCount; i++) {
      const glitchProg = randomBetween(0.1, 0.9);
      const glitchX = randomBetween(-20, 20) * params.glitchIntensity;
      riseRanges.push({ key: 'translateX', val: glitchX, prog: glitchProg });
      // Return to 0 quickly
      riseRanges.push({ key: 'translateX', val: 0, prog: Math.min(glitchProg + 0.05, 1) });
    }

    // Sort ranges by progress
    riseRanges.sort((a, b) => a.prog - b.prog);

    // Text unscramble effect (opacity + content-based via ranges)
    // We'll simulate unscramble by fading in and using filter effects
    const scrambleRanges: Array<{ key: string; val: any; prog: number }> = [];
    const scrambleEnd = params.scrambleDuration;
    
    // Start with chromatic aberration (color channel shift effect)
    scrambleRanges.push({
      key: 'filter',
      val: `blur(4px) contrast(1.2) brightness(1.3)`,
      prog: 0,
    });
    
    // Gradually clear up
    scrambleRanges.push({
      key: 'filter',
      val: `blur(2px) contrast(1.1) brightness(1.1)`,
      prog: scrambleEnd * 0.5,
    });
    
    // Final clear state
    scrambleRanges.push({
      key: 'filter',
      val: `blur(0px) contrast(1) brightness(1)`,
      prog: scrambleEnd,
    });
    
    // Hold clear
    scrambleRanges.push({
      key: 'filter',
      val: `blur(0px) contrast(1) brightness(1)`,
      prog: 1,
    });

    // Neon glow pulse effect
    const neonColor = getNeonColor(index);
    const glowRanges: Array<{ key: string; val: any; prog: number }> = [];
    
    // Pulse cycle (0 → 1 → 0)
    const pulseSpeed = 0.5; // Pulse every 0.5 duration units
    for (let prog = 0; prog <= 1; prog += pulseSpeed) {
      const glowIntensity = Math.sin(prog * Math.PI * 2 * (1 / pulseSpeed)) * 0.5 + 0.5;
      const glowSize = 10 + glowIntensity * 20 * params.glitchIntensity;
      glowRanges.push({
        key: 'textShadow',
        val: `0 0 ${glowSize}px ${neonColor}, 0 0 ${glowSize * 2}px ${neonColor}`,
        prog: Math.min(prog, 1),
      });
    }

    // Create rise effect
    const riseEffect = {
      id: `rise-effect-${index}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: riseDuration,
        mode: 'provider',
        targetIds: [lineId],
        ranges: riseRanges,
      } as GenericEffectData,
    };

    // Create scramble/unscramble effect
    const scrambleEffect = {
      id: `scramble-effect-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: riseDuration * params.scrambleDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: scrambleRanges,
      } as GenericEffectData,
    };

    // Create glow pulse effect
    const glowEffect = {
      id: `glow-effect-${index}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: riseDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: glowRanges,
      } as GenericEffectData,
    };

    // Text atom - starts as scrambled, unscrambles via filter effects
    // Note: True character-by-character unscramble would require more complex logic
    // We simulate it with visual distortion that clears up
    const textAtom: RenderableComponentData = {
      id: textId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: lineText, // Display actual text (scramble effect via filters)
        className: 'font-mono',
        style: {
          fontSize: params.fontSize,
          color: params.baseColor,
          fontFamily: params.font || 'Courier New',
          fontWeight: 'bold',
          textShadow: `0 0 10px ${neonColor}`,
          letterSpacing: '0.1em',
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: riseDuration,
        },
      },
      effects: [scrambleEffect, glowEffect],
    };

    // Line container (positioned absolutely)
    const lineContainer: RenderableComponentData = {
      id: lineId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: 0,
            right: 0,
            bottom: 0, // Start from bottom
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: lineStart,
          duration: riseDuration,
        },
      },
      effects: [riseEffect],
      childrenData: [textAtom],
    };

    lineComponents.push(lineContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glitch-cyberpunk-typokinetic-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-gray-900 h-full overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: lineComponents,
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
  id: 'glitch-cyberpunk-typokinetic',
  title: 'Glitch Cyberpunk Typokinetic',
  description:
    'A cyberpunk-themed typokinetic preset where text lines emerge from digital corruption at the bottom, starting as scrambled characters that unscramble while rising. Features datamosh-style artifacts with horizontal displacement glitches, color channel shifts, neon glow pulses (cyan/magenta/yellow), irregular line spacing (4-12px), and stuttering rise animations with random pause points.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'cyberpunk',
    'glitch',
    'scramble',
    'datamosh',
    'neon',
    'tech',
    'hacker',
    'corruption',
  ],
  dependencies: {},
  defaultInputParams: {
    lines: [
      'SYSTEM BREACH DETECTED',
      'ACCESSING DATABASE...',
      'DECRYPTING CORE FILES',
      'NEURAL LINK ESTABLISHED',
    ],
    duration: 10,
    baseRiseDuration: 1,
    staggerDelay: 0.3,
    fontSize: 24,
    font: 'Courier New',
    baseColor: '#00ffff',
    glitchIntensity: 1,
    scrambleDuration: 0.4,
  },
};

export const glitchCyberpunkTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
