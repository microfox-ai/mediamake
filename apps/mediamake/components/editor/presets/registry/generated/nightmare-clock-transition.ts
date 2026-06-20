/**
 * Nightmare Clock Transition Preset
 * 
 * A horror-themed transition featuring a distorted clock face with wildly spinning hands,
 * melting numbers, cracking reveals of disturbing visions, and mechanical gear elements.
 * Creates a sense of temporal chaos through five distinct phases:
 * - Normal Ticking (0-15%): Steady clock with subtle movement
 * - Acceleration/Distortion (15-45%): Clock hands speed up, numbers begin melting
 * - Temporal Chaos (45-70%): Complete chaos with multiple overlapping times, cracks appear
 * - Violent Stop (70-85%): Abrupt halt, shake effects, sparks intensify
 * - Dissolution (85-100%): Fade out, blur, transition to next scene
 * 
 * Features:
 * - Ghostly afterimages of clock hands showing multiple positions simultaneously
 * - Mechanical gear elements that grind and spark
 * - Cracking clock face revealing glimpses of horror
 * - Erratic hand movement (speeding up, slowing down, reversing)
 * - Temporal chaos with multiple overlapping times
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  duration: z.number().default(5).describe('Total duration of the transition in seconds'),
  visionImageSrc: z.string().optional().describe('Optional image URL to show through cracks (horror imagery)'),
  clockFaceColor: z.string().default('#1a1a2e').describe('Color of the clock face'),
  handColor: z.string().default('#4a3728').describe('Color of the clock hands'),
  numberColor: z.string().default('#8b7355').describe('Color of the clock numbers'),
  crackColor: z.string().default('#ff0000').describe('Color of the crack lines'),
  sparkColor: z.string().default('#ff6600').describe('Color of the sparks'),
  chaosIntensity: z.number().min(0.5).max(2).default(1).describe('Intensity multiplier for chaos effects'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    visionImageSrc,
    clockFaceColor,
    handColor,
    numberColor,
    crackColor,
    sparkColor,
    chaosIntensity,
  } = params;

  // Phase timing calculations (percentage of total duration)
  const normalTickingEnd = duration * 0.15;
  const accelerationEnd = duration * 0.45;
  const chaosEnd = duration * 0.70;
  const violentStopEnd = duration * 0.85;

  // Helper function to create number positions
  const createClockNumbers = (): RenderableComponentData[] => {
    const numbers = [
      { text: 'XII', top: '8%', left: '50%', transform: 'translateX(-50%)' },
      { text: 'I', top: '13%', right: '22%' },
      { text: 'II', top: '25%', right: '10%' },
      { text: 'III', top: '47%', right: '5%' },
      { text: 'IV', bottom: '25%', right: '10%' },
      { text: 'V', bottom: '13%', right: '22%' },
      { text: 'VI', bottom: '8%', left: '50%', transform: 'translateX(-50%)' },
      { text: 'VII', bottom: '13%', left: '22%' },
      { text: 'VIII', bottom: '25%', left: '10%' },
      { text: 'IX', top: '47%', left: '5%' },
      { text: 'X', top: '25%', left: '10%' },
      { text: 'XI', top: '13%', left: '22%' },
    ];

    return numbers.map((num, index) => ({
      id: `num-${index}`,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: num.text,
        className: 'absolute',
        style: {
          fontSize: '3vmin',
          color: numberColor,
          fontFamily: 'serif',
          fontWeight: 'bold',
          ...num,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        // Number distortion during acceleration phase
        {
          id: `num-distort-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: normalTickingEnd,
            duration: accelerationEnd - normalTickingEnd,
            mode: 'provider',
            targetIds: [`num-${index}`],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.8 + Math.random() * 0.4, prog: 0.5 },
              { key: 'scale', val: 1.2, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.5 },
              { key: 'opacity', val: 0.8, prog: 1 },
            ],
          },
        },
        // Chaos phase - numbers shake and melt
        {
          id: `num-chaos-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: accelerationEnd,
            duration: chaosEnd - accelerationEnd,
            mode: 'provider',
            targetIds: [`num-${index}`],
            ranges: [
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: `${(Math.random() - 0.5) * 20 * chaosIntensity}px`, prog: 0.25 },
              { key: 'translateX', val: `${(Math.random() - 0.5) * 20 * chaosIntensity}px`, prog: 0.5 },
              { key: 'translateX', val: `${(Math.random() - 0.5) * 20 * chaosIntensity}px`, prog: 0.75 },
              { key: 'translateX', val: '0px', prog: 1 },
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: `${(Math.random() - 0.5) * 20 * chaosIntensity}px`, prog: 0.25 },
              { key: 'translateY', val: `${(Math.random() - 0.5) * 20 * chaosIntensity}px`, prog: 0.5 },
              { key: 'translateY', val: `${(Math.random() - 0.5) * 20 * chaosIntensity}px`, prog: 0.75 },
              { key: 'translateY', val: '0px', prog: 1 },
              { key: 'rotate', val: '0deg', prog: 0 },
              { key: 'rotate', val: `${(Math.random() - 0.5) * 30 * chaosIntensity}deg`, prog: 0.5 },
              { key: 'rotate', val: '0deg', prog: 1 },
            ],
          },
        },
        // Dissolution phase
        {
          id: `num-dissolve-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: violentStopEnd,
            duration: duration - violentStopEnd,
            mode: 'provider',
            targetIds: [`num-${index}`],
            ranges: [
              { key: 'opacity', val: 0.8, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(10px)', prog: 1 },
            ],
          },
        },
      ],
    }));
  };

  // Helper function to create clock hands
  const createClockHands = (): RenderableComponentData[] => {
    const hands = [
      { id: 'hour-hand', width: '1.2vmin', height: '18vmin', color: handColor, rotationSpeed: 1 },
      { id: 'minute-hand', width: '0.8vmin', height: '25vmin', color: handColor, rotationSpeed: 12 },
      { id: 'second-hand', width: '0.4vmin', height: '28vmin', color: '#8b0000', rotationSpeed: 720 },
    ];

    return hands.map((hand) => ({
      id: hand.id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${hand.width}; height: ${hand.height}; background-color: ${hand.color}; border-radius: ${parseFloat(hand.width) / 2}vmin; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
        className: 'absolute',
        style: {
          transformOrigin: 'center bottom',
          bottom: '50%',
          left: `calc(50% - ${parseFloat(hand.width) / 2}vmin)`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        // Normal ticking phase
        {
          id: `${hand.id}-normal`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: normalTickingEnd,
            mode: 'provider',
            targetIds: [hand.id],
            ranges: [
              { key: 'rotate', val: '0deg', prog: 0 },
              { key: 'rotate', val: `${hand.rotationSpeed * (normalTickingEnd / duration)}deg`, prog: 1 },
            ],
          },
        },
        // Acceleration phase
        {
          id: `${hand.id}-accel`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: normalTickingEnd,
            duration: accelerationEnd - normalTickingEnd,
            mode: 'provider',
            targetIds: [hand.id],
            ranges: [
              { key: 'rotate', val: `${hand.rotationSpeed * (normalTickingEnd / duration)}deg`, prog: 0 },
              { key: 'rotate', val: `${hand.rotationSpeed * (accelerationEnd / duration) * 3}deg`, prog: 1 },
            ],
          },
        },
        // Chaos phase - erratic movement
        {
          id: `${hand.id}-chaos`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: accelerationEnd,
            duration: chaosEnd - accelerationEnd,
            mode: 'provider',
            targetIds: [hand.id],
            ranges: [
              { key: 'rotate', val: `${hand.rotationSpeed * (accelerationEnd / duration) * 3}deg`, prog: 0 },
              { key: 'rotate', val: `${hand.rotationSpeed * (accelerationEnd / duration) * 3 - 720 * chaosIntensity}deg`, prog: 0.2 },
              { key: 'rotate', val: `${hand.rotationSpeed * (accelerationEnd / duration) * 3 + 1440 * chaosIntensity}deg`, prog: 0.5 },
              { key: 'rotate', val: `${hand.rotationSpeed * (accelerationEnd / duration) * 3 - 360 * chaosIntensity}deg`, prog: 0.7 },
              { key: 'rotate', val: `${hand.rotationSpeed * (accelerationEnd / duration) * 3 + 3600 * chaosIntensity}deg`, prog: 1 },
            ],
          },
        },
        // Violent stop phase
        {
          id: `${hand.id}-stop`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: chaosEnd,
            duration: violentStopEnd - chaosEnd,
            mode: 'provider',
            targetIds: [hand.id],
            ranges: [
              { key: 'rotate', val: `${hand.rotationSpeed * (accelerationEnd / duration) * 3 + 3600 * chaosIntensity}deg`, prog: 0 },
              { key: 'rotate', val: `${hand.rotationSpeed * (accelerationEnd / duration) * 3 + 3600 * chaosIntensity + 180}deg`, prog: 1 },
            ],
          },
        },
        // Dissolution
        {
          id: `${hand.id}-dissolve`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: violentStopEnd,
            duration: duration - violentStopEnd,
            mode: 'provider',
            targetIds: [hand.id],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    }));
  };

  // Helper function to create ghost hands
  const createGhostHands = (): RenderableComponentData[] => {
    const ghosts = [
      { id: 'ghost-1', opacity: 0.3, blur: '2px', delay: 0.05 },
      { id: 'ghost-2', opacity: 0.2, blur: '4px', delay: 0.1 },
      { id: 'ghost-3', opacity: 0.1, blur: '6px', delay: 0.15 },
    ];

    return ghosts.map((ghost) => ({
      id: ghost.id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 0.4vmin; height: 28vmin; background-color: rgba(139, 0, 0, ${ghost.opacity}); border-radius: 0.2vmin; filter: blur(${ghost.blur});"></div>`,
        className: 'absolute pointer-events-none',
        style: {
          transformOrigin: 'center bottom',
          bottom: '50%',
          left: 'calc(50% - 0.2vmin)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        // Ghost hands follow main second hand with delay
        {
          id: `${ghost.id}-rotation`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: ghost.delay,
            duration: duration - ghost.delay,
            mode: 'provider',
            targetIds: [ghost.id],
            ranges: [
              { key: 'rotate', val: '0deg', prog: 0 },
              { key: 'rotate', val: '3600deg', prog: normalTickingEnd / duration },
              { key: 'rotate', val: '10800deg', prog: accelerationEnd / duration },
              { key: 'rotate', val: '21600deg', prog: chaosEnd / duration },
              { key: 'rotate', val: '21780deg', prog: violentStopEnd / duration },
              { key: 'rotate', val: '21780deg', prog: 1 },
            ],
          },
        },
        // Fade out during dissolution
        {
          id: `${ghost.id}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: violentStopEnd,
            duration: duration - violentStopEnd,
            mode: 'provider',
            targetIds: [ghost.id],
            ranges: [
              { key: 'opacity', val: ghost.opacity, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    }));
  };

  // Helper function to create gears
  const createGears = (): RenderableComponentData[] => {
    const gears = [
      { id: 'gear-1', size: '15vmin', top: '5%', left: '5%', speed: 10 },
      { id: 'gear-2', size: '12vmin', top: '8%', right: '8%', speed: -15 },
      { id: 'gear-3', size: '10vmin', bottom: '10%', left: '10%', speed: 8 },
      { id: 'gear-4', size: '18vmin', bottom: '5%', right: '5%', speed: -12 },
    ];

    return gears.map((gear) => ({
      id: gear.id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${gear.size}; height: ${gear.size}; border-radius: 50%; border: 4px dashed #3a3a4a;"></div>`,
        className: 'absolute',
        style: {
          opacity: 0.6,
          ...(gear.top !== undefined ? { top: gear.top } : {}),
          ...(gear.left !== undefined ? { left: gear.left } : {}),
          ...(gear.right !== undefined ? { right: gear.right } : {}),
          ...(gear.bottom !== undefined ? { bottom: gear.bottom } : {}),
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        // Gear rotation throughout entire transition
        {
          id: `${gear.id}-rotate`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: [gear.id],
            ranges: [
              { key: 'rotate', val: '0deg', prog: 0 },
              { key: 'rotate', val: `${gear.speed * 360}deg`, prog: 1 },
            ],
          },
        },
        // Increase opacity during chaos
        {
          id: `${gear.id}-chaos-glow`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: accelerationEnd,
            duration: chaosEnd - accelerationEnd,
            mode: 'provider',
            targetIds: [gear.id],
            ranges: [
              { key: 'opacity', val: 0.6, prog: 0 },
              { key: 'opacity', val: 0.9, prog: 0.5 },
              { key: 'opacity', val: 0.6, prog: 1 },
            ],
          },
        },
        // Fade out
        {
          id: `${gear.id}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: violentStopEnd,
            duration: duration - violentStopEnd,
            mode: 'provider',
            targetIds: [gear.id],
            ranges: [
              { key: 'opacity', val: 0.6, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    }));
  };

  // Helper function to create sparks
  const createSparks = (): RenderableComponentData[] => {
    const sparkPositions = [
      { top: '20%', left: '15%' },
      { top: '75%', right: '20%' },
      { bottom: '30%', left: '80%' },
      { top: '60%', left: '10%' },
      { top: '15%', right: '25%' },
    ];

    return sparkPositions.map((pos, index) => ({
      id: `spark-${index}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${0.4 + Math.random() * 0.3}vmin; height: ${0.4 + Math.random() * 0.3}vmin; border-radius: 50%; background-color: ${sparkColor}; box-shadow: 0 0 10px ${sparkColor}, 0 0 20px #ff3300;"></div>`,
        className: 'absolute',
        style: pos,
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        // Sparks appear during chaos and intensify during violent stop
        {
          id: `spark-${index}-appear`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: accelerationEnd,
            duration: violentStopEnd - accelerationEnd,
            mode: 'provider',
            targetIds: [`spark-${index}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.3 },
              { key: 'opacity', val: 0.8, prog: 0.6 },
              { key: 'opacity', val: 1, prog: 1 },
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 0.3 },
              { key: 'scale', val: 1.5, prog: 0.6 },
              { key: 'scale', val: 2, prog: 1 },
            ],
          },
        },
        // Flicker effect
        {
          id: `spark-${index}-flicker`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: chaosEnd,
            duration: violentStopEnd - chaosEnd,
            mode: 'provider',
            targetIds: [`spark-${index}`],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.2 },
              { key: 'opacity', val: 1, prog: 0.4 },
              { key: 'opacity', val: 0.5, prog: 0.6 },
              { key: 'opacity', val: 1, prog: 0.8 },
              { key: 'opacity', val: 0.7, prog: 1 },
            ],
          },
        },
        // Fade out
        {
          id: `spark-${index}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: violentStopEnd,
            duration: duration - violentStopEnd,
            mode: 'provider',
            targetIds: [`spark-${index}`],
            ranges: [
              { key: 'opacity', val: 0.7, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    }));
  };

  // Helper function to create crack lines
  const createCracks = (): RenderableComponentData[] => {
    const cracks = [
      { height: '40%', top: '30%', left: '48%', rotation: 15 },
      { height: '35%', top: '35%', left: '52%', rotation: -20 },
      { height: '25%', top: '40%', left: '45%', rotation: -10 },
    ];

    return cracks.map((crack, index) => ({
      id: `crack-${index}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 2px; height: ${crack.height}; background-color: ${crackColor}; box-shadow: 0 0 10px ${crackColor}, 0 0 20px #990000;"></div>`,
        className: 'absolute',
        style: {
          top: crack.top,
          left: crack.left,
          transform: `rotate(${crack.rotation}deg)`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        // Cracks appear during chaos phase
        {
          id: `crack-${index}-appear`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: accelerationEnd + (chaosEnd - accelerationEnd) * 0.3,
            duration: (chaosEnd - accelerationEnd) * 0.4,
            mode: 'provider',
            targetIds: [`crack-${index}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 1, prog: 1 },
            ],
          },
        },
        // Cracks glow during violent stop
        {
          id: `crack-${index}-glow`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: chaosEnd,
            duration: violentStopEnd - chaosEnd,
            mode: 'provider',
            targetIds: [`crack-${index}`],
            ranges: [
              { key: 'filter', val: 'brightness(1)', prog: 0 },
              { key: 'filter', val: 'brightness(2)', prog: 0.5 },
              { key: 'filter', val: 'brightness(1)', prog: 1 },
            ],
          },
        },
        // Fade out
        {
          id: `crack-${index}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: violentStopEnd,
            duration: duration - violentStopEnd,
            mode: 'provider',
            targetIds: [`crack-${index}`],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    }));
  };

  // Build the complete composition
  const childrenData: RenderableComponentData[] = [
    // Clock face background
    {
      id: 'clock-face-bg',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 70vmin; height: 70vmin; border-radius: 50%; background: radial-gradient(circle, ${clockFaceColor} 0%, #0f0f1a 60%, #000 100%); border: 8px solid #2a2a3e; box-shadow: 0 0 60px rgba(100, 50, 50, 0.4), inset 0 0 100px rgba(0, 0, 0, 0.8);"></div>`,
        className: 'absolute',
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        // Clock face shake during chaos
        {
          id: 'clock-shake',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: accelerationEnd,
            duration: chaosEnd - accelerationEnd,
            mode: 'provider',
            targetIds: ['clock-face-bg'],
            ranges: [
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: `${5 * chaosIntensity}px`, prog: 0.1 },
              { key: 'translateX', val: `${-5 * chaosIntensity}px`, prog: 0.2 },
              { key: 'translateX', val: `${3 * chaosIntensity}px`, prog: 0.3 },
              { key: 'translateX', val: `${-3 * chaosIntensity}px`, prog: 0.4 },
              { key: 'translateX', val: '0px', prog: 0.5 },
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: `${-5 * chaosIntensity}px`, prog: 0.1 },
              { key: 'translateY', val: `${5 * chaosIntensity}px`, prog: 0.2 },
              { key: 'translateY', val: `${-3 * chaosIntensity}px`, prog: 0.3 },
              { key: 'translateY', val: `${3 * chaosIntensity}px`, prog: 0.4 },
              { key: 'translateY', val: '0px', prog: 0.5 },
            ],
          },
        },
        // Violent stop shake
        {
          id: 'clock-violent-shake',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: chaosEnd,
            duration: violentStopEnd - chaosEnd,
            mode: 'provider',
            targetIds: ['clock-face-bg'],
            ranges: [
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: `${10 * chaosIntensity}px`, prog: 0.2 },
              { key: 'translateX', val: `${-8 * chaosIntensity}px`, prog: 0.4 },
              { key: 'translateX', val: `${3 * chaosIntensity}px`, prog: 0.6 },
              { key: 'translateX', val: '0px', prog: 1 },
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: `${-10 * chaosIntensity}px`, prog: 0.2 },
              { key: 'translateY', val: `${8 * chaosIntensity}px`, prog: 0.4 },
              { key: 'translateY', val: `${-3 * chaosIntensity}px`, prog: 0.6 },
              { key: 'translateY', val: '0px', prog: 1 },
            ],
          },
        },
        // Dissolve
        {
          id: 'clock-dissolve',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: violentStopEnd,
            duration: duration - violentStopEnd,
            mode: 'provider',
            targetIds: ['clock-face-bg'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(15px)', prog: 1 },
            ],
          },
        },
      ],
    },
    // Numbers container
    {
      id: 'clock-numbers-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '70vmin',
            height: '70vmin',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      childrenData: createClockNumbers(),
    },
    // Clock hands container
    {
      id: 'clock-hands-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      childrenData: createClockHands(),
    },
    // Ghost hands container
    {
      id: 'ghost-hands-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      childrenData: createGhostHands(),
    },
    // Center pivot
    {
      id: 'center-pivot',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 3vmin; height: 3vmin; border-radius: 50%; background-color: #2a1a0a; border: 2px solid #4a3728; box-shadow: 0 0 20px rgba(139, 0, 0, 0.4);"></div>',
        className: 'absolute',
        style: {
          top: 'calc(50% - 1.5vmin)',
          left: 'calc(50% - 1.5vmin)',
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'pivot-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: violentStopEnd,
            duration: duration - violentStopEnd,
            mode: 'provider',
            targetIds: ['center-pivot'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
    // Gears container
    {
      id: 'gears-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      childrenData: createGears(),
    },
    // Sparks container
    {
      id: 'sparks-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      childrenData: createSparks(),
    },
    // Cracks container
    {
      id: 'cracks-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      childrenData: createCracks(),
    },
    // Vision glimpses (optional horror imagery through cracks)
    ...(visionImageSrc
      ? [
          {
            id: 'vision-glimpses',
            type: 'atom' as const,
            componentId: 'ImageAtom',
            data: {
              src: visionImageSrc,
              className: 'absolute inset-0 object-cover pointer-events-none',
              style: {
                mixBlendMode: 'overlay' as const,
              },
            },
            context: {
              timing: {
                start: 0,
                duration,
              },
            },
            effects: [
              {
                id: 'vision-appear',
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: accelerationEnd + (chaosEnd - accelerationEnd) * 0.4,
                  duration: (chaosEnd - accelerationEnd) * 0.3,
                  mode: 'provider',
                  targetIds: ['vision-glimpses'],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 0.3, prog: 1 },
                  ],
                },
              },
              {
                id: 'vision-fade',
                componentId: 'generic',
                data: {
                  type: 'ease-in',
                  start: violentStopEnd,
                  duration: duration - violentStopEnd,
                  mode: 'provider',
                  targetIds: ['vision-glimpses'],
                  ranges: [
                    { key: 'opacity', val: 0.3, prog: 0 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ]
      : []),
  ];

  const rootContainer: RenderableComponentData = {
    id: 'nightmare-clock-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center bg-black overflow-hidden',
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

const presetMetadata: PresetMetadata = {
  id: 'nightmare-clock-transition',
  title: 'Nightmare Clock Transition',
  description:
    'A horror-themed transition featuring a distorted clock face with wildly spinning hands, melting numbers, cracking reveals of disturbing visions, and mechanical gear elements. Creates a sense of temporal chaos through five phases: normal ticking, acceleration, complete chaos, violent stopping, and dissolution into the next scene. Includes ghostly afterimages of clock hands and spark particle effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'horror', 'clock', 'temporal', 'chaos', 'nightmare', 'distortion'],
  defaultInputParams: {
    duration: 5,
    clockFaceColor: '#1a1a2e',
    handColor: '#4a3728',
    numberColor: '#8b7355',
    crackColor: '#ff0000',
    sparkColor: '#ff6600',
    chaosIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const nightmareClockTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
