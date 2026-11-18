import type { RegistrySkill } from '@/lib/library/types';
import { submissionsDB } from '@/lib/submissions/store';
import { SKILLS_REPO } from './items';
import { defaultReadme, renderReadme, type ItemReadme, type ReadmeBase, type ReadmeFacts } from './readme';

/**
 * An item's README for its page and its dialog (./readme): a repo skill's
 * README.md read from GitHub's main branch, so the page shows what installs;
 * a store package's README.md, from the files of the version it was released
 * from (a member's submission, lib/submissions); else the README on its listing
 * (an MCP's, an app's); else the default one, written from what MediaMake
 * knows about it. An item in a member's space has its own (lib/space/item-readme).
 */

const RAW = `https://raw.githubusercontent.com/${SKILLS_REPO}/main`;

/** Where a repo skill's README.md points its relative links and pictures. */
export function skillReadmeBase(skill: Pick<RegistrySkill, 'path'>): ReadmeBase {
  return { links: `https://github.com/${SKILLS_REPO}/blob/main/${skill.path}/`, files: `${RAW}/${skill.path}/` };
}

async function skillReadmeText(skill: RegistrySkill): Promise<string | null> {
  if (!skill.readme) return null;
  try {
    const res = await fetch(`${RAW}/${skill.path}/README.md`, { next: { revalidate: 300 } });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/** A README.md at the top of a submission's files (any case). */
export const isReadmeFile = (path: string) => /^readme\.md$/i.test(path);

/** Where a store package's README points its pictures: the files of the version released, behind an access check. */
export function releasedReadmeBase(itemId: string): ReadmeBase {
  return { files: `/api/catalog/readme-file/${itemId}/`, links: '' };
}

/** A store package's README.md: the one in its newest live submission's files, or null. */
async function releasedReadmeText(itemId: string): Promise<string | null> {
  try {
    const released = await submissionsDB.releasedOf(itemId);
    if (!released) return null;
    const file = (await submissionsDB.filesOf(released.submissionId)).find(entry => isReadmeFile(entry.path) && entry.encoding === 'utf8');
    return file?.content ?? null;
  } catch {
    return null;
  }
}

export async function itemReadme(input: {
  facts: ReadmeFacts;
  /** The registry's skill, when it is one. */
  skill?: RegistrySkill | null;
  /** The catalog item, `skill/<name>`: a store package shows the README.md it was released with. */
  itemId?: string;
  /** The README an admin wrote on its listing. */
  listingReadme?: string | null;
}): Promise<ItemReadme> {
  // what an admin wrote on the listing wins, like the rest of the listing
  if (input.listingReadme?.trim()) return renderReadme(input.listingReadme);
  const text = input.skill ? await skillReadmeText(input.skill) : null;
  if (text?.trim()) return renderReadme(text, skillReadmeBase(input.skill!));
  const released = !input.skill && input.itemId ? await releasedReadmeText(input.itemId) : null;
  if (released?.trim()) return renderReadme(released, releasedReadmeBase(input.itemId!));
  return renderReadme(defaultReadme(input.facts), undefined, false);
}
