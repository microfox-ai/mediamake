// Tests for the words of a run sheet (tools/places.mjs) and the run sheet a skill writes (skills.mjs runSheet).
// Run: node --test tools/
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { deviceOnly, has, keyEnv, missing, needList, parseNeeds, runsOf } from './places.mjs';
import { runSheet } from './skills.mjs';

test('a need is one of the known words, and only some exist on a device alone', () => {
  assert.deepEqual(parseNeeds('`mcp:browse-hack`, `browser:youtube/atomic-rap` and key:elevenlabs'), { needs: ['mcp:browse-hack', 'browser:youtube/atomic-rap', 'key:elevenlabs'], bad: [] });
  for (const none of ['', '-', 'nothing', 'None']) assert.deepEqual(parseNeeds(none), { needs: [], bad: [] });
  assert.deepEqual(parseNeeds('render, a mac, key:ELEVEN').bad, ['a mac', 'key:ELEVEN']);
  assert.deepEqual(['render', 'key:fal', 'mcp:elevenlabs', 'mcp:browse-hack', 'browser:midjourney', 'app:reaper', 'media:library'].filter(deviceOnly), ['mcp:browse-hack', 'browser:midjourney', 'app:reaper', 'media:library']);
});

test('a key is carried by its environment variable, and a list of needs keeps only the known words', () => {
  assert.equal(keyEnv('elevenlabs'), 'ELEVENLABS_API_KEY');
  assert.equal(keyEnv('mediamake'), 'MEDIAMAKE_API_KEY');
  assert.equal(keyEnv('open-weather.v2'), 'OPEN_WEATHER_V2_API_KEY');
  assert.deepEqual(needList(['key:fal', 'key:fal', 'a mac', 7, 'browser:youtube/atomic-rap']), ['key:fal', 'browser:youtube/atomic-rap']);
  assert.deepEqual(needList('key:fal'), []);
});

test('a place can run a step when it has every need; a sign-in as an account covers the site', () => {
  const mac = ['render', 'mcp:browse-hack', 'browser:youtube/atomic-rap', 'key:elevenlabs'];
  assert.ok(has(mac, 'browser:youtube'));
  assert.ok(!has(mac, 'browser:youtube/another-channel'));
  assert.deepEqual(missing(mac, ['render', 'browser:youtube', 'browser:midjourney']), ['browser:midjourney']);
  assert.deepEqual(missing(['render', 'key:elevenlabs'], ['mcp:browse-hack', 'browser:youtube']), ['mcp:browse-hack', 'browser:youtube']);
});

test('a run sheet gives the steps in order, and says in one word where the skill runs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-sheet-'));
  const file = path.join(dir, 'SKILL.md');
  const sheet = rows => `# x\n\n\`\`\`\n| Step | Needs | A person's yes | Safe to repeat | Without it |\n|---|---|---|---|---|\n| An example | a mac | maybe | no | - |\n\`\`\`\n\n## Where it runs\n\n| Step | Needs | A person's yes | Safe to repeat | Without it |\n|---|---|---|---|---|\n${rows.join('\n')}\n\nAfter.\n`;
  fs.writeFileSync(
    file,
    sheet([
      '| 1. Write the short | nothing | no | yes | - |',
      '| 2. Voice it | `key:elevenlabs` | no | yes | a to-do for a place with the key |',
      '| 3. Render | `render` | no | yes | runs anywhere |',
      '| 4. Upload to YouTube | `mcp:browse-hack`, `browser:youtube` | no | no | a to-do: upload the release |',
    ]),
  );
  const { steps, errors, found } = runSheet(file);
  assert.ok(found);
  assert.deepEqual(errors, []);
  assert.deepEqual(steps, [
    { step: 'Write the short', needs: [], yes: false, repeat: true },
    { step: 'Voice it', needs: ['key:elevenlabs'], yes: false, repeat: true, without: 'a to-do for a place with the key' },
    { step: 'Render', needs: ['render'], yes: false, repeat: true, without: 'runs anywhere' },
    { step: 'Upload to YouTube', needs: ['mcp:browse-hack', 'browser:youtube'], yes: false, repeat: false, without: 'a to-do: upload the release' },
  ]);
  assert.equal(runsOf(steps), 'mixed');
  assert.equal(runsOf(steps.slice(0, 3)), 'anywhere');
  assert.equal(runsOf(steps.slice(3)), 'device');

  // what is wrong is said by line, and a skill with no table has no sheet
  fs.writeFileSync(file, sheet(['| Render | a fast mac | no | yes | - |', '| Upload | `browser:youtube` | sure | no | a to-do |', '| Pack | `key:fal` | no | yes | - |', '| Too | few |', '| Voice | nothing | no | yes | - |', '| Voice | nothing | no | yes | - |']));
  assert.deepEqual(
    runSheet(file).errors.map(e => e.replace(/^SKILL\.md:\d+: /, '').slice(0, 34)),
    ['"a fast mac" isn\'t a need: render,', '"A person\'s yes" and "Safe to repe', 'say what happens when no place has', 'a run sheet row has 5 cells (Step ', 'the step "Voice" is in the run she'],
  );
  fs.writeFileSync(file, '# x\n\nSteps.\n');
  assert.deepEqual(runSheet(file), { steps: [], errors: [], found: false });
});
