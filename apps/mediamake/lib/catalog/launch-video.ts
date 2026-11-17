import { installPromptFor } from './install-prompt';
import { itemPagePath } from './paths';
import { youtubeUrl } from './video';
import { slugOf, type CatalogKind, type ItemTier, type ItemUse, type ReadyProof, type Readiness } from './types';

/**
 * The launch video of a skill, MCP or app: a Cook with Claude episode made
 * with the make-cwc-tutorial skill by an admin on their own computer (it
 * renders there and is reviewed in rounds, so nothing here makes a video).
 * The release page gives the prompt to copy, filled with what the catalog
 * knows about the item, and the finished video comes back as the item's intro
 * (`set_video`, mm-release's `catalog_set_video`). Pure, so the admin API, the
 * page and the tests share it.
 */

/** The skill that makes a launch video. */
export const LAUNCH_VIDEO_SKILL = 'make-cwc-tutorial';

/** The kinds that get a launch video: a tutorial or a course is a video already. */
export const LAUNCH_VIDEO_KINDS: CatalogKind[] = ['skill', 'mcp', 'app'];

export function hasLaunchVideo(kind: CatalogKind): boolean {
  return LAUNCH_VIDEO_KINDS.includes(kind);
}

/** What the catalog knows about an item, as its launch video prompt says it. */
export interface LaunchVideoFacts {
  id: string;
  kind: CatalogKind;
  title: string;
  /** The whole description when there is one, else the card's summary. */
  about?: string;
  version?: string;
  tier: ItemTier;
  readiness: Readiness;
  /** The finished productions made with it (its Ready mark's proof). */
  proof?: ReadyProof[];
  /** True when it installs: its prompt is shown being copied in the episode. */
  installable: boolean;
  /** Its code on GitHub, when known. */
  code?: string;
  /** What it works with, and what for. */
  uses?: (Pick<ItemUse, 'id' | 'need' | 'for'> & { title?: string })[];
  /** What needs it or offers it as a choice. */
  usedBy?: { id: string; title: string }[];
  /** Its open known issues, as an admin wrote them for everyone (never a member's feedback). */
  knownIssues?: string[];
  /** The intro it already has: the episode replaces it. */
  video?: { title: string; youtubeId?: string } | null;
  /** The site the links point at (see siteUrl), with no slash at its end. */
  site: string;
  /** When the facts were read, e.g. "16 Nov 2026". */
  asOf?: string;
}

const KIND_WORD: Record<CatalogKind, string> = { skill: 'skill', mcp: 'MCP', app: 'app', tutorial: 'tutorial', course: 'course' };
const TIER_WORD: Record<ItemTier, string> = {
  public: 'Public (everyone)',
  plus: 'Plus and above',
  pro: 'Pro and above',
  cohort: 'the cohort and admins only, hidden from everyone else',
  admin: 'the vault: admins only, never published',
};

/**
 * What the item is, from its description: one line, without a skill's
 * trigger phrases ("Use when the user says …"), which say when Claude loads
 * it, not what it does.
 */
function whatItIs(about?: string): string {
  return (about ?? '').replace(/\s+/g, ' ').split(/ (?:Use (?:only )?when|REQUIRES|New user feedback goes)\b/)[0].trim();
}

/** What a launch video still lacks, most important first; empty when the prompt has all it needs. */
export function launchVideoGaps(facts: Pick<LaunchVideoFacts, 'readiness' | 'proof' | 'tier' | 'installable' | 'kind' | 'knownIssues'>): string[] {
  const gaps: string[] = [];
  if (!facts.proof?.length) gaps.push('No finished production is on record, so Claude will ask what was made with it before it writes the script.');
  if (facts.readiness !== 'ready') gaps.push('It is still Beta. A launch video is for an item marked Ready.');
  if (facts.tier === 'cohort' || facts.tier === 'admin') gaps.push(`It is not public (${facts.tier === 'admin' ? 'the vault' : 'the cohort'}), so Claude will check with you before anything about it is uploaded.`);
  if (facts.knownIssues?.length) gaps.push(`It has ${facts.knownIssues.length} open known issue${facts.knownIssues.length === 1 ? '' : 's'}. Fix what the video would show before making it.`);
  if (!facts.installable) gaps.push('It has nothing to install, so the episode has no install prompt to show.');
  return gaps;
}

