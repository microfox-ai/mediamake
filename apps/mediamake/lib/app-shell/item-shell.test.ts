import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { signedOutLinks } from './item-shell';

describe('signedOutLinks', () => {
  it('comes back to the item page after signing in or up', () => {
    assert.deepEqual(signedOutLinks('/skills/pack-brand-kit'), {
      signIn: '/login?redirectTo=%2Fskills%2Fpack-brand-kit',
      signUp: '/signup?redirectTo=%2Fskills%2Fpack-brand-kit',
    });
  });

  it('never carries another site along', () => {
    assert.deepEqual(signedOutLinks('//evil.test'), { signIn: '/login', signUp: '/signup' });
  });
});
