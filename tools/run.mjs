#!/usr/bin/env node
/**
 * run: a production's run record (apps/mediamake/docs/cloud-device-runs.md). A run follows one skill's
 * run sheet, step by step, and every step ends by saving: its work goes to the project (Productions,
 * Releases) and the record says which steps are done, where, and which is next. So a run can stop in
 * one place and go on in another, and nothing depends on a session staying alive.
 *
 *   mm run                              the runs that aren't over in your projects, and which of them
 *                                       this place can continue
 *   mm run <project>                    one project's runs, the finished ones too ("mine" is your own space)
 *   mm run status <slug>                one run: every step, where it was done and what it saved
 *   mm run start <project> <slug> --skill=<name> [--title="…"] [--again]
 *                                       starts the run of production <slug> here, with that skill's run
 *                                       sheet. A production runs once at a time: a second start is told
 *                                       who has it and where. --again runs a finished one from step 1.
 *   mm run step <slug> <n> [--hours=<n>] [--without]
 *                                       step n starts here (--hours when it takes more than 2).
 *                                       --without: this place lacks something the step needs and does
 *                                       what the run sheet's "Without it" says instead (web search for
 *                                       Browse Hack, say). Refused when the sheet says the step waits
 *                                       ("a to-do …") or says nothing.
 *   mm run save <slug> <n> [--production] [--release[=<folder>]] [--output="<what it made, a link>"]
 *                                       step n is saved. --production sends projects/<slug> and
 *                                       out/<slug> to the project's Productions; --release sends the
 *                                       release kit (out/youtube/<slug> unless you name the folder) to
 *                                       its Releases. Only changed files go up.
 *   mm run wait <slug> [<n>] [--title="…"] [--notes="…"]
 *                                       this place can't do step n: it becomes a to-do for a place that
 *                                       can, and this place lets go of the run. Then end: a session
 *                                       never waits. Finishing the to-do saves the step. A release kit
 *                                       here (out/youtube/<slug>) that the run never saved goes to the
 *                                       project's Releases first, so the place that picks it up gets it.
 *   mm run resume <slug> [--take-saved] continues it here: takes the run, brings the project's space up
 *                                       to date, fetches what the run saved, and says what is next. A
 *                                       run that saved no release kit gets the project's release of the
 *                                       same slug, when it was made for this production.
 *                                       A file here that differs from the saved one is never replaced
 *                                       unless you say --take-saved (yours is kept in .before-resume/).
 *   mm run stop <slug>                  lets go of the run, so another place can continue it
 *   mm run cancel <slug> [--reason="…"] cancels it, and the to-dos its steps wait for
 *   mm run --hook                       the session-start line (.claude/settings.json): quiet unless a
 *                                       run is ready to continue that this place can do, in a project
 *                                       it is open to (mm access open); a closed computer says nothing
 *
 * --project=<name or id> names the project when two of yours have a run by the same slug.
 * "Continue <slug> in <project>", pasted into Claude, is mm run resume <slug> --project=<project>.
 * Everyone on the project reads a run: its words never hold a key or a password.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { askedHere, capabilities, openProjects } from './access.mjs';
import { fetchBundle, productionFiles, productionPlace, readBundle, releaseFiles, releasePlace, saveBundle } from './bundles.mjs';
import { missing } from './places.mjs';
import { runSheet } from './skills.mjs';
import { gitState, localSpaces } from './space.mjs';
import { clock, here, needSignIn, projectNamed, signedIn, syncSpace } from './todo.mjs';
import { skillRoots } from './usage.mjs';
import { workspaceSetting } from './workspace.mjs';

const SELF = fileURLToPath(import.meta.url);
const TOP = path.resolve(path.dirname(SELF), '..');
const HOOK_MS = 4000;
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const MARK = { ready: '▸', waiting: '◌', running: '◐', done: '✔', cancelled: '–' };
const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const STEP_MARK = { done: '✔', started: '◐', unsaved: '!', waiting: '◌', todo: '○' };

/** Where projects/ and out/ are: the workspace when one is set, else apps/studio (before mm migrate). */
export const workRoot = () => workspaceSetting()?.root ?? path.join(TOP, 'apps', 'studio');

