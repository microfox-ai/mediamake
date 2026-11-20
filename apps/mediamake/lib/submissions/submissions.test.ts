import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { submissionDecidedMail } from '../mail/templates';
import { suggestGrants, type ContributionPull, type SuggestionPerson } from '../memberships/suggestions';
import type { Membership } from '../memberships/membership';
import { bundleOf, commitMessage, packageEntries, packageProblem, prBody, prTitle, publicSkillFiles, storeFiles } from './delivery';
import { commitFolder, github, GithubError, githubProblem, mergedPulls, openPullRequest, type Fetch } from './github';
import {
  checkFiles,
  countByStatus,
  earnedTier,
  frontMatter,
  ownView,
  parseSubmission,
  productionNeeded,
  pathProblem,
  routeOf,
  standing,
  storePath,
  submissionBranch,
  summarize,
  type Submission,
  type SubmissionFile,
} from './submission';
import { splitPath, tarGz } from './tar';

const SKILL_MD = '---\nname: make-thing\ndescription: Makes a thing from a song and a picture\nmetadata:\n  version: 1.2.0\n---\n\n# make-thing\n';
const file = (path: string, content: string, encoding: 'utf8' | 'base64' = 'utf8'): SubmissionFile => ({ path, content, encoding });
const sent = (over: Record<string, unknown> = {}) => ({
  kind: 'skill',
  name: 'make-thing',
  made: { title: 'Akhilanda Natha lyric video', url: 'https://youtu.be/abc123' },
  files: [{ path: 'SKILL.md', content: SKILL_MD }, { path: 'scripts/run.mjs', content: 'console.log(1)\n' }],
  ...over,
});

const submission = (over: Partial<Submission> = {}): Submission => ({
  submissionId: 'sub_Ab12Cd34Ef56',
  clientId: 'ana',
  tier: 'public',
  kind: 'skill',
  slug: 'make-thing',
  itemId: 'skill/make-thing',
  title: 'Make Thing',
  summary: 'Makes a thing from a song and a picture',
  version: '1.2.0',
  made: { title: 'Akhilanda Natha lyric video', url: 'https://youtu.be/abc123' },
  source: 'mm-submit',
  files: [{ path: 'SKILL.md', bytes: 100 }],
  bytes: 100,
  checks: { problems: [], notes: [] },
  status: 'pending',
  createdAt: '2026-11-17T10:00:00.000Z',
  updatedAt: '2026-11-17T10:00:00.000Z',
  round: 1,
  ...over,
});

