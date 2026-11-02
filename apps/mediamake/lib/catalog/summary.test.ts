import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getStaticRecords } from './items';
import { originOf, summarize, usedByOf } from './summary';
import { withArchive, type CatalogItemRecord } from './types';

const record = (id: string, extra: Partial<CatalogItemRecord> = {}): CatalogItemRecord => {
  const [kind, slug] = id.split('/') as [CatalogItemRecord['kind'], string];
  return { id, kind, slug, title: slug, summary: '', visibility: 'private', status: 'beta', releasedAt: '2026-11-02', versions: [], createdAt: '2026-11-02', ...extra };
};

describe('withArchive', () => {
  it('dates the archived items and leaves the rest alone', () => {
    const items = withArchive([record('skill/a'), record('skill/b')], [{ id: 'skill/b', at: '2026-11-03T00:00:00.000Z' }]);
    assert.equal(items[0].archivedAt, undefined);
    assert.equal(items[1].archivedAt, '2026-11-03T00:00:00.000Z');
  });
});

describe('summarize', () => {
  const pack = record('mcp/pack', {
    versions: [{ version: '0.8.0', storageKey: 'k', sha256: 's', bytes: 1, publishedAt: '2026-11-02' }],
  });
  const skill = record('skill/kit', {
    kind: 'skill',
    visibility: 'public',
    status: 'live',
    install: {
      source: { type: 'github-skill', repo: 'microfox-ai/mediamake', path: '.agents/skills/kit' },
      requires: [{ type: 'item', id: 'skill/base' }],
      uses: [{ id: 'mcp/pack', need: 'required', for: 'x', without: 'y' }],
    },
  });

  it('puts each item in a line: tier, where it comes from, what it uses and what uses it', () => {
    const [packLine, skillLine] = summarize([pack, skill, record('skill/base', { visibility: 'public' })]);
    assert.deepEqual(packLine, {
      id: 'mcp/pack',
      title: 'pack',
      kind: 'mcp',
      tier: 'development',
      status: 'beta',
      version: '0.8.0',
      origin: 'Our package · v0.8.0',
      uses: [],
      usedBy: ['skill/kit'],
      page: '/core/releases/mcp/pack',
    });
    assert.equal(skillLine.tier, 'public');
    assert.equal(skillLine.origin, 'Skill in the repo');
    assert.deepEqual(skillLine.uses, ['mcp/pack (required)']);
  });

  it('tells which items need or use another, and how', () => {
    assert.deepEqual(usedByOf([pack, skill], 'mcp/pack'), [{ id: 'skill/kit', title: 'kit', how: 'uses', need: 'required', for: 'x' }]);
    assert.deepEqual(usedByOf([pack, skill], 'skill/base'), [{ id: 'skill/kit', title: 'kit', how: 'requires' }]);
  });

  it('carries the archive date, and names the origin of every item the repo defines', () => {
    assert.equal(summarize(withArchive([pack], [{ id: 'mcp/pack', at: '2026-11-03' }]))[0].archivedAt, '2026-11-03');
    // only a card that is still coming soon (the MediaMake MCP) has nothing released
    for (const item of getStaticRecords()) assert.equal(originOf(item) === 'Nothing released yet', item.status === 'coming-soon', item.id);
  });
});
