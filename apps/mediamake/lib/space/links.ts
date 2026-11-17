/**
 * Linked items: a skill, MCP or app of one member that other people use
 * without it leaving its owner (UI refactor plan, step 2b).
 *
 * An item in a personal space is only its owner's. Linking it gives it to
 * more people and keeps it one copy with one history:
 *
 * - It gets a small private repo of its own under its owner's GitHub
 *   account (`<owner>/mediamake-<kind>-<name>`), laid out like a space with
 *   that one item in it. `mm space link` makes it and moves the item there.
 * - It is linked to any number of project spaces. Everyone on a linked
 *   project can use it: their `mm space sync` (or `mm space join`) clones
 *   it and links it into Claude. Unlinking a project takes it away from
 *   that project's people only.
 * - It can also be shared with named members who are on none of those
 *   projects.
 * - Only its owner and the named members the owner made editors can change
 *   it: they may push to its repo, everyone else pulls.
 *
 * Pure: who has an item and what each may do, the changes an owner makes,
 * and who should be on the repo. ./links-store keeps the records and
 * ./github does the inviting. MediaMake never holds a file of it.
 */
import { SPACE_KINDS, type SpaceKind, type SpaceView } from './space';

const LINK_ID = /^[0-9a-f]{24}$/;
const ITEM_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PROJECT_ID = /^[0-9a-f]{24}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** A linked item's id as a request may name it, or null. */
export const linkId = (value: unknown): string | null => (typeof value === 'string' && LINK_ID.test(value) ? value : null);
/** The space id its computers report under: `item:<id>`. */
export const linkSpaceId = (id: string) => `item:${id}`;
/** The repo a linked item gets, the same as `mm space link` names it. */
export const itemRepoName = (kind: SpaceKind, name: string) => `mediamake-${kind}-${name}`;

/** A named member: someone the owner shared the item with directly. */
export interface LinkPerson {
  clientId: string;
  /** May change the item (push to its repo). */
  editor?: boolean;
  by: string;
  at: string;
}

/** Someone named by an email that has no account yet. Becomes a LinkPerson the first time they look at their spaces. */
export interface LinkInvite {
  email: string;
  editor?: boolean;
  by: string;
  at: string;
}

/** One linked item (`space_links`). */
export interface LinkRecord {
  id: string;
  /** The account it belongs to. */
  owner: string;
  kind: SpaceKind;
  name: string;
  /** Its own private repo, `owner/name`. */
  repo: string;
  formerRepos?: string[];
  /** The project spaces it is linked to. */
  projects: { id: string; by: string; at: string }[];
  people: LinkPerson[];
  invites: LinkInvite[];
  createdAt: string;
  updatedAt: string;
}

/** What someone may do with a linked item: its owner and editors change it, a user only uses it. */
export type LinkRole = 'owner' | 'editor' | 'user';

/** What `clientId` may do with the item, or null when it isn't theirs to use. `myProjects`: the ids of the projects they are on. */
export function roleOn(link: Pick<LinkRecord, 'owner' | 'projects' | 'people'>, clientId: string, myProjects: Iterable<string>): LinkRole | null {
  if (link.owner === clientId) return 'owner';
  const named = link.people.find(person => person.clientId === clientId);
  if (named?.editor) return 'editor';
  if (named) return 'user';
  const mine = new Set(myProjects);
  return link.projects.some(project => mine.has(project.id)) ? 'user' : null;
}

/**
 * Who should be on the item's repo and what each may do there: everyone on
 * a linked project and every named member pulls, editors push. The owner is
 * left out (the repo is theirs). `members`: the people of each project.
 */
export function collaboratorsOf(link: Pick<LinkRecord, 'owner' | 'projects' | 'people'>, members: Map<string, string[]>): Map<string, 'push' | 'pull'> {
  const wanted = new Map<string, 'push' | 'pull'>();
  for (const project of link.projects) for (const clientId of members.get(project.id) ?? []) wanted.set(clientId, 'pull');
  for (const person of link.people) wanted.set(person.clientId, person.editor ? 'push' : 'pull');
  wanted.delete(link.owner);
  return wanted;
}

