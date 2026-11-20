import { isGrantableTier, tierLabel, tierRank, type GrantableTier, type MemberTier } from '../memberships/tiers';

/**
 * Store submissions. A member asks Claude to make something they built public
 * (the `submit-to-store` skill, `mm submit`, or mm-use's `submit_item`); its
 * files come here privately, with the production that proves it works when the
 * sender is below Cohort (Cohort members and admins may leave it out). An
 * admin reads it on /app/submissions, picks the lowest membership that opens
 * it and approves; an admin's own submission is published at once at the
 * membership they name (`publish`). A Public skill becomes a pull request on
 * the public repository; everything else goes to the private store repository
 * and is released as a package. Every item enters as Beta.
 *
 * A submission is seen by admins and its sender only. This file is the rules,
 * with no database: ./store keeps the records, ./actions does the work.
 */

export const SUBMISSION_KINDS = ['skill', 'mcp', 'app'] as const;
export type SubmissionKind = (typeof SUBMISSION_KINDS)[number];

/** The memberships an admin can list a submission at. The vault is not one: a submission is for members. */
export const SUBMISSION_TIERS = ['public', 'plus', 'pro', 'cohort'] as const;
export type SubmissionTier = (typeof SUBMISSION_TIERS)[number];

export const isSubmissionTier = (value: unknown): value is SubmissionTier =>
  typeof value === 'string' && (SUBMISSION_TIERS as readonly string[]).includes(value);

export const SUBMISSION_SOURCES = ['mm-submit', 'mm-use'] as const;
export type SubmissionSource = (typeof SUBMISSION_SOURCES)[number];

/**
 * - pending:   waiting for an admin.
 * - changes:   an admin asked for changes; sending it again puts it back to pending.
 * - approved:  accepted. A Public skill waits for its pull request to merge; a package is live already.
 * - live:      its pull request merged.
 * - declined / withdrawn: closed, by an admin or by its sender.
 */
