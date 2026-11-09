#!/usr/bin/env node
/**
 * guard-rails: a Claude Code PreToolUse hook (committed in .claude/settings.json) that keeps main a
 * clean copy of GitHub, so `git pull --ff-only` never stops on a session's edits.
 *
 * On a protected branch (main), it stops:
 *   - Edit, Write, MultiEdit and NotebookEdit on any file git would track (a framework file), with
 *     where the change belongs instead. Files git ignores are your work and are never stopped.
 *   - `git commit` (commits belong on a branch).
 *   - npm commands that rewrite package-lock.json (install with or without names, update, uninstall,
 *     dedupe, prune, audit fix, version…): the lockfile changes only in a PR that changes
 *     dependencies, and `npm ci` installs without touching it. Global installs, --no-save and
 *     --dry-run go ahead, and so does a folder git ignores (a project of the user's).
 * On any branch, it stops `git clean` with -x or -X, which deletes the ignored files: your projects,
 * renders and brand kits.
 *
 * The paths, protected branches and hints live in one place, tools/guard-rails.json, read from the
 * checkout the file is in. A repo without that file (another repo, an older checkout) is left alone,
 * and so is a worktree on another branch. MEDIAMAKE_GUARD=off in the environment turns it off.
 *
 * It never gets in the way on its own failure: input it can't read, no git, or a git error, and it
 * allows the call. It prints a deny decision as JSON, or nothing, and always exits 0.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const RULES_FILE = 'tools/guard-rails.json';
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

/** git's own variables would point every call at one repo; the guard asks each path's own. */
const gitEnv = () => {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C' };
  for (const k of [
    'GIT_DIR',
    'GIT_WORK_TREE',
    'GIT_INDEX_FILE',
    'GIT_PREFIX',
    'GIT_COMMON_DIR',
  ])
    delete env[k];
  return env;
};

/** Runs git in cwd: { code, out, err } (out trimmed unless raw), code -1 when git can't run at all. */
export function git(args, cwd, { timeout = 10000, raw = false } = {}) {
  try {
    const out = execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: gitEnv(),
      timeout,
      maxBuffer: 32 * 1024 * 1024,
    });
    return { code: 0, out: raw ? out : out.trim() };
  } catch (e) {
    const code = typeof e.status === 'number' ? e.status : -1;
    return {
      code,
      out: String(e.stdout ?? '').trim(),
      err: String(e.stderr ?? e.message ?? '').trim(),
    };
  }
}

/** The checkout's guard rails, or null when it has none (not MediaMake, or older than the rails). */
export function loadRules(top) {
  try {
    const rules = JSON.parse(
      fs.readFileSync(path.join(top, RULES_FILE), 'utf8'),
    );
    return {
      protectedBranches: rules.protectedBranches ?? ['main'],
      allow: rules.allow ?? [],
      leftovers: rules.leftovers ?? [],
      areas: rules.areas ?? [],
      default: rules.default ?? {
        name: 'framework file',
        branch: '<type>/<what>',
        where: '',
      },
    };
  } catch {
    return null;
  }
}

/** A guard-rails path pattern as a test on a repo-relative posix path. */
export function matches(pattern, rel) {
  if (pattern.endsWith('/'))
    return rel.startsWith(pattern) || rel === pattern.slice(0, -1);
  if (!pattern.includes('*')) return rel === pattern;
  const re = pattern
    .split(/(\*\*\/|\*\*|\*)/)
    .map(part =>
      part === '**/'
        ? '(?:.*/)?'
        : part === '**'
          ? '.*'
          : part === '*'
            ? '[^/]*'
            : part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'),
    )
    .join('');
  return new RegExp(`^${re}$`).test(rel);
}

/** The area whose hint fits a repo-relative path (the rules' default when none does). */
export function areaFor(rules, rel) {
  return (
    rules.areas.find(a => (a.paths ?? []).some(p => matches(p, rel))) ??
    rules.default
  );
}

/** The real path of p, also for a file that doesn't exist yet (its deepest existing folder, resolved). */
function realish(p) {
  let head = path.resolve(p);
  const tail = [];
  while (!fs.existsSync(head)) {
    const up = path.dirname(head);
    if (up === head) return path.resolve(p);
    tail.unshift(path.basename(head));
    head = up;
  }
  try {
    return path.join(fs.realpathSync.native(head), ...tail);
  } catch {
    return path.resolve(p);
  }
}

