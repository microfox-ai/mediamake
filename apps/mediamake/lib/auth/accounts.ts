import { Redis } from '@upstash/redis';
import { CrudHash } from '@microfox/db-upstash';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import type { ApiKeyInfo } from '@/app/types/db';
import { CANONICAL_SITE, siteUrl } from '@/lib/catalog/install-prompt';
import { existingAccountMail, resetPasswordMail, verifyEmailMail, welcomeMail } from '@/lib/mail/templates';
import { sendMail } from '@/lib/mail/send';
import { hashPassword, passwordProblem, verifyPassword } from './password';
import {
  PROVIDER_NAMES,
  authorizeUrl,
  identityFromCode,
  newCodeVerifier,
  type Identity,
  type ProviderId,
} from './providers';
import { ACCOUNT_PAGE, inviteCodeFrom, safeRedirect } from './redirect';
import { deleteWebSessions, listWebSessions, validateApiKey } from './session';
import { allowAttempt, peekToken, putToken, takeToken } from './tokens';
import {
  UserConflictError,
  createUser,
  ensureUser,
  getUserByClientId,
  getUserByEmail,
  getUserByGithubId,
  getUserByGoogleId,
  googleAccountsOf,
  listUsers,
  normalizeEmail,
  publicUser,
  updateUser,
  type PublicUser,
  type User,
  type UserPatch,
} from './users';

/**
 * Accounts and how people sign in to them.
 *
 * - Email and password: sign-up mails a link, and the account is made when
 *   the link is confirmed, so an account never holds an unverified email.
 * - Google and GitHub: a known identity signs in; one whose verified email
 *   matches an account is added to it; a new one waits (15 minutes) while the
 *   person either proves an old account with its client id and key, or makes
 *   a new account.
 * - Old accounts (a client id and its API keys) get a user record when they
 *   are linked: by the key, by signing in on /core/login and adding a method,
 *   by an admin naming their email, or by a one-time link an admin sends
 *   (/login/claim), which links the Google or GitHub account they pick.
 *
 * Every function here returns the client id to sign in as; the routes make
 * the session (lib/auth/session.ts), which is unchanged.
 */

/** A refusal to show the person, with its HTTP status. */
export class AuthError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const VERIFY_TTL = 60 * 60 * 24;
const RESET_TTL = 60 * 60;
const OAUTH_TTL = 60 * 10;
const IDENTITY_TTL = 60 * 15;
const CLAIM_TTL = 60 * 60 * 24 * 7;
const WINDOW = 60 * 15;

const TOO_MANY = 'Too many tries. Wait a few minutes and try again.';
const now = () => new Date().toISOString();

const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());
const nameSchema = z.string().trim().min(1).max(80);

function parseEmail(value: unknown): string {
  const parsed = emailSchema.safeParse(value);
  if (!parsed.success) throw new AuthError('Enter a valid email address.');
  return normalizeEmail(parsed.data);
}

function parseName(value: unknown): string {
  const parsed = nameSchema.safeParse(value);
  if (!parsed.success) throw new AuthError('Enter your name (up to 80 characters).');
  return parsed.data;
}

function apiKeys() {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return new CrudHash<ApiKeyInfo>(redis, 'apiKeys');
}

// ── Who may sign up ──────────────────────────────────────────────────────────

/**
 * Anyone can sign up, unless MEDIAMAKE_SIGNUP=invite. Then a new account
 * needs a live invite code, which invite links carry in their
 * /access?code=… address.
 */
export const signupOpen = () => process.env.MEDIAMAKE_SIGNUP !== 'invite';

export const SIGNUP_CLOSED = 'Sign-up is invite only for now. Open your invite link to make an account.';

