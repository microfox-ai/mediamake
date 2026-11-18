import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cloudSetup, envLines, needLabel, placeName, setupText } from './cloud-setup';
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

test('all keys as .env lines: names only, nothing after the =', () => {
  const setup = cloudSetup({ space: { repo: 'ana/mediamake-doomcat', items: [{ kind: 'skill', name: 'doomcat', title: 'Doomcat', needs: ['key:elevenlabs', 'render'] }] } });
  assert.equal(envLines(setup), 'MEDIAMAKE_API_KEY=\nELEVENLABS_API_KEY=');
  // the environment's name is not a key: it comes filled in, last
  assert.equal(envLines(setup, 'doomcat-cloud'), 'MEDIAMAKE_API_KEY=\nELEVENLABS_API_KEY=\nMEDIAMAKE_PLACE=doomcat-cloud');
  assert.equal(placeName('ana/mediamake-doomcat'), 'doomcat-cloud');
  assert.equal(placeName('ana/Atomic_Rap.Space'), 'atomic-rap-space-cloud');
  assert.equal(placeName('ana/mediamake-space'), 'my-cloud');
  assert.equal(placeName(), 'my-cloud');
});

test('the whole setup as text: repositories, variables, network, the first line, what stays on a computer', () => {
  const setup = cloudSetup({
    space: {
      repo: 'ana/mediamake-doomcat',
      items: [
        { kind: 'skill', name: 'doomcat', title: 'Doomcat', needs: ['key:elevenlabs', 'render', 'browser:youtube/doomcat'] },
        { kind: 'skill', name: 'old', title: 'Old one' },
      ],
    },
    storage: 'files.blr1.example.com',
  });
  assert.equal(
    setupText(setup, { name: 'Doomcat', place: 'doomcat-cloud' }),
    [
      'Set up a Claude cloud environment for Doomcat (MediaMake)',
      '',
      '1. Add these repositories to the environment:',
      'microfox-ai/mediamake',
      'ana/mediamake-doomcat',
      '',
      "2. Set these as the environment's variables. Fill in each value there, never in a chat or a file:",
      `# MediaMake key: ${setup.keys[0].from}`,
      'MEDIAMAKE_API_KEY=',
      `# ElevenLabs key: ${setup.keys[1].from}`,
      'ELEVENLABS_API_KEY=',
      '# A name for this environment, any you like',
      'MEDIAMAKE_PLACE=doomcat-cloud',
      '# Old one: no run sheet yet, so a key may be missing from this list',
      '',
      '3. Network access: Full, or Limited with these domains allowed:',
      'mediamake.microfox.app',
      'api.elevenlabs.io',
      'files.blr1.example.com',
      '',
      "4. Start each session, or a routine's instructions, with this line:",
      'npm run mm -- cloud',
      '',
      'Stays on a computer (a cloud session stops at these steps and posts each as a to-do for a computer that has it):',
      'a browser signed in to youtube as doomcat (Doomcat)',
    ].join('\n'),
  );
  // every variable line ends at its = (or is the name): nothing that could be read as a value
  for (const line of setupText(setup).split('\n')) if (/^[A-Z0-9_]+=/.test(line)) assert.match(line, /^[A-Z0-9_]+=$/);
  // nothing reported yet: MediaMake alone, no computer part
  const empty = setupText(cloudSetup({ personal: true, space: null }), { name: 'your space' });
  assert.match(empty, /^Set up a Claude cloud environment for your space/);
  assert.ok(!empty.includes('Stays on a computer') && !empty.includes('MEDIAMAKE_PLACE'));
});
