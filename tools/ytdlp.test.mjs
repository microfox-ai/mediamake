// Tests for tools/ytdlp.mjs: finding yt-dlp, its age, and how it is installed and updated on each OS.
// Run: node --test tools/
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ageDays,
  envWith,
  findYtdlp,
  installPlan,
  managerOf,
  updatePlan,
} from './ytdlp.mjs';

test('yt-dlp: its version as days old', () => {
  const now = Date.UTC(2026, 10, 21);
  assert.equal(ageDays('2026.10.26', now), 26);
  assert.equal(ageDays('2026.11.21', now), 0);
  // a nightly
  assert.equal(ageDays('2026.11.20.234501', now), 1);
  assert.equal(ageDays('2026.10.26\r\n', now), 26);
  for (const v of [null, '', 'unknown', '1.0']) assert.equal(ageDays(v, now), null);
});

test('yt-dlp: on the PATH first, then where installers put it', () => {
  const have = new Set();
  const exists = f => have.has(f);
  const win = {
    platform: 'win32',
    home: 'C:\\Users\\me',
    env: { Path: 'C:\\Windows;C:\\tools', LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' },
    exists,
  };
  assert.equal(findYtdlp(win), null);
  // winget's link, before the shell's PATH has it
  const link = 'C:\\Users\\me\\AppData\\Local\\Microsoft\\WinGet\\Links\\yt-dlp.exe';
  have.add(link);
  assert.deepEqual(findYtdlp(win), { bin: link, onPath: false });
  // one on the PATH wins
  have.add('C:\\tools\\yt-dlp.exe');
  assert.deepEqual(findYtdlp(win), { bin: 'C:\\tools\\yt-dlp.exe', onPath: true });

  const mac = { platform: 'darwin', home: '/Users/me', env: { PATH: '/usr/bin:/bin' }, exists };
  assert.equal(findYtdlp(mac), null);
  have.add('/opt/homebrew/bin/yt-dlp');
  assert.deepEqual(findYtdlp(mac), { bin: '/opt/homebrew/bin/yt-dlp', onPath: false });
  have.add('/Users/me/.local/bin/yt-dlp');
  assert.deepEqual(findYtdlp({ ...mac, env: { PATH: '/Users/me/.local/bin:/usr/bin' } }), {
    bin: '/Users/me/.local/bin/yt-dlp',
    onPath: true,
  });
});

test("yt-dlp: a copy off the PATH runs with its folder put first on the PATH", () => {
  const env = { Path: 'C:\\Windows', HOME: 'x' };
  const found = { bin: 'C:\\Links\\yt-dlp.exe', onPath: false };
  assert.deepEqual(envWith(found, env, 'win32'), { Path: 'C:\\Links;C:\\Windows', HOME: 'x' });
  assert.equal(envWith({ ...found, onPath: true }, env, 'win32'), env);
  assert.deepEqual(envWith({ bin: '/opt/homebrew/bin/yt-dlp', onPath: false }, { PATH: '/bin' }, 'darwin'), {
    PATH: '/opt/homebrew/bin:/bin',
  });
});

test('yt-dlp: who installed it, from where it is', () => {
  assert.equal(managerOf('/opt/homebrew/bin/yt-dlp', { real: '/opt/homebrew/Cellar/yt-dlp/2026.10.26/bin/yt-dlp' }), 'brew');
  assert.equal(managerOf('/usr/local/bin/yt-dlp', { real: '/usr/local/Cellar/yt-dlp/2026.10.26/libexec/bin/yt-dlp' }), 'brew');
  assert.equal(managerOf('/usr/local/bin/yt-dlp'), 'standalone');
  assert.equal(managerOf('C:\\Users\\me\\AppData\\Local\\Microsoft\\WinGet\\Links\\yt-dlp.exe'), 'winget');
  assert.equal(managerOf('/Users/me/.local/bin/yt-dlp', { real: '/Users/me/.local/share/uv/tools/yt-dlp/bin/yt-dlp' }), 'uv');
  assert.equal(managerOf('/Users/me/.local/bin/yt-dlp', { real: '/Users/me/.local/pipx/venvs/yt-dlp/bin/yt-dlp' }), 'pipx');
  // Windows: uv and pipx both copy an .exe into ~/.local/bin
  assert.equal(managerOf('C:\\Users\\me\\.local\\bin\\yt-dlp.exe', { uvTool: () => true }), 'uv');
  assert.equal(managerOf('C:\\Users\\me\\.local\\bin\\yt-dlp.exe', { uvTool: () => false }), 'standalone');
  assert.equal(managerOf('C:\\Users\\me\\scoop\\shims\\yt-dlp.exe'), 'scoop');
  assert.equal(managerOf('C:\\ProgramData\\chocolatey\\bin\\yt-dlp.exe'), 'choco');
  assert.equal(managerOf('C:\\bin\\yt-dlp.exe'), 'standalone');
});

test('yt-dlp: updated the way it was installed', () => {
  assert.equal(updatePlan('brew').what, 'brew upgrade yt-dlp');
  assert.equal(updatePlan('winget').what, 'winget upgrade --id yt-dlp.yt-dlp -e --source winget');
  assert.equal(updatePlan('uv').what, 'uv tool upgrade yt-dlp');
  assert.equal(updatePlan('pipx').what, 'pipx upgrade yt-dlp');
  assert.equal(updatePlan('scoop').what, 'scoop update yt-dlp');
  assert.equal(updatePlan('choco'), null);
  assert.deepEqual(updatePlan('standalone', 'C:\\bin\\yt-dlp.exe'), {
    what: 'yt-dlp -U',
    cmd: 'C:\\bin\\yt-dlp.exe',
    args: ['-U'],
  });
});

test('yt-dlp: installed with Homebrew on a Mac, winget on Windows, else uv', () => {
  const has = (...cmds) => c => cmds.includes(c);
  assert.equal(installPlan({ platform: 'darwin', has: has('brew', 'uv') }).what, 'brew install yt-dlp');
  assert.equal(installPlan({ platform: 'darwin', has: has('uv') }).what, 'uv tool install yt-dlp[default]');
  // winget's own ffmpeg and Deno only when there is no ffmpeg yet
  assert.equal(
    installPlan({ platform: 'win32', has: has('winget', 'uv') }).what,
    'winget install --id yt-dlp.yt-dlp -e --source winget',
  );
  assert.equal(
    installPlan({ platform: 'win32', has: has('winget'), ffmpeg: true }).what,
    'winget install --id yt-dlp.yt-dlp -e --source winget --skip-dependencies',
  );
  assert.equal(installPlan({ platform: 'win32', has: has('uv') }).what, 'uv tool install yt-dlp[default]');
  assert.equal(installPlan({ platform: 'linux', has: has('brew', 'uv') }).what, 'uv tool install yt-dlp[default]');
  assert.equal(installPlan({ platform: 'darwin', has: has() }), null);
});
