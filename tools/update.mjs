#!/usr/bin/env node
/**
 * mm update: brings this MediaMake checkout up to GitHub's main without losing anything of yours.
 *
 *   mm update            what it would do; when nothing of yours has to move (a clean main), it does it
 *   mm update --yes      also when edits or commits on main have to be set aside first
 *   --push               push the local/<date> branch your edits went to, and print its PR link
 *   --no-ci              skip npm ci (it runs only when package-lock.json or a package.json changed, or
 *                        node_modules is missing)
 *   --no-doctor          skip mm doctor at the end
 *   --dir=<path>         another checkout
 *
 * On main:
 *  1. git-health's checks, fetching main. A merge or rebase half done, conflicts, a detached HEAD or no
 *     answer from GitHub stop it, with the fix.
 *  2. Framework edits (committed files changed, new files git would commit) are committed on a new
 *     branch, local/<date>, and commits main has that GitHub doesn't go there too; main goes back to
 *     GitHub's. Only with --yes. Files git ignores (your projects, renders, brand kits) are never
 *     touched. The branch can become a PR (--push), or be dropped once you have looked.
 *  3. main fast-forwards to GitHub's.
 *  4. npm ci, when the dependencies changed (it never rewrites package-lock.json; npm install would).
 *  5. mm migrate: with a workspace set, what a new version moves into it (moved with --yes); with none
 *     yet, how to move your work out of the checkout.
 *  6. mm doctor.
 * On another branch your branch is left as it is: local main fast-forwards to GitHub's, and the report
 * says how to bring it in (`git merge origin/main`). npm ci and migrate wait until you are on main.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspect } from './git-health.mjs';
import { git } from './guard-rails.mjs';
import { compareUrl } from './upstream.mjs';
import {
  NOT_WORK,
  STUDIO_FOLDERS,
  withWork,
  workspaceSetting,
} from './workspace.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WIN = process.platform === 'win32';
const NPM = WIN ? 'npm.cmd' : 'npm';

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const listed = (items, max = 6) =>
  items.slice(0, max).join(', ') +
  (items.length > max ? ` and ${items.length - max} more` : '');
const today = () => new Date().toISOString().slice(0, 10);

/** local/<date>, or local/<date>-2, -3 … when that branch exists. */
export const localBranch = (top, date = today()) => {
  for (let n = 1; ; n++) {
    const name = `local/${date}${n === 1 ? '' : `-${n}`}`;
    if (
      git(['rev-parse', '--verify', '-q', `refs/heads/${name}`], top).code !== 0
    )
      return name;
  }
};

const must = (args, top) => {
  const r = git(args, top, { timeout: 120000 });
  if (r.code !== 0)
    throw new Error(
      `git ${args.join(' ')}: ${(r.err || r.out || '').trim().split('\n').pop()}`,
    );
  return r.out;
};

const counts = (top, a, b) => {
  const r = git(['rev-list', '--left-right', '--count', `${a}...${b}`], top);
  if (r.code !== 0) return null;
  const [ahead, behind] = r.out.split(/\s+/).map(Number);
  return { ahead, behind };
};

/**
 * What an update would do: { top, kind: main|branch, edits, ahead, behind, save, stop? }. `stop` is a
 * list of { text, fix } that keep it from starting.
 */
export function planUpdate(dir, { fetch = true } = {}) {
  const r = inspect(dir, { fetch });
  if (!r) return { stop: [{ text: `${dir} isn't a git checkout.`, fix: '' }] };
  const base = { r, top: r.top, main: r.main, branch: r.branch };
  const stop = r.issues.filter(i => i.level === 'stop');
  if (stop.length) return { ...base, stop };
  if (!r.branch)
    return {
      ...base,
      stop: [
        {
          text: `HEAD is detached at ${r.sha}.`,
          fix:
            r.issues.find(i => /detached/.test(i.text))?.fix ??
            `\`git switch ${r.main}\`.`,
        },
      ],
    };
  if (fetch && r.fetch.tried && !r.fetch.ok)
    return {
      ...base,
      stop: [
        {
          text: `Couldn't reach GitHub (${r.fetch.error}).`,
          fix: 'Check the connection and run mm update again.',
        },
      ],
    };
  const edits = [...r.changed, ...r.untracked];
  if (r.onMain) {
    const ahead = r.vsMain?.ahead ?? 0;
    const behind = r.vsMain?.behind ?? 0;
    return {
      ...base,
      kind: 'main',
      changed: r.changed,
      untracked: r.untracked,
      edits,
      ahead,
      behind,
      save: edits.length || ahead ? localBranch(r.top) : null,
    };
  }
  const local = counts(
    r.top,
    `refs/heads/${r.main}`,
    `refs/remotes/origin/${r.main}`,
  );
  return {
    ...base,
    kind: 'branch',
    edits,
    mainAhead: local?.ahead ?? 0,
    mainBehind: local?.behind ?? 0,
    vsMain: r.vsMain,
    merged: r.merged,
  };
}

