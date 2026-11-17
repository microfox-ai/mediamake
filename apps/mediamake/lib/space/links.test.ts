import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { syncCollaborators } from './github';
import {
  addInvite,
  addPerson,
  collaboratorsOf,
  itemRepoName,
  linkedSummary,
  linkProject,
  parseLinkAction,
  parseNewLink,
  reconcilePlan,
  removePerson,
  roleOn,
  takeLinkInvite,
  unlinkProject,
  type LinkRecord,
} from './links';
import { parseSpaceReport, repoName } from './space';

const ZONE = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const KIDS = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const ID = 'cccccccccccccccccccccccc';
const T0 = '2026-11-17T10:00:00.000Z';
const T1 = '2026-11-17T11:00:00.000Z';
const link = (more: Partial<LinkRecord> = {}): LinkRecord => ({ id: ID, owner: 'ann', kind: 'skill', name: 'make-zone-intro', repo: 'ann/mediamake-skill-make-zone-intro', projects: [], people: [], invites: [], createdAt: T0, updatedAt: T0, ...more });

describe('who has a linked item', () => {
  const item = link({ projects: [{ id: ZONE, by: 'ann', at: T0 }], people: [{ clientId: 'eve', editor: true, by: 'ann', at: T0 }, { clientId: 'dan', by: 'ann', at: T0 }] });

  it('its owner, the editors the owner named, the members named, and everyone on a linked project', () => {
    assert.equal(roleOn(item, 'ann', []), 'owner');
    assert.equal(roleOn(item, 'eve', []), 'editor');
    assert.equal(roleOn(item, 'dan', []), 'user');
    assert.equal(roleOn(item, 'bob', [ZONE]), 'user');
    assert.equal(roleOn(item, 'bob', [KIDS]), null);
    assert.equal(roleOn(item, 'bob', []), null);
  });

  it('being an editor of a linked project does not make someone an editor of the item', () => {
    assert.deepEqual([...collaboratorsOf(item, new Map([[ZONE, ['ann', 'bob', 'cy']]]))], [['bob', 'pull'], ['cy', 'pull'], ['eve', 'push'], ['dan', 'pull']]);
  });

  it('unlinking a project takes it from that project\'s people only', () => {
    const two = linkProject(item, KIDS, 'ann', T1);
    const members = new Map([[ZONE, ['ann', 'bob']], [KIDS, ['ann', 'bob', 'kim']]]);
    assert.deepEqual([...collaboratorsOf(two, members).keys()], ['bob', 'kim', 'eve', 'dan']);
    const one = unlinkProject(two, KIDS, T1);
    assert.deepEqual([...collaboratorsOf(one, members).keys()], ['bob', 'eve', 'dan'], 'bob keeps it through the other project');
    assert.equal(roleOn(one, 'kim', [KIDS]), null);
    assert.equal(unlinkProject(one, KIDS, T1), one, 'nothing to unlink changes nothing');
    assert.equal(linkProject(two, KIDS, 'ann', T1), two, 'linked twice is linked once');
  });
});