/** A skill's SKILL.md on this computer: MediaMake's own, the project's, yours. */
export function skillFile(name, env = process.env) {
  for (const root of [path.join(TOP, '.claude', 'skills'), ...skillRoots(env)]) {
    const file = path.join(root, name, 'SKILL.md');
    if (fs.statSync(file, { throwIfNoEntry: false })?.isFile()) return file;
  }
  return null;
}

/** The steps a run follows: the skill's run sheet, or one step for a skill that has none (it runs whole, where it started). */
export function stepsOf(file) {
  const sheet = runSheet(file);
  if (sheet.found && sheet.errors.length) throw new Error(`The skill's run sheet can't be read:\n  ${sheet.errors.join('\n  ')}`);
  if (!sheet.found) return { steps: [{ step: 'The whole skill', needs: [] }], whole: true };
  return { steps: sheet.steps.map(({ step, needs, yes, repeat, without }) => ({ step, needs, ...(yes && { yes: true }), ...(repeat && { repeat: true }), ...(without && { without }) })), whole: false };
}

/** What a step needs that this place doesn't have. */
export const lacksHere = (step, can) => missing(can, step.needs.map(n => (typeof n === 'string' ? n : n.need)));

/** One run in a list: its state, how far it is and what comes next. */
export function runLine(run, can) {
  const next = run.next;
  const lacks = next ? missing(can, next.needs) : [];
  const where = next ? (!lacks.length ? 'this place can do it' : next.without ? `this place can do it the run sheet's other way (no ${lacks.join(', ')})` : `not this place (no ${lacks.join(', ')})${next.places.length ? `; ${next.places.join(', ')} can` : ''}`) : '';
  const tail =
    run.state === 'running'
      ? `${run.heldBy} ${run.heldBy === 'You' ? 'have' : 'has'} it${run.heldOn ? ` on ${run.heldOn}` : ''} since ${clock(run.heldSince)}${next ? `, at step ${next.n} (${next.step})` : ''}`
      : run.state === 'waiting'
        ? `step ${next.n} (${next.step}) waits as to-do ${run.steps[next.n - 1].todo}`
        : run.state === 'ready'
          ? `ready to continue at step ${next.n} (${next.step}): ${where}`
          : run.state === 'done'
            ? `ran to the end${run.doneAt ? `, ${clock(run.doneAt)}` : ''}`
            : `cancelled${run.reason ? `: ${run.reason}` : ''}`;
  return `  ${MARK[run.state] ?? '?'} ${run.slug}  ${run.title !== run.slug ? `${run.title}  ` : ''}(${run.skill}, ${run.done} of ${run.steps.length} steps saved)\n      ${tail}`;
}

/** Every step of a run: where it was done and what it saved, and for the ones to come whether this place can do them. */
export function stepLines(run, can) {
  const width = Math.max(...run.steps.map(step => `${step.n}. ${step.step}`.length)) + 3;
  return run.steps.map(step => {
    const lacks = lacksHere(step, can);
    const tail =
      step.state === 'done'
        ? [[step.place, step.at && clock(step.at)].filter(Boolean).join(', '), step.lacked?.length && `without ${step.lacked.map(l => l.need).join(', ')}`, step.output].filter(Boolean).join('   ')
        : step.state === 'waiting'
          ? `waits as to-do ${step.todo}${step.todoState ? ` (${step.todoState})` : ''}`
          : step.state === 'unsaved'
            ? `started${step.place ? ` on ${step.place}` : ''}${step.at ? `, ${clock(step.at)}` : ''}, never saved: it is done again`
            : step.state === 'started'
              ? `started${step.place ? ` on ${step.place}` : ''}${step.at ? `, ${clock(step.at)}` : ''}`
              : lacks.length
                ? step.without
                  ? `here the run sheet's other way (no ${lacks.join(', ')})`
                  : `not this place (no ${lacks.join(', ')})`
                : step.needs.length
                  ? 'this place can do it'
                  : '';
    return `  ${STEP_MARK[step.state] ?? '?'} ${`${step.n}. ${step.step}`.padEnd(width)}${tail}`.trimEnd();
  });
}