export const SUBMISSION_STATUSES = ['pending', 'changes', 'approved', 'live', 'declined', 'withdrawn'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/** A sender can send again, or withdraw, while an admin has not decided. */
export const isUndecided = (status: SubmissionStatus) => status === 'pending' || status === 'changes';

export interface SubmissionFile {
  /** Relative to the item's folder, with forward slashes. */
  path: string;
  content: string;
  encoding: 'utf8' | 'base64';
}

/** A file as the record lists it: never its content. */
export interface FileSummary {
  path: string;
  bytes: number;
  binary?: boolean;
}

/** The finished production made with the item: the proof the rule asks for, of members below Cohort. */
export interface Made {
  title: string;
  url?: string;
}

/** Whether a sender at this tier names a production: members below Cohort do; Cohort members and admins may leave it out. */
export const productionNeeded = (tier: MemberTier) => tierRank(tier) < tierRank('cohort');

export interface Checks {
  /** What must be fixed before it can be listed: a key, a token, a path on someone's computer. */
  problems: string[];
  /** What an admin should look at: an email address, a large file. */
  notes: string[];
}

/** Where an approved submission went. */
export type Delivery =
  | { kind: 'pr'; repo: string; branch: string; number: number; url: string; state: 'open' | 'merged'; at: string }
  | {
      kind: 'store';
      repo: string;
      path: string;
      commit: string;
      commitUrl: string;
      version: string;
      /** Whether its package is in the catalog. False: `why` says what is left. */
      released: boolean;
      why?: string;
      at: string;
    };

export interface Submission {
  submissionId: string;
  /** The sender's account. */
  clientId: string;
  /** Their membership when they sent it. */
  tier: MemberTier;
  kind: SubmissionKind;
  slug: string;
  /** `skill/<slug>`, the catalog id it will have. */
  itemId: string;
  title: string;
  summary: string;
  version: string;
  /** Left out by Cohort members and admins, who need not name one. */
  made?: Made;
  /** What the sender wants the reviewers to know. */
  note?: string;
  source: SubmissionSource;
  files: FileSummary[];
  bytes: number;
  checks: Checks;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  /** How many times it was sent: 1, then one more for each time it was sent again. */
  round: number;
  /** An admin's request for changes, or the reason it was declined. */
  review?: { by: string; at: string; note: string };
  decision?: {
    by: string;
    at: string;
    /** The lowest membership that opens the item. */
    tier: SubmissionTier;
    note?: string;
    /** The membership it earned its sender, when it earned one. */
    membership?: { tier: GrantableTier; membershipId: string; expiresAt?: string };
    /** Why it earned none. */
    noMembership?: string;
  };
  delivery?: Delivery;
  /** An admin is approving it right now (see ./store `claim`). */
  deciding?: { by: string; at: string };
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const VERSION = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

/** How much one submission may hold. Large media never travels with an item: the media library carries it. */
export const MAX_FILES = 400;
export const MAX_BYTES = 3 * 1024 * 1024;
export const MAX_FILE_BYTES = 1024 * 1024;
export const SUBMISSIONS_PER_DAY = 10;

/** Never part of an item: version control, installed dependencies, secrets, the system's litter. */
const LEFT_OUT = /(^|\/)(\.git|node_modules|\.DS_Store|\.env[^/]*|__pycache__|\.venv)(\/|$)/;

export const leftOut = (path: string) => LEFT_OUT.test(path);

/** A path inside the item's folder, or why it isn't one. */
export function pathProblem(path: string): string | null {
  if (!path || path.length > 300) return 'a file needs a path of at most 300 characters';
  if (path.startsWith('/') || /^[A-Za-z]:/.test(path) || path.includes('\\')) return `${path} must be relative, with forward slashes`;
  if (path.split('/').some(part => part === '' || part === '.' || part === '..')) return `${path} must stay inside the item's folder`;
  if (/[\u0000-\u001f]/.test(path)) return 'a path has a control character';
  if (leftOut(path)) return `${path} is never part of an item (version control, dependencies, secrets)`;
  return null;
}

const bytesOf = (file: SubmissionFile) => Buffer.byteLength(file.content, file.encoding);

const TEXT_FILE = /\.(md|mdx|mjs|cjs|js|jsx|ts|tsx|py|json|txt|sh|ya?ml|toml|css|html|svg|csv)$/i;

/** The same lines `node tools/skills.mjs check` stops on (tools/skills.mjs `lineProblems`): keep the two alike. */
export function lineProblems(line: string): string[] {
  const problems: string[] = [];
  if (/\/Users\/[^/\s…]+|\/home\/[^/\s…]+|C:\\Users\\/.test(line)) problems.push('has a path on someone\'s computer');
  if (/(sk-[a-zA-Z0-9_-]{20,}|AKIA[0-9A-Z]{16}|gh[pousr]_[a-zA-Z0-9]{30,}|xox[bap]-[a-zA-Z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY|eyJ[a-zA-Z0-9_-]{30,}\.)/.test(line)) {
    problems.push('looks like an API key or token');
  }
  return problems;
}

/**
 * The leak checks, run again on the server whatever the sender's computer
 * said: keys, tokens and machine paths stop a submission; an email address
 * or a large file is for the admin to look at.
 */
export function checkFiles(files: SubmissionFile[]): Checks {
  const problems: string[] = [];
  const notes: string[] = [];
  for (const file of files) {
    const bytes = bytesOf(file);
    if (bytes > 512 * 1024) notes.push(`${file.path} is ${(bytes / 1048576).toFixed(1)} MB: does it belong in the item?`);
    if (file.encoding !== 'utf8') {
      if (TEXT_FILE.test(file.path)) notes.push(`${file.path} was sent as binary, so it was not read for keys`);
      continue;
    }
    file.content.split('\n').forEach((line, index) => {
      const at = `${file.path}:${index + 1}`;
      for (const problem of lineProblems(line)) problems.push(`${at} ${problem}`);
      if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(line) && !/noreply@|example\.(com|org)/.test(line)) notes.push(`${at} has an email address`);
    });
  }
  return { problems: problems.slice(0, 100), notes: [...new Set(notes)].slice(0, 100) };
}

/** A SKILL.md's front matter: the top-level keys, and `metadata`'s. Enough to check a name and read a version. */
export function frontMatter(text: string): Record<string, string> {
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  if (!block) return {};
  const out: Record<string, string> = {};
  let parent = '';
  const lines = block.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(\s*)([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, indent, key, raw] = match;
    let value = raw.trim().replace(/^(['"])(.*)\1$/, '$2');
    // a block scalar (`description: >`): the indented lines under it, joined
    if (/^[>|][+-]?$/.test(value)) {
      const under: string[] = [];
      while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || !lines[i + 1].trim()) && lines[i + 1].search(/\S/) > indent.length) under.push(lines[++i].trim());
      value = under.join(' ').trim();
    }
    if (!indent) {
      parent = value ? '' : key;
      if (value) out[key] = value;
    } else if (parent && value) {
      out[`${parent}.${key}`] = value;
    }
  }
  return out;
}

export interface SubmissionInput {
  kind: SubmissionKind;
  slug: string;
  title: string;
  summary: string;
  version: string;
  made?: Made;
  note?: string;
  /** An admin's own submission: published at once at this membership, with no review. */
  publish?: SubmissionTier;
  source: SubmissionSource;
  files: SubmissionFile[];
}

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const titleCase = (slug: string) => slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

const httpsUrl = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && value.length <= 500 ? url.toString() : null;
  } catch {
    return null;
  }
};

/** What was not a real production: the rule counts finished work only. */
const NOT_A_PRODUCTION = /^(test|a test|testing|demo|a demo|none|n\/?a|tbd|todo|nothing|\?+|-+)$/i;

/**
 * Reads what was sent, or says what is wrong with it. The title, summary and
 * version come from the item's own files when the sender leaves them out: a
 * skill's SKILL.md, an MCP's or an app's item.json.
 */
export function parseSubmission(body: unknown): SubmissionInput | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const kind = b.kind;
  if (typeof kind !== 'string' || !(SUBMISSION_KINDS as readonly string[]).includes(kind)) return { error: 'kind must be skill, mcp or app' };
  const slug = text(b.slug ?? b.name, 80);
  if (!SLUG.test(slug) || slug.length > 64) return { error: 'name must be lowercase letters, digits and dashes, such as make-lyrics-video' };

  // the production is checked here when one is named; whether the sender must name one is their tier's (./actions)
  const made = (b.made ?? {}) as Record<string, unknown>;
  const madeTitle = text(made.title, 200);
  if (madeTitle && (madeTitle.length < 3 || NOT_A_PRODUCTION.test(madeTitle))) {
    return { error: "made.title names a finished production made with it: a test render or a demo is not one (Cohort members and admins may leave it out)" };
  }
  const madeUrl = madeTitle ? httpsUrl(made.url) : undefined;
  if (madeUrl === null) return { error: "made.url must be an https link to the production, or left out when it isn't online" };
  if (b.publish != null && !isSubmissionTier(b.publish)) return { error: `publish must be one of ${SUBMISSION_TIERS.join(', ')}: the membership an admin publishes it at` };

  if (!Array.isArray(b.files) || b.files.length === 0) return { error: 'files is required: the item\'s files, each { path, content }' };
  if (b.files.length > MAX_FILES) return { error: `That is ${b.files.length} files; an item holds at most ${MAX_FILES}` };
  const files: SubmissionFile[] = [];
  const seen = new Set<string>();
  let bytes = 0;
  for (const entry of b.files as Record<string, unknown>[]) {
    const path = typeof entry?.path === 'string' ? entry.path.trim() : '';
    const problem = pathProblem(path);
    if (problem) return { error: problem };
    if (seen.has(path.toLowerCase())) return { error: `${path} is listed twice` };
    seen.add(path.toLowerCase());
    if (typeof entry.content !== 'string') return { error: `${path} has no content` };
    const encoding = entry.encoding === 'base64' ? 'base64' : 'utf8';
    if (encoding === 'base64' && !/^[A-Za-z0-9+/]*={0,2}$/.test(entry.content)) return { error: `${path} is not base64` };
    const file: SubmissionFile = { path, content: entry.content, encoding };
    const size = bytesOf(file);
    if (size > MAX_FILE_BYTES) return { error: `${path} is ${(size / 1048576).toFixed(1)} MB; a file in an item is at most 1 MB. Media goes in the media library, named under "media" in item.json` };
    bytes += size;
    files.push(file);
  }
  if (bytes > MAX_BYTES) return { error: `The item is ${(bytes / 1048576).toFixed(1)} MB; a submission holds at most ${MAX_BYTES / 1048576} MB. Leave builds and media out` };

  const read = (path: string) => files.find(file => file.path === path && file.encoding === 'utf8')?.content;
  let front: Record<string, string> = {};
  let meta: Record<string, unknown> = {};
  if (kind === 'skill') {
    const skillMd = read('SKILL.md');
    if (!skillMd) return { error: 'A skill needs its SKILL.md at the top of its folder' };
    front = frontMatter(skillMd);
    if (front.name !== slug) return { error: `SKILL.md says name: ${front.name ?? '(none)'}, and it was sent as ${slug}. They must match` };
    if (!front.description) return { error: 'SKILL.md needs a description in its front matter: it is what Claude reads to choose the skill' };
  }
  const itemJson = read('item.json');
  if (itemJson) {
    try {
      meta = JSON.parse(itemJson) as Record<string, unknown>;
    } catch {
      return { error: 'item.json is not valid JSON' };
    }
  }

  const version = text(b.version, 40) || text(meta.version, 40) || front['metadata.version'] || front.version || '0.1.0';
  if (!VERSION.test(version)) return { error: `version must look like 1.0.0, not ${version}` };
  const title = text(b.title, 120) || text(meta.title, 120) || titleCase(slug);
  const summary = text(b.summary, 500) || text(meta.summary, 500) || (front.description ?? '').slice(0, 500);
  if (summary.length < 10 || /^<.*>$/.test(summary)) return { error: 'Say what it does in a line (summary, or "summary" in its item.json)' };

  return {
    kind: kind as SubmissionKind,
    slug,
    title,
    summary,
    version,
    ...(madeTitle && { made: { title: madeTitle, ...(madeUrl && { url: madeUrl }) } }),
    ...(text(b.note, 1000) && { note: text(b.note, 1000) }),
    ...(isSubmissionTier(b.publish) && { publish: b.publish }),
    source: b.source === 'mm-use' ? 'mm-use' : 'mm-submit',
    files,
  };
}