/** The checkout a path is in: { top, rules, branch } or null when the guard has nothing to say there. */
export function checkoutOf(p) {
  let dir = realish(p);
  while (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
  const top = git(['rev-parse', '--show-toplevel'], dir);
  if (top.code !== 0 || !top.out) return null;
  const real = realish(top.out);
  const rules = loadRules(real);
  if (!rules) return null;
  const head = git(['symbolic-ref', '--short', '-q', 'HEAD'], real);
  return { top: real, rules, branch: head.code === 0 ? head.out : null };
}

const isProtected = co =>
  !!co?.branch && co.rules.protectedBranches.includes(co.branch);

const OFF =
  'The user can turn the guard off for a session by starting Claude with MEDIAMAKE_GUARD=off; that is their call, not yours.';

/** Whether an edit to filePath may go ahead: null to allow, else the reason it is stopped. */
export function checkEdit(filePath, cwd = process.cwd()) {
  if (!filePath) return null;
  const abs = realish(path.resolve(cwd, filePath));
  const co = checkoutOf(abs);
  if (!isProtected(co)) return null;
  const rel = path.relative(co.top, abs).split(path.sep).join('/');
  if (!rel || rel.startsWith('../') || rel === '..' || path.isAbsolute(rel))
    return null;
  if (rel === '.git' || rel.startsWith('.git/')) return null;
  // Ignored means it's the user's own work (projects, renders, local settings): never stopped.
  if (git(['check-ignore', '-q', '--', rel], co.top).code === 0) return null;
  if (co.rules.allow.some(p => matches(p, rel))) return null;
  const area = areaFor(co.rules, rel);
  const branch = area.branch ?? '<type>/<what>';
  const tracked =
    git(['ls-files', '--error-unmatch', '--', rel], co.top).code === 0;
  return [
    `MediaMake guard: ${rel} is a ${area.name} (${tracked ? 'committed' : 'a new file git would commit'}) and this checkout (${co.top}) is on ${co.branch}.`,
    `${co.branch} stays a clean copy of GitHub, so pulls never stop on local edits.`,
    area.where ? `Where this change belongs: ${area.where}` : '',
    `To make it, start a branch first: \`git switch -c ${branch}\` (the user's ignored work, like projects/ and out/, stays where it is), or \`git worktree add -b ${branch} ../mediamake-<what> origin/${co.branch}\` when other sessions are using this checkout. Then edit, commit, push and open a PR.`,
    `If the user didn't ask for a change to the framework, ask them before you branch.`,
    OFF,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Splits a shell command into words, keeping quoted parts together (good enough for git lines). */
export function words(segment) {
  const out = [];
  let cur = '';
  let quote = null;
  let any = false;
  for (let i = 0; i < segment.length; i++) {
    const c = segment[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === '\\' && quote === '"' && i + 1 < segment.length)
        cur += segment[++i];
      else cur += c;
    } else if (c === '"' || c === "'") {
      quote = c;
      any = true;
    } else if (c === '\\' && i + 1 < segment.length) {
      cur += segment[++i];
      any = true;
    } else if (/\s/.test(c)) {
      if (cur || any) out.push(cur);
      cur = '';
      any = false;
    } else {
      cur += c;
    }
  }
  if (cur || any) out.push(cur);
  return out;
}

/** A shell command cut at the &&, ||, ;, | and newlines that aren't inside quotes. */
export function segments(command) {
  const out = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (quote) {
      if (c === '\\' && quote === '"' && i + 1 < command.length) {
        cur += c + command[++i];
        continue;
      }
      if (c === quote) quote = null;
      cur += c;
    } else if (c === '"' || c === "'") {
      quote = c;
      cur += c;
    } else if (c === '\\' && i + 1 < command.length) {
      cur += c + command[++i];
    } else if (
      c === ';' ||
      c === '\n' ||
      c === '|' ||
      (c === '&' && command[i + 1] === '&')
    ) {
      if (c !== '\n' && c !== ';' && command[i + 1] === c) i++;
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map(s => s.trim()).filter(Boolean);
}

/** The git calls in a shell command: [{ dir, sub, args }], following `cd` and `git -C`. */
export function gitCalls(command, cwd) {
  const calls = [];
  let dir = cwd;
  for (const segment of segments(command)) {
    let w = words(segment.trim());
    while (w.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0])) w = w.slice(1);
    if (w[0] === 'cd' && w[1]) {
      dir = path.resolve(
        dir,
        w[1].replace(/^~(?=$|\/)/, process.env.HOME ?? '~'),
      );
      continue;
    }
    if (w[0] !== 'git') continue;
    let i = 1;
    let gdir = dir;
    while (i < w.length && w[i].startsWith('-')) {
      if (w[i] === '-C' && w[i + 1] !== undefined) {
        gdir = path.resolve(gdir, w[i + 1]);
        i += 2;
      } else if (
        ['-c', '--git-dir', '--work-tree', '--namespace'].includes(w[i])
      ) {
        i += 2;
      } else {
        i += 1;
      }
    }
    if (i < w.length)
      calls.push({ dir: gdir, sub: w[i], args: w.slice(i + 1) });
  }
  return calls;
}

/** npm's subcommands (and their aliases) that write package-lock.json; audit only with `fix`. */
const NPM_WRITES = new Set([
  'install', 'i', 'in', 'ins', 'inst', 'insta', 'instal', 'isnt', 'isnta', 'isntal', 'isntall', 'add',
  'install-test', 'it', 'uninstall', 'unlink', 'remove', 'rm', 'r', 'un', 'update', 'up', 'upgrade',
  'udpate', 'dedupe', 'ddp', 'prune', 'version', 'audit',
]);
const NPM_SPARES = ['-g', '--global', '--location=global', '--no-save', '--no-package-lock', '--package-lock=false', '--dry-run'];

/** The npm calls in a shell command that would write a lockfile: [{ dir, sub }], following `cd` and --prefix. */
export function npmLockWrites(command, cwd) {
  const calls = [];
  let dir = cwd;
  for (const segment of segments(command)) {
    let w = words(segment.trim());
    while (w.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0])) w = w.slice(1);
    if (w[0] === 'cd' && w[1]) {
      dir = path.resolve(dir, w[1].replace(/^~(?=$|\/)/, process.env.HOME ?? '~'));
      continue;
    }
    if (!/^npm(\.cmd)?$/.test(path.basename(w[0] ?? ''))) continue;
    let ndir = dir;
    let sub = null;
    const rest = [];
    for (let i = 1; i < w.length; i++) {
      const a = w[i];
      if (a === '--prefix' || a === '-C') {
        if (w[i + 1] !== undefined) ndir = path.resolve(ndir, w[++i]);
      } else if (a.startsWith('--prefix=')) {
        ndir = path.resolve(ndir, a.slice('--prefix='.length));
      } else if (!sub && ['-w', '--workspace', '--userconfig', '--cache', '--registry'].includes(a)) {
        i++; // an option before the subcommand that takes the next word
      } else if (!sub && !a.startsWith('-')) {
        sub = a;
      } else {
        rest.push(a);
      }
    }
    if (!sub || !NPM_WRITES.has(sub)) continue;
    if (sub === 'audit' && !rest.includes('fix')) continue;
    if (sub === 'unlink' && !rest.some(a => !a.startsWith('-'))) continue;
    if (rest.some(a => NPM_SPARES.includes(a))) continue;
    calls.push({ dir: ndir, sub });
  }
  return calls;
}

