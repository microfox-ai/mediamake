import { tierLabel } from '../memberships/tiers';
import type { TreeFile } from './github';
import { publicSkillLink, publicSkillPath, storePath, type Submission, type SubmissionFile, type SubmissionTier } from './submission';
import type { TarEntry } from './tar';

/**
 * What an approved submission becomes, as text and file lists (no network,
 * no database): the pull request for a Public skill, the commit and
 * catalog.json for the store repository, and the package's entries.
 */

export const RULE = "We publish nothing we don't use.";

type Listed = Pick<Submission, 'submissionId' | 'kind' | 'slug' | 'itemId' | 'title' | 'summary' | 'version' | 'made'>;

/** A skill's files in the public repository: its folder, and the link Claude loads it through. */
export function publicSkillFiles(slug: string, files: SubmissionFile[]): { folder: string; files: TreeFile[]; extra: TreeFile[] } {
  const folder = publicSkillPath(slug);
  const link = publicSkillLink(slug);
  return {
    folder,
    files: files.map(file => ({ path: `${folder}/${file.path}`, content: file.content, encoding: file.encoding })),
    extra: [{ path: link.path, content: link.target, encoding: 'utf8', mode: '120000' }],
  };
}

export const prTitle = (submission: Listed, update: boolean) => `${update ? 'Update' : 'Add'} ${submission.slug}: ${submission.title}`.slice(0, 120);

/**
 * The pull request's words, laid out as .github/pull_request_template.md.
 * `by` is the sender's GitHub login when their account has one linked; their
 * name and email never go into a public pull request.
 */
export function prBody(submission: Listed, input: { by?: string; update: boolean; site: string }): string {
  const made = submission.made.url ? `[${submission.made.title}](${submission.made.url})` : submission.made.title;
  return [
    `<!-- ${RULE} -->`,
    '',
    '## What changed',
    '',
    `${input.update ? 'A new version of' : 'A new skill,'} \`${submission.slug}\`${input.update ? '' : `: ${submission.summary}`}`,
    '',
    `Submitted through MediaMake${input.by ? ` by ${input.by} on GitHub` : ' by a member'} and accepted by an admin as a Public item. It enters as Beta.`,
    '',
    '## Made with this',
    '',
    `- ${made}`,
    '',
    '## Checked',
    '',
    "- [x] The sender named the production above as made with it",
    '- [x] The submission passed the leak checks (keys, tokens, paths on a computer) when it was sent',
    '- [ ] `node tools/skills.mjs check` passes on this branch',
    '',
    `Submission: ${input.site}/app/submissions?id=${submission.submissionId}`,
  ].join('\n');
}

export const commitMessage = (submission: Listed, tier: SubmissionTier, update: boolean) =>
  `${update ? 'Update' : 'Add'} ${submission.itemId} ${submission.version} (${tierLabel(tier)})\n\nAccepted from submission ${submission.submissionId}. Made with this: ${submission.made.title}${submission.made.url ? ` (${submission.made.url})` : ''}`;

/**
 * The item's folder for the store repository, with a catalog.json that says
 * what it is and who opens it: what `npm run catalog -- release` reads when a
 * later version is released from a checkout of the store.
 */
export function storeFiles(submission: Listed, tier: SubmissionTier, files: SubmissionFile[]): { folder: string; files: TreeFile[] } {
  const folder = storePath(submission.kind, submission.slug);
  let existing: Record<string, unknown> = {};
  const own = files.find(file => file.path === 'catalog.json' && file.encoding === 'utf8');
  if (own) {
    try {
      existing = JSON.parse(own.content) as Record<string, unknown>;
    } catch {
      existing = {};
    }
  }
  const catalog = {
    ...existing,
    kind: submission.kind,
    slug: submission.slug,
    title: submission.title,
    summary: submission.summary,
    version: submission.version,
    tier,
    status: 'beta',
    madeWith: submission.made,
  };
  return {
    folder,
    files: [
      ...files.filter(file => file.path !== 'catalog.json').map(file => ({ path: `${folder}/${file.path}`, content: file.content, encoding: file.encoding })),
      { path: `${folder}/catalog.json`, content: `${JSON.stringify(catalog, null, 2)}\n`, encoding: 'utf8' as const },
    ],
  };
}

/** The built bundle an MCP installs from, when the sender included one at the top of its folder. */
export const bundleOf = (files: Pick<SubmissionFile, 'path'>[]) => files.find(file => /^[^/]+\.mcpb$/.test(file.path))?.path;

/**
 * Whether the folder can be released as a package as it is. A skill and an
 * app are their folder. An MCP installs from a built .mcpb: without one in
 * the folder, an admin builds it from the store repository and releases it.
 */
export function packageProblem(kind: Submission['kind'], files: Pick<SubmissionFile, 'path'>[]): string | null {
  if (kind === 'mcp' && !bundleOf(files)) {
    return 'It has no built .mcpb at the top of its folder: build it from the store repository, then release it with npm run catalog -- release <folder>/<name>.mcpb';
  }
  return null;
}

/** The package's entries: the files as the store repository holds them, relative to the item's folder. */
export function packageEntries(folder: string, files: TreeFile[]): TarEntry[] {
  return files.map(file => ({
    path: `./${file.path.slice(folder.length + 1)}`,
    data: Buffer.from(file.content, file.encoding),
    ...(/\.(sh|command)$/.test(file.path) && { mode: 0o755 }),
  }));
}

export const releaseNotes = (submission: Listed) =>
  `Accepted from a member's submission. Made with this: ${submission.made.title}${submission.made.url ? ` (${submission.made.url})` : ''}.`;
