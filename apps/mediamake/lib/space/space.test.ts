import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyReport, deviceName, dropDevice, parseSpaceReport, projectOf, projectSpaceId, spaceView, userSpaceId, type SpaceReport, type SpaceState } from './space';

const MINE = userSpaceId('me');
const PROJECT = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const empty: SpaceState = { space: null, items: [] };
const report = (device: string, more: Partial<SpaceReport> = {}): SpaceReport => ({ device, repo: 'me/mediamake-space', pushed: true, items: [], ...more });
const after = (state: SpaceState, r: SpaceReport, now: string, space = MINE, who = 'me'): SpaceState => {
  const change = applyReport(state, space, who, r, now);
  return { space: change.space, items: change.items };
};

describe('parseSpaceReport', () => {
  it('keeps names, versions, titles and summaries, and nothing else', () => {
    const parsed = parseSpaceReport({
      device: 'mac-3f9a',
      repo: 'me/mediamake-space',
      project: PROJECT,
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
    assert.deepEqual(parsed, {
      device: 'mac-3f9a',
      repo: 'me/mediamake-space',
      project: PROJECT,
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

  it('refuses a repo that is an address, a project that is not an id, and a body without items', () => {
    assert.ok('error' in parseSpaceReport({ repo: 'https://x:token@github.com/me/my-space', items: [] }));
    assert.ok('error' in parseSpaceReport({ repo: 'me/my-space', project: '../x', items: [] }));
    assert.ok('error' in parseSpaceReport({ repo: 'me/my-space' }));
    assert.ok('error' in parseSpaceReport(null));
  });
});

describe('a member\'s own space', () => {
  const mac1 = after(
    empty,
    report('mac-3f9a', { commit: 'aaaaaaa', commitAt: '2026-11-16T10:00:00.000Z', items: [{ kind: 'skill', name: 'make-my-intro', version: '1.0.0', title: 'My intro' }, { kind: 'mcp', name: 'my-tools', version: 'tree:0123456789ab' }] }),
    '2026-11-16T10:01:00.000Z',
  );

  it('keeps one record per item, with the computers that have it', () => {
    assert.deepEqual(mac1.space, {
      id: 'user:me',
      repo: 'me/mediamake-space',
      connectedAt: '2026-11-16T10:01:00.000Z',
      updatedAt: '2026-11-16T10:01:00.000Z',
      devices: [{ key: 'me/mac-3f9a', clientId: 'me', label: 'mac-3f9a', commit: 'aaaaaaa', commitAt: '2026-11-16T10:00:00.000Z', pushed: true, reportedAt: '2026-11-16T10:01:00.000Z' }],
    });
    assert.deepEqual(mac1.items[0], {
      space: 'user:me',
      kind: 'skill',
      name: 'make-my-intro',
      title: 'My intro',
      version: '1.0.0',
      devices: [{ device: 'me/mac-3f9a', version: '1.0.0' }],
      createdAt: '2026-11-16T10:01:00.000Z',
      updatedAt: '2026-11-16T10:01:00.000Z',
    });
    assert.equal(mac1.items[1].title, 'My tools');
  });

  it('says where each item stands: synced, behind or not sent', () => {
    const view1 = spaceView(mac1, 'me')!;
    assert.deepEqual(view1.items.map(i => [i.name, i.sync, i.upToDate]), [['make-my-intro', 'synced', 1], ['my-tools', 'synced', 1]]);
    // a hash is not a version a person would recognise
    assert.equal(view1.items[1].version, undefined);
    assert.equal(view1.repoUrl, 'https://github.com/me/mediamake-space');

    // a second computer joins at the same commit, then the first pushes 1.1.0
    const pc = after(mac1, report('windows-71c2', { commit: 'aaaaaaa', commitAt: '2026-11-16T10:00:00.000Z', items: [{ kind: 'skill', name: 'make-my-intro', version: '1.0.0' }] }), '2026-11-16T11:00:00.000Z');
    const mac2 = after(
      pc,
      report('mac-3f9a', { commit: 'bbbbbbb', commitAt: '2026-11-16T12:00:00.000Z', items: [{ kind: 'skill', name: 'make-my-intro', version: '1.1.0', title: 'My intro, better' }, { kind: 'mcp', name: 'my-tools', version: 'tree:0123456789ab', changed: true }] }),
      '2026-11-16T12:01:00.000Z',
    );
    const view = spaceView(mac2, 'me')!;
    assert.deepEqual(view.devices.map(d => [d.name, d.behind, d.mine]), [['Mac 3f9a', false, true], ['Windows PC 71c2', true, true]]);
    const skill = view.items.find(i => i.name === 'make-my-intro')!;
    assert.deepEqual([skill.version, skill.title, skill.sync, skill.upToDate], ['1.1.0', 'My intro, better', 'behind', 1]);
    assert.deepEqual(skill.behindOn.map(d => d.name), ['Windows PC 71c2']);
    const mcp = view.items.find(i => i.name === 'my-tools')!;
    assert.deepEqual([mcp.sync, mcp.unsentOn.map(d => d.name), mcp.behindOn.map(d => d.name)], ['unsent', ['Mac 3f9a'], ['Windows PC 71c2']]);

    // a report from the computer that is behind doesn't take the title or the version back
    const pcAgain = after(mac2, report('windows-71c2', { commit: 'aaaaaaa', commitAt: '2026-11-16T10:00:00.000Z', items: [{ kind: 'skill', name: 'make-my-intro', version: '1.0.0', title: 'My intro' }] }), '2026-11-16T13:00:00.000Z');
    const again = pcAgain.items.find(i => i.name === 'make-my-intro')!;
    assert.deepEqual([again.title, again.version], ['My intro, better', '1.1.0']);
    // and an item nothing changed for keeps its record as it was
    assert.equal(pcAgain.items.find(i => i.name === 'my-tools'), mac2.items.find(i => i.name === 'my-tools'));
  });

  it('removes an item no computer has, and starts again when another repo is connected', () => {
    const gone = applyReport(mac1, MINE, 'me', report('mac-3f9a', { items: [{ kind: 'mcp', name: 'my-tools' }] }), '2026-11-16T14:00:00.000Z');
    assert.deepEqual(gone.removed, ['skill/make-my-intro']);
    assert.deepEqual(gone.items.map(i => i.name), ['my-tools']);

    const pc = after(mac1, report('windows-71c2', { items: [{ kind: 'skill', name: 'make-my-intro', version: '1.0.0' }] }), '2026-11-16T11:00:00.000Z');
    const moved = applyReport(pc, MINE, 'me', report('mac-3f9a', { repo: 'me/other-space', items: [{ kind: 'app', name: 'my-board' }] }), '2026-11-16T16:00:00.000Z');
    assert.equal(moved.space.repo, 'me/other-space');
    assert.deepEqual(moved.space.devices.map(d => d.label), ['mac-3f9a']);
    assert.deepEqual(moved.items.map(i => i.name), ['my-board']);
    assert.deepEqual(moved.removed.sort(), ['mcp/my-tools', 'skill/make-my-intro']);
  });

  it('takes a computer off the space and off its items', () => {
    const both = after(mac1, report('windows-71c2', { items: [{ kind: 'skill', name: 'make-my-intro', version: '1.0.0' }] }), '2026-11-16T11:00:00.000Z');
    const change = dropDevice(both, MINE, 'me', 'mac-3f9a', '2026-11-16T12:00:00.000Z')!;
    assert.deepEqual(change.space.devices.map(d => d.label), ['windows-71c2']);
    assert.deepEqual(change.removed, ['mcp/my-tools']);
    assert.deepEqual(change.items[0].devices, [{ device: 'me/windows-71c2', version: '1.0.0' }]);
    assert.equal(dropDevice(both, MINE, 'me', 'nobody'), null);
    assert.equal(spaceView(empty, 'me'), null);
  });
});

describe('a project\'s space', () => {
  const id = projectSpaceId(PROJECT);
  const items = [{ kind: 'skill' as const, name: 'make-zone-intro', version: '0.2.0' }];
  const ann = after(empty, report('mac-3f9a', { repo: 'ann/mediamake-zone', project: PROJECT, commit: 'aaaaaaa', commitAt: '2026-11-16T10:00:00.000Z', items }), '2026-11-16T10:01:00.000Z', id, 'ann');
  // two members whose computers happen to carry the same label are still two computers
  const both = after(ann, report('mac-3f9a', { repo: 'ann/mediamake-zone', project: PROJECT, commit: 'aaaaaaa', commitAt: '2026-11-16T10:00:00.000Z', items }), '2026-11-16T11:00:00.000Z', id, 'bob');

  it('holds every member\'s computers, named for the person looking', () => {
    assert.equal(projectOf(id), PROJECT);
    assert.equal(projectOf(MINE), null);
    assert.deepEqual(both.space!.devices.map(d => d.key).sort(), ['ann/mac-3f9a', 'bob/mac-3f9a']);
    assert.equal(both.items[0].space, id);
    const view = spaceView(both, 'bob', { ann: 'Ann', bob: 'Bob' })!;
    assert.deepEqual(view.devices.map(d => d.name).sort(), ["Ann's Mac 3f9a", 'Mac 3f9a']);
    assert.deepEqual([view.items[0].sync, view.items[0].upToDate], ['synced', 2]);
  });

  it('shows whose computer is behind after someone pushes', () => {
    const pushed = after(both, report('mac-3f9a', { repo: 'ann/mediamake-zone', project: PROJECT, commit: 'bbbbbbb', commitAt: '2026-11-16T12:00:00.000Z', items: [{ ...items[0], version: '0.3.0' }] }), '2026-11-16T12:01:00.000Z', id, 'bob');
    const view = spaceView(pushed, 'bob', { ann: 'Ann' })!;
    assert.deepEqual([view.items[0].version, view.items[0].sync, view.items[0].behindOn.map(d => d.name)], ['0.3.0', 'behind', ["Ann's Mac 3f9a"]]);
    // one member leaving takes only their computer away
    const left = dropDevice(pushed, id, 'bob', 'mac-3f9a')!;
    assert.deepEqual(left.space.devices.map(d => d.key), ['ann/mac-3f9a']);
    assert.equal(left.items.length, 1);
  });
});

describe('deviceName', () => {
  it('reads a label as a person would', () => {
    assert.equal(deviceName('mac-3f9a'), 'Mac 3f9a');
    assert.equal(deviceName('linux-00ff', 'Asha'), "Asha's Linux PC 00ff");
    assert.equal(deviceName('computer'), 'computer');
  });
});
