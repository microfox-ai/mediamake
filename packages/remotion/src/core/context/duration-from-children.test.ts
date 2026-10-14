import { describe, expect, it } from 'vitest';
import { durationFromChildren } from './timing';

describe('durationFromChildren', () => {
  const children = [
    { context: { timing: { start: 0, duration: 10 } } },
    { context: { timing: { start: 4, duration: 8 } } },
  ];

  it('sums a sequence', () => {
    expect(durationFromChildren('scene', children)).toBe(18);
  });

  it('ends an aligned layout at the last atom', () => {
    expect(durationFromChildren('layout', children)).toBe(12);
  });
});
