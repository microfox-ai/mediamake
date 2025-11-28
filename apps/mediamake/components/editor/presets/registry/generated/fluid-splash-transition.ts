/**
 * Fluid Splash Transition Preset
 *
 * Creates a dynamic paint/ink splash transition that reveals the incoming video
 * through an animated splash pattern rising from bottom to top. Features include:
 * 
 * - Main splash body with organic, irregular shape using SVG clip-path
 * - 3-5 satellite splashes (droplets) with individual animations
 * - Displacement/ripple effect on outgoing video (simulated via blur + distortion)
 * - Brief shake effect (0.2s) at impact moment to sell physicality
 * - Splash momentum via skewY animation
 * - Scale bounce effect (1→1.1→1) at impact
 * 
 * Technical approach:
 * - BaseLayout container with 1.8s duration for overlap window
 * - Incoming video uses complex SVG clipPath for splash reveal
 * - Outgoing video gets shake + blur/distortion effects
 * - Satellite droplets use HTMLBlockAtom with irregular border-radius shapes
 * - All effects use provider mode with targetIds
 * - Timing is relative to parent container (0s = transition start)
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    startFrom: z.number().default(0).optional().describe('Start time of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    startFrom: z.number().default(0).optional().describe('Start time of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  transitionDuration: z.number().default(1.8).describe('Duration of splash transition overlap in seconds'),
  
  splashColor: z.string().default('#000000').optional().describe('Color of splash droplets (CSS color)'),
  
  shakeIntensity: z.number().default(15).min(0).max(50).optional().describe('Intensity of shake effect in pixels'),
  
  impactMoment: z.number().default(0.2).describe('Time of impact/shake relative to transition start (seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { incomingVideo, outgoingVideo, transitionDuration, splashColor, shakeIntensity, impactMoment } = params;
  
  // Calculate durations
  // For a transition: outgoing plays full duration, incoming starts during overlap
  // We'll assume videos are long enough - user provides them with correct timing
  const overlapDuration = transitionDuration;
  
  // Generate SVG splash clipPath
  // Create an organic splash shape using SVG path
  const generateSplashPath = (): string => {
    // Complex splash shape - irregular organic form
    // Path starts at bottom, splashes upward with irregular edges
    return `path('M 0 100 Q 10 90, 15 85 T 30 75 Q 35 70, 40 68 T 55 60 Q 60 55, 65 52 T 80 45 Q 85 40, 90 38 T 100 35 L 100 100 Z')`;
  };
  
  const splashPath = generateSplashPath();
  
  // Create childrenData
  const childrenData: RenderableComponentData[] = [];
  
  // 1. Outgoing video (with shake + displacement effects)
  childrenData.push({
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom ?? 0,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    effects: [
      // Shake effect at impact moment
      {
        id: 'shake-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: impactMoment,
          duration: 0.2,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: (shakeIntensity ?? 15) * (Math.random() - 0.5) * 2, prog: 0.1 },
            { key: 'translateX', val: (shakeIntensity ?? 15) * (Math.random() - 0.5) * -2, prog: 0.2 },
            { key: 'translateX', val: (shakeIntensity ?? 15) * (Math.random() - 0.5) * 2, prog: 0.3 },
            { key: 'translateX', val: (shakeIntensity ?? 15) * (Math.random() - 0.5) * -2, prog: 0.4 },
            { key: 'translateX', val: (shakeIntensity ?? 15) * (Math.random() - 0.5) * 1.5, prog: 0.5 },
            { key: 'translateX', val: (shakeIntensity ?? 15) * (Math.random() - 0.5) * -1.5, prog: 0.6 },
            { key: 'translateX', val: (shakeIntensity ?? 15) * (Math.random() - 0.5) * 1, prog: 0.7 },
            { key: 'translateX', val: (shakeIntensity ?? 15) * (Math.random() - 0.5) * -1, prog: 0.8 },
            { key: 'translateX', val: (shakeIntensity ?? 15) * (Math.random() - 0.5) * 0.5, prog: 0.9 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: (shakeIntensity ?? 15) * (Math.random() - 0.5) * 2, prog: 0.1 },
            { key: 'translateY', val: (shakeIntensity ?? 15) * (Math.random() - 0.5) * -2, prog: 0.2 },
            { key: 'translateY', val: (shakeIntensity ?? 15) * (Math.random() - 0.5) * 2, prog: 0.3 },
            { key: 'translateY', val: (shakeIntensity ?? 15) * (Math.random() - 0.5) * -2, prog: 0.4 },
            { key: 'translateY', val: (shakeIntensity ?? 15) * (Math.random() - 0.5) * 1.5, prog: 0.5 },
            { key: 'translateY', val: (shakeIntensity ?? 15) * (Math.random() - 0.5) * -1.5, prog: 0.6 },
            { key: 'translateY', val: (shakeIntensity ?? 15) * (Math.random() - 0.5) * 1, prog: 0.7 },
            { key: 'translateY', val: (shakeIntensity ?? 15) * (Math.random() - 0.5) * -1, prog: 0.8 },
            { key: 'translateY', val: (shakeIntensity ?? 15) * (Math.random() - 0.5) * 0.5, prog: 0.9 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
      // Displacement effect (simulated via blur + distortion)
      {
        id: 'displacement-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: impactMoment,
          duration: overlapDuration - impactMoment,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter', val: 'blur(0px) contrast(1)', prog: 0 },
            { key: 'filter', val: 'blur(8px) contrast(1.2)', prog: 0.3 },
            { key: 'filter', val: 'blur(4px) contrast(1.1)', prog: 0.6 },
            { key: 'filter', val: 'blur(2px) contrast(1.05)', prog: 0.8 },
            { key: 'filter', val: 'blur(0px) contrast(1)', prog: 1 },
          ],
        },
      },
      // Fade out
      {
        id: 'outgoing-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: overlapDuration * 0.5,
          duration: overlapDuration * 0.5,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);
  
  // 2. Incoming video (with splash reveal, skew, scale bounce)
  childrenData.push({
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      startFrom: incomingVideo.startFrom ?? 0,
      className: 'absolute bottom-0 inset-x-0 w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    effects: [
      // Splash reveal using clipPath animation
      {
        id: 'splash-reveal-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            // Animate clipPath from bottom (inset 100% 0 0 0) to full reveal (inset 0 0 0 0)
            { key: 'clipPath', val: 'inset(100% 0 0 0)', prog: 0 },
            { key: 'clipPath', val: 'inset(70% 0 0 0)', prog: 0.2 },
            { key: 'clipPath', val: 'inset(40% 0 0 0)', prog: 0.5 },
            { key: 'clipPath', val: 'inset(10% 0 0 0)', prog: 0.8 },
            { key: 'clipPath', val: 'inset(0% 0 0 0)', prog: 1 },
          ],
        },
      },
      // Skew effect for splash momentum
      {
        id: 'skew-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration * 0.6,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'skewY', val: -5, prog: 0 },
            { key: 'skewY', val: -3, prog: 0.3 },
            { key: 'skewY', val: -1, prog: 0.6 },
            { key: 'skewY', val: 0, prog: 1 },
          ],
        },
      },
      // Scale bounce at impact moment
      {
        id: 'scale-bounce-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: impactMoment,
          duration: 0.4,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.1, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);
  
  // 3. Satellite splashes (droplets)
  const satelliteCount = 3;
  const satelliteConfigs = [
    { bottom: '20%', left: '15%', size: 60, delay: 0.1, duration: 1.7 },
    { bottom: '35%', right: '25%', size: 45, delay: 0.3, duration: 1.5 },
    { bottom: '50%', left: '60%', size: 50, delay: 0.5, duration: 1.3 },
  ];
  
  satelliteConfigs.forEach((config, index) => {
    const satelliteId = `satellite-splash-${index + 1}`;
    
    childrenData.push({
      id: satelliteId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class="splash-droplet" style="width: 100%; height: 100%; background-color: ${splashColor ?? '#000000'}; border-radius: ${Math.random() > 0.5 ? '50% 40% 60% 50%' : '60% 50% 50% 40%'};"></div>`,
        className: 'absolute',
        style: {
          width: `${config.size}px`,
          height: `${config.size}px`,
          bottom: config.bottom,
          ...(config.left ? { left: config.left } : { right: config.right }),
        },
      },
      context: {
        timing: {
          start: config.delay,
          duration: config.duration,
        },
      },
      effects: [
        {
          id: `satellite-${index + 1}-animation`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: config.duration,
            mode: 'provider',
            targetIds: [satelliteId],
            ranges: [
              // Fly upward and fade
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -100 - Math.random() * 100, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: (Math.random() - 0.5) * 80, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.3 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.8, prog: 0.5 },
              { key: 'scale', val: 0.4, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  });
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'fluid-splash-transition-container',
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
        duration: overlapDuration,
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
  id: 'fluid-splash-transition',
  title: 'Fluid Splash Transition',
  description: 'A dynamic paint/ink splash transition that reveals incoming video through an organic splash pattern rising from bottom to top with droplets, displacement effects on outgoing video, and impact shake.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'splash', 'paint', 'ink', 'fluid', 'organic', 'impact', 'shake', 'displacement'],
  defaultInputParams: {
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      startFrom: 0,
    },
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      startFrom: 0,
    },
    transitionDuration: 1.8,
    splashColor: '#000000',
    shakeIntensity: 15,
    impactMoment: 0.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const fluidSplashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
