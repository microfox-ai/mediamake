/**
 * share: which library files a channel's team may have. A channel's footage, images, art, overlays
 * and references share their details with its team always (media sync push); a file goes up only
 * once the user has said so here, `media share <id…> --yes` or Share with team on the Library page
 * (a request that `media apply-requests` records), and only under the channel's size limit, which
 * its cloud project keeps and enforces too.
 */
import { SHARED_KINDS } from '../../../mediamake/lib/channel-sync/index.ts';
import { channelNamed } from './config.ts';
import type { Item } from './db.ts';
import type { Lib } from './lib.ts';
import { listProductions } from './production.ts';
import { now } from './sys.ts';

export { SHARED_KINDS };

/** SQL that keeps a channel's items (`i` is items): a <channel>/… subject, the channel's tag, use in its productions. */
export const channelClause = (lib: Lib, channel: string) => {
  const slugs = listProductions(lib)
    .filter(p => p.channel === channel)
    .map(p => p.slug);
  const used = slugs.length ? ` OR EXISTS (SELECT 1 FROM uses u WHERE u.item_id = i.id AND u.production IN (${slugs.map(() => '?').join(', ')}))` : '';
  return {
    sql: `(i.subject = ? OR i.subject LIKE ? OR EXISTS (SELECT 1 FROM tags t WHERE t.item_id = i.id AND t.tag = ?)${used})`,
    args: [channel, `${channel}/%`, channel.toLowerCase(), ...slugs] as string[],
  };
};

/** The channels an item belongs to. */
export const channelsOf = (lib: Lib, it: Pick<Item, 'id'>) =>
  Object.keys(lib.cfg.channels).filter(ch => {
    const c = channelClause(lib, ch);
    return !!lib.db.prepare(`SELECT 1 FROM items i WHERE i.id = ? AND ${c.sql}`).get(it.id, ...c.args);
  });

/** The linked channel an item is shared with: the one named, else the only one it belongs to, else the only linked one. */
export const pickChannel = (lib: Lib, it: Pick<Item, 'id'>, name?: string) => {
  if (name) {
    const ch = channelNamed(lib.cfg, name);
    if (!ch) throw new Error(`Unknown channel "${name}". Known: ${Object.keys(lib.cfg.channels).join(', ')}`);
    if (!lib.cfg.links[ch]) throw new Error(`${ch} isn't linked to a cloud project yet: media channel link ${ch} <projectId>`);
    return ch;
  }
  const linked = channelsOf(lib, it).filter(ch => lib.cfg.links[ch]);
  if (linked.length === 1) return linked[0];
  const all = Object.keys(lib.cfg.links);
  if (!linked.length && all.length === 1) return all[0];
  if (!all.length) throw new Error('No channel is linked to a cloud project yet: media channel link <channel> <projectId>');
  throw new Error(`Say which channel: --channel=${(linked.length ? linked : all).join('|')}`);
};

/** The user's OK to share an item's file with a channel's team. */
export const approveShare = (lib: Lib, it: Item, channel: string | undefined, via: 'cli' | 'library-page') => {
  if (it.status === 'remote') throw new Error(`${it.id.slice(0, 10)} is a teammate's item: its file is theirs to share`);
  if (!(SHARED_KINDS as readonly string[]).includes(it.kind)) throw new Error(`${it.kind} files aren't shared with the team (${SHARED_KINDS.join(', ')} are)`);
  const ch = pickChannel(lib, it, channel);
  lib.db.prepare('INSERT INTO shares (item_id, channel, via, approved_at) VALUES (?, ?, ?, ?) ON CONFLICT(item_id, channel) DO NOTHING').run(it.id, ch, via, now());
  return ch;
};

/** Take the OK back (for one channel, or every one it was shared with); returns those channels. */
export const withdrawShare = (lib: Lib, it: Pick<Item, 'id'>, channel?: string) => {
  const ch = channel ? channelNamed(lib.cfg, channel) : undefined;
  const rows = lib.db.prepare('SELECT channel FROM shares WHERE item_id = ?').all(it.id) as { channel: string }[];
  const gone = rows.map(r => r.channel).filter(c => !ch || c === ch);
  for (const c of gone) lib.db.prepare('DELETE FROM shares WHERE item_id = ? AND channel = ?').run(it.id, c);
  return gone;
};

export type Share = { item_id: string; channel: string; via: string; approved_at: string; uploaded_at: string | null };
export const sharesOf = (lib: Lib, channel: string) => lib.db.prepare('SELECT * FROM shares WHERE channel = ? ORDER BY approved_at').all(channel) as Share[];
