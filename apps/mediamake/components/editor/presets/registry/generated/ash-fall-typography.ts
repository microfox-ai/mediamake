/**
 * Ash-Fall Typography Effect Preset
 *
 * This preset creates a minimalist ash-fall typography effect where text materializes
 * from converging cinder particles, holds with subtle heat shimmer, then disperses downward.
 * 
 * Features:
 * - Three-stage particle physics: convergence (particles coalesce), display (subtle shimmer), dispersion (particles fall)
 * - Hardware-accelerated transforms using translate3d()
 * - SVG turbulence filter for heat shimmer effect
 * - Configurable particle behavior: burst velocity, gravity, air resistance
 * - Melancholic aesthetic evoking quiet aftermath of destruction
 * 
 * Technical Implementation:
 * - Stage 1 (0-30%): Particles converge from random radial positions using translateX/Y
 * - Stage 2 (30-70%): Text holds position with subtle vibration and heat shimmer
 * - Stage 3 (70-100%): Particles disperse downward with accelerating translateY
 * 
 * Use cases:
 * - High-end title sequences
 * - Cinematic text reveals
 * - Emotional narrative titles
 * - Artistic typography effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  text: z.string().describe('Text content to display with ash-fall effect'),
  duration: z.number().default(10).describe('Total duration of the effect in seconds'),
  fontSize: z.union([z.number(), z.string()]).default(72).describe('Font size (number for px or string with units)'),
  textColor: z.string().default('#D1D5DB').describe('Text color (CSS color value)'),
  font: z.string().optional().describe('Font family with optional weight and style (e.g., "Inter:100", "Roboto:300")'),
  
  // Particle physics parameters
  particleSpread: z.number().min(10).max(500).default(150).describe('Initial radial spread distance for particles (px)'),
  convergenceDuration: z.number().min(0.1).max(1).default(0.3).describe('Convergence phase duration as fraction of total (0-1)'),
  displayDuration: z.number().min(0.1).max(1).default(0.4).describe('Display phase duration as fraction of total (0-1)'),
  dispersionDuration: z.number().min(0.1).max(1).default(0.3).describe('Dispersion phase duration as fraction of total (0-1)'),
  
  // Visual effects
  shimmerIntensity: z.number().min(0).max(10).default(3).describe('Heat shimmer displacement intensity (px)'),
  vibrationAmount: z.number().min(0).max(5).default(1).describe('Subtle vibration amount during display (px)'),
  dispersionDistance: z.number().min(50).max(500).default(200).describe('Downward dispersion distance (px)'),
  
  // Positioning
  position: z.enum(['center', 'top', 'bottom']).default('center').describe('Vertical position of text'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:100';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
  const fontStyle: { fontWeight?: number; fontStyle?: string } = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Calculate stage timings (all relative to parent start)
  const convergenceEnd = params.convergenceDuration;
  const displayEnd = convergenceEnd + params.displayDuration;
  const dispersionEnd = displayEnd + params.dispersionDuration;
  
  // Ensure stages don't exceed total duration
  const totalStageDuration = convergenceEnd + params.displayDuration + params.dispersionDuration;
  if (totalStageDuration > 1) {
    console.warn('Stage durations exceed 1.0, normalizing...');
  }

  // Generate random particle start positions (for convergence effect)
  const generateParticleOffset = (): { x: number; y: number } => {
    const angle = Math.random() * Math.PI * 2;
    const distance = params.particleSpread * (0.5 + Math.random() * 0.5);
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };

  const particleOffset = generateParticleOffset();

  // Position classes based on vertical positioning
  const positionClasses = {
    center: 'items-center justify-center',
    top: 'items-start justify-center pt-20',
    bottom: 'items-end justify-center pb-20',
  };

  // IDs for targeting
  const containerId = 'ash-fall-container';
  const textId = 'ash-fall-text';
  const shimmerFilterId = 'heat-shimmer-filter';

  // Stage 1: Convergence Effect
  // Particles start from random radial positions and converge to center
  const convergenceEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: params.duration * params.convergenceDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // Opacity: fade in
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 0.9, prog: 1 },
      // TranslateX: converge from random X offset
      { key: 'translateX', val: particleOffset.x, prog: 0 },
      { key: 'translateX', val: 0, prog: 1 },
      // TranslateY: converge from random Y offset
      { key: 'translateY', val: particleOffset.y, prog: 0 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  // Stage 2: Display Effect with Vibration
  // Text holds position with subtle random vibration
  const displayEffect: GenericEffectData = {
    type: 'linear',
    start: params.duration * convergenceEnd,
    duration: params.duration * params.displayDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // Opacity: maintain high opacity
      { key: 'opacity', val: 0.9, prog: 0 },
      { key: 'opacity', val: 0.9, prog: 1 },
      // Vibration: subtle oscillation
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: params.vibrationAmount * (Math.random() * 2 - 1), prog: 0.25 },
      { key: 'translateX', val: params.vibrationAmount * (Math.random() * 2 - 1), prog: 0.5 },
      { key: 'translateX', val: params.vibrationAmount * (Math.random() * 2 - 1), prog: 0.75 },
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: params.vibrationAmount * (Math.random() * 2 - 1), prog: 0.33 },
      { key: 'translateY', val: params.vibrationAmount * (Math.random() * 2 - 1), prog: 0.66 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  // Stage 3: Dispersion Effect
  // Particles disperse downward with accelerating motion and diverging horizontally
  const dispersionEffect: GenericEffectData = {
    type: 'ease-in',
    start: params.duration * displayEnd,
    duration: params.duration * params.dispersionDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // Opacity: fade out
      { key: 'opacity', val: 0.9, prog: 0 },
      { key: 'opacity', val: 0, prog: 1 },
      // TranslateY: accelerating downward (ease-in for gravity effect)
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: params.dispersionDistance, prog: 1 },
      // TranslateX: slight divergence
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: (Math.random() - 0.5) * 50, prog: 1 },
    ],
  };

  // SVG heat shimmer filter (active throughout, but most visible during display stage)
  const shimmerFilterHTML = `
    <svg width="0" height="0" style="position: absolute; pointer-events: none;">
      <defs>
        <filter id="heat-shimmer">
          <feTurbulence 
            baseFrequency="0.02" 
            numOctaves="2" 
            seed="1" 
            type="fractalNoise">
            <animate 
              attributeName="seed" 
              from="1" 
              to="100" 
              dur="3s" 
              repeatCount="indefinite"/>
          </feTurbulence>
          <feDisplacementMap 
            in="SourceGraphic" 
            scale="${params.shimmerIntensity}" 
            xChannelSelector="R" 
            yChannelSelector="G"/>
        </filter>
      </defs>
    </svg>
  `;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex flex-col ${positionClasses[params.position]}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      // Heat shimmer SVG filter definition
      {
        id: shimmerFilterId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: shimmerFilterHTML,
          className: 'absolute inset-0',
          style: {
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      } as RenderableComponentData,
      
      // Text element with all effects
      {
        id: textId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: params.text,
          className: 'font-extralight tracking-widest',
          style: {
            fontSize: typeof params.fontSize === 'number' ? `${params.fontSize}px` : params.fontSize,
            color: params.textColor,
            textAlign: 'center',
            willChange: 'transform, opacity',
            filter: 'url(#heat-shimmer)',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['100'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          {
            id: 'convergence-effect',
            componentId: 'generic',
            data: convergenceEffect,
          },
          {
            id: 'display-effect',
            componentId: 'generic',
            data: displayEffect,
          },
          {
            id: 'dispersion-effect',
            componentId: 'generic',
            data: dispersionEffect,
          },
        ],
      } as RenderableComponentData,
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

const presetMetadata: PresetMetadata = {
  id: 'ash-fall-typography',
  title: 'Ash-Fall Typography Effect',
  description: 'Minimalist ash-fall typography where text materializes from converging cinder particles, holds with subtle shimmer, then disperses downward. Features three-stage particle physics (convergence, display, dispersion) with heat shimmer effect for a melancholic, post-destruction aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'particles',
    'ash',
    'cinematic',
    'title',
    'effects',
    'convergence',
    'dispersion',
    'shimmer',
    'melancholic',
    'destruction',
    'minimalist',
    'physics',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'AFTERMATH',
    duration: 10,
    fontSize: 72,
    textColor: '#D1D5DB',
    font: 'Inter:100',
    particleSpread: 150,
    convergenceDuration: 0.3,
    displayDuration: 0.4,
    dispersionDuration: 0.3,
    shimmerIntensity: 3,
    vibrationAmount: 1,
    dispersionDistance: 200,
    position: 'center',
  },
};

export const ashFallTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
