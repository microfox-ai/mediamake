#!/usr/bin/env node
/**
 * family: the kinetic type family as it is on this computer, found at run time.
 *
 * A member is a skill whose README.md says `superset: make-kinetictype` in its frontmatter. A style is
 * `make-kinetictype-<variant>`; a like skill (`make-kinetictype-like-<example>`) is pinned to one example
 * video and names its style in its SKILL.md's `depends-on`.
 *
 * Usage: node <this skill>/scripts/family.mjs [--json]
 *
 * Run from the MediaMake checkout it asks the registry (`node tools/skills.mjs list --json`: the repo's
 * skills and yours). Everywhere it also reads the skills Claude loads (~/.claude/skills, and
 * .claude/skills in the folder it runs from) and the ones beside this skill.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SUPERSET = 'make-kinetictype';
const here = path.dirname(fs.realpathSync(fileURLToPath(import.meta.url)));

/** One level of `key: value` lines from a file's frontmatter (and its `metadata:` block). */
const front = file => {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    return {};
  }
  const out = {};
  for (const line of (text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '').split('\n')) {
    const m = line.match(/^\s*([a-zA-Z_-]+):\s*(.+)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
};

/** Skill folders by name; the first place a name is found wins. */
const found = new Map();
const add = (name, dir, where) => {
  if (found.has(name) || !fs.existsSync(path.join(dir, 'SKILL.md'))) return;
  found.set(name, { dir, where });
};
const scan = (dir, where) => {
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names.sort()) add(name, path.join(dir, name), where);
};

// in the checkout: the registry's own list
const registry = path.join(process.cwd(), 'tools', 'skills.mjs');
if (fs.existsSync(registry)) {
  try {
    const listed = JSON.parse(spawnSync(process.execPath, [registry, 'list', '--json'], { encoding: 'utf8', maxBuffer: 1 << 26 }).stdout || '[]');
    for (const s of Array.isArray(listed) ? listed : []) if (s?.name && s?.dir) add(s.name, path.resolve(s.dir), s.own ? 'yours' : 'the repo');
  } catch {
    // no list: the folders below
  }
}
scan(path.join(os.homedir(), '.claude', 'skills'), 'yours');
scan(path.join(process.cwd(), '.claude', 'skills'), 'this folder');
scan(path.resolve(here, '..', '..'), 'beside this skill');

const members = [];
for (const [name, { dir, where }] of found) {
  const readme = front(path.join(dir, 'README.md'));
  if (readme.superset !== SUPERSET || name === SUPERSET) continue;
  const needs = (front(path.join(dir, 'SKILL.md'))['depends-on'] ?? '').split(',').map(d => d.trim()).filter(Boolean);
  members.push({ name, kind: /-like-/.test(name) ? 'like' : 'style', about: readme.description ?? '', needs, where });
}
const styles = members.filter(m => m.kind === 'style').sort((a, b) => a.name.localeCompare(b.name));
const likes = members.filter(m => m.kind === 'like').sort((a, b) => a.name.localeCompare(b.name));
for (const like of likes) like.style = like.needs.find(n => styles.some(s => s.name === n));
// each style, then the like skills pinned to it; a like skill whose style isn't here comes last
const family = [...styles.flatMap(s => [s, ...likes.filter(l => l.style === s.name)]), ...likes.filter(l => !l.style)];

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(family.map(({ needs, ...m }) => m), null, 2));
} else if (!family.length) {
  console.log(`No skill here says \`superset: ${SUPERSET}\` in its README.md: the family has no styles on this computer.`);
} else {
  for (const m of family) {
    const pad = m.kind === 'like' ? '  ' : '';
    console.log(`${pad}${m.kind === 'like' ? `like   ${m.name}  (pinned to one example of ${m.style ?? 'a style that is not here'})` : `style  ${m.name}`}  [${m.where}]`);
    console.log(`${pad}       ${m.about || '(its README has no description)'}`);
  }
}