/** The plan in words, for the dry run. */
export const describe = p => {
  const lines = [];
  if (p.kind === 'main') {
    if (p.changed.length)
      lines.push(
        `Your edits on ${p.main}: ${plural(p.changed.length, 'committed file')} changed (${listed(p.changed)}).`,
      );
    if (p.untracked.length)
      lines.push(
        `New files on ${p.main} that git would commit: ${listed(p.untracked)}.`,
      );
    if (p.ahead)
      lines.push(
        `${plural(p.ahead, 'commit')} on ${p.main} that GitHub doesn't have.`,
      );
    lines.push(
      p.behind
        ? `${p.main} is ${plural(p.behind, 'commit')} behind GitHub.`
        : `${p.main} has everything GitHub has.`,
    );
    if (p.save) {
      lines.push('', 'mm update --yes will:');
      lines.push(
        `  1. commit ${[p.edits.length && 'your edits', p.ahead && `the ${plural(p.ahead, 'commit')}`].filter(Boolean).join(' and ')} on a new branch, ${p.save}, and put ${p.main} back to GitHub's`,
      );
      lines.push(
        `  2. bring ${p.main} up to GitHub${p.behind ? ` (${plural(p.behind, 'commit')})` : ''}`,
      );
      lines.push(
        '  3. npm ci if the dependencies changed, mm migrate if your workspace needs it, then mm doctor',
      );
      lines.push(
        `Your projects, renders and brand kits (files git ignores) aren't touched. Nothing on ${p.save} is lost: push it as a PR (--push), or drop it once you have looked.`,
      );
    }
  }
  return lines;
};

const npmCi = (top, log) => {
  log('→ npm ci (installs exactly what package-lock.json says)');
  const r = spawnSync(NPM, ['ci'], { cwd: top, stdio: 'inherit', shell: WIN });
  if (r.status !== 0)
    throw new Error(
      'npm ci failed: fix what it says, then run `npm ci` at the repo root, and `mm doctor`.',
    );
};

/** Did the update change a package.json or the lockfile? */
const depsChanged = (top, before, after) =>
  before !== after &&
  git(['diff', '--name-only', before, after], top)
    .out.split('\n')
    .some(f => f === 'package-lock.json' || /(^|\/)package\.json$/.test(f));

/** mm migrate's dry run (or --yes): { output, nothing }. */
const migrate = (top, yes) => {
  const script = path.join(top, 'apps', 'studio', 'scripts', 'migrate.ts');
  if (!fs.existsSync(script)) return { output: '', nothing: true };
  const r = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--no-warnings=ExperimentalWarning',
      script,
      ...(yes ? ['--yes'] : []),
    ],
    {
      cwd: path.join(top, 'apps', 'studio'),
      encoding: 'utf8',
      stdio: yes ? 'inherit' : 'pipe',
    },
  );
  if (r.status !== 0)
    throw new Error(
      `mm migrate failed${r.stderr ? `: ${r.stderr.trim().split('\n').pop()}` : ''}`,
    );
  const output = (r.stdout ?? '').trim();
  return { output, nothing: /Nothing to do\.$/.test(output) };
};

