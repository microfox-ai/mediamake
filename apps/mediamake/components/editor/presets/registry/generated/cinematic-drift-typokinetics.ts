/**
 * Cinematic Drift Typokinetics Preset
 *
 * Art-house film end credit inspired preset featuring horizontal text drift combined with 
 * subtle breathing scale animation. Text glides left-to-right while scaling from 95% to 105% 
 * and back, creating a dolly-zoom effect. Includes synchronized letterSpacing expansion/contraction 
 * and subtle rotation for organic imperfection. Uses elegant Playfair Display thin serif font 
 * with atmospheric glow.
 *
 * Features:
 * - **Horizontal Drift**: Text moves smoothly from right to left across the screen
 * - **Breathing Scale**: Subtle scale animation (95% → 105% → 95%) creates depth perception
 * - **Letter Spacing Breathing**: Synchronized letterSpacing animation (0.1em → 0.3em → 0.1em)
 * - **Subtle Rotation**: Organic imperfection with gentle rotation (-0.5° → 0.5° → -0.5°)
 * - **Atmospheric Glow**: Text shadow animation for depth and cinematic feel
 * - **Opacity Breathing**: Gentle opacity pulsing (0.8 → 1 → 0.8) for ethereal effect
 * - **3D Transform Space**: Uses preserve-3d for enhanced depth perception
 *
 * Use cases:
 * - End credit sequences for art-house films
 * - Cinematic text reveals with dolly-zoom aesthetic
 * - Elegant floating text overlays
 * - Sophisticated title sequences
 * - Meditative, slow-paced visual poetry
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  userText: z.string().default('CINEMATIC DRIFT').describe('Text content to display with cinematic drift effect'),
  duration: z.number().min(3).max(60).default(10).describe('Duration of the animation in seconds'),
  fontSize: z.number().min(24).max(200).default(72).describe('Font size in pixels'),
  textColor: z.string().default('#FFFFFF').describe('Text color (hex or CSS color)'),
  fontFamily: z.string().default('Playfair Display').describe('Font family (Google Font name)'),
  fontWeight: z.string().default('300').describe('Font weight (e.g., 300, 400, 700)'),
  driftDistance: z.number().min(10).max(200).default(50).describe('Horizontal drift distance in percentage of screen width'),
  scaleMin: z.number().min(0.5).max(1).default(0.95).describe('Minimum scale value (breathing scale effect)'),
  scaleMax: z.number().min(1).max(2).default(1.05).describe('Maximum scale value (breathing scale effect)'),
  letterSpacingMin: z.number().min(0).max(1).default(0.1).describe('Minimum letter spacing in em units'),
  letterSpacingMax: z.number().min(0).max(2).default(0.3).describe('Maximum letter spacing in em units'),
  rotationRange: z.number().min(0).max(5).default(0.5).describe('Rotation range in degrees for organic imperfection'),
  glowIntensity: z.number().min(0).max(1).default(0.5).describe('Intensity of text shadow glow effect (0-1)'),
  opacityMin: z.number().min(0.3).max(1).default(0.8).describe('Minimum opacity for breathing effect'),
  opacityMax: z.number().min(0.5).max(1).default(1).describe('Maximum opacity for breathing effect'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    userText,
    duration,
    fontSize,
    textColor,
    fontFamily,
    fontWeight,
    driftDistance,
    scaleMin,
    scaleMax,
    letterSpacingMin,
    letterSpacingMax,
    rotationRange,
    glowIntensity,
    opacityMin,
    opacityMax,
  } = params;

  // Component IDs
  const rootContainerId = 'cinematic-drift-root-container';
  const textElementId = 'cinematic-drift-text-element';

  // Calculate glow values based on intensity
  const glowMin = 20 * glowIntensity;
  const glowMax = 40 * glowIntensity;
  const glowOpacityMin = 0.1 * glowIntensity;
  const glowOpacityMax = 0.2 * glowIntensity;

  // Convert letterSpacing from em to pixels for effect animation
  const letterSpacingMinPx = letterSpacingMin * fontSize;
  const letterSpacingMaxPx = letterSpacingMax * fontSize;

  // Create text element with effects
  const textElement: RenderableComponentData = {
    id: textElementId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: userText,
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        fontWeight: fontWeight,
        textAlign: 'center' as const,
        textShadow: `0 0 ${glowMin}px rgba(255,255,255,${glowOpacityMin})`,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        subsets: ['latin'],
        display: 'swap' as const,
        preload: true,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Main compound effect: translateX, scale, rotate
      {
        id: 'drift-scale-rotate-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [textElementId],
          ranges: [
            // Horizontal drift (right to left)
            { key: 'translateX', val: driftDistance, prog: 0 },
            { key: 'translateX', val: -driftDistance, prog: 1 },
            // Breathing scale (approach and recede)
            { key: 'scale', val: scaleMin, prog: 0 },
            { key: 'scale', val: scaleMax, prog: 0.5 },
            { key: 'scale', val: scaleMin, prog: 1 },
            // Subtle rotation for organic imperfection
            { key: 'rotate', val: -rotationRange, prog: 0 },
            { key: 'rotate', val: rotationRange, prog: 0.5 },
            { key: 'rotate', val: -rotationRange, prog: 1 },
          ],
        },
      },
      // Letter spacing breathing effect
      {
        id: 'letter-spacing-breathing-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [textElementId],
          ranges: [
            { key: 'letterSpacing', val: letterSpacingMinPx, prog: 0 },
            { key: 'letterSpacing', val: letterSpacingMaxPx, prog: 0.5 },
            { key: 'letterSpacing', val: letterSpacingMinPx, prog: 1 },
          ],
        },
      },
      // Glow/text shadow pulsing effect
      {
        id: 'glow-pulse-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [textElementId],
          ranges: [
            { key: 'textShadow', val: `0 0 ${glowMin}px rgba(255,255,255,${glowOpacityMin})`, prog: 0 },
            { key: 'textShadow', val: `0 0 ${glowMax}px rgba(255,255,255,${glowOpacityMax})`, prog: 0.5 },
            { key: 'textShadow', val: `0 0 ${glowMin}px rgba(255,255,255,${glowOpacityMin})`, prog: 1 },
          ],
        },
      },
      // Opacity breathing effect
      {
        id: 'opacity-breathing-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [textElementId],
          ranges: [
            { key: 'opacity', val: opacityMin, prog: 0 },
            { key: 'opacity', val: opacityMax, prog: 0.5 },
            { key: 'opacity', val: opacityMin, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create root container with 3D transform space
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      {
        id: `${rootContainerId}-inner-wrapper`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center text-white',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [textElement],
      },
    ],
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
  id: 'cinematicDriftTypokinetics',
  title: 'Cinematic Drift Typokinetics',
  description: 'Art-house film end credit inspired preset featuring horizontal text drift combined with subtle breathing scale animation. Text glides left-to-right while scaling from 95% to 105% and back, creating a dolly-zoom effect. Includes synchronized letterSpacing expansion/contraction and subtle rotation for organic imperfection. Uses elegant Playfair Display thin serif font with atmospheric glow.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'cinematic', 'drift', 'scale', 'breathing', 'end-credits', 'art-house', 'elegant', 'dolly-zoom', 'letter-spacing', 'glow', 'rotation', 'organic'],
  dependencies: {},
  defaultInputParams: {
    userText: 'CINEMATIC DRIFT',
    duration: 10,
    fontSize: 72,
    textColor: '#FFFFFF',
    fontFamily: 'Playfair Display',
    fontWeight: '300',
    driftDistance: 50,
    scaleMin: 0.95,
    scaleMax: 1.05,
    letterSpacingMin: 0.1,
    letterSpacingMax: 0.3,
    rotationRange: 0.5,
    glowIntensity: 0.5,
    opacityMin: 0.8,
    opacityMax: 1,
  },
};

// Export preset
export const cinematicDriftTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
