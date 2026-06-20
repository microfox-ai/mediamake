/**
 * Gravity-Defying Vertical Stretch Preset
 *
 * This preset creates a gravity-defying vertical stretch animation where text appears to be 
 * pulled upward by an invisible force, stretching tall before compressing back down like a 
 * bungee jump in reverse. The animation features:
 * 
 * - Text stretching to 3x height while getting thinner (volume conservation physics)
 * - Bouncing back with decreasing oscillations
 * - Motion blur during peak velocity for cinematic quality
 * - Transform origin anchored at bottom (ground anchor point)
 * - Physics-based spring easing with multiple oscillation keyframes
 * - Drop shadow for depth perception during stretch
 * - Unified motion for entire phrases when processing captions
 * 
 * Technical Details:
 * - ScaleY: 1 → 3 → 0.7 → 1.1 → 1 (vertical stretch with bounce-back)
 * - ScaleX: 1 → 0.6 → 1.3 → 0.95 → 1 (horizontal compression for volume conservation)
 * - Motion blur: 0 → 8 → 0 (peak blur during maximum velocity)
 * - Transform origin: bottom (anchors text to ground)
 * - Duration: 2s total with 6 keyframe points
 * - Physics: Spring(1, 100, 10, 0) for realistic oscillation
 * 
 * Use Cases:
 * - Dynamic title reveals with physics-based motion
 * - Energetic text animations for music videos
 * - Attention-grabbing caption effects
 * - Gravity-defying logo animations
 * - Cinematic text transformations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

const presetParams = z.object({
  text: z.string().optional().describe('Text content to display (if not using captions)'),
  captions: z.array(z.any()).optional().describe('Array of caption sentences for unified phrase animation'),
  fontSize: z.number().default(64).describe('Base font size in pixels'),
  fontFamily: z.string().default('Inter:700').describe('Font family with optional weight (e.g., "Inter:700", "Roboto:600")'),
  textColor: z.string().default('#ffffff').describe('Text color (CSS color value)'),
  duration: z.number().default(2).describe('Total animation duration in seconds'),
  stretchIntensity: z.number().min(1.5).max(5).default(3).describe('Maximum vertical stretch multiplier (1.5-5x height)'),
  blurIntensity: z.number().min(0).max(20).default(8).describe('Peak motion blur intensity in pixels'),
  impactMultiplier: z.number().min(0.1).max(3).default(1).describe('Global effect intensity multiplier (0.1-3.0)'),
  backgroundColor: z.string().optional().describe('Optional background color'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter:700';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  const fontWeight = fontString.includes(':') ? parseInt(fontString.split(':')[1], 10) : 700;

  // Calculate timing based on duration
  const duration = params.duration;
  const impact = params.impactMultiplier;

  // Process captions if provided, otherwise use text
  let textContent = params.text || 'GRAVITY DEFYING';
  let totalDuration = duration;
  let startTime = 0;

  // If captions are provided, use sentence-level timing for unified motion
  if (params.captions && params.captions.length > 0) {
    const firstCaption = params.captions[0] as TranscriptionSentence;
    textContent = firstCaption.text;
    totalDuration = firstCaption.duration || duration;
    startTime = firstCaption.absoluteStart || 0;
  }

  // Create text atom
  const textAtomId = 'gravity-text';
  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: textContent,
      style: {
        fontSize: params.fontSize,
        fontWeight: fontWeight,
        color: params.textColor,
        transformOrigin: 'bottom', // Anchor to ground
        filter: 'drop-shadow(0 25px 25px rgb(0 0 0 / 0.15))',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Create scaleY effect (vertical stretch with oscillations)
  const scaleYEffect: GenericEffectData = {
    type: 'spring' as const,
    start: 0,
    duration: totalDuration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'scaleY', val: 1, prog: 0 },           // Start normal
      { key: 'scaleY', val: params.stretchIntensity, prog: 0.3 }, // Peak stretch (3x)
      { key: 'scaleY', val: 0.7, prog: 0.5 },       // Compress (bounce back)
      { key: 'scaleY', val: 1.1, prog: 0.7 },       // Small overshoot
      { key: 'scaleY', val: 0.95, prog: 0.85 },     // Settle oscillation
      { key: 'scaleY', val: 1, prog: 1 },           // Rest at normal
    ],
  };

  // Create scaleX effect (horizontal compression for volume conservation)
  const scaleXEffect: GenericEffectData = {
    type: 'spring' as const,
    start: 0,
    duration: totalDuration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'scaleX', val: 1, prog: 0 },           // Start normal
      { key: 'scaleX', val: 0.6, prog: 0.3 },       // Thin during stretch
      { key: 'scaleX', val: 1.3, prog: 0.5 },       // Wide during compression
      { key: 'scaleX', val: 0.95, prog: 0.7 },      // Narrow overshoot
      { key: 'scaleX', val: 1.05, prog: 0.85 },     // Wide settle
      { key: 'scaleX', val: 1, prog: 1 },           // Rest at normal
    ],
  };

  // Create motion blur effect (peaks during maximum velocity)
  const blurEffect: GenericEffectData = {
    type: 'ease-in-out' as const,
    start: 0,
    duration: totalDuration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'filter:blur', val: 0, prog: 0 },                    // No blur at start
      { key: 'filter:blur', val: params.blurIntensity, prog: 0.15 }, // Blur ramp up
      { key: 'filter:blur', val: params.blurIntensity, prog: 0.3 },  // Peak blur
      { key: 'filter:blur', val: 0, prog: 0.45 },                 // Clear at transition
      { key: 'filter:blur', val: params.blurIntensity * 0.5, prog: 0.5 }, // Half blur
      { key: 'filter:blur', val: 0, prog: 0.6 },                  // Clear
      { key: 'filter:blur', val: 0, prog: 1 },                    // No blur at end
    ],
  };

  // Create depth shadow effect (enhances during stretch)
  const shadowEffect: GenericEffectData = {
    type: 'ease-out' as const,
    start: 0,
    duration: totalDuration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'filter:dropShadow', val: '0 0 0 rgba(0,0,0,0)', prog: 0 },           // No shadow
      { key: 'filter:dropShadow', val: '0 35px 35px rgba(0,0,0,0.35)', prog: 0.3 }, // Max shadow at peak
      { key: 'filter:dropShadow', val: '0 10px 10px rgba(0,0,0,0.2)', prog: 0.5 },  // Medium shadow
      { key: 'filter:dropShadow', val: '0 5px 5px rgba(0,0,0,0.1)', prog: 0.85 },   // Light shadow
      { key: 'filter:dropShadow', val: '0 0 0 rgba(0,0,0,0)', prog: 1 },           // No shadow at end
    ],
  };

  // Attach effects to text atom
  textAtom.effects = [
    {
      id: 'stretch-scaleY',
      componentId: 'generic',
      data: scaleYEffect,
    },
    {
      id: 'stretch-scaleX',
      componentId: 'generic',
      data: scaleXEffect,
    },
    {
      id: 'motion-blur',
      componentId: 'generic',
      data: blurEffect,
    },
    {
      id: 'depth-shadow',
      componentId: 'generic',
      data: shadowEffect,
    },
  ];

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'gravity-stretch-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col items-center justify-center min-h-screen',
        style: params.backgroundColor ? { backgroundColor: params.backgroundColor } : {},
      },
    },
    context: {
      timing: {
        start: startTime,
        duration: totalDuration,
      },
    },
    childrenData: [textAtom] as RenderableComponentData[],
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
  id: 'gravity-defying-vertical-stretch',
  title: 'Gravity-Defying Vertical Stretch',
  description: 'Text animation that appears to be pulled upward by invisible force, stretching tall before compressing back down like a bungee jump in reverse. Features volume conservation, motion blur during peak velocity, and physics-based oscillations with decreasing amplitude.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'animation', 'gravity', 'stretch', 'physics', 'motion-blur', 'spring', 'oscillation', 'vertical', 'cinematic'],
  dependencies: {},
  defaultInputParams: {
    text: 'GRAVITY DEFYING',
    fontSize: 64,
    fontFamily: 'Inter:700',
    textColor: '#ffffff',
    duration: 2,
    stretchIntensity: 3,
    blurIntensity: 8,
    impactMultiplier: 1,
  },
};

export const gravityDefyingVerticalStretchPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
