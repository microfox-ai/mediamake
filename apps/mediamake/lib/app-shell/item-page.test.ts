import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { backPath, itemCrumbs, itemPageHref } from './item-page';

const item = {
  title: 'pack-distrokid',
  belongs: [{ label: 'Your personal space', href: '/app/spaces/abc123' }],
};

describe("an item's page", () => {
  it('is one address for any item, with the page it was opened from', () => {
    assert.equal(itemPageHref('space:user:me:skill/pack-distrokid', '/app/mine?tab=yours'), '/app/item?key=space%3Auser%3Ame%3Askill%2Fpack-distrokid&from=%2Fapp%2Fmine%3Ftab%3Dyours');
    assert.equal(itemPageHref('catalog:skill/pack-youtube'), '/app/item?key=catalog%3Askill%2Fpack-youtube');
  });

  it('goes back only to a page of this site', () => {
    assert.equal(backPath('/app/mine?tab=yours'), '/app/mine?tab=yours');
    assert.equal(backPath('//evil.example/x'), undefined);
    assert.equal(backPath('https://evil.example'), undefined);
    assert.equal(backPath('/\\evil.example'), undefined);
    assert.equal(backPath(undefined), undefined);
  });

  it('says where it was opened: Home, Explore, My Items, a space, a store page', () => {
    assert.deepEqual(itemCrumbs('/app/mine?tab=yours', item), [{ label: 'My Items', href: '/app/mine?tab=yours' }, { label: 'pack-distrokid' }]);
    assert.deepEqual(itemCrumbs('/app', item), [{ label: 'Home', href: '/app' }, { label: 'pack-distrokid' }]);
    assert.deepEqual(itemCrumbs('/app/explore', item), [{ label: 'Explore', href: '/app/explore' }, { label: 'pack-distrokid' }]);
    assert.deepEqual(itemCrumbs('/app/spaces/abc123?tab=skills', item), [
      { label: 'Spaces', href: '/app/spaces' },
      { label: 'Your personal space', href: '/app/spaces/abc123?tab=skills' },
      { label: 'pack-distrokid' },
    ]);
    assert.deepEqual(itemCrumbs('/skills/pack-youtube', item), [
      { label: 'Explore', href: '/app/explore' },
      { label: 'pack-youtube', href: '/skills/pack-youtube' },
      { label: 'pack-distrokid' },
    ]);
    assert.deepEqual(itemCrumbs('/app/subscription', item), [{ label: 'Back', href: '/app/subscription' }, { label: 'pack-distrokid' }]);
  });

  it('opened from a shared link, it starts at its space, else My Items', () => {
    assert.deepEqual(itemCrumbs(undefined, item), [{ label: 'Spaces', href: '/app/spaces' }, { label: 'Your personal space', href: '/app/spaces/abc123' }, { label: 'pack-distrokid' }]);
    assert.deepEqual(itemCrumbs('https://evil.example', { title: 'x', belongs: [{ label: 'You' }] }), [{ label: 'My Items', href: '/app/mine' }, { label: 'x' }]);
  });
});
