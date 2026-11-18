/**
 * The pure half of `mm thumbs figcraft` (scripts/figcraft.ts): colours, faces, gradients, which
 * layers travel how, and the script a text layer becomes. The rendering half is checked on real
 * jobs by the command itself (Figcraft's export against a fresh render).
 *
 *   mm test:figcraft
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type Probe, type Step, buildScript, fillColor, fontStyle, gradientPaint, hexColor, planLayers, textBakeReason } from './figcraft.ts';
import type { ResolvedVariant, TextLayer } from '../thumbnails/spec.ts';

test('CSS colours become #RRGGBB or #RRGGBBAA', () => {
  assert.equal(hexColor('#fff'), '#FFFFFF');
  assert.equal(hexColor('#12d650'), '#12D650');
  assert.equal(hexColor('#12d650ff'), '#12D650');
  assert.equal(hexColor('rgba(0,0,0,0.55)'), '#0000008C');
  assert.equal(hexColor('rgb(255 42 18 / 70%)'), '#FF2A12B3');
  assert.equal(hexColor('white'), '#FFFFFF');
  assert.equal(hexColor('linear-gradient(#fff, #000)'), undefined);
  assert.equal(hexColor('var(--x)'), undefined);
});

test('a weight finds the face the font really has', () => {
  assert.equal(fontStyle(900, false, ['Black']), 'Black');
  assert.equal(fontStyle(800, false, ['Regular', 'Extra Bold']), 'Extra Bold');
  assert.equal(fontStyle(400, true, ['Regular', 'Italic']), 'Italic');
  assert.equal(fontStyle(700, true), 'Bold Italic');
  assert.equal(fontStyle(800, false, ['Heavy']), 'Heavy');
  // a brand font with one odd face: that face
  assert.equal(fontStyle(400, false, ['Roman Display']), 'Roman Display');
  assert.equal(fontStyle(400, false, ['Light', 'Bold']), undefined);
});

test('simple linear gradients become paints, the rest stay CSS', () => {
  assert.deepEqual(gradientPaint('linear-gradient(180deg, #fff, #ff0000)'), { type: 'linearGradient', stops: ['#FFFFFF', '#FF0000'], from: [0.5, 0], to: [0.5, 1] });
  assert.ok(gradientPaint('linear-gradient(to right, #000 0%, #fff 100%)'));
  assert.equal(gradientPaint('linear-gradient(180deg, #fff 10%, #000 30%)'), undefined);
  assert.equal(gradientPaint('radial-gradient(#fff, #000)'), undefined);
  assert.equal(gradientPaint('url(texture.jpg)'), undefined);
});

test('text Figcraft cannot draw is kept as its render, with the live text under it', () => {
  const base: TextLayer = { type: 'text', lines: ['HI'] };
  assert.equal(textBakeReason(base), undefined);
  assert.equal(textBakeReason({ ...base, stroke: { width: 4, color: '#000' }, glow: { color: 'rgba(255,0,0,0.9)' } }), undefined);
  assert.match(textBakeReason({ ...base, skew: -8 }) ?? '', /slanted/);
  assert.match(textBakeReason({ ...base, plate: { knockout: true } }) ?? '', /cut out/);
  assert.match(textBakeReason({ ...base, fill: 'url(fire.jpg)' }) ?? '', /inside the letters/);
});

const variant: ResolvedVariant = {
  id: 'A1',
  style: 'A',
  styleName: 'Test',
  layers: [
    { id: 'bg', type: 'fill', background: '#050101' },
    { id: 'sky', type: 'fill', background: 'radial-gradient(#fff, #000)' },
    { id: 'photo', type: 'photo', src: 'input/hero.jpg' },
    { id: 'grain', type: 'fx', kind: 'grain', strength: 0.04 },
    { id: 'title', type: 'text', lines: ['ONE *TWO*', 'THREE'], rotate: -90, plate: { color: '#000' }, glow: { color: '#12d650' }, accent: '#ff2a2a' },
  ],
};

test('plain fills become rectangles, pictures images at 2×, textures images at 1× with their blend', () => {
  const plans = planLayers(variant, 1);
  assert.deepEqual(
    plans.map(p => [p.key, p.how, p.scale, p.blend ?? null]),
    [
      ['0', 'rect', 1, null],
      ['1', 'image', 1, null],
      ['2', 'image', 2, null],
      ['3', 'image', 1, 'overlay'],
      ['4', 'text', 2, null],
    ],
  );
  assert.equal(fillColor({ type: 'fill', background: '#050101' }), '#050101');
  assert.equal(fillColor({ type: 'fill', color: '#000', background: 'linear-gradient(#fff, #000)' }), undefined);
});

test('a text layer becomes plates and live lines in one group, accents and the turn after each layer is made', () => {
  const probe: Probe = {
    index: 4,
    items: [
      { segs: [{ t: 'ONE ', accent: false }, { t: 'TWO', accent: true }], text: 'ONE TWO', font: 'Anton', weight: 400, italic: false, scale: 1 },
      { segs: [{ t: 'THREE', accent: false }], text: 'THREE', font: 'Anton', weight: 400, italic: false, scale: 1 },
    ],
    boxes: [
      { x: 100, y: 100, w: 400, h: 120, size: 100, textW: 400, spacing: 0, inkTop: 120, inkBottom: 200 },
      { x: 100, y: 215, w: 400, h: 120, size: 100, textW: 300, spacing: 0, inkTop: 235, inkBottom: 315 },
    ],
    inkTop: 120,
    inkBottom: 315,
  };
  const { steps } = buildScript({
    name: 'job · A1',
    size: [1280, 720],
    fonts: ['/fonts/Anton-400.ttf'],
    styles: { Anton: ['Regular'] },
    plans: planLayers(variant, 1).filter(p => p.key === '4'),
    probes: new Map([[4, probe]]),
    baked: new Map(),
  });
  const by = (c: string) => steps.filter((s: Step) => s.command === c);
  assert.equal(steps[0].command, 'frame.create');
  assert.equal(by('text.loadFont').length, 1);
  const texts = by('node.create').filter(s => s.params.type === 'text');
  assert.deepEqual(
    texts.map(s => s.params.text),
    ['ONE TWO', 'THREE'],
  );
  assert.equal((texts[0].params.props as Record<string, unknown>).fontStyle, 'Regular');
  assert.equal(by('node.create').filter(s => s.params.type === 'rectangle').length, 2, 'a plate under each line');
  // the accent word's own fill over its characters
  assert.deepEqual(by('text.style')[0].params, { id: { $ref: texts[0].as }, start: 4, end: 7, textFills: ['#FF2A2A'] });
  // turned with node.set after each layer is made, the other way from CSS
  const turns = by('node.set').filter(s => (s.params.props as Record<string, unknown>).rotation !== undefined);
  assert.equal(turns.length, 4);
  assert.equal((turns[0].params.props as Record<string, unknown>).rotation, 90);
  // the line's centre turned about the layer's centre (300, 217.5) by -90°: to its left
  const p = texts[0].params as { x: number; y: number };
  assert.deepEqual([Math.round(p.x + 200), Math.round(p.y + 60)], [243, 218]);
  // the glow on the group
  const group = by('object.group')[0];
  const set = by('node.set').find(s => (s.params.ids as { $ref: string }[])[0].$ref === group.as);
  assert.equal(((set?.params.props as Record<string, unknown>).effects as unknown[]).length, 2);
});

test('one line without a plate is a lone text layer, hidden under its render when Figcraft cannot draw it', () => {
  const layer: TextLayer = { id: 'kicker', type: 'text', lines: ['BREAKING'], skew: -10 };
  const v: ResolvedVariant = { id: 'B1', style: 'B', styleName: 'Test', layers: [layer] };
  const probe: Probe = {
    index: 0,
    items: [{ segs: [{ t: 'BREAKING', accent: false }], text: 'BREAKING', font: 'Anton', weight: 400, italic: false, scale: 1 }],
    boxes: [{ x: 0, y: 0, w: 200, h: 40, size: 30, textW: 150, spacing: 0, inkTop: 5, inkBottom: 30 }],
    inkTop: 5,
    inkBottom: 30,
  };
  const { steps, notes } = buildScript({ name: 'n', size: [1280, 720], fonts: [], styles: {}, plans: planLayers(v, 1), probes: new Map([[0, probe]]), baked: new Map([['0', { file: '/l/00.png', box: [10, 10, 100, 30] }]]) });
  assert.equal(steps.filter(s => s.command === 'object.group').length, 0);
  assert.equal(steps.filter(s => s.command === 'image.place').length, 1);
  const text = steps.find(s => s.params.type === 'text')!;
  assert.equal(text.params.name, 'BREAKING (editable)');
  assert.equal((text.params.props as Record<string, unknown>).visible, false);
  assert.match(notes[0], /slanted/);
});
