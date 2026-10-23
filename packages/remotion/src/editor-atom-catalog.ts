import type { ZodType } from 'zod';
import { atomCategory } from './atom-category';
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
  WaveformHistogramInput,
  WaveformHistogramRangedInput,
  WaveformSpectrumFillInput,
  WaveformSpectrumLineInput,
} from './components/waveforms/input-schemas';
import { CaptionSmearInput } from './components/captions/input-schemas';
import { BeatMontageInput, ImageBeatInput } from './components/beatmade/input-schemas';

/** Metadata for one addable atom block. No React components. */
export interface EditorAtomCatalogEntry {
  componentId: string;
  displayName: string;
  /** Directory the atom is defined in. `atoms` resolves to BaseAtoms. */
  folder: string;
  /** Resolved Add Atoms submenu. Overrides the folder when set on the source. */
  category: string;
  inputSchema?: ZodType;
}

type AtomCatalogSource = Omit<EditorAtomCatalogEntry, 'category'> & {
  category?: string;
};

/**
 * Atoms that appear as editor blocks.
 * Keep this aligned with `listRegisteredAtoms`: same ids, and omit
 * atoms registered with `editorBlock: false` (Rings, NextjsLogo).
 */
const editorAtomSources: AtomCatalogSource[] = [
  { componentId: 'AudioAtom', displayName: 'AudioAtom', folder: 'atoms', inputSchema: AudioAtomDataProps },
  { componentId: 'BeatMontage', displayName: 'BeatMontage', folder: 'beatmade', inputSchema: BeatMontageInput },
  { componentId: 'CanvasPipeline', displayName: 'CanvasPipeline', folder: 'canvas', inputSchema: CanvasPipelineDataSchema },
  { componentId: 'CaptionSmear', displayName: 'CaptionSmear', folder: 'captions', inputSchema: CaptionSmearInput },
  { componentId: 'HTMLBlockAtom', displayName: 'HTMLBlockAtom', folder: 'atoms', inputSchema: HTMLBlockAtomInput },
  { componentId: 'ImageAtom', displayName: 'ImageAtom', folder: 'atoms', inputSchema: ImageAtomInput },
  { componentId: 'ImageBeat', displayName: 'ImageBeat', folder: 'beatmade', inputSchema: ImageBeatInput },
  { componentId: 'LottieAtom', displayName: 'LottieAtom', folder: 'atoms', inputSchema: LottieAtomDataProps },
  { componentId: 'ShapeAtom', displayName: 'ShapeAtom', folder: 'atoms', inputSchema: ShapeAtomInput },
  { componentId: 'TextAtom', displayName: 'TextAtom', folder: 'atoms', inputSchema: TextAtomInput },
  { componentId: 'VideoAtom', displayName: 'VideoAtom', folder: 'atoms', inputSchema: VideoAtomDataProps },
  { componentId: 'WaveformHistogram', displayName: 'WaveformHistogram', folder: 'waveforms', inputSchema: WaveformHistogramInput },
  {
    componentId: 'WaveformHistogramRanged',
    displayName: 'WaveformHistogramRanged',
    folder: 'waveforms',
    inputSchema: WaveformHistogramRangedInput,
  },
  {
    componentId: 'WaveformSpectrumFill',
    displayName: 'WaveformSpectrumFill',
    folder: 'waveforms',
    inputSchema: WaveformSpectrumFillInput,
  },
  {
    componentId: 'WaveformSpectrumLine',
    displayName: 'WaveformSpectrumLine',
    folder: 'waveforms',
    inputSchema: WaveformSpectrumLineInput,
  },
];

export const editorAtomCatalog: EditorAtomCatalogEntry[] = editorAtomSources.map(
  (atom) => ({
    ...atom,
    category: atomCategory(atom.folder, atom.category),
  }),
);

export { atomCategory, BASE_ATOMS_CATEGORY } from './atom-category';
