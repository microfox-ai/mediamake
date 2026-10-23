import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sceneContainerProps } from './preset-helpers';

describe('sceneContainerProps', () => {
  it('keeps a full-frame scene when layout is unset', () => {
    const props = sceneContainerProps({ backgroundColor: '#111' });
    assert.equal(props.className, 'absolute inset-0');
    assert.equal(props.style?.backgroundColor, '#111');
  });

  it('paints the layout box and the debug border', () => {
    const props = sceneContainerProps({
      backgroundColor: 'black',
      containerProps: {
        style: {
          position: 'absolute',
          left: 24,
          width: 200,
          border: '1px solid #ef4444',
          '--mm-debug': '1',
          '--mm-left': '24',
          '--mm-width': '200',
        },
      },
    });
    assert.equal(props.className, 'absolute');
    assert.equal(props.style?.left, 24);
    assert.equal(props.style?.width, 200);
    assert.equal(props.style?.border, '1px solid #ef4444');
    assert.equal(props.style?.['--mm-debug'], '1');
    assert.equal(props.style?.backgroundColor, 'black');
  });

  it('shows the bounding box even when the scene still fills the frame', () => {
    const props = sceneContainerProps({
      containerProps: {
        style: {
          border: '1px solid #ef4444',
          '--mm-debug': '1',
        },
      },
    });
    assert.equal(props.className, 'absolute inset-0');
    assert.equal(props.style?.border, '1px solid #ef4444');
    assert.equal(props.style?.['--mm-debug'], '1');
  });
});
