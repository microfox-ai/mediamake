import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accessView, applyPlaceAction, applyPlaceReport, parsePlaceAction, parsePlaceReport, placeHas, type PlaceRecord, type PlaceReport } from './register';

const P1 = 'a'.repeat(24);
const P2 = 'b'.repeat(24);
const NOW = '2026-11-18T00:00:00.000Z';

test('a report keeps the known words, a limit only beside a key it has, and never a secret', () => {
  const mac = parsePlaceReport({
    kind: 'device',
    device: 'mac-3f9a',
    name: '  Studio   Mac ',
    can: ['render', 'key:elevenlabs', 'mcp:browse-hack', 'browser:youtube/doomcat', 'ELEVENLABS_API_KEY=sk-1', 7, 'render'],
    limits: { elevenlabs: 'unlimited', fal: '$5 a day', 'bad key': 'x' },
    repos: ['ana/mediamake-doomcat'],
  }) as PlaceReport;
  assert.deepEqual(mac, { kind: 'device', label: 'mac-3f9a', name: 'Studio Mac', can: ['render', 'key:elevenlabs', 'mcp:browse-hack', 'browser:youtube/doomcat'], limits: { elevenlabs: 'unlimited' } });
  // a cloud environment never has what only a device has, and it names its repos
  const cloud = parsePlaceReport({ kind: 'cloud', device: 'Shorts <env>', can: ['render', 'key:elevenlabs', 'browser:youtube', 'mcp:browse-hack', 'media:library'], repos: ['ana/mediamake-doomcat', 'https://token@github.com/x/y', 'ana/mediamake-doomcat'] }) as PlaceReport;
  assert.deepEqual(cloud, { kind: 'cloud', label: 'Shorts env', can: ['render', 'key:elevenlabs'], repos: ['ana/mediamake-doomcat'] });
  assert.ok('error' in parsePlaceReport({ kind: 'phone', can: [] }));
  assert.ok('error' in parsePlaceReport({ kind: 'device', device: 'mac-1' }));
});

test('a computer is closed until its owner opens it, and only its owner changes it', () => {
  const report = parsePlaceReport({ kind: 'device', device: 'mac-3f9a', can: ['render'] }) as PlaceReport;
  const first = applyPlaceReport(null, 'ana', report, [P2], NOW);
  assert.deepEqual(first, { id: 'device:ana/mac-3f9a', kind: 'device', clientId: 'ana', label: 'mac-3f9a', can: ['render'], projects: [], reportedAt: NOW });

  const ask = (body: unknown) => parsePlaceAction(body) as Exclude<ReturnType<typeof parsePlaceAction>, { error: string } | { action: 'forget' }>;
  assert.deepEqual(applyPlaceAction(first, 'ben', ask({ action: 'open', place: first.id, project: P1 })), { error: 'Only its owner changes a place' });
  const open = applyPlaceAction(first, 'ana', ask({ action: 'open', place: first.id, project: P1 })) as PlaceRecord;
  assert.deepEqual(open.projects, [P1]);
  const busy = applyPlaceAction(open, 'ana', ask({ action: 'busy', place: first.id })) as PlaceRecord;
  const named = applyPlaceAction(busy, 'ana', ask({ action: 'name', place: first.id, name: 'Studio Mac' })) as PlaceRecord;
  // its next report replaces what it can do, and keeps the name, the projects and busy
  const again = applyPlaceReport(named, 'ana', parsePlaceReport({ kind: 'device', device: 'mac-3f9a', can: ['render', 'key:fal'] }) as PlaceReport, [], '2026-11-18T01:00:00.000Z');
  assert.deepEqual(again, { id: first.id, kind: 'device', clientId: 'ana', label: 'mac-3f9a', name: 'Studio Mac', can: ['render', 'key:fal'], projects: [P1], busy: true, reportedAt: '2026-11-18T01:00:00.000Z' });
  const free = applyPlaceAction(again, 'ana', ask({ action: 'free', place: first.id })) as PlaceRecord;
  assert.equal(free.busy, undefined);
  assert.deepEqual((applyPlaceAction(free, 'ana', ask({ action: 'close', place: first.id, project: P1 })) as PlaceRecord).projects, []);

  // a cloud environment follows the projects whose space it holds: nobody opens or closes it
  const cloud = applyPlaceReport(null, 'ana', parsePlaceReport({ kind: 'cloud', device: 'cloud', can: ['render'], repos: ['ana/mediamake-doomcat'] }) as PlaceReport, [P1, P1], NOW);
  assert.deepEqual(cloud.projects, [P1]);
  assert.ok('error' in (applyPlaceAction(cloud, 'ana', ask({ action: 'open', place: cloud.id, project: P2 })) as { error: string }));

  for (const bad of [{ action: 'open', place: first.id }, { action: 'open', place: 'x', project: P1 }, { action: 'explode', place: first.id }, { action: 'name', place: first.id, name: ' ' }]) assert.ok('error' in parsePlaceAction(bad), JSON.stringify(bad));
});

