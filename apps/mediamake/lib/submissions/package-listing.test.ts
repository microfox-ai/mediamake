import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isUploadedFor } from '../catalog/author-listing';
import type { ListingFields } from '../catalog/listing';
import {
  fillListingFromPackage,
  fingerprint,
  listingLine,
  listingNotes,
  pictureName,
  readPackageListing,
  readmePictureLinks,
  rewritePictures,
  type PackageDetails,
  type PackageListingStore,
  type PackageMark,
} from './package-listing';
import type { SubmissionFile } from './submission';

const ITEM = 'skill/make-thing';
const ADMIN = 'admin-1';
const BASE = 'https://cdn.test/mediamake/';

const SKILL_MD = '---\nname: make-thing\ndescription: Makes a thing from a song and a picture. Use when the user says "make a thing".\n---\n\n# make-thing\n';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 3]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0, 9, 9]);

const file = (path: string, content: string): SubmissionFile => ({ path, content, encoding: 'utf8' });
const picture = (path: string, bytes: Buffer): SubmissionFile => ({ path, content: bytes.toString('base64'), encoding: 'base64' });

const readme = (over: { front?: string[]; body?: string } = {}) =>
  [
    '---',
    ...(over.front ?? ['description: Give it a song and a picture. It makes the thing, ready to post.', 'tags: music, Lyric Video, shorts', 'headshot: headshot.jpg', 'nature: shared-use', 'type: subset', 'superset: make-things']),
    '---',
    '',
    over.body ?? '# Make Thing\n\nWhat it is, in a line.\n\n## How to use\n\n1. Say **make a thing**.\n\n## What the skill outputs\n\n![A thumbnail](shots/a.png)\n![The Short](./shots/b.png "Nine by sixteen")\n',
  ].join('\n');

const pack = (text = readme(), extra: SubmissionFile[] = []): SubmissionFile[] => [
  file('SKILL.md', SKILL_MD),
  file('README.md', text),
  picture('headshot.jpg', JPG),
  picture('shots/a.png', PNG),
  picture('shots/b.png', Buffer.from([...PNG, 7])),
  ...extra,
];

/** A store that remembers what it was given: one item's listing, its details and what the last release put there. */
function fakeStore(seed: { listing?: ListingFields; details?: PackageDetails; mark?: PackageMark } = {}) {
  const state = { listing: seed.listing ?? null, details: seed.details ?? null, mark: seed.mark ?? null } as { listing: ListingFields | null; details: PackageDetails | null; mark: PackageMark | null };
  const uploads: { itemId: string; by: string; name: string; contentType: string; bytes: number }[] = [];
  const saves = { listing: 0, details: 0, mark: 0 };
  const store: PackageListingStore = {
    listing: async () => state.listing,
    saveListing: async (_itemId, listing) => {
      saves.listing += 1;
      state.listing = listing;
    },
    details: async () => state.details,
    saveDetails: async (_itemId, details) => {
      saves.details += 1;
      state.details = details;
    },
    mark: async () => state.mark,
    saveMark: async mark => {
      saves.mark += 1;
      state.mark = mark;
    },
    upload: async ({ itemId, by, name, contentType, bytes }) => {
      uploads.push({ itemId, by, name, contentType, bytes: bytes.length });
      return `${BASE}${by}/catalog-thumbnails/${itemId}/${name}`;
    },
  };
  return { store, state, uploads, saves };
}

const release = (store: PackageListingStore, files: SubmissionFile[], over: { version?: string; by?: string; byAdmin?: boolean; ownTags?: string[]; kind?: 'skill' | 'mcp' | 'app' } = {}) =>
  fillListingFromPackage(store, { itemId: ITEM, kind: over.kind ?? 'skill', version: over.version ?? '0.1.0', files, by: over.by ?? ADMIN, byAdmin: over.byAdmin ?? true, ownTags: over.ownTags });

const linkOf = (path: string, bytes: Buffer, by = ADMIN) => `${BASE}${by}/catalog-thumbnails/${ITEM}/${pictureName(path, bytes)}`;

