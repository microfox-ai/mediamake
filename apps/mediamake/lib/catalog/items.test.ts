import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { registry } from '@/lib/skills/registry';
import { getStaticRecords, staticRecord, thirdPartyRecords } from './items';
import { UNAVAILABLE, planInstall } from './plan';
import { directoryUrlOf, isAlwaysPublic, isInstallable, parseCatalogItemId } from './types';

/** Our MCPs, released through the catalog database rather than defined in the repo. */
const OURS = new Set(['mcp/browse-hack', 'mcp/mediamake']);

describe('third-party.json', () => {
  const items = thirdPartyRecords([]);

  it('lists items made by others that install from their source and are always public', () => {
    assert.ok(items.length > 0);
    for (const item of items) {
      assert.ok(parseCatalogItemId(item.id), `${item.id} is a catalog id`);
      assert.equal(`${item.kind}/${item.slug}`, item.id);
      assert.ok(item.madeBy?.name, `${item.id} says who makes it`);
      assert.ok(isInstallable(item), `${item.id} has a source`);
      assert.ok(isAlwaysPublic(item), `${item.id} is always public`);
      assert.equal(item.versions.length, 0, `${item.id} has no package of ours`);
      const source = item.install!.source!;
      if (source.type === 'mcp-server') {
        assert.ok(source.local || source.remote || source.mcpb, `${item.id} has a way to add the server`);
        for (const setting of [...(source.local?.env ?? []), ...(source.remote?.headers ?? [])]) {
          assert.ok(!(setting.secret && setting.default), `${item.id}: a secret ${setting.name} has no default`);
          if (setting.format) assert.match(setting.format, /\{value\}/);
        }
      }
    }
  });

  it('is shadowed by a stored item with the same id', () => {
    assert.deepEqual(thirdPartyRecords([{ id: items[0].id }]).map(i => i.id).includes(items[0].id), false);
  });
});

describe('registry skills', () => {
  it('names only MCPs the catalog can find: ours, or listed in third-party.json', () => {
    for (const skill of registry?.skills ?? []) {
      for (const use of skill.mcps ?? []) {
        assert.ok(OURS.has(use.id) || staticRecord(use.id)?.madeBy, `${skill.name} uses ${use.id}, which isn't ours or in third-party.json`);
      }
    }
  });

  it('install from this repo with the repo, the skills they depend on and their MCPs', () => {
    const skill = staticRecord('skill/pack-brand-kit')!;
    assert.deepEqual(skill.install?.source, { type: 'github-skill', repo: 'microfox-ai/mediamake', path: '.agents/skills/pack-brand-kit' });
    assert.deepEqual(skill.install?.requires, [
      { type: 'repo', repo: 'microfox-ai/mediamake', why: 'The skill works in the MediaMake repo: its apps, scripts and brand kits' },
      { type: 'item', id: 'skill/revise-image' },
    ]);
    assert.deepEqual(
      skill.install?.uses?.map(u => [u.id, u.need]),
      [
        ['mcp/elevenlabs', 'required'],
        ['mcp/browse-hack', 'recommended'],
        ['mcp/fal', 'optional'],
      ],
    );
  });

  it('marks a vendored skill as made by its upstream, standing alone without the repo', () => {
    const skill = staticRecord('skill/remotion-render')!;
    assert.deepEqual(skill.madeBy, { name: 'remotion-dev', repo: 'remotion-dev/skills' });
    assert.deepEqual(skill.install?.requires, []);
  });

  it('plans pack-brand-kit from the repo alone: ElevenLabs and fal as choices, Browse Hack only from the database', async () => {
    const plan = await planInstall('skill/pack-brand-kit', {
      getRecord: async id => staticRecord(id),
      canOpen: () => true,
      downloadUrl: async key => key,
    });
    assert.ok(plan.ok);
    assert.deepEqual(
      plan.steps.filter(s => !s.forChoices).map(s => ('id' in s ? s.id : s.repo)),
      ['microfox-ai/mediamake', 'skill/revise-image', 'skill/pack-brand-kit'],
    );
    assert.deepEqual(
      plan.choices.map(c => [c.id, c.available]),
      [
        ['mcp/elevenlabs', true],
        ['mcp/browse-hack', false],
        ['mcp/fal', true],
      ],
    );
    assert.equal(plan.choices[1].unavailable, UNAVAILABLE);
  });

  it('installs the MediaMake MCP as its hosted connector, for the team', async () => {
    const mcp = staticRecord('mcp/mediamake')!;
    assert.equal(mcp.visibility, 'private');
    assert.ok(isInstallable(mcp));
    const source = mcp.install?.source;
    assert.equal(source?.type, 'mcp-server');
    if (source?.type === 'mcp-server') assert.match(source.remote!.url, /\/mcp$/);
    // not in Claude's connector directory: no link
    assert.equal(directoryUrlOf(source), undefined);
  });

  it("offers the shorts skill ElevenLabs' connector from Claude's directory, not the MediaMake MCP", async () => {
    const connector = staticRecord('mcp/elevenlabs-connector')!;
    assert.equal(directoryUrlOf(connector.install?.source), 'https://claude.ai/directory/elevenlabs');
    const plan = await planInstall('skill/make-lyrics-shorts-summerstyle-boldwords', {
      getRecord: async id => staticRecord(id),
      canOpen: () => true,
      downloadUrl: async key => key,
    });
    assert.ok(plan.ok);
    if (!plan.ok) return;
    const choice = plan.choices.find(c => c.id === 'mcp/elevenlabs-connector');
    assert.equal(choice?.need, 'required');
    assert.ok(choice?.available);
    assert.ok(!plan.choices.some(c => c.id === 'mcp/mediamake'));
  });

  it('every static record has a card id, and installable ones a source', () => {
    for (const record of getStaticRecords()) {
      assert.ok(parseCatalogItemId(record.id), record.id);
      if (record.kind === 'skill') assert.ok(isInstallable(record), `${record.id} installs from the repo`);
    }
  });
});
