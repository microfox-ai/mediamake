/**
 * Signal Decay Dissolution Effect
 *
 * This preset creates a digital signal degradation effect that simulates
 * transmission failure with progressive jitter, noise, blur, and scale distortion.
 *
 * Features:
 * - **Progressive Jitter**: Small translate variations that increase over time
 * - **Noise Overlay**: SVG-based grain/noise texture that intensifies
 * - **Blur Growth**: Exponential blur from 0-20px
 * - **Scale Distortion**: Gradual scale degradation based on final state
 * - **Decay Curves**: Exponential or linear progression
 * - **Final States**: Dissolved, frozen, or black endings
 * - **Customizable Content**: Works with text, images, or custom components
 *
 * Use cases:
 * - Creating glitch effects for sci-fi content
 * - Simulating digital transmission failures
 * - Adding cyberpunk aesthetic to videos
 * - Creating dramatic ending transitions
 * - Building retro VHS/digital decay effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(3)
    .describe('Total duration of the decay effect in seconds'),
  decayRate: z
    .enum(['exponential', 'linear'])
    .default('exponential')
    .describe('Decay progression curve - exponential feels more dramatic'),
  finalState: z
    .enum(['dissolved', 'frozen', 'black'])
    .default('dissolved')
    .describe(
      'Final visual state: dissolved (faded), frozen (static), or black (complete fade)',
    ),
  noiseIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Maximum opacity of noise/grain overlay (0-1)'),
  content: z
    .object({
      text: z.string().optional().describe('Text content to decay'),
      fontSize: z.string().optional().describe('Font size (e.g., "48px")'),
      color: z.string().optional().describe('Text color'),
      src: z.string().optional().describe('Image/video source URL'),
      type: z
        .enum(['text', 'image', 'video'])
        .optional()
        .describe('Content type'),
    })
    .optional()
    .describe('Content configuration for the decaying element'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const duration = params.duration || 3;
  const decayRate = params.decayRate || 'exponential';
  const finalState = params.finalState || 'dissolved';
  const noiseIntensity = params.noiseIntensity ?? 0.5;
  const content = params.content || {};

  // Helper function: Generate jitter keyframes with increasing amplitude
  const generateJitterKeyframes = (): GenericEffectData['ranges'] => {
    const keyframes: GenericEffectData['ranges'] = [];
    const progressPoints = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 1];

    progressPoints.forEach((prog) => {
      // Amplitude increases exponentially or linearly
      const amplitude =
        decayRate === 'exponential'
          ? 20 * Math.pow(prog, 2)
          : 20 * prog;

      // Generate random jitter values within amplitude
      const jitterX = (Math.random() - 0.5) * 2 * amplitude;
      const jitterY = (Math.random() - 0.5) * 2 * amplitude;

      keyframes.push(
        { key: 'translateX', val: jitterX, prog },
        { key: 'translateY', val: jitterY, prog },
      );
    });

    return keyframes;
  };

  // Helper function: Generate blur progression keyframes
  const generateBlurKeyframes = (): GenericEffectData['ranges'] => {
    const blurValues =
      decayRate === 'exponential'
        ? [0, 0.5, 1, 3, 8, 14, 18, 20]
        : [0, 2, 5, 10, 12, 15, 18, 20];

    const progressPoints = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 1];

    return progressPoints.map((prog, idx) => ({
      key: 'filter',
      val: `blur(${blurValues[idx]}px)`,
      prog,
    }));
  };

  // Helper function: Generate scale distortion keyframes
  const generateScaleKeyframes = (): GenericEffectData['ranges'] => {
    const progressPoints = [0, 0.5, 1];
    let scaleValues: number[] = [];

    switch (finalState) {
      case 'dissolved':
        scaleValues = [1, 0.95, 0.8];
        break;
      case 'frozen':
        scaleValues = [1, 1, 1];
        break;
      case 'black':
        scaleValues = [1, 1.1, 1.2];
        break;
    }

    return progressPoints.map((prog, idx) => ({
      key: 'scale',
      val: scaleValues[idx],
      prog,
    }));
  };

  // Helper function: Generate final state opacity keyframes
  const generateFinalStateOpacity = (): GenericEffectData['ranges'] => {
    let finalOpacity = 1;

    switch (finalState) {
      case 'dissolved':
        finalOpacity = 0.2;
        break;
      case 'frozen':
        finalOpacity = 1;
        break;
      case 'black':
        finalOpacity = 0;
        break;
    }

    return [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: finalOpacity, prog: 1 },
    ];
  };

  // Helper function: Generate noise overlay HTML
  const generateNoiseOverlayHTML = (): string => {
    return `
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id="noise-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#noise-filter)" opacity="1"/>
      </svg>
    `;
  };

  // Helper function: Generate noise intensity ramp keyframes
  const generateNoiseIntensityKeyframes = (): GenericEffectData['ranges'] => {
    const progressPoints = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];

    return progressPoints.map((prog) => {
      const opacity =
        decayRate === 'exponential'
          ? noiseIntensity * Math.pow(prog, 1.5)
          : noiseIntensity * prog;

      return { key: 'opacity', val: opacity, prog };
    });
  };

  // Determine content type and data
  const contentType = content.type || (content.text ? 'text' : content.src ? 'image' : 'text');
  const contentData: any = {};

  if (contentType === 'text') {
    contentData.text = content.text || 'Signal Lost';
    contentData.style = {
      fontSize: content.fontSize || '48px',
      color: content.color || '#ffffff',
      fontWeight: '600',
    };
  } else if (contentType === 'image') {
    contentData.src = content.src || '';
    contentData.style = {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
    };
  } else if (contentType === 'video') {
    contentData.src = content.src || '';
    contentData.style = {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
    };
  }

  const componentIdMap: Record<string, string> = {
    text: 'TextAtom',
    image: 'ImageAtom',
    video: 'VideoAtom',
  };

  // Build effect nodes
  const jitterEffect = {
    id: 'jitter-translate-effect',
    componentId: 'generic',
    data: {
      type: decayRate === 'exponential' ? 'ease-in' : 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: ['content-wrapper'],
      ranges: generateJitterKeyframes(),
    } as GenericEffectData,
  };

  const blurEffect = {
    id: 'blur-progression-effect',
    componentId: 'generic',
    data: {
      type: decayRate === 'exponential' ? 'ease-in' : 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: ['content-wrapper'],
      ranges: generateBlurKeyframes(),
    } as GenericEffectData,
  };

  const scaleEffect = {
    id: 'scale-distortion-effect',
    componentId: 'generic',
    data: {
      type: decayRate === 'exponential' ? 'ease-in' : 'linear',
      start: duration * 0.5,
      duration: duration * 0.5,
      mode: 'provider',
      targetIds: ['content-wrapper'],
      ranges: generateScaleKeyframes(),
    } as GenericEffectData,
  };

  const finalStateEffect = {
    id: 'final-state-opacity',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: duration * 0.85,
      duration: duration * 0.15,
      mode: 'provider',
      targetIds: ['content-element'],
      ranges: generateFinalStateOpacity(),
    } as GenericEffectData,
  };

  const noiseIntensityEffect = {
    id: 'noise-intensity-ramp',
    componentId: 'generic',
    data: {
      type: decayRate === 'exponential' ? 'ease-in' : 'linear',
      start: 0,
      duration: duration * 0.75,
      mode: 'provider',
      targetIds: ['noise-overlay-layer'],
      ranges: generateNoiseIntensityKeyframes(),
    } as GenericEffectData,
  };

  // Build component tree
  const contentElement: RenderableComponentData = {
    id: 'content-element',
    type: 'atom',
    componentId: componentIdMap[contentType],
    data: contentData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [finalStateEffect],
  };

  const contentWrapper: RenderableComponentData = {
    id: 'content-wrapper',
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
        duration: duration,
      },
    },
    effects: [jitterEffect, blurEffect, scaleEffect],
    childrenData: [contentElement] as RenderableComponentData[],
  };

  const noiseOverlay: RenderableComponentData = {
    id: 'noise-overlay-layer',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: generateNoiseOverlayHTML(),
      className: 'absolute inset-0 pointer-events-none',
      style: {
        mixBlendMode: 'overlay',
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: duration * 0.25,
        duration: duration * 0.75,
      },
    },
    effects: [noiseIntensityEffect],
  };

  const rootContainer: RenderableComponentData = {
    id: 'signal-decay-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [contentWrapper, noiseOverlay] as RenderableComponentData[],
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
  id: 'signal-decay-dissolution',
  title: 'Signal Decay Dissolution Effect',
  description:
    'A visual preset that creates a digital signal degradation effect on text or media content. Simulates transmission failure with progressive jitter, noise, blur, and scale distortion. Supports exponential/linear decay curves and multiple final states (dissolved, frozen, black).',
  type: 'predefined',
  presetType: 'children',
  tags: ['effects', 'glitch', 'decay', 'digital', 'transmission', 'noise', 'cyberpunk'],
  dependencies: {},
  defaultInputParams: {
    duration: 3,
    decayRate: 'exponential',
    finalState: 'dissolved',
    noiseIntensity: 0.5,
    content: {
      text: 'Signal Lost',
      fontSize: '48px',
      color: '#ffffff',
      type: 'text',
    },
  },
};

// --- Export ---

export const signalDecayDissolutionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
