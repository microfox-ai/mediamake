/**
 * Glitch Cross-Fade Transition Preset
 *
 * A glitch-inspired cross-fade transition that mimics video codec compression artifacts
 * during the scene change. Creates the illusion of corrupted video frames with RGB channel
 * separation, digital noise, scanline effects, and kinetic typography that pulses and jitters
 * as if affected by data corruption.
 *
 * Features:
 * - RGB channel separation (chromatic aberration) with red, green, blue text layers
 * - Digital glitch jitter with rapid position shifts and scale changes
 * - Scanline overlay for vintage digital artifacts
 * - Pulse and jitter effects synchronized with transition timing
 * - Digital artifacts (brightness spikes, contrast shifts, hue rotation)
 * - Cross-fade transition between two text lines
 *
 * Use Cases:
 * - DJ-scratching style transitions between text content
 * - Digital glitch aesthetic for tech/gaming content
 * - Corrupted video frame effects for artistic transitions
 * - Kinetic typography with data corruption theme
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Preset parameters schema
const presetParams = z.object({
  line1Text: z.string().describe('First line of text to display'),
  line2Text: z.string().describe('Second line of text to transition to'),
  duration: z.number().default(3).describe('Total duration of the transition in seconds'),
  transitionDuration: z.number().default(1.5).describe('Duration of the glitch transition overlap in seconds'),
  fontSize: z.number().default(72).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family (e.g., "Inter", "Roboto")'),
  fontWeight: z.string().default('700').describe('Font weight (e.g., "700", "bold")'),
  rgbSeparation: z.number().default(8).describe('Maximum RGB channel separation offset in pixels'),
  glitchIntensity: z.number().default(1).describe('Intensity multiplier for glitch effects (0.5-2.0)'),
  scanlineOpacity: z.number().default(0.15).describe('Opacity of scanline overlay (0-1)'),
  digitalArtifactIntensity: z.number().default(1).describe('Intensity of digital artifacts (brightness, contrast, hue shifts)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    line1Text,
    line2Text,
    duration,
    transitionDuration,
    fontSize,
    fontFamily,
    fontWeight,
    rgbSeparation,
    glitchIntensity,
    scanlineOpacity,
    digitalArtifactIntensity,
  } = params;

  // Calculate timing
  const line1Duration = duration / 2;
  const line2Start = line1Duration;
  const line2Duration = duration - line2Start;

  // Glitch timing windows
  const line1GlitchStart = line1Duration - transitionDuration * 0.7;
  const line1GlitchDuration = transitionDuration * 0.7;
  const line2GlitchStart = 0;
  const line2GlitchDuration = transitionDuration * 0.7;

  // Pulse timing
  const line1PulseStart = 0.2;
  const line1PulseDuration = 0.6;
  const line2PulseStart = 0.3;
  const line2PulseDuration = 0.6;

  // Digital artifact timing (during transition overlap)
  const artifactStart = line1Duration - transitionDuration / 2;
  const artifactDuration = transitionDuration * 0.6;

  // RGB separation values (scaled by intensity)
  const redOffset = -rgbSeparation * glitchIntensity;
  const blueOffset = rgbSeparation * glitchIntensity;
  const greenOffsetY = 3 * glitchIntensity;

  // Build component tree
  const childrenData: RenderableComponentData[] = [
    // Scanline overlay
    {
      id: 'scanline-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: repeating-linear-gradient(0deg, rgba(0,0,0,${scanlineOpacity}) 0px, rgba(0,0,0,${scanlineOpacity}) 2px, transparent 2px, transparent 4px); pointer-events: none;"></div>`,
        style: {
          position: 'absolute',
          inset: '0',
          pointerEvents: 'none',
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
    } as RenderableComponentData,

    // Text container (holds all RGB layers)
    {
      id: 'text-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative flex items-center justify-center',
          style: {
            width: '100%',
            height: '100%',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      childrenData: [
        // Line 1 RGB layers
        {
          id: 'line1-red',
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: line1Text,
            className: 'absolute mix-blend-screen',
            style: {
              color: '#ff0000',
              fontSize: `${fontSize}px`,
              fontWeight,
              textAlign: 'center',
            },
            font: {
              family: fontFamily,
              weights: [fontWeight],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: line1Duration,
            },
          },
          effects: [
            {
              id: 'line1-red-chromatic',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: line1Duration,
                mode: 'provider',
                targetIds: ['line1-red'],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: redOffset, prog: 0.4 },
                  { key: 'translateX', val: redOffset * 0.6, prog: 0.6 },
                  { key: 'translateX', val: 0, prog: 1 },
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.7 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        {
          id: 'line1-green',
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: line1Text,
            className: 'absolute mix-blend-screen',
            style: {
              color: '#00ff00',
              fontSize: `${fontSize}px`,
              fontWeight,
              textAlign: 'center',
            },
            font: {
              family: fontFamily,
              weights: [fontWeight],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: line1Duration,
            },
          },
          effects: [
            {
              id: 'line1-green-chromatic',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: line1Duration,
                mode: 'provider',
                targetIds: ['line1-green'],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateY', val: 0, prog: 0 },
                  { key: 'translateX', val: 0, prog: 0.4 },
                  { key: 'translateY', val: greenOffsetY, prog: 0.4 },
                  { key: 'translateX', val: 0, prog: 0.6 },
                  { key: 'translateY', val: greenOffsetY * 0.6, prog: 0.6 },
                  { key: 'translateX', val: 0, prog: 1 },
                  { key: 'translateY', val: 0, prog: 1 },
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.7 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        {
          id: 'line1-blue',
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: line1Text,
            className: 'absolute mix-blend-screen',
            style: {
              color: '#0000ff',
              fontSize: `${fontSize}px`,
              fontWeight,
              textAlign: 'center',
            },
            font: {
              family: fontFamily,
              weights: [fontWeight],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: line1Duration,
            },
          },
          effects: [
            {
              id: 'line1-blue-chromatic',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: line1Duration,
                mode: 'provider',
                targetIds: ['line1-blue'],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: blueOffset, prog: 0.4 },
                  { key: 'translateX', val: blueOffset * 0.6, prog: 0.6 },
                  { key: 'translateX', val: 0, prog: 1 },
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.7 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Line 2 RGB layers
        {
          id: 'line2-red',
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: line2Text,
            className: 'absolute mix-blend-screen',
            style: {
              color: '#ff0000',
              fontSize: `${fontSize}px`,
              fontWeight,
              textAlign: 'center',
            },
            font: {
              family: fontFamily,
              weights: [fontWeight],
            },
          },
          context: {
            timing: {
              start: line2Start,
              duration: line2Duration,
            },
          },
          effects: [
            {
              id: 'line2-red-chromatic',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: line2Duration,
                mode: 'provider',
                targetIds: ['line2-red'],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: redOffset, prog: 0.3 },
                  { key: 'translateX', val: redOffset * 0.6, prog: 0.5 },
                  { key: 'translateX', val: 0, prog: 0.8 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.3 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        {
          id: 'line2-green',
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: line2Text,
            className: 'absolute mix-blend-screen',
            style: {
              color: '#00ff00',
              fontSize: `${fontSize}px`,
              fontWeight,
              textAlign: 'center',
            },
            font: {
              family: fontFamily,
              weights: [fontWeight],
            },
          },
          context: {
            timing: {
              start: line2Start,
              duration: line2Duration,
            },
          },
          effects: [
            {
              id: 'line2-green-chromatic',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: line2Duration,
                mode: 'provider',
                targetIds: ['line2-green'],
                ranges: [
                  { key: 'translateY', val: 0, prog: 0 },
                  { key: 'translateY', val: greenOffsetY, prog: 0.3 },
                  { key: 'translateY', val: greenOffsetY * 0.6, prog: 0.5 },
                  { key: 'translateY', val: 0, prog: 0.8 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.3 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        {
          id: 'line2-blue',
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: line2Text,
            className: 'absolute mix-blend-screen',
            style: {
              color: '#0000ff',
              fontSize: `${fontSize}px`,
              fontWeight,
              textAlign: 'center',
            },
            font: {
              family: fontFamily,
              weights: [fontWeight],
            },
          },
          context: {
            timing: {
              start: line2Start,
              duration: line2Duration,
            },
          },
          effects: [
            {
              id: 'line2-blue-chromatic',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: line2Duration,
                mode: 'provider',
                targetIds: ['line2-blue'],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: blueOffset, prog: 0.3 },
                  { key: 'translateX', val: blueOffset * 0.6, prog: 0.5 },
                  { key: 'translateX', val: 0, prog: 0.8 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.3 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
      effects: [
        // Line 1 glitch jitter (affects all RGB layers)
        {
          id: 'line1-glitch-jitter',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: line1GlitchStart,
            duration: line1GlitchDuration,
            mode: 'provider',
            targetIds: ['line1-red', 'line1-green', 'line1-blue'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 7 * glitchIntensity, prog: 0.1 },
              { key: 'translateX', val: -5 * glitchIntensity, prog: 0.2 },
              { key: 'translateX', val: 8 * glitchIntensity, prog: 0.3 },
              { key: 'translateX', val: -6 * glitchIntensity, prog: 0.4 },
              { key: 'translateX', val: 5 * glitchIntensity, prog: 0.5 },
              { key: 'translateX', val: -7 * glitchIntensity, prog: 0.6 },
              { key: 'translateX', val: 6 * glitchIntensity, prog: 0.7 },
              { key: 'translateX', val: -4 * glitchIntensity, prog: 0.8 },
              { key: 'translateX', val: 3 * glitchIntensity, prog: 0.9 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -5 * glitchIntensity, prog: 0.15 },
              { key: 'translateY', val: 6 * glitchIntensity, prog: 0.3 },
              { key: 'translateY', val: -4 * glitchIntensity, prog: 0.45 },
              { key: 'translateY', val: 5 * glitchIntensity, prog: 0.6 },
              { key: 'translateY', val: -3 * glitchIntensity, prog: 0.75 },
              { key: 'translateY', val: 4 * glitchIntensity, prog: 0.9 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.03 * glitchIntensity, prog: 0.2 },
              { key: 'scale', val: 0.97, prog: 0.4 },
              { key: 'scale', val: 1.04 * glitchIntensity, prog: 0.6 },
              { key: 'scale', val: 0.96, prog: 0.8 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },

        // Line 1 pulse
        {
          id: 'line1-pulse',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: line1PulseStart,
            duration: line1PulseDuration,
            mode: 'provider',
            targetIds: ['line1-red', 'line1-green', 'line1-blue'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.08 * glitchIntensity, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },

        // Line 2 glitch jitter (affects all RGB layers)
        {
          id: 'line2-glitch-jitter',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: line2Start + line2GlitchStart,
            duration: line2GlitchDuration,
            mode: 'provider',
            targetIds: ['line2-red', 'line2-green', 'line2-blue'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -7 * glitchIntensity, prog: 0.1 },
              { key: 'translateX', val: 6 * glitchIntensity, prog: 0.2 },
              { key: 'translateX', val: -8 * glitchIntensity, prog: 0.3 },
              { key: 'translateX', val: 5 * glitchIntensity, prog: 0.4 },
              { key: 'translateX', val: -6 * glitchIntensity, prog: 0.5 },
              { key: 'translateX', val: 7 * glitchIntensity, prog: 0.6 },
              { key: 'translateX', val: -5 * glitchIntensity, prog: 0.7 },
              { key: 'translateX', val: 4 * glitchIntensity, prog: 0.8 },
              { key: 'translateX', val: -3 * glitchIntensity, prog: 0.9 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: 5 * glitchIntensity, prog: 0.15 },
              { key: 'translateY', val: -6 * glitchIntensity, prog: 0.3 },
              { key: 'translateY', val: 4 * glitchIntensity, prog: 0.45 },
              { key: 'translateY', val: -5 * glitchIntensity, prog: 0.6 },
              { key: 'translateY', val: 3 * glitchIntensity, prog: 0.75 },
              { key: 'translateY', val: -4 * glitchIntensity, prog: 0.9 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.97, prog: 0.2 },
              { key: 'scale', val: 1.03 * glitchIntensity, prog: 0.4 },
              { key: 'scale', val: 0.96, prog: 0.6 },
              { key: 'scale', val: 1.04 * glitchIntensity, prog: 0.8 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },

        // Line 2 pulse
        {
          id: 'line2-pulse',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: line2Start + line2PulseStart,
            duration: line2PulseDuration,
            mode: 'provider',
            targetIds: ['line2-red', 'line2-green', 'line2-blue'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.08 * glitchIntensity, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },

        // Digital artifacts (brightness, contrast, hue shifts)
        {
          id: 'digital-artifact-brightness',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: artifactStart,
            duration: artifactDuration,
            mode: 'provider',
            targetIds: ['text-container'],
            ranges: [
              { key: 'filter:brightness', val: 1, prog: 0 },
              { key: 'filter:brightness', val: 1 + 0.3 * digitalArtifactIntensity, prog: 0.2 },
              { key: 'filter:brightness', val: 1 - 0.1 * digitalArtifactIntensity, prog: 0.4 },
              { key: 'filter:brightness', val: 1 + 0.2 * digitalArtifactIntensity, prog: 0.6 },
              { key: 'filter:brightness', val: 1, prog: 1 },
              { key: 'filter:contrast', val: 1, prog: 0 },
              { key: 'filter:contrast', val: 1 + 0.4 * digitalArtifactIntensity, prog: 0.3 },
              { key: 'filter:contrast', val: 1 - 0.2 * digitalArtifactIntensity, prog: 0.5 },
              { key: 'filter:contrast', val: 1 + 0.3 * digitalArtifactIntensity, prog: 0.7 },
              { key: 'filter:contrast', val: 1, prog: 1 },
              { key: 'filter:hue-rotate', val: 0, prog: 0 },
              { key: 'filter:hue-rotate', val: 15 * digitalArtifactIntensity, prog: 0.25 },
              { key: 'filter:hue-rotate', val: -10 * digitalArtifactIntensity, prog: 0.5 },
              { key: 'filter:hue-rotate', val: 20 * digitalArtifactIntensity, prog: 0.75 },
              { key: 'filter:hue-rotate', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'glitch-cross-fade-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'glitch-cross-fade-transition',
  title: 'Glitch Cross-Fade Transition',
  description:
    'A glitch-inspired cross-fade transition that mimics video codec compression artifacts. Features RGB channel separation (chromatic aberration), digital noise, scanline effects, and kinetic typography with pulse and jitter. Creates a DJ-scratching aesthetic with rapid position shifts and scale changes during the transition between two text lines.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'cross-fade',
    'rgb-split',
    'chromatic-aberration',
    'kinetic',
    'typography',
    'digital',
    'corruption',
    'scanline',
    'jitter',
    'pulse',
  ],
  defaultInputParams: {
    line1Text: 'FIRST SCENE',
    line2Text: 'NEXT SCENE',
    duration: 3,
    transitionDuration: 1.5,
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: '700',
    rgbSeparation: 8,
    glitchIntensity: 1,
    scanlineOpacity: 0.15,
    digitalArtifactIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const glitchCrossFadeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};