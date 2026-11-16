import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyReport, dropDevice, parseSpaceReport, spaceItemId, spaceView, type SpaceReport, type SpaceState } from './space';

const empty: SpaceState = { space: null, items: [] };
const report = (device: string, more: Partial<SpaceReport> = {}): SpaceReport => ({ device, repo: 'me/my-space', pushed: true, items: [], ...more });
const after = (state: SpaceState, r: SpaceReport, now: string): SpaceState => {
  const change = applyReport(state, 'me', r, now);
  return { space: change.space, items: change.items };
};

describe('parseSpaceReport', () => {
  it('keeps names, versions, titles and summaries, and nothing else', () => {
    const parsed = parseSpaceReport({
      device: 'mac-3f9a',
      repo: 'me/my-space',
      branch: 'main',
      commit: 'abcdef123456',
      commitAt: '2026-11-16T10:00:00+05:30',
      pushed: true,
      token: 'ghp_secret',
      items: [
        { kind: 'skill', name: 'make-my-intro', version: '1.2.0', title: 'My intro', summary: 'Makes   my intro', path: '/Users/me/x', files: ['a'], changed: true, media: 2 },
        { kind: 'skill', name: '../../etc', version: '1' },
        { kind: 'plugin', name: 'nope' },
        { kind: 'mcp', name: 'my-tools', version: '/Users/me/secret path' },
      ],
    });
    assert.ok(!('error' in parsed));
    assert.deepEqual(parsed, {
      device: 'mac-3f9a',
      repo: 'me/my-space',
      branch: 'main',
      commit: 'abcdef123456',
      commitAt: '2026-11-16T04:30:00.000Z',
      pushed: true,
      items: [
        { kind: 'skill', name: 'make-my-intro', version: '1.2.0', title: 'My intro', summary: 'Makes my intro', changed: true, media: 2 },
        { kind: 'mcp', name: 'my-tools' },
      ],
    });
  });

  it('refuses a repo that is an address, and a body without items', () => {
    assert.ok('error' in parseSpaceReport({ repo: 'https://x:token@github.com/me/my-space', items: [] }));
    assert.ok('error' in parseSpaceReport({ repo: 'me/my-space' }));
    assert.ok('error' in parseSpaceReport(null));
  });
});

