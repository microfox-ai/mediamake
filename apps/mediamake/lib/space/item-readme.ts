import { renderReadme, type ItemReadme, type ReadmeBase } from '@/lib/catalog/readme';
import { linkSpaceId } from './links';
import { pictureUrl } from './readme-files';
import type { ItemReadmeText, ReadmePicture } from './space';

/**
 * The README of an item in a space (a member's own, a project's or a linked
 * item's), as its space last reported it (./space ItemReadmeText): the same
 * store listing a repo skill's README.md is (docs/item-readme.md), shown in the
 * item's dialog, which only who can see the space opens. Its pictures show from
 * where ./readme-files keeps them; relative links to other files are dropped.
 */

type UrlOf = (spaceId: string, picture: Pick<ReadmePicture, 'sha256' | 'type'>) => string;

/** Each picture's address by its path in the item's folder. */
export function spaceItemReadmeBase(spaceId: string, readme: ItemReadmeText, urlOf: UrlOf = pictureUrl): ReadmeBase {
  return { files: '', links: '', pictures: Object.fromEntries((readme.pictures ?? []).map(picture => [picture.path, urlOf(spaceId, picture)])) };
}

export async function spaceItemReadme(spaceId: string, readme: ItemReadmeText, urlOf: UrlOf = pictureUrl): Promise<ItemReadme> {
  return renderReadme(readme.text, spaceItemReadmeBase(spaceId, readme, urlOf));
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
