#!/usr/bin/env node
/**
 * todo: a project's to-do queue (apps/mediamake/docs/cloud-device-runs.md). A to-do is a step one place
 * could not do, posted for a place that can: a cloud session that reaches a step needing a computer
 * posts it and ends, and someone with a computer that has what the step needs picks it up.
 *
 *   mm todo                        what waits in your projects, and which of it this computer can do
 *   mm todo <project>              one project's to-dos, the finished ones too ("mine" is your own space)
 *   mm todo show <id>              one to-do
 *   mm todo post <project> "<what to do>" --needs=<need,need> [--skill=<name>] [--step="<step>"]
 *        [--production=<slug> | --release=<slug>] [--version=<v>] [--commit=<sha>] [--notes="…"]
 *        [--then="…"] [--yes] [--repeat] [--options="A|B|C"]
 *                                  posts one. --yes: it must wait for a person's yes. --repeat: doing it
 *                                  twice does no harm. --options: a choice for a person, not a step.
 *                                  The same step of the same work and version is posted once.
 *   mm todo pick <id>              picks it up: claims it (only one claim succeeds), brings the project's
 *                                  space up to date, and says what to do and how to finish
 *   mm todo done <id> [--result="<the link, or what came of it>"]
 *   mm todo fail <id> --reason="<why>"     back to the queue; the third failure stops it for a person
 *   mm todo release <id>           gives it back, not as a failure
 *   mm todo yes <id>               a person's yes, for a step that waits for one
 *   mm todo cancel <id> [--reason="…"]   |   mm todo reopen <id>
 *   mm todo --hook                 the session-start line (.claude/settings.json): quiet unless this
 *                                  computer can do something that waits
 *
 * "Pick up to-do <id> in <project>", pasted into Claude, is mm todo pick <id>.
 * Everyone on the project reads a to-do: its words never hold a key or a password.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { askedHere, capabilities, placeReport } from './access.mjs';
import { missing, needList } from './places.mjs';
import { findProject, localSpaces, remoteSpaces } from './space.mjs';
import { apiKey, call, localSkills, site, skillRoots } from './usage.mjs';

const SELF = fileURLToPath(import.meta.url);
const HOOK_MS = 4000;
const ID = /^td-[a-z0-9]{6}$/;

/** What a to-do needs that this place doesn't have. */
export const missingHere = (todo, can) => missing(can, todo.needs.map(n => n.need));

const clock = iso => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const MARK = { open: '○', claimed: '◐', done: '✔', failed: '✖', cancelled: '–' };

/** One to-do in a list: its state, what it needs and whether this computer can do it. */
export function todoLine(todo, can) {
  const needs = todo.needs.map(n => n.need);
  const lacks = missingHere(todo, can);
  const tail =
    todo.state === 'claimed'
      ? `${todo.claimedBy} ${todo.claimedBy === 'You' ? 'have' : 'has'} it${todo.claimedOn ? ` on ${todo.claimedOn}` : ''} since ${clock(todo.claimedAt)}`
      : todo.state === 'done'
        ? `done by ${todo.doneBy ?? 'someone'}${todo.result ? `: ${todo.result}` : ''}`
        : todo.state === 'failed'
          ? `failed ${todo.failures} times${todo.reason ? `: ${todo.reason}` : ''}   (mm todo reopen ${todo.id})`
          : todo.state === 'cancelled'
            ? `cancelled${todo.reason ? `: ${todo.reason}` : ''}`
            : todo.options
              ? `a choice for a person: ${todo.options.join(' | ')}`
              : `${needs.length ? `needs ${needs.join(', ')}` : 'needs nothing special'} · ${lacks.length ? `not this computer (no ${lacks.join(', ')})${todo.places.length ? `; ${todo.places.join(', ')} can` : ''}` : 'this computer can do it'}${todo.needsYes ? " · waits for a person's yes" : ''}`;
  return `  ${MARK[todo.state] ?? '?'} ${todo.id}  ${todo.title}\n      ${tail}`;
}

/** The session-start line: what waits that this computer can do. Empty when there is nothing. */
export function hookLine(todos, can) {
  const able = todos.filter(todo => todo.state === 'open' && !todo.options && !missingHere(todo, can).length);
  if (!able.length) return '';
  const first = able.slice(0, 3).map(todo => `${todo.id} "${todo.title}" (${todo.projectName})`);
  return `MediaMake: ${able.length === 1 ? 'a to-do waits' : `${able.length} to-dos wait`} that this computer can do: ${first.join('; ')}${able.length > 3 ? '; …' : ''}. Tell the user, and pick one up only when they say so: mm todo pick <id>.`;
}