describe('the changes an owner makes', () => {
  it('reads a new item and refuses what is not one', () => {
    assert.deepEqual(parseNewLink({ kind: 'skill', name: 'make-zone-intro', repo: 'ann/mediamake-skill-make-zone-intro', token: 'x' }, repoName), { kind: 'skill', name: 'make-zone-intro', repo: 'ann/mediamake-skill-make-zone-intro' });
    assert.ok('error' in parseNewLink({ kind: 'plugin', name: 'x', repo: 'a/b' }, repoName));
    assert.ok('error' in parseNewLink({ kind: 'skill', name: '../etc', repo: 'a/b' }, repoName));
    assert.ok('error' in parseNewLink({ kind: 'skill', name: 'x', repo: 'https://token@github.com/a/b' }, repoName));
    assert.equal(itemRepoName('mcp', 'my-tools'), 'mediamake-mcp-my-tools');
  });

  it('reads each action', () => {
    assert.deepEqual(parseLinkAction({ item: ID, action: 'link', project: ZONE }), { item: ID, action: 'link', project: ZONE });
    assert.deepEqual(parseLinkAction({ item: ID, action: 'add', email: ' Eve@Example.com ', editor: true }), { item: ID, action: 'add', email: 'eve@example.com', editor: true });
    assert.deepEqual(parseLinkAction({ item: ID, action: 'add', clientId: 'dan', editor: 'yes' }), { item: ID, action: 'add', clientId: 'dan', editor: false });
    assert.deepEqual(parseLinkAction({ item: ID, action: 'remove', clientId: 'dan' }), { item: ID, action: 'remove', clientId: 'dan' });
    for (const bad of [{ item: 'x', action: 'link', project: ZONE }, { item: ID, action: 'link', project: 'zone' }, { item: ID, action: 'delete' }, { item: ID, action: 'add' }, { item: ID, action: 'add', email: 'not an address' }]) {
      assert.ok('error' in parseLinkAction(bad), JSON.stringify(bad));
    }
  });

  it('names a member, makes them an editor and back, and removes them', () => {
    const named = addPerson(link(), 'dan', false, 'ann', T0);
    assert.deepEqual(named.people, [{ clientId: 'dan', by: 'ann', at: T0 }]);
    assert.equal(addPerson(named, 'dan', false, 'ann', T1), named);
    const editor = addPerson(named, 'dan', true, 'ann', T1);
    assert.deepEqual(editor.people, [{ clientId: 'dan', editor: true, by: 'ann', at: T0 }]);
    assert.deepEqual(addPerson(editor, 'dan', false, 'ann', T1).people, [{ clientId: 'dan', by: 'ann', at: T0 }]);
    assert.deepEqual(removePerson(editor, { clientId: 'dan' }, T1).people, []);
    assert.equal(removePerson(editor, { clientId: 'nobody' }, T1), editor);
  });

  it('an email with no account waits, and becomes a named member when it signs in', () => {
    const invited = addInvite(link(), 'eve@example.com', true, 'ann', T0);
    assert.deepEqual(invited.invites, [{ email: 'eve@example.com', editor: true, by: 'ann', at: T0 }]);
    assert.equal(takeLinkInvite(invited, 'other@example.com', 'x', T1), null);
    const taken = takeLinkInvite(invited, 'eve@example.com', 'eve', T1)!;
    assert.deepEqual([taken.invites, taken.people], [[], [{ clientId: 'eve', editor: true, by: 'ann', at: T1 }]]);
    assert.equal(roleOn(taken, 'eve', []), 'editor');
    assert.deepEqual(removePerson(invited, { email: 'eve@example.com' }, T1).invites, []);
    // the owner's own address is no member
    assert.deepEqual(takeLinkInvite(invited, 'eve@example.com', 'ann', T1)!.people, []);
  });

  it('says where an item is linked in a few words', () => {
    assert.equal(linkedSummary({ projects: [] }), 'nobody yet');
    assert.equal(linkedSummary({ projects: [{ id: ZONE, name: 'Anime Music Zone' }, { id: KIDS, name: 'Kids TV' }] }), 'Anime Music Zone and Kids TV');
    assert.equal(linkedSummary({ projects: [{ id: ZONE, name: 'Anime Music Zone' }, { id: KIDS, name: 'Kids TV' }], invites: [{ email: 'e@x.co', editor: true }] }), 'Anime Music Zone, Kids TV and 1 person');
    assert.equal(linkedSummary({ projects: [{ id: ZONE, name: 'A' }, { id: KIDS, name: 'B' }, { id: ID, name: 'C' }], people: [{ clientId: 'dan', name: 'Dan', editor: false }], invites: [{ email: 'e@x.co', editor: true }] }), '3 projects and 2 people');
  });
});

describe('a computer reports a linked item', () => {
  it('names the item, never with a project', () => {
    const base = { device: 'mac-1', repo: 'ann/mediamake-skill-make-zone-intro', pushed: true, items: [] };
    const parsed = parseSpaceReport({ ...base, item: ID });
    assert.ok(!('error' in parsed) && parsed.item === ID);
    assert.ok('error' in parseSpaceReport({ ...base, item: 'nope' }));
    assert.ok('error' in parseSpaceReport({ ...base, item: ID, project: ZONE }));
  });
});

