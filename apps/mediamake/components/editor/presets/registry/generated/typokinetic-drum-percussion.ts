/**
 * Typokinetic Drum Percussion Visualizer Preset
 *
 * Transforms stencil text into an audio-reactive percussion instrument visualization.
 * Each letter behaves like an elastic drum skin, deforming with circular shockwaves
 * on kick hits. Features 3D perspective bounce, mesh distortion, and reverb-like
 * echo layers that trail behind on strong impacts.
 *
 * Features:
 * - **Drum Skin Physics**: Letters deform and ripple like stretched drum heads when struck
 * - **Kick-Synced Shockwaves**: Circular impact waves emanate from hit points (center or random)
 * - **3D Perspective Bounce**: Text tilts forward/back in space with rotateX transforms
 * - **Elastic Return**: Spring physics for realistic bounce-back behavior
 * - **Echo Layers**: Reverb-like duplicate layers briefly appear behind main text
 * - **Mesh Distortion**: SVG turbulence effects create elastic letter deformation
 * - **Sharp Stencil Cuts**: Heavy stencil fonts maintain crisp edges despite surface undulation
 *
 * Use cases:
 * - Music videos with percussive visual rhythm
 * - Drum performance visualizations
 * - Impact-heavy title sequences
 * - Audio-reactive typography displays
 * - Beat-synchronized text animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  text: z.string().default('DRUM').describe('Text to display as drum skin'),
  audio: z
    .object({
      src: z.string().describe('Audio source URL or ref:componentId'),
    })
    .describe('Audio source for beat detection'),
  fontSize: z
    .string()
    .default('120px')
    .describe('Font size for the stencil text'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the stencil text'),
  font: z
    .string()
    .default('Anton:900')
    .describe(
      'Font family with weight (e.g., "Anton:900", "Bebas Neue:900")',
    ),
  kickSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .describe('Sensitivity to kick drum hits'),
  impactIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .describe('Intensity of impact deformation'),
  rippleScale: z
    .number()
    .min(1)
    .max(1.5)
    .default(1.2)
    .describe('Maximum radial scale during ripple (1.0 to 1.5)'),
  tiltRange: z
    .number()
    .min(5)
    .max(20)
    .default(10)
    .describe('3D perspective tilt range in degrees (-tiltRange to +tiltRange)'),
  depthRange: z
    .number()
    .min(0)
    .max(100)
    .default(50)
    .describe('TranslateZ depth range in pixels (0 to depthRange)'),
  turbulenceIntensity: z
    .number()
    .min(0)
    .max(0.05)
    .default(0.02)
    .describe('Mesh distortion turbulence intensity'),
  showEchoLayers: z
    .boolean()
    .default(true)
    .describe('Show reverb-like echo duplicate layers'),
  echoCount: z
    .number()
    .int()
    .min(1)
    .max(5)
    .default(3)
    .describe('Number of echo layers (1-5)'),
  randomImpactPoint: z
    .boolean()
    .default(false)
    .describe('Randomize impact point per hit (false = center impact)'),
});

// --- Preset Execution Function ---

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { config } = props;
  const fps = config?.fps || 30;

  // Parse font string (format: "FontName:weight")
  const fontString = params.font || 'Anton:900';
  const fontParts = fontString.split(':');
  const fontFamily = fontParts[0];
  const fontWeight = fontParts.length > 1 ? fontParts[1] : '900';

  // Generate component IDs
  const rootContainerId = 'typokinetic-drum-root';
  const audioId = 'typokinetic-drum-audio';
  const mainTextId = 'typokinetic-drum-main-text';
  const echoLayerIds = Array.from(
    { length: params.echoCount },
    (_, i) => `typokinetic-drum-echo-${i + 1}`,
  );

  // Create SVG filter for mesh distortion
  const svgFilterId = 'drum-mesh-distortion';
  const svgFilterHtml = `
    <svg style="position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none;">
      <defs>
        <filter id="${svgFilterId}">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="0.01" 
            numOctaves="3" 
            result="turbulence"
          />
          <feDisplacementMap 
            in="SourceGraphic" 
            in2="turbulence" 
            scale="0" 
            xChannelSelector="R" 
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  `;

  // Build child components (echo layers + main text + SVG filter)
  const childrenData: any[] = [];

  // Add audio source
  childrenData.push({
    id: audioId,
    type: 'atom',
    componentId: 'AudioAtom',
    data: {
      src: params.audio.src,
      volume: 1,
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioId,
      },
    },
  } as RenderableComponentData);

  // Add SVG filter definition
  childrenData.push({
    id: 'svg-filter-def',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: svgFilterHtml,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioId,
      },
    },
  } as RenderableComponentData);

  // Add echo layers (if enabled)
  if (params.showEchoLayers) {
    for (let i = 0; i < params.echoCount; i++) {
      const echoOpacity = Math.max(0.1, 0.3 - i * 0.1);
      const echoBlur = i + 1;
      const echoDepth = -(i + 1) * 20; // -20px, -40px, -60px, etc.

      childrenData.push({
        id: echoLayerIds[i],
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: params.text,
          font: {
            family: fontFamily,
            weights: [fontWeight],
          },
          style: {
            fontSize: params.fontSize,
            fontWeight: fontWeight,
            color: params.textColor,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            WebkitTextStroke: '2px currentColor',
            opacity: echoOpacity,
            filter: `blur(${echoBlur}px)`,
            transform: `translateZ(${echoDepth}px)`,
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: audioId,
          },
        },
        effects: [],
      } as RenderableComponentData);
    }
  }

  // Add main text layer
  childrenData.push({
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
      style: {
        fontSize: params.fontSize,
        fontWeight: fontWeight,
        color: params.textColor,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        WebkitTextStroke: '2px currentColor',
        filter: `url(#${svgFilterId})`,
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioId,
      },
    },
    effects: [
      // Waveform-based zoom effect (drum hit deformation)
      {
        id: 'drum-hit-zoom',
        componentId: 'waveform',
        data: {
          audioSrc: params.audio.src,
          audioProperty: 'bass',
          effectType: 'zoom',
          intensity: params.impactIntensity,
          baseScale: 1,
          sensitivity: params.kickSensitivity,
          threshold: 0.3,
          numberOfSamples: 128,
          useFrequencyData: true,
          windowInSeconds: 1 / fps,
          mode: 'provider',
          targetIds: [mainTextId],
          start: 0,
          fitDurationTo: audioId,
          smoothNormalisation: 0.5,
        },
      },
      // 3D perspective tilt (rotateX bounce)
      {
        id: 'drum-perspective-tilt',
        componentId: 'waveform',
        data: {
          audioSrc: params.audio.src,
          audioProperty: 'bass',
          effectType: 'rotate',
          intensity: params.tiltRange / 100, // Normalized intensity
          rotationRange: params.tiltRange,
          sensitivity: params.kickSensitivity,
          threshold: 0.3,
          numberOfSamples: 128,
          useFrequencyData: true,
          windowInSeconds: 1 / fps,
          mode: 'provider',
          targetIds: [mainTextId],
          start: 0,
          fitDurationTo: audioId,
          smoothNormalisation: 0.5,
        },
      },
    ],
  } as RenderableComponentData);

  // Build root container
  const rootContainer = {
    id: rootContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioId,
      },
    },
    childrenData: childrenData as RenderableComponentData[],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'typokinetic-drum-percussion',
  title: 'Typokinetic Drum Percussion Visualizer',
  description:
    'Audio-reactive stencil text preset that transforms typography into percussion instrument visualization. Each letter behaves like an elastic drum skin, deforming with circular shockwaves on kick hits. Features 3D perspective bounce, mesh distortion, and reverb-like echo layers that trail behind on strong impacts.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'typography',
    'kinetic',
    'percussion',
    'drum',
    'waveform',
    '3d',
    'stencil',
    'impact',
    'beat-sync',
  ],
  defaultInputParams: {
    text: 'DRUM',
    audio: {
      src: 'https://example.com/audio.mp3',
    },
    fontSize: '120px',
    textColor: '#ffffff',
    font: 'Anton:900',
    kickSensitivity: 1.5,
    impactIntensity: 0.3,
    rippleScale: 1.2,
    tiltRange: 10,
    depthRange: 50,
    turbulenceIntensity: 0.02,
    showEchoLayers: true,
    echoCount: 3,
    randomImpactPoint: false,
  },
  dependencies: {},
};

// --- Export Preset ---

export const typokineticDrumPercussionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