/** What to say about a step this place does the run sheet's other way, lacking `lacks`. */
const otherWay = (slug, step, lacks) => [
  `This place has no ${lacks.join(', ')}. The run sheet says what to do without: "${step.without}". Do that here, so the run stays in one place.`,
  `Only when that isn't good enough for this production: mm run wait ${slug} ${step.n} posts the step for a place that has it${step.places?.length ? ` (${step.places.join(', ')})` : ''}.`,
];

/**
 * The session-start line: the runs ready to continue that this place can do, in the projects it is open to
 * (`open`, a Set of project ids; null for every project, as in a cloud environment). Empty when there are none.
 */
export function hookLine(runs, can, open = null) {
  const able = runs.filter(run => run.state === 'ready' && run.next && (!open || open.has(run.project)) && (run.next.without || !missing(can, run.next.needs).length));
  if (!able.length) return '';
  const first = able.slice(0, 3).map(run => `${run.slug} (${run.projectName}), next step ${run.next.n} "${run.next.step}"`);
  return `MediaMake: ${able.length === 1 ? 'a run is' : `${able.length} runs are`} ready to continue that this place can do: ${first.join('; ')}${able.length > 3 ? '; …' : ''}. Tell the user, and continue one only when they say so: mm run resume <slug>.`;
}

/** What to do with a run that this place just took, for the person or the Claude that did. */
export function brief(run, can, place, fetched = []) {
  const lines = [`✔ ${run.slug} runs here${place ? ` (${place})` : ''}, with the ${run.skill} skill. Two hours with no step started or saved, and another place may continue it.`, '', ...stepLines(run, can)];
  if (fetched.length) lines.push('', ...fetched.map(line => `Fetched: ${line}`));
  const next = run.next;
  if (!next) return lines.join('\n');
  const step = run.steps[next.n - 1];
  const lacks = missing(can, next.needs);
  lines.push('');
  if (run.done) lines.push('Saved steps are never done again.');
  if (step.state === 'waiting') {
    lines.push(`Step ${next.n} (${next.step}) waits as to-do ${step.todo}. ${lacks.length ? 'This place can\'t do it either: let go of the run (mm run stop ' + run.slug + ').' : `This place can do it: mm todo pick ${step.todo}`}`);
    return lines.join('\n');
  }
  if (lacks.length && !next.without) {
    lines.push(
      `Step ${next.n} (${next.step}) needs ${lacks.join(', ')}, which this place doesn't have.${next.places.length ? ` ${next.places.join(', ')} can do it.` : ''}`,
      `Post it for a place that can, and end there (a session never waits):  mm run wait ${run.slug} ${next.n}`,
    );
    return lines.join('\n');
  }
  lines.push(`Go on with step ${next.n} (${next.step}): follow the ${run.skill} skill for that step.`);
  if (lacks.length) lines.push(...otherWay(run.slug, next, lacks));
  if (step.state === 'unsaved' && !step.repeat) lines.push("It was started before and never saved, and it must not happen twice: check first that it didn't already (a link on the release, the video on the channel). If it did, only save the step with its result.");
  if (step.needsYes) lines.push("It waits for a person's yes: ask the user, here, before doing it.");
  lines.push(
    `  When it starts:           mm run step ${run.slug} ${next.n}${lacks.length ? ' --without' : ''}`,
    `  When its work is saved:   mm run save ${run.slug} ${next.n} --production   (--release for a release kit, --output="<a link>" for what it made)`,
    `  A step this place can't do:  mm run wait ${run.slug} <n>     Not now after all:  mm run stop ${run.slug}`,
  );
  return lines.join('\n');
}

/* ---------- MediaMake ---------- */

