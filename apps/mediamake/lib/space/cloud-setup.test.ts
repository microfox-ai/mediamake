import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cloudSetup, needLabel } from './cloud-setup';
import { deviceOnly, keyInfo, needList } from './places';
import { applyReport, parseSpaceReport, spaceView, type SpaceReport } from './space';

test('a need is a known word, and a key is named by the variable that carries it', () => {
  assert.deepEqual(needList(['key:elevenlabs', 'key:elevenlabs', 'sk-live-1234', 'browser:youtube/atomic-rap', 7]), ['key:elevenlabs', 'browser:youtube/atomic-rap']);
  assert.deepEqual(needList('key:elevenlabs'), []);
  assert.deepEqual(['render', 'key:fal', 'mcp:elevenlabs', 'mcp:browse-hack', 'browser:midjourney', 'app:reaper', 'media:library'].filter(deviceOnly), ['mcp:browse-hack', 'browser:midjourney', 'app:reaper', 'media:library']);
  assert.equal(keyInfo('elevenlabs').env, 'ELEVENLABS_API_KEY');
  assert.equal(keyInfo('elevenlabs').host, 'api.elevenlabs.io');
  assert.deepEqual(keyInfo('open-weather'), { name: 'open-weather', env: 'OPEN_WEATHER_API_KEY', title: 'open-weather' });
  assert.deepEqual(keyInfo('constructor'), { name: 'constructor', env: 'CONSTRUCTOR_API_KEY', title: 'constructor' });
  assert.equal(needLabel('browser:youtube/atomic-rap'), 'a browser signed in to youtube as atomic-rap');
  assert.equal(needLabel('mcp:browse-hack'), 'the browse-hack MCP');
  assert.equal(needLabel('key:elevenlabs'), 'the ElevenLabs key');
});

test("a report carries each item's needs, and only the known words of them", () => {
  const report = parseSpaceReport({
    device: 'mac-1',
    repo: 'ana/mediamake-doomcat',
    items: [
      { kind: 'skill', name: 'doomcat', version: '1.0.0', needs: ['key:elevenlabs', 'render', 'mcp:browse-hack', 'browser:youtube', 'ELEVENLABS_API_KEY=sk-1'] },
      { kind: 'skill', name: 'plain', needs: [] },
      { kind: 'skill', name: 'old' },
    ],
  }) as SpaceReport;
  assert.deepEqual(report.items.map(item => item.needs), [['key:elevenlabs', 'render', 'mcp:browse-hack', 'browser:youtube'], [], undefined]);
  const first = applyReport({ space: null, items: [] }, 'project:p1', 'ana', report, '2026-11-18T00:00:00.000Z');
  const view = spaceView(first, 'ana')!;
  assert.deepEqual(view.items.map(item => [item.name, item.needs]), [['doomcat', ['key:elevenlabs', 'render', 'mcp:browse-hack', 'browser:youtube']], ['old', undefined], ['plain', []]]);
  // the computer furthest along says what it needs now: a run sheet written later fills it in
  const later = parseSpaceReport({ device: 'mac-1', repo: 'ana/mediamake-doomcat', items: [{ kind: 'skill', name: 'old', needs: ['key:fal'] }] }) as SpaceReport;
  const second = applyReport(first, 'project:p1', 'ana', later, '2026-11-18T01:00:00.000Z');
  assert.deepEqual(second.items.map(item => [item.name, item.needs]), [['old', ['key:fal']]]);
});

test('the cloud setup lists the repos to add, the keys to set and what stays on a device', () => {
  const setup = cloudSetup({
    space: {
      repo: 'ana/mediamake-doomcat',
      items: [
        { kind: 'skill', name: 'doomcat', title: 'Doomcat', needs: ['key:elevenlabs', 'render', 'mcp:browse-hack', 'browser:youtube/doomcat'] },
        { kind: 'skill', name: 'pack', title: 'Pack', needs: ['key:elevenlabs', 'key:open-weather'] },
        { kind: 'skill', name: 'old', title: 'Old one' },
        { kind: 'mcp', name: 'weather', title: 'Weather' },
      ],
    },
    linked: [{ repo: 'ben/mediamake-skill-grade', title: 'Grade', items: [{ kind: 'skill', name: 'grade', title: 'Grade', needs: ['key:mediamake', 'app:resolve'] }] }],
  });
  assert.deepEqual(setup.repos.map(r => [r.repo, r.url, r.why]), [
    ['microfox-ai/mediamake', 'https://github.com/microfox-ai/mediamake', 'MediaMake itself: the studio, mm and the renders'],
    ['ana/mediamake-doomcat', 'https://github.com/ana/mediamake-doomcat', "This space: the project's skills, MCPs and apps"],
    ['ben/mediamake-skill-grade', 'https://github.com/ben/mediamake-skill-grade', 'Linked: Grade'],
  ]);
  assert.deepEqual(setup.keys.map(k => [k.env, k.usedBy]), [
    ['MEDIAMAKE_API_KEY', ['Grade']],
    ['ELEVENLABS_API_KEY', ['Doomcat', 'Pack']],
    ['OPEN_WEATHER_API_KEY', ['Pack']],
  ]);
  assert.deepEqual(setup.hosts, ['mediamake.microfox.app', 'api.elevenlabs.io']);
  // with MediaMake's file storage, where a run saves and fetches: named once
  assert.deepEqual(cloudSetup({ space: null, storage: 'files.blr1.example.com' }).hosts, ['mediamake.microfox.app', 'files.blr1.example.com']);
  assert.deepEqual(cloudSetup({ space: null, storage: 'mediamake.microfox.app' }).hosts, ['mediamake.microfox.app']);
  assert.deepEqual(setup.device.map(d => [d.label, d.usedBy]), [
    ['the browse-hack MCP', ['Doomcat']],
    ['a browser signed in to youtube as doomcat', ['Doomcat']],
    ['the resolve app', ['Grade']],
  ]);
  // a skill with no run sheet is named: its keys aren't known; an MCP that doesn't say is left alone
  assert.deepEqual(setup.unknown, ['Old one']);

  // no repo yet: MediaMake itself and its key, nothing made up
  const empty = cloudSetup({ personal: true, space: null });
  assert.deepEqual(empty.repos.map(r => r.repo), ['microfox-ai/mediamake']);
  assert.deepEqual(empty.keys.map(k => k.env), ['MEDIAMAKE_API_KEY']);
  assert.equal(cloudSetup({ personal: true, space: { repo: 'ana/mediamake-space', items: [] } }).repos[1].why, 'Your space: your skills, MCPs and apps');
});
