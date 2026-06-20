/**
 * Retro Broadcast Signal Interruption Transition Preset
 *
 * This preset creates a nostalgic emergency broadcast system (EBS) takeover transition
 * that mimics the abrupt signal interruptions seen in emergency broadcasts. The transition
 * features:
 * - SMPTE color bars with precise broadcast colors
 * - No-signal blue screen
 * - Static noise interference
 * - Incoming video breaking through with ghosting/double-image effects
 * - Emergency broadcast tone (1000Hz sine wave)
 * - Stepped transitions for that characteristic "abrupt cut" feeling
 *
 * Perfect for:
 * - Retro/nostalgic video transitions
 * - Emergency broadcast aesthetic
 * - Dramatic scene changes
 * - Glitch/interference effects
 * - Horror/thriller mood setting
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  staticNoiseSrc: z
    .string()
    .optional()
    .describe('Source URL of static noise texture (optional, can use HTMLBlockAtom for generated noise)'),
  emergencyToneSrc: z
    .string()
    .optional()
    .describe('Source URL of 1000Hz emergency tone audio (optional)'),
  transitionDuration: z
    .number()
    .default(1.1)
    .describe('Total duration of the transition in seconds'),
  smpteDuration: z
    .number()
    .default(0.3)
    .describe('Duration to show SMPTE bars in seconds'),
  blueScreenDuration: z
    .number()
    .default(0.2)
    .describe('Duration to show blue screen in seconds'),
  ghostingIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of the ghosting effect (0-1)'),
  ghostingOffset: z
    .number()
    .default(5)
    .describe('Horizontal offset for ghosting effect in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    staticNoiseSrc,
    emergencyToneSrc,
    transitionDuration,
    smpteDuration,
    blueScreenDuration,
    ghostingIntensity,
    ghostingOffset,
  } = params;

  // Calculate timing phases
  const smpteStart = 0;
  const smpteEnd = smpteDuration;
  const blueScreenStart = smpteEnd;
  const blueScreenEnd = blueScreenStart + blueScreenDuration;
  const staticInterferenceStart = blueScreenEnd;
  const staticInterferenceEnd = transitionDuration * 0.9; // 90% of transition
  const incomingVideoStart = transitionDuration * 0.5; // Incoming starts at 50%
  const ghostingDuration = transitionDuration - incomingVideoStart;

  // Create generated static noise if no source provided
  const staticNoiseHTML = `
    <canvas id="static-noise-canvas" style="width: 100%; height: 100%;"></canvas>
    <script>
      (function() {
        const canvas = document.getElementById('static-noise-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        function drawNoise() {
          const imageData = ctx.createImageData(canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const value = Math.random() * 255;
            data[i] = value;     // R
            data[i + 1] = value; // G
            data[i + 2] = value; // B
            data[i + 3] = 255;   // A
          }
          ctx.putImageData(imageData, 0, 0);
          requestAnimationFrame(drawNoise);
        }
        drawNoise();
      })();
    </script>
  `;

  const childrenData: RenderableComponentData[] = [
    // 1. Outgoing video layer (z-index: 1)
    {
      id: 'outgoing-video-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 1,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: smpteEnd, // Cuts off when SMPTE bars appear
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
              duration: smpteEnd,
            },
          },
        },
      ],
    } as RenderableComponentData,

    // 2. SMPTE bars layer (z-index: 10)
    {
      id: 'smpte-bars-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex flex-row',
          style: {
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: smpteStart,
          duration: smpteDuration,
        },
      },
      effects: [
        {
          id: 'smpte-appear',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 0.033, // 1 frame at 30fps for instant appearance
            mode: 'provider',
            targetIds: ['smpte-bars-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        // SMPTE color bars
        {
          id: 'smpte-bar-white',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex-1 h-full',
              style: { backgroundColor: '#FCFCFC' },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: smpteDuration,
            },
          },
        },
        {
          id: 'smpte-bar-yellow',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex-1 h-full',
              style: { backgroundColor: '#FCFC00' },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: smpteDuration,
            },
          },
        },
        {
          id: 'smpte-bar-cyan',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex-1 h-full',
              style: { backgroundColor: '#00FCFC' },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: smpteDuration,
            },
          },
        },
        {
          id: 'smpte-bar-green',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex-1 h-full',
              style: { backgroundColor: '#00FC00' },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: smpteDuration,
            },
          },
        },
        {
          id: 'smpte-bar-magenta',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex-1 h-full',
              style: { backgroundColor: '#FC00FC' },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: smpteDuration,
            },
          },
        },
        {
          id: 'smpte-bar-red',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex-1 h-full',
              style: { backgroundColor: '#FC0000' },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: smpteDuration,
            },
          },
        },
        {
          id: 'smpte-bar-blue',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex-1 h-full',
              style: { backgroundColor: '#0000FC' },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: smpteDuration,
            },
          },
        },
      ] as RenderableComponentData[],
    } as RenderableComponentData,

    // 3. Blue screen layer (z-index: 11)
    {
      id: 'blue-screen-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            backgroundColor: 'rgb(0, 0, 255)',
            zIndex: 11,
          },
        },
      },
      context: {
        timing: {
          start: blueScreenStart,
          duration: blueScreenDuration,
        },
      },
      effects: [
        {
          id: 'blue-screen-appear',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 0.033, // Instant appearance
            mode: 'provider',
            targetIds: ['blue-screen-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // 4. Static texture layer (z-index: 12)
    {
      id: 'static-texture-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 12,
          },
        },
      },
      context: {
        timing: {
          start: staticInterferenceStart,
          duration: staticInterferenceEnd - staticInterferenceStart,
        },
      },
      effects: [
        // Rapid flicker between visible and invisible
        {
          id: 'static-flicker-1',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 0.05,
            mode: 'provider',
            targetIds: ['static-texture-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'static-flicker-2',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0.05,
            duration: 0.05,
            mode: 'provider',
            targetIds: ['static-texture-layer'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'static-flicker-3',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0.1,
            duration: 0.05,
            mode: 'provider',
            targetIds: ['static-texture-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'static-flicker-4',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0.15,
            duration: 0.05,
            mode: 'provider',
            targetIds: ['static-texture-layer'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        staticNoiseSrc
          ? {
              id: 'static-noise-image',
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: staticNoiseSrc,
                className: 'w-full h-full object-cover',
              },
              context: {
                timing: {
                  start: 0,
                  duration: staticInterferenceEnd - staticInterferenceStart,
                },
              },
            }
          : {
              id: 'static-noise-generated',
              type: 'atom',
              componentId: 'HTMLBlockAtom',
              data: {
                html: staticNoiseHTML,
                className: 'w-full h-full',
              },
              context: {
                timing: {
                  start: 0,
                  duration: staticInterferenceEnd - staticInterferenceStart,
                },
              },
            },
      ] as RenderableComponentData[],
    } as RenderableComponentData,

    // 5. Incoming video ghost layer (z-index: 13)
    {
      id: 'incoming-video-ghost-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 13,
          },
        },
      },
      context: {
        timing: {
          start: incomingVideoStart,
          duration: ghostingDuration,
        },
      },
      effects: [
        {
          id: 'ghost-opacity-fade',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: ghostingDuration * 0.5,
            mode: 'provider',
            targetIds: ['incoming-video-ghost'],
            ranges: [
              { key: 'opacity', val: ghostingIntensity, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'ghost-translate-merge',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: ghostingDuration * 0.5,
            mode: 'provider',
            targetIds: ['incoming-video-ghost'],
            ranges: [
              { key: 'translateX', val: ghostingOffset, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'incoming-video-ghost',
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
              duration: ghostingDuration,
            },
          },
        },
      ] as RenderableComponentData[],
    } as RenderableComponentData,

    // 6. Incoming video main layer (z-index: 14)
    {
      id: 'incoming-video-main-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 14,
          },
        },
      },
      context: {
        timing: {
          start: incomingVideoStart,
          duration: ghostingDuration,
        },
      },
      effects: [
        {
          id: 'main-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: ghostingDuration * 0.5,
            mode: 'provider',
            targetIds: ['incoming-video-main'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'incoming-video-main',
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
              duration: ghostingDuration,
            },
          },
        },
      ] as RenderableComponentData[],
    } as RenderableComponentData,

    // 7. Emergency tone audio (if provided)
    ...(emergencyToneSrc
      ? [
          {
            id: 'emergency-tone-audio',
            type: 'atom',
            componentId: 'AudioAtom',
            data: {
              src: emergencyToneSrc,
              volume: 1,
            },
            context: {
              timing: {
                start: smpteStart,
                duration: smpteDuration,
              },
            },
          } as RenderableComponentData,
        ]
      : []),
  ];

  const rootContainer: RenderableComponentData = {
    id: 'retro-broadcast-transition-root',
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
  id: 'retro-broadcast-interruption-transition',
  title: 'Retro Broadcast Signal Interruption Transition',
  description:
    'A nostalgic emergency broadcast system takeover transition featuring SMPTE color bars, no-signal blue screen, static interference, and ghosting effects as incoming video breaks through. Includes iconic 1000Hz emergency tone.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'retro',
    'broadcast',
    'emergency',
    'smpte',
    'static',
    'glitch',
    'interference',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    staticNoiseSrc: '', // Optional: leave empty to use generated static
    emergencyToneSrc: '', // Optional: leave empty to skip emergency tone
    transitionDuration: 1.1,
    smpteDuration: 0.3,
    blueScreenDuration: 0.2,
    ghostingIntensity: 0.5,
    ghostingOffset: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const retroBroadcastInterruptionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