async function api(env, method, query = '', body) {
  const at = needSignIn(env);
  const res = await fetch(`${at.url}/api/space/runs${query}`, {
    method,
    headers: { Accept: 'application/json', Authorization: `Bearer ${at.key}`, ...(body && { 'Content-Type': 'application/json' }) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) return data;
  if (res.status === 404 && method === 'GET') return null;
  const held = /already running/.test(data.error ?? '') && data.run?.heldSince ? ` ${data.run.heldBy} ${data.run.heldBy === 'You' ? 'have' : 'has'} it${data.run.heldOn ? ` on ${data.run.heldOn}` : ''} since ${clock(data.run.heldSince)}.` : '';
  throw new Error(`${data.error ?? `MediaMake answered ${res.status}`}.${held}`);
}

const slugOf = raw => {
  const slug = String(raw ?? '').trim();
  if (!SLUG.test(slug)) throw new Error("Which production? Its slug: lowercase letters, digits and dashes (the folder's name in projects/).");
  return slug;
};
const stepOf = (raw, run) => {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > run.steps.length) throw new Error(`Which step? A number from 1 to ${run.steps.length} (mm run status ${run.slug}).`);
  return n;
};

/** A run by its slug: in the project named, else among the runs of your projects that aren't over. */
async function findRun(env, slug, wanted) {
  if (wanted) {
    const project = await projectNamed(wanted, env);
    const found = await api(env, 'GET', `?project=${project.projectId}&slug=${slug}`);
    if (!found) throw new Error(`${project.name} has no run of ${slug}: mm run start ${wanted} ${slug} --skill=<name> starts one.`);
    return found.run;
  }
  const hits = (await api(env, 'GET')).runs.filter(run => run.slug === slug);
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) throw new Error(`${hits.length} of your projects have a run of ${slug} (${hits.map(run => run.projectName).join(', ')}): name one with --project=<name>.`);
  throw new Error(`No run of ${slug} that isn't over in your projects. A finished one: mm run status ${slug} --project=<name>. A new one: mm run start <project> ${slug} --skill=<name>.`);
}

/** The commit of the project's space here, when GitHub has it; and a warning when it has changes GitHub doesn't. */
function spaceCommit(run, env) {
  const space = localSpaces(env).find(s => s.id === run.project || (s.id === 'mine' && run.projectName === 'your space'));
  if (!space) return {};
  const state = gitState(space.dir);
  if (!state.commit) return {};
  if (state.upstream && state.ahead === 0 && !state.dirty) return { commit: state.commit };
  return { warn: `${space.label} has changes here that aren't on GitHub: another place can't continue with them until they are sent (mm space sync --yes).` };
}

/* ---------- the commands ---------- */

async function list(env, project) {
  const { can } = here(env);
  if (project) {
    const view = await api(env, 'GET', `?project=${project.projectId}`);
    console.log(`${view.name}: ${view.ready ? `${view.ready} ready to continue` : 'nothing waits to continue'}`);
    for (const run of view.runs) console.log(runLine(run, can));
    if (!view.runs.length) console.log('  No runs yet. A session starts one with mm run start.');
    return 0;
  }
  const { runs } = await api(env, 'GET');
  if (!runs.length) return console.log('No runs in your projects that aren\'t over.'), 0;
  for (const name of [...new Set(runs.map(run => run.projectName))]) {
    console.log(name);
    for (const run of runs.filter(r => r.projectName === name)) console.log(runLine(run, can));
  }
  console.log('\nmm run resume <slug> continues one here; mm run <project> also lists the finished ones.');
  return 0;
}

async function start(env, args, flags, flag) {
  const [wanted, rawSlug] = args;
  const skill = flag('skill');
  if (!wanted || !rawSlug || !skill) throw new Error('mm run start <project> <slug> --skill=<name>   (mm run help)');
  const slug = slugOf(rawSlug);
  const file = skillFile(skill, env);
  if (!file) throw new Error(`The ${skill} skill isn't on this computer: mm space sync brings your spaces' skills.`);
  const { steps, whole } = stepsOf(file);
  const project = await projectNamed(wanted, env);
  const { can, name } = here(env);
  const { run } = await api(env, 'POST', '', { action: 'start', project: project.projectId, slug, skill, ...(flag('title') && { title: flag('title') }), steps, place: name, ...(flags.includes('--again') && { again: true }) });
  if (whole) console.log(`ℹ ${skill} has no run sheet (## Where it runs): it runs whole, here, as one step.`);
  console.log(brief(run, can, name));
  return 0;
}

