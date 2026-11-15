import type { ProjectRole } from '@/lib/editor/project-access';

/**
 * Who can open a cloud project, as the Projects page shows and changes it.
 * The roles are lib/editor/project-access's: the owner, and the editors and
 * viewers the owner shared it with. Someone invited by an email that has no
 * account yet waits as an invite, and becomes a member the first time they
 * sign in with that email. Pure: ./access-store reads and writes.
 */

export type MemberRole = Exclude<ProjectRole, 'owner'>;
export const MEMBER_ROLES: MemberRole[] = ['editor', 'viewer'];

export const isMemberRole = (value: unknown): value is MemberRole => MEMBER_ROLES.includes(value as MemberRole);

/** What each role may do, in the words the page shows (the rule itself: canWrite, canDelete). */
export const ROLE_INFO: Record<ProjectRole, { label: string; can: string }> = {
  owner: { label: 'Owner', can: 'Everything: add, change and delete, and decide who has access' },
  editor: { label: 'Editor', can: 'Open everything, and add or change productions, releases, media and the brand kit' },
  viewer: { label: 'Viewer', can: 'Open and download everything, change nothing' },
};

/** A member as the project document keeps them (`sharedWith`). */
export interface ProjectMember {
  clientId: string;
  role: MemberRole;
  addedAt: string;
  addedBy?: string;
}

/** Someone invited by email who has no account yet (`invites` on the project). */
export interface ProjectInvite {
  email: string;
  role: MemberRole;
  invitedBy: string;
  invitedAt: string;
}

/** What the page shows of an account. The email only goes to the project's owner. */
export interface Person {
  clientId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

export interface MemberPerson extends Person {
  role: MemberRole;
  addedAt?: string;
  /** False when their membership doesn't open cloud projects yet (they need Plus). */
  canOpen?: boolean;
}

/** One project on the Projects page. */
export interface ProjectCard {
  id: string;
  displayName: string;
  tags: string[];
  createdAt: string;
  /** The newest of: the project changed, a production or release changed, media was added. */
  lastActivityAt: string;
  role: ProjectRole;
  owner: Person;
  members: MemberPerson[];
  /** Pending invites; the owner sees them. */
  invites: number;
  /** What it stores, counted against its owner's cap. */
  bytes: number;
  counts: { productions: number; releases: number; media: number };
  brandKit?: { assetCount: number; logo?: string; colors: string[] };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (text: string) => text.length <= 254 && EMAIL.test(text.trim());

/** Up to two letters for an avatar. */
export function initials(name: string): string {
  const words = name.replace(/@.*$/, '').split(/[\s._-]+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

/** "Only you", "You and Asha", "Subhakar, you and 2 others": who a project is shared with, in one line. */
export function sharedSummary(card: Pick<ProjectCard, 'role' | 'owner' | 'members' | 'invites'>, me?: string): string {
  const others = card.members.filter(member => member.clientId !== me).map(member => member.name);
  const invited = card.invites ? `, ${card.invites} invited` : '';
  if (card.role === 'owner') {
    if (!others.length) return card.invites ? `Only you${invited}` : 'Only you';
    return `You and ${listNames(others)}${invited}`;
  }
  return others.length ? `${card.owner.name}, you and ${listNames(others)}` : `${card.owner.name} and you`;
}

function listNames(names: string[]): string {
  if (names.length <= 2) return names.join(' and ');
  return `${names[0]} and ${names.length - 1} others`;
}

/** A share request: who (an email or an account) and as what. */
export type ShareTarget = { projectId: string; role?: MemberRole } & ({ email: string; clientId?: undefined } | { clientId: string; email?: undefined });

export function parseShare(body: unknown, { needsRole = true } = {}): ShareTarget | { error: string } {
  const { projectId, clientId, email, role } = (body ?? {}) as Record<string, unknown>;
  if (typeof projectId !== 'string' || !projectId) return { error: 'projectId is required' };
  if (role !== undefined && !isMemberRole(role)) return { error: "role must be 'editor' or 'viewer'" };
  if (needsRole && role === undefined) return { error: "role is required: 'editor' or 'viewer'" };
  const as = role as MemberRole | undefined;
  if (typeof email === 'string' && email.trim()) {
    const address = email.trim().toLowerCase();
    return isEmail(address) ? { projectId, role: as, email: address } : { error: 'That is not an email address' };
  }
  if (typeof clientId === 'string' && clientId.trim()) return { projectId, role: as, clientId: clientId.trim() };
  return { error: 'Say who: an email, or an account' };
}

export type ProjectSort = 'activity' | 'name' | 'size' | 'newest';
export const PROJECT_SORTS: { id: ProjectSort; label: string }[] = [
  { id: 'activity', label: 'Last activity' },
  { id: 'name', label: 'Name' },
  { id: 'size', label: 'Size' },
  { id: 'newest', label: 'Newest' },
];

export type ProjectScope = 'all' | 'mine' | 'shared';

/** The cards a search, a scope and a sort leave, in order. */
export function browseProjects(cards: ProjectCard[], { query = '', scope = 'all', sort = 'activity' }: { query?: string; scope?: ProjectScope; sort?: ProjectSort }): ProjectCard[] {
  const q = query.trim().toLowerCase();
  const kept = cards.filter(card => {
    if (scope === 'mine' && card.role !== 'owner') return false;
    if (scope === 'shared' && card.role === 'owner') return false;
    if (!q) return true;
    return [card.displayName, card.owner.name, ...card.tags, ...card.members.map(member => member.name)].some(text => text.toLowerCase().includes(q));
  });
  const by: Record<ProjectSort, (a: ProjectCard, b: ProjectCard) => number> = {
    activity: (a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt),
    name: (a, b) => a.displayName.localeCompare(b.displayName),
    size: (a, b) => b.bytes - a.bytes,
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  };
  return [...kept].sort((a, b) => by[sort](a, b) || a.displayName.localeCompare(b.displayName));
}

/** "just now", "3 hours ago", "yesterday", "12 Nov", "12 Nov 2025". */
export function ago(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const minutes = Math.round((now - then) / 60_000);
  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const date = new Date(then);
  const sameYear = date.getUTCFullYear() === new Date(now).getUTCFullYear();
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }), timeZone: 'UTC' });
}

/** What changes when the invites of `email` are taken up by `clientId`: the members after, or null when nothing changes. */
export function takeInvite(project: { clientId?: string; sharedWith?: ProjectMember[]; invites?: ProjectInvite[] }, email: string, clientId: string, at: string): { sharedWith: ProjectMember[]; invites: ProjectInvite[] } | null {
  const invite = (project.invites ?? []).find(entry => entry.email === email);
  if (!invite) return null;
  const invites = (project.invites ?? []).filter(entry => entry.email !== email);
  const members = project.sharedWith ?? [];
  const already = project.clientId === clientId || members.some(member => member.clientId === clientId);
  return { invites, sharedWith: already ? members : [...members, { clientId, role: invite.role, addedAt: at, addedBy: invite.invitedBy }] };
}
