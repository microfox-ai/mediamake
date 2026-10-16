import { describe, expect, it } from 'vitest';
import { atomCategory, BASE_ATOMS_CATEGORY } from './atom-category';

describe('atomCategory', () => {
  it('uses BaseAtoms for the atoms folder', () => {
    expect(atomCategory('atoms')).toBe(BASE_ATOMS_CATEGORY);
  });

  it('uses the folder name for every other folder', () => {
    expect(atomCategory('waveforms')).toBe('waveforms');
    expect(atomCategory('captions')).toBe('captions');
    expect(atomCategory('canvas')).toBe('canvas');
    expect(atomCategory('beatmade')).toBe('beatmade');
    expect(atomCategory('waveform')).toBe('waveform');
  });

  it('keeps an explicit category', () => {
    expect(atomCategory('waveforms', 'Spectrum')).toBe('Spectrum');
    expect(atomCategory('atoms', 'Custom')).toBe('Custom');
  });
});