async function step(env, slug, raw, wanted, flags, flag) {
  const run = await findRun(env, slug, wanted);
  const n = stepOf(raw, run);
  const { can, name } = here(env);
  const sheet = run.steps[n - 1];
  const lacks = lacksHere(sheet, can);
  if (lacks.length) {
    const no = `This place doesn't have what step ${n} (${sheet.step}) needs: ${lacks.join(', ')}.`;
    const has = `If this place does have it, say so first (mm access add <need>).`;
    if (!sheet.without) throw new Error(`${no} Post it for a place that has: mm run wait ${slug} ${n}. ${has}`);
    if (!flags.includes('--without')) throw new Error(`${no} The run sheet says what to do without: "${sheet.without}". To do that here: mm run step ${slug} ${n} --without. To post it for a place that has it: mm run wait ${slug} ${n}. ${has}`);
  }
  const hours = Number(flag('hours'));
  const { run: now } = await api(env, 'POST', '', { action: 'step', project: run.project, slug, step: n, place: name, ...(hours > 0 && { hours }), ...(lacks.length && { lacked: lacks }) });
  const started = now.steps[n - 1];
  console.log(`◐ Step ${n} (${started.step}) of ${slug} started here${lacks.length ? `, without ${lacks.join(', ')}: ${sheet.without}` : ''}.`);
  if (run.steps[n - 1].state === 'unsaved' && !started.repeat) console.log("  It was started before and never saved, and it must not happen twice: check first that it didn't already. If it did, only save it with its result.");
  if (started.needsYes) console.log("  It waits for a person's yes: ask the user, here, before doing it.");
  console.log(`  When its work is saved: mm run save ${slug} ${n} --production   (--release for a release kit, --output="<a link>")`);
  return 0;
}

/** Sends a release kit (a folder of the workspace) to the project's Releases, tied to the run's production. */
async function saveRelease(at, run, abs, rel, note, platform) {
  const files = fs.existsSync(abs) ? releaseFiles(abs) : [];
  if (!files.length) throw new Error(`Nothing to save as a release: no files in ${rel} of ${workRoot()}.`);
  const base = path.basename(abs);
  const slug = SLUG.test(base) ? base : run.slug;
  const production = await readBundle(at, 'production', { projectId: run.project, slug: run.slug });
  const result = await saveBundle(at, 'release', { projectId: run.project, slug, title: run.title, files, note, platform, ...(production?.id && { productionId: production.id }) });
  return { slug, files, result };
}

