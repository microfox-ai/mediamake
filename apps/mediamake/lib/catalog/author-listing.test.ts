import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ListingFields } from './listing';
import { changeAuthorListing, isUploadedFor, readAuthorListing, type AuthorListingStore } from './author-listing';

const ADMIN = 'admin-1';
const AUTHOR = 'author-1';
const MEMBER = 'member-1';

const BASE = 'https://cdn.test/mediamake/';
/** A picture as the upload link keeps it: under its uploader's folder, then the item's. */
const uploaded = (itemId: string, file: string, uploader = AUTHOR) => `${BASE}${uploader}/catalog-thumbnails/${itemId}/${file}`;

const LISTING: ListingFields = {
  tags: ['anime'],
  media: [{ kind: 'image', url: 'https://cdn.test/shot.png' }],
  description: 'What it is',
  headshot: 'https://cdn.test/old.jpg',
  icon: 'https://cdn.test/old.png',
  readme: '# Mine',
  editorsPick: true,
  advice: 'not-recommended',
  adviceNote: 'There is a better way',
  insteadOf: 'mcp/other',
};

/** A store with `mcp/mine` (AUTHOR is its author), `skill/mine` (the same) and `mcp/theirs`, made outside MediaMake. */
function fakeStore() {
  const listings = new Map<string, ListingFields>([['mcp/mine', LISTING]]);
  const saves: { itemId: string; listing: ListingFields; clientId: string }[] = [];
  const uploads: { clientId: string; itemId: string; filename: string; contentType: string }[] = [];
  const records: Record<string, { id: string; kind: string; summary?: string; madeBy?: { name: string } }> = {
    'mcp/mine': { id: 'mcp/mine', kind: 'mcp', summary: 'Its own summary' },
    'skill/mine': { id: 'skill/mine', kind: 'skill' },
    'mcp/theirs': { id: 'mcp/theirs', kind: 'mcp', madeBy: { name: 'Storytold' } },
  };
  const store: AuthorListingStore = {
    record: async itemId => records[itemId] ?? null,
    isAdmin: async clientId => clientId === ADMIN,
    isAuthor: async (itemId, clientId) => clientId === AUTHOR && !records[itemId]?.madeBy,
    listing: async itemId => listings.get(itemId) ?? null,
    save: async (itemId, listing, clientId) => {
      saves.push({ itemId, listing, clientId });
      listings.set(itemId, listing);
      return listing;
    },
    upload: async input => {
      uploads.push(input);
      return { uploadUrl: 'https://store.test/put?sig=1', publicUrl: uploaded(input.itemId, `1-${input.filename}`, input.clientId) };
    },
    uploadsBase: BASE,
  };
  return { store, saves, uploads, listings };
}

describe('readAuthorListing', () => {
  it("tells an item's author and an admin they may, with the description and pictures it has", async () => {
    const { store } = fakeStore();
    assert.deepEqual((await readAuthorListing(store, 'mcp/mine', AUTHOR)).body, {
      item: 'mcp/mine',
      canEdit: true,
      role: 'author',
      description: LISTING.description,
      summary: 'Its own summary',
      headshot: LISTING.headshot,
      icon: LISTING.icon,
    });
    assert.equal((await readAuthorListing(store, 'mcp/mine', ADMIN)).body.role, 'admin');
    // an item made outside MediaMake has no authors: only an admin
    assert.equal((await readAuthorListing(store, 'mcp/theirs', ADMIN)).body.canEdit, true);
    assert.equal((await readAuthorListing(store, 'mcp/theirs', AUTHOR)).body.canEdit, false);
  });

  it('tells everyone else no, and nothing more', async () => {
    const { store } = fakeStore();
    for (const who of [MEMBER, null]) assert.deepEqual(await readAuthorListing(store, 'mcp/mine', who), { status: 200, body: { item: 'mcp/mine', canEdit: false } });
    assert.deepEqual((await readAuthorListing(store, 'mcp/none', ADMIN)).body, { item: 'mcp/none', canEdit: false });
    assert.equal((await readAuthorListing(store, 'tutorial/intro', ADMIN)).status, 400);
  });
});

