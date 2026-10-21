import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { joinCssTransform, mergeCSSStyles } from './mergeCSSStyles';

describe('joinCssTransform', () => {
  it('keeps both lists, parent first', () => {
    assert.equal(
      joinCssTransform('translate(-50%, -50%)', 'translateX(40px) scale(1.2)'),
      'translate(-50%, -50%) translateX(40px) scale(1.2)',
    );
  });

  it('ignores empty and none', () => {
    assert.equal(joinCssTransform('rotate(10deg)', 'none'), 'rotate(10deg)');
    assert.equal(joinCssTransform(undefined, 'scale(2)'), 'scale(2)');
  });
});

describe('mergeCSSStyles transform', () => {
  it('applies transforms sequentially when the function name repeats', () => {
    const style = mergeCSSStyles(
      { transform: 'translateX(-50%)' },
      { transform: 'translateX(20px) scale(0.8)' },
    );
    assert.equal(style.transform, 'translateX(-50%) translateX(20px) scale(0.8)');
  });
});
