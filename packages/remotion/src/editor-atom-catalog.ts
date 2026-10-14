import type { ZodType } from 'zod';
import { CanvasPipelineDataSchema } from './canvas/types';
import {
  AudioAtomDataProps,
  HTMLBlockAtomInput,
  ImageAtomInput,
  LottieAtomDataProps,
  ShapeAtomInput,
  TextAtomInput,
  VideoAtomDataProps,
} from './components/atoms/input-schemas';
import {
  WaveformCircleInput,
  WaveformHistogramInput,
  WaveformHistogramRangedInput,
  WaveformLineInput,
} from './templates/waveform/input-schemas';
import { WaveformSpectrumLineInput } from './components/waveforms/input-schemas';

/** Metadata for one addable atom block. No React components. */
export interface EditorAtomCatalogEntry {
  componentId: string;
  displayName: string;
  inputSchema?: ZodType;
}

/**
 * Atoms that appear as editor blocks.
 * Keep this aligned with `listRegisteredAtoms`: same ids, and omit
 * atoms registered with `editorBlock: false` (Rings, NextjsLogo).
 */
export const editorAtomCatalog: EditorAtomCatalogEntry[] = [
  { componentId: 'AudioAtom', displayName: 'AudioAtom', inputSchema: AudioAtomDataProps },
  { componentId: 'CanvasPipeline', displayName: 'CanvasPipeline', inputSchema: CanvasPipelineDataSchema },
  { componentId: 'HTMLBlockAtom', displayName: 'HTMLBlockAtom', inputSchema: HTMLBlockAtomInput },
  { componentId: 'ImageAtom', displayName: 'ImageAtom', inputSchema: ImageAtomInput },
  { componentId: 'LottieAtom', displayName: 'LottieAtom', inputSchema: LottieAtomDataProps },
  { componentId: 'ShapeAtom', displayName: 'ShapeAtom', inputSchema: ShapeAtomInput },
  { componentId: 'TextAtom', displayName: 'TextAtom', inputSchema: TextAtomInput },
  { componentId: 'VideoAtom', displayName: 'VideoAtom', inputSchema: VideoAtomDataProps },
  { componentId: 'WaveformCircle', displayName: 'WaveformCircle', inputSchema: WaveformCircleInput },
  { componentId: 'WaveformHistogram', displayName: 'WaveformHistogram', inputSchema: WaveformHistogramInput },
  {
    componentId: 'WaveformHistogramRanged',
    displayName: 'WaveformHistogramRanged',
    inputSchema: WaveformHistogramRangedInput,
  },
  { componentId: 'WaveformLine', displayName: 'WaveformLine', inputSchema: WaveformLineInput },
  {
    componentId: 'WaveformSpectrumLine',
    displayName: 'WaveformSpectrumLine',
    inputSchema: WaveformSpectrumLineInput,
  },
];
