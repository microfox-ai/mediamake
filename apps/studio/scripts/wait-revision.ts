/**
 * wait-revision: wait until the user sets a revision to "Ready for Claude" in the Revisions screen,
 * then print it and exit. Claude runs it in the background right after giving the review link
 * (revise-video › Auto pick-up), so the notes reach Claude without the user pasting a message.
 *
 * Usage: mm wait-revision <slug> [--video=out/<slug>/<slug>.mp4] [--timeout=110] [--every=3]
 *   watches every <video>.revisions/ folder under out/<slug>/ (the video, its clips, looks and shorts, and
 *   live.revisions/ from reviewing the project live; not the kept v<N>/ copies), or only --video's. A revision that is already ready is reported at once.
 *   --timeout  minutes to wait (default 110, inside the two hours a background command may run); exits 3 then
 *   --every    seconds between looks at the disk (default 3)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REVISIONS_SUFFIX, commentLine, isMachineNote, readRevisions, revisionsDirFor, type Revision } from './revision-files.ts';
import { DIRS, shown } from './paths.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name: string) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const [slug] = args.filter(a => !a.startsWith('--'));
if (!slug && !opt('video')) {
  console.error('Usage: mm wait-revision <slug> [--video=path.mp4] [--timeout=110] [--every=3]');
  process.exit(1);
}
const timeoutMin = Number(opt('timeout') ?? 110);
const everySec = Math.max(1, Number(opt('every') ?? 3));
const videoFlag = opt('video');
const projectDir = slug ? path.join(DIRS.out, slug) : null;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** every revisions folder to watch: --video's, or all under out/<slug>/ outside kept versions */
function watchedDirs(): string[] {
  if (videoFlag) return [revisionsDirFor(path.resolve(ROOT, videoFlag))];
  const dirs: string[] = [];
  const walk = (dir: string, depth: number) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('.') || /^v\d+$/.test(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.name.endsWith(REVISIONS_SUFFIX)) dirs.push(full);
      else if (depth < 4) walk(full, depth + 1);
    }
  };
  if (projectDir) walk(projectDir, 1);
  return dirs;
}

const readyNow = () =>
  watchedDirs().flatMap(dir => readRevisions(dir).filter(r => r.status === 'ready').map(revision => ({ dir, revision })));

function report(found: { dir: string; revision: Revision }[]) {
  for (const { dir, revision } of found) {
    const notes = revision.comments.filter(c => !isMachineNote(c));
    // general notes (the whole video) first: they change how the rest are read
    const open = revision.comments
      .filter(c => c.status === 'open')
      .sort((a, b) => Number(b.kind === 'general') - Number(a.kind === 'general'));
    const json = path.join(dir, `${revision.id}.json`);
    console.log(
      `${revision.id} “${revision.title}” is ready for Claude: ${open.length} open of ${revision.comments.length} ` +
        `(${notes.length} from the user) in ${shown(json)}.`,
    );
    if (revision.live)
      console.log(
        `A live review: notes on projects/${revision.live.project} playing from its code (no render). Fix the project, ` +
          `not a video; the screen reloads it when the code changes.`,
      );
    console.log(`Read ${shown(path.join(dir, `${revision.id}.md`))} first; the stills of point notes are in ${shown(path.join(dir, revision.id))}/.`);
    for (const c of open) console.log(`  ${commentLine(c)}`);
  }
  console.log('Act on it (revise-video › Act on it), then start this watcher again after giving the next link.');
}

const deadline = Date.now() + timeoutMin * 60_000;
for (;;) {
  if (readyNow().length) {
    // let the screen finish writing the .md and the stills, and make sure it was not a slip of the menu
    await sleep(2500);
    const found = readyNow();
    if (found.length) {
      report(found);
      process.exit(0);
    }
  }
  if (Date.now() >= deadline) {
    const where = videoFlag ? shown(revisionsDirFor(path.resolve(ROOT, videoFlag))) : `${shown(path.join(DIRS.out, slug!))}/`;
    console.log(
      `No revision under ${where} was set to “Ready for Claude” in ${timeoutMin} min. Stopped watching; ` +
        'start it once more if the user is still reviewing, otherwise wait for their message.',
    );
    process.exit(3);
  }
  await sleep(everySec * 1000);
}
