import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navFor, pageOpens } from './nav';

const titles = (tier: Parameters<typeof navFor>[0]) => navFor(tier).flatMap(section => section.items.map(item => item.title));

test('Spaces and Library are in the sidebar for the cohort and admins only', () => {
  for (const tier of ['public', 'plus', 'pro'] as const) {
    assert.equal(titles(tier).includes('Spaces'), false, tier);
    assert.equal(titles(tier).includes('Library'), false, tier);
    assert.deepEqual(titles(tier).slice(0, 3), ['Home', 'Explore', 'My Items']);
    // the section is left out with its pages, not shown empty
    assert.equal(navFor(tier).some(section => section.label === 'Spaces'), false, tier);
  }
  for (const tier of ['cohort', 'admin'] as const) {
    assert.equal(titles(tier).includes('Spaces'), true, tier);
    assert.equal(titles(tier).includes('Library'), true, tier);
  }
  assert.equal(titles('cohort').includes('Releases'), false);
});

test('Explore and My Items sit beside Home, in the first group', () => {
  for (const tier of ['public', 'cohort', 'admin'] as const) {
    const [first] = navFor(tier);
    assert.equal(first.label, undefined);
    assert.deepEqual(
      first.items.map(item => [item.title, item.href]),
      [
        ['Home', '/app'],
        ['Explore', '/app/explore'],
        ['My Items', '/app/mine'],
      ],
    );
  }
});

test('a hidden page is closed with its sub-pages; the rest stay open', () => {
  assert.equal(pageOpens('pro', '/app/spaces'), false);
  assert.equal(pageOpens('pro', '/app/spaces/abc'), false);
  assert.equal(pageOpens('plus', '/app/library'), false);
  assert.equal(pageOpens('cohort', '/app/spaces/abc'), true);
  assert.equal(pageOpens('cohort', '/app/library'), true);
  assert.equal(pageOpens('cohort', '/app/releases'), false);
  assert.equal(pageOpens('admin', '/app/releases'), true);
  assert.equal(pageOpens('public', '/app/mine'), true);
  assert.equal(pageOpens('public', '/app/explore'), true);
  assert.equal(pageOpens('public', '/app'), true);
});