describe("the people on an item's repo", () => {
  const repo = 'ann/mediamake-skill-make-zone-intro';

  it('invites who is missing, changes who may push, removes who no longer has it', () => {
    const plan = reconcilePlan(
      repo,
      [{ login: 'Bob', permission: 'pull' }, { login: 'eve', permission: 'push' }, { login: 'dan', permission: 'pull' }, { login: 'ann', permission: 'pull' }],
      [{ login: 'ann', permission: 'push' }, { login: 'bob', permission: 'pull' }, { login: 'eve', permission: 'pull' }, { login: 'old', permission: 'pull' }],
      [{ login: 'gone', permission: 'pull' }],
    );
    assert.deepEqual(plan, { invite: [{ login: 'eve', permission: 'push' }, { login: 'dan', permission: 'pull' }], remove: ['gone', 'old'] });
  });

  /** A stand-in GitHub for one repo. */
  function hub(collaborators: Record<string, boolean>, invitations: Record<string, 'read' | 'write'> = {}) {
    const calls: string[] = [];
    let nextId = 1;
    const ids = new Map(Object.keys(invitations).map(login => [login, nextId++]));
    const answer = (status: number, body?: unknown) => new Response(status === 204 ? null : JSON.stringify(body ?? {}), { status });
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input)).pathname;
      const method = init?.method ?? 'GET';
      calls.push(`${method} ${path}${init?.body ? ` ${init.body}` : ''}`);
      if (new Headers(init?.headers).get('authorization') !== 'Bearer ghu_ok') return answer(401);
      let m: RegExpMatchArray | null;
      if (path === `/repos/${repo}/collaborators`) return answer(200, Object.entries(collaborators).map(([login, push]) => ({ login, permissions: { push, pull: true } })));
      if (path === `/repos/${repo}/invitations`) return answer(200, Object.entries(invitations).map(([login, permissions]) => ({ id: ids.get(login), invitee: { login }, permissions })));
      if ((m = path.match(/\/collaborators\/([^/]+)$/))) {
        if (method === 'PUT') {
          const push = JSON.parse(String(init?.body)).permission === 'push';
          if (m[1] in collaborators) return (collaborators[m[1]] = push), answer(204);
          invitations[m[1]] = push ? 'write' : 'read';
          ids.set(m[1], ids.get(m[1]) ?? nextId++);
          return answer(201, {});
        }
        if (!(m[1] in collaborators)) return answer(404);
        delete collaborators[m[1]];
        return answer(204);
      }
      if ((m = path.match(/\/invitations\/(\d+)$/)) && method === 'DELETE') {
        const login = [...ids].find(([, id]) => String(id) === m![1])?.[0];
        if (!login || !(login in invitations)) return answer(404);
        delete invitations[login];
        return answer(204);
      }
      return answer(404);
    }) as typeof fetch;
    return { fetcher, calls, collaborators, invitations };
  }

  it('with the owner\'s connection, the repo ends with exactly the people who have the item', async () => {
    const github = hub({ ann: true, bob: false, eve: false, old: true }, { gone: 'read' });
    const result = await syncCollaborators({ login: 'ann', token: 'ghu_ok' }, repo, [{ login: 'bob', permission: 'pull' }, { login: 'eve', permission: 'push' }, { login: 'dan', permission: 'pull' }], github.fetcher);
    assert.deepEqual(result, { state: 'done', repo, invited: ['eve', 'dan'], removed: ['gone', 'old'], failed: [] });
    assert.deepEqual(github.collaborators, { ann: true, bob: false, eve: true });
    assert.deepEqual(github.invitations, { dan: 'read' });
    // a second run finds nothing to do
    const before = github.calls.length;
    assert.deepEqual(await syncCollaborators({ login: 'ann', token: 'ghu_ok' }, repo, [{ login: 'bob', permission: 'pull' }, { login: 'eve', permission: 'push' }, { login: 'dan', permission: 'pull' }], github.fetcher), { state: 'done', repo, invited: [], removed: [], failed: [] });
    assert.equal(github.calls.length, before + 2);
  });

  it('touches nothing on a repo under another account, or when GitHub refuses the connection', async () => {
    const github = hub({ ann: true });
    assert.deepEqual(await syncCollaborators({ login: 'someone-else', token: 'ghu_ok' }, repo, [{ login: 'bob', permission: 'pull' }], github.fetcher), { state: 'other-owner', repo });
    assert.equal(github.calls.length, 0);
    const refused = await syncCollaborators({ login: 'ann', token: 'ghu_old' }, repo, [{ login: 'bob', permission: 'pull' }], github.fetcher);
    assert.equal(refused.state, 'failed');
    assert.match(refused.state === 'failed' ? refused.reason : '', /connect GitHub again/);
    assert.deepEqual(github.invitations, {});
  });
});
