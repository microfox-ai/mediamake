import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { inviteMail, membershipChangedMail, welcomeMail } from './templates';

const url = 'https://mediamake.microfox.app/app/subscription';

describe('membership mails', () => {
  it('welcomes a new account with the rule and where to go', () => {
    const mail = welcomeMail('ana@example.com', { name: 'Ana', appUrl: 'https://mediamake.microfox.app/app' });
    assert.equal(mail.subject, 'Welcome to MediaMake');
    assert.match(mail.text, /^Welcome, Ana/);
    assert.match(mail.text, /We publish nothing we don't use/);
    assert.match(mail.text, /Open MediaMake: https:\/\/mediamake\.microfox\.app\/app/);
  });

  it('says the new tier, how long it lasts and why', () => {
    const mail = membershipChangedMail('ana@example.com', { from: 'Public', to: 'Pro', lasts: 'until 15 Feb 2027', reason: 'Merged the remaster skill', url });
    assert.equal(mail.subject, 'You are now a Pro member of MediaMake');
    assert.match(mail.text, /You are a Pro member now, until 15 Feb 2027\./);
    assert.match(mail.text, /The reason given: Merged the remaster skill/);
  });

  it('names the tier a person had before a move between memberships', () => {
    const mail = membershipChangedMail('ana@example.com', { from: 'Pro', to: 'Plus', lasts: 'with no end date', url });
    assert.match(mail.text, /You are a Plus member now \(you were Pro\), with no end date\./);
  });

  it('says a membership ended when the move is to Public', () => {
    const mail = membershipChangedMail('ana@example.com', { from: 'Plus', to: 'Public', reason: 'The three months ran out', url });
    assert.equal(mail.subject, 'Your Plus membership has ended');
    assert.match(mail.text, /You are a Public member now/);
    assert.doesNotMatch(mail.text, /undefined/);
  });

  it('says a membership was made permanent', () => {
    const mail = membershipChangedMail('ana@example.com', { from: 'Pro', to: 'Pro', lasts: 'with no end date', url });
    assert.match(mail.text, /Your Pro membership now lasts with no end date\./);
  });

  it('invites with a link that works once, and escapes what an admin typed', () => {
    const mail = inviteMail('new@example.com', { tier: 'Plus', url: 'https://mediamake.microfox.app/access?code=abc', note: 'Loved your <AMV>', days: 30 });
    assert.equal(mail.subject, 'Your invite to MediaMake (Plus)');
    assert.match(mail.text, /Accept the invite: https:\/\/mediamake\.microfox\.app\/access\?code=abc/);
    assert.match(mail.text, /works once, for 30 days/);
    assert.match(mail.html, /Loved your &lt;AMV&gt;/);
  });
});
