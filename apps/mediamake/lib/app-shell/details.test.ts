import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LinkedItemView } from '../space/links';
import type { SpaceItemView, SpaceView } from '../space/space';
import type { MySpaces } from '../space/store';
import type { PlaceRecord } from '../space/register';
import type { RunRecord } from '../space/runs';
import { ago, detailsKey, runTiles, usedLine, viewerDetails } from './details';
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

const USED = new Map<string, Used>([
  ['skill/kids-intro', { at: '2026-11-17T09:00:00.000Z', count: 1, type: 'runs' }],
  ['skill/make-lyrics-video', { at: '2026-11-14T10:00:00.000Z', count: 12, type: 'runs' }],
]);

const PLACES: PlaceRecord[] = [
  { id: 'device:me/mac-3f9a', kind: 'device', clientId: 'me', label: 'mac-3f9a', name: 'Studio Mac', can: ['render', 'mcp:broken'], projects: [], reportedAt: '2026-11-17T08:00:00.000Z' },
  { id: 'device:me/mac-77aa', kind: 'device', clientId: 'me', label: 'mac-77aa', can: ['render', 'key:elevenlabs'], projects: [], reportedAt: '2026-11-17T08:00:00.000Z' },
  { id: 'cloud:me/kids', kind: 'cloud', clientId: 'me', label: 'kids', can: ['render'], projects: ['p1'], reportedAt: '2026-11-17T08:00:00.000Z' },
];

const run = (slug: string, skill: string, outputs: (string | undefined)[], more: Partial<RunRecord> = {}): RunRecord => ({
  project: 'p1',
  slug,
  rev: 1,
  skill,
  steps: outputs.map((output, i) => ({ step: `Step ${i + 1}`, needs: [], yes: false, repeat: false, state: 'done', ...(output && { output }) })) as RunRecord['steps'],
  state: 'done',
  startedBy: 'me',
  startedAt: '2026-11-16T10:00:00.000Z',
  updatedAt: '2026-11-16T12:00:00.000Z',
  ...more,
});
const RUNS = [
  run('intro-12', 'kids-intro', ['production v2', 'https://youtu.be/dQw4w9WgXcQ'], { title: 'Intro 12' }),
  run('intro-11', 'kids-intro', ['production v1'], { saved: { production: 1 } }),
  run('intro-10', 'kids-intro', ['https://cdn.example.com/a.mp4'], { state: 'cancelled' }),
  run('other', 'make-lyrics-video', ['https://cdn.example.com/poster.png', 'javascript:alert(1)']),
];

const STORE = [
  appItem('skill/make-lyrics-video', { version: '1.2.0', inRepo: true, installPrompt: 'Set up skill/make-lyrics-video from MediaMake', video: { youtubeId: 'abcdefghijk', title: 'The trailer', description: '' }, readyProof: [{ title: 'Nakama!', url: 'https://example.com/nakama' }] }),
  appItem('mcp/broken', { failed: true, healthNote: 'Its sign-in changed', tier: 'pro', page: '/mcps/broken' }),
  appItem('mcp/locked', { tier: 'pro', locked: true, opensWith: 'Pro', page: '/mcps/locked' }),
  appItem('app/editor', { page: '/apps/editor', open: '/editor' }),
];