/** Swapped in tests, which have no database. */
export const authDeps = {
  /** The welcome mail, once, when an account is made. It never fails the sign-up. */
  async welcome(user: Pick<User, 'email' | 'name'>): Promise<void> {
    if (!user.email) return;
    try {
      await sendMail(welcomeMail(user.email, { name: user.name, appUrl: `${siteUrl() ?? CANONICAL_SITE}/app` }));
    } catch (error) {
      console.error('[auth] Could not send the welcome mail:', error);
    }
  },

  async inviteIsLive(code: string): Promise<boolean> {
    try {
      const { accessInvitesDB } = await import('@/lib/catalog/store');
      const invite = (await accessInvitesDB.list()).find(i => i.code === code);
      if (!invite || invite.disabledAt) return false;
      if (invite.expiresAt && invite.expiresAt <= now()) return false;
      return invite.uses < invite.maxUses;
    } catch (error) {
      console.error('[auth] Could not check the invite:', error);
      return false;
    }
  },
};

export async function maySignUp(redirectTo: string | null | undefined): Promise<boolean> {
  if (signupOpen()) return true;
  const code = inviteCodeFrom(redirectTo);
  return code ? authDeps.inviteIsLive(code) : false;
}

// ── New accounts ─────────────────────────────────────────────────────────────

function clientIdFor(seed: string) {
  const slug = seed
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  return `${slug || 'member'}-${randomBytes(3).toString('hex')}`;
}

/**
 * Makes an account: a client id of its own, its user record, and one API key
 * (the MCP sign-in and the command line run on a key).
 */
async function createAccount(input: {
  email?: string;
  passwordHash?: string;
  name?: string;
  identity?: Identity;
}): Promise<User> {
  const { identity } = input;
  const email = input.email ?? identity?.email;
  const name = input.name ?? identity?.name;
  const keys = apiKeys();
  const taken = new Set((await keys.list()).filter(Boolean).map(k => k.clientId));

  let user: User | undefined;
  for (let attempt = 0; attempt < 5 && !user; attempt++) {
    const clientId = clientIdFor(name ?? email?.split('@')[0] ?? 'member');
    if (taken.has(clientId)) continue;
    try {
      user = await createUser({
        clientId,
        email,
        emailVerifiedAt: email ? now() : undefined,
        passwordHash: input.passwordHash,
        googleAccounts: identity?.provider === 'google' ? [{ id: identity.id, email: identity.email }] : undefined,
        githubId: identity?.provider === 'github' ? identity.id : undefined,
        githubLogin: identity?.provider === 'github' ? identity.login : undefined,
        name,
        avatarUrl: identity?.avatarUrl,
        lastLoginAt: now(),
      });
    } catch (error) {
      if (!(error instanceof UserConflictError)) throw error;
      if (error.field !== 'clientId') throw new AuthError('This account already exists. Sign in instead.', 409);
    }
  }
  if (!user) throw new AuthError('Could not make the account. Try again.', 500);

  const apiKey = randomBytes(16).toString('hex');
  await keys.set(apiKey, {
    id: apiKey,
    apiKey,
    clientId: user.clientId,
    clientName: name ?? email ?? user.clientId,
    isValid: true,
  });
  await authDeps.welcome(user);
  return user;
}

// ── Email and password ───────────────────────────────────────────────────────

type VerifyToken =
  | { type: 'signup'; email: string; passwordHash: string; name: string; redirectTo?: string }
  | { type: 'email'; clientId: string; email: string };

const verifyLink = (origin: string, token: string) => `${origin}/login/verify?token=${encodeURIComponent(token)}`;
const resetLink = (origin: string, token: string) => `${origin}/login/reset?token=${encodeURIComponent(token)}`;

/**
 * Starts a sign-up: mails a link to confirm. Answers the same whether or not
 * the address already has an account (that person gets a different mail).
 */