async function save(env, slug, raw, wanted, flags, flag) {
  const run = await findRun(env, slug, wanted);
  const n = stepOf(raw, run);
  const { can, name } = here(env);
  const at = needSignIn(env);
  const work = workRoot();
  const saved = {};
  const made = [];
  if (flags.includes('--production')) {
    const code = path.join(work, 'projects', slug);
    const outputs = path.join(work, 'out', slug);
    const { files, leftOut } = productionFiles({ code: fs.existsSync(code) ? code : null, outputs: fs.existsSync(outputs) ? outputs : null });
    if (!files.length) throw new Error(`Nothing to save as a production: no files in projects/${slug} or out/${slug} of ${work}.`);
    const result = await saveBundle(at, 'production', { projectId: run.project, slug, title: run.title, files, note: `Step ${n}: ${run.steps[n - 1].step}` });
    saved.production = result.version;
    made.push(`production v${result.version}`);
    console.log(result.unchanged ? `  Production ${slug} v${result.version} already holds these files: nothing was sent.` : `  Production ${slug} v${result.version}: ${count(files.length, 'file')}, ${result.uploaded} sent.`);
    if (leftOut) console.log(`  Its inputs were left out (${leftOut.files} files, ${leftOut.mb} MB: a production carries inputs up to 200 MB). Another place needs them from the media library.`);
  }
  const releaseFlag = flags.find(f => f === '--release' || f.startsWith('--release='));
  if (releaseFlag) {
    const folder = (releaseFlag.includes('=') ? releaseFlag.slice('--release='.length) : `out/youtube/${slug}`).replace(/\\/g, '/').replace(/\/+$/, '');
    const abs = path.resolve(work, folder);
    const rel = path.relative(work, abs).split(path.sep).join('/');
    if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error(`The release kit's folder is one of the workspace's (${work}), like out/youtube/${slug}.`);
    const platform = flag('platform') ?? (rel.startsWith('out/youtube/') ? 'youtube' : 'other');
    const { slug: releaseSlug, files, result } = await saveRelease(at, run, abs, rel, `Step ${n}: ${run.steps[n - 1].step}`, platform);
    saved.release = { slug: releaseSlug, version: result.version, folder: rel };
    made.push(`release ${releaseSlug} v${result.version}`);
    console.log(result.unchanged ? `  Release ${releaseSlug} v${result.version} already holds these files: nothing was sent.` : `  Release ${releaseSlug} v${result.version}: ${count(files.length, 'file')}, ${result.uploaded} sent.`);
  }
  const { commit, warn } = spaceCommit(run, env);
  if (commit) saved.commit = commit;
  const output = [flag('output'), ...made].filter(Boolean).join(' · ');
  const { run: now } = await api(env, 'POST', '', { action: 'save', project: run.project, slug, step: n, place: name, ...(output && { output }), ...(Object.keys(saved).length && { saved }) });
  console.log(`✔ Step ${n} (${now.steps[n - 1].step}) of ${slug} is saved${output ? `: ${output}` : ''}.`);
  if (warn) console.log(`⚠ ${warn}`);
  if (now.state === 'done') return console.log(`✔ ${slug} ran to the end.`), 0;
  const next = now.next;
  const lacks = missing(can, next.needs);
  console.log(!lacks.length ? `  Next: step ${next.n} (${next.step}). mm run step ${slug} ${next.n}` : next.without ? `  Next: step ${next.n} (${next.step}). This place has no ${lacks.join(', ')}; the run sheet says what to do without: "${next.without}". mm run step ${slug} ${next.n} --without` : `  Next, step ${next.n} (${next.step}), needs ${lacks.join(', ')}, which this place doesn't have: mm run wait ${slug} ${next.n} posts it for a place that can.`);
  return 0;
}

async function wait(env, slug, raw, wanted, flag) {
  const run = await findRun(env, slug, wanted);
  if (!run.next) throw new Error(`${slug} has no step left.`);
  const n = raw ? stepOf(raw, run) : run.next.n;
  // a release kit here that the run never saved (its step was saved without --release) goes to the
  // project first: the place that picks the to-do up fetches the project's release of this slug
  const kitAbs = path.join(workRoot(), 'out', 'youtube', slug);
  const kit = !run.saved?.release && fs.existsSync(kitAbs) && releaseFiles(kitAbs).length ? await saveRelease(needSignIn(env), run, kitAbs, `out/youtube/${slug}`, `Step ${n}: ${run.steps[n - 1].step} (the kit, handed over with the to-do)`, 'youtube') : null;
  const { run: now, todo } = await api(env, 'POST', '', { action: 'wait', project: run.project, slug, step: n, ...(flag('title') && { title: flag('title') }), ...(flag('notes') && { notes: flag('notes') }) });
  console.log(`◌ Step ${n} (${now.steps[n - 1].step}) of ${slug} waits as to-do ${todo.id}.`);
  console.log(todo.places.length ? `  ${todo.places.join(', ')} can do it.` : "  No open place has what it needs yet: it waits until one does (the project's page, Where it runs).");
  console.log(`  The line for whoever picks it up: ${todo.line}`);
  if (kit) console.log(`  The release kit out/youtube/${slug} wasn't saved with the run: it is now release ${kit.slug} v${kit.result.version} in the project, and the pick-up fetches it. Next time save the kit's step with --release.`);
  if (!run.saved?.production && !run.saved?.release && !kit) console.log(`⚠ The run has saved no production or release yet: whoever picks the to-do up has nothing to fetch. Save the last step's work first next time (mm run save … --production).`);
  console.log(`  This place let go of the run. ${now.steps[n] ? `When the to-do is done the run is ready to continue at step ${n + 1} (${now.steps[n].step}), from any place: ${now.line}` : 'When the to-do is done the run is over.'}`);
  console.log('  End here: a session never waits for a to-do.');
  return 0;
}

