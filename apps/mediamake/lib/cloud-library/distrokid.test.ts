import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DISTROKID_DETAIL_KEYS, DISTROKID_KEYS, albumUuidOf, fromDistrokidPack, isDistrokidPack, openable, packRelease, releaseLinkOf, withPack } from './distrokid';
import { LIBRARY_SCHEMA, applySave, matches, parseSearch, type CollectionRecord, type EntryRecord } from './index';
import { SONGS } from './templates';

const UUID = '6F1D2C3B-AAAA-4BBB-8CCC-1234567890AB';
const LINK = `https://distrokid.com/dashboard/album/?albumuuid=${UUID}`;
const T0 = new Date('2026-11-20T10:00:00.000Z');

/** A release folder's info.json after Browse Hack's distrokid_record_packs, as it writes it. */
const pack = (distrokid: Record<string, unknown> | undefined) => JSON.stringify({ artist: 'Example Artist', songTitle: 'Example Title', releaseDate: '2026-11-20', recordLabel: 'Example Label', ...(distrokid && { distrokid }) }, null, 2);
const RECORDED = { link: LINK, albumUuid: UUID, upc: '198765432109', uploadDate: '2026-11-18', releaseDate: '2026-11-20', recordLabel: 'Example Label', status: 'In review', tracks: [{ number: 1, title: 'Example Title', isrc: 'QZ-ABC-26-00001' }], isrc: 'QZABC2600001', recordedAt: '2026-11-18T12:00:00.000Z' };

const songs: CollectionRecord = { schema: LIBRARY_SCHEMA, space: 'a'.repeat(24), slug: 'songs', name: 'Songs', template: SONGS, prefs: '', learned: {}, createdAt: T0.toISOString(), createdBy: 'ana', updatedAt: T0.toISOString() };
const save = (current: EntryRecord | null, fields: unknown) => {
  const result = applySave(songs, current, { fields }, 'ana', T0);
  assert.ok(!('error' in result), 'error' in result ? result.error : '');
  return result as Exclude<typeof result, { error: string }>;
};