export async function startSignup(input: {
  email: unknown;
  password: unknown;
  name: unknown;
  redirectTo?: string | null;
  origin: string;
  ip: string;
}): Promise<void> {
  const email = parseEmail(input.email);
  const name = parseName(input.name);
  const problem = passwordProblem(input.password);
  if (problem) throw new AuthError(problem);
  if (!(await maySignUp(input.redirectTo))) throw new AuthError(SIGNUP_CLOSED, 403);
  if (!(await allowAttempt(`signup:${email}`, 3, 60 * 60)) || !(await allowAttempt(`signup-ip:${input.ip}`, 20, 60 * 60))) {
    throw new AuthError(TOO_MANY, 429);
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    const token = await putToken('reset', { clientId: existing.clientId }, RESET_TTL);
    await sendMail(existingAccountMail(email, resetLink(input.origin, token)));
    return;
  }
  const token = await putToken<VerifyToken>(
    'verify',
    {
      type: 'signup',
      email,
      passwordHash: await hashPassword(input.password as string),
      name,
      redirectTo: safeRedirect(input.redirectTo, '') || undefined,
    },
    VERIFY_TTL,
  );
  await sendMail(verifyEmailMail(email, verifyLink(input.origin, token)));
}

/** What a verification link is for, without using it up (the page shows it). */
export async function describeVerification(token: string | undefined | null) {
  const saved = await peekToken<VerifyToken>('verify', token);
  return saved ? { type: saved.type, email: saved.email } : null;
}

/**
 * Confirms a mailed link. A sign-up link makes the account and signs in
 * (`signIn`); a link that adds an email to an account only adds it.
 */
export async function confirmEmail(
  token: string | undefined | null,
): Promise<{ clientId: string; signIn: boolean; redirectTo?: string }> {
  const saved = await takeToken<VerifyToken>('verify', token);
  if (!saved) throw new AuthError('This link has expired or was already used. Ask for a new one.', 410);

  if (saved.type === 'signup') {
    if (await getUserByEmail(saved.email)) throw new AuthError('This email already has an account. Sign in instead.', 409);
    const user = await createAccount({ email: saved.email, passwordHash: saved.passwordHash, name: saved.name });
    return { clientId: user.clientId, signIn: true, redirectTo: saved.redirectTo };
  }

  await ensureUser(saved.clientId);
  try {
    await updateUser(saved.clientId, { email: saved.email, emailVerifiedAt: now() });
  } catch (error) {
    if (error instanceof UserConflictError) throw new AuthError('Another account already uses this email.', 409);
    throw error;
  }
  return { clientId: saved.clientId, signIn: false, redirectTo: ACCOUNT_PAGE };
}

// Checked when the email has no account, so both answers take as long.
let dummyHash: Promise<string> | undefined;

export async function signInWithPassword(input: { email: unknown; password: unknown; ip: string }): Promise<{ clientId: string }> {
  const wrong = new AuthError('Wrong email or password.', 401);
  const parsed = emailSchema.safeParse(input.email);
  if (!parsed.success || typeof input.password !== 'string' || !input.password) throw wrong;
  const email = normalizeEmail(parsed.data);
  if (!(await allowAttempt(`login:${email}`, 10, WINDOW)) || !(await allowAttempt(`login-ip:${input.ip}`, 60, WINDOW))) {
    throw new AuthError(TOO_MANY, 429);
  }

  const user = await getUserByEmail(email);
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
  const ok = await verifyPassword(input.password, user?.passwordHash ?? (await dummyHash));
  if (!user?.passwordHash || !ok) throw wrong;
  await updateUser(user.clientId, { lastLoginAt: now() });
  return { clientId: user.clientId };
}

/** Mails a reset link when the address has an account. Always answers the same. */
export async function requestPasswordReset(input: { email: unknown; origin: string; ip: string }): Promise<void> {
  const email = parseEmail(input.email);
  if (!(await allowAttempt(`forgot:${email}`, 3, 60 * 60)) || !(await allowAttempt(`forgot-ip:${input.ip}`, 20, 60 * 60))) {
    throw new AuthError(TOO_MANY, 429);
  }
  const user = await getUserByEmail(email);
  if (!user) return;
  const token = await putToken('reset', { clientId: user.clientId }, RESET_TTL);
  await sendMail(resetPasswordMail(email, resetLink(input.origin, token)));
}