describe('what a member sends', () => {
  it('reads the title, summary and version from the skill itself', () => {
    const parsed = parseSubmission(sent());
    assert.ok(!('error' in parsed));
    assert.equal(parsed.slug, 'make-thing');
    assert.equal(parsed.title, 'Make Thing');
    assert.equal(parsed.summary, 'Makes a thing from a song and a picture');
    assert.equal(parsed.version, '1.2.0');
    assert.deepEqual(parsed.made, { title: 'Akhilanda Natha lyric video', url: 'https://youtu.be/abc123' });
    assert.equal(parsed.source, 'mm-submit');
  });

  it('reads an MCP from its item.json', () => {
    const parsed = parseSubmission(sent({ kind: 'mcp', name: 'my-mcp', files: [{ path: 'item.json', content: JSON.stringify({ title: 'My MCP', summary: 'Reads the weather for a shoot day', version: '0.3.0' }) }] }));
    assert.ok(!('error' in parsed));
    assert.deepEqual([parsed.title, parsed.version], ['My MCP', '0.3.0']);
  });

  it('checks a production that is named: a real one, never a test or a demo', () => {
    for (const made of [{ title: 'test' }, { title: 'a demo' }, { title: 'n/a' }]) {
      const parsed = parseSubmission(sent({ made }));
      assert.ok('error' in parsed && /test render or a demo/.test(parsed.error), JSON.stringify(made));
    }
    const parsed = parseSubmission(sent({ made: { title: 'A real video', url: 'http://insecure.example' } }));
    assert.ok('error' in parsed && /https/.test(parsed.error));
  });

  it('lets a sender leave the production out (whether they may is their tier’s), and reads an admin’s publish', () => {
    for (const made of [undefined, {}, { title: '' }]) {
      const parsed = parseSubmission(sent({ made }));
      assert.ok(!('error' in parsed), JSON.stringify(made));
      assert.equal((parsed as { made?: unknown }).made, undefined);
    }
    const published = parseSubmission(sent({ publish: 'cohort' }));
    assert.ok(!('error' in published) && published.publish === 'cohort');
    const wrong = parseSubmission(sent({ publish: 'vault' }));
    assert.ok('error' in wrong && /publish must be one of/.test(wrong.error));
  });

  it('asks members below Cohort for a production, and not Cohort members or admins', () => {
    assert.equal(productionNeeded('public'), true);
    assert.equal(productionNeeded('plus'), true);
    assert.equal(productionNeeded('pro'), true);
    assert.equal(productionNeeded('cohort'), false);
    assert.equal(productionNeeded('admin'), false);
  });

  it('refuses a skill whose name is not its folder, and one with no SKILL.md', () => {
    const wrong = parseSubmission(sent({ name: 'other-name' }));
    assert.ok('error' in wrong && /must match/.test(wrong.error));
    const none = parseSubmission(sent({ files: [{ path: 'README.md', content: 'hi' }] }));
    assert.ok('error' in none && /SKILL\.md/.test(none.error));
  });

  it('refuses paths that leave the folder or never belong in an item', () => {
    for (const path of ['../secrets', '/etc/passwd', 'a/../../b', 'C:\\x', '.env', '.env.local', 'node_modules/x/index.js', '.git/config', 'a//b']) {
      assert.ok(pathProblem(path), path);
    }
    for (const path of ['SKILL.md', 'scripts/run.mjs', 'assets/logo.png', '.gitignore', 'env.example']) assert.equal(pathProblem(path), null, path);
    const parsed = parseSubmission(sent({ files: [{ path: 'SKILL.md', content: SKILL_MD }, { path: '.env', content: 'A=1' }] }));
    assert.ok('error' in parsed);
  });

  it('holds to the size limits', () => {
    const big = parseSubmission(sent({ files: [{ path: 'SKILL.md', content: SKILL_MD }, { path: 'big.txt', content: 'x'.repeat(1024 * 1024 + 1) }] }));
    assert.ok('error' in big && /at most 1 MB/.test(big.error));
    const many = Array.from({ length: 4 }, (_, i) => ({ path: `f${i}.txt`, content: 'x'.repeat(900 * 1024) }));
    const total = parseSubmission(sent({ files: [{ path: 'SKILL.md', content: SKILL_MD }, ...many] }));
    assert.ok('error' in total && /at most 3 MB/.test(total.error));
  });

  it('reads front matter with block descriptions', () => {
    assert.deepEqual(frontMatter('---\nname: x\ndescription: >\n  One line\n  and another\nmetadata:\n  category: other\n---\n'), { name: 'x', description: 'One line and another', 'metadata.category': 'other' });
    assert.deepEqual(frontMatter('no front matter'), {});
  });
});

describe('the leak checks', () => {
  it('stop on keys, tokens and machine paths, and note emails', () => {
    const checks = checkFiles([
      file('SKILL.md', 'Run it from /Users/ana/projects/x\nfine line\n'),
      file('scripts/run.mjs', `const key = 'sk-${'a'.repeat(24)}';\n`),
      file('README.md', 'Write to ana@studio.io\nor noreply@example.com\n'),
    ]);
    assert.deepEqual(checks.problems, ["SKILL.md:1 has a path on someone's computer", 'scripts/run.mjs:1 looks like an API key or token']);
    assert.deepEqual(checks.notes, ['README.md:1 has an email address']);
  });

  it('find nothing in a clean item, and say when text came as bytes', () => {
    assert.deepEqual(checkFiles([file('SKILL.md', SKILL_MD)]), { problems: [], notes: [] });
    assert.match(checkFiles([file('notes.md', Buffer.from('hi').toString('base64'), 'base64')]).notes[0], /sent as binary/);
  });
});