export const summarize = (files: SubmissionFile[]): FileSummary[] =>
  files
    .map(file => ({ path: file.path, bytes: bytesOf(file), ...(file.encoding === 'base64' && { binary: true }) }))
    .sort((a, b) => a.path.localeCompare(b.path));

export const totalBytes = (files: SubmissionFile[]) => files.reduce((sum, file) => sum + bytesOf(file), 0);

/**
 * The membership an accepted item earns its sender, unless the admin picks
 * another: the item's own tier, with two exceptions. A Public item earns
 * Plus, the first step of the ladder. A Cohort item earns Pro: the cohort is
 * given by an admin, never earned.
 */
export function earnedTier(tier: SubmissionTier): GrantableTier {
  if (tier === 'public') return 'plus';
  if (tier === 'cohort') return 'pro';
  return tier;
}

/** What the admin chose to give: a tier, or nothing. */
export type MembershipChoice = GrantableTier | 'none';

export const isMembershipChoice = (value: unknown): value is MembershipChoice => value === 'none' || isGrantableTier(value);

/**
 * Where an approved item goes. A Public skill lives in the public repository,
 * so it is a pull request there. Everything else (a gated skill, and every
 * MCP and app, which need more than a folder of text) goes to the private
 * store repository and is released as a package at its tier.
 */
