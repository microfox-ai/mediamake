/**
 * mm voice: which voice and settings a take is made with, where it goes, and the call it makes.
 * Run: node --experimental-strip-types --no-warnings=ExperimentalWarning --test scripts/voice.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { speak } from './elevenlabs.ts';
import { takeFile, voiceFrom } from './voice.ts';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-voice-'));
after(() => fs.rmSync(tmp, { recursive: true, force: true }));
const write = (file: string, text: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return file;
};

test("a brand's voices.json names the voice and its settings, and a flag wins over it", () => {
  const brand = write(path.join(tmp, 'brand', 'voices.json'), JSON.stringify({ show_voice: { name: 'The Professor', elevenlabs_voice_id: 'dUercWozs0yhe4xBCgZ0', model: 'eleven_v3', stability: 0.5, speed: 1.0, style: 0, speaker_boost: true, wpm_with_tags: 130 } }));
  assert.deepEqual(voiceFrom(brand, {}), { voice: 'dUercWozs0yhe4xBCgZ0', name: 'The Professor', model: 'eleven_v3', stability: 0.5, speed: 1, style: 0, boost: true });
  assert.deepEqual(voiceFrom(brand, { stability: '1', model: 'eleven_multilingual_v2', noBoost: true }), { voice: 'dUercWozs0yhe4xBCgZ0', name: 'The Professor', model: 'eleven_multilingual_v2', stability: 1, speed: 1, style: 0, boost: false });
  // the same keys at the top of a file, and a bare id with nothing set but the model
  const flat = write(path.join(tmp, 'flat.json'), JSON.stringify({ voice_id: 'lCfIptVKzlPoj4vLmTLz', speed: 0.95 }));
  assert.deepEqual(voiceFrom(flat, {}), { voice: 'lCfIptVKzlPoj4vLmTLz', model: 'eleven_v3', speed: 0.95 });
  assert.deepEqual(voiceFrom('lCfIptVKzlPoj4vLmTLz', {}), { voice: 'lCfIptVKzlPoj4vLmTLz', model: 'eleven_v3' });
  assert.throws(() => voiceFrom(write(path.join(tmp, 'none.json'), '{"runners_up":[]}'), {}), /names no voice/);
  assert.throws(() => voiceFrom('../etc/passwd', {}), /isn't an ElevenLabs voice id/);
  assert.throws(() => voiceFrom(path.join(tmp, 'missing.json'), {}), /can't be read as a voice/);
});

test('a take goes to the next file of the project, and never over one that is there', () => {
  const projects = path.join(tmp, 'projects');
  assert.throws(() => takeFile('doomcat-short-x', undefined, projects), /No project doomcat-short-x/);
  fs.mkdirSync(path.join(projects, 'doomcat-short-x'), { recursive: true });
  assert.equal(takeFile('doomcat-short-x', undefined, projects), path.join(projects, 'doomcat-short-x', 'input', 'vo', 'take-01.mp3'));
  write(path.join(projects, 'doomcat-short-x', 'input', 'vo', 'take-01.mp3'), 'x');
  write(path.join(projects, 'doomcat-short-x', 'input', 'vo', 'take-07.mp3'), 'x');
  write(path.join(projects, 'doomcat-short-x', 'input', 'vo', 'sections.json'), '{}');
  assert.equal(takeFile('doomcat-short-x', undefined, projects), path.join(projects, 'doomcat-short-x', 'input', 'vo', 'take-08.mp3'));
  const named = path.join(tmp, 'out', 'line-3.mp3');
  assert.equal(takeFile('doomcat-short-x', named, projects), named);
  assert.equal(takeFile(named, undefined, projects), named);
  write(named, 'x');
  assert.throws(() => takeFile(named, undefined, projects), /is there already: a take is never replaced/);
});

test('the call: the voice in the path, the key in a header, the settings by their API names', async () => {
  const seen: { url?: string; key?: string | string[]; body?: unknown }[] = [];
  let answer = 200;
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      seen.push({ url: req.url, key: req.headers['xi-api-key'], body: JSON.parse(Buffer.concat(chunks).toString()) });
      if (answer === 200) return res.writeHead(200, { 'Content-Type': 'audio/mpeg' }).end(Buffer.from([0x49, 0x44, 0x33, 1, 2]));
      res.writeHead(answer, { 'Content-Type': 'application/json' }).end(JSON.stringify({ detail: { status: 'bad', message: 'the voice was not found' } }));
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const api = `http://127.0.0.1:${(server.address() as { port: number }).port}/v1`;
  try {
    const audio = await speak('test-key', '[deadpan] Good evening.', { api, voice: 'dUercWozs0yhe4xBCgZ0', model: 'eleven_v3', stability: 0.5, speed: 1, style: 0, boost: true });
    assert.deepEqual([...audio], [0x49, 0x44, 0x33, 1, 2]);
    assert.deepEqual(seen[0], { url: '/v1/text-to-speech/dUercWozs0yhe4xBCgZ0?output_format=mp3_44100_128', key: 'test-key', body: { text: '[deadpan] Good evening.', model_id: 'eleven_v3', voice_settings: { stability: 0.5, style: 0, speed: 1, use_speaker_boost: true } } });
    // nothing set: the voice's own settings, so no voice_settings at all
    await speak('test-key', 'Hi.', { api, voice: 'lCfIptVKzlPoj4vLmTLz' });
    assert.deepEqual(seen[1].body, { text: 'Hi.', model_id: 'eleven_v3' });
    answer = 404;
    await assert.rejects(speak('test-key', 'Hi.', { api, voice: 'lCfIptVKzlPoj4vLmTLz' }), /ElevenLabs answered 404: the voice was not found/);
    answer = 401;
    await assert.rejects(speak('test-key', 'Hi.', { api, voice: 'lCfIptVKzlPoj4vLmTLz' }), /The key was refused: .*Text to Speech allowed/s);
  } finally {
    server.close();
  }
});