/** Whether a Bash command may go ahead: null to allow, else the reason it is stopped. */
export function checkBash(command, cwd = process.cwd()) {
  if (!command || !/\b(git|npm)\b/.test(command)) return null;
  for (const call of npmLockWrites(command, cwd)) {
    const co = checkoutOf(call.dir);
    if (!isProtected(co)) continue;
    const rel = path.relative(co.top, realish(call.dir)).split(path.sep).join('/');
    // a folder git ignores is the user's own (a project with its own package.json)
    if (rel && !rel.startsWith('..') && git(['check-ignore', '-q', '--', rel], co.top).code === 0) continue;
    return [
      `MediaMake guard: \`npm ${call.sub}\` rewrites package-lock.json, and this checkout (${co.top}) is on ${co.branch}. The lockfile changes only in a PR that changes dependencies, so pulls never stop on it.`,
      'To install what the lockfile says, run `npm ci`: it never writes the lockfile.',
      `To add, remove or update a dependency, start a branch first (\`git switch -c deps/<what>\`), then run it there and commit package.json and package-lock.json together in a PR.`,
      `If the user didn't ask for a dependency change, use \`npm ci\` and don't branch.`,
      OFF,
    ].join('\n');
  }
  if (!/\bgit\b/.test(command)) return null;
  for (const call of gitCalls(command, cwd)) {
    if (call.sub === 'clean') {
      const flags = call.args.filter(a => /^-[A-Za-z]+$/.test(a)).join('');
      const dry = flags.includes('n') || call.args.includes('--dry-run');
      if (!dry && /[xX]/.test(flags) && checkoutOf(call.dir)) {
        return [
          "MediaMake guard: `git clean` with -x or -X deletes the files git ignores, and in this repo those are the user's work: projects/, out/, brands/, thumbnails/jobs/, overlays/ and .claude/settings.local.json.",
          'To see what a plain `git clean -fd` (untracked files only) would remove, run `git clean -nd`, and ask the user before deleting anything.',
        ].join('\n');
      }
    }
    if (call.sub === 'commit' && !call.args.includes('--dry-run')) {
      const co = checkoutOf(call.dir);
      if (isProtected(co)) {
        return [
          `MediaMake guard: this would commit on ${co.branch} in ${co.top}. ${co.branch} stays a clean copy of GitHub, so pulls never stop on local commits.`,
          `Commit on a branch instead: \`git switch -c <type>/<what>\` takes the uncommitted changes with it; then commit, push and open a PR.`,
          OFF,
        ].join('\n');
      }
    }
  }
  return null;
}

/** The hook's decision for one PreToolUse input: null to allow, else the reason it is stopped. */
export function decide(input) {
  if (process.env.MEDIAMAKE_GUARD === 'off') return null;
  const cwd = input?.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const tool = input?.tool_name;
  const ti = input?.tool_input ?? {};
  if (EDIT_TOOLS.has(tool))
    return checkEdit(ti.file_path ?? ti.notebook_path, cwd);
  if (tool === 'Bash') return checkBash(ti.command, cwd);
  return null;
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let reason = null;
  try {
    reason = decide(JSON.parse(raw || '{}'));
  } catch {
    reason = null;
  }
  if (reason) {
    process.stdout.write(
      `${JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: reason,
        },
      })}\n`,
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href
) {
  main().catch(() => process.exit(0));
}
