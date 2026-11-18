import { renderReadme, type ItemReadme, type ReadmeBase } from '@/lib/catalog/readme';
import { linkSpaceId } from './links';
import type { ItemReadmeText } from './space';

/**
 * The README of an item in a space (a member's own, a project's or a linked
 * item's), as its space last reported it (./space ItemReadmeText): the same
 * store listing a repo skill's README.md is (docs/item-readme.md), shown in the
 * item's dialog to whoever can see the space. Its pictures come through
 * /api/space/readme-file, which checks the viewer again; its relative links to
 * other files are dropped, since the repo is private.
 */

/** Where a space item's README points its pictures: its folder, served by /api/space/readme-file. */
export function spaceItemReadmeBase(spaceId: string, item: { kind: string; name: string }): ReadmeBase {
  return { files: `/api/space/readme-file/${encodeURIComponent(spaceId)}/${item.kind}/${item.name}/`, links: '' };
}

export async function spaceItemReadme(spaceId: string, item: { kind: string; name: string }, readme: ItemReadmeText): Promise<ItemReadme> {
  return renderReadme(readme.text, spaceItemReadmeBase(spaceId, item));
}

/**
 * Where an item in a space is, from its dialog key: `space:<spaceId>:<kind>/<name>` (a member's own space
 * or a project's) or `linked:<id>` (a linked item, space `item:<id>`). Null for anything else.
 */
export function spaceOfKey(key: string, details: { kind: string; name: string }): { spaceId: string; kind: string; name: string } | null {
  if (key.startsWith('linked:')) return { spaceId: linkSpaceId(key.slice('linked:'.length)), kind: details.kind, name: details.name };
  if (!key.startsWith('space:')) return null;
  const rest = key.slice('space:'.length);
  const at = rest.lastIndexOf(':');
  const [kind, name] = rest.slice(at + 1).split('/');
  return at > 0 && kind && name ? { spaceId: rest.slice(0, at), kind, name } : null;
}