async function signOutWebsite(clientId: string) {
  const sessions = (await listWebSessions()).filter(s => s.session.clientId === clientId);
  if (sessions.length > 0) await deleteWebSessions(sessions.map(s => s.token));
}

/** Sets a new password from a mailed link and signs every browser out. */
export async function resetPassword(input: { token: unknown; password: unknown }): Promise<{ clientId: string }> {
  const problem = passwordProblem(input.password);
  if (problem) throw new AuthError(problem);
  const saved = await takeToken<{ clientId: string }>('reset', typeof input.token === 'string' ? input.token : null);
  const user = saved && (await getUserByClientId(saved.clientId));
  if (!user) throw new AuthError('This link has expired or was already used. Ask for a new one.', 410);
  await updateUser(user.clientId, { passwordHash: await hashPassword(input.password as string), lastLoginAt: now() });
  await signOutWebsite(user.clientId);
  return { clientId: user.clientId };
}

// ── Google and GitHub ────────────────────────────────────────────────────────

interface OAuthState {
  provider: ProviderId;
  codeVerifier: string;
  redirectTo?: string;
  /** Set when a signed-in person adds the provider to their account. */
  connectTo?: string;
  /** Set when the person came from an admin's link for an old account (/login/claim). */
  claim?: string;
}

interface PendingIdentity {
  identity: Identity;
  redirectTo?: string;
}

/** Starts the round trip. `state` also goes in a cookie, so the answer must come back to the same browser. */
export async function startOAuth(
  provider: ProviderId,
  input: { origin: string; redirectTo?: string | null; connectTo?: string | null; claim?: string | null },
): Promise<{ url: string; state: string }> {
  const codeVerifier = newCodeVerifier();
  const state = await putToken<OAuthState>(
    'oauth',
    {
      provider,
      codeVerifier,
      redirectTo: safeRedirect(input.redirectTo, '') || undefined,
      connectTo: input.connectTo || undefined,
      claim: input.claim || undefined,
    },
    OAUTH_TTL,
  );
  return { url: authorizeUrl(provider, { origin: input.origin, state, codeVerifier }), state };
}

const ownerOf = (identity: Pick<Identity, 'provider' | 'id'>) =>
  identity.provider === 'google' ? getUserByGoogleId(identity.id) : getUserByGithubId(identity.id);

/**
 * Adds an identity to an account, and what the account lacks from its
 * profile. An account can have several Google accounts and one GitHub account.
 */
async function attachIdentity(user: User, identity: Identity): Promise<User> {
  const provider = PROVIDER_NAMES[identity.provider];
  const taken = new AuthError(`That ${provider} account is already linked to another MediaMake account.`, 409);
  const owner = await ownerOf(identity);
  if (owner && owner.clientId !== user.clientId) throw taken;

  const patch: UserPatch = {
    name: user.name ?? identity.name,
    avatarUrl: user.avatarUrl ?? identity.avatarUrl,
    lastLoginAt: now(),
  };
  const unset: (keyof UserPatch)[] = [];
  if (identity.provider === 'google') {
    const accounts = googleAccountsOf(user);
    if (!accounts.some(a => a.id === identity.id)) accounts.push({ id: identity.id, email: identity.email });
    patch.googleAccounts = accounts;
    // The list now holds the id an older record kept on its own.
    if (user.googleId) unset.push('googleId');
  } else {
    if (user.githubId && user.githubId !== identity.id) {
      throw new AuthError('This account is already linked to another GitHub account. Remove it first.', 409);
    }
    patch.githubId = identity.id;
    patch.githubLogin = identity.login;
  }
  const withEmail: UserPatch =
    !user.email && identity.email ? { ...patch, email: identity.email, emailVerifiedAt: now() } : patch;
  try {
    return (await updateUser(user.clientId, withEmail, unset))!;
  } catch (error) {
    if (!(error instanceof UserConflictError)) throw error;
    if (error.field !== 'email') throw taken;
    // Its email belongs to another account: link the identity without it.
    return (await updateUser(user.clientId, patch, unset))!;
  }
}

