/**
 * A person's account. The client id stays the account id: API keys, sessions,
 * devices, grants and memberships all key on it, so a user record only adds
 * how the person signs in. Accounts from before sign-in existed have no record
 * until they are linked (see lib/auth/accounts.ts), and still sign in with
 * their client id and key on /core/login.
 *
 * An email is stored only once it is verified: by the link we mailed, by
 * Google or GitHub, or by an admin.
 */
export interface User {
  /** The account id. Unique. */
  clientId: string;
  /** Lowercase. Unique. */
  email?: string;
  emailVerifiedAt?: string;
  /** See lib/auth/password.ts. */
  passwordHash?: string;
  /** Every Google account that signs in to this account. */
  googleAccounts?: GoogleAccount[];
  /** Records from before an account could have several: one Google id. Read with googleAccountsOf. */
  googleId?: string;
  githubId?: string;
  githubLogin?: string;
  name?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface GoogleAccount {
  /** Google's own id for the account. */
  id: string;
  /** Shown so the person can tell their accounts apart. */
  email?: string;
}

/** A user's Google accounts, whichever way the record stores them. */
export function googleAccountsOf(user: Pick<User, 'googleAccounts' | 'googleId'>): GoogleAccount[] {
  const accounts = [...(user.googleAccounts ?? [])];
  if (user.googleId && !accounts.some(a => a.id === user.googleId)) accounts.unshift({ id: user.googleId });
  return accounts;
}

/** What the website may show of a user: never the password hash. */
export interface PublicUser {
  clientId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  githubLogin?: string;
  googleAccounts: GoogleAccount[];
  methods: { password: boolean; google: boolean; github: boolean };
  createdAt?: string;
  lastLoginAt?: string;
}

export function publicUser(user: User): PublicUser {
  return {
    clientId: user.clientId,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    githubLogin: user.githubLogin,
    googleAccounts: googleAccountsOf(user),
    methods: { password: !!user.passwordHash, google: googleAccountsOf(user).length > 0, github: !!user.githubId },
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** The fields that must be one person's only. */
export type UniqueField = 'clientId' | 'email' | 'googleId' | 'githubId';
export type UserPatch = Partial<Omit<User, 'clientId' | 'createdAt'>>;

/** Another account already has this email, Google account or GitHub account. */
export class UserConflictError extends Error {
  constructor(public field: UniqueField) {
    super(`Another account already uses this ${field}`);
  }
}

export interface UserStore {
  /** `googleId` finds the user who has that Google account, however it is stored. */
  findBy(field: UniqueField, value: string): Promise<User | null>;
  list(): Promise<User[]>;
  /** Throws UserConflictError. */
  insert(user: User): Promise<void>;
  /** Sets the fields of `set`, removes those in `unset`. Throws UserConflictError. */
  update(clientId: string, set: UserPatch, unset?: (keyof UserPatch)[]): Promise<User | null>;
}

const COLLECTION = 'users';
const UNIQUE: UniqueField[] = ['clientId', 'email', 'googleId', 'githubId'];
/** Where each Google account's id is stored; unique like the rest, and read as `googleId`. */
const GOOGLE_IDS = 'googleAccounts.id';

let indexes: Promise<unknown> | undefined;

async function collection() {
  // Loaded on first use: lib/mongodb connects when it is imported.
  const { getDatabase } = await import('@/lib/mongodb');
  const db = await getDatabase();
  const users = db.collection<User>(COLLECTION);
  // Once per server. Optional fields are unique only where they are set.
  indexes ??= Promise.all(
    [...UNIQUE, GOOGLE_IDS].map(field =>
      users.createIndex(
        { [field]: 1 },
        field === 'clientId'
          ? { unique: true }
          : { unique: true, partialFilterExpression: { [field]: { $type: 'string' } } },
      ),
    ),
  ).catch(error => {
    indexes = undefined;
    throw error;
  });
  await indexes;
  return users;
}

function conflict(error: unknown): never {
  const e = error as { code?: number; keyPattern?: Record<string, unknown> };
  if (e?.code === 11000) {
    const field = Object.keys(e.keyPattern ?? {})[0];
    throw new UserConflictError(field === GOOGLE_IDS ? 'googleId' : ((field as UniqueField) ?? 'clientId'));
  }
  throw error;
}

const withoutUndefined = <T extends object>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;

const mongoStore: UserStore = {
  async findBy(field, value) {
    const filter = field === 'googleId' ? { $or: [{ googleId: value }, { [GOOGLE_IDS]: value }] } : { [field]: value };
    return (await collection()).findOne(filter, { projection: { _id: 0 } }) as Promise<User | null>;
  },
  async list() {
    return (await collection()).find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray() as Promise<User[]>;
  },
  async insert(user) {
    await (await collection()).insertOne(withoutUndefined(user) as User).catch(conflict);
  },
  async update(clientId, set, unset = []) {
    const users = await collection();
    const change: Record<string, unknown> = { $set: withoutUndefined(set) };
    if (unset.length > 0) change.$unset = Object.fromEntries(unset.map(field => [field, '']));
    return (await users
      .findOneAndUpdate({ clientId }, change, { returnDocument: 'after', projection: { _id: 0 } })
      .catch(conflict)) as User | null;
  },
};

let store: UserStore = mongoStore;

/** Tests swap in an in-memory store. */
export function setUserStore(next: UserStore | null) {
  store = next ?? mongoStore;
}

const now = () => new Date().toISOString();

export const getUserByClientId = (clientId: string) => store.findBy('clientId', clientId);
export const getUserByEmail = (email: string) => store.findBy('email', normalizeEmail(email));
export const getUserByGoogleId = (googleId: string) => store.findBy('googleId', googleId);
export const getUserByGithubId = (githubId: string) => store.findBy('githubId', githubId);
export const listUsers = () => store.list();

export async function createUser(input: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
  const user: User = { ...input, createdAt: now(), updatedAt: now() };
  await store.insert(user);
  return user;
}

/** Changes a user. Throws UserConflictError when a unique field is taken. */
export async function updateUser(clientId: string, set: UserPatch, unset?: (keyof UserPatch)[]) {
  return store.update(clientId, { ...set, updatedAt: now() }, unset);
}

/**
 * The user record of an account, made empty when the account predates sign-in
 * (a client id with keys and no record yet).
 */
export async function ensureUser(clientId: string, defaults: Pick<User, 'name'> = {}): Promise<User> {
  const existing = await store.findBy('clientId', clientId);
  if (existing) return existing;
  try {
    return await createUser({ clientId, ...defaults });
  } catch (error) {
    // Two requests at once: the other one made it.
    const made = error instanceof UserConflictError ? await store.findBy('clientId', clientId) : null;
    if (made) return made;
    throw error;
  }
}
