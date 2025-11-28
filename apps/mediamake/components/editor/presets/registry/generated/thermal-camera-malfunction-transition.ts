/**
 * Thermal Camera Malfunction Transition
 *
 * A 1.6 second transition effect that mimics infrared imaging glitches and thermal camera malfunctions.
 * 
 * Features:
 * - Outgoing video shifts to heat map colors (orange/red/yellow tones) using gradient map filter simulation
 * - Incoming video emerges through inverse thermal colors (blue/purple/cyan) that gradually normalize
 * - 8x8 grid of dead pixel artifacts (64 total) that randomly flicker between transparent and bright colors
 * - Horizontal scan lines that roll through the frame during transition
 * - Deterministic staggered timing for pixel flicker based on grid position
 * 
 * Use cases:
 * - Tech-themed video transitions
 * - Sci-fi/futuristic content
 * - Security camera footage effects
 * - Digital glitch aesthetics
 * - Surveillance/military themed content
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    startFrom: z.number().default(0).describe('Start time of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z.number().default(0).describe('Start time of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z.number().default(1.6).describe('Duration of the transition in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;

  // Helper function to generate pixel grid positions
  const generatePixelGrid = () => {
    const pixels: RenderableComponentData[] = [];
    const gridSize = 8; // 8x8 grid
    const pixelSize = 12.5; // 100 / 8 = 12.5%

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const pixelId = `pixel-${row}-${col}`;
        const left = col * pixelSize;
        const top = row * pixelSize;
        
        // Deterministic staggered timing based on grid position
        const startDelay = (row * gridSize + col) * 0.02; // 20ms per pixel
        
        // Random bright colors for dead pixel effect
        const colors = [
          '#FF0000', // Red
          '#00FF00', // Green
          '#0000FF', // Blue
          '#FFFF00', // Yellow
          '#FF00FF', // Magenta
          '#00FFFF', // Cyan
          '#FFFFFF', // White
        ];
        const pixelColor = colors[Math.floor((row * gridSize + col) % colors.length)];

        // Create multiple flicker cycles for each pixel
        const flickerRanges: any[] = [];
        const numCycles = 3; // 3 flicker cycles during transition
        const cycleStep = 1 / (numCycles * 2); // Each cycle has on and off

        for (let i = 0; i < numCycles; i++) {
          const cycleStart = i * cycleStep * 2;
          const cycleMiddle = cycleStart + cycleStep;
          const cycleEnd = cycleStart + cycleStep * 2;

          flickerRanges.push(
            { key: 'opacity', val: 0, prog: cycleStart },
            { key: 'opacity', val: 1, prog: cycleMiddle },
            { key: 'opacity', val: 0, prog: cycleEnd }
          );
        }

        pixels.push({
          id: pixelId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: 100%; height: 100%; background-color: ${pixelColor};"></div>`,
            className: 'absolute',
            style: {
              left: `${left}%`,
              top: `${top}%`,
              width: `${pixelSize}%`,
              height: `${pixelSize}%`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            {
              id: `${pixelId}-flicker`,
              componentId: 'generic',
              data: {
                type: 'linear',
                start: startDelay,
                duration: transitionDuration - startDelay,
                mode: 'provider',
                targetIds: [pixelId],
                ranges: flickerRanges,
              },
            },
          ],
        } as RenderableComponentData);
      }
    }

    return pixels;
  };

  // Generate scan lines
  const generateScanLines = () => {
    const scanLines: RenderableComponentData[] = [];
    const numScanLines = 3;

    for (let i = 0; i < numScanLines; i++) {
      const scanLineId = `scanline-${i}`;
      const startDelay = i * 0.2; // Stagger scan lines by 0.2s
      const effectDuration = transitionDuration - startDelay;

      scanLines.push({
        id: scanLineId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 1px; background: rgba(255, 255, 255, 0.3);"></div>`,
          className: 'absolute w-full',
          style: {
            top: '0%',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: `${scanLineId}-sweep`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: startDelay,
              duration: effectDuration,
              mode: 'provider',
              targetIds: [scanLineId],
              ranges: [
                { key: 'translateY', val: '0vh', prog: 0 },
                { key: 'translateY', val: '100vh', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return scanLines;
  };

  // Build component structure
  const childrenData: RenderableComponentData[] = [
    // Outgoing video with thermal effect
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        startFrom: outgoingVideo.startFrom,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          filter: 'sepia(1) saturate(2) hue-rotate(30deg)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'outgoing-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionDuration * 0.5, // Start fading at 0.8s (50% through)
            duration: transitionDuration * 0.5, // Fade over last 50%
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming video with inverse thermal colors
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        startFrom: incomingVideo.startFrom,
        className: 'absolute inset-0 w-full h-full object-cover',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: transitionDuration * 0.5, // Start fading at 0.8s (50% through)
            duration: transitionDuration * 0.5, // Fade over last 50%
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'incoming-thermal-normalize',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'hue-rotate', val: '180deg', prog: 0 },
              { key: 'hue-rotate', val: '0deg', prog: 1 },
              { key: 'invert', val: 1, prog: 0 },
              { key: 'invert', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Pixel grid container
    {
      id: 'pixel-grid-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: generatePixelGrid(),
    } as RenderableComponentData,
    // Scan lines container
    {
      id: 'scanline-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none overflow-hidden',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: generateScanLines(),
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'thermal-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
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
  id: 'thermal-camera-malfunction-transition',
  title: 'Thermal Camera Malfunction Transition',
  description: 'A 1.6 second transition mimicking infrared imaging glitches with heat map colors, dead pixel artifacts, and rolling scan lines',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'thermal', 'glitch', 'infrared', 'camera', 'malfunction', 'dead-pixels', 'scan-lines'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
    },
    transitionDuration: 1.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const thermalCameraMalfunctionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