/** Fetches what the run saved into the workspace. Returns what it did, in lines; throws on files here that differ. */
export async function fetchSaved(env, run, takeSaved, again = `mm run resume ${run.slug} --take-saved`) {
  const at = needSignIn(env);
  const work = workRoot();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const lines = [];
  const jobs = [];
  if (run.saved?.production) jobs.push({ kind: 'production', slug: run.slug, version: run.saved.production, roots: [path.join(work, 'projects', run.slug), path.join(work, 'out', run.slug)], place: productionPlace(work, run.slug), into: `projects/${run.slug} and out/${run.slug}` });
  if (run.saved?.release) {
    const folder = run.saved.release.folder ?? `out/releases/${run.saved.release.slug}`;
    jobs.push({ kind: 'release', slug: run.saved.release.slug, version: run.saved.release.version, roots: [path.join(work, ...folder.split('/'))], place: releasePlace(work, folder), into: folder });
  } else {
    // the run saved no release kit (a step saved without --release, the kit sent another way): the
    // project's release of the same slug comes instead, when it was made for this production
    const kit = await readBundle(at, 'release', { projectId: run.project, slug: run.slug });
    const production = kit?.release?.productionId && run.saved?.production ? await readBundle(at, 'production', { projectId: run.project, slug: run.slug }) : null;
    if (kit?.latestVersion && (!production?.id || kit.release.productionId === production.id)) {
      const folder = !kit.release?.platform || kit.release.platform === 'youtube' ? `out/youtube/${run.slug}` : `out/releases/${run.slug}`;
      jobs.push({ kind: 'release', slug: run.slug, version: kit.latestVersion, roots: [path.join(work, ...folder.split('/'))], place: releasePlace(work, folder), into: folder, loose: true });
    }
  }
  // look first: when a file here differs, nothing at all is changed
  for (const job of jobs) {
    job.record = await readBundle(at, job.kind, { projectId: run.project, slug: job.slug, version: job.version, links: true });
    if (!job.record) throw new Error(`The project no longer has the ${job.kind} ${job.slug} the run saved.`);
    job.differ = takeSaved ? [] : (await fetchBundle(job.record, job.place, { dry: true })).differ;
  }
  const differ = jobs.flatMap(job => job.differ);
  if (differ.length) {
    const shown = differ.slice(0, 8).map(file => `  ${path.relative(work, file).split(path.sep).join('/')}`);
    throw new Error(`${count(differ.length, 'file')} here differ${differ.length === 1 ? 's' : ''} from what the run saved, so nothing was changed:\n${shown.join('\n')}${differ.length > 8 ? '\n  …' : ''}\nTo go on with the saved ones: ${again} (the ones here are kept in .before-resume/).`);
  }
  for (const job of jobs) {
    const backup = abs => {
      const root = job.roots.find(r => abs.startsWith(r + path.sep)) ?? job.roots[0];
      return path.join(root, '.before-resume', stamp, path.relative(root, abs));
    };
    const result = await fetchBundle(job.record, job.place, { takeSaved, backup });
    lines.push(`${job.kind} ${job.slug} v${job.version}${job.loose ? " (the project's: the run saved none)" : ''} → ${job.into} (${count(result.saved, 'file')} fetched, ${result.unchanged} already here${result.differ.length ? `, ${result.differ.length} of yours kept in .before-resume/` : ''})`);
  }
  return lines;
}

