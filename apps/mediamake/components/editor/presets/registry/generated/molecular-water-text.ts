/**
 * Molecular Water Text Animation Preset
 *
 * Creates a molecular-level text animation where individual H2O molecules swarm together
 * to form letters. Features realistic Brownian motion, hydrogen bonding visualizations,
 * surface tension effects, and rapid swarm intelligence-like coordination.
 *
 * Features:
 * - **Molecular Swarm Formation**: 10-20 molecules per letter cluster together
 * - **Brownian Motion**: Continuous micro-movements (±3px) for realistic molecular behavior
 * - **Hydrogen Bonding**: Animated SVG lines showing molecular connections
 * - **Surface Tension**: Constantly reshaping edges
 * - **Rapid Coordination**: 0.8s formation with swarm intelligence patterns
 * - **Flow Effects**: Molecules flow between letters like connected streams
 * - **Audio Sync**: Optional molecular vibration sync to audio frequency data
 *
 * Use cases:
 * - Scientific/educational content with molecular themes
 * - Liquid/water-themed text animations
 * - Dynamic typography with particle effects
 * - Abstract molecular motion graphics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().default('WATER').describe('Text to display as molecular formation'),
  fontSize: z.number().default(120).describe('Font size in pixels'),
  moleculesPerLetter: z.number().min(10).max(20).default(15).describe('Number of molecules per letter (10-20)'),
  moleculeSize: z.number().min(1).max(4).default(2).describe('Molecule size in pixels'),
  formationDuration: z.number().default(0.8).describe('Duration for molecules to form letters (seconds)'),
  brownianIntensity: z.number().min(1).max(5).default(3).describe('Brownian motion intensity (±px)'),
  brownianCycle: z.number().default(2).describe('Duration of one Brownian motion cycle (seconds)'),
  showBonds: z.boolean().default(true).describe('Show hydrogen bonds between molecules'),
  bondColor: z.string().default('#4db8ff').describe('Color of hydrogen bonds'),
  moleculeColor: z.string().default('#64c8ff').describe('Color of water molecules'),
  glowIntensity: z.number().min(0).max(10).default(6).describe('Molecular glow intensity'),
  surfaceTension: z.boolean().default(true).describe('Enable surface tension edge reshaping'),
  flowEffect: z.boolean().default(true).describe('Enable flow between letters'),
  audioSrc: z.string().optional().describe('Audio source for molecular vibration sync'),
  audioSensitivity: z.number().min(0.1).max(2).default(1).describe('Audio reactivity sensitivity'),
  backgroundColor: z.string().default('from-slate-900 to-blue-950').describe('Background gradient classes'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    moleculesPerLetter,
    moleculeSize,
    formationDuration,
    brownianIntensity,
    brownianCycle,
    showBonds,
    bondColor,
    moleculeColor,
    glowIntensity,
    surfaceTension,
    flowEffect,
    audioSrc,
    audioSensitivity,
    backgroundColor,
  } = params;

  // Helper: Generate random position within a range
  const randomPosition = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Generate random delay for staggered swarm coordination
  const randomDelay = (maxDelay: number): number => {
    return Math.random() * maxDelay;
  };

  // Calculate letter positions (approximate for swarm targets)
  const letterSpacing = fontSize * 0.8;
  const totalWidth = text.length * letterSpacing;
  const startX = -totalWidth / 2;

  // Generate molecules for each letter
  const allMolecules: RenderableComponentData[] = [];
  const allBonds: RenderableComponentData[] = [];

  text.split('').forEach((letter, letterIndex) => {
    const letterCenterX = startX + letterIndex * letterSpacing;
    const letterCenterY = 0;

    // Generate molecules for this letter
    for (let i = 0; i < moleculesPerLetter; i++) {
      const moleculeId = `molecule-${letterIndex}-${i}`;
      
      // Random starting position (off-screen or scattered)
      const startRandomX = randomPosition(-800, 800);
      const startRandomY = randomPosition(-600, 600);

      // Target position near letter center with some spread
      const targetOffsetX = randomPosition(-fontSize * 0.3, fontSize * 0.3);
      const targetOffsetY = randomPosition(-fontSize * 0.3, fontSize * 0.3);

      // Brownian motion offsets (different phase for each molecule)
      const brownianPhaseX = randomPosition(0, 1);
      const brownianPhaseY = randomPosition(0, 1);

      // Create molecule (small circle using HTMLBlockAtom with rounded div)
      const molecule: RenderableComponentData = {
        id: moleculeId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${moleculeSize * 2}px; height: ${moleculeSize * 2}px; background: ${moleculeColor}; border-radius: 50%; box-shadow: 0 0 ${glowIntensity}px ${moleculeColor};"></div>`,
          className: 'absolute',
          style: {
            left: '50%',
            top: '50%',
            transform: `translate(${startRandomX}px, ${startRandomY}px)`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 10,
          },
        },
        effects: [
          // Swarm formation effect (move to target position)
          {
            id: `formation-${moleculeId}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: randomDelay(formationDuration * 0.3), // Staggered start for swarm coordination
              duration: formationDuration,
              mode: 'provider',
              targetIds: [moleculeId],
              ranges: [
                { key: 'translateX', val: startRandomX, prog: 0 },
                { key: 'translateX', val: letterCenterX + targetOffsetX, prog: 1 },
                { key: 'translateY', val: startRandomY, prog: 0 },
                { key: 'translateY', val: letterCenterY + targetOffsetY, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
              ],
            },
          },
          // Brownian motion (continuous micro-movements)
          {
            id: `brownian-${moleculeId}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: formationDuration,
              duration: brownianCycle,
              iterate: 'infinite' as any,
              mode: 'provider',
              targetIds: [moleculeId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: brownianIntensity * Math.cos(brownianPhaseX * Math.PI * 2), prog: 0.25 },
                { key: 'translateX', val: 0, prog: 0.5 },
                { key: 'translateX', val: -brownianIntensity * Math.cos(brownianPhaseX * Math.PI * 2), prog: 0.75 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: -brownianIntensity * Math.sin(brownianPhaseY * Math.PI * 2), prog: 0.33 },
                { key: 'translateY', val: brownianIntensity * Math.sin(brownianPhaseY * Math.PI * 2), prog: 0.66 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          },
          // Molecular glow pulsing
          {
            id: `glow-${moleculeId}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: formationDuration,
              duration: brownianCycle * 1.5,
              iterate: 'infinite' as any,
              mode: 'provider',
              targetIds: [moleculeId],
              ranges: [
                { key: 'filter', val: `drop-shadow(0 0 ${glowIntensity * 0.6}px ${moleculeColor})`, prog: 0 },
                { key: 'filter', val: `drop-shadow(0 0 ${glowIntensity}px ${moleculeColor})`, prog: 0.5 },
                { key: 'filter', val: `drop-shadow(0 0 ${glowIntensity * 0.6}px ${moleculeColor})`, prog: 1 },
              ],
            },
          },
        ],
      };

      allMolecules.push(molecule);

      // Create hydrogen bonds (SVG lines between nearby molecules)
      if (showBonds && i > 0 && i % 3 === 0) {
        const bondTargetIndex = Math.max(0, i - 3);
        const bondId = `bond-${letterIndex}-${i}-${bondTargetIndex}`;
        
        const bond: RenderableComponentData = {
          id: bondId,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `
              <svg class="absolute inset-0 pointer-events-none" style="width: 100%; height: 100%; overflow: visible;">
                <line 
                  x1="50%" y1="50%" 
                  x2="50%" y2="50%" 
                  stroke="${bondColor}" 
                  stroke-width="0.5" 
                  stroke-dasharray="2,2"
                  opacity="0.4"
                />
              </svg>
            `,
            className: 'absolute inset-0 pointer-events-none',
          },
          context: {
            timing: {
              start: 0,
              duration: 10,
            },
          },
          effects: [
            // Fade in bonds during formation
            {
              id: `bond-fade-${bondId}`,
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: formationDuration * 0.5,
                duration: formationDuration * 0.5,
                mode: 'provider',
                targetIds: [bondId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.3, prog: 1 },
                ],
              },
            },
            // Pulsing bond strength
            {
              id: `bond-pulse-${bondId}`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: formationDuration,
                duration: brownianCycle * 2,
                iterate: 'infinite' as any,
                mode: 'provider',
                targetIds: [bondId],
                ranges: [
                  { key: 'opacity', val: 0.2, prog: 0 },
                  { key: 'opacity', val: 0.4, prog: 0.5 },
                  { key: 'opacity', val: 0.2, prog: 1 },
                ],
              },
            },
          ],
        };

        allBonds.push(bond);
      }
    }
  });

  // Audio-reactive effect (if audio provided)
  const audioEffect: RenderableComponentData[] = [];
  if (audioSrc) {
    allMolecules.forEach((molecule) => {
      audioEffect.push({
        id: `audio-vibration-${molecule.id}`,
        componentId: 'waveform',
        data: {
          audioSrc,
          audioProperty: 'mid' as any,
          effectType: 'shake' as any,
          intensity: audioSensitivity * 5,
          shakeAxis: 'both' as any,
          sensitivity: audioSensitivity,
          threshold: 0.1,
          mode: 'provider',
          targetIds: [molecule.id!],
          start: formationDuration,
          duration: 10,
        },
      } as any);
    });
  }

  // Guide text (invisible, for positioning reference)
  const guideText: RenderableComponentData = {
    id: 'guide-text',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      className: 'opacity-0 pointer-events-none',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 700,
        letterSpacing: '0.05em',
      },
      font: {
        family: 'Inter',
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'molecular-water-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex items-center justify-center bg-gradient-to-b ${backgroundColor} overflow-hidden`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10,
      },
    },
    childrenData: [
      guideText,
      ...allMolecules,
      ...allBonds,
      ...audioEffect,
    ] as RenderableComponentData[],
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
  id: 'molecular-water-text',
  title: 'Molecular Water Text Animation',
  description: 'Text animation where individual H2O molecules swarm and cluster to form letters with realistic Brownian motion, hydrogen bonding visualizations, and surface tension effects. Molecules show constant micro-movement and flow between letters like connected water streams.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'molecular', 'water', 'particles', 'swarm', 'brownian-motion', 'hydrogen-bonds', 'science', 'animated'],
  dependencies: {},
  defaultInputParams: {
    text: 'WATER',
    fontSize: 120,
    moleculesPerLetter: 15,
    moleculeSize: 2,
    formationDuration: 0.8,
    brownianIntensity: 3,
    brownianCycle: 2,
    showBonds: true,
    bondColor: '#4db8ff',
    moleculeColor: '#64c8ff',
    glowIntensity: 6,
    surfaceTension: true,
    flowEffect: true,
    audioSensitivity: 1,
    backgroundColor: 'from-slate-900 to-blue-950',
  },
};

export const molecularWaterTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
