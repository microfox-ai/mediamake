import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CatalogEntry } from '../catalog/types';
import type { RegistrySkill } from '../library/types';
import { appItems, explore, exploreFiltersFrom, homeColumns, mcpUsage, mine, storefront, tagTitle, variantBase, type ExploreFilters } from './member';

const entry = (id: string, more: Partial<CatalogEntry> = {}): CatalogEntry => ({
  id,
  kind: id.split('/')[0] as CatalogEntry['kind'],
  title: id.split('/')[1],
  summary: `About ${id}`,
  visibility: 'public',
  tier: 'public',
  status: 'live',
  readiness: 'beta',
  releasedAt: '2026-10-01',
  access: 'open',
  ...more,
});

const skill = (name: string, more: Partial<RegistrySkill> = {}): RegistrySkill => ({
  name,
  title: name,
  summary: '',
  description: `${name} description`,
  category: name.split('-')[0],
  location: 'committed',
  path: `.agents/skills/${name}`,
  ...more,
});

const SKILLS = [
  skill('make-lyrics-video', { mcps: [{ id: 'mcp/elevenlabs', need: 'required', for: 'words', without: 'no words' }] }),
  skill('pack-brand-kit', { mcps: [{ id: 'mcp/elevenlabs', need: 'optional', for: 'sound', without: 'no sound' }, { id: 'mcp/browse-hack', need: 'recommended', for: 'boards', without: 'slower' }] }),
  skill('cleanup-out'),
];

const ENTRIES = [
  entry('skill/make-lyrics-video', { installPrompt: 'Set up skill/make-lyrics-video', version: '1.2.0' }),
  entry('skill/pack-brand-kit', { readiness: 'ready', installPrompt: 'Set up skill/pack-brand-kit' }),
  entry('skill/cleanup-out', { installPrompt: 'Set up skill/cleanup-out' }),
  entry('mcp/elevenlabs', { installPrompt: 'Set up mcp/elevenlabs', tags: ['audio', 'mcp'] }),
  entry('mcp/browse-hack', { tier: 'pro', visibility: 'network', access: 'locked' }),
  entry('mcp/secret', { tier: 'cohort', visibility: 'private', access: 'locked' }),
  entry('mcp/vault', { tier: 'admin', visibility: 'private', access: 'locked' }),
  entry('mcp/broken', { health: 'failed', healthNote: 'Its sign-in changed', installPrompt: 'Set up mcp/broken' }),
  entry('app/skill-library', { href: '/library', tags: ['skills', 'media'] }),
  entry('tutorial/brand-kit', {}),
];

const items = appItems(ENTRIES, SKILLS, ['cleanup']);
const ALL: ExploreFilters = { q: '', kind: null, category: null, failed: false, internal: false, archived: false, locked: true, view: 'list' };
const ids = (list: { id: string }[]) => list.map(item => item.id).sort();

describe('the items the app lists', () => {
  it('keeps skills, MCPs and apps, and never the cohort or the vault for someone they are locked for', () => {
    assert.deepEqual(ids(items), ['app/skill-library', 'mcp/broken', 'mcp/browse-hack', 'mcp/elevenlabs', 'skill/cleanup-out', 'skill/make-lyrics-video', 'skill/pack-brand-kit']);
  });

  it('shows a cohort item to someone who holds it', () => {
    const forCohort = appItems([entry('mcp/secret', { tier: 'cohort', visibility: 'private', access: 'granted' })]);
    assert.equal(forCohort.length, 1);
    assert.equal(forCohort[0].locked, false);
  });

  it('says which membership opens a locked item, and gives it no way in', () => {
    const locked = items.find(item => item.id === 'mcp/browse-hack')!;
    assert.equal(locked.locked, true);
    assert.equal(locked.opensWith, 'Pro');
    assert.equal(locked.open, '/mcps/browse-hack');
    assert.equal(locked.updatePrompt, undefined);
  });

  it('marks Beta, failed and internal, and opens an app itself', () => {
    const byId = new Map(items.map(item => [item.id, item]));
    assert.equal(byId.get('skill/make-lyrics-video')!.beta, true);
    assert.equal(byId.get('skill/pack-brand-kit')!.beta, false);
    assert.equal(byId.get('mcp/broken')!.failed, true);
    assert.equal(byId.get('skill/cleanup-out')!.internal, true);
    assert.equal(byId.get('app/skill-library')!.open, '/library');
    assert.equal(byId.get('app/skill-library')!.page, '/apps/skill-library');
    assert.deepEqual(byId.get('mcp/elevenlabs')!.categories, ['audio']);
    assert.deepEqual(byId.get('skill/pack-brand-kit')!.categories, ['pack']);
    assert.match(byId.get('skill/make-lyrics-video')!.updatePrompt!, /^Update skill\/make-lyrics-video/);
  });
});

