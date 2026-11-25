import { createHash } from 'crypto';
import { isAdmin } from '@/lib/admin-utils';
import { detailsKey } from '@/lib/app-shell/details-key';
import { getUserByClientId } from '@/lib/auth/users';
import { picturesFolder } from '@/lib/catalog/author-listing';
import { isRepoSkill } from '@/lib/catalog/items';
import { getCatalogRecord } from '@/lib/catalog/records';
import { packageKey, putPackage } from '@/lib/catalog/storage';
import { catalogItemsDB, catalogListingDB, listingMarksDB, skillProfilesDB } from '@/lib/catalog/store';
import { submissionDecidedMail } from '@/lib/mail/templates';
import { deliver, grantContribution, lastsInWords, type Mailed } from '@/lib/memberships/admin';
import { itemTier } from '@/lib/catalog/types';
import { tierLabel, type MemberTier } from '@/lib/memberships/tiers';
import { putPublicUpload } from '@/lib/spaces-upload';
import { bundleOf, commitMessage, packageEntries, packageProblem, prBody, prTitle, publicSkillFiles, releaseNotes, storeFiles } from './delivery';
import { commitFolder, github, githubProblem, openPullRequest, publicRepo, storeRepo, storeToken, type Github } from './github';
import { authorsOf, isAuthor, settleAuthors } from './authors';
import { fillListingFromPackage, listingLine, listingNotes, type ListingFill, type PackageListingStore } from './package-listing';
import { submissionsDB } from './store';
import {
  checkFiles,
  earnedTier,
  isSubmissionTier,
  isUndecided,
  productionNeeded,
  updatesDirectly,
  routeOf,
  submissionBranch,
  SUBMISSIONS_PER_DAY,
  type Delivery,
  type MembershipChoice,
  type Submission,
  type SubmissionFile,
  type SubmissionInput,
  type SubmissionTier,
} from './submission';
import { tarGz } from './tar';

/**
 * What happens to a submission, in one place: it is sent (or sent again), an
 * admin approves it, asks for changes or declines it, its sender withdraws
 * it, its pull request merges. The member API (/api/submissions), the admin
 * page (/api/admin/submissions) and the merge report (/api/feedback-hook)
 * all call these.
 */

export type Outcome =
  | {
      ok: true;
      submission: Submission;
      mailed?: Mailed;
      notes?: string[];
      /** What a released skill's listing took from its package's README.md, in one line (./package-listing). */
      listing?: string;
    }
  | { ok: false; why: string; status?: number };

const DAY = 24 * 60 * 60 * 1000;

/** Saves what a member sent. The same item sent again before a decision replaces the earlier files. */
export async function sendSubmission(clientId: string, tier: MemberTier, input: SubmissionInput): Promise<Outcome> {
  if (!input.made && productionNeeded(tier)) {
    return { ok: false, status: 400, why: "Name the finished production made with it (made.title, --made): we publish nothing we don't use. Cohort members and admins may leave it out" };
  }
  if (input.publish && tier !== 'admin') return { ok: false, status: 403, why: 'Only an admin publishes directly: send it without publish, and an admin reviews it' };
  const itemId = `${input.kind}/${input.slug}`;
  // names are first come, first served; an item already in the store takes updates from its authors and admins
  const taken = await submissionsDB.takenBy(itemId, clientId);
  if (taken && !(await mayUpdate(itemId, clientId, tier))) return { ok: false, status: 409, why: `Someone else already submitted an item named ${input.slug}. Give yours another name` };
  const record = await getCatalogRecord(itemId).catch(() => null);
  if (record?.madeBy) return { ok: false, status: 409, why: `${itemId} is in the catalog as made by ${record.madeBy.name}. Give yours another name` };
  if ((await submissionsDB.countSince(clientId, new Date(Date.now() - DAY).toISOString())) >= SUBMISSIONS_PER_DAY) {
    return { ok: false, status: 429, why: `That is ${SUBMISSIONS_PER_DAY} in a day: send the rest tomorrow` };
  }
  const checks = checkFiles(input.files);
  const open = await submissionsDB.undecidedOf(clientId, itemId);
  const submission = open ? await submissionsDB.resend(open.submissionId, tier, input, checks) : await submissionsDB.add(clientId, tier, input, checks);
  return submission ? { ok: true, submission } : { ok: false, why: 'It was decided while you were sending it. Look at its status' };
}