describe('changeAuthorListing', () => {
  it("gives an item's author a link to upload one picture, under the item", async () => {
    const { store, uploads } = fakeStore();
    const answer = await changeAuthorListing(store, AUTHOR, { type: 'create_upload', itemId: 'mcp/mine', filename: 'headshot.jpg', contentType: 'image/jpeg' });
    assert.equal(answer.status, 200);
    assert.deepEqual(answer.body, { uploadUrl: 'https://store.test/put?sig=1', publicUrl: 'https://cdn.test/mediamake/author-1/catalog-thumbnails/mcp/mine/1-headshot.jpg' });
    // the link it gives is one the author may then set
    assert.equal((await changeAuthorListing(store, AUTHOR, { type: 'set', itemId: 'mcp/mine', headshot: answer.body.publicUrl })).status, 200);
    assert.deepEqual(uploads, [{ clientId: AUTHOR, itemId: 'mcp/mine', filename: 'headshot.jpg', contentType: 'image/jpeg' }]);
  });

  it('takes pictures only: nothing that can run, and no other file', async () => {
    const { store, uploads } = fakeStore();
    for (const contentType of ['image/svg+xml', 'text/html', 'video/mp4', '', undefined]) {
      assert.equal((await changeAuthorListing(store, AUTHOR, { type: 'create_upload', itemId: 'mcp/mine', filename: 'x', contentType })).status, 400);
    }
    assert.equal(uploads.length, 0);
  });

  it("sets the headshot and keeps everything else on the listing, an admin's choices too", async () => {
    const { store, saves } = fakeStore();
    const answer = await changeAuthorListing(store, AUTHOR, {
      type: 'set',
      itemId: 'mcp/mine',
      headshot: uploaded('mcp/mine', '2-new.jpg'),
      // none of these is an author's: they are not read
      readme: '# Hijacked',
      tags: ['spam'],
      media: [],
      editorsPick: false,
      advice: 'recommended',
    });
    assert.deepEqual(answer, { status: 200, body: { item: 'mcp/mine', description: LISTING.description, headshot: uploaded('mcp/mine', '2-new.jpg'), icon: LISTING.icon }, changed: 'mcp/mine' });
    assert.deepEqual(saves, [{ itemId: 'mcp/mine', listing: { ...LISTING, headshot: uploaded('mcp/mine', '2-new.jpg') }, clientId: AUTHOR }]);
  });

  it('clears a picture with an empty link, and starts a listing for an item with none', async () => {
    const { store, saves } = fakeStore();
    await changeAuthorListing(store, ADMIN, { type: 'set', itemId: 'mcp/mine', icon: '' });
    assert.equal(saves[0].listing.icon, undefined);
    assert.equal(saves[0].listing.headshot, LISTING.headshot);
    const first = await changeAuthorListing(store, AUTHOR, { type: 'set', itemId: 'skill/mine', headshot: uploaded('skill/mine', '3-skill.jpg') });
    assert.deepEqual(first.body, { item: 'skill/mine', description: undefined, headshot: uploaded('skill/mine', '3-skill.jpg'), icon: undefined });
    assert.deepEqual([saves[1].listing.tags, saves[1].listing.media], [[], []]);
  });

  it("lets an author change the description, in their own words, and clear it", async () => {
    const { store, saves } = fakeStore();
    const answer = await changeAuthorListing(store, AUTHOR, { type: 'set', itemId: 'mcp/mine', description: '  A mixing desk Claude drives.  ' });
    assert.deepEqual(answer.body, { item: 'mcp/mine', description: 'A mixing desk Claude drives.', headshot: LISTING.headshot, icon: LISTING.icon });
    assert.deepEqual(saves[0].listing, { ...LISTING, description: 'A mixing desk Claude drives.' });
    await changeAuthorListing(store, AUTHOR, { type: 'set', itemId: 'mcp/mine', description: '' });
    assert.equal(saves[1].listing.description, undefined);
    assert.equal((await changeAuthorListing(store, AUTHOR, { type: 'set', itemId: 'mcp/mine', description: 'x'.repeat(301) })).status, 400);
    assert.equal((await changeAuthorListing(store, MEMBER, { type: 'set', itemId: 'mcp/mine', description: 'Not mine to say' })).status, 403);
    assert.equal(saves.length, 2);
  });

  it("takes from an author only a picture uploaded for the item; an admin's can be any link", async () => {
    const { store, saves } = fakeStore();
    for (const headshot of [
      'https://elsewhere.test/track.gif',
      // another item's picture, a folder above, a link that only starts like the storage's
      uploaded('mcp/other', '1-h.jpg'),
      `${BASE}${AUTHOR}/1-h.jpg`,
      `${BASE}${AUTHOR}/catalog-thumbnails/mcp/mine/../../x.jpg`,
      `${uploaded('mcp/mine', '1-h.jpg')}?next=https://elsewhere.test`,
      'https://cdn.test/mediamake.evil.test/a/catalog-thumbnails/mcp/mine/1-h.jpg',
    ]) {
      const refused = await changeAuthorListing(store, AUTHOR, { type: 'set', itemId: 'mcp/mine', headshot });
      assert.equal(refused.status, 400, headshot);
      assert.match(String(refused.body.error), /must be a picture uploaded for mcp\/mine/);
    }
    assert.equal(saves.length, 0);
    // a picture another author or an admin uploaded for the same item is the item's too
    assert.equal((await changeAuthorListing(store, AUTHOR, { type: 'set', itemId: 'mcp/mine', icon: uploaded('mcp/mine', '4-icon.png', ADMIN) })).status, 200);
    // clearing needs no upload
    assert.equal((await changeAuthorListing(store, AUTHOR, { type: 'set', itemId: 'mcp/mine', headshot: '' })).status, 200);
    assert.equal((await changeAuthorListing(store, ADMIN, { type: 'set', itemId: 'mcp/mine', headshot: 'https://elsewhere.test/h.jpg' })).status, 200);
  });

  it('stops everyone who is not an author of the item or an admin, before anything is read or written', async () => {
    const { store, saves, uploads } = fakeStore();
    for (const body of [
      { type: 'set', itemId: 'mcp/mine', headshot: 'https://cdn.test/x.jpg' },
      { type: 'create_upload', itemId: 'mcp/mine', filename: 'x.png', contentType: 'image/png' },
    ]) {
      const refused = await changeAuthorListing(store, MEMBER, body);
      assert.equal(refused.status, 403);
      assert.match(String(refused.body.error), /Only the authors of mcp\/mine and admins/);
      assert.equal((await changeAuthorListing(store, null, body)).status, 401);
    }
    // an author of other items is nobody to one made outside MediaMake; an admin sets its pictures
    const outside = await changeAuthorListing(store, AUTHOR, { type: 'set', itemId: 'mcp/theirs', headshot: 'https://cdn.test/x.jpg' });
    assert.equal(outside.status, 403);
    assert.match(String(outside.body.error), /made by Storytold, outside MediaMake: an admin sets its description and pictures/);
    assert.deepEqual([saves.length, uploads.length], [0, 0]);
    assert.equal((await changeAuthorListing(store, ADMIN, { type: 'set', itemId: 'mcp/theirs', headshot: 'https://cdn.test/x.jpg' })).status, 200);
  });

  it('stops on a request it cannot read', async () => {
    const { store, saves } = fakeStore();
    const status = async (body: unknown) => (await changeAuthorListing(store, ADMIN, body)).status;
    assert.equal(await status(null), 400);
    assert.equal(await status({ type: 'set_listing', itemId: 'mcp/mine', headshot: 'https://cdn.test/x.jpg' }), 400);
    assert.equal(await status({ type: 'set', itemId: 'tutorial/intro', headshot: 'https://cdn.test/x.jpg' }), 400);
    assert.equal(await status({ type: 'set', itemId: 'mcp/none', headshot: 'https://cdn.test/x.jpg' }), 404);
    assert.equal(await status({ type: 'set', itemId: 'mcp/mine' }), 400);
    assert.equal(await status({ type: 'set', itemId: 'mcp/mine', headshot: 'javascript:alert(1)' }), 400);
    assert.equal(await status({ type: 'set', itemId: 'mcp/mine', headshot: 'http://cdn.test/x.jpg' }), 400);
    assert.equal(await status({ type: 'set', itemId: 'skill/mine', icon: 'https://cdn.test/i.png' }), 400);
    assert.equal(saves.length, 0);
  });
});

describe('isUploadedFor', () => {
  it('knows a picture uploaded for the item, whoever uploaded it', () => {
    assert.equal(isUploadedFor('mcp/mine', uploaded('mcp/mine', '1795-headshot_v1.jpg'), BASE), true);
    assert.equal(isUploadedFor('mcp/mine', uploaded('mcp/mine', '1-h.jpg', 'Some.Client-9'), BASE), true);
    assert.equal(isUploadedFor('mcp/mine', uploaded('mcp/mine-too', '1-h.jpg'), BASE), false);
    assert.equal(isUploadedFor('mcp/mine', uploaded('mcp/mine', ''), BASE), false);
    assert.equal(isUploadedFor('mcp/mine', uploaded('mcp/mine', '1-h.jpg'), ''), false);
  });
});