const details = viewerDetails({
  items: STORE,
  mine: { ...MINE, installed: MINE.installed.map(entry => ({ ...entry, item: STORE.find(item => item.id === entry.item.id)! })) },
  spaces: SPACES,
  used: USED,
  places: PLACES,
  runs: RUNS,
  needs: new Map([['skill/make-lyrics-video', ['render', 'key:elevenlabs']]]),
  submissions: new Map([['skill/my-notes', 'Waiting for an admin to review it']]),
  viewer: { signedIn: true, isAdmin: false },
  now: NOW,
  days: 90,
});

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
  it('has one for every store item and everything of the member', () => {
    assert.deepEqual(Object.keys(details).sort(), [
      'catalog:app/editor',
      'catalog:mcp/broken',
      'catalog:mcp/locked',
      'catalog:skill/make-lyrics-video',
      `linked:${'a'.repeat(24)}`,
      `linked:${'b'.repeat(24)}`,
      'local:make-lyrics-video-like-nakama-2',
      'space:project:p1:skill/kids-intro',
      'space:user:me:skill/my-notes',
    ]);
  });

  it('gives a store item its link in the store, who it opens for and where it stands', () => {
    const lyrics = details[detailsKey.catalog('skill/make-lyrics-video')];
    assert.deepEqual(lyrics.status.map(status => status.label), ['Beta', 'Update out']);
    assert.equal(lyrics.used, 'Last used 3 days ago, 12 runs in the last 90 days.');
    assert.deepEqual(lyrics.store, { href: '/skills/make-lyrics-video', note: 'Open to everyone.' });
    assert.equal(lyrics.people, 'Everyone');
    assert.deepEqual(lyrics.belongs, [{ label: 'MediaMake' }]);
    assert.equal(lyrics.manage, undefined);

    const broken = details[detailsKey.catalog('mcp/broken')];
    assert.equal(broken.status[0].label, 'Failed');
    assert.match(broken.status[0].note!, /Its sign-in changed/);
    assert.equal(broken.used, 'Not used in the last 90 days.');
    assert.equal(broken.store.note, 'Opens with Pro and above.');
    assert.equal(broken.people, 'Pro members and above');
  });

  it('lets an admin edit the store listing, and nobody else', () => {
    const admin = viewerDetails({ items: STORE, viewer: { signedIn: true, isAdmin: true }, now: NOW });
    assert.deepEqual(admin[detailsKey.catalog('mcp/broken')].manage, { label: 'Edit store listing', href: '/app/releases/mcp/broken' });
  });

  it('says where a store item stands on each computer, and what a step would miss there', () => {
    const lyrics = details[detailsKey.catalog('skill/make-lyrics-video')];
    assert.deepEqual(
      lyrics.devices.map(device => [device.name, device.state, device.note]),
      [
        ['Mac 77aa', 'missing', 'Not on it.'],
        ['Studio Mac', 'older', 'Has an older copy (v1.1.0). Some steps need the ElevenLabs key.'],
      ],
    );
    // an MCP is on a computer when the register says so
    assert.deepEqual(
      details[detailsKey.catalog('mcp/broken')].devices.map(device => [device.name, device.state]),
      [
        ['Mac 77aa', 'missing'],
        ['Studio Mac', 'has'],
      ],
    );
  });

  it('copies one command for a computer with MediaMake and the setup too for a new one', () => {
    const lyrics = details[detailsKey.catalog('skill/make-lyrics-video')];
    assert.equal(lyrics.devices[0].command, 'mm update');
    assert.deepEqual(lyrics.install, { command: 'mm update', setup: 'Set up skill/make-lyrics-video from MediaMake' });
    assert.equal(details[detailsKey.catalog('mcp/broken')].install?.command, 'mm items install mcp/broken --yes');

    const intro = details[detailsKey.space('project:p1', 'skill/kids-intro')];
    assert.equal(intro.install?.command, 'mm space join p1');
    assert.match(intro.install!.setup, /^Set up MediaMake on this computer .* sign in with `mm login` .* run `mm space join p1`\.$/);
    // a computer that has the space syncs; one that doesn't joins
    assert.deepEqual(
      intro.devices.map(device => [device.name, device.command]),
      [
        ['Mac 3f9a', 'mm space sync'],
        ['Mac 77aa', 'mm space join p1'],
        ['kids', undefined],
      ],
    );
    assert.equal(details[detailsKey.space('user:me', 'skill/my-notes')].devices[0].command, 'mm space sync --yes');
  });

  it('has nothing to copy for a locked item or an app that runs in MediaMake', () => {
    const locked = details[detailsKey.catalog('mcp/locked')];
    assert.equal(locked.locked, 'Pro');
    assert.equal(locked.install, undefined);
    assert.deepEqual(locked.devices, []);
    const app = details[detailsKey.catalog('app/editor')];
    assert.equal(app.open, '/editor');
    assert.equal(app.install, undefined);
  });

  it('links a private item to what it belongs to and says who has it', () => {
    const notes = details[detailsKey.space('user:me', 'skill/my-notes')];
    assert.deepEqual(notes.belongs, [{ label: 'Your personal space', href: '/app/spaces/pp' }]);
    assert.equal(notes.people, 'Only you');
    assert.equal(notes.status[0].label, 'Not sent yet');
    assert.equal(notes.store.href, undefined);
    assert.deepEqual(notes.devices.map(device => device.state), ['unsent', 'missing']);

    const intro = details[detailsKey.space('project:p1', 'skill/kids-intro')];
    assert.deepEqual(intro.belongs, [{ label: 'Kids TV', href: '/app/spaces/p1' }]);
    assert.equal(intro.people, 'Everyone on Kids TV (3 people)');
    assert.equal(intro.used, 'Last used today, 1 run in the last 90 days.');
    // the project's cloud environment holds the space
    assert.deepEqual(intro.devices.at(-1), { key: 'cloud:me/kids', name: 'kids', cloud: true, state: 'has', note: 'Holds this space.' });

    const mine = details[detailsKey.linked('a'.repeat(24))];
    assert.deepEqual(mine.belongs, [{ label: 'You' }, { label: 'Kids TV', href: '/app/spaces/p1' }]);
    assert.equal(mine.people, 'You, and Kids TV');
    const theirs = details[detailsKey.linked('b'.repeat(24))];
    assert.equal(theirs.belongs[0].label, 'Ravi');
    assert.equal(theirs.people, 'Ravi shared it with you by name');
    assert.equal(theirs.manage, undefined);

    const variant = details[detailsKey.local('make-lyrics-video-like-nakama-2')];
    assert.deepEqual(variant.belongs, [{ label: 'You' }, { label: 'Variant of make-lyrics-video', href: '/skills/make-lyrics-video' }]);
    assert.equal(variant.status[0].label, 'Only on your computer');
    assert.match(variant.install!.command, /^mm space add make-lyrics-video-like-nakama-2 .*\nmm space sync/);
  });

  it('releases a private item with one line, or shows where its submission stands', () => {
    assert.equal(details[detailsKey.space('project:p1', 'skill/kids-intro')].manage?.copy, 'mm submit kids-intro');
    assert.deepEqual(details[detailsKey.space('user:me', 'skill/my-notes')].manage, { label: 'See its submission', href: '/app/subscription', note: 'Waiting for an admin to review it' });
  });

  it('shows what was made with it, the proof then what the projects made, and keeps the trailer apart', () => {
    const lyrics = details[detailsKey.catalog('skill/make-lyrics-video')];
    assert.deepEqual(
      lyrics.outputs.map(tile => [tile.kind, tile.title]),
      [
        ['link', 'Nakama!'],
        ['image', 'other'],
      ],
    );
    assert.deepEqual(lyrics.video, { youtubeId: 'abcdefghijk', title: 'The trailer' });
    const intro = details[detailsKey.space('project:p1', 'skill/kids-intro')];
    assert.deepEqual(
      intro.outputs.map(tile => [tile.kind, tile.title, tile.href]),
      [
        ['youtube', 'Intro 12', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
        ['link', 'intro-11', '/app/spaces/p1'],
      ],
    );
    assert.equal(intro.outputs[1].description, 'Saved in Kids TV');
  });

  it('never makes a link of a saved line that is not an https address', () => {
    assert.deepEqual(runTiles([run('x', 's', ['javascript:alert(1)', 'http://plain.example.com', 'out/video.mp4'])], 's'), []);
  });

  it('gives a signed-out visitor the store item with nothing of a member', () => {
    const out = viewerDetails({ items: STORE, viewer: { signedIn: false, isAdmin: false }, now: NOW })[detailsKey.catalog('skill/make-lyrics-video')];
    assert.equal(out.used, undefined);
    assert.deepEqual(out.devices, []);
    assert.equal(out.manage, undefined);
    assert.equal(out.install?.setup, 'Set up skill/make-lyrics-video from MediaMake');
  });

  it('says what an item depends on and what uses it, the other way round', () => {
    const items = [
      appItem('mcp/elevenlabs'),
      appItem('skill/make-lyrics-video', { uses: [{ id: 'mcp/elevenlabs', need: 'required', for: 'Timed words', without: 'No words' }] }),
      appItem('app/studio', { uses: [{ id: 'mcp/elevenlabs', need: 'optional', for: 'Voice takes', without: 'No voice' }] }),
    ];
    const details = viewerDetails({ items, now: NOW });
    assert.deepEqual(details[detailsKey.catalog('mcp/elevenlabs')].usedBy, [
      { kind: 'skill', name: 'make-lyrics-video', need: 'required', note: 'Timed words' },
      { kind: 'app', name: 'studio', need: 'optional', note: 'Voice takes' },
    ]);
    assert.deepEqual(details[detailsKey.catalog('app/studio')].depends, [{ kind: 'mcp', name: 'elevenlabs', need: 'optional', note: 'Voice takes' }]);
    assert.deepEqual(details[detailsKey.catalog('app/studio')].usedBy, []);
  });

  it('lets whoever can use an item add what they made with it, and an admin remove any', () => {
    const items = [appItem('skill/make-lyrics-video'), appItem('mcp/pro-only', { locked: true, opensWith: 'Pro', tier: 'pro' })];
    const member = viewerDetails({ items, mine: MINE, spaces: SPACES, viewer: { signedIn: true, isAdmin: false }, now: NOW });
    assert.equal(member[detailsKey.catalog('skill/make-lyrics-video')].canAddMade, true);
    assert.equal(member[detailsKey.catalog('skill/make-lyrics-video')].canRemoveMade, undefined);
    assert.equal(member[detailsKey.catalog('mcp/pro-only')].canAddMade, undefined);
    assert.equal(member[detailsKey.space('project:p1', 'skill/kids-intro')].canAddMade, true);
    assert.equal(member[detailsKey.local('make-lyrics-video-like-nakama-2')].canAddMade, undefined);
    assert.equal(viewerDetails({ items, viewer: { signedIn: true, isAdmin: true }, now: NOW })[detailsKey.catalog('skill/make-lyrics-video')].canRemoveMade, true);
    assert.equal(viewerDetails({ items, viewer: { signedIn: false, isAdmin: false }, now: NOW })[detailsKey.catalog('skill/make-lyrics-video')].canAddMade, undefined);
  });
});
