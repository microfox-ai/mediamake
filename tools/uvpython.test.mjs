// Tests for tools/uvpython.mjs: the Python uv runs rembg's cutouts on, when uv names it, by path, or fetched.
// Run: node --test tools/
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findPython, managedPythons } from './uvpython.mjs';

const WIN_DIR = 'C:\\Users\\me\\AppData\\Roaming\\uv\\python';
const winFolder = [
  'cpython-3.11.18-windows-x86_64-none',
  'cpython-3.12-windows-x86_64-none', // the minor-version link
  'cpython-3.12.9-windows-x86_64-none',
  'cpython-3.12.16-windows-x86_64-none',
  'cpython-3.12.16+freethreaded-windows-x86_64-none',
  'cpython-3.15.2-windows-x86_64-none',
  '.lock',
];
const win = { platform: 'win32', arch: 'x64', list: () => winFolder, exists: () => true };

test('uvpython: the newest 3.12 patch folder, never the link or a free-threaded build', () => {
  assert.deepEqual(managedPythons(WIN_DIR, '3.12', win), [
    `${WIN_DIR}\\cpython-3.12.16-windows-x86_64-none\\python.exe`,
    `${WIN_DIR}\\cpython-3.12.9-windows-x86_64-none\\python.exe`,
  ]);
  assert.deepEqual(managedPythons(WIN_DIR, '3.13', win), []);
  // a folder whose interpreter is gone doesn't count
  const gone = f => !f.includes('3.12.16');
  assert.deepEqual(managedPythons(WIN_DIR, '3.12', { ...win, exists: gone }), [
    `${WIN_DIR}\\cpython-3.12.9-windows-x86_64-none\\python.exe`,
  ]);
  // no folder at all
  const none = () => {
    throw new Error('ENOENT');
  };
  assert.deepEqual(managedPythons(WIN_DIR, '3.12', { ...win, list: none }), []);
  assert.deepEqual(managedPythons('', '3.12', win), []);
});

test("uvpython: this machine's architecture first, bin/python3 off Windows", () => {
  const dir = '/Users/me/.local/share/uv/python';
  const mac = {
    platform: 'darwin',
    arch: 'arm64',
    exists: () => true,
    list: () => ['cpython-3.12.16-macos-x86_64-none', 'cpython-3.12.11-macos-aarch64-none'],
  };
  assert.deepEqual(managedPythons(dir, '3.12', mac), [
    `${dir}/cpython-3.12.11-macos-aarch64-none/bin/python3`,
    `${dir}/cpython-3.12.16-macos-x86_64-none/bin/python3`,
  ]);
});

/** A fake uv: answers by its first two words, and logs every call. */
const fakeUv = answers => {
  const calls = [];
  const run = args => {
    calls.push(args.join(' '));
    const a = answers[args.slice(0, 2).join(' ')];
    return typeof a === 'function' ? a() : (a ?? { status: 2, stdout: '' });
  };
  return { run, calls };
};
const PY = `${WIN_DIR}\\cpython-3.12.16-windows-x86_64-none\\python.exe`;

test('uvpython: what uv python find names comes first', () => {
  const { run, calls } = fakeUv({ 'python find': { status: 0, stdout: `${PY}\r\n` } });
  assert.deepEqual(findPython('3.12', { run, install: true, ...win }), { python: PY, how: 'found' });
  assert.deepEqual(calls, ['python find --system --no-project 3.12']);
});

test("uvpython: by path when uv can't follow its own 3.12 link, without installing again", () => {
  const { run, calls } = fakeUv({ 'python dir': { status: 0, stdout: `${WIN_DIR}\n` } });
  assert.deepEqual(findPython('3.12', { run, install: true, ...win }), { python: PY, how: 'path' });
  assert.ok(!calls.some(c => c.startsWith('python install')));
});

test('uvpython: fetched once when uv has none, then found (even when the install ends in the link error)', () => {
  let installed = false;
  const { run, calls } = fakeUv({
    'python dir': { status: 0, stdout: WIN_DIR },
    'python install': () => {
      installed = true;
      return { status: 2, stdout: '' };
    },
  });
  const o = { ...win, list: () => (installed ? winFolder : winFolder.filter(n => !n.startsWith('cpython-3.12'))) };
  assert.deepEqual(findPython('3.12', { run, ...o }), { python: '3.12', how: 'missing' });
  assert.ok(!calls.some(c => c.startsWith('python install')), 'no install unless asked');
  assert.deepEqual(findPython('3.12', { run, install: true, ...o }), { python: PY, how: 'installed' });
});

test("uvpython: the version itself when nothing works, so uv says why", () => {
  const { run } = fakeUv({});
  assert.deepEqual(findPython('3.12', { run, install: true, ...win }), { python: '3.12', how: 'missing' });
});