async function resume(env, slug, wanted, flags) {
  const run = await findRun(env, slug, wanted);
  if (run.state === 'done' || run.state === 'cancelled') throw new Error(run.state === 'done' ? `${slug} already ran to the end.` : `${slug} was cancelled.`);
  const { can, name } = here(env);
  const { run: mine } = await api(env, 'POST', '', { action: 'resume', project: run.project, slug, place: name });
  let fetched = [];
  try {
    syncSpace({ project: mine.project, projectName: mine.projectName, skill: mine.skill, commit: mine.saved?.commit }, env, { thing: 'The run', again: `continue it again (mm run resume ${slug})`, made: 'the run last saved with', who: 'the place that saved it' });
    fetched = await fetchSaved(env, mine, flags.includes('--take-saved'));
  } catch (error) {
    await api(env, 'POST', '', { action: 'stop', project: run.project, slug }).catch(() => null);
    throw error;
  }
  console.log(brief(mine, can, name, fetched));
  return 0;
}

/** The session-start line. Never fails, never waits long, says nothing when there is nothing. */
async function hook(env) {
  try {
    const at = signedIn(env);
    if (!at) return 0;
    const [res, open] = await Promise.all([
      fetch(`${at.url}/api/space/runs`, { headers: { Accept: 'application/json', Authorization: `Bearer ${at.key}` }, signal: AbortSignal.timeout(HOOK_MS) }),
      openProjects(at, env, { timeoutMs: HOOK_MS }),
    ]);
    if (!res.ok || open?.size === 0) return 0;
    const { runs = [] } = await res.json();
    if (!runs.some(run => run.state === 'ready')) return 0;
    const line = hookLine(runs, capabilities({ env, asked: askedHere(env) }), open);
    if (line) console.log(line);
  } catch {}
  return 0;
}

async function main(argv = process.argv.slice(2), env = process.env) {
  const flags = argv.filter(a => a.startsWith('--'));
  const [cmd, ...args] = argv.filter(a => !a.startsWith('--'));
  const flag = name => flags.find(f => f.startsWith(`--${name}=`))?.slice(name.length + 3);
  const wanted = flag('project');
  if (flags.includes('--hook')) return hook(env);
  if (flags.includes('--help') || cmd === 'help') {
    console.log(fs.readFileSync(SELF, 'utf8').match(/\/\*\*\n([\s\S]*?)\*\//)[1].split('\n').map(l => l.replace(/^ \* ?/, '')).join('\n').trim());
    return 0;
  }
  if (!cmd) return list(env);
  if (cmd === 'start') return start(env, args, flags, flag);
  if (cmd === 'status') {
    if (!args[0]) return list(env);
    const run = await findRun(env, slugOf(args[0]), wanted);
    console.log(`${run.projectName}\n${runLine(run, here(env).can)}\n${stepLines(run, here(env).can).join('\n')}`);
    if (run.state === 'ready' || run.state === 'waiting') console.log(`  The line to continue it: ${run.line}`);
    return 0;
  }
  if (cmd === 'step') return step(env, slugOf(args[0]), args[1], wanted, flags, flag);
  if (cmd === 'save') return save(env, slugOf(args[0]), args[1], wanted, flags, flag);
  if (cmd === 'wait') return wait(env, slugOf(args[0]), args[1], wanted, flag);
  if (cmd === 'resume' || cmd === 'continue') return resume(env, slugOf(args[0]), wanted, flags);
  if (cmd === 'stop' || cmd === 'cancel') {
    const run = await findRun(env, slugOf(args[0]), wanted);
    await api(env, 'POST', '', { action: cmd, project: run.project, slug: run.slug, ...(cmd === 'cancel' && flag('reason') && { reason: flag('reason') }) });
    console.log(cmd === 'stop' ? `${run.slug} is free: any place that can do its next step may continue it (${run.line}).` : `${run.slug} is cancelled, and so are the to-dos its steps waited for.`);
    return 0;
  }
  return list(env, await projectNamed([cmd, ...args].join(' '), env));
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  main().then(
    code => (process.exitCode = code),
    error => {
      console.error(`mm run: ${error instanceof Error ? error.message : error}`);
      process.exitCode = 1;
    },
  );
}
