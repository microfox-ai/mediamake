/**
 * fetch-inputs: downloads the files listed in projects/<slug>/input/sources.json into input/.
 *
 * For projects made from a mediamake timeline, whose song and pictures live on the mediamake CDN.
 * sources.json maps a file name in input/ to its URL:
 *   { "song.mp3": "https://…/track.mp3", "cover.jpg": "https://…/art.jpeg" }
 * Files already in input/ are left alone, so it is safe to re-run.
 *
 * Usage: npm run fetch-inputs -w lyrics_videos -- <slug> [<slug> …]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../projects');

const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.error('Usage: npm run fetch-inputs -w lyrics_videos -- <slug> [<slug> …]');
  process.exit(1);
}

let failed = 0;
for (const slug of slugs) {
  const input = path.join(PROJECTS, slug, 'input');
  const listFile = path.join(input, 'sources.json');
  if (!fs.existsSync(listFile)) {
    console.error(`${slug}: no input/sources.json`);
    failed++;
    continue;
  }
  const sources = JSON.parse(fs.readFileSync(listFile, 'utf8')) as Record<string, string>;
  for (const [name, url] of Object.entries(sources)) {
    const target = path.join(input, name);
    if (path.dirname(target) !== input) throw new Error(`${slug}: "${name}" must be a plain file name`);
    if (fs.existsSync(target)) {
      console.log(`${slug}/${name}  already there`);
      continue;
    }
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`${slug}/${name}  ${res.status} ${res.statusText}  ${url}`);
      failed++;
      continue;
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(target, bytes);
    console.log(`${slug}/${name}  ${(bytes.length / 1e6).toFixed(1)} MB`);
  }
}
process.exit(failed ? 1 : 0);
