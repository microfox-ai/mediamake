/**
 * Surveillance Camera Flash Transition
 *
 * This preset creates a CCTV-style transition that mimics security footage switching
 * between cameras with infrared flash illumination. Features include:
 *
 * - **Signal Interference**: Scan lines overlay during transition
 * - **Infrared Flash**: Harsh monochromatic white flash with green tint (#E8FFE8)
 * - **Digital Artifacts**: Pixel blocking and frame tearing effects
 * - **Timestamp Glitch**: Timestamp overlay that glitches during transition
 * - **Night Vision Effect**: Incoming video has brief night-vision look (green tint, high contrast)
 * - **CCTV Distortion**: Barrel distortion applied to both videos for authenticity
 * - **REC Indicator**: Red recording dot for CCTV authenticity
 *
 * Use cases:
 * - Security footage style transitions
 * - Surveillance camera switch effects
 * - CCTV-themed video content
 * - Industrial/security aesthetic transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  outgoingVideoDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  transitionDuration: z
    .number()
    .default(0.7)
    .describe('Duration of the transition overlap in seconds'),
  scanLineIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Intensity of scan lines effect (0.1-1)'),
  flashIntensity: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.95)
    .optional()
    .describe('Intensity of the infrared flash (0.5-1)'),
  nightVisionDuration: z
    .number()
    .default(0.3)
    .optional()
    .describe('Duration of night vision effect on incoming video (seconds)'),
  cameraNumber: z
    .number()
    .default(1)
    .optional()
    .describe('Camera number to display (e.g., 01, 02)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    outgoingVideoDuration,
    incomingVideoSrc,
    incomingVideoDuration,
    transitionDuration,
    scanLineIntensity = 0.3,
    flashIntensity = 0.95,
    nightVisionDuration = 0.3,
    cameraNumber = 1,
  } = params;

  // Calculate total duration
  const totalDuration =
    outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Transition timing
  const transitionStart = outgoingVideoDuration - transitionDuration;

  // Generate current timestamp
  const getCurrentTimestamp = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `CAM ${String(cameraNumber).padStart(2, '0')}  ${year}/${month}/${day}  ${hours}:${minutes}:${seconds}`;
  };

  const timestampText = getCurrentTimestamp();

  // Random positions for pixel artifacts
  const artifactPositions = [
    { top: '15%', left: '20%' },
    { top: '60%', right: '25%' },
    { bottom: '30%', left: '50%' },
    { top: '40%', right: '15%' },
  ];

  // Outgoing video with barrel distortion
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transform: 'scale(1.1)',
          borderRadius: '10%',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideoDuration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideoDuration,
          },
        },
        effects: [
          // Fade out and frame tearing at transition
          {
            id: 'outgoing-fade-tear',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: transitionStart,
              duration: transitionDuration * 0.5,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
                // Frame tearing via clip-path
                {
                  key: 'clipPath',
                  val: 'inset(0% 0% 0% 0%)',
                  prog: 0,
                },
                {
                  key: 'clipPath',
                  val: 'inset(20% 0% 30% 0%)',
                  prog: 0.5,
                },
                {
                  key: 'clipPath',
                  val: 'inset(0% 0% 0% 0%)',
                  prog: 1,
                },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Incoming video with barrel distortion and night vision effect
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transform: 'scale(1.1)',
          borderRadius: '10%',
          overflow: 'hidden',
          opacity: 0,
        },
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: incomingVideoDuration + transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideoDuration + transitionDuration,
          },
        },
        effects: [
          // Container fade in
          {
            id: 'incoming-container-fade',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: transitionDuration * 0.5,
              mode: 'provider',
              targetIds: ['incoming-video-container'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            } as GenericEffectData,
          },
          // Night vision effect (green tint, high contrast)
          {
            id: 'incoming-night-vision',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: nightVisionDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                {
                  key: 'filter',
                  val: 'hue-rotate(120deg) saturate(0.5) contrast(1.5)',
                  prog: 0,
                },
                {
                  key: 'filter',
                  val: 'hue-rotate(0deg) saturate(1) contrast(1)',
                  prog: 1,
                },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData,
    ],
    effects: [],
  };

  // Scan lines overlay
  const scanLinesOverlay: RenderableComponentData = {
    id: 'scan-lines-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          backgroundSize: '100% 4px',
          opacity: 0,
          mixBlendMode: 'multiply',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: 'scan-lines-pulse',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: transitionStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['scan-lines-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: scanLineIntensity, prog: 0.3 },
            { key: 'opacity', val: scanLineIntensity, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Flash overlay (greenish white flash)
  const flashOverlay: RenderableComponentData = {
    id: 'flash-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background-color: #E8FFE8;"></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        opacity: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'flash-spike',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: transitionStart + transitionDuration * 0.3,
          duration: transitionDuration * 0.2,
          mode: 'provider',
          targetIds: ['flash-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: flashIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Pixel artifacts
  const pixelArtifacts: RenderableComponentData[] = artifactPositions.map(
    (pos, index) => {
      const colors = ['#00FF00', '#FFFFFF', '#88FF88', '#CCFFCC'];
      const sizes = [
        { width: '40px', height: '20px' },
        { width: '60px', height: '15px' },
        { width: '30px', height: '30px' },
        { width: '50px', height: '10px' },
      ];

      return {
        id: `pixel-artifact-${index + 1}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background-color: ${colors[index]};"></div>`,
          className: 'absolute pointer-events-none',
          style: {
            ...pos,
            ...sizes[index],
            opacity: 0,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          {
            id: `artifact-flash-${index + 1}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start:
                transitionStart +
                transitionDuration * 0.2 +
                index * (transitionDuration * 0.15),
              duration: transitionDuration * 0.2,
              mode: 'provider',
              targetIds: [`pixel-artifact-${index + 1}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Timestamp overlay with glitch effect
  const timestampOverlay: RenderableComponentData = {
    id: 'timestamp-overlay',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: timestampText,
      style: {
        position: 'absolute',
        bottom: '40px',
        left: '40px',
        color: '#FFFFFF',
        fontSize: '18px',
        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
        letterSpacing: '2px',
        fontFamily: 'monospace',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'timestamp-glitch',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: transitionStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['timestamp-overlay'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.2, prog: 0.1 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 0.1, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.4 },
            { key: 'opacity', val: 0.3, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 0.6 },
            { key: 'opacity', val: 0.2, prog: 0.7 },
            { key: 'opacity', val: 1, prog: 0.8 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // REC indicator (red circle)
  const recIndicator: RenderableComponentData = {
    id: 'rec-indicator',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background-color: #FF0000; border-radius: 50%;"></div>',
      className: 'absolute pointer-events-none',
      style: {
        top: '40px',
        right: '60px',
        width: '12px',
        height: '12px',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'rec-blink',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: ['rec-indicator'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'surveillance-camera-flash-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideoContainer,
      incomingVideoContainer,
      scanLinesOverlay,
      flashOverlay,
      ...pixelArtifacts,
      timestampOverlay,
      recIndicator,
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

const presetMetadata: PresetMetadata = {
  id: 'surveillance-camera-flash-transition',
  title: 'Surveillance Camera Flash Transition',
  description:
    'A CCTV-style transition that mimics security footage switching between cameras with infrared flash illumination, scan line interference, digital artifacts, pixel blocking, frame tearing, timestamp glitching, and night-vision effect on incoming video. Features authentic barrel distortion on both video feeds.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'surveillance',
    'cctv',
    'security',
    'infrared',
    'glitch',
    'night-vision',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    outgoingVideoDuration: 5,
    incomingVideoSrc: 'https://example.com/video2.mp4',
    incomingVideoDuration: 5,
    transitionDuration: 0.7,
    scanLineIntensity: 0.3,
    flashIntensity: 0.95,
    nightVisionDuration: 0.3,
    cameraNumber: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const surveillanceCameraFlashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};