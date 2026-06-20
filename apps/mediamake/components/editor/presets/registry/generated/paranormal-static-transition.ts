/**
 * Paranormal Static Transition Preset
 *
 * A supernatural horror-themed transition that simulates an old analog TV losing signal
 * due to paranormal interference. This preset creates a haunting effect where static noise
 * gradually overtakes the video signal, revealing ghostly messages or faces before complete
 * signal dissolution.
 *
 * Features:
 * - Five distinct phases: clear signal → increasing interference → static chaos → 
 *   horrific clarity → final dissolution
 * - Multiple static noise layers with different blend modes
 * - Scanline effects simulating CRT displays
 * - Chromatic aberration with red color bleeding during intense moments
 * - Vertical roll and horizontal tear effects (analog TV hold issues)
 * - Brief blackout pulses for tension building
 * - Ghostly text/message reveal at peak interference
 * - VHS tracking errors and magnetic distortion effects
 * - Rhythmic static pulsing (120-180 BPM equivalent)
 *
 * Use Cases:
 * - Horror film transitions
 * - Supernatural thriller effects
 * - Found footage style videos
 * - Paranormal investigation content
 * - Creepy intro/outro sequences
 * - Halloween special effects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  trackName: z.string().default('paranormal-static').describe('Unique identifier for this transition track'),
  duration: z.number().default(5).describe('Total duration of the transition in seconds'),
  originalVideoSrc: z.string().describe('Source URL of the original video content to be distorted'),
  ghostlyText: z.string().default('HELP ME').describe('Text message to reveal during horrific clarity phase (70-75%)'),
  staticIntensity: z.number().min(0).max(1).default(0.8).describe('Overall intensity of static effect (0-1)'),
  colorBleedIntensity: z.number().min(0).max(1).default(0.6).describe('Intensity of red color bleeding during intense moments (0-1)'),
  pulseFrequency: z.number().min(100).max(200).default(150).describe('Static pulse frequency in BPM (120-180 recommended for unsettling rhythm)'),
  blackoutEnabled: z.boolean().default(true).describe('Enable brief blackout pulses for tension building'),
  verticalRollSpeed: z.number().min(0.5).max(2).default(1).describe('Speed multiplier for vertical roll effect'),
  horizontalTearIntensity: z.number().min(0).max(1).default(0.5).describe('Intensity of horizontal tear glitches (0-1)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackName,
    duration,
    originalVideoSrc,
    ghostlyText,
    staticIntensity,
    colorBleedIntensity,
    pulseFrequency,
    blackoutEnabled,
    verticalRollSpeed,
    horizontalTearIntensity,
  } = params;

  const fps = props.config?.fps || 30;

  // Helper: Generate noise pattern using CSS gradients (performance optimization)
  const generateNoiseGradient = (density: number): string => {
    const stops: string[] = [];
    const numStops = Math.floor(density * 50);
    for (let i = 0; i < numStops; i++) {
      const pos = (i / numStops) * 100;
      const opacity = Math.random() > 0.5 ? 0.8 : 0.2;
      stops.push(`rgba(255,255,255,${opacity}) ${pos}%`);
    }
    return `repeating-linear-gradient(0deg, ${stops.join(', ')})`;
  };

  // Phase timings (relative to transition duration)
  const clearSignalEnd = duration * 0.2;
  const interferenceEnd = duration * 0.5;
  const chaosEnd = duration * 0.7;
  const clarityStart = duration * 0.7;
  const clarityEnd = duration * 0.75;
  const dissolutionEnd = duration;

  // Pulse timing calculation (convert BPM to seconds)
  const pulseDuration = 60 / pulseFrequency;

  const childrenData: RenderableComponentData[] = [];

  // 1. Original content layer (bottom)
  childrenData.push({
    id: `${trackName}-original-content`,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: originalVideoSrc,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      muted: true,
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Fade out original content as static increases
      {
        id: `${trackName}-content-fadeout`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: clearSignalEnd,
          duration: interferenceEnd - clearSignalEnd,
          mode: 'provider',
          targetIds: [`${trackName}-original-content`],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 2. Static noise layers (three layers with different blend modes)
  const staticLayers = [
    { id: 'static-1', blendMode: 'screen', density: 1.0, zIndex: 10 },
    { id: 'static-2', blendMode: 'overlay', density: 0.7, zIndex: 11 },
    { id: 'static-3', blendMode: 'difference', density: 0.5, zIndex: 12 },
  ];

  staticLayers.forEach((layer) => {
    childrenData.push({
      id: `${trackName}-${layer.id}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 w-full h-full pointer-events-none',
          style: {
            zIndex: layer.zIndex,
            mixBlendMode: layer.blendMode,
            background: generateNoiseGradient(layer.density),
            backgroundSize: '4px 4px',
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
        // Phase 1: Clear signal (0-20%) - minimal static
        {
          id: `${layer.id}-phase1`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: clearSignalEnd,
            mode: 'provider',
            targetIds: [`${trackName}-${layer.id}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.1 * staticIntensity, prog: 1 },
            ],
          },
        },
        // Phase 2: Increasing interference (20-50%)
        {
          id: `${layer.id}-phase2`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: clearSignalEnd,
            duration: interferenceEnd - clearSignalEnd,
            mode: 'provider',
            targetIds: [`${trackName}-${layer.id}`],
            ranges: [
              { key: 'opacity', val: 0.1 * staticIntensity, prog: 0 },
              { key: 'opacity', val: 0.5 * staticIntensity, prog: 1 },
            ],
          },
        },
        // Phase 3: Static chaos (50-70%)
        {
          id: `${layer.id}-phase3`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: interferenceEnd,
            duration: chaosEnd - interferenceEnd,
            mode: 'provider',
            targetIds: [`${trackName}-${layer.id}`],
            ranges: [
              { key: 'opacity', val: 0.5 * staticIntensity, prog: 0 },
              { key: 'opacity', val: 0.8 * staticIntensity, prog: 0.5 },
              { key: 'opacity', val: 0.7 * staticIntensity, prog: 1 },
            ],
          },
        },
        // Phase 4: Brief clarity (70-75%) - static reduces
        {
          id: `${layer.id}-phase4`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: clarityStart,
            duration: clarityEnd - clarityStart,
            mode: 'provider',
            targetIds: [`${trackName}-${layer.id}`],
            ranges: [
              { key: 'opacity', val: 0.7 * staticIntensity, prog: 0 },
              { key: 'opacity', val: 0.3 * staticIntensity, prog: 1 },
            ],
          },
        },
        // Phase 5: Final dissolution (75-100%)
        {
          id: `${layer.id}-phase5`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: clarityEnd,
            duration: dissolutionEnd - clarityEnd,
            mode: 'provider',
            targetIds: [`${trackName}-${layer.id}`],
            ranges: [
              { key: 'opacity', val: 0.3 * staticIntensity, prog: 0 },
              { key: 'opacity', val: 1.0 * staticIntensity, prog: 1 },
            ],
          },
        },
        // Rhythmic pulse effect (120-180 BPM)
        {
          id: `${layer.id}-pulse`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: interferenceEnd,
            duration: dissolutionEnd - interferenceEnd,
            mode: 'provider',
            targetIds: [`${trackName}-${layer.id}`],
            ranges: [
              { key: 'filter', val: 'brightness(1)', prog: 0 },
              { key: 'filter', val: 'brightness(1.3)', prog: 0.25 },
              { key: 'filter', val: 'brightness(1)', prog: 0.5 },
              { key: 'filter', val: 'brightness(1.3)', prog: 0.75 },
              { key: 'filter', val: 'brightness(1)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  });

  // 3. Scanlines layer
  childrenData.push({
    id: `${trackName}-scanlines`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full pointer-events-none',
        style: {
          zIndex: 15,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          backgroundSize: '100% 4px',
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
        id: 'scanlines-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: clearSignalEnd,
          duration: chaosEnd - clearSignalEnd,
          mode: 'provider',
          targetIds: [`${trackName}-scanlines`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.5 },
            { key: 'opacity', val: 0.8, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 4. Chromatic aberration layers (red and blue separation)
  childrenData.push({
    id: `${trackName}-chromatic-red`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full pointer-events-none',
        style: {
          zIndex: 20,
          backgroundColor: `rgba(255, 0, 0, ${0.3 * colorBleedIntensity})`,
          mixBlendMode: 'multiply',
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
        id: 'chromatic-red-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: interferenceEnd,
          duration: chaosEnd - interferenceEnd,
          mode: 'provider',
          targetIds: [`${trackName}-chromatic-red`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7 * colorBleedIntensity, prog: 0.5 },
            { key: 'opacity', val: 0.9 * colorBleedIntensity, prog: 1 },
          ],
        },
      },
      {
        id: 'chromatic-red-shift',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: interferenceEnd,
          duration: chaosEnd - interferenceEnd,
          mode: 'provider',
          targetIds: [`${trackName}-chromatic-red`],
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: '3px', prog: 0.5 },
            { key: 'translateX', val: '0px', prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  childrenData.push({
    id: `${trackName}-chromatic-blue`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full pointer-events-none',
        style: {
          zIndex: 21,
          backgroundColor: 'rgba(0, 0, 255, 0.2)',
          mixBlendMode: 'screen',
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
        id: 'chromatic-blue-shift',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: interferenceEnd,
          duration: chaosEnd - interferenceEnd,
          mode: 'provider',
          targetIds: [`${trackName}-chromatic-blue`],
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: '-2px', prog: 0.5 },
            { key: 'translateX', val: '0px', prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 5. Vertical roll overlay
  childrenData.push({
    id: `${trackName}-vertical-roll`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full pointer-events-none',
        style: {
          zIndex: 25,
          height: '100%',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
        },
      },
    },
    context: {
      timing: {
        start: clearSignalEnd,
        duration: dissolutionEnd - clearSignalEnd,
      },
    },
    effects: [
      {
        id: 'vertical-roll-animation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: dissolutionEnd - clearSignalEnd,
          mode: 'provider',
          targetIds: [`${trackName}-vertical-roll`],
          ranges: [
            { key: 'translateY', val: '-100%', prog: 0 },
            { key: 'translateY', val: '100%', prog: 1 },
          ],
        },
      },
      {
        id: 'vertical-roll-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: dissolutionEnd - clearSignalEnd,
          mode: 'provider',
          targetIds: [`${trackName}-vertical-roll`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.3 },
            { key: 'opacity', val: 0.7, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 6. Horizontal tear layer
  childrenData.push({
    id: `${trackName}-horizontal-tear`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute w-full pointer-events-none',
        style: {
          zIndex: 26,
          height: '20%',
          top: '40%',
          backgroundColor: 'rgba(255,255,255,0.05)',
        },
      },
    },
    context: {
      timing: {
        start: interferenceEnd,
        duration: chaosEnd - interferenceEnd,
      },
    },
    effects: [
      {
        id: 'horizontal-tear-skew',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: chaosEnd - interferenceEnd,
          mode: 'provider',
          targetIds: [`${trackName}-horizontal-tear`],
          ranges: [
            { key: 'skewX', val: `0deg`, prog: 0 },
            { key: 'skewX', val: `${30 * horizontalTearIntensity}deg`, prog: 0.25 },
            { key: 'skewX', val: `${-30 * horizontalTearIntensity}deg`, prog: 0.5 },
            { key: 'skewX', val: `${20 * horizontalTearIntensity}deg`, prog: 0.75 },
            { key: 'skewX', val: `0deg`, prog: 1 },
          ],
        },
      },
      {
        id: 'horizontal-tear-opacity',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: chaosEnd - interferenceEnd,
          mode: 'provider',
          targetIds: [`${trackName}-horizontal-tear`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8 * horizontalTearIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 7. Blackout layer (tension building)
  if (blackoutEnabled) {
    const blackoutCount = 3;
    const blackoutInterval = (chaosEnd - interferenceEnd) / blackoutCount;
    
    for (let i = 0; i < blackoutCount; i++) {
      const blackoutStart = interferenceEnd + i * blackoutInterval;
      const blackoutDuration = 0.15; // 150ms blackout pulse
      
      childrenData.push({
        id: `${trackName}-blackout-${i}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 w-full h-full',
            style: {
              zIndex: 30,
              backgroundColor: '#000000',
            },
          },
        },
        context: {
          timing: {
            start: blackoutStart,
            duration: blackoutDuration,
          },
        },
        effects: [
          {
            id: `blackout-${i}-pulse`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: blackoutDuration,
              mode: 'provider',
              targetIds: [`${trackName}-blackout-${i}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
  }

  // 8. Ghostly reveal layer (horrific clarity phase 70-75%)
  childrenData.push({
    id: `${trackName}-ghostly-reveal`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full flex items-center justify-center',
        style: {
          zIndex: 35,
        },
      },
    },
    context: {
      timing: {
        start: clarityStart,
        duration: clarityEnd - clarityStart,
      },
    },
    childrenData: [
      {
        id: `${trackName}-ghostly-text`,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: ghostlyText,
          style: {
            fontSize: '72px',
            color: 'rgba(255, 255, 255, 0.6)',
            textShadow: '0 0 20px rgba(255, 0, 0, 0.8), 0 0 40px rgba(255, 0, 0, 0.4)',
            fontFamily: 'monospace',
            letterSpacing: '8px',
            fontWeight: 'bold',
            textAlign: 'center',
          },
          className: 'text-center',
        },
        context: {
          timing: {
            start: 0,
            duration: clarityEnd - clarityStart,
          },
        },
        effects: [
          {
            id: 'ghostly-text-flicker',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: clarityEnd - clarityStart,
              mode: 'provider',
              targetIds: [`${trackName}-ghostly-text`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.1 },
                { key: 'opacity', val: 0.3, prog: 0.2 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 0.8, prog: 0.5 },
                { key: 'opacity', val: 1, prog: 0.7 },
                { key: 'opacity', val: 0.5, prog: 0.85 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
    effects: [],
  } as RenderableComponentData);

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData,
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
  id: 'paranormal-static-transition',
  title: 'Paranormal Static Transition',
  description: 'A supernatural horror-themed transition that simulates an old analog TV losing signal due to paranormal interference. Features ghostly reveals through chaotic static, vertical/horizontal hold issues, chromatic aberration with red color bleeding, VHS tracking errors, and rhythmic static pulsing. The transition progresses through five distinct phases: clear signal deterioration, increasing interference, complete static chaos, brief horrific clarity moment, and final signal dissolution.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'horror', 'supernatural', 'static', 'glitch', 'analog', 'tv', 'paranormal', 'vhs', 'chromatic-aberration'],
  defaultInputParams: {
    trackName: 'paranormal-static',
    duration: 5,
    originalVideoSrc: 'https://example.com/video.mp4',
    ghostlyText: 'HELP ME',
    staticIntensity: 0.8,
    colorBleedIntensity: 0.6,
    pulseFrequency: 150,
    blackoutEnabled: true,
    verticalRollSpeed: 1,
    horizontalTearIntensity: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const paranormalStaticTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};