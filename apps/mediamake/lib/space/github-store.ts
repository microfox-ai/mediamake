import type { Db } from 'mongodb';
import { getUserByClientId } from '@/lib/auth/users';
import { getDatabase } from '../mongodb';
import { inviteCollaborator, permissionOf, removeCollaborator, revokeGrant, seal, shareOnGithub, unseal, type GithubShare } from './github';
import { projectSpaceId, type SpaceRecord } from './space';
import { spaceDB } from './store';

/**
 * `github_grants`: one per account that connected GitHub for its projects,
 * `{ clientId, githubId, login, token (sealed), scopes, grantedAt }`. The
 * token never leaves the server and is never logged.
 */
const COL = 'github_grants';

interface GrantDoc {
  clientId: string;
  githubId: string;
  login: string;
  token: string;
  scopes: string[];
  grantedAt: string;
}

let indexed: Promise<unknown> | null = null;
const ensureIndex = (db: Db) =>
  (indexed ??= db
    .collection(COL)
    .createIndex({ clientId: 1 }, { unique: true })
    .catch(error => {
      indexed = null;
      throw error;
    }));

export const githubGrants = {
  async save(clientId: string, grant: { id: string; login: string; token: string; scopes: string[] }): Promise<void> {
    const db = await getDatabase();
    await ensureIndex(db);
    const doc: GrantDoc = { clientId, githubId: grant.id, login: grant.login, token: seal(grant.token), scopes: grant.scopes, grantedAt: new Date().toISOString() };
    await db.collection<GrantDoc>(COL).replaceOne({ clientId }, doc, { upsert: true });
  },

  /** Whether the account connected GitHub, and as whom. Never the token. */
  async status(clientId: string): Promise<{ connected: boolean; login?: string; grantedAt?: string }> {
    const db = await getDatabase();
    const doc = await db.collection<GrantDoc>(COL).findOne({ clientId }, { projection: { _id: 0, login: 1, grantedAt: 1 } });
    return doc ? { connected: true, login: doc.login, grantedAt: doc.grantedAt } : { connected: false };
  },

  /** The grant to act with, or null: none, or one sealed with a key that changed. */
  async use(clientId: string): Promise<{ login: string; token: string } | null> {
    const db = await getDatabase();
    const doc = await db.collection<GrantDoc>(COL).findOne({ clientId }, { projection: { _id: 0 } });
    const token = doc ? unseal(doc.token) : null;
    return doc && token ? { login: doc.login, token } : null;
  },

  /** Disconnects: the grant is taken back at GitHub and deleted here. */
  async remove(clientId: string): Promise<boolean> {
    const db = await getDatabase();
    const doc = await db.collection<GrantDoc>(COL).findOne({ clientId }, { projection: { _id: 0 } });
    if (!doc) return false;
    const token = unseal(doc.token);
    if (token) await revokeGrant(token);
    await db.collection(COL).deleteOne({ clientId });
    return true;
  },
};

const repoOf = async (db: Db, projectId: string) => (await db.collection<SpaceRecord>('spaces').findOne({ id: projectSpaceId(projectId) }, { projection: { _id: 0, repo: 1 } }))?.repo;

/** After the owner added someone: invite them to the project's repo, making it when there is none. Never throws. */
export async function githubAfterAdd(project: { id: string; name: string }, ownerClientId: string, member: { clientId: string; role: string }): Promise<GithubShare> {
  try {
    const db = await getDatabase();
    const [grant, repo, user] = await Promise.all([githubGrants.use(ownerClientId), repoOf(db, project.id), getUserByClientId(member.clientId).catch(() => null)]);
    return await shareOnGithub({ projectName: project.name, repo, grant, member: { githubLogin: user?.githubLogin, role: member.role } }, async made => {
      await spaceDB.setProjectRepo(project.id, made);
    });
  } catch (error) {
    console.error('[spaces] GitHub invite failed:', error instanceof Error ? error.message : 'error');
    return { state: 'failed', reason: 'Something went wrong on the way to GitHub.' };
  }
}

/** After a role change or a removal: the same on the project's repo, when the owner's grant can. Best effort. */
export async function githubAfterChange(projectId: string, ownerClientId: string, memberClientId: string, role: string | null): Promise<void> {
  try {
    const db = await getDatabase();
    const [grant, repo, user] = await Promise.all([githubGrants.use(ownerClientId), repoOf(db, projectId), getUserByClientId(memberClientId).catch(() => null)]);
    if (!grant || !repo || !user?.githubLogin || repo.split('/')[0].toLowerCase() !== grant.login.toLowerCase()) return;
    if (role) await inviteCollaborator(grant.token, repo, user.githubLogin, permissionOf(role));
    else await removeCollaborator(grant.token, repo, user.githubLogin);
  } catch (error) {
    console.error('[spaces] GitHub change failed:', error instanceof Error ? error.message : 'error');
  }
}
