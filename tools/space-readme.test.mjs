// An item's README.md in a space report: its text and the pictures beside it, sent once (tools/space.mjs).
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { itemReadme, readmePictureLinks, uploadReadmePictures } from './space.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('a README names its headshot and the pictures beside it, each once, never a web link or a path out of its folder', () => {
  const md = `---\ndescription: x\nheadshot: headshot.jpg\n---\n\n# Pack\n\n![a](shots/a.png) ![again](./shots/a.png)\n![web](https://example.com/b.png) ![up](../c.png) ![root](/d.png)\n![spaced](<shots/my shot.jpg> "title") ![ref][r]\n![clip](demo.mp4)\n\n[r]: shots/ref.webp\n`;
  assert.deepEqual(readmePictureLinks(md, 'headshot.jpg'), ['headshot.jpg', 'shots/a.png', 'shots/my shot.jpg', 'shots/ref.webp']);
});

test("an item's README goes with its pictures' hashes; missing, too big or outside pictures stay out", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-readme-'));
  try {
    fs.mkdirSync(path.join(dir, 'shots'));
    const png = Buffer.from('fake png bytes');
    fs.writeFileSync(path.join(dir, 'shots', 'a.png'), png);
    fs.writeFileSync(path.join(dir, 'shots', 'huge.png'), Buffer.alloc(3 * 1024 * 1024));
    fs.writeFileSync(path.join(dir, 'README.md'), `---\nheadshot: shots/a.png\n---\n\n# X\n\n![a](shots/a.png) ![gone](shots/gone.png) ![huge](shots/huge.png)\n`);
    const readme = itemReadme(dir);
    assert.match(readme.text, /^---\nheadshot/);
    assert.deepEqual(readme.pictures, [{ path: 'shots/a.png', sha256: sha(png), type: 'image/png', bytes: png.length }]);
    fs.writeFileSync(path.join(dir, 'README.md'), '  \n');
    assert.equal(itemReadme(dir), null);
    fs.rmSync(path.join(dir, 'README.md'));
    assert.equal(itemReadme(dir), null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('only the pictures MediaMake asks for go up, with the headers it names, and a picture changed since is skipped', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-readme-up-'));
  const got = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      got.push({ method: req.method, url: req.url, type: req.headers['content-type'], acl: req.headers['x-amz-acl'], body: Buffer.concat(chunks).toString() });
      res.end('ok');
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const at = path.join(dir, 'skills', 'pack', 'shots');
    fs.mkdirSync(at, { recursive: true });
    fs.writeFileSync(path.join(at, 'a.png'), 'AAA');
    fs.writeFileSync(path.join(at, 'b.png'), 'BBB');
    const report = { items: [{ kind: 'skill', name: 'pack', readme: { text: '# x', pictures: [{ path: 'shots/a.png', sha256: sha('AAA') }, { path: 'shots/b.png', sha256: sha('old') }] } }] };
    const headers = { 'Content-Type': 'image/png', 'x-amz-acl': 'private' };
    const sent = await uploadReadmePictures(dir, report, [
      { sha256: sha('AAA'), url: `${base}/up/a`, headers },
      { sha256: sha('old'), url: `${base}/up/b`, headers },
      { sha256: sha('nobody'), url: `${base}/up/c`, headers },
    ]);
    assert.equal(sent, 1);
    assert.deepEqual(got, [{ method: 'PUT', url: '/up/a', type: 'image/png', acl: 'private', body: 'AAA' }]);
    assert.equal(await uploadReadmePictures(dir, report, undefined), 0);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
