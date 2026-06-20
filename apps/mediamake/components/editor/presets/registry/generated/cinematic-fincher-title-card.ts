/**
 * Cinematic Fincher Title Card Preset
 *
 * A sophisticated cinematic title card preset inspired by David Fincher's meticulous opening
 * credit sequences. Features locked-to-frame text stability with subtle film gate wobble (±1-2px),
 * film grain texture overlay, and vintage film burn effects that flare at deterministic intervals.
 * 
 * Key Features:
 * - Locked-to-frame text with distinctive professional title sequence stability
 * - Film grain texture overlay (mix-blend-mode: overlay, opacity: 0.3)
 * - Subtle film gate wobble animation (±2px translateX/Y on 3s loop)
 * - Film burn effects at deterministic intervals (3s, 7s, 12s)
 * - Classic film poster layout with centered primary title and supporting credits
 * - Sepia tone and contrast filters for vintage aesthetic
 * - Manual duration control via fitDurationTo='input'
 *
 * Use Cases:
 * - Professional film opening sequences
 * - Documentary title cards
 * - Premium video content requiring cinematic title treatment
 * - Dramatic film-style opening credits
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ===========================
// PRESET PARAMETERS SCHEMA
// ===========================

const presetParams = z.object({
  primaryTitle: z.string().default('THE TITLE').describe('Primary title text displayed at center'),
  directorCredit: z.string().default('DIRECTED BY JOHN DOE').describe('Director credit text displayed above title'),
  producerCredit: z.string().default('PRODUCED BY JANE SMITH').describe('Producer credit text displayed below title'),
  studioCredit: z.string().default('A STUDIO PRODUCTION').describe('Studio credit text displayed at bottom'),
  duration: z.number().default(10).describe('Total duration of title card in seconds'),
  
  // Film grain settings
  filmGrainIntensity: z.number().min(0).max(1).default(0.3).describe('Film grain overlay opacity (0-1)'),
  
  // Gate wobble settings
  gateWobbleIntensity: z.number().min(0).max(5).default(2).describe('Film gate wobble amplitude in pixels (0-5)'),
  
  // Film burn timing (relative to title card start)
  filmBurnTimings: z.array(z.number()).default([3, 7, 12]).describe('Array of times (in seconds) when film burn effects occur'),
  
  // Color and filter settings
  textColor: z.string().default('#FFF8DC').describe('Text color (amber-50 default for vintage film look)'),
  backgroundColor: z.string().default('#000000').describe('Background color'),
});

// ===========================
// PRESET EXECUTION FUNCTION
// ===========================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Create film burn effect at specific timing
  const createFilmBurnEffect = (burnTime: number, burnDuration: number, burnId: string) => {
    return {
      id: `film-burn-effect-${burnId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: burnTime,
        duration: burnDuration,
        mode: 'provider' as const,
        targetIds: [`film-burn-overlay-${burnId}`],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.7, prog: 0.3 },
          { key: 'opacity', val: 0.9, prog: 0.5 },
          { key: 'opacity', val: 0.7, prog: 0.7 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.2, prog: 0.5 },
          { key: 'scale', val: 1.4, prog: 1 },
        ],
      },
    };
  };

  // Helper: Create gate wobble effect for text
  const createGateWobbleEffect = (targetId: string, wobbleIntensity: number) => {
    return {
      id: `gate-wobble-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: 0,
        duration: 3, // 3s loop
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'translateX', val: -wobbleIntensity, prog: 0 },
          { key: 'translateX', val: wobbleIntensity, prog: 0.25 },
          { key: 'translateX', val: wobbleIntensity, prog: 0.5 },
          { key: 'translateX', val: -wobbleIntensity, prog: 0.75 },
          { key: 'translateX', val: -wobbleIntensity, prog: 1 },
          { key: 'translateY', val: wobbleIntensity, prog: 0 },
          { key: 'translateY', val: -wobbleIntensity, prog: 0.25 },
          { key: 'translateY', val: wobbleIntensity, prog: 0.5 },
          { key: 'translateY', val: -wobbleIntensity, prog: 0.75 },
          { key: 'translateY', val: wobbleIntensity, prog: 1 },
        ],
      },
    };
  };

  // Helper: Create text fade-in effect
  const createTextFadeEffect = (targetId: string, fadeStart: number, fadeDuration: number) => {
    return {
      id: `fade-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: fadeStart,
        duration: fadeDuration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };
  };

  const duration = params.duration;
  const wobbleIntensity = params.gateWobbleIntensity;
  const filmGrainOpacity = params.filmGrainIntensity;

  // Create film burn overlays
  const filmBurnOverlays: RenderableComponentData[] = params.filmBurnTimings.map((burnTime, index) => {
    const burnDuration = index === 0 ? 0.8 : index === 1 ? 1.0 : 0.6;
    const burnId = `burn-${index}`;
    
    return {
      id: `film-burn-overlay-${burnId}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle at 30% 50%, rgba(255,255,200,0.9) 0%, rgba(255,200,150,0.7) 20%, rgba(255,150,100,0.4) 40%, transparent 60%);"></div>`,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen' as const,
          zIndex: 50,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [createFilmBurnEffect(burnTime, burnDuration, burnId)],
    };
  });

  // Primary title text
  const primaryTitle: RenderableComponentData = {
    id: 'primary-title',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.primaryTitle,
      className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center',
      style: {
        fontSize: '4rem',
        letterSpacing: '0.3em',
        color: params.textColor,
        filter: 'sepia(0.2) contrast(1.1)',
        zIndex: 10,
        fontWeight: '400',
      },
      font: {
        family: 'Playfair Display',
        weights: ['400'],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      createTextFadeEffect('primary-title', 0, 1.5),
      createGateWobbleEffect('primary-title', wobbleIntensity),
    ],
  };

  // Director credit
  const directorCredit: RenderableComponentData = {
    id: 'director-credit',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.directorCredit,
      className: 'absolute left-1/2 -translate-x-1/2 text-center',
      style: {
        top: '25%',
        fontSize: '1.125rem',
        letterSpacing: '0.15em',
        color: params.textColor,
        opacity: 0.8,
        textTransform: 'uppercase' as const,
        filter: 'sepia(0.2) contrast(1.1)',
        zIndex: 10,
        fontWeight: '400',
      },
      font: {
        family: 'Playfair Display',
        weights: ['400'],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      createTextFadeEffect('director-credit', 0.5, 1.2),
      createGateWobbleEffect('director-credit', wobbleIntensity),
    ],
  };

  // Producer credit
  const producerCredit: RenderableComponentData = {
    id: 'producer-credit',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.producerCredit,
      className: 'absolute left-1/2 -translate-x-1/2 text-center',
      style: {
        top: '75%',
        fontSize: '1.125rem',
        letterSpacing: '0.15em',
        color: params.textColor,
        opacity: 0.8,
        textTransform: 'uppercase' as const,
        filter: 'sepia(0.2) contrast(1.1)',
        zIndex: 10,
        fontWeight: '400',
      },
      font: {
        family: 'Playfair Display',
        weights: ['400'],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      createTextFadeEffect('producer-credit', 1.0, 1.2),
      createGateWobbleEffect('producer-credit', wobbleIntensity),
    ],
  };

  // Studio credit
  const studioCredit: RenderableComponentData = {
    id: 'studio-credit',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.studioCredit,
      className: 'absolute left-1/2 -translate-x-1/2 text-center',
      style: {
        top: '85%',
        fontSize: '0.875rem',
        letterSpacing: '0.2em',
        color: params.textColor,
        opacity: 0.6,
        textTransform: 'uppercase' as const,
        filter: 'sepia(0.2) contrast(1.1)',
        zIndex: 10,
        fontWeight: '400',
      },
      font: {
        family: 'Playfair Display',
        weights: ['400'],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      createTextFadeEffect('studio-credit', 1.5, 1.0),
      createGateWobbleEffect('studio-credit', wobbleIntensity),
    ],
  };

  // Film grain overlay
  const filmGrainOverlay: RenderableComponentData = {
    id: 'film-grain-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iLjUiIGQ9Ik0wIDBoMzAwdjMwMEgweiIvPjwvc3ZnPg=='); background-size: 200px 200px;"></div>`,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        mixBlendMode: 'overlay' as const,
        opacity: filmGrainOpacity,
        zIndex: 100,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-title-card-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      filmGrainOverlay,
      primaryTitle,
      directorCredit,
      producerCredit,
      studioCredit,
      ...filmBurnOverlays,
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

// ===========================
// PRESET METADATA
// ===========================

const presetMetadata: PresetMetadata = {
  id: 'cinematicFincherTitleCard',
  title: 'Cinematic Fincher Title Card',
  description: 'A sophisticated cinematic title card preset inspired by David Fincher\'s meticulous opening credit sequences. Features locked-to-frame text stability with subtle film gate wobble (±1-2px), film grain texture overlay, and vintage film burn effects at deterministic intervals. Text fades in through grain as if being exposed on actual film stock. Classic film poster layout with centered primary title surrounded by supporting credits (director, producer, studio). All text has sepia/contrast filter for vintage feel. Perfect for dramatic film openings, documentaries, or premium video content requiring that professional title sequence aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'title-card',
    'cinematic',
    'fincher',
    'film',
    'vintage',
    'credits',
    'opening-sequence',
    'film-grain',
    'film-burn',
    'gate-wobble',
    'professional',
    'dramatic',
  ],
  dependencies: {},
  defaultInputParams: {
    primaryTitle: 'THE TITLE',
    directorCredit: 'DIRECTED BY JOHN DOE',
    producerCredit: 'PRODUCED BY JANE SMITH',
    studioCredit: 'A STUDIO PRODUCTION',
    duration: 10,
    filmGrainIntensity: 0.3,
    gateWobbleIntensity: 2,
    filmBurnTimings: [3, 7, 12],
    textColor: '#FFF8DC',
    backgroundColor: '#000000',
  },
};

// ===========================
// PRESET EXPORT
// ===========================

export const cinematicFincherTitleCardPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
