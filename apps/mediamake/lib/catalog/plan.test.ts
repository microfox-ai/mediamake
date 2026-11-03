import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { UNAVAILABLE, planInstall, type InstallPlan, type PlanSources } from './plan';
import type { CatalogItemRecord, InstallSpec } from './types';

function record(id: string, install: InstallSpec = {}, extra: Partial<CatalogItemRecord> = {}): CatalogItemRecord {
  const [kind, slug] = id.split('/') as [CatalogItemRecord['kind'], string];
  return { id, kind, slug, title: slug, summary: '', visibility: 'public', status: 'live', releasedAt: '2026-11-02', versions: [], createdAt: '2026-11-02', install, ...extra };
}

const skillSource = (name: string) => ({ type: 'github-skill' as const, repo: 'microfox-ai/mediamake', path: `.agents/skills/${name}` });
const mcpSource = (name: string) => ({ type: 'mcp-server' as const, name, local: { command: 'uvx', args: [`${name}-mcp`] } });
const packaged = { versions: [{ version: '0.7.0', storageKey: 'catalog-private/mcp/browse-hack/0.7.0.tar.gz', sha256: 'a'.repeat(64), bytes: 1, publishedAt: '2026-11-02' }] };

function sources(records: CatalogItemRecord[], locked: string[] = []): PlanSources {
  const byId = new Map(records.map(r => [r.id, r]));
  return {
    getRecord: async id => byId.get(id) ?? null,
    canOpen: r => !locked.includes(r.id),
    downloadUrl: async key => `https://storage.example.com/${key}?signed`,
  };
}

function ok(plan: InstallPlan) {
  assert.ok(plan.ok, plan.ok ? '' : plan.error);
  return plan;
}

const brandKit = record('skill/pack-brand-kit', {
  source: skillSource('pack-brand-kit'),
  requires: [{ type: 'repo', repo: 'microfox-ai/mediamake' }],
  uses: [
    { id: 'mcp/fal', need: 'optional', for: 'logo concepts', without: 'Midjourney only' },
    { id: 'mcp/browse-hack', need: 'recommended', for: 'Pinterest research', without: 'research by hand' },
    { id: 'mcp/elevenlabs', need: 'required', for: 'sound effects', without: 'no sound at all' },
  ],
});
const elevenlabs = record('mcp/elevenlabs', { source: mcpSource('elevenlabs') }, { madeBy: { name: 'ElevenLabs', repo: 'elevenlabs/elevenlabs-mcp', license: 'MIT' } });
const extension = { type: 'github-release' as const, repo: 'microfox-ai/extensions', asset: 'browse-hack-chrome.zip', name: 'Browse Hack Chrome extension', kind: 'chrome-extension' as const };
const browseHack = record('mcp/browse-hack', { method: 'mcpb', entry: 'browse-hack.mcpb', requires: [extension] }, { ...packaged, visibility: 'private' });