export type OAuthResult =
  | { kind: 'signed-in'; clientId: string; redirectTo?: string }
  | { kind: 'connected'; clientId: string; redirectTo?: string }
  /** Nobody has this identity yet: /login/link asks whose it is. */
  | { kind: 'pending'; pending: string; redirectTo?: string };

/** Finishes the round trip on the provider's callback. */
export async function finishOAuth(
  provider: ProviderId,
  input: {
    origin: string;
    code: string | null;
    state: string | null;
    cookieState: string | undefined;
    /** The account signed in on this browser, if any. */
    sessionClientId: string | null;
  },
): Promise<OAuthResult> {
  const name = PROVIDER_NAMES[provider];
  const failed = new AuthError(`${name} sign-in did not finish. Try again.`);
  if (!input.code || !input.state || input.state !== input.cookieState) throw failed;
  const saved = await takeToken<OAuthState>('oauth', input.state);
  if (!saved || saved.provider !== provider) throw failed;

  let identity: Identity;
  try {
    identity = await identityFromCode(provider, { origin: input.origin, code: input.code, codeVerifier: saved.codeVerifier });
  } catch (error) {
    console.error(`[auth] ${name} sign-in failed:`, error);
    throw failed;
  }

  if (saved.connectTo) {
    if (saved.connectTo !== input.sessionClientId) throw new AuthError('Sign in again, then add the account.', 401);
    await attachIdentity(await ensureUser(saved.connectTo), identity);
    return { kind: 'connected', clientId: saved.connectTo, redirectTo: saved.redirectTo };
  }

  if (saved.claim) {
    const claim = await peekToken<ClaimToken>('claim', saved.claim);
    if (!claim) throw new AuthError(CLAIM_GONE, 410);
    await attachIdentity(await ensureUser(claim.clientId, { name: claim.name }), identity);
    await takeToken('claim', saved.claim);
    return { kind: 'signed-in', clientId: claim.clientId, redirectTo: saved.redirectTo };
  }

  const known = await ownerOf(identity);
  if (known) {
    await updateUser(known.clientId, {
      lastLoginAt: now(),
      githubLogin: provider === 'github' ? identity.login : undefined,
      name: known.name ?? identity.name,
      avatarUrl: known.avatarUrl ?? identity.avatarUrl,
    });
    return { kind: 'signed-in', clientId: known.clientId, redirectTo: saved.redirectTo };
  }

  // The provider vouches for the email, and ours are only stored once verified.
  const byEmail = identity.email ? await getUserByEmail(identity.email) : null;
  if (byEmail) {
    await attachIdentity(byEmail, identity);
    return { kind: 'signed-in', clientId: byEmail.clientId, redirectTo: saved.redirectTo };
  }

  const pending = await putToken<PendingIdentity>('identity', { identity, redirectTo: saved.redirectTo }, IDENTITY_TTL);
  return { kind: 'pending', pending, redirectTo: saved.redirectTo };
}

/** The identity waiting on /login/link, for the page to name. */
export async function describePending(pending: string | undefined | null) {
  const saved = await peekToken<PendingIdentity>('identity', pending);
  if (!saved) return null;
  const { identity } = saved;
  return {
    provider: identity.provider,
    label: identity.email ?? identity.login ?? identity.name ?? PROVIDER_NAMES[identity.provider],
    redirectTo: saved.redirectTo,
    maySignUp: await maySignUp(saved.redirectTo),
  };
}

const PENDING_GONE = 'That took too long. Sign in again.';