/** What to do with a to-do that was just picked up, for the person or the Claude that did. */
export function brief(todo, place) {
  const lines = [`✔ ${todo.id} is yours${place ? `, on ${place}` : ''}. Unfinished, it goes back to the queue by itself after 2 hours.`, '', todo.title, `  Project   ${todo.projectName}`];
  if (todo.skill) lines.push(`  Skill     ${todo.skill}${todo.step ? `, step "${todo.step}"` : ''}: follow that skill for this step only`);
  else if (todo.step) lines.push(`  Step      ${todo.step}`);
  const work = todo.release ? `release ${todo.release}` : todo.production ? `production ${todo.production}` : '';
  if (work) lines.push(`  Works on  ${work}${todo.version ? `, version ${todo.version}` : ''}: get it from the project with the MediaMake Spaces MCP (get_${todo.release ? 'release' : 'production'} with saveTo)`);
  if (todo.needs.length) lines.push(`  Needs     ${todo.needs.map(n => n.need).join(', ')}`);
  if (todo.notes) lines.push(`  Notes     ${todo.notes.replace(/\n/g, '\n            ')}`);
  if (todo.then) lines.push(`  Then      ${todo.then}`);
  lines.push('');
  if (!todo.repeat) lines.push("Before you start: this step must not happen twice. Check that it didn't already (a link on the release, the video on the channel). If it did, only record the result.");
  if (todo.needsYes) lines.push(`It waits for a person's yes: ask the user, here, before doing it. When they agree: mm todo yes ${todo.id}`);
  lines.push(
    `When it is done:    mm todo done ${todo.id} --result="<the link, or what came of it>"`,
    `If it fails:        mm todo fail ${todo.id} --reason="<why>"   (it goes back to the queue)`,
    `Not now after all:  mm todo release ${todo.id}`,
  );
  return lines.join('\n');
}

/** A post from the command line: mm todo post <project> "<title>" --needs=a,b … */
export function postBody(project, title, flags) {
  const flag = name => flags.find(f => f.startsWith(`--${name}=`))?.slice(name.length + 3);
  const asked = (flag('needs') ?? '').split(',').map(n => n.trim()).filter(n => n && n !== 'nothing');
  const needs = needList(asked);
  if (needs.length !== new Set(asked).size) throw new Error(`--needs has a word that isn't one of: render, key:<name>, mcp:<id>, app:<name>, browser:<site>[/<account>], media:library (${asked.filter(n => !needs.includes(n)).join(', ')})`);
  const options = flag('options')?.split('|').map(o => o.trim()).filter(Boolean);
  return {
    action: 'post',
    project,
    title,
    needs,
    ...Object.fromEntries(['skill', 'step', 'production', 'release', 'version', 'commit', 'notes', 'then'].flatMap(name => (flag(name) ? [[name, flag(name)]] : []))),
    ...(flags.includes('--yes') && { yes: true }),
    ...(flags.includes('--repeat') && { repeat: true }),
    ...(options && { options }),
  };
}

const signedIn = (env = process.env) => {
  const url = site(env);
  const key = apiKey(url, env);
  return key ? { url, key: key.key } : null;
};
const needSignIn = env => {
  const at = signedIn(env);
  if (!at) throw new Error(`This computer isn't signed in to ${site(env)}: mm login.`);
  return at;
};
const api = (env, method, query = '', body) => {
  const at = needSignIn(env);
  return call(method, `${at.url}/api/space/todos${query}`, at.key, body);
};
const here = env => {
  const report = placeReport({ env });
  return { can: report.can, name: report.name ?? report.device };
};
const idOf = raw => {
  const id = String(raw ?? '').trim().toLowerCase();
  if (!ID.test(id)) throw new Error('Which to-do? Its id: td-… (mm todo lists them).');
  return id;
};

/** A project by name or id, "mine" for the account's own space. */
async function projectNamed(wanted, env) {
  if (!wanted) throw new Error('Which project? Its name or id ("mine" for your own space).');
  const remote = await remoteSpaces(env);
  if (!remote) throw new Error(`This computer isn't signed in to ${site(env)}: mm login.`);
  if (wanted === 'mine') {
    if (!remote.personalProjectId) throw new Error("Your own space has no files side yet: open Spaces in the app once, then try again.");
    return { projectId: remote.personalProjectId, name: 'your space' };
  }
  return findProject(remote, wanted);
}