/** Does it. Returns { saved?, pushed?, compare?, pulled, ci, needsYes? }. */
export async function runUpdate(
  p,
  {
    yes = false,
    push = false,
    ci = true,
    migrateStep = true,
    doctor = true,
    log = console.log,
  } = {},
) {
  const { top, main } = p;
  const done = { pulled: 0, ci: false };
  if (p.kind === 'branch') {
    // your branch stays as it is; local main follows GitHub when it can fast-forward
    if (p.mainBehind && !p.mainAhead) {
      must(
        ['update-ref', `refs/heads/${main}`, `refs/remotes/origin/${main}`],
        top,
      );
      done.pulled = p.mainBehind;
      log(
        `✔ ${main} is up to GitHub's (${plural(p.mainBehind, 'new commit')}).`,
      );
    } else if (p.mainAhead)
      log(
        `! Your local ${main} has ${plural(p.mainAhead, 'commit')} GitHub doesn't: switch to it and run mm update.`,
      );
    else log(`✔ ${main} has everything GitHub has.`);
    log(
      p.merged
        ? `You're on ${p.branch}, which is already in ${main}: \`git switch ${main}\` and mm update again to install and set up the new version.`
        : `You're on ${p.branch}, left as it is${p.vsMain?.behind ? ` (${plural(p.vsMain.behind, 'commit')} behind ${main}: \`git merge origin/${main}\` brings them in when it suits)` : ''}. npm ci and migrate run when you update on ${main}.`,
    );
  } else {
    const before = must(['rev-parse', 'HEAD'], top);
    if (p.save) {
      if (!yes) {
        for (const l of describe(p)) log(l);
        log('\nNothing has changed. To do it: mm update --yes');
        return { ...done, needsYes: true };
      }
      if (
        p.edits.length &&
        !(
          git(['config', 'user.email'], top).out &&
          git(['config', 'user.name'], top).out
        )
      )
        throw new Error(
          'git doesn\'t know who you are, so your edits can\'t be committed: `git config --global user.name "Your Name"` and `git config --global user.email you@example.com`, then mm update --yes.',
        );
      must(['switch', '--quiet', '-c', p.save], top);
      if (p.edits.length) {
        must(['add', '-A'], top);
        must(
          [
            'commit',
            '--quiet',
            '-m',
            `Local edits saved by mm update (${today()})`,
            '-m',
            `Changed on ${main} in this checkout and set aside so ${main} can follow GitHub.`,
          ],
          top,
        );
      }
      must(['switch', '--quiet', main], top);
      if (p.ahead) must(['reset', '--quiet', '--keep', `origin/${main}`], top);
      done.saved = p.save;
      log(
        `✔ ${[p.edits.length && `your edits (${plural(p.edits.length, 'file')})`, p.ahead && plural(p.ahead, 'commit')].filter(Boolean).join(' and ')} saved on ${p.save}; ${main} is GitHub's again.`,
      );
      if (push) {
        must(['push', '--quiet', '-u', 'origin', p.save], top);
        done.pushed = true;
        done.compare = compareUrl(
          git(['remote', 'get-url', 'origin'], top).out,
          main,
          p.save,
        );
        log(
          `✔ pushed ${p.save}${done.compare ? `: open its PR at ${done.compare}` : ''}`,
        );
      } else
        log(
          `  To share them: git push -u origin ${p.save}, then open a PR. To look: git log -p ${main}..${p.save}`,
        );
    }
    const behind =
      counts(top, 'HEAD', `refs/remotes/origin/${main}`)?.behind ?? 0;
    if (behind) {
      must(['merge', '--quiet', '--ff-only', `origin/${main}`], top);
      done.pulled = behind;
      log(`✔ ${main} is up to GitHub's (${plural(behind, 'new commit')}).`);
    } else if (!p.save) log(`✔ ${main} has everything GitHub has.`);
    const after = must(['rev-parse', 'HEAD'], top);

    if (ci) {
      const missing = !fs.existsSync(path.join(top, 'node_modules'));
      if (missing || depsChanged(top, before, after)) {
        npmCi(top, log);
        done.ci = true;
      } else log('✔ dependencies unchanged: no npm ci');
    }

    if (migrateStep) {
      if (workspaceSetting()) {
        const m = migrate(top, false);
        if (m.nothing) log('✔ your workspace needs nothing moved');
        else if (yes) {
          log('→ mm migrate --yes');
          migrate(top, true);
        } else {
          log(
            `\nThis version moves more of your work into your workspace:\n${m.output.replace(/\nNothing has changed\. To do it: .*$/, '')}\n\nmm update --yes (or mm migrate --yes) moves it.`,
          );
        }
      } else if (
        withWork(path.join(top, 'apps', 'studio'), STUDIO_FOLDERS, NOT_WORK)
          .length
      ) {
        log(
          "ℹ Your work is still inside the checkout (apps/studio): mm migrate shows the move to ~/MediaMake, out of git's way.",
        );
      }
    }
  }

  if (doctor) {
    log('');
    const { doctor: run } = await import('./doctor.mjs');
    await run({ top, fetch: false, log });
  }
  return done;
}

/** The comment at the top of this file, for --help. */
const usage = () =>
  fs
    .readFileSync(fileURLToPath(import.meta.url), 'utf8')
    .match(/\/\*\*\n([\s\S]*?)\*\//)[1]
    .split('\n')
    .map(l => l.replace(/^ \* ?/, ''))
    .join('\n')
    .trim();

/** --help prints the usage; a flag it doesn't know stops it, so a typo never runs the wrong thing. */
const checkArgs = (args, known, name) => {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    process.exit(0);
  }
  const bad = args.filter(a => !known.includes(a) && !a.startsWith('--dir='));
  if (bad.length) {
    console.error(`${name}: no option ${bad.join(', ')}. --help lists them.`);
    process.exit(2);
  }
};

if (
  process.argv[1] &&
  fs.realpathSync(path.resolve(process.argv[1])) ===
    fs.realpathSync(fileURLToPath(import.meta.url))
) {
  const args = process.argv.slice(2);
  checkArgs(args, ['--yes', '--push', '--no-ci', '--no-doctor'], 'mm update');
  const has = f => args.includes(f);
  const dir =
    args.find(a => a.startsWith('--dir='))?.slice('--dir='.length) ??
    path.resolve(HERE, '..');
  (async () => {
    const p = planUpdate(dir);
    if (p.stop) {
      console.log(`mm update can't start${p.top ? ` in ${p.top}` : ''}:`);
      for (const s of p.stop)
        console.log(`  ✗ ${s.text}${s.fix ? `\n    ${s.fix}` : ''}`);
      process.exit(1);
    }
    console.log(`mm update: ${p.top} (${p.branch})\n`);
    await runUpdate(p, {
      yes: has('--yes'),
      push: has('--push'),
      ci: !has('--no-ci'),
      doctor: !has('--no-doctor'),
    });
    process.exit(0);
  })().catch(e => {
    console.error(`✗ mm update: ${e.message}`);
    process.exit(1);
  });
}
