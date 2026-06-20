/**
 * Thermal Camera Racing Telemetry Transition Preset
 *
 * A high-tech thermal camera transition effect simulating F1 racing broadcast telemetry
 * visualization. Converts scenes to a heat map color palette with digital scan reveal,
 * temperature readouts, technical grid overlays, pulsing hotspots for areas of interest,
 * and digital artifacts including compression blocks and signal interference.
 *
 * Features:
 * - Thermal filter with heat gradient color mapping (purple → blue → green → yellow → red)
 * - Digital scan line effect sweeping across the screen
 * - Technical grid overlay for analysis aesthetic
 * - Temperature readouts with monospace font and glow effects
 * - Pulsing hotspots indicating areas of high interest
 * - Digital artifacts simulating compression blocks and signal interference
 * - Smooth crossfade transition between source and destination scenes
 *
 * Use Cases:
 * - F1 and racing content transitions
 * - Sports analysis and telemetry visualization
 * - Automotive and tech-focused productions
 * - High-tech broadcast-style transitions
 * - Technical demonstration videos
 *
 * Technical Implementation:
 * - Uses CSS filters and blend modes for thermal effect
 * - Gradient overlay with mix-blend-mode: color for heat mapping
 * - Repeating linear gradients for technical grid
 * - Animated scan line with translateY transform
 * - Pulsing hotspots with scale and opacity animations
 * - Digital artifacts with flickering opacity effects
 * - Signal interference using subtle noise patterns
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  sourceVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video/image (current scene)'),
  sourceVideoDuration: z
    .number()
    .describe('Duration of the source video in seconds'),
  destinationVideoSrc: z
    .string()
    .describe('Source URL of the incoming video/image (next scene)'),
  destinationVideoDuration: z
    .number()
    .describe('Duration of the destination video in seconds'),
  transitionDuration: z
    .number()
    .default(2.0)
    .describe('Duration of the thermal transition effect in seconds'),
  temperatureValue: z
    .number()
    .default(385)
    .describe('Temperature value to display in the center readout (°C)'),
  lapNumber: z.number().default(12).describe('Lap number for telemetry display'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    sourceVideoSrc,
    sourceVideoDuration,
    destinationVideoSrc,
    destinationVideoDuration,
    transitionDuration,
    temperatureValue,
    lapNumber,
  } = params;

  // Calculate total duration: source plays fully, then transition overlaps into destination
  // During transition (last transitionDuration seconds of source):
  // - Thermal effect fades in (0-40% of transition)
  // - Scan line sweeps (40-60% of transition)
  // - Destination fades in while thermal fades out (60-100% of transition)
  const totalDuration = sourceVideoDuration + destinationVideoDuration;

  // Transition phases (relative to source video start)
  const thermalStartTime = sourceVideoDuration - transitionDuration;
  const thermalFadeInDuration = transitionDuration * 0.4;
  const scanStartTime = thermalStartTime + thermalFadeInDuration;
  const scanDuration = transitionDuration * 0.2;
  const destinationFadeStartTime = scanStartTime + scanDuration;
  const destinationFadeDuration = transitionDuration * 0.4;

  const childrenData: RenderableComponentData[] = [];

  // ============================================================================
  // SOURCE SCENE LAYER (Background video/image)
  // ============================================================================

  const sourceIsVideo = sourceVideoSrc.match(/\.(mp4|webm|mov)$/i);
  childrenData.push({
    id: 'thermal-transition-source-video',
    type: 'atom',
    componentId: sourceIsVideo ? 'VideoAtom' : 'ImageAtom',
    data: {
      src: sourceVideoSrc,
      fit: 'cover',
      className: 'w-full h-full',
      ...(sourceIsVideo && { muted: true }),
    },
    context: {
      timing: {
        start: 0,
        duration: sourceVideoDuration,
      },
    },
    effects: [
      // Fade out during destination fade-in
      {
        id: 'source-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: destinationFadeStartTime,
          duration: destinationFadeDuration,
          mode: 'provider',
          targetIds: ['thermal-transition-source-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // ============================================================================
  // THERMAL FILTER LAYER (Heat gradient overlay)
  // ============================================================================

  childrenData.push({
    id: 'thermal-transition-thermal-gradient',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'linear-gradient(to bottom, #8B00FF, #0000FF, #00FF00, #FFFF00, #FF0000)',
          mixBlendMode: 'color' as any,
        },
      },
    },
    context: {
      timing: {
        start: thermalStartTime,
        duration: transitionDuration,
      },
    },
    effects: [
      // Fade in thermal effect (0-40%)
      {
        id: 'thermal-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: thermalFadeInDuration,
          mode: 'provider',
          targetIds: ['thermal-transition-thermal-gradient'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 1 },
          ],
        },
      },
      // Fade out thermal effect (60-100%)
      {
        id: 'thermal-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: destinationFadeStartTime - thermalStartTime,
          duration: destinationFadeDuration,
          mode: 'provider',
          targetIds: ['thermal-transition-thermal-gradient'],
          ranges: [
            { key: 'opacity', val: 0.8, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  } as RenderableComponentData);

  // ============================================================================
  // SCAN EFFECT LAYER (Digital scan line)
  // ============================================================================

  childrenData.push({
    id: 'thermal-transition-scan-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
      },
    },
    context: {
      timing: {
        start: scanStartTime,
        duration: scanDuration,
      },
    },
    childrenData: [
      {
        id: 'thermal-transition-scan-line',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute left-0 right-0',
            style: {
              height: '4px',
              background:
                'linear-gradient(to bottom, transparent, rgba(0,255,0,0.8), rgba(0,255,0,1), rgba(0,255,0,0.8), transparent)',
              top: '0%',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: scanDuration,
          },
        },
        effects: [
          {
            id: 'scan-line-animation',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: scanDuration,
              mode: 'provider',
              targetIds: ['thermal-transition-scan-line'],
              ranges: [
                { key: 'translateY', val: '0vh', prog: 0 },
                { key: 'translateY', val: '100vh', prog: 1 },
              ],
            },
          },
        ],
        childrenData: [],
      } as RenderableComponentData,
    ],
  } as RenderableComponentData);

  // ============================================================================
  // GRID OVERLAY LAYER (Technical grid lines)
  // ============================================================================

  childrenData.push({
    id: 'thermal-transition-grid',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(0,255,0,0.15) 19px, rgba(0,255,0,0.15) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(0,255,0,0.15) 19px, rgba(0,255,0,0.15) 20px)',
          backgroundSize: '20px 20px',
        },
      },
    },
    context: {
      timing: {
        start: thermalStartTime,
        duration: transitionDuration,
      },
    },
    effects: [
      // Fade in with thermal effect
      {
        id: 'grid-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: thermalFadeInDuration,
          mode: 'provider',
          targetIds: ['thermal-transition-grid'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Fade out with thermal effect
      {
        id: 'grid-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: destinationFadeStartTime - thermalStartTime,
          duration: destinationFadeDuration,
          mode: 'provider',
          targetIds: ['thermal-transition-grid'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  } as RenderableComponentData);

  // ============================================================================
  // TEMPERATURE READOUTS LAYER (HUD overlays)
  // ============================================================================

  const readouts: RenderableComponentData[] = [
    {
      id: 'thermal-transition-readout-topleft',
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: 'THERMAL CAM 01',
        style: {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#4ade80',
          textShadow: '0 0 4px rgba(74,222,128,0.5)',
        },
        className: 'absolute top-4 left-4',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
    {
      id: 'thermal-transition-readout-topright',
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: 'BRAKE ZONE ANALYSIS',
        style: {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#4ade80',
          textShadow: '0 0 4px rgba(74,222,128,0.5)',
        },
        className: 'absolute top-4 right-4',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
    {
      id: 'thermal-transition-readout-center',
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: `${temperatureValue}°C`,
        style: {
          fontFamily: 'monospace',
          fontSize: '24px',
          color: '#facc15',
          textShadow: '0 0 8px rgba(250,204,21,0.7)',
        },
        className: 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
    {
      id: 'thermal-transition-readout-bottomleft',
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: `F1 TELEMETRY | LAP ${lapNumber}`,
        style: {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#4ade80',
          textShadow: '0 0 4px rgba(74,222,128,0.5)',
        },
        className: 'absolute bottom-4 left-4',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
  ];

  childrenData.push({
    id: 'thermal-transition-readouts-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: thermalStartTime,
        duration: transitionDuration,
      },
    },
    effects: [
      // Fade in with thermal effect
      {
        id: 'readouts-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: thermalFadeInDuration,
          mode: 'provider',
          targetIds: ['thermal-transition-readouts-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Fade out with thermal effect
      {
        id: 'readouts-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: destinationFadeStartTime - thermalStartTime,
          duration: destinationFadeDuration,
          mode: 'provider',
          targetIds: ['thermal-transition-readouts-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: readouts,
  } as RenderableComponentData);

  // ============================================================================
  // HOTSPOTS LAYER (Pulsing heat indicators)
  // ============================================================================

  const hotspots: RenderableComponentData[] = [
    {
      id: 'thermal-transition-hotspot-1',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            top: '30%',
            left: '40%',
            width: '60px',
            height: '60px',
            background:
              'radial-gradient(circle, rgba(255,0,0,0.8) 0%, rgba(255,100,0,0.4) 40%, transparent 70%)',
            borderRadius: '50%',
          },
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
          id: 'hotspot-1-pulse',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['thermal-transition-hotspot-1'],
            ranges: [
              { key: 'scale', val: 1.0, prog: 0 },
              { key: 'scale', val: 1.3, prog: 0.5 },
              { key: 'scale', val: 1.0, prog: 1 },
              { key: 'opacity', val: 0.6, prog: 0 },
              { key: 'opacity', val: 1.0, prog: 0.5 },
              { key: 'opacity', val: 0.6, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,
    {
      id: 'thermal-transition-hotspot-2',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            top: '50%',
            left: '60%',
            width: '80px',
            height: '80px',
            background:
              'radial-gradient(circle, rgba(255,50,0,0.9) 0%, rgba(255,150,0,0.5) 40%, transparent 70%)',
            borderRadius: '50%',
          },
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
          id: 'hotspot-2-pulse',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionDuration * 0.1,
            duration: transitionDuration * 0.9,
            mode: 'provider',
            targetIds: ['thermal-transition-hotspot-2'],
            ranges: [
              { key: 'scale', val: 1.0, prog: 0 },
              { key: 'scale', val: 1.3, prog: 0.5 },
              { key: 'scale', val: 1.0, prog: 1 },
              { key: 'opacity', val: 0.7, prog: 0 },
              { key: 'opacity', val: 1.0, prog: 0.5 },
              { key: 'opacity', val: 0.7, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,
    {
      id: 'thermal-transition-hotspot-3',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            top: '65%',
            left: '35%',
            width: '50px',
            height: '50px',
            background:
              'radial-gradient(circle, rgba(255,200,0,0.7) 0%, rgba(255,255,0,0.3) 40%, transparent 70%)',
            borderRadius: '50%',
          },
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
          id: 'hotspot-3-pulse',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionDuration * 0.15,
            duration: transitionDuration * 0.85,
            mode: 'provider',
            targetIds: ['thermal-transition-hotspot-3'],
            ranges: [
              { key: 'scale', val: 1.0, prog: 0 },
              { key: 'scale', val: 1.3, prog: 0.5 },
              { key: 'scale', val: 1.0, prog: 1 },
              { key: 'opacity', val: 0.5, prog: 0 },
              { key: 'opacity', val: 0.9, prog: 0.5 },
              { key: 'opacity', val: 0.5, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,
  ];

  childrenData.push({
    id: 'thermal-transition-hotspots-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: thermalStartTime,
        duration: transitionDuration,
      },
    },
    effects: [
      // Fade in with thermal effect
      {
        id: 'hotspots-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: thermalFadeInDuration,
          mode: 'provider',
          targetIds: ['thermal-transition-hotspots-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Fade out with thermal effect
      {
        id: 'hotspots-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: destinationFadeStartTime - thermalStartTime,
          duration: destinationFadeDuration,
          mode: 'provider',
          targetIds: ['thermal-transition-hotspots-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: hotspots,
  } as RenderableComponentData);

  // ============================================================================
  // DIGITAL ARTIFACTS LAYER (Compression blocks)
  // ============================================================================

  const artifacts: RenderableComponentData[] = [
    {
      id: 'thermal-transition-artifact-1',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            top: '15%',
            left: '70%',
            width: '16px',
            height: '16px',
            backgroundColor: 'rgba(0,0,0,0.5)',
          },
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
          id: 'artifact-1-flicker',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['thermal-transition-artifact-1'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.2 },
              { key: 'opacity', val: 0, prog: 0.4 },
              { key: 'opacity', val: 0.5, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 0.8 },
              { key: 'opacity', val: 0.5, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,
    {
      id: 'thermal-transition-artifact-2',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            top: '45%',
            left: '20%',
            width: '24px',
            height: '24px',
            backgroundColor: 'rgba(0,0,0,0.5)',
          },
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
          id: 'artifact-2-flicker',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionDuration * 0.1,
            duration: transitionDuration * 0.9,
            mode: 'provider',
            targetIds: ['thermal-transition-artifact-2'],
            ranges: [
              { key: 'opacity', val: 0.5, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.25 },
              { key: 'opacity', val: 0.5, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 0.75 },
              { key: 'opacity', val: 0.5, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,
    {
      id: 'thermal-transition-artifact-3',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            top: '75%',
            left: '80%',
            width: '20px',
            height: '20px',
            backgroundColor: 'rgba(0,0,0,0.5)',
          },
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
          id: 'artifact-3-flicker',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionDuration * 0.15,
            duration: transitionDuration * 0.85,
            mode: 'provider',
            targetIds: ['thermal-transition-artifact-3'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.3 },
              { key: 'opacity', val: 0, prog: 0.6 },
              { key: 'opacity', val: 0.5, prog: 0.9 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,
    {
      id: 'thermal-transition-artifact-4',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            top: '85%',
            left: '10%',
            width: '12px',
            height: '12px',
            backgroundColor: 'rgba(0,0,0,0.5)',
          },
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
          id: 'artifact-4-flicker',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionDuration * 0.05,
            duration: transitionDuration * 0.95,
            mode: 'provider',
            targetIds: ['thermal-transition-artifact-4'],
            ranges: [
              { key: 'opacity', val: 0.5, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.15 },
              { key: 'opacity', val: 0.5, prog: 0.35 },
              { key: 'opacity', val: 0, prog: 0.55 },
              { key: 'opacity', val: 0.5, prog: 0.75 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,
  ];

  childrenData.push({
    id: 'thermal-transition-artifacts-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: thermalStartTime,
        duration: transitionDuration,
      },
    },
    childrenData: artifacts,
  } as RenderableComponentData);

  // ============================================================================
  // SIGNAL INTERFERENCE LAYER (Noise pattern)
  // ============================================================================

  childrenData.push({
    id: 'thermal-transition-signal-interference',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0%, rgba(0,255,0,0.03) 50%, transparent 100%)',
          backgroundSize: '100% 4px',
        },
      },
    },
    context: {
      timing: {
        start: thermalStartTime,
        duration: transitionDuration,
      },
    },
    effects: [
      // Fade in with thermal effect
      {
        id: 'interference-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: thermalFadeInDuration,
          mode: 'provider',
          targetIds: ['thermal-transition-signal-interference'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Fade out with thermal effect
      {
        id: 'interference-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: destinationFadeStartTime - thermalStartTime,
          duration: destinationFadeDuration,
          mode: 'provider',
          targetIds: ['thermal-transition-signal-interference'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  } as RenderableComponentData);

  // ============================================================================
  // DESTINATION SCENE LAYER (Incoming video/image)
  // ============================================================================

  const destinationIsVideo = destinationVideoSrc.match(/\.(mp4|webm|mov)$/i);
  childrenData.push({
    id: 'thermal-transition-destination-video',
    type: 'atom',
    componentId: destinationIsVideo ? 'VideoAtom' : 'ImageAtom',
    data: {
      src: destinationVideoSrc,
      fit: 'cover',
      className: 'w-full h-full',
      ...(destinationIsVideo && { muted: true }),
    },
    context: {
      timing: {
        start: destinationFadeStartTime,
        duration: destinationVideoDuration,
      },
    },
    effects: [
      // Fade in destination
      {
        id: 'destination-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: destinationFadeDuration,
          mode: 'provider',
          targetIds: ['thermal-transition-destination-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'thermal-racing-telemetry-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'thermal-racing-telemetry-transition',
  title: 'Thermal Camera Racing Telemetry Transition',
  description:
    'A high-tech thermal camera transition effect simulating F1 racing broadcast telemetry visualization. Converts scenes to heat map color palette with digital scan reveal, temperature readouts, technical grid overlays, pulsing hotspots for areas of interest, and digital artifacts including compression blocks and signal interference. Perfect for sports analysis, automotive content, and tech-focused productions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'thermal',
    'racing',
    'telemetry',
    'f1',
    'technical',
    'hud',
    'sports',
    'automotive',
    'tech',
    'broadcast',
    'heat-map',
    'scan',
    'grid',
  ],
  defaultInputParams: {
    sourceVideoSrc: 'https://example.com/racing-footage.mp4',
    sourceVideoDuration: 5,
    destinationVideoSrc: 'https://example.com/next-scene.mp4',
    destinationVideoDuration: 5,
    transitionDuration: 2.0,
    temperatureValue: 385,
    lapNumber: 12,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const thermalRacingTelemetryTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
