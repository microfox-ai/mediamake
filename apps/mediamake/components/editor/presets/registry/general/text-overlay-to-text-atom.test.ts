import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { textOverlayToTextAtom } from './text-overlay-to-text-atom';

describe('text overlay to TextAtom', () => {
  it('keeps text, timing and style, and fills the overlay defaults', () => {
    const next = textOverlayToTextAtom({
      parentId: 'scene-1',
      trackName: 'title',
      trackType: 'aligned',
      start: 2,
      duration: 6,
      attachedToId: 'SceneA',
      text: 'Hello',
      position: { alignment: 'center-center' },
      style: { fontWeight: 600, padding: 12, filter: 'blur(1px)' },
    });
    assert.equal(next.parentId, 'scene-1');
    assert.equal(next.trackName, 'title');
    assert.equal(next.start, 2);
    assert.equal(next.duration, 6);
    assert.equal(next.attachedToId, 'SceneA');
    assert.equal(next.text, 'Hello');
    assert.deepEqual(next.style, {
      fontWeight: 600,
      padding: '12px',
      fontFamily: 'Inter',
      fontSize: 24,
      color: '#FFFFFF',
    });
    const layout = (next.containerProps as { style: Record<string, unknown> }).style;
    assert.equal(layout.position, 'absolute');
    assert.equal(layout.marginLeft, 'auto');
    assert.equal(layout.marginTop, 'auto');
    assert.equal(layout.width, 'fit-content');
    assert.equal(layout.filter, 'blur(1px)');
    assert.equal(layout['--mm-self-x'], 'center');
    assert.equal(next.position, undefined);
  });

  it('moves legacy root fields and timing through the overlay migration', () => {
    const next = textOverlayToTextAtom({
      text: 'Mark',
      fontFamily: 'Inter:500',
      fontSize: 20,
      color: '#000',
      position: { alignment: 'top-center', top: 40 },
      transitions: { fadeInTransition: 'opacity', fadeInDuration: 1, duration: 30, startOffset: 5 },
    });
    assert.equal(next.start, 5);
    assert.equal(next.duration, 30);
    assert.equal(next.trackName, 'text-overlay');
    const style = next.style as Record<string, unknown>;
    assert.equal(style.fontFamily, 'Inter');
    assert.equal(style.fontWeight, 500);
    assert.equal(style.fontSize, 20);
    assert.equal(style.color, '#000');
    const layout = (next.containerProps as { style: Record<string, unknown> }).style;
    assert.equal(layout.top, 40);
    assert.equal(layout.bottom, 'auto');
  });

  it('maps in and out animations onto clip transitions', () => {
    const next = textOverlayToTextAtom({
      text: 'Go',
      position: {},
      transitions: {
        fadeInTransition: 'slide-in-bottom',
        fadeInDuration: 0.8,
        fadeOutTransition: 'blur-out',
      },
    });
    const transitions = next.transitions as { type: string; edge: string; duration: number }[];
    assert.deepEqual(
      transitions.map((t) => `${t.edge}:${t.type}:${t.duration}`),
      ['in:fade:0.8', 'in:slide-up:0.8', 'out:fade:1', 'out:blur:1'],
    );
  });

  it('leaves transitions off when the overlay had none', () => {
    const next = textOverlayToTextAtom({
      text: 'Still',
      position: {},
      transitions: { fadeInTransition: 'none', fadeOutTransition: 'shake-out' },
    });
    assert.equal(next.transitions, undefined);
  });
});
