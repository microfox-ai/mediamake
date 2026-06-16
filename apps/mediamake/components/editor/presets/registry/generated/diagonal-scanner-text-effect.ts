/**
 * Diagonal Scanner Text Effect Preset
 *
 * This preset creates a diagonal scanning beam effect that sweeps across text from 
 * top-left to bottom-right, creating an energizing animation with a glowing edge, 
 * brightness trail, and subtle particle sparkles.
 *
 * Features:
 * - **Diagonal Sweep Animation**: Gradient beam moves diagonally across text
 * - **Glowing Edge Effect**: Bright glow at the sweep edge
 * - **Brightness Trail**: Enhanced brightness that follows the sweep with delay
 * - **Particle Sparkles**: Subtle sparkle effects at the sweep edge
 * - **Audio-Reactive**: Optional waveform-based speed modulation
 * - **Customizable Colors**: Configure scan color, glow color, trail color, and sparkles
 * - **Flexible Timing**: Configurable sweep duration and easing
 *
 * Use cases:
 * - Creating energizing title animations
 * - Building sci-fi or tech-themed text effects
 * - Adding dynamic scanning effects to logos
 * - Creating attention-grabbing text reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  
  // Typography
  fontSize: z.string().optional().default('72px').describe('Font size (e.g., "72px", "4rem")'),
  fontWeight: z.string().optional().default('bold').describe('Font weight (e.g., "bold", "700")'),
  fontFamily: z.string().optional().default('Inter').describe('Font family name'),
  textColor: z.string().optional().default('#ffffff').describe('Base text color'),
  
  // Scanner colors
  glowColor: z.string().optional().default('rgba(100,200,255,0.8)').describe('Glow color at scanner edge'),
  scanColor: z.string().optional().default('rgba(255,255,255,0.6)').describe('Main scanner beam color'),
  trailColor: z.string().optional().default('rgba(255,255,255,0.3)').describe('Brightness trail color'),
  sparkleColor: z.string().optional().default('rgba(255,255,255,0.9)').describe('Particle sparkle color'),
  
  // Timing
  duration: z.number().optional().default(3).describe('Total duration of the effect in seconds'),
  sweepDuration: z.number().optional().default(2).describe('Duration of the scanner sweep in seconds'),
  sweepDelay: z.number().optional().default(0).describe('Delay before sweep starts in seconds'),
  trailDelay: z.number().optional().default(0.2).describe('Delay for brightness trail in seconds'),
  
  // Effect intensity
  intensity: z.number().min(0.1).max(2).optional().default(1).describe('Overall effect intensity multiplier'),
  
  // Audio-reactive
  audioSrc: z.string().optional().describe('Optional audio source for audio-reactive sweep speed modulation'),
  audioSensitivity: z.number().min(0.1).max(5).optional().default(1.5).describe('Sensitivity for audio-reactive effects'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontWeight,
    fontFamily,
    textColor,
    glowColor,
    scanColor,
    trailColor,
    sparkleColor,
    duration,
    sweepDuration,
    sweepDelay,
    trailDelay,
    intensity,
    audioSrc,
    audioSensitivity,
  } = params;

  // Generate unique IDs
  const containerId = 'diagonal-scanner-root';
  const textLayerId = 'scanner-text-layer';
  const beamOverlayId = 'scanner-beam-overlay';
  const trailOverlayId = 'brightness-trail-overlay';
  const sparkle1Id = 'sparkle-particle-1';
  const sparkle2Id = 'sparkle-particle-2';
  const sparkle3Id = 'sparkle-particle-3';

  // Parse font weight
  const fontWeightValue = fontWeight.match(/\d+/) ? parseInt(fontWeight) : fontWeight === 'bold' ? 700 : 400;

  // Calculate effect durations
  const actualSweepDuration = sweepDuration * intensity;
  const actualTrailDuration = actualSweepDuration;

  // Build text layer
  const textLayer: RenderableComponentData = {
    id: textLayerId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: fontSize,
        fontWeight: fontWeightValue,
        color: textColor,
        textShadow: '0 0 10px rgba(0,0,0,0.5)',
      },
      font: {
        family: fontFamily,
        weights: [fontWeightValue.toString()],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Build scanner beam overlay with diagonal gradient animation
  const beamOverlay: RenderableComponentData = {
    id: beamOverlayId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `linear-gradient(135deg, transparent 0%, transparent 45%, ${glowColor} 50%, ${scanColor} 55%, transparent 60%, transparent 100%)`,
          mixBlendMode: 'screen',
          width: '200%',
          height: '200%',
          top: '-50%',
          left: '-100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'beam-sweep-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: sweepDelay,
          duration: actualSweepDuration,
          mode: 'provider',
          targetIds: [beamOverlayId],
          ranges: [
            // Diagonal movement using both translateX and translateY
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '100%', prog: 1 },
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '100%', prog: 1 },
          ],
        },
      },
    ],
  };

  // Add audio-reactive effect if audio source is provided
  if (audioSrc) {
    beamOverlay.effects!.push({
      id: 'beam-audio-reactive',
      componentId: 'waveform',
      data: {
        audioSrc: audioSrc,
        audioProperty: 'bass',
        effectType: 'translateX',
        intensity: 20 * intensity,
        sensitivity: audioSensitivity,
        threshold: 0.2,
        numberOfSamples: 128,
        useFrequencyData: true,
        mode: 'provider',
        targetIds: [beamOverlayId],
        start: sweepDelay,
        duration: actualSweepDuration,
        smoothNormalisation: 1,
      },
    });
  }

  // Build brightness trail overlay
  const trailOverlay: RenderableComponentData = {
    id: trailOverlayId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `radial-gradient(ellipse 30% 30% at 50% 50%, ${trailColor} 0%, transparent 70%)`,
          mixBlendMode: 'overlay',
          width: '100%',
          height: '100%',
          top: '0',
          left: '-100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'trail-sweep-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: sweepDelay + trailDelay,
          duration: actualTrailDuration,
          mode: 'provider',
          targetIds: [trailOverlayId],
          ranges: [
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '200%', prog: 1 },
          ],
        },
      },
      {
        id: 'trail-brightness-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: sweepDelay + trailDelay,
          duration: actualTrailDuration,
          mode: 'provider',
          targetIds: [trailOverlayId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1 * intensity, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Build sparkle particles using HTMLBlockAtom
  const sparkleOverlay: RenderableComponentData = {
    id: 'particle-sparkle-container',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <div style="position: absolute; inset: 0; pointer-events: none; overflow: hidden;">
          <div id="${sparkle1Id}" style="position: absolute; width: 4px; height: 4px; background: ${sparkleColor}; border-radius: 50%; box-shadow: 0 0 6px ${sparkleColor}; top: 30%; left: 0%;"></div>
          <div id="${sparkle2Id}" style="position: absolute; width: 3px; height: 3px; background: ${sparkleColor}; border-radius: 50%; box-shadow: 0 0 4px ${sparkleColor}; top: 50%; left: 5%;"></div>
          <div id="${sparkle3Id}" style="position: absolute; width: 2px; height: 2px; background: ${sparkleColor}; border-radius: 50%; box-shadow: 0 0 3px ${sparkleColor}; top: 70%; left: 10%;"></div>
        </div>
      `,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Sparkle 1 animation
      {
        id: 'sparkle-1-move',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: sweepDelay,
          duration: actualSweepDuration,
          mode: 'provider',
          targetIds: [sparkle1Id],
          ranges: [
            { key: 'translateX', val: '0vw', prog: 0 },
            { key: 'translateX', val: '100vw', prog: 1 },
            { key: 'translateY', val: '0vh', prog: 0 },
            { key: 'translateY', val: '40vh', prog: 1 },
          ],
        },
      },
      {
        id: 'sparkle-1-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: sweepDelay,
          duration: actualSweepDuration,
          mode: 'provider',
          targetIds: [sparkle1Id],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1 * intensity, prog: 0.2 },
            { key: 'opacity', val: 1 * intensity, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Sparkle 2 animation
      {
        id: 'sparkle-2-move',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: sweepDelay + 0.1,
          duration: actualSweepDuration,
          mode: 'provider',
          targetIds: [sparkle2Id],
          ranges: [
            { key: 'translateX', val: '0vw', prog: 0 },
            { key: 'translateX', val: '95vw', prog: 1 },
            { key: 'translateY', val: '0vh', prog: 0 },
            { key: 'translateY', val: '35vh', prog: 1 },
          ],
        },
      },
      {
        id: 'sparkle-2-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: sweepDelay + 0.1,
          duration: actualSweepDuration,
          mode: 'provider',
          targetIds: [sparkle2Id],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8 * intensity, prog: 0.25 },
            { key: 'opacity', val: 0.8 * intensity, prog: 0.75 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Sparkle 3 animation
      {
        id: 'sparkle-3-move',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: sweepDelay + 0.15,
          duration: actualSweepDuration,
          mode: 'provider',
          targetIds: [sparkle3Id],
          ranges: [
            { key: 'translateX', val: '0vw', prog: 0 },
            { key: 'translateX', val: '90vw', prog: 1 },
            { key: 'translateY', val: '0vh', prog: 0 },
            { key: 'translateY', val: '30vh', prog: 1 },
          ],
        },
      },
      {
        id: 'sparkle-3-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: sweepDelay + 0.15,
          duration: actualSweepDuration,
          mode: 'provider',
          targetIds: [sparkle3Id],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6 * intensity, prog: 0.3 },
            { key: 'opacity', val: 0.6 * intensity, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative inline-block overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      textLayer,
      beamOverlay,
      trailOverlay,
      sparkleOverlay,
    ] as RenderableComponentData[],
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
  id: 'diagonal-scanner-text-effect',
  title: 'Diagonal Scanner Text Effect',
  description: 'A diagonal scanning beam effect that sweeps across text from top-left to bottom-right, creating an energizing animation with a glowing edge, brightness trail, and subtle particle sparkles. Uses transform-based animations with gradient-filled overlay elements that move diagonally across the text, creating the appearance of a scanner beam passing over and activating the letters.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'effects', 'scanner', 'diagonal', 'sweep', 'glow', 'particles', 'sparkles', 'energize', 'beam', 'sci-fi', 'tech', 'modern', 'dynamic', 'audio-reactive'],
  dependencies: {},
  defaultInputParams: {
    text: 'SCANNER EFFECT',
    fontSize: '72px',
    fontWeight: 'bold',
    fontFamily: 'Inter',
    textColor: '#ffffff',
    glowColor: 'rgba(100,200,255,0.8)',
    scanColor: 'rgba(255,255,255,0.6)',
    trailColor: 'rgba(255,255,255,0.3)',
    sparkleColor: 'rgba(255,255,255,0.9)',
    duration: 3,
    sweepDuration: 2,
    sweepDelay: 0,
    trailDelay: 0.2,
    intensity: 1,
    audioSensitivity: 1.5,
  },
};

// Export preset
export const diagonalScannerTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
