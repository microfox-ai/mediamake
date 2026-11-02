/**
 * The media library end to end on a throwaway Downloads folder: classification, filing the inbox
 * (with and without provenance), repeat downloads, reuse with cached analyses, clone-dedupe,
 * versioned delivery, rebuilding the catalog from .media.json, backups and restores, the export.
 *
 *   npm run test:library -w lyrics_videos
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { DISK_FOLDER, backupRoot, copyToDisk, listBackup, restore, stage } from './backup.ts';
import { classify, destOf } from './classify.ts';
import { saveConfig } from './config.ts';
import { getItem } from './db.ts';
import { deliver } from './deliver.ts';
import { dedupe, planDedupe } from './dedupe.ts';
import { applyRequests } from './edit.ts';
import { exportLibrary } from './export.ts';
import { find } from './find.ts';
import { ingest } from './ingest.ts';
import { openLibrary, resolveItem, type Lib } from './lib.ts';
import { saveProduction } from './production.ts';
import { duplicates, rebuild, scan } from './scan.ts';
import { applySweep, planSweep, undoSweep } from './sweep.ts';
import { sha256File } from './sys.ts';
import { cachePut, use } from './use.ts';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'media-library-test-'));
const downloads = path.join(tmp, 'Downloads');
const fixtures = path.join(tmp, 'fixtures');
const projects = path.join(tmp, 'projects');
const out = path.join(tmp, 'out');
let lib: Lib;

const ff = (args: string[]) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'pipe' });
const old = (file: string) => {
  const t = new Date(Date.now() - 3600_000);
  fs.utimesSync(file, t, t);
  return file;
};
const put = (src: string, dest: string) => {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(fixtures, src), dest);
  return old(dest);
};

before(() => {
  fs.mkdirSync(fixtures, { recursive: true });
  ff(['-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=30', '-t', '1', '-pix_fmt', 'yuv420p', path.join(fixtures, 'v1.mp4')]);
  ff(['-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=30', '-t', '1', '-pix_fmt', 'yuv420p', path.join(fixtures, 'v2.mp4')]);
  ff(['-f', 'lavfi', '-i', 'color=c=red:s=320x180:r=30', '-t', '1', '-pix_fmt', 'yuv420p', path.join(fixtures, 'v3.mp4')]);
  ff(['-f', 'lavfi', '-i', 'color=c=green:s=320x180:r=30', '-t', '1', '-pix_fmt', 'yuv420p', path.join(fixtures, 'v4.mp4')]);
  ff(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=15', path.join(fixtures, 'song.wav')]);
  ff(['-f', 'lavfi', '-i', 'sine=frequency=880:duration=1', path.join(fixtures, 'hit.wav')]);
  ff(['-f', 'lavfi', '-i', 'color=c=blue:s=64x64', '-frames:v', '1', path.join(fixtures, 'pin.jpg')]);
  process.env.MEDIAMAKE_CONFIG = path.join(tmp, 'config.json');
  process.env.MEDIA_NO_WAIT = '1';
  const cfg = saveConfig({
    root: path.join(downloads, '_LIBRARY'),
    inbox: path.join(downloads, '_INBOX'),
    deliverRoot: downloads,
    channels: { animemusiczone: 'AMZ', inverteddevils: 'INVERTED-DEVILS' },
  });
  fs.mkdirSync(projects, { recursive: true });
  lib = openLibrary({ cfg, projects, out, brands: path.join(tmp, 'brands'), overlays: path.join(tmp, 'overlays'), quiet: true });
});

after(() => {
  lib?.db.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('classify', () => {
  const c = (file: string, extra: Partial<Parameters<typeof classify>[0]> = {}) => classify({ file, ...extra });

  test('a YouTube twixtor pack goes to its character, named by what it shows', () => {
    const r = c('Zoro Twixtor Clips 4K Quality One Piece (2160p60).mp4', { probe: { height: 2160, fps: 60, duration: 300, hasAudio: true } });
    assert.equal(r.kind, 'footage');
    assert.equal(r.subject, 'one-piece/zoro');
    assert.equal(r.tool, 'youtube');
    assert.equal(r.name, 'zoro-twixtor-clips-2160p60.mp4');
    assert.ok(r.tags.includes('twixtor') && r.tags.includes('4k') && r.tags.includes('60fps'));
  });

  test('aliases and repeats: "Satoru Gojo … (1)" is jjk/gojo', () => {
    const r = c('Free Satoru Gojo Twixtor 4k No CC (Jujutsu Kaisen) (2160p) (1).mp4', { probe: { height: 2160, fps: 24, duration: 200, hasAudio: false } });
    assert.equal(r.subject, 'jjk/gojo');
    assert.equal(r.name, 'gojo-twixtor-2160p.mp4');
  });

  test('a weak alias needs its franchise beside it', () => {
    assert.equal(c('ace.png').kind, '_unsorted');
    assert.equal(c('Portgas D Ace One Piece.png').subject, 'one-piece/ace');
  });

  test('songs keep their names and group by song under their channel', () => {
    const r = c('Honored One - final master (-9 LUFS).wav', { probe: { duration: 200, hasAudio: true }, hint: { channel: 'animemusiczone' } });
    assert.equal(r.kind, 'music');
    assert.equal(r.subject, 'animemusiczone/honored-one');
    assert.equal(r.name, 'Honored One - final master (-9 LUFS).wav');
    const unknown = c('DBZ - Goten - growling rock - final.wav', { probe: { duration: 180, hasAudio: true } });
    assert.equal(unknown.kind, '_unsorted');
    assert.equal(destOf(unknown), path.join('_unsorted', 'music', 'dbz-goten', 'DBZ - Goten - growling rock - final.wav'));
  });

  test('short sounds are sound effects, by category', () => {
    assert.deepEqual([c('whoosh-a.wav', { probe: { duration: 1.2, hasAudio: true } }).kind, c('whoosh-a.wav', { probe: { duration: 1.2, hasAudio: true } }).subject], ['sfx', 'whoosh']);
  });

  test('stock clips without sound are overlays; Midjourney images are art', () => {
    assert.equal(c('2715412-uhd_3840_2160_30fps.mp4', { probe: { height: 2160, duration: 12, hasAudio: false } }).kind, 'overlays');
    const mj = c('u6251845547_anime_action_scene_--ar_7758_--raw_--v_7_4e36a10f-1111-2222-3333-444455556666_0.png', { hint: { channel: 'inverteddevils' } });
    assert.equal(mj.kind, 'art');
    assert.equal(mj.tool, 'midjourney');
    // its videos ("social_…"), other users' jobs, Kling and Freepik clips are generated too
    const clip = { probe: { height: 720, duration: 5, hasAudio: false } };
    assert.equal(c('social_u6251845547_Atmospheric_forest_4e36a10f-1111-2222-3333-444455556666_2.mp4', clip).tool, 'midjourney');
    assert.equal(c('prince8883594_A_yacht_is_moving_4e36a10f-1111-2222-3333-444455556666_0.mp4', clip).tool, 'midjourney');
    assert.equal(c('kling_20251026_Image_to_Video_a_fox_walks_0.mp4', clip).guess ?? c('kling_20251026_Image_to_Video_a_fox_walks_0.mp4', clip).kind, 'art');
    assert.equal(c('freepik__wideangle-shot-a-pa__12345.mp4', clip).tool, 'freepik');
  });

  test("the user's own renders and captures are not filed", () => {
    assert.equal(c('wellerman-1771234567890.mp4').kind, null);
    assert.equal(c('vegetahellbellswest-1770000000000 (1).mp4').kind, null);
    assert.equal(c('DJI_20250805041235_0195_D.MP4').kind, null);
    assert.equal(c('Riverside-Snapshot.png').kind, null);
    assert.equal(c('New Recording 5.m4a').kind, null);
  });

  test('pins in a search folder take the search as their subject and keep their names', () => {
    const r = c('084d6b2d84afe94dea374119ae156b72.jpg', { set: '2026-11-02-zoro-king-of-hell', source: { tool: 'pinterest', ref: '1234' } });
    assert.equal(r.subject, 'one-piece/zoro');
    assert.equal(destOf(r, '2026-11-02-zoro-king-of-hell'), path.join('images', 'one-piece', 'zoro', '2026-11-02-zoro-king-of-hell', '084d6b2d84afe94dea374119ae156b72.jpg'));
  });

  test('personal captures and non-media are never filed', () => {
    assert.equal(c('WhatsApp Video 2026-03-31 at 16.15.47.mp4').kind, null);
    assert.equal(c('statement.pdf').kind, null);
    assert.equal(c('kit.zip').kind, null);
    assert.equal(c('Honored One Stems.zip', { hint: { channel: 'animemusiczone' } }).kind, 'music');
  });
});

describe('library', () => {
  const inbox = () => lib.cfg.inbox;
  const zoro = 'Zoro Twixtor Clips 4K Quality One Piece (2160p60).mp4';

  test('the inbox is filed with its provenance, and the download is gone from the inbox', async () => {
    const file = put('v1.mp4', path.join(inbox(), 'youtube', zoro));
    fs.writeFileSync(`${file}.source.json`, JSON.stringify({ schema: 'mediamake.source/v1', tool: 'youtube', ref: 'abc123', title: 'Zoro Twixtor Clips 4K Quality One Piece', height: 2160, fps: 60 }));
    const [r] = await ingest(lib, [inbox()]);
    assert.equal(r.action, 'filed');
    assert.match(r.dest!, /^footage\/one-piece\/zoro\/zoro-twixtor-clips/);
    assert.ok(!fs.existsSync(file) && !fs.existsSync(`${file}.source.json`));
    const dest = path.join(lib.root, r.dest!);
    assert.ok(fs.existsSync(dest));
    const side = JSON.parse(fs.readFileSync(path.join(path.dirname(dest), '.media.json'), 'utf8'));
    assert.equal(side.items[path.basename(dest)].sources[0].ref, 'abc123');
    assert.ok(fs.existsSync(path.join(lib.thumbs, `${r.id}.jpg`)));
    // Browse Hack's lookup, exactly as its MCP asks it
    const hit = lib.db.prepare("SELECT i.path, i.height FROM sources s JOIN items i ON i.id = s.item_id WHERE s.tool = ? AND s.ref = ? AND i.status = 'online'").get('youtube', 'abc123');
    assert.equal(hit?.path, r.dest);
  });

  test('a repeat download is set aside, not filed twice', async () => {
    const file = put('v1.mp4', path.join(inbox(), 'youtube', zoro.replace('.mp4', ' (1).mp4')));
    const [r] = await ingest(lib, [inbox()]);
    assert.equal(r.action, 'duplicate');
    assert.ok(!fs.existsSync(file));
    assert.equal(fs.readdirSync(path.join(inbox(), '_duplicates')).length, 1);
    assert.equal(find(lib, 'zoro twixtor').length, 1);
  });

  test("a file the user dropped is cloned in and stays where it was", async () => {
    const mine = put('song.wav', path.join(downloads, 'AMZ', 'Honored One - final master (-9 LUFS).wav'));
    const [r] = await ingest(lib, [mine], { now: true });
    assert.equal(r.action, 'filed');
    assert.equal(r.dest, path.join('music', 'animemusiczone', 'honored-one', 'Honored One - final master (-9 LUFS).wav'));
    assert.ok(fs.existsSync(mine));
    const copies = lib.db.prepare('SELECT role FROM locations WHERE item_id = ? ORDER BY role').all(r.id!) as { role: string }[];
    assert.deepEqual(copies.map(c => c.role), ['downloads', 'library']);
  });

  test('two different files with one name: the second gets -2', async () => {
    put('v2.mp4', path.join(inbox(), 'youtube', zoro));
    const [r] = await ingest(lib, [inbox()]);
    assert.match(r.dest!, /zoro-twixtor-clips-.*-2\.mp4$/);
  });

  test('use clones the file into a production, with its cached segregation', async () => {
    const it = find(lib, 'zoro twixtor', { limit: 5 }).find(i => !i.path.endsWith('-2.mp4'))!;
    const seg = path.join(tmp, 'seg');
    fs.mkdirSync(seg, { recursive: true });
    fs.writeFileSync(path.join(seg, 'segregation.json'), '{"shots":[]}');
    cachePut(lib, it, 'segregation', seg, { tool: 'analyze-video', target: 'footage/{name}' });
    fs.mkdirSync(path.join(projects, 'kingofhell'), { recursive: true });
    const r = await use(lib, it, 'kingofhell', { as: 'input/footage/zoro-vision.mp4', with: ['segregation', 'faces'] });
    assert.equal(await sha256File(r.dest), it.id);
    assert.ok(fs.existsSync(path.join(projects, 'kingofhell', 'footage', 'zoro-vision', 'segregation.json')));
    assert.deepEqual(r.missing, ['faces']);
    assert.equal(resolveItem(lib, r.dest).id, it.id);
  });

  test('dedupe turns copies into clones: same paths, same bytes, own dates', async () => {
    const a = put('v3.mp4', path.join(projects, 'p1', 'input', 'clip.mp4'));
    const b = put('v3.mp4', path.join(downloads, 'clip copy.mp4'));
    const mtime = fs.statSync(b).mtimeMs;
    await scan(lib, ['projects', 'downloads']);
    assert.ok(duplicates(lib).groups >= 1);
    const plan = planDedupe(lib, { minBytes: 0 });
    const swap = plan.go.find(s => s.replace === b || s.replace === a);
    assert.ok(swap, 'the copy is in the plan');
    assert.ok(plan.bytes >= fs.statSync(a).size, 'its bytes are counted as coming back');
    const r = dedupe(lib, { yes: true, minBytes: 0 });
    assert.equal(r.failed.length, 0);
    assert.ok(r.done >= fs.statSync(a).size, 'measured afterwards from the clone ids');
    assert.ok(fs.existsSync(a) && fs.existsSync(b));
    assert.equal(await sha256File(a), await sha256File(b));
    assert.equal(Math.round(fs.statSync(b).mtimeMs), Math.round(mtime));
    // a second run leaves the clone alone and doesn't count it again
    await scan(lib, ['projects', 'downloads']);
    const again = planDedupe(lib, { minBytes: 0 });
    assert.equal(again.swaps.find(s => s.replace === swap.replace)?.skip, 'already a clone of the kept copy');
    assert.ok(!again.groups.some(g => g.keep === swap.keep));
  });

  test('deliver puts the approved final in the channel folder; a newer one moves the old to previous/', async () => {
    fs.mkdirSync(path.join(projects, 'nakama', 'input'), { recursive: true });
    saveProduction(lib, 'nakama', { channel: 'animemusiczone', title: 'Nakama!' });
    put('v1.mp4', path.join(out, 'nakama', 'nakama.mp4'));
    const dry = await deliver(lib, 'nakama', ['video']);
    assert.equal(dry.done, false);
    assert.equal(dry.steps[0].action, 'new');
    await deliver(lib, 'nakama', ['video'], { yes: true });
    const target = path.join(downloads, 'AMZ', 'nakama', 'Nakama!.mp4');
    assert.ok(fs.existsSync(target));
    put('v2.mp4', path.join(out, 'nakama', 'nakama.mp4'));
    const again = await deliver(lib, 'nakama', ['video'], { yes: true });
    assert.equal(again.steps[0].action, 'replace');
    assert.equal(await sha256File(path.join(downloads, 'AMZ', 'nakama', 'previous', 'v1', 'Nakama!.mp4')), await sha256File(path.join(fixtures, 'v1.mp4')));
    assert.equal(await sha256File(target), await sha256File(path.join(fixtures, 'v2.mp4')));
    const record = JSON.parse(fs.readFileSync(path.join(downloads, 'AMZ', 'nakama', 'delivery.json'), 'utf8'));
    assert.equal(record.items.length, 1);
  });

  test('a release folder must hold exactly one audio file', async () => {
    const rel = path.join(tmp, 'release');
    put('song.wav', path.join(rel, 'a.wav'));
    put('hit.wav', path.join(rel, 'b.wav'));
    await assert.rejects(() => deliver(lib, 'nakama', ['release'], { from: rel }), /exactly one audio file/);
  });

  test("the Library page's requests: sort an unsorted item, rate one low so find leaves it out", async () => {
    put('pin.jpg', path.join(inbox(), 'other', 'pin.jpg'));
    const [r] = await ingest(lib, [inbox()]);
    assert.equal(r.c?.kind, '_unsorted');
    const reqs = path.join(lib.catalog, 'requests');
    fs.mkdirSync(reqs, { recursive: true });
    const req = (name: string, body: object) =>
      fs.writeFileSync(path.join(reqs, name), JSON.stringify({ schema: 'mediamake.library-request/v1', at: new Date().toISOString(), from: 'library-page', ...body }));
    req('1-sort.json', { op: 'sort', target: r.id, kind: 'images', subject: 'one-piece/zoro', tags: ['wallpaper'] });
    const zoro = find(lib, 'zoro twixtor')[0];
    req('2-rate.json', { op: 'rate', target: zoro.id, rating: 2 });
    req('3-channel.json', { op: 'set-channel', target: 'nakama', channel: 'inverteddevils' });
    const done = await applyRequests(lib);
    assert.deepEqual(done.failed, []);
    assert.equal(getItem(lib.db, r.id!)?.path, path.join('images', 'one-piece', 'zoro', 'pin.jpg'));
    assert.ok(!find(lib, 'zoro twixtor').some(i => i.id === zoro.id));
    assert.ok(find(lib, 'zoro twixtor', { all: true }).some(i => i.id === zoro.id));
    assert.equal(JSON.parse(fs.readFileSync(path.join(projects, 'nakama', 'mediamake.json'), 'utf8')).channel, 'inverteddevils');
    assert.equal(fs.readdirSync(reqs).filter(f => f.endsWith('.json')).length, 0);
  });

  test('the catalog comes back from the .media.json files', async () => {
    const before = (lib.db.prepare("SELECT id, path FROM items WHERE role = 'library' ORDER BY id").all() as { id: string; path: string }[]).map(r => `${r.id} ${r.path}`);
    await rebuild(lib);
    const after = (lib.db.prepare("SELECT id, path FROM items WHERE role = 'library' ORDER BY id").all() as { id: string; path: string }[]).map(r => `${r.id} ${r.path}`);
    assert.deepEqual(after, before);
    const it = getItem(lib.db, before[0].split(' ')[0])!;
    assert.ok(it.kind);
  });

  test('the sweep sorts loose files after review, leaves deliverables alone, and can be undone', async () => {
    const fresh = (name: string, color: string) => {
      ff(['-f', 'lavfi', '-i', `color=c=${color}:s=320x180:r=30`, '-t', '1', '-pix_fmt', 'yuv420p', path.join(fixtures, name)]);
      return name;
    };
    const sanji = put('v4.mp4', path.join(downloads, 'Sanji Twixtor 4K Quality One Piece (2160p60).mp4'));
    const copy = put('v1.mp4', path.join(downloads, 'zoro copy.mp4'));
    const keepMe = put(fresh('v9.mp4', 'purple'), path.join(downloads, 'Luffy Gear 5 Twixtor (1080p60).mp4'));
    const render = put(fresh('v7.mp4', 'white'), path.join(downloads, 'wellerman-1771234567890.mp4'));
    const unknown = put(fresh('v8.mp4', 'gray'), path.join(downloads, 'holiday.mp4'));
    put('v3.mp4', path.join(downloads, 'WhatsApp Video 2026-03-31 at 16.15.47.mp4'));
    put('song.wav', path.join(downloads, 'AMZ', 'cadence', 'release', 'Cadence - final master (-9 LUFS).wav'));
    // a hash-named download whose bytes a project used as an overlay, and Chrome's second copy of it
    ff(['-f', 'lavfi', '-i', 'color=c=blue:s=320x180:r=30', '-t', '1', '-pix_fmt', 'yuv420p', path.join(fixtures, 'v5.mp4')]);
    ff(['-f', 'lavfi', '-i', 'color=c=yellow:s=320x180:r=30', '-t', '1', '-pix_fmt', 'yuv420p', path.join(fixtures, 'v6.mp4')]);
    const hashed = put('v5.mp4', path.join(downloads, '224162_small.mp4'));
    const again = put('v5.mp4', path.join(downloads, '224162_small (1).mp4'));
    put('v5.mp4', path.join(projects, 'p9', 'input', 'overlays', 'fire-burst.mp4'));
    const inBoard = put('v6.mp4', path.join(downloads, 'AMZ', 'nakama-inspo', 'board', 'clip.mp4'));
    await scan(lib, ['downloads', 'projects']);
    const { plan, inFolders } = planSweep(lib);
    const by = (file: string) => plan.moves.find(m => m.from === file);
    assert.equal(by(sanji)?.action, 'move');
    assert.match(by(sanji)!.to, /^footage\/one-piece\/sanji\//);
    assert.equal(by(copy)?.action, 'set-aside');
    assert.ok(!plan.moves.some(m => /WhatsApp|release/.test(m.from)), 'personal captures and release folders are never proposed');
    assert.match(by(hashed)?.to ?? '', /^overlays\/fire\/fire-burst/, 'named and filed after the project copy');
    assert.equal(by(again)?.action, 'set-aside', 'the " (1)" copy is set aside, the first one goes in');
    assert.ok(!by(inBoard) && inFolders >= 1, 'files in folders stay where they are');
    assert.ok(!by(render) && !by(unknown), "renders of yours, and loose files it can't tell, stay where they are");
    assert.equal(by(keepMe)?.action, 'move');
    const review = path.join(lib.root, '_review', `sweep-${plan.id}`);
    const tiles = (JSON.parse(fs.readFileSync(path.join(review, 'index.json'), 'utf8')) as { groups: { items: { id: string; media?: string }[] }[] }).groups.flatMap(g => g.items);
    const media = tiles.find(t => t.id === `m${by(sanji)?.n}`)?.media;
    assert.ok(media && fs.existsSync(path.join(review, media)), 'a video to move gets a clone that plays in the review');
    await scan(lib, ['library']);
    assert.ok(!lib.db.prepare('SELECT 1 FROM locations WHERE path LIKE ?').get('_review/%'), 'the review folder is not catalogued');
    const revs = path.join(review, `sweep-${plan.id}.revisions`);
    fs.mkdirSync(revs, { recursive: true });
    fs.writeFileSync(path.join(revs, 'rev-001.json'), JSON.stringify({ schema: 'mediamake.image-revision/v1', drop: [`m${by(keepMe)?.n}`], comments: [] }));
    const r = await applySweep(lib, plan.id, { yes: true });
    assert.ok(r.done >= 2);
    assert.ok(!fs.existsSync(sanji) && fs.existsSync(path.join(lib.root, by(sanji)!.to)));
    assert.ok(!fs.existsSync(copy) && fs.existsSync(keepMe));
    const u = await undoSweep(lib, plan.id, { yes: true });
    assert.equal(u.done, r.done);
    assert.ok(fs.existsSync(sanji) && fs.existsSync(copy));
    const row = lib.db.prepare('SELECT role FROM locations WHERE path = ?').get(sanji);
    assert.equal(row?.role, 'downloads');
  });

  test('backups: staged as clones by channel, copied to a disk with every file checked, listed and restored', async () => {
    const render = put('v2.mp4', path.join(downloads, 'gojo-1765863553018.mp4'));
    await scan(lib, ['downloads']);
    const staged = path.join(backupRoot(lib), 'AMZ', 'renders', path.basename(render));
    assert.equal((await stage(lib, [render], { channel: 'animemusiczone', as: 'renders' })).done, 0, 'a dry run stages nothing');
    assert.ok(!fs.existsSync(staged));
    assert.equal((await stage(lib, [render], { channel: 'AMZ', as: 'renders', yes: true })).done, 1, 'a channel by its id or its folder');
    assert.equal(await sha256File(staged), await sha256File(render));
    assert.equal((await stage(lib, [render], { channel: 'AMZ', as: 'renders', yes: true })).done, 0, 'staged once');
    await scan(lib, ['downloads']);
    assert.ok(!lib.db.prepare('SELECT 1 FROM locations WHERE path LIKE ?').get('%/_BACKUP/%'), 'the staging folder is not catalogued');

    const disk = path.join(tmp, 'Volumes', 'T7');
    fs.mkdirSync(disk, { recursive: true });
    assert.equal((await copyToDisk(lib, disk, { yes: true })).done, 1);
    const copy = path.join(disk, DISK_FOLDER, 'AMZ', 'renders', path.basename(render));
    assert.equal(await sha256File(copy), await sha256File(render));
    assert.equal((await copyToDisk(lib, disk, { yes: true })).done, 0, 'copied once');
    const listed = listBackup(lib, ['gojo']);
    assert.equal(listed.length, 1);
    assert.deepEqual(listed[0].disks, ['T7']);

    // the original and the clone gone: the disk brings it back where it was
    fs.rmSync(staged);
    fs.rmSync(render);
    assert.equal((await restore(lib, ['gojo'], { from: disk, yes: true })).done, 1);
    assert.equal(await sha256File(render), await sha256File(copy));
    // a copy that no longer matches its hash is refused
    fs.writeFileSync(copy, 'not the video');
    fs.rmSync(render);
    const bad = await restore(lib, ['gojo'], { from: disk, yes: true });
    assert.equal(bad.done, 0);
    assert.equal(bad.bad.length, 1);
    assert.ok(!fs.existsSync(render));
  });

  test('the export the Library page reads', () => {
    const r = exportLibrary(lib);
    const meta = JSON.parse(fs.readFileSync(path.join(r.dir, 'meta.json'), 'utf8'));
    assert.equal(meta.schema, 'mediamake.library-export/v1');
    const footage = JSON.parse(fs.readFileSync(path.join(r.dir, 'media-footage.json'), 'utf8'));
    assert.ok(footage.some((m: { subject?: string }) => m.subject === 'one-piece/zoro'));
    const prods = JSON.parse(fs.readFileSync(path.join(r.dir, 'productions.json'), 'utf8'));
    // the requests test above moved it to inverteddevils
    assert.ok(prods.find((p: { slug: string; channel?: string }) => p.slug === 'nakama' && p.channel === 'inverteddevils'));
    assert.equal(meta.root, lib.root);
  });
});
