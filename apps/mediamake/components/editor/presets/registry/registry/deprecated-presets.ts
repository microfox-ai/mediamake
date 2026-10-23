import {
  TEXT_ATOM_PRESET_ID,
  textOverlayToTextAtom,
} from '../general/text-overlay-to-text-atom';

/** How a saved block of a deprecated preset becomes its replacement. */
export interface PresetReplacement {
  deprecatedTitle: string;
  presetId: string;
  title: string;
  convert: (input: unknown) => Record<string, unknown>;
}

const REPLACEMENTS: Record<string, PresetReplacement> = {
  'text-overlay': {
    deprecatedTitle: 'Text Overlay',
    presetId: TEXT_ATOM_PRESET_ID,
    title: 'TextAtom',
    convert: textOverlayToTextAtom,
  },
};

export function presetReplacement(presetId: string | undefined): PresetReplacement | undefined {
  return presetId ? REPLACEMENTS[presetId] : undefined;
}

export function isDeprecatedPreset(presetId: string | undefined): boolean {
  return presetReplacement(presetId) !== undefined;
}