/** Asks, and on a refusal that names who has it, says so. */
async function ask(env, body) {
  const at = needSignIn(env);
  const res = await fetch(`${at.url}/api/space/todos`, { method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${at.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const data = await res.json().catch(() => ({}));
  if (res.ok) return data;
  const held = data.todo?.state === 'claimed' && !data.todo.mine ? ` ${data.todo.claimedBy} has it${data.todo.claimedOn ? ` on ${data.todo.claimedOn}` : ''} since ${clock(data.todo.claimedAt)}.` : '';
  throw new Error(`${data.error ?? `MediaMake answered ${res.status}`}.${held}`);
}

/** Brings the project's space here up to GitHub, and checks it has the code the to-do was made with. Throws with what to do when it can't. */
function syncSpace(todo, env) {
  const space = localSpaces(env).find(s => s.id === todo.project || (s.id === 'mine' && todo.projectName === 'your space'));
  if (!space) {
    // without the space, the step can still be done when its skill is here another way (one of MediaMake's own)
    if (todo.skill && !localSkills([path.join(path.dirname(SELF), '..', '.claude', 'skills'), ...skillRoots(env)]).some(skill => skill.name === todo.skill)) {
      throw new Error(`The to-do needs the ${todo.skill} skill, which isn't on this computer: ${todo.projectName === 'your space' ? 'mm space sync' : `mm space join ${todo.project}`} brings the space that has it.`);
    }
    return;
  }
  const pulled = spawnSync(process.execPath, [path.join(path.dirname(SELF), 'space.mjs'), 'pull', space.id === 'mine' ? '--mine' : `--project=${space.id}`], { stdio: 'inherit', env });
  if (pulled.status !== 0) throw new Error(`${space.label} could not be brought up to date (above). Fix that, then pick the to-do up again.`);
  if (todo.commit && spawnSync('git', ['-C', space.dir, 'merge-base', '--is-ancestor', todo.commit, 'HEAD']).status !== 0) {
    throw new Error(`${space.label} here doesn't have the code this to-do was made with (commit ${todo.commit.slice(0, 7)}): whoever posted it has to send it first (mm space sync --yes there).`);
  }
}

async function list(env, project) {
  const { can } = here(env);
  if (project) {
    const view = await api(env, 'GET', `?project=${project.projectId}`);
    console.log(`${view.name}: ${view.waiting ? `${view.waiting} to do` : 'nothing waits'}`);
    for (const todo of view.todos) console.log(todoLine(todo, can));
    if (!view.todos.length) console.log('  No to-dos yet. A session posts one when it reaches a step it cannot do: mm todo post');
    return 0;
  }
  const { todos } = await api(env, 'GET');
  if (!todos.length) return console.log('Nothing waits in your projects.'), 0;
  for (const name of [...new Set(todos.map(todo => todo.projectName))]) {
    console.log(name);
    for (const todo of todos.filter(t => t.projectName === name)) console.log(todoLine(todo, can));
  }
  console.log('\nmm todo pick <id> picks one up; mm todo <project> also lists the finished ones.');
  return 0;
}

async function pick(env, id) {
  const { todo } = await api(env, 'GET', `?id=${id}`);
  if (todo.options) throw new Error(`It is a choice for a person (${todo.options.join(' | ')}): ask the user, then mm todo done ${id} --result="<their choice>"`);
  const { can, name } = here(env);
  const lacks = missingHere(todo, can);
  if (lacks.length) {
    throw new Error(`This computer doesn't have what it needs: ${lacks.join(', ')}.${todo.places.length ? ` ${todo.places.join(', ')} can do it.` : ''} If this computer does have it, say so (mm access add <need>) and pick it up again.`);
  }
  const claimed = (await ask(env, { action: 'claim', id, place: name })).todo;
  try {
    syncSpace(claimed, env);
  } catch (error) {
    await ask(env, { action: 'release', id }).catch(() => null);
    throw error;
  }
  console.log(brief(claimed, name));
  return 0;
}

/** The session-start line. Never fails, never waits long, says nothing when there is nothing. */
async function hook(env) {
  try {
    const at = signedIn(env);
    if (!at) return 0;
    const res = await fetch(`${at.url}/api/space/todos`, { headers: { Accept: 'application/json', Authorization: `Bearer ${at.key}` }, signal: AbortSignal.timeout(HOOK_MS) });
    if (!res.ok) return 0;
    const { todos = [] } = await res.json();
    if (!todos.length) return 0;
    const line = hookLine(todos, capabilities({ env, asked: askedHere(env) }));
    if (line) console.log(line);
  } catch {}
  return 0;
}

async function main(argv = process.argv.slice(2), env = process.env) {
  const flags = argv.filter(a => a.startsWith('--'));
  const [cmd, ...args] = argv.filter(a => !a.startsWith('--'));
  const flag = name => flags.find(f => f.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (flags.includes('--hook')) return hook(env);
  if (flags.includes('--help') || cmd === 'help') {
    console.log(fs.readFileSync(SELF, 'utf8').match(/\/\*\*\n([\s\S]*?)\*\//)[1].split('\n').map(l => l.replace(/^ \* ?/, '')).join('\n').trim());
    return 0;
  }
  if (!cmd) return list(env);
  if (cmd === 'show') {
    const { todo } = await api(env, 'GET', `?id=${idOf(args[0])}`);
    console.log(`${todo.projectName}\n${todoLine(todo, here(env).can)}`);
    for (const [name, value] of [['Skill', todo.skill], ['Step', todo.step], ['Release', todo.release], ['Production', todo.production], ['Version', todo.version], ['Notes', todo.notes], ['Then', todo.then], ['Posted', `${todo.postedBy}${todo.postedFrom ? ` from ${todo.postedFrom}` : ''}, ${clock(todo.postedAt)}`], ['Line', todo.line]]) if (value) console.log(`      ${name}: ${value}`);
    return 0;
  }
  if (cmd === 'post') {
    const [wanted, ...words] = args;
    const title = words.join(' ').trim();
    if (!title) throw new Error('mm todo post <project> "<what to do>" --needs=<need,need>   (mm todo help)');
    const project = await projectNamed(wanted, env);
    const { name } = here(env);
    const { todo, existing } = await ask(env, { ...postBody(project.projectId, title, flags), from: name });
    console.log(existing ? `It already waits as ${todo.id}: nothing new was posted.` : `✔ Posted ${todo.id} in ${todo.projectName}: ${todo.title}`);
    console.log(todo.places.length ? `  ${todo.places.join(', ')} can do it.` : todo.options ? '  A person answers it on the project\'s page, To do.' : '  No open place has what it needs yet: it waits until one does (the project\'s page, Where it runs).');
    console.log(`  The line for whoever picks it up: ${todo.line}`);
    return 0;
  }
  if (cmd === 'pick' || cmd === 'run') return pick(env, idOf(args[0]));
  if (cmd === 'done') {
    const { todo } = await ask(env, { action: 'done', id: idOf(args[0]), ...(flag('result') && { result: flag('result') }) });
    console.log(`✔ ${todo.id} is done${todo.result ? `: ${todo.result}` : ''}.${todo.then ? ` Next: ${todo.then}` : ''}`);
    return 0;
  }
  if (cmd === 'fail') {
    if (!flag('reason')) throw new Error('mm todo fail <id> --reason="<why>"');
    const { todo } = await ask(env, { action: 'fail', id: idOf(args[0]), reason: flag('reason') });
    console.log(todo.state === 'failed' ? `✖ ${todo.id} failed ${todo.failures} times: it stops here until a person looks (mm todo reopen ${todo.id}).` : `${todo.id} is back in the queue (failed ${todo.failures} of 3).`);
    return 0;
  }
  if (cmd === 'release' || cmd === 'yes' || cmd === 'reopen' || cmd === 'cancel') {
    const { todo } = await ask(env, { action: cmd, id: idOf(args[0]), ...(cmd === 'cancel' && flag('reason') && { reason: flag('reason') }) });
    console.log({ release: `${todo.id} is back in the queue.`, yes: `✔ ${todo.id} has a person's yes.`, reopen: `${todo.id} is open again.`, cancel: `${todo.id} is cancelled.` }[cmd]);
    return 0;
  }
  if (ID.test(cmd.toLowerCase())) return main(['show', cmd, ...flags], env);
  return list(env, await projectNamed([cmd, ...args].join(' '), env));
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  main().then(
    code => (process.exitCode = code),
    error => {
      console.error(`mm todo: ${error instanceof Error ? error.message : error}`);
      process.exitCode = 1;
    },
  );
}