/* ---------- the changes ---------- */

/** A new linked item: `{ kind, name, repo }`. */
export function parseNewLink(body: unknown, repoName: (value: unknown) => string | null): { kind: SpaceKind; name: string; repo: string } | { error: string } {
  const { kind, name, repo } = (body ?? {}) as Record<string, unknown>;
  if (typeof kind !== 'string' || !(SPACE_KINDS as readonly string[]).includes(kind)) return { error: 'kind is skill, mcp or app' };
  if (typeof name !== 'string' || name.length > 100 || !ITEM_NAME.test(name)) return { error: "name is the item's folder name" };
  const named = repoName(repo);
  if (!named || named.split('/').length !== 2) return { error: "Send { repo }: the item's own repo as owner/name" };
  return { kind: kind as SpaceKind, name, repo: named };
}

export type LinkAction =
  | { item: string; action: 'link'; project: string }
  | { item: string; action: 'unlink'; project: string }
  | { item: string; action: 'add'; email?: string; clientId?: string; editor: boolean }
  | { item: string; action: 'remove'; email?: string; clientId?: string };

/**
 * A change to a linked item:
 * `{ item, action: 'link' | 'unlink', project }`, or
 * `{ item, action: 'add', email | clientId, editor? }` (also changes whether someone already named is an editor), or
 * `{ item, action: 'remove', email | clientId }`.
 */
export function parseLinkAction(body: unknown): LinkAction | { error: string } {
  const { item, action, project, email, clientId, editor } = (body ?? {}) as Record<string, unknown>;
  const id = linkId(item);
  if (!id) return { error: 'item is a linked item id' };
  if (action === 'link' || action === 'unlink') {
    if (typeof project !== 'string' || !PROJECT_ID.test(project)) return { error: 'project is a project id' };
    return { item: id, action, project };
  }
  if (action !== 'add' && action !== 'remove') return { error: "action is 'link', 'unlink', 'add' or 'remove'" };
  const who: { email?: string; clientId?: string } = {};
  if (typeof email === 'string' && email.trim()) {
    const address = email.trim().toLowerCase();
    if (address.length > 254 || !EMAIL.test(address)) return { error: 'That is not an email address' };
    who.email = address;
  } else if (typeof clientId === 'string' && clientId.trim()) who.clientId = clientId.trim();
  else return { error: 'Say who: an email, or an account' };
  return action === 'add' ? { item: id, action, ...who, editor: editor === true } : { item: id, action, ...who };
}

export const linkProject = (link: LinkRecord, project: string, by: string, at: string): LinkRecord =>
  link.projects.some(entry => entry.id === project) ? link : { ...link, projects: [...link.projects, { id: project, by, at }], updatedAt: at };

export const unlinkProject = (link: LinkRecord, project: string, at: string): LinkRecord =>
  link.projects.some(entry => entry.id === project) ? { ...link, projects: link.projects.filter(entry => entry.id !== project), updatedAt: at } : link;

/** Names a member, or changes whether a named member is an editor. */
export function addPerson(link: LinkRecord, clientId: string, editor: boolean, by: string, at: string): LinkRecord {
  const person: LinkPerson = { clientId, ...(editor && { editor: true }), by, at };
  const had = link.people.find(entry => entry.clientId === clientId);
  if (had && !!had.editor === editor) return link;
  return { ...link, people: had ? link.people.map(entry => (entry.clientId === clientId ? { ...person, by: had.by, at: had.at } : entry)) : [...link.people, person], updatedAt: at };
}

/** Names an email that has no account yet, or changes whether it will be an editor. */
export function addInvite(link: LinkRecord, email: string, editor: boolean, by: string, at: string): LinkRecord {
  const invite: LinkInvite = { email, ...(editor && { editor: true }), by, at };
  const had = link.invites.find(entry => entry.email === email);
  if (had && !!had.editor === editor) return link;
  return { ...link, invites: had ? link.invites.map(entry => (entry.email === email ? invite : entry)) : [...link.invites, invite], updatedAt: at };
}