/**
 * The prompt an admin pastes into Claude on a computer that has
 * make-cwc-tutorial: the item's facts for the skill's intake, what to check
 * and ask, and how the finished video is attached as the item's intro.
 */
export function launchVideoPromptFor(facts: LaunchVideoFacts): string {
  const { id, site } = facts;
  const kind = KIND_WORD[facts.kind];
  const version = facts.version ? `, v${facts.version}` : '';
  const page = `${site}/app/releases/${id}`;
  const lines: string[] = [
    `Make the Cook with Claude launch video for ${facts.title} (${id}${version}) with the ${LAUNCH_VIDEO_SKILL} skill.`,
    `If this computer lacks that skill, an MCP it needs or mm-release, set them up yourself: mm update, then mm items install --yes (mm login first when mm items says it is signed out). Don't ask me for a site address or an install prompt.`,
    '',
    `These facts are from MediaMake's catalog${facts.asOf ? ` on ${facts.asOf}` : ''}. Check each one before it goes in the script, and ask me for anything missing instead of filling it in.`,
    '',
    'The item',
    `- Catalog id: ${id} (${facts.kind === 'skill' ? 'a' : 'an'} ${kind}${version})`,
  ];
  const about = whatItIs(facts.about);
  if (about) lines.push(`- What it is: ${about}`);
  lines.push(`- Who can open it: ${TIER_WORD[facts.tier]}`);
  lines.push(`- Readiness: ${facts.readiness === 'ready' ? 'Ready' : 'Beta (not marked Ready yet: tell me before going on)'}`);
  if (facts.kind === 'skill') lines.push(`- Its first prompt: /${slugOf(id)} (read its SKILL.md for what it asks back)`);
  if (facts.installable) {
    lines.push(`- Install prompt to show (for a computer without MediaMake): ${installPromptFor(id)}`);
    lines.push(`- On a signed-in computer it installs with: mm items install ${id} --yes (show this way in for members${facts.tier === 'public' ? '' : ', since it is not open to everyone'})`);
  }
  else lines.push('- Nothing to install: it opens as a page, so the copy and paste beat needs another way in. Ask me.');
  lines.push(`- Its page for viewers: ${site}${itemPagePath(id)}`);
  if (facts.code) lines.push(`- Code: ${facts.code}`);
  if (facts.tier === 'cohort' || facts.tier === 'admin') lines.push('- It is not public. Ask me before uploading or publishing anything about it.');

  if (facts.knownIssues?.length) {
    lines.push('', 'Known issues open now (public on its page: claim nothing these contradict)');
    for (const issue of facts.knownIssues) lines.push(`- ${issue}`);
  }
  lines.push('', "Members' feedback on /app/feedback is private: never quote it or show it. The notes in the rounds are mine.");

  lines.push('', 'Made with it (for the cold open and the shelf)');
  if (facts.proof?.length) {
    for (const proof of facts.proof) lines.push(`- ${proof.title}${proof.url ? `: ${proof.url}` : ''}`);
    lines.push('- Ask me which of these are public, and whether more was made with it since.');
  } else {
    lines.push('- Nothing is on record. Ask me which finished productions were made with it. Never use a test render or a demo, and if there is none, stop: we publish nothing we don\'t use.');
  }

  if (facts.uses?.length) {
    lines.push('', 'Works with');
    for (const use of facts.uses) lines.push(`- ${use.title ? `${use.title} (${use.id})` : use.id}, ${use.need}: ${use.for}`);
  }
  if (facts.usedBy?.length) {
    lines.push('', facts.kind === 'skill' ? 'Used by' : `Used by (an episode about an ${kind} shows it at work inside these)`);
    for (const user of facts.usedBy) lines.push(`- ${user.title} (${user.id})`);
  }

  lines.push('', 'When I have signed it off and it is on YouTube');
  if (facts.video?.youtubeId) lines.push(`- It has an intro now (${facts.video.title}, ${youtubeUrl(facts.video.youtubeId)}). The new video replaces it only after I say so.`);
  lines.push(
    `- Attach it as the item's intro with mm-release's catalog_set_video: item ${id}, url the YouTube link, title and description as uploaded. Without mm-release, give me the link to paste under "Intro video" on ${page}.`,
    "- Then give me that page's link.",
  );
  return lines.join('\n');
}
