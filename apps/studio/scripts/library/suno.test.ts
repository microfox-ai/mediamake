/**
 * Suno takes in the library: Browse Hack's suno_download sidecars filed under the channel their
 * folder (or sidecar) names, lyrics kept beside the song and searchable with its styles, and what
 * each take was made from (covers, stems, a track uploaded to Suno) linked, also when it arrives
 * before its parent, and kept through a rebuild and a move.
 *
 *   mm test:library
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { saveConfig } from './config.ts';
import { getItem } from './db.ts';
import { moveItem } from './edit.ts';
import { exportLibrary } from './export.ts';
import { find } from './find.ts';
import { ingest } from './ingest.ts';
import { openLibrary, sourcesOf, type Lib } from './lib.ts';
import { relationsOf } from './relations.ts';
import { rebuild } from './scan.ts';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'media-suno-test-'));
const downloads = path.join(tmp, 'Downloads');
const fixtures = path.join(tmp, 'fixtures');
let lib: Lib;

const tone = (name: string, hz: number) => {
  if (fs.existsSync(path.join(fixtures, name))) return path.join(fixtures, name);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `sine=frequency=${hz}:duration=13`, path.join(fixtures, name)], { stdio: 'pipe' });
  return path.join(fixtures, name);
};
/** A Suno take in the inbox as Browse Hack leaves it: the audio and its sidecar, a while ago. */
const take = (rel: string, fixture: string, source: Record<string, unknown>) => {
  const file = path.join(lib.cfg.inbox, 'suno', rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.copyFileSync(fixture, file);
  fs.writeFileSync(`${file}.source.json`, JSON.stringify({ schema: 'mediamake.source/v1', tool: 'suno', downloadedAt: '2026-11-02T10:00:00.000Z', ...source }));
  const t = new Date(Date.now() - 3600_000);
  fs.utimesSync(file, t, t);
  return file;
};

const CLIP = '1f0e2d3c-4b5a-4968-8776-655443322110';
const COVER = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const LYRICS = 'Throughout heaven and earth\nI alone am the honored one\nInfinity in my hands';

before(() => {
  fs.mkdirSync(fixtures, { recursive: true });
  tone('take.mp3', 300);
  tone('cover.mp3', 400);
  tone('other.mp3', 500);
  tone('upload.mp3', 600);
  tone('from-upload.mp3', 700);
  process.env.MEDIAMAKE_CONFIG = path.join(tmp, 'config.json');
  process.env.MEDIA_NO_WAIT = '1';
  const cfg = saveConfig({
    root: path.join(downloads, '_LIBRARY'),
    inbox: path.join(downloads, '_INBOX'),
    deliverRoot: downloads,
    channels: { animemusiczone: 'AMZ', inverteddevils: 'INVERTED-DEVILS' },
  });
  lib = openLibrary({ cfg, projects: path.join(tmp, 'projects'), out: path.join(tmp, 'out'), brands: path.join(tmp, 'brands'), overlays: path.join(tmp, 'overlays'), skills: path.join(tmp, 'skills'), quiet: true });
});

after(() => {
  lib?.db.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('suno takes', () => {
  let songId = '';

  test("a take in _INBOX/suno/<channel>/<set>/ is filed under that channel, its lyrics beside it", async () => {
    take('animemusiczone/honored-one/Honored One [1f0e2d3c].mp3', path.join(fixtures, 'take.mp3'), {
      ref: CLIP,
      url: 'https://cdn1.suno.ai/1f0e2d3c.mp3',
      pageUrl: `https://suno.com/song/${CLIP}`,
      title: 'Honored One',
      author: 'subhakar',
      prompt: 'gregorian chant, epic orchestral, choir',
      model: 'v4.5',
      price: 10,
      lyrics: LYRICS,
      excludeStyles: 'metal, dubstep',
      instrumental: false,
      settings: { weirdness: 40, styleInfluence: 70 },
      workspace: { id: 'ws1', name: 'AMZ' },
      channel: 'animemusiczone',
    });
    const [r] = await ingest(lib, [lib.cfg.inbox]);
    assert.equal(r.action, 'filed');
    assert.equal(r.dest, path.join('music', 'animemusiczone', 'honored-one', 'Honored One [1f0e2d3c].mp3'));
    songId = r.id!;
    const dest = path.join(lib.root, r.dest!);
    assert.equal(fs.readFileSync(`${dest}.lyrics.txt`, 'utf8').trim(), LYRICS);
    const entry = JSON.parse(fs.readFileSync(path.join(path.dirname(dest), '.media.json'), 'utf8')).items[path.basename(dest)];
    assert.equal(entry.lyrics, LYRICS);
    assert.equal(entry.sources[0].excludeStyles, 'metal, dubstep');
    assert.equal(entry.sources[0].lyrics, undefined, 'lyrics are kept once, on the entry');
    assert.equal(getItem(lib.db, songId)?.lyrics, LYRICS);
    const [src] = sourcesOf(lib, songId);
    assert.equal(src.ref, CLIP);
    assert.deepEqual(src.settings, { weirdness: 40, styleInfluence: 70 });
    assert.ok(!fs.existsSync(path.join(lib.cfg.inbox, 'suno', 'animemusiczone')), 'the emptied set folders are tidied away');
  });

  test('find --kind=music --channel= matches lyrics and styles, not the styles it leaves out', () => {
    const music = (words: string, channel = 'animemusiczone') => find(lib, words, { kind: 'music', channel }).map(i => i.id);
    assert.deepEqual(music('honored one heaven'), [songId]);
    assert.deepEqual(music('gregorian choir'), [songId]);
    assert.deepEqual(music('infinity'), [songId]);
    assert.deepEqual(music('dubstep'), []);
    assert.deepEqual(music('heaven', 'inverteddevils'), []);
  });

  test("a channel's folder name works too, and lyrics can come as <file>.lyrics.txt", async () => {
    const file = take('AMZ/misc/Nakama [dddddddd].mp3', tone('nakama.mp3', 800), { ref: 'dddddddd-1111-4222-8333-444455556666', title: 'Nakama' });
    fs.writeFileSync(`${file}.lyrics.txt`, 'Sail with me nakama\n');
    const [r] = await ingest(lib, [lib.cfg.inbox]);
    assert.equal(r.dest, path.join('music', 'animemusiczone', 'nakama', 'Nakama [dddddddd].mp3'));
    assert.equal(getItem(lib.db, r.id!)?.lyrics, 'Sail with me nakama');
    assert.ok(!fs.existsSync(`${file}.lyrics.txt`), "the inbox's lyrics file went with the song");
    assert.deepEqual(find(lib, 'sail nakama', { kind: 'music', channel: 'animemusiczone' }).map(i => i.id), [r.id]);
  });

  test("a cover is linked to the take it covers; one that arrives before its parent is linked once the parent comes", async () => {
    take('animemusiczone/honored-one/Honored One (Cover) [9a8b7c6d].mp3', path.join(fixtures, 'cover.mp3'), { ref: COVER, title: 'Honored One (Cover)', parentRef: CLIP, relation: 'cover', lyrics: LYRICS });
    const [cover] = await ingest(lib, [lib.cfg.inbox]);
    assert.equal(cover.dest, path.join('music', 'animemusiczone', 'honored-one', 'Honored One (Cover) [9a8b7c6d].mp3'), 'the cover keeps its song folder');
    assert.deepEqual(relationsOf(lib, cover.id!).parents, [{ relation: 'cover', id: songId, parent: `suno:${CLIP}` }]);
    assert.deepEqual(relationsOf(lib, songId).children, [{ relation: 'cover', id: cover.id }]);

    // an extension of a take not downloaded yet: linked when it arrives
    const later = 'aaaaaaaa-1111-4222-8333-444455556666';
    take('animemusiczone/gojo/Gojo Theme (Extended) [bbbbbbbb].mp3', path.join(fixtures, 'other.mp3'), { ref: 'bbbbbbbb-1111-4222-8333-444455556666', title: 'Gojo Theme (Extended)', parentRef: later, relation: 'extend' });
    const [ext] = await ingest(lib, [lib.cfg.inbox]);
    assert.deepEqual(relationsOf(lib, ext.id!).parents, [{ relation: 'extend', id: null, parent: `suno:${later}` }]);
    take('animemusiczone/gojo/Gojo Theme [aaaaaaaa].mp3', path.join(fixtures, 'upload.mp3'), { ref: later, title: 'Gojo Theme' });
    const [parent] = await ingest(lib, [lib.cfg.inbox]);
    assert.equal(relationsOf(lib, ext.id!).parents[0].id, parent.id);
  });

  test("a song's stems point at the song, which keeps its own (suno, ref)", async () => {
    const zip = path.join(fixtures, 'Honored One Stems.zip');
    fs.writeFileSync(zip, 'PK stems');
    take('animemusiczone/honored-one/Honored One Stems.zip', zip, { ref: CLIP, title: 'Honored One Stems' });
    const [stems] = await ingest(lib, [lib.cfg.inbox]);
    assert.equal(stems.dest, path.join('music', 'animemusiczone', 'honored-one', 'stems', 'Honored One Stems.zip'));
    assert.deepEqual(relationsOf(lib, stems.id!).parents.map(p => [p.relation, p.id]), [['stems', songId]]);
    const owner = lib.db.prepare("SELECT item_id FROM sources WHERE tool = 'suno' AND ref = ?").get(CLIP) as { item_id: string };
    assert.equal(owner.item_id, songId, "Browse Hack's alreadyHave lookup still finds the song");
  });

  test('the channel comes from the sidecar when the folder names none; a take made from an uploaded track is its variation', async () => {
    // Browse Hack uploaded a library song (suno_upload_track) and this take came from it
    take('cadence-covers/Cadence (Suno) [cccccccc].mp3', path.join(fixtures, 'from-upload.mp3'), {
      ref: 'cccccccc-1111-4222-8333-444455556666',
      title: 'Cadence (Suno)',
      relation: 'upload',
      sourceItem: songId,
      channel: 'inverteddevils',
    });
    const [r] = await ingest(lib, [lib.cfg.inbox]);
    assert.equal(r.dest, path.join('music', 'inverteddevils', 'cadence', 'Cadence (Suno) [cccccccc].mp3'));
    assert.deepEqual(relationsOf(lib, r.id!).parents.map(p => [p.relation, p.id]), [['variation', songId]]);
  });

  test('a rebuilt catalog keeps the lyrics and the links; a move takes the lyrics along', async () => {
    const before = relationsOf(lib, songId).children.map(c => c.relation).sort();
    await rebuild(lib);
    assert.equal(getItem(lib.db, songId)?.lyrics, LYRICS);
    assert.deepEqual(relationsOf(lib, songId).children.map(c => c.relation).sort(), before);
    assert.ok(find(lib, 'infinity', { kind: 'music' }).some(i => i.id === songId));
    const it = getItem(lib.db, songId)!;
    const moved = await moveItem(lib, it, { kind: 'music', subject: 'animemusiczone/honoured-one' });
    assert.ok(fs.existsSync(path.join(lib.root, `${moved.path}.lyrics.txt`)));
    assert.ok(!fs.existsSync(path.join(lib.root, `${it.path}.lyrics.txt`)));
  });

  test('the Library page gets the styles, the lyrics and a song it can play', () => {
    const r = exportLibrary(lib);
    const music = JSON.parse(fs.readFileSync(path.join(r.dir, 'media-music.json'), 'utf8')) as { id: string; lyrics?: string; preview?: string; source?: { prompt?: string; excludeStyles?: string }; related?: { relation: string }[] }[];
    const song = music.find(m => m.id === songId)!;
    assert.equal(song.lyrics, LYRICS);
    assert.equal(song.source?.prompt, 'gregorian chant, epic orchestral, choir');
    assert.equal(song.source?.excludeStyles, 'metal, dubstep');
    assert.ok(song.preview && fs.existsSync(path.join(lib.catalog, song.preview)), 'a playable copy in thumbs/');
    assert.ok(music.some(m => m.related?.some(x => x.relation === 'cover')));
  });
});