/** Whether an account may send a new version of an item already accepted into the store: an admin, or one of its authors. */
async function mayUpdate(itemId: string, clientId: string, tier: MemberTier): Promise<boolean> {
  const authors = await authorsOf(itemId);
  return tier === 'admin' ? authors.length > 0 : authors.some(author => author.clientId === clientId);
}

/** Its sender takes it back before a decision. */
export async function withdrawSubmission(submissionId: string, clientId: string): Promise<Outcome> {
  const before = await submissionsDB.get(submissionId);
  if (!before || before.clientId !== clientId) return { ok: false, status: 404, why: 'No such submission' };
  if (!isUndecided(before.status)) return { ok: false, status: 409, why: 'It is already decided, so it cannot be withdrawn' };
  const submission = await submissionsDB.update(submissionId, { status: 'withdrawn' }, ['pending', 'changes']);
  if (!submission) return { ok: false, status: 409, why: 'It was decided while you were withdrawing it' };
  await submissionsDB.dropFiles(submissionId);
  return { ok: true, submission };
}

async function tell(submission: Submission, mail: (to: string) => Parameters<typeof deliver>[0], notify?: boolean): Promise<Mailed> {
  if (notify === false) return { sent: false, why: 'You chose not to mail them' };
  const user = await getUserByClientId(submission.clientId).catch(() => null);
  if (!user?.email) return { sent: false, why: 'The account has no email yet' };
  return deliver(mail(user.email));
}

/** An admin asks for changes (the sender sends it again) or declines it (closed). Both need their reason. */
export async function reviewSubmission(input: {
  submissionId: string;
  outcome: 'changes' | 'declined';
  note: string;
  by: string;
  origin: string;
  notify?: boolean;
}): Promise<Outcome> {
  const note = input.note.trim().slice(0, 1000);
  if (note.length < 3) return { ok: false, why: input.outcome === 'changes' ? 'Say what to change: the sender reads it' : 'Say why: the sender reads it' };
  const submission = await submissionsDB.update(input.submissionId, { status: input.outcome, review: { by: input.by, at: new Date().toISOString(), note } }, ['pending', 'changes']);
  if (!submission) return { ok: false, status: 409, why: 'It is no longer waiting for a decision' };
  if (input.outcome === 'declined') await submissionsDB.dropFiles(input.submissionId);
  const mailed = await tell(submission, to => submissionDecidedMail(to, { item: submission.title, outcome: input.outcome, note, url: `${input.origin}/app/mine` }), input.notify);
  return { ok: true, submission, mailed };
}

/** A Public skill: one commit on its own branch of the public repository, and the pull request. */
async function deliverPr(gh: Github, submission: Submission, files: SubmissionFile[], origin: string): Promise<Delivery> {
  const repo = publicRepo();
  const branch = submissionBranch(submission.submissionId);
  const update = isRepoSkill(submission.itemId);
  const tree = publicSkillFiles(submission.slug, files);
  await commitFolder(gh, { repo, branch, ...tree, message: `${prTitle(submission, update)}${submission.made ? `\n\nMade with this: ${submission.made.title}` : ''}` });
  // only a GitHub login is named in public: never a name or an email
  const login = (await getUserByClientId(submission.clientId).catch(() => null))?.githubLogin;
  const pr = await openPullRequest(gh, { repo, head: branch, title: prTitle(submission, update), body: prBody(submission, { by: login, update, site: origin }) });
  return { kind: 'pr', repo, branch, number: pr.number, url: pr.url, state: 'open', at: new Date().toISOString() };
}

/** Where a release reads and writes a skill's listing, its details and what the last release put there (./package-listing). */
const listingStore: PackageListingStore = {
  listing: itemId => catalogListingDB.get(itemId),
  saveListing: (itemId, listing, by) => catalogListingDB.set(itemId, listing, by),
  details: async itemId => {
    const profile = await skillProfilesDB.get(detailsKey.catalog(itemId));
    return profile?.type ? { type: profile.type, ...(profile.type === 'subset' && profile.superset && { superset: profile.superset }) } : null;
  },
  // only a subset has a superset: any other type clears it
  saveDetails: (itemId, details, by) => skillProfilesDB.set({ key: detailsKey.catalog(itemId), type: details.type, superset: details.superset ?? null }, by),
  mark: itemId => listingMarksDB.get(itemId),
  saveMark: (mark, by) => listingMarksDB.set(mark, by),
  // where a listing's pictures are kept: the folder Upload on its page and catalog_upload_picture use
  upload: ({ itemId, by, name, contentType, bytes }) => putPublicUpload({ clientId: by, subPath: picturesFolder(itemId), filename: name, contentType, body: bytes }),
};