export function removePerson(link: LinkRecord, who: { clientId?: string; email?: string }, at: string): LinkRecord {
  const people = who.clientId ? link.people.filter(entry => entry.clientId !== who.clientId) : link.people;
  const invites = who.email ? link.invites.filter(entry => entry.email !== who.email) : link.invites;
  return people.length === link.people.length && invites.length === link.invites.length ? link : { ...link, people, invites, updatedAt: at };
}

/** An invite taken up: the address signed in as `clientId`. Null when no invite is waiting for it. */
export function takeLinkInvite(link: LinkRecord, email: string, clientId: string, at: string): LinkRecord | null {
  const invite = link.invites.find(entry => entry.email === email);
  if (!invite) return null;
  const rest = { ...link, invites: link.invites.filter(entry => entry.email !== email), updatedAt: at };
  if (clientId === link.owner || link.people.some(person => person.clientId === clientId)) return rest;
  return { ...rest, people: [...rest.people, { clientId, ...(invite.editor && { editor: true }), by: invite.by, at }] };
}

/* ---------- the repo's people ---------- */

export interface RepoPerson {
  login: string;
  permission: 'push' | 'pull';
}

/**
 * What to do on the item's repo so the people on it are exactly `wanted`:
 * who to invite (or give another permission), and who to take off, an
 * invitation not accepted yet included. The account the repo is under is
 * never touched. GitHub logins don't tell upper from lower case.
 */
export function reconcilePlan(repo: string, wanted: RepoPerson[], collaborators: RepoPerson[], invitations: RepoPerson[]): { invite: RepoPerson[]; remove: string[] } {
  const key = (login: string) => login.toLowerCase();
  const owner = key(repo.split('/')[0]);
  const want = new Map(wanted.filter(person => key(person.login) !== owner).map(person => [key(person.login), person]));
  const have = new Map([...invitations, ...collaborators].filter(person => key(person.login) !== owner).map(person => [key(person.login), person]));
  return {
    invite: [...want.values()].filter(person => have.get(key(person.login))?.permission !== person.permission),
    remove: [...have.values()].filter(person => !want.has(key(person.login))).map(person => person.login),
  };
}

/* ---------- what the app and `mm space` read ---------- */

/** A linked item for one viewer. */
export interface LinkedItemView {
  id: string;
  kind: SpaceKind;
  name: string;
  title: string;
  summary?: string;
  version?: string;
  repo: string;
  repoUrl?: string;
  /** What the viewer may do with it. */
  role: LinkRole;
  /** Its owner's name. */
  owner: string;
  /** The linked projects the viewer is on; for the owner, every linked project. */
  projects: { id: string; name: string }[];
  /** The owner named the viewer. */
  direct?: boolean;
  /** For the owner: the named members, the emails waiting for an account, and who should be on the repo. */
  people?: { clientId: string; name: string; email?: string; editor: boolean }[];
  invites?: { email: string; editor: boolean }[];
  collaborators?: { name: string; githubLogin?: string; permission: 'push' | 'pull' }[];
  /** Where it stands on the computers that have it. Null until one reported. */
  space: SpaceView | null;
}

/** "Anime Music Zone and Kids TV", "Anime Music Zone, Kids TV and 2 people", "3 projects and 2 people": where an item is linked, in a few words. */
export function linkedSummary(view: Pick<LinkedItemView, 'projects' | 'people' | 'invites'>): string {
  const people = (view.people?.length ?? 0) + (view.invites?.length ?? 0);
  const parts = view.projects.length <= 2 ? view.projects.map(project => project.name) : [`${view.projects.length} projects`];
  if (people) parts.push(`${people} ${people === 1 ? 'person' : 'people'}`);
  if (!parts.length) return 'nobody yet';
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
