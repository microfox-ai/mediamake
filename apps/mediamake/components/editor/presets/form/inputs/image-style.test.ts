import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { commitImageLook, readImageLookSafe } from './image-style';

describe('commitImageLook', () => {
  it('writes fit, blend, opacity, and tint and keeps unrelated keys', () => {
    const next = commitImageLook(
      { color: '#fff', fontSize: 20 },
      { fit: 'contain', filter: 'vintage', blendMode: 'multiply', opacity: 0.8, colorTint: '#ff6600' },
    );
    assert.equal(next.color, '#fff');
    assert.equal(next.fontSize, 20);
    assert.equal(next.objectFit, 'contain');
    assert.equal(next['--mm-image-fit'], 'contain');
    assert.equal(next['--mm-image-filter'], 'vintage');
    assert.equal(next.mixBlendMode, 'multiply');
    assert.equal(next.opacity, 0.8);
    assert.equal(next['--mm-image-tint'], '#ff6600');

    const read = readImageLookSafe(next);
    assert.equal(read.fit, 'contain');
    assert.equal(read.filter, 'vintage');
    assert.equal(read.blendMode, 'multiply');
    assert.equal(read.opacity, 0.8);
    assert.equal(read.colorTint, '#ff6600');
  });

  it('omits default look keys so the style stays sparse', () => {
    const next = commitImageLook(undefined, {
      fit: 'cover',
      filter: 'none',
      blendMode: 'normal',
      opacity: 1,
    });
    assert.equal(next.objectFit, 'cover');
    assert.equal(next.mixBlendMode, undefined);
    assert.equal(next.opacity, undefined);
    assert.equal(next['--mm-image-filter'], undefined);
  });
});