/**
 * Releases the item's folder as a package at its tier, in Beta. Throws with words an admin can act
 * on. A skill's listing is then filled from the package's README.md (./package-listing): what
 * that did comes back, and a listing that could not be filled never undoes the release.
 */
async function releasePackage(submission: Submission, tier: SubmissionTier, folder: string, tree: { path: string; content: string; encoding: 'utf8' | 'base64' }[], by: string): Promise<ListingFill | null> {
  const bundle = submission.kind === 'mcp' ? bundleOf(tree.map(file => ({ path: file.path.slice(folder.length + 1) }))) : undefined;
  const item = await catalogItemsDB.upsert(
    {
      id: submission.itemId,
      kind: submission.kind,
      slug: submission.slug,
      title: submission.title,
      summary: submission.summary,
      tier,
      status: 'beta',
      listed: true,
      ...(bundle && { install: { method: 'mcpb' as const, entry: bundle } }),
    },
    by,
  );
  const bytes = tarGz(packageEntries(folder, tree));
  const storageKey = packageKey(submission.itemId, submission.version);
  await putPackage(storageKey, bytes);
  await catalogItemsDB.addVersion(submission.itemId, {
    version: submission.version,
    storageKey,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
    notes: releaseNotes(submission),
    publishedAt: new Date().toISOString(),
    publishedBy: by,
  });
  try {
    return await fillListingFromPackage(listingStore, {
      itemId: submission.itemId,
      kind: submission.kind,
      version: submission.version,
      files: tree.map(file => ({ path: file.path.slice(folder.length + 1), content: file.content, encoding: file.encoding })),
      by,
      // an approval is an admin's; a direct update may be its Cohort author's own
      byAdmin: await isAdmin(by),
      ownTags: item.tags,
    });
  } catch (error) {
    console.error(`[submissions] Could not fill the listing of ${submission.itemId}@${submission.version}:`, error);
    return { filled: [], kept: [], notes: ['Its package is released, but its listing could not be filled from its README.md: set it on its page'] };
  }
}

/** What a release tells its sender about the listing: the line on what it took, and what to know. */
const aboutListing = (fill: ListingFill | null | undefined) => ({ line: (fill && listingLine(fill)) || undefined, notes: fill ? listingNotes(fill) : [] });

/** Everything else: one commit on the store repository's main branch, then its package in the catalog. */
async function deliverStore(gh: Github, submission: Submission, tier: SubmissionTier, files: SubmissionFile[], by: string): Promise<{ delivery: Delivery; fill?: ListingFill | null }> {
  const repo = storeRepo();
  const tree = storeFiles(submission, tier, files);
  const existing = await catalogItemsDB.get(submission.itemId);
  const commit = await commitFolder(gh, { repo, ...tree, message: commitMessage(submission, tier, !!existing) });
  const delivery: Delivery = { kind: 'store', repo, path: tree.folder, commit: commit.sha, commitUrl: commit.url, version: submission.version, released: false, at: new Date().toISOString() };
  const problem = packageProblem(submission.kind, files);
  if (problem) return { delivery: { ...delivery, why: problem } };
  try {
    const fill = await releasePackage(submission, tier, tree.folder, tree.files, by);
    return { delivery: { ...delivery, released: true }, fill };
  } catch (error) {
    console.error(`[submissions] Could not release ${submission.itemId}@${submission.version}:`, error);
    return { delivery: { ...delivery, why: `Its files are in ${repo}, but the package could not be released: ${(error as Error).message}` } };
  }
}

/** What stops an approval before anything is sent anywhere, or null. */
async function approvalProblem(submission: Submission, tier: SubmissionTier): Promise<string | null> {
  if (submission.checks.problems.length > 0) {
    return `The leak checks still stop on ${submission.checks.problems.length} line${submission.checks.problems.length === 1 ? '' : 's'} (a key, a token or a path on a computer). Ask for changes instead`;
  }
  if (!storeToken()) return 'STORE_GITHUB_TOKEN is not set: MediaMake cannot write to the repositories yet';
  if (submission.kind === 'skill' && tier !== 'public' && isRepoSkill(submission.itemId)) {
    return `${submission.slug} is already a skill in the public repository, so it can only be accepted as Public`;
  }
  if (routeOf(submission.kind, tier) === 'store') {
    const existing = await catalogItemsDB.get(submission.itemId);
    if (existing?.madeBy) return `${submission.itemId} is in the catalog as made by ${existing.madeBy.name}`;
    if (existing?.versions.some(version => version.version === submission.version)) {
      return `${submission.itemId}@${submission.version} is already released. Ask for changes: it needs a higher version`;
    }
  }
  return null;
}

