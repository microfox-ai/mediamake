/**
 * The ElevenLabs key is found where the ElevenLabs MCP keeps it, in the order elevenlabs.ts gives.
 * Run: node --experimental-strip-types --no-warnings=ExperimentalWarning --test scripts/elevenlabs.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { desktopConfigFile, findElevenLabsKey } from './elevenlabs.ts';

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'elevenlabs-key-'));
const write = (file: string, v: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(v));
};
const server = (key: string) => ({ type: 'stdio', command: 'uvx', args: ['elevenlabs-mcp'], env: { ELEVENLABS_API_KEY: key } });
const find = (cwd = path.join(home, 'code', 'repo', 'app')) => findElevenLabsKey({ env: {}, home, platform: 'darwin', cwd });

test('no key anywhere', () => {
  assert.equal(find(), undefined);
});

test('Claude Desktop config', () => {
  write(desktopConfigFile(home, 'darwin', {}), { mcpServers: { elevenlabs: server('desktop-key') } });
  assert.equal(find()?.key, 'desktop-key');
});

test('Claude Code, added for a folder above this one, before Desktop', () => {
  write(path.join(home, '.claude.json'), { projects: { [path.join(home, 'code', 'repo')]: { mcpServers: { elevenlabs: server('local-key') } } } });
  assert.equal(find()?.key, 'local-key');
  assert.equal(find(path.join(home, 'elsewhere'))?.key, 'desktop-key');
});

test('Claude Code for all projects, under any name that runs elevenlabs-mcp', () => {
  write(path.join(home, '.claude.json'), { mcpServers: { voices: server('user-key'), other: { command: 'npx', env: { ELEVENLABS_API_KEY: 'not-it' } } } });
  const found = find();
  assert.equal(found?.key, 'user-key');
  assert.match(found!.from, /^~\/\.claude\.json \(the voices MCP, all projects\)$/);
});

test('an empty key does not count', () => {
  write(path.join(home, '.claude.json'), { mcpServers: { elevenlabs: server('  ') } });
  assert.equal(find()?.key, 'desktop-key');
});

test('the environment variable wins', () => {
  assert.equal(findElevenLabsKey({ env: { ELEVENLABS_API_KEY: 'env-key' }, home, platform: 'darwin' })?.key, 'env-key');
});

test.after(() => fs.rmSync(home, { recursive: true, force: true }));