test('the Songs template documents the DistroKid link as a key of its distrokid group', () => {
  const field = SONGS.fields.find(f => f.key === 'distrokid')!;
  assert.equal(field.kind, 'group');
  assert.deepEqual(field.keys?.map(k => k.key), ['link', 'albumUuid', 'upc', 'uploadDate', 'releaseDate', 'recordLabel', 'language', 'songwriters', 'aiTagged']);
  assert.deepEqual(field.keys, [...DISTROKID_KEYS, ...DISTROKID_DETAIL_KEYS]);
  assert.equal(field.keys?.find(k => k.key === 'link')?.kind, 'link');
  // only the release's own keys come from a pack's distrokid block
  assert.deepEqual(Object.keys(packRelease(pack({ ...RECORDED, language: 'Telugu' })).group).includes('language'), false);
  assert.match(SONGS.guide, /`distrokid\.link` is the song's release page on DistroKid/);
  assert.match(SONGS.guide, /where=distrokid=<album UUID>/);
});

test('the album UUID is read from a release link, and only a web link opens', () => {
  assert.equal(albumUuidOf(LINK), UUID);
  assert.equal(albumUuidOf(`https://distrokid.com/dashboard/album/?foo=1&albumuuid=${UUID}#top`), UUID);
  assert.equal(albumUuidOf('https://example.com/?albumuuid=1234567890'), '');
  assert.equal(albumUuidOf(undefined), '');
  assert.ok(openable(LINK));
  assert.ok(!openable('javascript:alert(1)'));
  assert.equal(releaseLinkOf({ distrokid: { link: LINK } }), LINK);
  assert.equal(releaseLinkOf({ distrokid: { link: 'javascript:alert(1)' } }), '');
  assert.equal(releaseLinkOf({}), '');
});

test('a DistroKid pack is known by what it holds, whatever it is called', () => {
  assert.ok(isDistrokidPack(pack(RECORDED)));
  assert.ok(isDistrokidPack(JSON.stringify({ songTitle: 'X', primaryGenre: 'Pop' })));
  assert.ok(!isDistrokidPack(JSON.stringify({ words: [{ text: 'la', start: 0, end: 1 }] })));
  assert.ok(!isDistrokidPack(JSON.stringify({ songTitle: 'X' })));
  assert.ok(!isDistrokidPack('not json'));
});

test('a pack before it was recorded brings nothing', () => {
  assert.deepEqual(packRelease(pack(undefined)), { group: {} });
  assert.deepEqual(fromDistrokidPack(pack(undefined)), {});
  assert.deepEqual(fromDistrokidPack('not json'), {});
  assert.deepEqual(fromDistrokidPack('[1,2]'), {});
});

test('a recorded pack: the group keys, and a single’s ISRC', () => {
  const { group, isrc } = packRelease(`﻿${pack(RECORDED)}`);
  assert.deepEqual(group, { link: LINK, albumUuid: UUID, upc: '198765432109', uploadDate: '2026-11-18', releaseDate: '2026-11-20', recordLabel: 'Example Label' });
  assert.equal(isrc, 'QZABC2600001');
  // status, tracks and recordedAt stay in the pack
  assert.ok(!('status' in group) && !('tracks' in group));
  // the UUID is read out of the link when the block has only the link
  assert.equal(packRelease(pack({ link: LINK })).group.albumUuid, UUID);
  // a single's ISRC from its one track; an album's never
  assert.equal(packRelease(pack({ link: LINK, tracks: [{ isrc: 'QZABC2600002' }] })).isrc, 'QZABC2600002');
  assert.equal(packRelease(pack({ link: LINK, isrc: 'QZABC2600003', tracks: [{ isrc: 'A' }, { isrc: 'B' }] })).isrc, undefined);
});

test('putting a pack in a song: the group merged, the ISRC and the date only where empty', () => {
  const fresh = fromDistrokidPack(pack(RECORDED), {});
  assert.deepEqual(Object.keys(fresh).sort(), ['distrokid', 'isrc', 'releaseDate']);
  assert.equal(fresh.isrc, 'QZABC2600001');
  assert.equal(fresh.releaseDate, '2026-11-20');

  // what the group held stays, the pack's keys win, and the song's own ISRC and date are kept
  const have = { isrc: 'QZXYZ2600009', releaseDate: '2026-12-01', distrokid: { language: 'English', link: 'https://distrokid.com/dashboard/album/?albumuuid=OLD00000' } };
  const later = fromDistrokidPack(pack(RECORDED), have);
  assert.deepEqual(Object.keys(later), ['distrokid']);
  assert.deepEqual(later.distrokid, { language: 'English', ...packRelease(pack(RECORDED)).group });

  // the same pack again changes nothing
  assert.deepEqual(fromDistrokidPack(pack(RECORDED), { ...have, ...later }), {});
  // a release date DistroKid wrote as words goes in the group only
  assert.equal(fromDistrokidPack(pack({ link: LINK, releaseDate: 'Nov 20, 2026' }), {}).releaseDate, undefined);
});

test('what a save sends wins over the pack, and its group is laid over the pack’s', () => {
  const fromPack = fromDistrokidPack(pack(RECORDED), {});
  const asked = { title: 'X' };
  assert.equal(withPack(asked, {}), asked);
  const out = withPack({ isrc: 'QZXYZ2600009', distrokid: { language: 'English', upc: '111' } }, fromPack) as Record<string, unknown>;
  assert.equal(out.isrc, 'QZXYZ2600009');
  assert.equal(out.releaseDate, '2026-11-20');
  assert.deepEqual(out.distrokid, { ...(fromPack.distrokid as object), language: 'English', upc: '111' });
});

test('a song with the pack’s details is the record Sync links finds', () => {
  const song = save(null, withPack({ title: 'Example Title' }, fromDistrokidPack(pack(RECORDED), {}))).entry;
  assert.equal(song.fields.isrc, 'QZABC2600001');
  assert.match(song.card, /DistroKid details: link https:\/\/distrokid\.com/);
  const other = save(null, { title: 'Other', distrokid: { link: 'https://distrokid.com/dashboard/album/?albumuuid=99999999-0000' } }).entry;
  const found = (query: string) => [song, other].filter(entry => matches(entry, parseSearch(new URLSearchParams(query)))).map(entry => entry.slug);
  // the extension's two searches, and the UUID in any case
  assert.deepEqual(found(`collection=songs&where=distrokid%3D${UUID}`), ['example-title']);
  assert.deepEqual(found(`where=distrokid%3D${UUID.toLowerCase()}`), ['example-title']);
  assert.deepEqual(found(`where=link%3D${UUID}`), []);
  // one key of the group
  assert.deepEqual(found(`where=distrokid.link%3D${encodeURIComponent(LINK)}`), ['example-title']);
  assert.deepEqual(found(`where=distrokid.albumuuid%3D${UUID}`), ['example-title']);
  assert.deepEqual(found('where=distrokid.upc%3D198765432109'), ['example-title']);
  // a link kept outside the template (saved before it knew one) is found too
  const loose = save(null, { title: 'Loose', link: LINK }).entry;
  assert.deepEqual(loose.extra, { link: LINK });
  assert.ok(matches(loose, parseSearch(new URLSearchParams(`where=link%3D${UUID}`))));
});

test('a DistroKid link that is not a link is kept with a warning', () => {
  const result = save(null, { title: 'X', distrokid: { link: 'distrokid album 123' } });
  assert.equal((result.entry.fields.distrokid as Record<string, string>).link, 'distrokid album 123');
  assert.match(result.warnings.join('\n'), /DistroKid details: DistroKid link "distrokid album 123" does not look like a link/);
});