/**
 * An admin accepts a submission at a tier. Its files go where the tier says
 * (./submission `routeOf`), it enters as Beta, its sender earns a membership
 * for CONTRIBUTION_MONTHS unless the admin gives none, and they are mailed.
 * When the repository refuses, nothing is decided and the answer says why.
 */
export async function approveSubmission(input: {
  submissionId: string;
  tier: SubmissionTier;
  /** The membership it earns. Left out: `earnedTier(tier)`. */
  membership?: MembershipChoice;
  note?: string;
  by: string;
  origin: string;
  notify?: boolean;
}): Promise<Outcome> {
  const before = await submissionsDB.get(input.submissionId);
  if (!before) return { ok: false, status: 404, why: 'No such submission' };
  if (!isUndecided(before.status)) return { ok: false, status: 409, why: 'It is no longer waiting for a decision' };
  const problem = await approvalProblem(before, input.tier);
  if (problem) return { ok: false, why: problem };
  const files = await submissionsDB.filesOf(input.submissionId);
  if (files.length === 0) return { ok: false, why: 'Its files are gone. Ask the sender to send it again' };

  // one admin at a time: the claim stops a second click from delivering it twice
  if (!(await submissionsDB.claim(input.submissionId, input.by))) return { ok: false, status: 409, why: 'Another admin is approving it right now' };
  let delivery: Delivery;
  let fill: ListingFill | null | undefined;
  try {
    const gh = github(storeToken());
    if (routeOf(before.kind, input.tier) === 'pr') delivery = await deliverPr(gh, before, files, input.origin);
    else ({ delivery, fill } = await deliverStore(gh, before, input.tier, files, input.by));
  } catch (error) {
    await submissionsDB.release(input.submissionId);
    console.error(`[submissions] Could not deliver ${input.submissionId}:`, error);
    return { ok: false, why: githubProblem(error, routeOf(before.kind, input.tier) === 'pr' ? publicRepo() : storeRepo()) };
  }

  const choice = input.membership ?? earnedTier(input.tier);
  const note = input.note?.trim().slice(0, 1000) || undefined;
  const earned =
    choice === 'none'
      ? { membership: null, why: 'The admin gave none' }
      : await grantContribution({ clientId: before.clientId, tier: choice, ref: before.itemId, note: `Accepted ${before.itemId} into the store`, by: input.by, origin: input.origin, notify: false }).catch(error => {
          console.error(`[submissions] Could not give the membership for ${input.submissionId}:`, error);
          return { membership: null, why: 'The membership could not be saved: give it on Manage Memberships' };
        });

  const live = delivery.kind === 'store' && delivery.released;
  const submission = await submissionsDB.decide(input.submissionId, {
    status: live ? 'live' : 'approved',
    delivery,
    decision: {
      by: input.by,
      at: new Date().toISOString(),
      tier: input.tier,
      ...(note && { note }),
      ...(earned.membership
        ? { membership: { tier: earned.membership.tier, membershipId: earned.membership.membershipId, ...(earned.membership.expiresAt && { expiresAt: earned.membership.expiresAt }) } }
        : { noMembership: earned.why }),
    },
  });
  if (!submission) return { ok: false, why: 'It was delivered, but its record could not be saved. Reload the page' };
  if (live) await submissionsDB.dropFiles(input.submissionId);
  // the sender of its first accepted submission is its first author (./authors)
  await settleAuthors(submission.itemId).catch(error => console.error(`[submissions] Could not write down the authors of ${submission.itemId}:`, error));

  const where =
    delivery.kind === 'pr'
      ? 'It goes live when its pull request merges, and enters as Beta.'
      : delivery.released
        ? 'It is live in Explore now, in Beta.'
        : 'An admin is releasing its package. It enters as Beta.';
  const mailed = await tell(
    submission,
    to =>
      submissionDecidedMail(to, {
        item: submission.title,
        outcome: 'accepted',
        tier: tierLabel(input.tier),
        where,
        ...(earned.membership && { membership: `${tierLabel(earned.membership.tier)}, ${lastsInWords(earned.membership)}` }),
        note,
        url: `${input.origin}/app/subscription`,
      }),
    input.notify,
  );
  const listing = aboutListing(fill);
  const notes = [...(delivery.kind === 'store' && delivery.why ? [delivery.why] : []), ...listing.notes, ...(earned.membership ? [] : earned.why ? [`No membership given: ${earned.why}`] : [])];
  return { ok: true, submission, mailed, notes, ...(listing.line && { listing: listing.line }) };
}