describe('applyReport', () => {
  const mac1 = after(
    empty,
    report('mac', { commit: 'aaaaaaa', commitAt: '2026-11-16T10:00:00.000Z', items: [{ kind: 'skill', name: 'make-my-intro', version: '1.0.0', title: 'My intro' }, { kind: 'mcp', name: 'my-tools', version: '0.1.0' }] }),
    '2026-11-16T10:01:00.000Z',
  );

  it('makes an item record ready for sharing', () => {
    assert.equal(mac1.space?.repo, 'me/my-space');
    const item = mac1.items[0];
    assert.deepEqual(item, {
      owner: 'me',
      kind: 'skill',
      name: 'make-my-intro',
      title: 'My intro',
      version: '1.0.0',
      devices: [{ device: 'mac', version: '1.0.0' }],
      projects: [],
      people: [],
      editors: [],
      createdAt: '2026-11-16T10:01:00.000Z',
      updatedAt: '2026-11-16T10:01:00.000Z',
    });
    assert.equal(spaceItemId(item), 'me:skill/make-my-intro');
    assert.equal(mac1.items[1].title, 'My tools');
  });

  it('shows which computers have an item and which are behind', () => {
    // the pc joins at the same commit, then the mac pushes 1.1.0
    const pc = after(mac1, report('pc', { commit: 'aaaaaaa', commitAt: '2026-11-16T10:00:00.000Z', items: [{ kind: 'skill', name: 'make-my-intro', version: '1.0.0' }] }), '2026-11-16T11:00:00.000Z');
    const mac2 = after(
      pc,
      report('mac', { commit: 'bbbbbbb', commitAt: '2026-11-16T12:00:00.000Z', items: [{ kind: 'skill', name: 'make-my-intro', version: '1.1.0', title: 'My intro, better' }, { kind: 'mcp', name: 'my-tools', version: '0.1.0' }] }),
      '2026-11-16T12:01:00.000Z',
    );
    const view = spaceView(mac2)!;
    assert.deepEqual(view.devices.map(d => [d.device, d.behind]), [['mac', false], ['pc', true]]);
    const skill = view.items.find(i => i.name === 'make-my-intro')!;
    assert.equal(skill.version, '1.1.0');
    assert.equal(skill.title, 'My intro, better');
    assert.deepEqual(skill.on, [{ device: 'mac', version: '1.1.0' }, { device: 'pc', version: '1.0.0', behind: true }]);
    const mcp = view.items.find(i => i.name === 'my-tools')!;
    assert.deepEqual(mcp.missingOn, ['pc']);
    assert.deepEqual(view.items.map(i => i.kind), ['skill', 'mcp']);

    // a report from the computer that is behind doesn't take the title or the version back
    const pcAgain = after(mac2, report('pc', { commit: 'aaaaaaa', commitAt: '2026-11-16T10:00:00.000Z', items: [{ kind: 'skill', name: 'make-my-intro', version: '1.0.0', title: 'My intro' }] }), '2026-11-16T13:00:00.000Z');
    const again = pcAgain.items.find(i => i.name === 'make-my-intro')!;
    assert.equal(again.title, 'My intro, better');
    assert.equal(again.version, '1.1.0');
    // and an item nothing changed for keeps its record as it was
    assert.equal(pcAgain.items.find(i => i.name === 'my-tools'), mac2.items.find(i => i.name === 'my-tools'));
  });

  it('removes an item no computer has, unless it is shared, and never touches sharing', () => {
    const shared: SpaceState = { space: mac1.space, items: mac1.items.map(item => (item.kind === 'mcp' ? { ...item, projects: ['proj-1'], editors: ['friend'] } : item)) };
    const change = applyReport(shared, 'me', report('mac', { commit: 'ccccccc', commitAt: '2026-11-16T14:00:00.000Z', items: [] }), '2026-11-16T14:01:00.000Z');
    assert.deepEqual(change.removed, ['skill/make-my-intro']);
    assert.equal(change.items.length, 1);
    assert.deepEqual([change.items[0].projects, change.items[0].editors, change.items[0].devices], [['proj-1'], ['friend'], []]);

    const edited = applyReport(shared, 'me', report('mac', { items: [{ kind: 'mcp', name: 'my-tools', version: '0.2.0', changed: true }] }), '2026-11-16T15:00:00.000Z');
    const mcp = edited.items.find(i => i.kind === 'mcp')!;
    assert.deepEqual([mcp.projects, mcp.editors, mcp.version], [['proj-1'], ['friend'], '0.2.0']);
    assert.equal(spaceView({ space: edited.space, items: edited.items })!.items[0].on[0].changed, true);
    assert.equal(spaceView({ space: edited.space, items: edited.items })!.items[0].projects, 1);
  });

  it('starts the computers again when another repo is connected', () => {
    const pc = after(mac1, report('pc', { items: [{ kind: 'skill', name: 'make-my-intro', version: '1.0.0' }] }), '2026-11-16T11:00:00.000Z');
    const moved = applyReport(pc, 'me', report('mac', { repo: 'me/other-space', items: [{ kind: 'app', name: 'my-board' }] }), '2026-11-16T16:00:00.000Z');
    assert.equal(moved.space.repo, 'me/other-space');
    assert.deepEqual(moved.space.devices.map(d => d.device), ['mac']);
    assert.deepEqual(moved.items.map(i => i.name), ['my-board']);
    assert.deepEqual(moved.removed.sort(), ['mcp/my-tools', 'skill/make-my-intro']);
  });
});

describe('dropDevice', () => {
  it('takes a computer off the space and off its items', () => {
    const mac = after(empty, report('mac', { items: [{ kind: 'skill', name: 'make-my-intro', version: '1.0.0' }, { kind: 'app', name: 'mac-only' }] }), '2026-11-16T10:00:00.000Z');
    const both = after(mac, report('pc', { items: [{ kind: 'skill', name: 'make-my-intro', version: '1.0.0' }] }), '2026-11-16T11:00:00.000Z');
    const change = dropDevice(both, 'me', 'mac', '2026-11-16T12:00:00.000Z')!;
    assert.deepEqual(change.space.devices.map(d => d.device), ['pc']);
    assert.deepEqual(change.removed, ['app/mac-only']);
    assert.deepEqual(change.items[0].devices, [{ device: 'pc', version: '1.0.0' }]);
    assert.equal(dropDevice(both, 'me', 'nobody'), null);
    assert.equal(spaceView(empty), null);
  });
});