describe('planInstall', () => {
  it('installs the skill outright and offers its MCPs as choices, strongest need first', async () => {
    const plan = ok(await planInstall('skill/pack-brand-kit', sources([brandKit, elevenlabs, browseHack])));

    assert.deepEqual(
      plan.steps.map(s => [s.type, 'id' in s ? s.id : s.repo, s.forChoices]),
      [
        ['repo', 'microfox-ai/mediamake', undefined],
        ['source', 'skill/pack-brand-kit', undefined],
        ['source', 'mcp/elevenlabs', ['mcp/elevenlabs']],
        ['github-release', 'microfox-ai/extensions', ['mcp/browse-hack']],
        ['item', 'mcp/browse-hack', ['mcp/browse-hack']],
      ],
    );
    assert.deepEqual(
      plan.choices.map(c => [c.id, c.need, c.available]),
      [
        ['mcp/elevenlabs', 'required', true],
        ['mcp/browse-hack', 'recommended', true],
        ['mcp/fal', 'optional', false],
      ],
    );
    const eleven = plan.choices[0];
    assert.equal(eleven.title, 'elevenlabs');
    assert.deepEqual(eleven.madeBy, elevenlabs.madeBy);
    assert.deepEqual(eleven.reasons, [{ by: 'skill/pack-brand-kit', need: 'required', for: 'sound effects', without: 'no sound at all' }]);
    // the choice's own step names who uses it; its dependencies who requires them
    const steps = new Map(plan.steps.map(s => ['id' in s ? s.id : s.repo, s]));
    assert.deepEqual(steps.get('mcp/elevenlabs')!.requiredBy, ['skill/pack-brand-kit']);
    assert.deepEqual(steps.get('microfox-ai/extensions')!.requiredBy, ['mcp/browse-hack']);
    // a package of ours still comes as a package with a signed link
    const pkg = steps.get('mcp/browse-hack')!;
    assert.equal(pkg.type, 'item');
    if (pkg.type === 'item') assert.match(pkg.downloadUrl, /0\.7\.0\.tar\.gz\?signed$/);
    // a choice that isn't in the catalog says so, without steps
    assert.equal(plan.choices[2].unavailable, UNAVAILABLE);
  });

  it('lists a choice the person cannot open as unavailable, in the same words as a missing one, and adds none of its steps', async () => {
    const plan = ok(await planInstall('skill/pack-brand-kit', sources([brandKit, elevenlabs, browseHack], ['mcp/browse-hack'])));
    const choice = plan.choices.find(c => c.id === 'mcp/browse-hack')!;
    assert.equal(choice.available, false);
    assert.equal(choice.unavailable, UNAVAILABLE);
    assert.equal(choice.title, 'browse-hack'); // not the hidden record's title
    assert.ok(!plan.steps.some(s => s.type === 'github-release' || ('id' in s && s.id === 'mcp/browse-hack')));
  });

  it('rolls a choice back when something it requires is locked, keeping steps others need', async () => {
    const shared = { type: 'repo' as const, repo: 'microfox-ai/mediamake' };
    const needsLocked = record('mcp/needs-locked', { source: mcpSource('x'), requires: [shared, { type: 'item', id: 'mcp/secret' }] });
    const skill = record('skill/s', {
      source: skillSource('s'),
      requires: [shared],
      uses: [{ id: 'mcp/needs-locked', need: 'recommended', for: 'a', without: 'b' }],
    });
    const plan = ok(await planInstall('skill/s', sources([skill, needsLocked, record('mcp/secret', { source: mcpSource('secret') })], ['mcp/secret'])));
    assert.equal(plan.choices[0].available, false);
    assert.match(plan.choices[0].unavailable!, /mcp\/needs-locked needs another item that isn't shared with you yet/);
    assert.deepEqual(plan.steps.map(s => ('id' in s ? s.id : s.repo)), ['microfox-ai/mediamake', 'skill/s']);
    assert.deepEqual(plan.steps[0].requiredBy, ['skill/s']);
    assert.equal(plan.steps[0].forChoices, undefined);
  });

  it('installs a step for any of the choices that need it, through items one choice brings for another', async () => {
    // choice A (an MCP that needs the extension) and choice B (a skill that needs A)
    const skillB = record('skill/b', { source: skillSource('b'), requires: [{ type: 'item', id: 'mcp/browse-hack' }] });
    const root = record('skill/root', {
      source: skillSource('root'),
      uses: [
        { id: 'mcp/browse-hack', need: 'recommended', for: 'a', without: 'b' },
        { id: 'skill/b', need: 'optional', for: 'c', without: 'd' },
      ],
    });
    const plan = ok(await planInstall('skill/root', sources([root, browseHack, skillB])));
    const byKey = new Map(plan.steps.map(s => ['id' in s ? s.id : s.repo, s]));
    assert.deepEqual(byKey.get('mcp/browse-hack')!.forChoices, ['mcp/browse-hack', 'skill/b']);
    assert.deepEqual(byKey.get('microfox-ai/extensions')!.forChoices, ['mcp/browse-hack', 'skill/b']);
    assert.deepEqual(byKey.get('skill/b')!.forChoices, ['skill/b']);
  });

  it('offers nothing for what is installed outright anyway, the item itself included', async () => {
    const skill = record('skill/s', {
      source: skillSource('s'),
      requires: [{ type: 'item', id: 'mcp/elevenlabs' }],
      uses: [
        { id: 'mcp/elevenlabs', need: 'required', for: 'a', without: 'b' },
        { id: 'skill/s', need: 'optional', for: 'c', without: 'd' },
      ],
    });
    const plan = ok(await planInstall('skill/s', sources([skill, elevenlabs])));
    assert.deepEqual(plan.choices, []);
    assert.deepEqual(plan.steps.map(s => [('id' in s ? s.id : s.repo), s.forChoices]), [['microfox-ai/mediamake', undefined], ['mcp/elevenlabs', undefined], ['skill/s', undefined]]);
  });

  it('only takes choices from items installed outright, not from the choices themselves', async () => {
    const chained = record('mcp/elevenlabs', { source: mcpSource('elevenlabs'), uses: [{ id: 'mcp/fal', need: 'optional', for: 'a', without: 'b' }] });
    const plan = ok(await planInstall('skill/pack-brand-kit', sources([brandKit, chained, browseHack])));
    assert.deepEqual(plan.choices.map(c => c.id), ['mcp/elevenlabs', 'mcp/browse-hack', 'mcp/fal']);
    assert.equal(plan.choices.find(c => c.id === 'mcp/fal')!.reasons.length, 1); // only the skill's own reason
  });

  it('clones the MediaMake repo first for every skill of ours, once, even when its record leaves it out', async () => {
    const released = record('skill/lyric-video', { method: 'skill' }, packaged);
    const plan = ok(await planInstall('skill/lyric-video', sources([released])));
    assert.deepEqual(
      plan.steps.map(s => [s.type, 'id' in s ? s.id : s.repo]),
      [
        ['repo', 'microfox-ai/mediamake'],
        ['item', 'skill/lyric-video'],
      ],
    );
    assert.deepEqual(plan.steps[0].requiredBy, ['skill/lyric-video']);

    // a skill that already lists it, and one it depends on, still clone it once
    const base = record('skill/base', { source: skillSource('base') });
    const variant = record('skill/variant', { source: skillSource('variant'), requires: [{ type: 'repo', repo: 'microfox-ai/mediamake' }, { type: 'item', id: 'skill/base' }] });
    const both = ok(await planInstall('skill/variant', sources([base, variant])));
    assert.deepEqual(
      both.steps.map(s => [s.type, 'id' in s ? s.id : s.repo]),
      [
        ['repo', 'microfox-ai/mediamake'],
        ['source', 'skill/base'],
        ['source', 'skill/variant'],
      ],
    );
    assert.deepEqual(both.steps[0].requiredBy, ['skill/variant', 'skill/base']);
  });

  it('adds no MediaMake repo for a skill someone else makes, or for an MCP', async () => {
    const theirs = record('skill/theirs', { source: { type: 'github-skill', repo: 'someone/skills', path: 'theirs' } }, { madeBy: { name: 'someone', repo: 'someone/skills' } });
    assert.deepEqual(ok(await planInstall('skill/theirs', sources([theirs]))).steps.map(s => s.type), ['source']);
    assert.deepEqual(ok(await planInstall('mcp/browse-hack', sources([browseHack]))).steps.map(s => s.type), ['github-release', 'item']);
  });

  it('still fails the plan when something required outright is locked or missing', async () => {
    const skill = record('skill/s', { source: skillSource('s'), requires: [{ type: 'item', id: 'mcp/browse-hack' }] });
    const locked = await planInstall('skill/s', sources([skill, browseHack], ['mcp/browse-hack']));
    assert.deepEqual(locked, { ok: false, status: 409, error: "skill/s needs another item that isn't shared with you yet. Ask whoever shared skill/s to give you access to everything it needs." });
    assert.deepEqual(await planInstall('skill/missing', sources([])), { ok: false, status: 404, error: 'Not found' });
    const nothing = await planInstall('mcp/empty', sources([record('mcp/empty')]));
    assert.deepEqual(nothing, { ok: false, status: 409, error: 'mcp/empty has no published version yet.' });
  });
});
