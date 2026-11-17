import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LinkedItemView } from '../space/links';
import type { SpaceItemView, SpaceView } from '../space/space';
import type { MySpaces } from '../space/store';
import { ago, detailsKey, mineDetails, usedLine } from './details';
import type { AppItem, Mine, Used } from './member';

const NOW = Date.parse('2026-11-17T12:00:00.000Z');

const appItem = (id: string, more: Partial<AppItem> = {}): AppItem =>
  ({ id, kind: id.split('/')[0], title: id.split('/')[1], summary: `About ${id}`, tier: 'public', page: `/skills/${id.split('/')[1]}`, beta: true, failed: false, locked: false, ...more }) as AppItem;

const spaceItem = (name: string, more: Partial<SpaceItemView> = {}): SpaceItemView => ({ key: `skill/${name}`, kind: 'skill', name, title: name, sync: 'synced', unsentOn: [], behindOn: [], upToDate: 1, ...more });
const mac = { key: 'me/mac-3f9a', name: 'Mac 3f9a', mine: true, reportedAt: '2026-11-17T08:00:00.000Z', pushed: true, behind: false };
const space = (id: string, repo: string, items: SpaceItemView[]): SpaceView => ({ id, repo, repoUrl: `https://github.com/${repo}`, devices: [mac], items });

const MINE: Mine = {
  installed: [
    { item: appItem('skill/make-lyrics-video', { version: '1.2.0' }), on: [{ device: 'mac-3f9a', version: '1.1.0' }], updateAvailable: true, used: { at: '2026-11-14T10:00:00.000Z', count: 12, type: 'runs' } },
    { item: appItem('mcp/broken', { failed: true, healthNote: 'Its sign-in changed', tier: 'pro' }), installedAt: '2026-11-05T10:00:00.000Z', installedVersion: '0.1.0', on: [] },
  ],
  variants: [{ name: 'make-lyrics-video-like-nakama-2', variantOf: 'make-lyrics-video', on: [{ device: 'mac-3f9a' }] }],
  local: [],
  devices: [],
};

const linked = (more: Partial<LinkedItemView>): LinkedItemView => ({ id: 'a'.repeat(24), kind: 'skill', name: 'make-my-intro', title: 'Make my intro', repo: 'asha/mediamake-skill-make-my-intro', role: 'owner', owner: 'Asha', projects: [{ id: 'p1', name: 'Kids TV' }], space: null, ...more });

const SPACES: MySpaces = {
  mine: space('user:me', 'me/mediamake-space', [spaceItem('my-notes', { sync: 'unsent', unsentOn: [mac] })]),
  personalProjectId: 'pp',
  projects: [{ projectId: 'p1', name: 'Kids TV', role: 'editor', people: 3, space: space('project:p1', 'asha/kids-tv-space', [spaceItem('kids-intro')]) }],
  linked: [linked({}), linked({ id: 'b'.repeat(24), name: 'their-skill', role: 'user', owner: 'Ravi', direct: true })],
};

const USED = new Map<string, Used>([['skill/kids-intro', { at: '2026-11-17T09:00:00.000Z', count: 1, type: 'runs' }]]);
const details = mineDetails(MINE, SPACES, USED, NOW, 90);

describe('when something was used', () => {
  it('says it in days, then as a date', () => {
    assert.equal(ago('2026-11-17T01:00:00.000Z', NOW), 'today');
    assert.equal(ago('2026-11-16T10:00:00.000Z', NOW), 'yesterday');
    assert.equal(ago('2026-11-12T10:00:00.000Z', NOW), '5 days ago');
    assert.equal(ago('2026-09-01T10:00:00.000Z', NOW), 'on 1 Sept 2026'.replace('Sept', new Date('2026-09-01').toLocaleDateString('en-GB', { month: 'short' })));
    assert.equal(usedLine({ at: '2026-11-14T10:00:00.000Z', count: 1, type: 'opens' }, NOW), 'Used 3 days ago · 1 open');
    assert.equal(usedLine(undefined, NOW), 'Not used lately');
  });
});

describe("an item's details", () => {
  it('has one for everything Mine lists', () => {
    assert.deepEqual(Object.keys(details).sort(), [
      'catalog:mcp/broken',
      'catalog:skill/make-lyrics-video',
      `linked:${'a'.repeat(24)}`,
      `linked:${'b'.repeat(24)}`,
      'local:make-lyrics-video-like-nakama-2',
      'space:project:p1:skill/kids-intro',
      'space:user:me:skill/my-notes',
    ]);
  });

  it('says a store item is published, where it stands and where it is', () => {
    const lyrics = details[detailsKey.catalog('skill/make-lyrics-video')];
    assert.deepEqual(lyrics.status.map(status => status.label), ['Beta', 'Update out']);
    assert.equal(lyrics.used, 'Last used 3 days ago, 12 runs in the last 90 days.');
    assert.deepEqual(lyrics.stored, ['On Mac 3f9a (v1.1.0).']);
    assert.equal(lyrics.publish.command, undefined);
    const broken = details[detailsKey.catalog('mcp/broken')];
    assert.equal(broken.status[0].label, 'Failed');
    assert.match(broken.status[0].note!, /Its sign-in changed/);
    assert.equal(broken.used, 'Not used in the last 90 days.');
    assert.match(broken.belongs, /Opens with Pro and above/);
    assert.deepEqual(broken.stored, ['Installed 5 Nov 2026, version 0.1.0.']);
  });

  it('says whose a private item is, where it is kept and how to publish it', () => {
    const notes = details[detailsKey.space('user:me', 'skill/my-notes')];
    assert.equal(notes.belongs, 'Your personal space. Only you have it.');
    assert.equal(notes.status[0].label, 'Not sent yet');
    assert.deepEqual(notes.stored, ['In the private GitHub repo me/mediamake-space.', 'On Mac 3f9a.']);
    assert.equal(notes.publish.command, 'mm submit my-notes');
    assert.deepEqual(notes.links.map(link => link.href), ['/app/spaces/pp', 'https://github.com/me/mediamake-space']);

    const intro = details[detailsKey.space('project:p1', 'skill/kids-intro')];
    assert.equal(intro.belongs, 'The Kids TV project. Everyone on it has it.');
    assert.equal(intro.used, 'Last used today, 1 run in the last 90 days.');

    assert.equal(details[detailsKey.linked('a'.repeat(24))].belongs, 'You. Shared with Kids TV.');
    const theirs = details[detailsKey.linked('b'.repeat(24))];
    assert.equal(theirs.belongs, 'Ravi. Shared with you by name.');
    assert.deepEqual(theirs.publish, { text: 'Only its owner, Ravi, can publish it.' });

    const variant = details[detailsKey.local('make-lyrics-video-like-nakama-2')];
    assert.equal(variant.belongs, 'You. It is your variant of make-lyrics-video.');
    assert.equal(variant.status[0].label, 'Only on your computer');
  });
});
