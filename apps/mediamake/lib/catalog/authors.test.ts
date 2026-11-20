import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MAX_AUTHORS, authorName, authorNamed, shownAuthor, withAuthor, withoutAuthor, type ItemAuthor } from './authors';

const author = (clientId: string, name = clientId): ItemAuthor => ({ clientId, name, addedAt: '2026-11-20T10:00:00.000Z', addedBy: 'store' });

describe('an item’s authors', () => {
  it('names an author by their GitHub login, else their display name, never an email', () => {
    assert.equal(authorName({ githubLogin: 'ana-dev', name: 'Ana' }), 'ana-dev');
    assert.equal(authorName({ name: 'Ana' }), 'Ana');
    assert.equal(authorName({ name: 'ana@example.com' }), 'A MediaMake member');
    assert.equal(authorName(null, 'Ana'), 'Ana');
    assert.equal(authorName(null, 'ana@example.com'), 'A MediaMake member');
  });

  it('shows the account as it is now, keeping the stored name when the account is gone', () => {
    assert.deepEqual(shownAuthor(author('ana', 'Ana'), { githubLogin: 'ana-dev' }), { name: 'ana-dev', github: 'ana-dev' });
    assert.deepEqual(shownAuthor(author('ana', 'Ana'), null), { name: 'Ana' });
  });

  it('adds an author once, up to the limit', () => {
    const added = withAuthor([author('ana')], author('ravi'));
    assert.ok(added.ok);
    assert.deepEqual(added.authors.map(a => a.clientId), ['ana', 'ravi']);
    assert.deepEqual(withAuthor([author('ana', 'Ana')], author('ana', 'Ana')), { ok: false, why: 'Ana is already an author' });
    const full = Array.from({ length: MAX_AUTHORS }, (_, i) => author(`m${i}`));
    assert.equal(withAuthor(full, author('one-more')).ok, false);
  });

  it('removes an author, but an item always keeps one', () => {
    const removed = withoutAuthor([author('ana'), author('ravi')], 'ana');
    assert.ok(removed.ok);
    assert.deepEqual(removed.authors.map(a => a.clientId), ['ravi']);
    assert.deepEqual(withoutAuthor([author('ana')], 'ana'), { ok: false, why: 'An item always keeps one author: add another first' });
    assert.equal(withoutAuthor([author('ana')], 'ravi').ok, false);
  });

  it('finds an author by the name the list shows, only when it is one', () => {
    const authors = [author('ana'), author('ravi'), author('ravi2')];
    const shown = [{ name: 'ana-dev', github: 'ana-dev' }, { name: 'Ravi' }, { name: 'Ravi' }];
    assert.equal(authorNamed(authors, shown, '@Ana-Dev')?.clientId, 'ana');
    assert.equal(authorNamed(authors, shown, 'ravi'), null);
    assert.equal(authorNamed(authors, shown, 'nobody'), null);
  });
});
