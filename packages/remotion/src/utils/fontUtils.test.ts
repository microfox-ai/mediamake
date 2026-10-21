import { describe, expect, it } from 'vitest';
import { resolveFontSubsets } from './fontUtils';

describe('resolveFontSubsets', () => {
  const telugu = ['latin', 'latin-ext', 'telugu'];

  it('loads every subset a Telugu font ships when the caller only asks for latin', () => {
    expect(resolveFontSubsets(telugu, ['latin'])).toEqual(telugu);
  });

  it('loads every subset when none are requested', () => {
    expect(resolveFontSubsets(telugu)).toEqual(telugu);
  });

  it('keeps an explicit script subset', () => {
    expect(resolveFontSubsets(telugu, ['telugu'])).toEqual(['telugu']);
  });

  it('loads the real subset for fonts that have no latin file', () => {
    expect(resolveFontSubsets(['korean'], ['latin'])).toEqual(['korean']);
  });

  it('drops a requested subset the font does not ship and falls back to what it has', () => {
    expect(resolveFontSubsets(['arabic', 'latin'], ['telugu'])).toEqual([
      'arabic',
      'latin',
    ]);
  });
});
