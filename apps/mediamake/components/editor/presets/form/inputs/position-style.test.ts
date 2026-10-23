import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    alignmentColumns,
    commitPlacement,
    readPlacement,
    rotateBy90,
} from './position-style';

describe('commitPlacement', () => {
    it('writes an absolute inset and keeps unrelated style keys', () => {
        const next = commitPlacement(
            { color: '#fff', fontSize: 48 },
            readPlacement({ color: '#fff' }),
            { layout: false },
        );
        const placed = commitPlacement(next, { ...readPlacement(next), mode: 'absolute', left: '12', top: '10%' }, { layout: false });
        assert.equal(placed?.color, '#fff');
        assert.equal(placed?.fontSize, 48);
        assert.equal(placed?.position, 'absolute');
        assert.equal(placed?.left, 12);
        assert.equal(placed?.top, '10%');
        assert.equal(placed?.['--mm-left'], '12');
        assert.deepEqual(readPlacement(placed), {
            ...readPlacement(placed),
            left: '12',
            top: '10%',
        });
    });

    it('frame-fit keeps the four edges and drops width and height', () => {
        const next = commitPlacement(undefined, {
            ...readPlacement(undefined),
            mode: 'absolute',
            left: '0',
            right: '0',
            top: '0',
            bottom: '0',
            width: '100',
            height: '50',
        }, { layout: true });
        assert.equal(next?.position, 'absolute');
        assert.equal(next?.left, 0);
        assert.equal(next?.right, 0);
        assert.equal(next?.top, 0);
        assert.equal(next?.bottom, 0);
        assert.equal(next?.width, undefined);
        assert.equal(next?.height, undefined);
    });

    it('inherit mode is position relative and drops every edge', () => {
        const next = commitPlacement(undefined, {
            ...readPlacement(undefined),
            mode: 'relative',
            align: 'center',
            left: '10',
            right: '20',
            top: '30',
            bottom: '40',
            width: '200',
        }, { layout: true });
        assert.equal(next?.position, 'relative');
        assert.equal(next?.left, undefined);
        assert.equal(next?.right, undefined);
        assert.equal(next?.top, undefined);
        assert.equal(next?.bottom, undefined);
        assert.equal(next?.width, 200);
        assert.equal(next?.transform, undefined);
    });

    it('composes rotation, scale, and flips into one transform', () => {
        const next = commitPlacement(undefined, {
            ...readPlacement(undefined),
            rotate: 90,
            scaleX: 2,
            scaleY: 2,
            scaleLinked: true,
            flipX: true,
        }, { layout: false });
        assert.equal(next?.transform, 'rotate(90deg) scale(-2, 2)');
        const again = readPlacement(next);
        assert.equal(again.rotate, 90);
        assert.equal(again.scaleX, 2);
        assert.equal(again.scaleY, 2);
        assert.equal(again.scaleLinked, true);
        assert.equal(again.flipX, true);
        assert.equal(again.flipY, false);
    });

    it('reads a hand-written transform when the editor markers are missing', () => {
        const draft = readPlacement({ transform: 'rotate(-15deg) scale(1.5, -1.5)' });
        assert.equal(draft.rotate, -15);
        assert.equal(draft.scaleX, 1.5);
        assert.equal(draft.scaleY, 1.5);
        assert.equal(draft.flipX, false);
        assert.equal(draft.flipY, true);
    });

    it('aligns children inside the layout and clips with overflow hidden', () => {
        const next = commitPlacement(
            { backgroundColor: 'red', overflow: 'scroll' },
            { ...readPlacement(undefined), layoutX: 'center', layoutY: 'end', clip: true },
            { layout: true },
        );
        assert.equal(next?.backgroundColor, 'red');
        assert.equal(next?.display, 'flex');
        assert.equal(next?.flexDirection, 'column');
        assert.equal(next?.alignItems, 'center');
        assert.equal(next?.justifyContent, 'flex-end');
        assert.equal(next?.overflow, 'hidden');
        const again = readPlacement(next);
        assert.equal(again.layoutX, 'center');
        assert.equal(again.layoutY, 'end');
        assert.equal(again.clip, true);

        const cleared = commitPlacement(next, { ...readPlacement(next), layoutX: undefined, layoutY: undefined, clip: false }, { layout: true });
        assert.equal(cleared?.display, undefined);
        assert.equal(cleared?.overflow, undefined);
        assert.equal(cleared?.backgroundColor, 'red');
    });

    it('maps normal mode to left and bottom and drops right and top', () => {
        const absolute = commitPlacement(undefined, {
            ...readPlacement(undefined),
            mode: 'absolute',
            left: '1',
            right: '2',
            top: '3',
            bottom: '4',
        }, { layout: true });
        const normal = commitPlacement(absolute, { ...readPlacement(absolute), mode: 'normal' }, { layout: true });
        assert.equal(normal?.position, 'absolute');
        assert.equal(normal?.left, 1);
        assert.equal(normal?.bottom, 4);
        assert.equal(normal?.right, undefined);
        assert.equal(normal?.top, undefined);
        assert.equal(normal?.['--mm-right'], undefined);
        assert.equal(normal?.['--mm-top'], undefined);
        const again = readPlacement(normal);
        assert.equal(again.mode, 'normal');
        assert.equal(again.left, '1');
        assert.equal(again.bottom, '4');
        assert.equal(again.right, undefined);
        assert.equal(again.top, undefined);
    });

    it('writes position from the selected tab', () => {
        const base = readPlacement(undefined);
        const relative = commitPlacement(undefined, { ...base, mode: 'relative' }, { layout: true });
        assert.equal(relative?.position, 'relative');
        assert.equal(readPlacement(relative).mode, 'relative');

        const absolute = commitPlacement(relative, { ...readPlacement(relative), mode: 'absolute' }, { layout: true });
        assert.equal(absolute?.position, 'absolute');
        assert.equal(readPlacement(absolute).mode, 'absolute');

        const normal = commitPlacement(absolute, { ...readPlacement(absolute), mode: 'normal' }, { layout: true });
        assert.equal(normal?.position, 'absolute');
        assert.equal(readPlacement(normal).mode, 'normal');
    });

    it('writes scale X and scale Y, and locks them to one value', () => {
        const unlocked = commitPlacement(undefined, {
            ...readPlacement(undefined),
            scaleX: 2,
            scaleY: 0.5,
            scaleLinked: false,
        }, { layout: false });
        assert.equal(unlocked?.transform, 'scale(2, 0.5)');
        const read = readPlacement(unlocked);
        assert.equal(read.scaleX, 2);
        assert.equal(read.scaleY, 0.5);
        assert.equal(read.scaleLinked, false);

        const locked = commitPlacement(unlocked, { ...read, scaleLinked: true, scaleY: read.scaleX }, { layout: false });
        assert.equal(locked?.transform, 'scale(2, 2)');
        assert.equal(readPlacement(locked).scaleLinked, true);
        assert.equal(readPlacement(locked).scaleY, 2);
    });

    it('reads an atom fill as the absolute tab with every edge at zero', () => {
        const draft = readPlacement({
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
        });
        assert.equal(draft.mode, 'absolute');
        assert.equal(draft.left, '0');
        assert.equal(draft.right, '0');
        assert.equal(draft.top, '0');
        assert.equal(draft.bottom, '0');
    });

    it('pins this layer in its parent without moving children', () => {
        const fill = {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
        };
        const next = commitPlacement(
            fill,
            { ...readPlacement(fill), selfX: 'start', selfY: 'end' },
            { layout: true, items: false },
        );
        assert.equal(next?.display, undefined);
        assert.equal(next?.alignItems, undefined);
        assert.equal(next?.left, 0);
        assert.equal(next?.right, 'auto');
        assert.equal(next?.top, 'auto');
        assert.equal(next?.bottom, 0);
        assert.equal(next?.width, 'max-content');
        assert.equal(next?.height, 'max-content');
        assert.equal(next?.marginLeft, 0);
        assert.equal(next?.marginRight, 'auto');
        assert.equal(next?.marginTop, 'auto');
        assert.equal(next?.marginBottom, 0);
        const again = readPlacement(next);
        assert.equal(again.selfX, 'start');
        assert.equal(again.selfY, 'end');
        assert.equal(again.width, undefined);
        assert.equal(again.right, undefined);

        const centered = commitPlacement(next, { ...again, selfX: 'center', selfY: 'center' }, { layout: true });
        assert.equal(centered?.left, 0);
        assert.equal(centered?.right, 0);
        assert.equal(centered?.top, 0);
        assert.equal(centered?.bottom, 0);
        assert.equal(centered?.marginLeft, 'auto');
        assert.equal(centered?.marginRight, 'auto');
        assert.equal(centered?.alignItems, undefined);

        const cleared = commitPlacement(centered, { ...readPlacement(centered), selfX: undefined, selfY: undefined }, { layout: true });
        assert.equal(cleared?.marginLeft, undefined);
        assert.equal(cleared?.width, undefined);
        assert.equal(readPlacement(cleared).selfX, undefined);
    });

    it('keeps an authored width when self alignment centers the layer', () => {
        const next = commitPlacement(undefined, {
            ...readPlacement(undefined),
            mode: 'normal',
            width: '240',
            selfX: 'center',
        }, { layout: true });
        assert.equal(next?.width, 240);
        assert.equal(next?.left, 0);
        assert.equal(next?.right, 0);
        assert.equal(next?.marginLeft, 'auto');
        assert.equal(next?.top, 0);
        assert.equal(next?.bottom, 0);
    });

    it('turns children alignment off for atoms and on for containers and scenes', () => {
        assert.deepEqual(alignmentColumns({ placement: 'atom', role: 'track' }), { items: false, self: true });
        assert.deepEqual(alignmentColumns({ placement: 'container', role: 'track' }), { items: true, self: true });
        assert.deepEqual(alignmentColumns({ role: 'scene' }), { items: true, self: true });
        assert.deepEqual(alignmentColumns({ placement: 'container', role: 'scene' }), { items: true, self: true });
        assert.deepEqual(alignmentColumns(undefined), { items: false, self: true });
    });

    it('steps rotation by 90 degrees and wraps at a full turn', () => {
        assert.equal(rotateBy90(0), 90);
        assert.equal(rotateBy90(270), 0);
        assert.equal(rotateBy90(-10), 80);
    });
});