/**
 * For an accepted item whose package was not released with the approval:
 * tries again when the folder can be packaged as it is, or records that an
 * admin released it by hand (`done`: after `npm run catalog -- release`).
 */
export async function finishRelease(input: { submissionId: string; by: string; done?: boolean }): Promise<Outcome> {
  const before = await submissionsDB.get(input.submissionId);
  if (!before?.decision || before.delivery?.kind !== 'store') return { ok: false, status: 404, why: 'No such accepted submission' };
  if (before.delivery.released) return { ok: true, submission: before };
  let fill: ListingFill | null | undefined;
  if (input.done) {
    const item = await catalogItemsDB.get(before.itemId);
    if (!item?.versions.length) return { ok: false, why: `${before.itemId} has no released version in the catalog yet` };
  } else {
    const files = await submissionsDB.filesOf(input.submissionId);
    const problem = files.length === 0 ? 'Its files are no longer kept here: release it from the store repository' : packageProblem(before.kind, files);
    if (problem) return { ok: false, why: problem };
    const tree = storeFiles(before, before.decision.tier, files);
    try {
      fill = await releasePackage(before, before.decision.tier, tree.folder, tree.files, input.by);
    } catch (error) {
      return { ok: false, why: `The package could not be released: ${(error as Error).message}` };
    }
  }
  const { why: _why, ...delivery } = before.delivery;
  const submission = await submissionsDB.update(input.submissionId, { status: 'live', delivery: { ...delivery, released: true } });
  await submissionsDB.dropFiles(input.submissionId);
  const listing = aboutListing(fill);
  return submission ? { ok: true, submission, notes: listing.notes, ...(listing.line && { listing: listing.line }) } : { ok: false, why: 'No such submission' };
}

/** A pull request merged: the submissions it delivers are live. One that delivers none changes nothing. */
export async function submissionsMerged(repo: string, prNumber: number): Promise<number> {
  const delivered = await submissionsDB.byPr(repo, prNumber);
  let live = 0;
  for (const submission of delivered) {
    if (submission.delivery?.kind !== 'pr' || submission.status !== 'approved') continue;
    await submissionsDB.update(submission.submissionId, { status: 'live', delivery: { ...submission.delivery, state: 'merged' } });
    await submissionsDB.dropFiles(submission.submissionId);
    live += 1;
  }
  return live;
}

/**
 * Published at once, with no review: an admin's item at the membership they named, or an update (an
 * item already in the store, by an admin or by a Cohort member who is one of its authors) at the
 * membership it has. It is saved like any submission (so its files, checks and history are where
 * every other one's are), then approved by the sender, with no membership earned and no mail. A
 * refusal (a leak check, a version already released) leaves it waiting on /app/submissions and says
 * why.
 */
export async function publishDirectly(clientId: string, tier: MemberTier, input: SubmissionInput, at: SubmissionTier, origin: string, note: string): Promise<Outcome> {
  const sent = await sendSubmission(clientId, tier, { ...input, publish: undefined });
  if (!sent.ok) return sent;
  const published = await approveSubmission({ submissionId: sent.submission.submissionId, tier: at, membership: 'none', note, by: clientId, origin, notify: false });
  if (!published.ok) return { ok: false, status: published.status, why: `Saved as ${sent.submission.submissionId}, not published: ${published.why}` };
  return published;
}

/** An admin's own item, at the membership they named. */
export const publishOwnSubmission = (clientId: string, input: SubmissionInput & { publish: SubmissionTier }, origin: string) =>
  publishDirectly(clientId, 'admin', input, input.publish, origin, 'Published directly by an admin');

/**
 * The membership an update is published at directly, or null when it goes to review: the item is
 * already in the store at a member's membership (a Public skill in the repo is Public), and the
 * sender is an admin, or a Cohort member who is one of its authors (./authors).
 */
export async function directUpdateTier(clientId: string, tier: MemberTier, input: Pick<SubmissionInput, 'kind' | 'slug'>): Promise<SubmissionTier | null> {
  if (!updatesDirectly(tier)) return null;
  const itemId = `${input.kind}/${input.slug}`;
  const existing = await catalogItemsDB.get(itemId).catch(() => null);
  const at = existing ? itemTier(existing) : isRepoSkill(itemId) ? 'public' : null;
  if (!at || !isSubmissionTier(at)) return null;
  if (tier !== 'admin' && !(await isAuthor(itemId, clientId))) return null;
  return at;
}