test("a project's register shows its cloud environments, the computers open to it and the viewer's own", () => {
  const place = (more: Partial<PlaceRecord> & Pick<PlaceRecord, 'id' | 'clientId' | 'label'>): PlaceRecord => ({ kind: 'device', can: [], projects: [], reportedAt: NOW, ...more });
  const places = [
    place({ id: 'device:ana/mac-3f9a', clientId: 'ana', label: 'mac-3f9a', name: 'Studio Mac', can: ['render', 'mcp:browse-hack', 'browser:youtube/doomcat', 'key:elevenlabs'], limits: { elevenlabs: 'unlimited' }, projects: [P1] }),
    place({ id: 'device:ana/mac-0001', clientId: 'ana', label: 'mac-0001', can: ['render'] }),
    place({ id: 'device:ben/mac-7777', clientId: 'ben', label: 'mac-7777', can: ['render', 'browser:midjourney'], projects: [P1], busy: true }),
    place({ id: 'device:ben/mac-8888', clientId: 'ben', label: 'mac-8888', can: ['render', 'app:reaper'] }),
    place({ id: 'device:cy/mac-9999', clientId: 'cy', label: 'mac-9999', can: ['render'], projects: [P2] }),
    place({ id: 'cloud:ana/cloud', kind: 'cloud', clientId: 'ana', label: 'cloud', can: ['render', 'key:elevenlabs'], projects: [P1], repos: ['ana/mediamake-doomcat'] }),
  ];
  const items = [
    { kind: 'skill', name: 'doomcat', title: 'Doomcat', needs: ['key:elevenlabs', 'render', 'mcp:browse-hack', 'browser:youtube'] },
    { kind: 'skill', name: 'art', title: 'Art', needs: ['browser:midjourney', 'app:blender'] },
    { kind: 'skill', name: 'old', title: 'Old one' },
  ];
  const view = accessView({ project: P1, me: 'ana', places, items, names: { ben: 'Ben' }, admins: ['Ana'] });
  assert.deepEqual(view.places.map(p => [p.name, p.status, p.mine]), [
    ['Cloud environment', 'open', true],
    ['Studio Mac', 'open', true],
    ["Ben's Mac 7777", 'busy', false],
    ['Mac 0001', 'closed', true],
  ]);
  assert.deepEqual(view.places[1].can.find(c => c.need === 'key:elevenlabs'), { need: 'key:elevenlabs', label: 'the ElevenLabs key', limit: 'unlimited' });
  // each need with the places that can run it now: a busy or closed computer doesn't count
  assert.deepEqual(view.needs.map(n => [n.need, n.device, n.places]), [
    ['key:elevenlabs', false, ['Cloud environment', 'Studio Mac']],
    ['render', false, ['Cloud environment', 'Studio Mac']],
    ['mcp:browse-hack', true, ['Studio Mac']],
    ['browser:youtube', true, ['Studio Mac']],
    ['browser:midjourney', true, []],
    ['app:blender', true, []],
  ]);
  assert.deepEqual(view.unknown, ['Old one']);
  assert.deepEqual(view.admins, ['Ana']);
  // Ben sees his own closed computer, never Ana's
  assert.deepEqual(accessView({ project: P1, me: 'ben', places, items: [], names: { ana: 'Ana' } }).places.map(p => p.name), ['Cloud environment', 'Studio Mac', 'Mac 7777', 'Mac 8888']);
  assert.ok(placeHas(['browser:youtube/doomcat'], 'browser:youtube'));
  assert.ok(!placeHas(['browser:youtube/doomcat'], 'browser:youtube/other'));
});
