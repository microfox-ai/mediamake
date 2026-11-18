/**
 * Deleting a project space, from its Settings tab (components/projects/space-settings).
 *
 * Only its owner can, after typing its name; a personal space never is
 * (./personal). It is for good: the space's page, its people and invites,
 * its brand kit, productions, releases and media (records and stored
 * files), its runs and to-dos, and what its computers reported all go.
 * Items linked to it stay their owners' and are only unlinked from it.
 *
 * Its GitHub repo holds the code of its skills, MCPs and apps, and is the
 * owner's: it stays on GitHub with the people on it, unless the owner also
 * asks for it to be deleted, which MediaMake can do only for a repo under
 * the GitHub account they connected (lib/space/github deleteRepo).
 *
 * Pure: who may, and which stored files are the project's. ./delete-store
 * does it.
 */

/** What the owner chose for the space's repo. */
export type RepoChoice = 'keep' | 'delete';

export const repoChoice = (value: unknown): RepoChoice => (value === 'delete' ? 'delete' : 'keep');

/** What became of the repo, for the page to say. */
export type RepoOutcome =
  /** The space never had one. */
  | { state: 'none' }
  | { state: 'kept'; repo: string }
  | { state: 'deleted'; repo: string };

export interface DeletedSpace {
  deleted: true;
  name: string;
  repo: RepoOutcome;
  /** How many of other members' linked items were unlinked from it. */
  unlinked: number;
}

export interface DeleteRefusal {
  status: number;
  error: string;
}

/** The typed name is the space's, give or take the spaces around it. */
export const nameMatches = (typed: unknown, name: string): boolean => typeof typed === 'string' && typed.trim() === name.trim() && name.trim() !== '';

/** Why this account can't delete that project with what it typed, or null when it can. */
export function deleteRefusal(project: { clientId?: string; personal?: boolean; displayName?: string } | null, clientId: string, typed: unknown, personalMessage: string): DeleteRefusal | null {
  if (!project) return { status: 404, error: 'Space not found' };
  const member = project.clientId === clientId;
  if (project.personal) return member ? { status: 400, error: personalMessage } : { status: 404, error: 'Space not found' };
  if (!member) return { status: 403, error: 'Only the owner of a space can delete it' };
  if (!nameMatches(typed, project.displayName ?? '')) return { status: 400, error: `Type the name of the space, ${project.displayName ?? ''}, to delete it` };
  return null;
}

/**
 * The storage keys of a project's public files (its media and its brand
 * kit), from their links. Only a key under the project's own folders
 * counts (`mediamake/<uploader>/projects/<id>/media/…` and
 * `mediamake/<uploader>/brand-kits/<id>/…`, as the upload routes name
 * them), so a link to anything else is never deleted.
 */
export function projectFileKeys(projectId: string, urls: (string | undefined | null)[], bucket?: string): string[] {
  const keys = new Set<string>();
  for (const url of urls) {
    if (!url) continue;
    let path: string;
    try {
      path = decodeURIComponent(new URL(url).pathname).replace(/^\/+/, '');
    } catch {
      continue;
    }
    // a bucket addressed by path
    if (bucket && path.startsWith(`${bucket}/`)) path = path.slice(bucket.length + 1);
    const parts = path.split('/');
    if (parts[0] !== 'mediamake' || parts.length < 5 || parts.includes('..')) continue;
    const media = parts[2] === 'projects' && parts[3] === projectId && parts[4] === 'media';
    const brand = parts[2] === 'brand-kits' && parts[3] === projectId;
    if (media || brand) keys.add(path);
  }
  return [...keys];
}