describe('Explore', () => {
  it('keeps failed and internal items behind their filters, and counts them', () => {
    const result = explore(items, ALL);
    assert.deepEqual(ids(result.shown), ['app/skill-library', 'mcp/browse-hack', 'mcp/elevenlabs', 'skill/make-lyrics-video', 'skill/pack-brand-kit']);
    assert.deepEqual(result.hidden, { failed: 1, internal: 1, archived: 0 });
    assert.deepEqual(ids(explore(items, { ...ALL, failed: true }).shown).includes('mcp/broken'), true);
    assert.deepEqual(ids(explore(items, { ...ALL, internal: true }).shown).includes('skill/cleanup-out'), true);
  });

  it('filters by kind, category and search, with counts for the chips', () => {
    const mcps = explore(items, { ...ALL, kind: 'mcp' });
    assert.deepEqual(ids(mcps.shown), ['mcp/browse-hack', 'mcp/elevenlabs']);
    assert.deepEqual(mcps.kinds, { skill: 2, mcp: 2, app: 1 });
    assert.deepEqual(ids(explore(items, { ...ALL, category: 'pack' }).shown), ['skill/pack-brand-kit']);
    assert.deepEqual(ids(explore(items, { ...ALL, q: 'lyrics' }).shown), ['skill/make-lyrics-video']);
    // a skill is found by the MCP it works with
    assert.deepEqual(explore(items, { ...ALL, q: 'pack-brand-kit description' }).shown.length, 1);
  });

  it('can leave out what the membership does not open', () => {
    assert.equal(explore(items, { ...ALL, locked: false }).shown.some(item => item.locked), false);
  });

  it('puts open items before locked ones and Ready before Beta', () => {
    const shown = explore(items, { ...ALL, kind: 'skill' }).shown;
    assert.equal(shown[0].id, 'skill/pack-brand-kit');
    assert.equal(explore(items, { ...ALL, kind: 'mcp' }).shown.at(-1)!.id, 'mcp/browse-hack');
  });

  it('reads its filters from the address', () => {
    assert.deepEqual(exploreFiltersFrom({ q: 'amv', kind: 'skill', show: 'failed,archived', locked: '0' }), {
      q: 'amv',
      kind: 'skill',
      category: null,
      failed: true,
      internal: false,
      archived: true,
      locked: false,
      view: 'list',
    });
    assert.equal(exploreFiltersFrom({ kind: 'tutorial' }).kind, null);
  });

  it('opens on the store front, and on the list when the address asks for something', () => {
    assert.equal(exploreFiltersFrom({}).view, 'store');
    assert.equal(exploreFiltersFrom({ view: 'all' }).view, 'list');
    assert.equal(exploreFiltersFrom({ category: 'make' }).view, 'list');
    assert.equal(exploreFiltersFrom({ show: 'failed' }).view, 'list');
  });
});

describe("Explore's store front", () => {
  const store = (more: Parameters<typeof entry>[1][] = []) => {
    const entries = [
      entry('skill/make-lyrics-video', { launchedAt: '2026-10-26', tags: ['make', 'lyric-video'], headshot: 'https://cdn.test/l.png', editorsPick: true }),
      entry('skill/make-amv', { launchedAt: '2026-11-08', tags: ['make', 'lyric-video'], editorsPick: true }),
      entry('skill/make-short', { launchedAt: '2026-11-01', tags: ['make', 'lyric-video'] }),
      entry('skill/pack-brand-kit', { readiness: 'ready', launchedAt: '2026-10-27' }),
      entry('skill/cleanup-out', { launchedAt: '2026-11-17' }),
      entry('mcp/browse-hack', { tier: 'pro', access: 'locked', releasedAt: '2026-11-15', tags: ['mcp', 'lyric-video'] }),
      entry('mcp/broken', { health: 'failed', healthNote: 'down', releasedAt: '2026-11-18', editorsPick: true }),
      entry('app/old', { archivedAt: '2026-11-01', releasedAt: '2026-11-18' }),
      ...more.map((one, i) => entry(`app/extra-${i}`, one)),
    ];
    const skills = [skill('make-lyrics-video'), skill('make-amv'), skill('make-short'), skill('pack-brand-kit'), skill('cleanup-out', { internal: true })];
    return storefront(appItems(entries, skills), [{ id: 'make', about: 'Makes a video' }, { id: 'pack', about: 'Packs things' }]);
  };

  it('shows the pick with a picture large, and the other picks in their row', () => {
    const front = store();
    assert.equal(front.hero?.id, 'skill/make-lyrics-video');
    assert.deepEqual(ids(front.picks), ['skill/make-amv']);
  });

  it('has no picks until an admin picks one', () => {
    const front = storefront(appItems([entry('skill/pack-brand-kit')], [skill('pack-brand-kit')]));
    assert.equal(front.hero, null);
    assert.deepEqual(front.picks, []);
  });

  it('lists the newest first by the day each came out, without failed, internal or archived items', () => {
    assert.deepEqual(store().fresh.map(item => item.id), ['mcp/browse-hack', 'skill/make-amv', 'skill/make-short', 'skill/pack-brand-kit', 'skill/make-lyrics-video']);
  });

  it('makes a row for a tag with enough items: categories first, open items before locked ones', () => {
    const rows = store().tags;
    assert.deepEqual(rows.map(row => row.tag), ['make', 'lyric-video']);
    assert.equal(rows[0].about, 'Makes a video');
    assert.equal(rows[1].title, 'Lyric video');
    assert.equal(rows[1].total, 4);
    assert.equal(rows[1].items.at(-1)!.id, 'mcp/browse-hack');
    assert.equal(tagTitle('make'), 'Make');
  });
});

