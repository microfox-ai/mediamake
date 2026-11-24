import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { exploreHref, itemPagePath, oldAccessPath } from './paths';

describe('itemPagePath', () => {
  it('gives every kind its own page, never /access', () => {
    assert.equal(itemPagePath('skill/pack-brand-kit'), '/skills/pack-brand-kit');
    assert.equal(itemPagePath('mcp/browse-hack'), '/mcps/browse-hack');
    assert.equal(itemPagePath('app/video-revision'), '/apps/video-revision');
    assert.equal(itemPagePath('tutorial/brand-kit-in-one-prompt'), '/tutorials/brand-kit-in-one-prompt');
    assert.equal(itemPagePath('course/cwc'), '/courses/cwc');
  });
});

describe('oldAccessPath', () => {
  it('sends an old /access?item= link to the item page', () => {
    assert.equal(oldAccessPath('skill/pack-brand-kit'), '/skills/pack-brand-kit');
    assert.equal(oldAccessPath('mcp/projectsync'), '/mcps/projectsync');
    assert.equal(oldAccessPath('tutorial/x'), '/tutorials/x');
  });
  it('sends /access alone to Subscription', () => {
    assert.equal(oldAccessPath(null), '/app/subscription');
    assert.equal(oldAccessPath(''), '/app/subscription');
  });
  it('sends an id that names no item to the homepage', () => {
    for (const bad of ['skill/', 'skill', 'thing/x', 'skill/../admin', 'skill//evil.com', 'mcp/a/b']) assert.equal(oldAccessPath(bad), '/', bad);
  });
});

describe('exploreHref', () => {
  it('opens one kind of the store in the app, from its name or an old tab of the homepage', () => {
    assert.equal(exploreHref('skill'), '/app/explore?kind=skill');
    assert.equal(exploreHref('skills'), '/app/explore?kind=skill');
    assert.equal(exploreHref('mcps', 'voice'), '/app/explore?kind=mcp&q=voice');
    assert.equal(exploreHref('apps'), '/app/explore?kind=app');
  });
  it('opens the whole list for anything else', () => {
    assert.equal(exploreHref('tutorials'), '/app/explore');
    assert.equal(exploreHref(null, '  '), '/app/explore');
    assert.equal(exploreHref('javascript:alert(1)'), '/app/explore');
  });
});