/** An old account's owner proves it with the client id and key, and the waiting identity is linked to it. */
export async function linkPendingWithKey(input: {
  pending: string | undefined | null;
  clientId: unknown;
  clientKey: unknown;
  ip: string;
}): Promise<{ clientId: string; redirectTo?: string }> {
  if (!(await allowAttempt(`link-ip:${input.ip}`, 10, WINDOW))) throw new AuthError(TOO_MANY, 429);
  const saved = await peekToken<PendingIdentity>('identity', input.pending);
  if (!saved) throw new AuthError(PENDING_GONE, 410);
  const key =
    typeof input.clientId === 'string' && typeof input.clientKey === 'string' && input.clientId && input.clientKey
      ? await validateApiKey(input.clientKey.trim(), input.clientId.trim())
      : null;
  if (!key) throw new AuthError('Wrong client id or key.', 401);

  const user = await ensureUser(key.clientId, { name: key.clientName || undefined });
  await attachIdentity(user, saved.identity);
  await takeToken('identity', input.pending);
  return { clientId: key.clientId, redirectTo: saved.redirectTo };
}

/** Makes a new account for the waiting identity. */
export async function createFromPending(pending: string | undefined | null): Promise<{ clientId: string; redirectTo?: string }> {
  const saved = await peekToken<PendingIdentity>('identity', pending);
  if (!saved) throw new AuthError(PENDING_GONE, 410);
  if (!(await maySignUp(saved.redirectTo))) throw new AuthError(SIGNUP_CLOSED, 403);
  if (!(await takeToken('identity', pending))) throw new AuthError(PENDING_GONE, 410);
  const user = await createAccount({ identity: saved.identity });
  return { clientId: user.clientId, redirectTo: saved.redirectTo };
}

// ── One-time links for old accounts ──────────────────────────────────────────

interface ClaimToken {
  clientId: string;
  name?: string;
}

const CLAIM_GONE = 'This link has expired or was already used. Ask for a new one.';

/**
 * A link an admin sends to the owner of an old account. Whoever opens it
 * links their Google or GitHub account to that account and is signed in, so
 * it goes only to that person. It works once, for 7 days.
 */
export async function createClaimLink(input: { clientId: unknown; origin: string }): Promise<{ url: string; clientId: string }> {
  const clientId = typeof input.clientId === 'string' ? input.clientId.trim() : '';
  const key = clientId ? (await apiKeys().list()).filter(Boolean).find(k => k.clientId === clientId) : undefined;
  const user = clientId ? await getUserByClientId(clientId) : null;
  if (!key && !user) throw new AuthError('No account has this client id.', 404);
  const token = await putToken<ClaimToken>('claim', { clientId, name: user?.name ?? (key?.clientName || undefined) }, CLAIM_TTL);
  return { url: `${input.origin}/login/claim?token=${encodeURIComponent(token)}`, clientId };
}

/** The account a link is for, for /login/claim to name. Leaves the link usable. */
export const describeClaim = (token: string | undefined | null) => peekToken<ClaimToken>('claim', token);

// ── A signed-in person's own sign-in methods ─────────────────────────────────

export async function getAccount(clientId: string): Promise<PublicUser> {
  const user = await getUserByClientId(clientId);
  return user ? publicUser(user) : { clientId, googleAccounts: [], methods: { password: false, google: false, github: false } };
}

/** Mails a link that adds `email` to the account once confirmed. */
export async function requestEmailChange(input: { clientId: string; email: unknown; origin: string }): Promise<void> {
  const email = parseEmail(input.email);
  if (!(await allowAttempt(`email:${input.clientId}`, 5, 60 * 60))) throw new AuthError(TOO_MANY, 429);
  const token = await putToken<VerifyToken>('verify', { type: 'email', clientId: input.clientId, email }, VERIFY_TTL);
  await sendMail(verifyEmailMail(email, verifyLink(input.origin, token), { adding: true }));
}