const ACTIVITY = {
  usage: [
    { skill: 'make-lyrics-video', runs: 12, lastAt: '2026-11-10T10:00:00.000Z' },
    { skill: 'pack-brand-kit', runs: 3, lastAt: '2026-11-12T10:00:00.000Z' },
    { skill: 'my-own-skill', runs: 2, lastAt: '2026-11-01T10:00:00.000Z' },
  ],
  opens: [{ app: 'app/skill-library', opens: 4, lastAt: '2026-11-14T10:00:00.000Z' }],
  installs: [
    { itemId: 'mcp/elevenlabs', at: '2026-11-02T10:00:00.000Z' },
    { itemId: 'mcp/broken', version: '0.1.0', at: '2026-11-05T10:00:00.000Z' },
    { itemId: 'skill/cleanup-out', at: '2026-11-03T10:00:00.000Z' },
    { itemId: 'mcp/secret', at: '2026-11-04T10:00:00.000Z' },
  ],
  devices: [
    {
      device: 'mac-3f9a',
      reportedAt: '2026-11-15T08:00:00.000Z',
      skills: [
        { name: 'make-lyrics-video', version: '1.1.0' },
        { name: 'make-lyrics-video-like-nakama-2', version: 'a1b2c3' },
        { name: 'pack-brand-kit-v2' },
        { name: 'my-own-skill', version: '0.1.0' },
      ],
    },
  ],
};

describe('most used', () => {
  it('counts an MCP by the runs of the skills that work with it', () => {
    assert.deepEqual(
      mcpUsage(ACTIVITY.usage, SKILLS).map(use => [use.mcp, use.runs]),
      [
        ['mcp/elevenlabs', 15],
        ['mcp/browse-hack', 3],
      ],
    );
  });

  it('fills the three columns: most used, then installed lately without repeats', () => {
    const [skills, mcps, apps] = homeColumns(items, ACTIVITY, SKILLS);
    assert.deepEqual(skills.mostUsed.map(row => row.name), ['make-lyrics-video', 'pack-brand-kit', 'my-own-skill']);
    assert.equal(skills.mostUsed[2].item, undefined);
    assert.equal(skills.mostUsed[0].updateAvailable, true);
    assert.deepEqual(skills.recent.map(row => row.item!.id), ['skill/cleanup-out']);
    // browse-hack is counted, though locked; elevenlabs is not repeated under installs
    assert.deepEqual(mcps.mostUsed.map(row => row.item!.id), ['mcp/elevenlabs', 'mcp/browse-hack']);
    assert.deepEqual(mcps.recent.map(row => row.item!.id), ['mcp/broken']);
    assert.deepEqual(apps.mostUsed.map(row => [row.item!.id, row.why.count]), [['app/skill-library', 4]]);
  });
});

describe('Mine', () => {
  const result = mine(items, ACTIVITY, SKILLS);

  it('lists what was installed and the MediaMake skills on a computer, the last used first, then the last installed', () => {
    assert.deepEqual(result.installed.map(entry => entry.item.id), ['mcp/elevenlabs', 'skill/make-lyrics-video', 'mcp/broken', 'skill/cleanup-out']);
    // an MCP is used when a skill that works with it runs
    assert.deepEqual(result.installed[0].used, { at: '2026-11-12T10:00:00.000Z', count: 15, type: 'runs' });
    assert.equal(result.installed[2].used, undefined);
    assert.equal(result.installed[2].item.healthNote, 'Its sign-in changed');
    const lyrics = result.installed.find(entry => entry.item.id === 'skill/make-lyrics-video')!;
    assert.deepEqual(lyrics.on, [{ device: 'mac-3f9a', version: '1.1.0' }]);
    assert.equal(lyrics.updateAvailable, true);
  });

  it('never lists an installed item the catalog no longer shows them', () => {
    assert.equal(result.installed.some(entry => entry.item.id === 'mcp/secret'), false);
  });

  it('tells their variants from their other skills', () => {
    assert.deepEqual(result.variants.map(row => [row.name, row.variantOf]), [
      ['make-lyrics-video-like-nakama-2', 'make-lyrics-video'],
      ['pack-brand-kit-v2', 'pack-brand-kit'],
    ]);
    assert.deepEqual(result.local.map(row => row.name), ['my-own-skill']);
    assert.deepEqual(result.devices, [{ device: 'mac-3f9a', skills: 4, reportedAt: '2026-11-15T08:00:00.000Z' }]);
  });

  it('reads a variant from its name only when the base is known', () => {
    const known = (name: string) => name === 'make-amv';
    assert.equal(variantBase('make-amv-like-goku', known), 'make-amv');
    assert.equal(variantBase('make-amv-v3', known), 'make-amv');
    assert.equal(variantBase('other-like-goku', known), null);
    assert.equal(variantBase('make-amv', known), null);
  });
});