describe('where an accepted item goes and what it earns', () => {
  it('sends only a Public skill to the public repository', () => {
    assert.equal(routeOf('skill', 'public'), 'pr');
    for (const tier of ['plus', 'pro', 'cohort'] as const) assert.equal(routeOf('skill', tier), 'store');
    for (const tier of ['public', 'plus', 'pro', 'cohort'] as const) {
      assert.equal(routeOf('mcp', tier), 'store');
      assert.equal(routeOf('app', tier), 'store');
    }
    assert.equal(storePath('mcp', 'my-mcp'), 'mcps/my-mcp');
    assert.equal(submissionBranch('sub_Ab12-Cd/..'), 'submission/sub_Ab12-Cd');
  });

  it('earns the item\'s tier, Plus for a Public item, and never the cohort', () => {
    assert.deepEqual((['public', 'plus', 'pro', 'cohort'] as const).map(earnedTier), ['plus', 'plus', 'pro', 'pro']);
  });

  it('tells its sender where it stands, without the admin or the private store', () => {
    assert.match(standing(submission()), /Waiting/);
    assert.match(standing(submission({ status: 'changes', review: { by: 'admin', at: 'x', note: 'Add the MCP table' } })), /Add the MCP table/);
    const pr = submission({
      status: 'approved',
      decision: { by: 'admin', at: '2026-11-17T11:00:00.000Z', tier: 'public', membership: { tier: 'plus', membershipId: 'mem_1', expiresAt: '2027-02-17T11:00:00.000Z' } },
      delivery: { kind: 'pr', repo: 'microfox-ai/mediamake', branch: 'submission/sub_1', number: 600, url: 'https://github.com/microfox-ai/mediamake/pull/600', state: 'open', at: 'x' },
    });
    assert.match(standing(pr), /goes live when its pull request merges/);
    const own = ownView(pr) as Record<string, unknown>;
    assert.equal(own.pullRequest, 'https://github.com/microfox-ai/mediamake/pull/600');
    assert.equal(own.clientId, undefined);
    assert.deepEqual(own.decision, { tier: 'public', at: '2026-11-17T11:00:00.000Z', membership: { tier: 'plus', expiresAt: '2027-02-17T11:00:00.000Z' } });
    const stored = ownView(submission({ status: 'live', decision: { by: 'admin', at: 'x', tier: 'pro' }, delivery: { kind: 'store', repo: 'microfox-ai/mediamake-store', path: 'skills/make-thing', commit: 'abc', commitUrl: 'https://github.com/x', version: '1.2.0', released: true, at: 'x' } })) as Record<string, unknown>;
    assert.equal(JSON.stringify(stored).includes('mediamake-store'), false);
    assert.match(String(stored.standing), /Live, as a Pro item in Beta/);
    assert.equal(countByStatus([submission(), submission({ status: 'live' })]).pending, 1);
  });
});