/** Sets or changes the password. Changing one needs the current one. */
export async function setPassword(input: { clientId: string; password: unknown; currentPassword?: unknown }): Promise<void> {
  const problem = passwordProblem(input.password);
  if (problem) throw new AuthError(problem);
  const user = await ensureUser(input.clientId);
  if (!user.email) throw new AuthError('Add an email first: you sign in with your email and this password.');
  if (user.passwordHash) {
    if (!(await allowAttempt(`password:${input.clientId}`, 10, WINDOW))) throw new AuthError(TOO_MANY, 429);
    const ok = typeof input.currentPassword === 'string' && (await verifyPassword(input.currentPassword, user.passwordHash));
    if (!ok) throw new AuthError('Your current password is wrong.', 401);
  }
  await updateUser(user.clientId, { passwordHash: await hashPassword(input.password as string) });
}

/**
 * Removes GitHub, or one Google account (`googleId`; all of them when left
 * out), unless that would leave no way to sign in on /login.
 */
export async function unlinkProvider(clientId: string, provider: ProviderId, googleId?: string): Promise<void> {
  const user = await getUserByClientId(clientId);
  if (!user) return;
  const google = googleAccountsOf(user);
  const googleLeft = provider === 'google' ? (googleId ? google.filter(a => a.id !== googleId) : []) : google;
  const githubLeft = provider === 'github' ? false : !!user.githubId;
  if (provider === 'google' ? googleLeft.length === google.length : !user.githubId) return;
  if (!user.passwordHash && !githubLeft && googleLeft.length === 0) {
    throw new AuthError('Add a password or another account first, so you can still sign in.');
  }
  if (provider === 'github') await updateUser(clientId, {}, ['githubId', 'githubLogin']);
  else if (googleLeft.length > 0) await updateUser(clientId, { googleAccounts: googleLeft }, ['googleId']);
  else await updateUser(clientId, {}, ['googleAccounts', 'googleId']);
}

export async function setName(clientId: string, name: unknown): Promise<void> {
  await ensureUser(clientId);
  await updateUser(clientId, { name: parseName(name) });
}

// ── Admins ───────────────────────────────────────────────────────────────────

export interface AccountRow extends PublicUser {
  /** False for an account from before sign-in that nobody has linked yet. */
  linked: boolean;
}

/** Every account: the linked ones, then client ids that still only have keys. */
export async function listAccounts(): Promise<AccountRow[]> {
  const [users, keys] = await Promise.all([listUsers(), apiKeys().list()]);
  const linked = new Set(users.map(u => u.clientId));
  const old = new Map<string, string>();
  for (const key of keys.filter(Boolean)) {
    if (!linked.has(key.clientId) && !old.has(key.clientId)) old.set(key.clientId, key.clientName);
  }
  return [
    ...users.map(u => ({ ...publicUser(u), linked: true })),
    ...[...old].map(([clientId, name]) => ({
      clientId,
      name,
      linked: false,
      googleAccounts: [],
      methods: { password: false, google: false, github: false },
    })),
  ];
}

/**
 * An admin vouches that `email` is the person behind an old account. They can
 * then sign in with a Google or GitHub account of that address, or set a
 * password with "Forgot password".
 */
export async function adminLinkAccount(input: { clientId: unknown; email: unknown; name?: unknown }): Promise<PublicUser> {
  const clientId = typeof input.clientId === 'string' ? input.clientId.trim() : '';
  const email = parseEmail(input.email);
  const key = clientId ? (await apiKeys().list()).filter(Boolean).find(k => k.clientId === clientId) : undefined;
  const existing = clientId ? await getUserByClientId(clientId) : null;
  if (!key && !existing) throw new AuthError('No account has this client id.', 404);
  const user = existing ?? (await ensureUser(clientId, { name: key?.clientName || undefined }));
  const name = typeof input.name === 'string' && input.name.trim() ? parseName(input.name) : user.name;
  try {
    return publicUser((await updateUser(clientId, { email, emailVerifiedAt: now(), name }))!);
  } catch (error) {
    if (error instanceof UserConflictError) throw new AuthError('Another account already uses this email.', 409);
    throw error;
  }
}