describe('what a package says its listing is', () => {
  it('reads the README.md: its frontmatter, its text without it, and the pictures it shows from the folder', () => {
    const read = readPackageListing(pack());
    assert.ok(read);
    assert.equal(read.description, 'Give it a song and a picture. It makes the thing, ready to post.');
    assert.deepEqual(read.tags, ['music', 'lyric-video', 'shorts']);
    assert.deepEqual(read.headshot, { file: 'headshot.jpg' });
    assert.deepEqual([read.type, read.superset], ['subset', 'make-things']);
    assert.match(read.readme!, /^# Make Thing\n/);
    assert.equal(read.readme!.includes('description:'), false);
    assert.deepEqual(read.pictures, ['shots/a.png', 'shots/b.png']);
    assert.deepEqual(read.notes, []);
  });

  it('is nothing without a README.md, and takes an https headshot as it is', () => {
    assert.equal(readPackageListing([file('SKILL.md', SKILL_MD)]), null);
    assert.equal(readPackageListing([file('SKILL.md', SKILL_MD), picture('README.md', PNG)]), null);
    const linked = readPackageListing(pack(readme({ front: ['headshot: https://img.test/h.jpg', 'tags: [a, "b c"]'] })));
    assert.deepEqual(linked?.headshot, { link: 'https://img.test/h.jpg' });
    assert.deepEqual(linked?.tags, ['a', 'b-c']);
    assert.equal(linked?.description, undefined);
  });

  it('cuts a long description at a word, and says what it could not take', () => {
    const long = `${'word '.repeat(80)}end`;
    const read = readPackageListing(pack(readme({ front: [`description: ${long}`, 'headshot: gone.jpg', 'nature: private-use', 'type: subset'] })));
    assert.ok(read!.description!.length <= 300);
    assert.match(read!.description!, /word…$/);
    assert.equal(read!.headshot, undefined);
    assert.equal(read!.type, undefined);
    assert.equal(read!.notes.length, 3);
    assert.match(read!.notes.join('\n'), /gone\.jpg is not in the package/);
    assert.match(read!.notes.join('\n'), /private-use/);
    assert.match(read!.notes.join('\n'), /names no superset/);
    const out = readPackageListing(pack(readme({ front: ['headshot: ../other/h.jpg'] })));
    assert.equal(out!.headshot, undefined);
    assert.match(out!.notes[0], /headshot/);
  });

  it('finds the pictures a README shows from its folder: each once, never a link, never one in a code block', () => {
    const body = [
      '![a](shots/a.png) ![again](./shots/a.png)',
      '![web](https://img.test/x.png)',
      '![spaced](<shots/my shot.jpg> "A title")',
      '![ref][one]',
      '',
      '```markdown',
      '![An example](shots/example.png)',
      '```',
      '',
      '[one]: shots/ref.webp',
      '[docs]: docs/guide.md',
      '![out](../secrets.png)',
    ].join('\n');
    assert.deepEqual(readmePictureLinks(body), ['shots/a.png', 'shots/my shot.jpg', 'shots/ref.webp']);
  });

  it('rewrites those pictures to their links and leaves everything else as written', () => {
    const body = ['![shots/a.png](shots/a.png "shots/a.png")', '![spaced](<shots/my shot.jpg>)', '![gone](shots/gone.png)', '```', '![An example](shots/a.png)', '```', '[one]: ./shots/a.png'].join('\n');
    const out = rewritePictures(body, { 'shots/a.png': 'https://cdn.test/a.png', 'shots/my shot.jpg': 'https://cdn.test/my.jpg' });
    assert.deepEqual(out.split('\n'), [
      '![shots/a.png](https://cdn.test/a.png "shots/a.png")',
      '![spaced](https://cdn.test/my.jpg)',
      '![gone](shots/gone.png)',
      '```',
      '![An example](shots/a.png)',
      '```',
      '[one]: https://cdn.test/a.png',
    ]);
  });

  it('names a picture by what is in it, so the same picture keeps its link', () => {
    assert.match(pictureName('shots/my shot.png', PNG), /^[0-9a-f]{16}-shots_my_shot\.png$/);
    assert.equal(pictureName('a.png', PNG), pictureName('a.png', Buffer.from(PNG)));
    assert.notEqual(pictureName('a.png', PNG), pictureName('a.png', JPG));
  });
});

describe('a first release', () => {
  it('fills the listing and the skill’s details from the package, with its pictures uploaded', async () => {
    const { store, state, uploads } = fakeStore();
    const fill = await release(store, pack(), { ownTags: ['music'] });
    assert.ok(fill);
    assert.deepEqual(fill.filled, ['description', 'headshot', 'readme', 'tags', 'type']);
    assert.deepEqual([fill.kept, fill.notes], [[], []]);

    assert.equal(state.listing?.description, 'Give it a song and a picture. It makes the thing, ready to post.');
    assert.equal(state.listing?.headshot, linkOf('headshot.jpg', JPG));
    // the tags the item already has are not kept again
    assert.deepEqual(state.listing?.tags, ['lyric-video', 'shorts']);
    assert.match(state.listing!.readme!, /^# Make Thing\n/);
    assert.ok(state.listing!.readme!.includes(`![A thumbnail](${linkOf('shots/a.png', PNG)})`));
    assert.ok(state.listing!.readme!.includes(`![The Short](${linkOf('shots/b.png', Buffer.from([...PNG, 7]))} "Nine by sixteen")`));
    assert.equal(/\]\((\.\/)?shots\//.test(state.listing!.readme!), false);
    assert.deepEqual(state.details, { type: 'subset', superset: 'make-things' });

    assert.deepEqual(uploads.map(upload => [upload.by, upload.contentType]), [[ADMIN, 'image/jpeg'], [ADMIN, 'image/png'], [ADMIN, 'image/png']]);
    // an author may set the same picture again: it counts as one uploaded for the item
    assert.equal(isUploadedFor(ITEM, state.listing!.headshot!, BASE), true);
    assert.equal(state.mark?.version, '0.1.0');
    assert.deepEqual(Object.keys(state.mark!.fields).sort(), ['description', 'headshot', 'readme', 'tags', 'type']);
  });

  it('keeps the rest of a listing that was there: its icon, screenshots, editors’ pick and advice', async () => {
    const before: ListingFields = { tags: [], media: [{ kind: 'image', url: 'https://cdn.test/shot.png' }], icon: 'https://cdn.test/i.png', editorsPick: true, advice: 'not-recommended', adviceNote: 'A better way exists', insteadOf: 'skill/other' };
    const { store, state } = fakeStore({ listing: before });
    await release(store, pack());
    assert.deepEqual(
      { media: state.listing?.media, icon: state.listing?.icon, editorsPick: state.listing?.editorsPick, advice: state.listing?.advice, adviceNote: state.listing?.adviceNote, insteadOf: state.listing?.insteadOf },
      { media: before.media, icon: before.icon, editorsPick: true, advice: 'not-recommended', adviceNote: 'A better way exists', insteadOf: 'skill/other' },
    );
    assert.equal(state.listing?.description, 'Give it a song and a picture. It makes the thing, ready to post.');
  });

  it('takes a headshot by link from an admin’s release, and only a picture in the folder from an author’s own', async () => {
    const linked = pack(readme({ front: ['description: What it is, for people.', 'headshot: https://img.test/h.jpg'] }));
    const admin = fakeStore();
    assert.deepEqual((await release(admin.store, linked))?.filled, ['description', 'headshot', 'readme']);
    assert.equal(admin.state.listing?.headshot, 'https://img.test/h.jpg');

    const author = fakeStore();
    const fill = await release(author.store, linked, { by: 'author-1', byAdmin: false });
    assert.deepEqual(fill?.filled, ['description', 'readme']);
    assert.equal(author.state.listing?.headshot, undefined);
    assert.match(fill!.notes.join('\n'), /link to another site/);
    // their picture in the folder is uploaded for the item, under their own folder
    await release(author.store, pack(), { by: 'author-1', byAdmin: false, version: '0.2.0' });
    assert.equal(author.state.listing?.headshot, linkOf('headshot.jpg', JPG, 'author-1'));
    assert.equal(isUploadedFor(ITEM, author.state.listing!.headshot!, BASE), true);
  });

  it('does nothing for a package with no README.md, and nothing for an MCP or an app', async () => {
    const { store, state, saves, uploads } = fakeStore();
    assert.equal(await release(store, [file('SKILL.md', SKILL_MD), picture('headshot.jpg', JPG)]), null);
    assert.equal(await release(store, pack(), { kind: 'mcp' }), null);
    assert.equal(await release(store, pack(), { kind: 'app' }), null);
    assert.deepEqual([state.listing, state.details, state.mark, saves, uploads], [null, null, null, { listing: 0, details: 0, mark: 0 }, []]);
  });

  it('says what it could not take, and still takes the rest', async t => {
    // the refusal is logged for the admins: not in the test's output
    t.mock.method(console, 'error', () => {});
    const text = readme({ front: ['description: What it is, for people.', 'headshot: headshot.jpg'], body: '# Make Thing\n\n![Here](shots/a.png)\n![Gone](shots/gone.png)\n' });
    const { store, state } = fakeStore();
    // the storage refuses the headshot
    const upload = store.upload;
    store.upload = async input => {
      if (input.name.endsWith('headshot.jpg')) throw new Error('storage is down');
      return upload(input);
    };
    const fill = await release(store, pack(text));
    assert.deepEqual(fill?.filled, ['description', 'readme']);
    assert.equal(state.listing?.headshot, undefined);
    assert.ok(state.listing!.readme!.includes(`![Here](${linkOf('shots/a.png', PNG)})`));
    assert.ok(state.listing!.readme!.includes('![Gone](shots/gone.png)'));
    assert.equal(fill?.notes.length, 2);
    assert.match(fill!.notes.join('\n'), /headshot\.jpg could not be uploaded/);
    assert.match(fill!.notes.join('\n'), /shots\/gone\.png/);
    assert.equal(state.mark?.fields.headshot, undefined);
  });
});

describe('an update', () => {
  const v2 = readme({
    front: ['description: The new words for it.', 'tags: music, remix', 'headshot: headshot.jpg', 'type: superset'],
    body: '# Make Thing\n\nNow with remixes.\n\n## What the skill outputs\n\n![The new one](shots/c.png)\n',
  });
  const newHeadshot = Buffer.from([...JPG, 1]);
  const v2Files = [file('SKILL.md', SKILL_MD), file('README.md', v2), picture('headshot.jpg', newHeadshot), picture('shots/c.png', PNG)];

  it('refreshes what the last release put there', async () => {
    const { store, state } = fakeStore();
    await release(store, pack(), { ownTags: ['music'] });
    const fill = await release(store, v2Files, { version: '0.2.0', ownTags: ['music'] });
    assert.deepEqual(fill?.filled, ['description', 'headshot', 'readme', 'tags', 'type']);
    assert.deepEqual(fill?.kept, []);
    assert.equal(state.listing?.description, 'The new words for it.');
    assert.equal(state.listing?.headshot, linkOf('headshot.jpg', newHeadshot));
    assert.deepEqual(state.listing?.tags, ['remix']);
    assert.match(state.listing!.readme!, /Now with remixes/);
    assert.ok(state.listing!.readme!.includes(linkOf('shots/c.png', PNG)));
    // a superset names no superset
    assert.deepEqual(state.details, { type: 'superset' });
    assert.equal(state.mark?.version, '0.2.0');
  });

  it('saves nothing when the package says what the listing already says', async () => {
    const { store, state, saves } = fakeStore();
    await release(store, pack());
    const listing = state.listing;
    const fill = await release(store, pack(), { version: '0.1.1' });
    assert.deepEqual([fill?.filled, fill?.kept, fill?.notes], [[], [], []]);
    assert.equal(state.listing, listing);
    assert.deepEqual([saves.listing, saves.details], [1, 1]);
  });

  it('leaves what an update no longer names: a release fills and refreshes, it never clears', async () => {
    const { store, state } = fakeStore();
    await release(store, pack());
    const headshot = state.listing?.headshot;
    const bare = readme({ front: ['description: Only the words changed.'], body: '# Make Thing\n\nShort.\n' });
    const fill = await release(store, [file('SKILL.md', SKILL_MD), file('README.md', bare)], { version: '0.2.0' });
    assert.deepEqual(fill?.filled, ['description', 'readme']);
    assert.equal(state.listing?.headshot, headshot);
    assert.deepEqual(state.listing?.tags, ['music', 'lyric-video', 'shorts']);
    assert.deepEqual(state.details, { type: 'subset', superset: 'make-things' });
    // and they are still the package's, so a later release that names them again refreshes them
    await release(store, v2Files, { version: '0.3.0' });
    assert.equal(state.listing?.headshot, linkOf('headshot.jpg', newHeadshot));
    assert.deepEqual(state.details, { type: 'superset' });
  });
});

describe('what was set by hand', () => {
  const v2 = readme({ front: ['description: The new words for it.', 'tags: remix', 'headshot: headshot.jpg', 'type: superset'], body: '# Make Thing\n\nNow with remixes.\n' });
  const v2Files = [file('SKILL.md', SKILL_MD), file('README.md', v2), picture('headshot.jpg', Buffer.from([...JPG, 1]))];

  it('survives every later release, while the fields nobody touched are refreshed', async () => {
    const { store, state, uploads } = fakeStore();
    await release(store, pack());
    // an admin sets the headshot and the description on the item's page, and its type in Edit details
    state.listing = { ...state.listing!, headshot: 'https://cdn.test/by-hand.jpg', description: 'An admin’s own words.' };
    state.details = { type: 'mcp-use' };
    uploads.length = 0;

    const fill = await release(store, v2Files, { version: '0.2.0' });
    assert.deepEqual(fill?.filled, ['readme', 'tags']);
    assert.deepEqual(fill?.kept, ['description', 'headshot', 'type']);
    assert.equal(state.listing?.headshot, 'https://cdn.test/by-hand.jpg');
    assert.equal(state.listing?.description, 'An admin’s own words.');
    assert.deepEqual(state.details, { type: 'mcp-use' });
    assert.match(state.listing!.readme!, /Now with remixes/);
    assert.deepEqual(state.listing?.tags, ['remix']);
    // a picture nobody will show is not uploaded
    assert.deepEqual(uploads, []);

    // and the release after that one leaves them too
    const again = await release(store, pack(), { version: '0.3.0' });
    assert.deepEqual(again?.kept, ['description', 'headshot', 'type']);
    assert.equal(state.listing?.headshot, 'https://cdn.test/by-hand.jpg');
    assert.equal(state.listing?.description, 'An admin’s own words.');
    assert.deepEqual(state.details, { type: 'mcp-use' });
  });

  it('is everything on a listing filled before releases wrote any down: only what is empty is filled', async () => {
    const byHand: ListingFields = { tags: ['lyrics'], media: [], description: 'Set through the admins’ connector.', headshot: 'https://cdn.test/by-hand.jpg', readme: '# Pasted by hand' };
    const { store, state } = fakeStore({ listing: byHand });
    const fill = await release(store, pack());
    assert.deepEqual(fill?.filled, ['type']);
    assert.deepEqual(fill?.kept, ['description', 'headshot', 'readme', 'tags']);
    assert.deepEqual({ ...state.listing }, { ...byHand });
    assert.deepEqual(state.details, { type: 'subset', superset: 'make-things' });
  });

  it('is handed back to the package by clearing it: the next release fills it again', async () => {
    const { store, state } = fakeStore();
    await release(store, pack());
    state.listing = { ...state.listing!, headshot: 'https://cdn.test/by-hand.jpg' };
    await release(store, v2Files, { version: '0.2.0' });
    assert.equal(state.listing?.headshot, 'https://cdn.test/by-hand.jpg');
    // the admin clears the headshot on its page
    state.listing = { ...state.listing!, headshot: undefined };
    const fill = await release(store, v2Files, { version: '0.3.0' });
    assert.deepEqual(fill?.filled, ['headshot']);
    assert.match(state.listing!.headshot!, /catalog-thumbnails\/skill\/make-thing\/[0-9a-f]{16}-headshot\.jpg$/);
  });

  it('that says the same as the package is the package’s again', async () => {
    const { store, state } = fakeStore({ listing: { tags: [], media: [], description: 'Give it a song and a picture. It makes the thing, ready to post.' } });
    const first = await release(store, pack());
    assert.deepEqual([first?.kept, first?.filled.includes('description')], [[], false]);
    assert.equal(state.mark?.fields.description, fingerprint('Give it a song and a picture. It makes the thing, ready to post.'));
    await release(store, [file('SKILL.md', SKILL_MD), file('README.md', v2), picture('headshot.jpg', JPG)], { version: '0.2.0' });
    assert.equal(state.listing?.description, 'The new words for it.');
  });
});

describe('what the sender is told', () => {
  it('names what the listing took, in the words its page uses', () => {
    assert.equal(listingLine({ filled: ['description', 'headshot', 'readme', 'tags', 'type'], kept: [], notes: [] }), 'Its listing took its description, headshot, README, tags and type from the package’s README.md.');
    assert.equal(listingLine({ filled: ['readme'], kept: [], notes: [] }), 'Its listing took its README from the package’s README.md.');
    assert.equal(listingLine({ filled: [], kept: ['headshot'], notes: [] }), null);
  });

  it('says what was left because it was set by hand, before what could not be taken', () => {
    assert.deepEqual(listingNotes({ filled: [], kept: [], notes: ['a note'] }), ['a note']);
    assert.deepEqual(listingNotes({ filled: ['readme'], kept: ['headshot'], notes: ['a note'] }), [
      'Its headshot was set by hand on its page, so the package’s was not taken. Clear it there and the next release fills it',
      'a note',
    ]);
    assert.match(listingNotes({ filled: [], kept: ['description', 'type'], notes: [] })[0], /^Its description and type were set by hand .* Clear one there/);
    assert.match(listingNotes({ filled: [], kept: ['tags'], notes: [] })[0], /^Its tags were set by hand .* Clear them there/);
  });
});