describe('what an approval writes', () => {
  const files = [file('SKILL.md', SKILL_MD), file('scripts/run.sh', 'echo hi\n'), file('assets/logo.png', Buffer.from([1, 2, 3]).toString('base64'), 'base64')];

  it('puts a Public skill in .agents/skills with its link', () => {
    const tree = publicSkillFiles('make-thing', files);
    assert.equal(tree.folder, '.agents/skills/make-thing');
    assert.deepEqual(tree.files.map(f => f.path), ['.agents/skills/make-thing/SKILL.md', '.agents/skills/make-thing/scripts/run.sh', '.agents/skills/make-thing/assets/logo.png']);
    assert.deepEqual(tree.extra, [{ path: '.claude/skills/make-thing', content: '../../.agents/skills/make-thing', encoding: 'utf8', mode: '120000' }]);
  });

  it('writes the pull request as the template asks, naming the production and never the sender\'s name', () => {
    const body = prBody(submission(), { by: 'ana-codes', update: false, site: 'https://mediamake.microfox.app' });
    assert.match(body, /## Made with this\n\n- \[Akhilanda Natha lyric video\]\(https:\/\/youtu\.be\/abc123\)/);
    assert.match(body, /by ana-codes on GitHub/);
    assert.match(body, /## What changed/);
    assert.match(body, /## Checked/);
    assert.match(prBody(submission(), { update: true, site: 'https://x' }), /by a member/);
    assert.equal(prTitle(submission(), false), 'Add make-thing: Make Thing');
    assert.match(commitMessage(submission(), 'pro', true), /^Update skill\/make-thing 1\.2\.0 \(Pro\)/);
  });

  it('gives the store folder a catalog.json with the tier, in Beta', () => {
    const tree = storeFiles(submission(), 'pro', [...files, file('catalog.json', JSON.stringify({ tags: ['music'], tier: 'public' }))]);
    assert.equal(tree.folder, 'skills/make-thing');
    const catalog = JSON.parse(tree.files.find(f => f.path === 'skills/make-thing/catalog.json')!.content);
    assert.deepEqual(catalog, { tags: ['music'], tier: 'pro', kind: 'skill', slug: 'make-thing', title: 'Make Thing', summary: 'Makes a thing from a song and a picture', version: '1.2.0', status: 'beta', madeWith: submission().made });
    assert.equal(tree.files.filter(f => f.path.endsWith('catalog.json')).length, 1);
  });

  it('releases an MCP only with its built bundle', () => {
    assert.match(packageProblem('mcp', [{ path: 'item.json' }, { path: 'src/index.ts' }])!, /no built \.mcpb/);
    assert.equal(packageProblem('mcp', [{ path: 'my-mcp.mcpb' }]), null);
    assert.equal(bundleOf([{ path: 'dist/inner.mcpb' }, { path: 'my-mcp.mcpb' }]), 'my-mcp.mcpb');
    assert.equal(packageProblem('skill', [{ path: 'SKILL.md' }]), null);
  });

  it('builds a package tar reads back', () => {
    const tree = storeFiles(submission(), 'plus', files);
    const dir = mkdtempSync(join(tmpdir(), 'submission-tar-'));
    try {
      writeFileSync(join(dir, 'p.tar.gz'), tarGz(packageEntries(tree.folder, tree.files)));
      execFileSync('tar', ['-xzf', join(dir, 'p.tar.gz'), '-C', dir]);
      assert.equal(readFileSync(join(dir, 'SKILL.md'), 'utf8'), SKILL_MD);
      assert.deepEqual([...readFileSync(join(dir, 'assets/logo.png'))], [1, 2, 3]);
      assert.equal(JSON.parse(readFileSync(join(dir, 'catalog.json'), 'utf8')).tier, 'plus');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    assert.deepEqual(splitPath(`${'a'.repeat(90)}/${'b'.repeat(60)}.md`), { prefix: 'a'.repeat(90), name: `${'b'.repeat(60)}.md` });
    assert.equal(splitPath('x'.repeat(120)), null);
  });

  it('writes the mails', () => {
    const accepted = submissionDecidedMail('ana@example.com', { item: 'Make Thing', outcome: 'accepted', tier: 'Pro', where: 'It is live in Explore now, in Beta.', membership: 'Pro, until 17 Feb 2027 (contributing again renews it)', url: 'https://x/app/subscription' });
    assert.match(accepted.text, /accepted into the MediaMake store as a Pro item/);
    assert.match(accepted.text, /earned you a membership: Pro, until 17 Feb 2027/);
    assert.match(submissionDecidedMail('a@example.com', { item: 'Make Thing', outcome: 'changes', note: 'Add the MCP table', url: 'https://x' }).text, /Add the MCP table/);
    assert.match(submissionDecidedMail('a@example.com', { item: 'Make Thing', outcome: 'declined', note: 'Too close to pack-brand-kit', url: 'https://x' }).subject, /About your submission/);
  });
});

/** A GitHub that remembers what it was asked. */
function fakeGithub(routes: (method: string, path: string, body: any) => { status?: number; json: unknown } | undefined) {
  const calls: { method: string; path: string; body: any }[] = [];
  const fetchImpl: Fetch = async (url, init) => {
    const path = url.replace('https://api.github.com', '');
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const method = init?.method ?? 'GET';
    calls.push({ method, path, body });
    const answer = routes(method, path, body) ?? { status: 404, json: { message: 'Not Found' } };
    return new Response(JSON.stringify(answer.json), { status: answer.status ?? 200 });
  };
  return { gh: github('token', fetchImpl), calls };
}

describe('the commit and the pull request', () => {
  const repoRoutes = (extra?: (method: string, path: string, body: any) => { status?: number; json: unknown } | undefined) => (method: string, path: string, body: any) => {
    const special = extra?.(method, path, body);
    if (special) return special;
    if (method === 'GET' && path.endsWith('/git/ref/heads/main')) return { json: { object: { sha: 'base1' } } };
    if (method === 'GET' && path.endsWith('/git/commits/base1')) return { json: { tree: { sha: 'tree1' } } };
    if (method === 'GET' && path.includes('/git/trees/tree1')) {
      return { json: { tree: [{ path: 'skills/make-thing/old.md', type: 'blob' }, { path: 'skills/make-thing/SKILL.md', type: 'blob' }, { path: 'skills/other/SKILL.md', type: 'blob' }, { path: 'skills/make-thing', type: 'tree' }] } };
    }
    if (method === 'POST' && path.endsWith('/git/blobs')) return { json: { sha: `blob:${body.content.slice(0, 8)}` } };
    if (method === 'POST' && path.endsWith('/git/trees')) return { json: { sha: 'tree2' } };
    if (method === 'POST' && path.endsWith('/git/commits')) return { json: { sha: 'commit2' } };
    if (path.includes('/git/refs')) return { json: {} };
    return undefined;
  };

  it('replaces the folder in one commit on main: new files in, dropped files out', async () => {
    const { gh, calls } = fakeGithub(repoRoutes());
    const result = await commitFolder(gh, {
      repo: 'microfox-ai/mediamake-store',
      folder: 'skills/make-thing',
      files: [{ path: 'skills/make-thing/SKILL.md', content: SKILL_MD, encoding: 'utf8' }, { path: 'skills/make-thing/logo.png', content: 'AQID', encoding: 'base64' }],
      message: 'Add it',
    });
    assert.deepEqual(result, { sha: 'commit2', url: 'https://github.com/microfox-ai/mediamake-store/commit/commit2', removed: 1 });
    const tree = calls.find(c => c.method === 'POST' && c.path.endsWith('/git/trees'))!.body;
    assert.equal(tree.base_tree, 'tree1');
    assert.deepEqual(tree.tree.map((e: any) => [e.path, e.sha === null]), [['skills/make-thing/SKILL.md', false], ['skills/make-thing/logo.png', false], ['skills/make-thing/old.md', true]]);
    assert.deepEqual(calls.filter(c => c.path.endsWith('/git/blobs')).map(c => c.body.encoding), ['utf-8', 'base64']);
    assert.deepEqual(calls.at(-1), { method: 'PATCH', path: '/repos/microfox-ai/mediamake-store/git/refs/heads/main', body: { sha: 'commit2' } });
    assert.deepEqual(calls.find(c => c.path.endsWith('/git/commits') && c.method === 'POST')!.body, { message: 'Add it', tree: 'tree2', parents: ['base1'] });
  });

  it('makes a branch for a pull request, with the skill\'s link as a symlink, and moves a branch it made before', async () => {
    const { gh, calls } = fakeGithub(repoRoutes((method, path) => (method === 'POST' && path.endsWith('/git/refs') ? { status: 422, json: { message: 'Reference already exists' } } : undefined)));
    const tree = publicSkillFiles('make-thing', [file('SKILL.md', SKILL_MD)]);
    await commitFolder(gh, { repo: 'microfox-ai/mediamake', branch: 'submission/sub_1', ...tree, message: 'Add make-thing' });
    const sentTree = calls.find(c => c.method === 'POST' && c.path.endsWith('/git/trees'))!.body.tree;
    assert.deepEqual(sentTree.find((e: any) => e.path === '.claude/skills/make-thing').mode, '120000');
    assert.deepEqual(calls.at(-1), { method: 'PATCH', path: '/repos/microfox-ai/mediamake/git/refs/heads/submission/sub_1', body: { sha: 'commit2', force: true } });
  });

  it('opens a pull request, or takes the open one of the same branch', async () => {
    const fresh = fakeGithub((method, path) => (method === 'POST' && path.endsWith('/pulls') ? { status: 201, json: { number: 600, html_url: 'https://github.com/o/r/pull/600' } } : undefined));
    assert.deepEqual(await openPullRequest(fresh.gh, { repo: 'o/r', head: 'submission/sub_1', title: 'Add x', body: 'b' }), { number: 600, url: 'https://github.com/o/r/pull/600' });
    assert.deepEqual(fresh.calls[0].body, { title: 'Add x', head: 'submission/sub_1', base: 'main', body: 'b' });
    const again = fakeGithub((method, path) =>
      method === 'POST' ? { status: 422, json: { message: 'A pull request already exists' } } : method === 'GET' && path.includes('head=o%3Asubmission%2Fsub_1') ? { json: [{ number: 600, html_url: 'https://github.com/o/r/pull/600' }] } : { json: {} },
    );
    assert.equal((await openPullRequest(again.gh, { repo: 'o/r', head: 'submission/sub_1', title: 'Add x', body: 'b' })).number, 600);
  });

  it('says what a refusal means', async () => {
    const { gh } = fakeGithub(() => ({ status: 404, json: { message: 'Not Found' } }));
    const error = await commitFolder(gh, { repo: 'microfox-ai/mediamake-store', folder: 'skills/x', files: [], message: 'm' }).catch(e => e);
    assert.ok(error instanceof GithubError);
    assert.match(githubProblem(error, 'microfox-ai/mediamake-store'), /does not exist yet, it has no main branch, or the token cannot see it/);
    assert.match(githubProblem(new GithubError(403, '/x'), 'o/r'), /write contents and pull requests/);
    assert.match(githubProblem(new Error('socket'), 'o/r'), /could not be reached/);
  });

  it('lists merged pull requests since a day, without bots and unmerged ones', async () => {
    const { gh } = fakeGithub(() => ({
      json: [
        { number: 1, html_url: 'https://github.com/o/r/pull/1', title: 'Fix a thing', merged_at: '2026-11-10T00:00:00Z', user: { login: 'Ana-Codes', id: 7, type: 'User' } },
        { number: 2, html_url: 'https://github.com/o/r/pull/2', title: 'Closed', merged_at: null, user: { login: 'ana-codes', id: 7, type: 'User' } },
        { number: 3, html_url: 'https://github.com/o/r/pull/3', title: 'Version Packages', merged_at: '2026-11-11T00:00:00Z', user: { login: 'github-actions[bot]', id: 9, type: 'Bot' } },
        { number: 4, html_url: 'https://github.com/o/r/pull/4', title: 'Old', merged_at: '2026-01-01T00:00:00Z', user: { login: 'ana-codes', id: 7, type: 'User' } },
      ],
    }));
    assert.deepEqual(await mergedPulls(gh, 'o/r', '2026-09-01T00:00:00Z'), [{ repo: 'o/r', number: 1, url: 'https://github.com/o/r/pull/1', title: 'Fix a thing', login: 'Ana-Codes', githubId: '7', mergedAt: '2026-11-10T00:00:00Z' }]);
  });
});

describe('suggested grants from merged pull requests', () => {
  const now = Date.parse('2026-11-17T00:00:00Z');
  const pull = (number: number, login: string, mergedAt = '2026-11-10T00:00:00Z'): ContributionPull => ({ repo: 'o/r', number, url: `https://github.com/o/r/pull/${number}`, title: `PR ${number}`, login, mergedAt });
  const record = (over: Partial<Membership>): Membership => ({ membershipId: 'mem_1', clientId: 'ana', tier: 'plus', source: 'contribution', grantedAt: '2026-10-01T00:00:00Z', ...over });
  const person = (over: Partial<SuggestionPerson> = {}): SuggestionPerson => ({ clientId: 'ana', name: 'Ana', githubLogin: 'ana-codes', tier: 'public', isAdmin: false, records: [], ...over });

  it('suggests Plus for a linked account, matching the login whatever its case', () => {
    const [suggestion] = suggestGrants({ pulls: [pull(1, 'Ana-Codes'), pull(2, 'someone-else')], people: [person(), person({ clientId: 'bo', githubLogin: undefined })], dismissed: [] }, now);
    assert.deepEqual([suggestion.clientId, suggestion.tier, suggestion.renews, suggestion.pulls.map(p => p.number)], ['ana', 'plus', false, [1]]);
  });

  it('leaves out admins, memberships with no end date, counted and dismissed pull requests', () => {
    const pulls = [pull(1, 'ana-codes'), pull(2, 'ana-codes', '2026-11-12T00:00:00Z')];
    assert.deepEqual(suggestGrants({ pulls, people: [person({ isAdmin: true })], dismissed: [] }, now), []);
    assert.deepEqual(suggestGrants({ pulls, people: [person({ tier: 'pro', records: [record({ tier: 'pro', source: 'admin' })] })], dismissed: [] }, now), []);
    const counted = suggestGrants({ pulls, people: [person({ tier: 'plus', records: [record({ ref: 'https://github.com/o/r/pull/1', expiresAt: '2027-01-01T00:00:00Z' })] })], dismissed: [] }, now);
    assert.deepEqual([counted[0].renews, counted[0].pulls.map(p => p.number)], [true, [2]]);
    assert.deepEqual(suggestGrants({ pulls, people: [person()], dismissed: ['o/r#1', 'o/r#2'] }, now), []);
  });
});

describe('the file list', () => {
  it('sums bytes and marks binaries', () => {
    assert.deepEqual(summarize([file('b.png', 'AQID', 'base64'), file('a.md', 'héllo')]), [{ path: 'a.md', bytes: 6 }, { path: 'b.png', bytes: 3, binary: true }]);
  });
});
