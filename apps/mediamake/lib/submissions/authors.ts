import { getUserByClientId, getUserByEmail } from '@/lib/auth/users';
import { authorName, authorNamed, authoredItems, shownAuthor, withAuthor, withoutAuthor, type AuthorShown, type ItemAuthor } from '@/lib/catalog/authors';
import { getCatalogRecord } from '@/lib/catalog/records';
import { catalogAuthorsDB } from '@/lib/catalog/store';
import type { MemberTier } from '@/lib/memberships/tiers';
import { submissionsDB } from './store';

/**
 * Who an item's authors are (lib/catalog/authors has the rules): the ones written down, or, for an
 * item accepted before authors existed, the sender of its first accepted submission. Accepting a
 * submission writes them down (`settleAuthors`); an author or an admin changes them
 * (`changeAuthors`, POST /api/submissions/authors, `mm submit authors`).
 */
export async function authorsOf(itemId: string): Promise<ItemAuthor[]> {
  const stored = await catalogAuthorsDB.get(itemId);
  if (stored) return stored;
  const first = await submissionsDB.firstAccepted(itemId);
  if (!first) return [];
  const user = await getUserByClientId(first.clientId).catch(() => null);
  return [{ clientId: first.clientId, name: authorName(user), addedAt: first.decision?.at ?? first.createdAt, addedBy: 'store' }];
}

export const isAuthor = async (itemId: string, clientId: string) => (await authorsOf(itemId)).some(author => author.clientId === clientId);

/** The store items an account is an author of, by id (My store items lists them). */
export async function itemsAuthoredBy(clientId: string): Promise<string[]> {
  const [named, accepted] = await Promise.all([catalogAuthorsDB.itemsOf(clientId), submissionsDB.acceptedItemsOf(clientId)]);
  return authoredItems(named, accepted, itemId => isAuthor(itemId, clientId));
}

/** After a submission of the item is accepted: an item with no authors written down gets its first (the first accepted sender). */
export async function settleAuthors(itemId: string): Promise<void> {
  if (await catalogAuthorsDB.get(itemId)) return;
  await catalogAuthorsDB.seed(itemId, await authorsOf(itemId));
}

/** The item's authors as a page others can read names them: a GitHub login or a display name, never an email. */
export async function shownAuthors(itemId: string, authors?: ItemAuthor[]): Promise<AuthorShown[]> {
  const list = authors ?? (await authorsOf(itemId));
  return Promise.all(list.map(async author => shownAuthor(author, await getUserByClientId(author.clientId).catch(() => null))));
}

export type AuthorsView = { itemId: string; authors: (AuthorShown & { addedAt: string; you?: true })[] };
export type AuthorsOutcome = ({ ok: true; changed?: string } & AuthorsView) | { ok: false; why: string; status: number };

async function viewOf(itemId: string, authors: ItemAuthor[], clientId: string): Promise<AuthorsView> {
  const shown = await shownAuthors(itemId, authors);
  return { itemId, authors: authors.map((author, i) => ({ ...shown[i], addedAt: author.addedAt, ...(author.clientId === clientId && { you: true as const }) })) };
}

/**
 * Reads an item's authors and, with `add` (an account's email) or `remove` (an email, or the name the
 * list shows), changes them. Only its authors and admins do either; an item always keeps one author.
 */
export async function changeAuthors(input: { itemId: string; clientId: string; tier: MemberTier; add?: string; remove?: string }): Promise<AuthorsOutcome> {
  const { itemId, clientId } = input;
  const record = await getCatalogRecord(itemId).catch(() => null);
  if (!record) return { ok: false, status: 404, why: `No ${itemId} in the store. Say which with --kind=skill|mcp|app` };
  if (record.madeBy) return { ok: false, status: 400, why: `${itemId} is made by ${record.madeBy.name}, outside MediaMake: it has no authors here` };
  const authors = await authorsOf(itemId);
  if (input.tier !== 'admin' && !authors.some(author => author.clientId === clientId)) {
    return { ok: false, status: 403, why: `Only the authors of ${itemId} and admins see and change its authors. Its page names them` };
  }
  if (!input.add && !input.remove) return { ok: true, ...(await viewOf(itemId, authors, clientId)) };

  let next = authors;
  const changed: string[] = [];
  if (input.add) {
    const user = await getUserByEmail(input.add);
    if (!user) return { ok: false, status: 404, why: 'No MediaMake account has that email. They sign in to MediaMake once first, with that email' };
    const name = authorName(user);
    const added = withAuthor(next, { clientId: user.clientId, name, addedAt: new Date().toISOString(), addedBy: clientId });
    if (!added.ok) return { ok: false, status: 409, why: added.why };
    next = added.authors;
    changed.push(`added ${name}`);
  }
  if (input.remove) {
    const who = input.remove.includes('@') ? await getUserByEmail(input.remove) : authorNamed(next, await shownAuthors(itemId, next), input.remove);
    if (!who) return { ok: false, status: 404, why: `${input.remove.includes('@') ? 'That email' : input.remove} is not one of its authors. mm submit authors <name> lists them` };
    const removed = withoutAuthor(next, who.clientId);
    if (!removed.ok) return { ok: false, status: 409, why: removed.why };
    changed.push(`removed ${(await shownAuthors(itemId, [next.find(author => author.clientId === who.clientId)!]))[0].name}`);
    next = removed.authors;
  }
  await catalogAuthorsDB.set(itemId, next, clientId);
  return { ok: true, changed: changed.join(', '), ...(await viewOf(itemId, next, clientId)) };
}
