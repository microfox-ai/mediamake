/**
 * A store item's authors: the members who look after it, like the collaborators on a git repo. The
 * sender of its first accepted submission is the first; an author or an admin adds and removes others
 * by their MediaMake account's email (`mm submit authors`), and an item always keeps one. Any author
 * may send an update; a Cohort author's is published directly (lib/submissions/actions
 * `directUpdateTier`). Kept apart from the items (`catalogAuthorsDB`), since a Public skill lives in
 * the repo with no stored record. The rules here are pure; lib/submissions/authors reads and writes.
 */

export interface ItemAuthor {
  /** Their MediaMake account. */
  clientId: string;
  /** The name shown when they were added (see authorName); pages read the account's current one. */
  name: string;
  addedAt: string;
  /** The account that added them, or `store` for the sender of an accepted submission. */
  addedBy: string;
}

/** An author as a page others can read names them: never an email. */
export interface AuthorShown {
  name: string;
  /** Their GitHub login, when their account has GitHub linked. */
  github?: string;
}

export const MAX_AUTHORS = 20;
const MEMBER = 'A MediaMake member';

/** A display name that is safe to show: not empty, and not an email (some accounts are named after theirs). */
const safeName = (name?: string) => (name?.trim() && !name.includes('@') ? name.trim() : undefined);

/** The name a page others can read uses: the GitHub login when linked, else the display name, never an email. */
export function authorName(user: { githubLogin?: string; name?: string } | null | undefined, fallback = MEMBER): string {
  return user?.githubLogin || safeName(user?.name) || safeName(fallback) || MEMBER;
}

/** One author as pages show them, from their account as it is now (null when it is gone). */
export function shownAuthor(author: ItemAuthor, user: { githubLogin?: string; name?: string } | null | undefined): AuthorShown {
  return { name: authorName(user, author.name), ...(user?.githubLogin && { github: user.githubLogin }) };
}

export type AuthorsChange = { ok: true; authors: ItemAuthor[] } | { ok: false; why: string };

/** Adds an author, once. */
export function withAuthor(authors: ItemAuthor[], author: ItemAuthor): AuthorsChange {
  if (authors.some(a => a.clientId === author.clientId)) return { ok: false, why: `${author.name} is already an author` };
  if (authors.length >= MAX_AUTHORS) return { ok: false, why: `An item has at most ${MAX_AUTHORS} authors` };
  return { ok: true, authors: [...authors, author] };
}

/** Removes an author. The last one stays: an item always keeps one. */
export function withoutAuthor(authors: ItemAuthor[], clientId: string): AuthorsChange {
  if (!authors.some(a => a.clientId === clientId)) return { ok: false, why: 'They are not an author of it' };
  if (authors.length === 1) return { ok: false, why: 'An item always keeps one author: add another first' };
  return { ok: true, authors: authors.filter(a => a.clientId !== clientId) };
}

/**
 * The author a name points at, among the names shown (a GitHub login or a display name, any case), for
 * removing one by the name the list shows. Null when none or several match.
 */
export function authorNamed(authors: ItemAuthor[], shown: AuthorShown[], name: string): ItemAuthor | null {
  const wanted = name.trim().replace(/^@/, '').toLowerCase();
  const found = authors.filter((_, i) => [shown[i]?.name, shown[i]?.github].some(n => n?.toLowerCase() === wanted));
  return found.length === 1 ? found[0] : null;
}
