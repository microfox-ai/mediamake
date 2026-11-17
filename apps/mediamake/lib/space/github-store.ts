import type { Db } from 'mongodb';
import { getUserByClientId } from '@/lib/auth/users';
import { getDatabase } from '../mongodb';
import { inviteCollaborator, needsRefresh, permissionOf, refreshTokens, removeCollaborator, revokeGrant, seal, shareOnGithub, unseal, type AppTokens, type GithubShare } from './github';
import { projectSpaceId, type SpaceRecord } from './space';
import { spaceDB } from './store';

/**
 * `github_grants`: one per account that connected GitHub for its projects,
 * `{ clientId, githubId, login, token, refreshToken (both sealed), expiresAt,
 * refreshExpiresAt, grantedAt }`. A token never leaves the server and is
 * never logged.
 */
const COL = 'github_grants';

interface GrantDoc {
  clientId: string;
  githubId: string;
  login: string;
  token: string;
  expiresAt?: string;
  refreshToken?: string;
  refreshExpiresAt?: string;
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

const sealed = (tokens: AppTokens) => ({
  token: seal(tokens.token),
  ...(tokens.expiresAt && { expiresAt: tokens.expiresAt }),
  ...(tokens.refreshToken && { refreshToken: seal(tokens.refreshToken) }),
  ...(tokens.refreshExpiresAt && { refreshExpiresAt: tokens.refreshExpiresAt }),
});

export const githubGrants = {
  async save(clientId: string, grant: AppTokens & { id: string; login: string }): Promise<void> {
    const db = await getDatabase();
    await ensureIndex(db);
    const doc: GrantDoc = { clientId, githubId: grant.id, login: grant.login, ...sealed(grant), grantedAt: new Date().toISOString() };
    await db.collection<GrantDoc>(COL).replaceOne({ clientId }, doc, { upsert: true });
  },

  /** Whether the account connected GitHub, and as whom. Never a token. */
  async status(clientId: string): Promise<{ connected: boolean; login?: string; grantedAt?: string }> {
    const db = await getDatabase();
    const doc = await db.collection<GrantDoc>(COL).findOne({ clientId }, { projection: { _id: 0, login: 1, grantedAt: 1 } });
    return doc ? { connected: true, login: doc.login, grantedAt: doc.grantedAt } : { connected: false };
  },

  /**
   * The grant to act with, refreshed when its token is about to run out.
   * Null: none, one sealed with a key that changed, or one GitHub no longer refreshes.
   */
  async use(clientId: string): Promise<{ login: string; token: string } | null> {
    const db = await getDatabase();
    const doc = await db.collection<GrantDoc>(COL).findOne({ clientId }, { projection: { _id: 0 } });
    if (!doc) return null;
    const token = unseal(doc.token);
    if (!token) return null;
    if (!needsRefresh(doc)) return { login: doc.login, token };
    const refreshToken = doc.refreshToken ? unseal(doc.refreshToken) : null;
    const fresh = refreshToken ? await refreshTokens(refreshToken) : null;
    if (!fresh) return null;
    // only over the token this refresh was made from, so two requests at once don't undo each other
    await db.collection<GrantDoc>(COL).updateOne({ clientId, token: doc.token }, { $set: sealed(fresh) });
    return { login: doc.login, token: fresh.token };
  },

  /** Disconnects: the authorization is taken back at GitHub and deleted here. */
  async remove(clientId: string): Promise<boolean> {
    const db = await getDatabase();
    const doc = await db.collection<GrantDoc>(COL).findOne({ clientId }, { projection: { _id: 0 } });
    if (!doc) return false;
    const token = unseal(doc.token);
    if (token) await revokeGrant(token);
    await db.collection(COL).deleteOne({ clientId });
    return true;
  },

  /**
   * GitHub said that account's connection ended (./github-webhook): every grant of it is deleted here.
   * `revoke` also takes the authorization back at GitHub, for when only the App was removed.
   */
  async forgetGithubAccount(githubId: string, revoke: boolean): Promise<number> {
    const db = await getDatabase();
    const docs = await db.collection<GrantDoc>(COL).find({ githubId }, { projection: { _id: 0 } }).toArray();
    for (const doc of docs) {
      const token = revoke ? unseal(doc.token) : null;
      if (token) await revokeGrant(token);
    }
    if (!docs.length) return 0;
    return (await db.collection(COL).deleteMany({ githubId })).deletedCount;
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