export function routeOf(kind: SubmissionKind, tier: SubmissionTier): 'pr' | 'store' {
  return kind === 'skill' && tier === 'public' ? 'pr' : 'store';
}

const FOLDERS: Record<SubmissionKind, string> = { skill: 'skills', mcp: 'mcps', app: 'apps' };

/** The item's folder in the store repository, laid out like a space: skills/, mcps/, apps/. */
export const storePath = (kind: SubmissionKind, slug: string) => `${FOLDERS[kind]}/${slug}`;

/** A skill's folder in the public repository, and the link Claude loads it through. */
export const publicSkillPath = (slug: string) => `.agents/skills/${slug}`;
export const publicSkillLink = (slug: string) => ({ path: `.claude/skills/${slug}`, target: `../../.agents/skills/${slug}` });

/** The branch a submission's pull request is made from. */
export const submissionBranch = (submissionId: string) => `submission/${submissionId.replace(/[^A-Za-z0-9_-]/g, '')}`;

/** Where a submission stands, in the words its sender reads. */
export function standing(submission: Pick<Submission, 'status' | 'decision' | 'delivery' | 'review'>): string {
  const tier = submission.decision ? tierLabel(submission.decision.tier) : '';
  switch (submission.status) {
    case 'pending':
      return 'Waiting for an admin to review it';
    case 'changes':
      return `An admin asked for changes${submission.review?.note ? `: ${submission.review.note}` : ''}. Send it again when they are made`;
    case 'declined':
      return `Declined${submission.review?.note ? `: ${submission.review.note}` : ''}`;
    case 'withdrawn':
      return 'Withdrawn';
    case 'live':
      return `Live, as a ${tier} item in Beta`;
    case 'approved':
      if (submission.delivery?.kind === 'pr') return `Accepted as a ${tier} item. It goes live when its pull request merges`;
      if (submission.delivery?.kind === 'store' && !submission.delivery.released) return `Accepted as a ${tier} item. Its package is being released by an admin`;
      return `Accepted: live as a ${tier} item in Beta`;
  }
}

/** A submission as its sender sees it: no admin's account, no check notes meant for the reviewer. */
export function ownView(submission: Submission) {
  const { clientId: _clientId, tier: _tier, deciding: _deciding, review, decision, delivery, checks, files, ...rest } = submission;
  return {
    ...rest,
    files: files.length,
    problems: checks.problems,
    standing: standing(submission),
    ...(review && { review: { note: review.note, at: review.at } }),
    ...(decision && {
      decision: {
        tier: decision.tier,
        at: decision.at,
        ...(decision.note && { note: decision.note }),
        ...(decision.membership && { membership: { tier: decision.membership.tier, ...(decision.membership.expiresAt && { expiresAt: decision.membership.expiresAt }) } }),
      },
    }),
    // a gated item's place in the private store stays with the admins
    ...(delivery?.kind === 'pr' && { pullRequest: delivery.url }),
  };
}

/** Counts for the page's tabs. */
export function countByStatus(submissions: Pick<Submission, 'status'>[]): Record<SubmissionStatus, number> {
  const counts = Object.fromEntries(SUBMISSION_STATUSES.map(status => [status, 0])) as Record<SubmissionStatus, number>;
  for (const submission of submissions) counts[submission.status] += 1;
  return counts;
}
