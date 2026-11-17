import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { feedbackAnsweredMail, feedbackShippedMail } from '../mail/templates';
import { dispatchProblem, dispatchRequest, fixBranch, fixRepoOf, parseHookEvent, parsePrRef } from './auto-pr';
import { costOf, fits, monthOf } from './budget';
import { earnsAutoPr, groupFeedback, isOpen, ownView, type Feedback, type Triage } from './feedback';
import { parseKnownIssue, shownIssues, type KnownIssue } from './known-issues';
import { checkTriage, TRIAGE_SYSTEM, triagePrompt } from './triage';

const triage = (over: Partial<Triage> = {}): Triage => ({ kind: 'bug', severity: 'medium', summary: 'The render step stops at 99%', model: 'claude-opus-5-5', at: '2026-11-16T10:00:00.000Z', costUSD: 0.01, ...over });

const fb = (id: string, over: Partial<Feedback> = {}): Feedback => ({
  feedbackId: id,
  clientId: 'ana',
  tier: 'plus',
  text: 'The render stops at 99% every time',
  itemId: 'skill/make-lyrics-video',
  source: 'web',
  status: 'new',
  createdAt: '2026-11-16T09:00:00.000Z',
  ...over,
});

describe('which feedback gets a pull request on its own', () => {
  it('is a bug or a major problem, about an item, from Plus or above', () => {
    assert.equal(earnsAutoPr(fb('fb_1', { triage: triage() })), true);
    assert.equal(earnsAutoPr(fb('fb_1', { tier: 'pro', triage: triage({ kind: 'major' }) })), true);
    assert.equal(earnsAutoPr(fb('fb_1', { tier: 'cohort', triage: triage() })), true);
  });

  it('is never one from a Public member: that waits for an admin', () => {
    assert.equal(earnsAutoPr(fb('fb_1', { tier: 'public', triage: triage({ kind: 'major', severity: 'high' }) })), false);
  });

  it('is never an improvement, a question, praise, a repeat, or feedback that is unread, closed or already has one', () => {
    for (const kind of ['improvement', 'question', 'praise'] as const) assert.equal(earnsAutoPr(fb('fb_1', { triage: triage({ kind }) })), false, kind);
    assert.equal(earnsAutoPr(fb('fb_2', { triage: triage({ duplicateOf: 'fb_1' }) })), false);
    assert.equal(earnsAutoPr(fb('fb_1')), false);
    assert.equal(earnsAutoPr(fb('fb_1', { triage: triage(), status: 'dismissed' })), false);
    assert.equal(earnsAutoPr(fb('fb_1', { triage: triage(), itemId: undefined })), false);
    assert.equal(earnsAutoPr(fb('fb_1', { triage: triage(), pr: { repo: 'a/b', state: 'failed', by: 'auto', at: 'x' } })), false);
  });
});

describe('the admin page groups', () => {
  const list = [
    fb('fb_1', { triage: triage(), createdAt: '2026-11-10T00:00:00.000Z' }),
    fb('fb_2', { clientId: 'ben', triage: triage({ duplicateOf: 'fb_1' }), createdAt: '2026-11-12T00:00:00.000Z' }),
    fb('fb_3', { triage: triage({ kind: 'praise', severity: 'low' }), status: 'dismissed', createdAt: '2026-11-13T00:00:00.000Z' }),
    fb('fb_4', { itemId: 'mcp/browse-hack', createdAt: '2026-11-14T00:00:00.000Z' }),
    fb('fb_5', { itemId: undefined, triage: triage({ kind: 'question', duplicateOf: 'fb_gone' }), createdAt: '2026-11-15T00:00:00.000Z' }),
  ];
  const groups = groupFeedback(list);

  it('puts the item with the most open feedback first, and feedback with no item under general', () => {
    assert.deepEqual(groups.map(group => [group.key, group.open, group.total]), [
      ['skill/make-lyrics-video', 2, 3],
      ['general', 1, 1],
      ['mcp/browse-hack', 1, 1],
    ]);
  });

  it('folds a repeat under the one it repeats, newest first, and counts open ones by kind', () => {
    const [skill, general, mcp] = groups;
    assert.deepEqual(skill.threads.map(thread => [thread.feedback.feedbackId, thread.duplicates.map(d => d.feedbackId)]), [
      ['fb_3', []],
      ['fb_1', ['fb_2']],
    ]);
    assert.deepEqual(skill.byKind, { bug: 2 });
    assert.deepEqual(mcp.byKind, { unread: 1 });
    // its original is not on the list: it stands on its own
    assert.equal(general.threads[0].feedback.feedbackId, 'fb_5');
  });
});

describe('what a writer reads back', () => {
  it('has the answer and the outcome, and nothing about admins, cost or a failed run', () => {
    const own = ownView(
      fb('fb_1', {
        status: 'shipped',
        version: '2.0.0',
        triage: triage(),
        answer: { text: 'Fixed in the next release', by: 'admin-1', at: '2026-11-16T11:00:00.000Z' },
        pr: { repo: 'a/b', state: 'failed', by: 'admin-1', at: 'x', note: 'no cause found' },
        shipped: { at: '2026-11-17T00:00:00.000Z', version: '2.0.1', mailed: true },
      }),
    );
    assert.deepEqual(own, {
      feedbackId: 'fb_1',
      itemId: 'skill/make-lyrics-video',
      version: '2.0.0',
      text: 'The render stops at 99% every time',
      status: 'shipped',
      createdAt: '2026-11-16T09:00:00.000Z',
      kind: 'bug',
      answer: { text: 'Fixed in the next release', at: '2026-11-16T11:00:00.000Z' },
      shipped: { at: '2026-11-17T00:00:00.000Z', version: '2.0.1' },
    });
    assert.equal(isOpen(fb('x', { status: 'answered' })), true);
    assert.equal(isOpen(fb('x', { status: 'shipped' })), false);
  });
});

describe('the monthly ceiling', () => {
  it('prices a call by its model, with cache writes dearer and cache reads cheaper', () => {
    assert.equal(costOf('claude-opus-5-5', { input_tokens: 1_000_000, output_tokens: 0 }), 4);
    assert.equal(costOf('claude-opus-5-5', { input_tokens: 0, output_tokens: 1_000_000 }), 20);
    assert.equal(costOf('claude-opus-5-5', { cache_creation_input_tokens: 1_000_000, cache_read_input_tokens: 1_000_000 }), 5.4);
    assert.ok(Math.abs(costOf('claude-opus-5-5', { input_tokens: 1500, output_tokens: 600 }) - 0.018) < 1e-9);
  });

  it('prices a model it does not know as the dearest', () => {
    assert.equal(costOf('some-new-model', { input_tokens: 1_000_000, output_tokens: 1_000_000 }), 60);
  });

  it('counts what running fixes hold, and stops at the ceiling', () => {
    assert.equal(fits({ ceilingUSD: 50, spentUSD: 40, heldUSD: 5 }, 5), true);
    assert.equal(fits({ ceilingUSD: 50, spentUSD: 40, heldUSD: 10 }, 5), false);
    assert.equal(fits({ ceilingUSD: 0, spentUSD: 0, heldUSD: 0 }, 0.1), false);
    assert.equal(monthOf(new Date('2026-12-01T00:30:00+05:30')), '2026-11');
  });
});

describe('triage', () => {
  it('keeps what changes out of the system prompt, and gives the feedback as material', () => {
    assert.doesNotMatch(TRIAGE_SYSTEM, /skill\/|2026/);
    const prompt = triagePrompt(fb('fb_9', { version: '2.0.0' }), { title: 'Make lyrics video', summary: 'Lyric videos in Remotion' }, [fb('fb_1', { triage: triage() }), fb('fb_2', { text: 'Fonts look wrong' })]);
    assert.match(prompt, /Item: skill\/make-lyrics-video \("Make lyrics video"\), version 2\.0\.0/);
    assert.match(prompt, /<open id="fb_1">The render step stops at 99%<\/open>\n<open id="fb_2">Fonts look wrong<\/open>/);
    assert.match(prompt, /<feedback>\nThe render stops at 99% every time\n<\/feedback>$/);
    assert.match(triagePrompt(fb('fb_9', { itemId: undefined }), null, []), /MediaMake as a whole[\s\S]*\(none\)/);
  });

  it('takes a repeat only of something that was on the list, never of itself', () => {
    const output = { kind: 'bug' as const, severity: 'high' as const, summary: '  Render   stops at 99%  ', duplicate_of: 'fb_1' };
    assert.deepEqual(checkTriage(output, ['fb_1', 'fb_2'], 'fb_9'), { kind: 'bug', severity: 'high', summary: 'Render stops at 99%', duplicateOf: 'fb_1' });
    assert.equal(checkTriage({ ...output, duplicate_of: 'fb_made_up' }, ['fb_1']).duplicateOf, undefined);
    assert.equal(checkTriage({ ...output, duplicate_of: 'fb_9' }, ['fb_9'], 'fb_9').duplicateOf, undefined);
    assert.equal(checkTriage({ ...output, summary: 'x'.repeat(500) }, []).summary.length, 200);
  });
});

describe('automatic pull requests', () => {
  it('sends a fix to the item\'s repository, and none for an item someone else makes', () => {
    assert.deepEqual(fixRepoOf(null), { repo: 'microfox-ai/mediamake' });
    assert.deepEqual(fixRepoOf({ title: 'Browse Hack', install: { source: { type: 'mcp-server', mcpb: { repo: 'microfox-ai/extensions', asset: 'browse-hack.mcpb' } } } } as never), { repo: 'microfox-ai/extensions' });
    const theirs = fixRepoOf({ title: 'ElevenLabs', madeBy: { name: 'ElevenLabs' } } as never);
    assert.ok('why' in theirs && /made by ElevenLabs/.test(theirs.why));
  });

  it('starts the workflow with ids only: the words stay in MediaMake', () => {
    const { url, init } = dispatchRequest('microfox-ai/mediamake', fb('fb_abc123', { text: 'private words' }), 'ghp_token');
    assert.equal(url, 'https://api.github.com/repos/microfox-ai/mediamake/actions/workflows/feedback-fix.yml/dispatches');
    assert.deepEqual(JSON.parse(init.body as string), { ref: 'main', inputs: { feedback_id: 'fb_abc123', item: 'skill/make-lyrics-video' } });
    assert.equal((init.headers as Record<string, string>).authorization, 'Bearer ghp_token');
    assert.equal(fixBranch('fb_abc-12_3'), 'feedback/fb_abc-12_3');
    assert.match(dispatchProblem(404, 'a/b'), /no feedback-fix\.yml workflow/);
    assert.match(dispatchProblem(403, 'a/b'), /FEEDBACK_GITHUB_TOKEN/);
  });

  it('reads a pull request an admin names', () => {
    assert.deepEqual(parsePrRef('https://github.com/microfox-ai/extensions/pull/42#issuecomment-1'), { repo: 'microfox-ai/extensions', number: 42, url: 'https://github.com/microfox-ai/extensions/pull/42' });
    assert.deepEqual(parsePrRef('microfox-ai/mediamake#601'), { repo: 'microfox-ai/mediamake', number: 601, url: 'https://github.com/microfox-ai/mediamake/pull/601' });
    assert.equal(parsePrRef(' #7 ')?.number, 7);
    assert.equal(parsePrRef('https://evil.example/microfox-ai/mediamake/pull/1'), null);
    assert.equal(parsePrRef('soon'), null);
  });

  it('checks what the workflow reports', () => {
    assert.deepEqual(parseHookEvent({ event: 'merged', repo: 'microfox-ai/mediamake', prNumber: 601 }), { event: 'merged', repo: 'microfox-ai/mediamake', prNumber: 601 });
    assert.deepEqual(
      parseHookEvent({ event: 'fix', feedbackId: 'fb_abc123', state: 'open', repo: 'microfox-ai/mediamake', prNumber: '601', prUrl: 'https://github.com/microfox-ai/mediamake/pull/601', costUSD: 1.2, extra: 'dropped' }),
      { event: 'fix', feedbackId: 'fb_abc123', state: 'open', repo: 'microfox-ai/mediamake', prNumber: 601, prUrl: 'https://github.com/microfox-ai/mediamake/pull/601', costUSD: 1.2 },
    );
    assert.ok('error' in parseHookEvent({ event: 'fix', feedbackId: 'fb_abc123', state: 'open', repo: 'a/b' }));
    assert.ok('error' in parseHookEvent({ event: 'fix', feedbackId: 'nope', state: 'failed', repo: 'a/b' }));
    assert.ok('error' in parseHookEvent({ event: 'merged', repo: 'not a repo', prNumber: 1 }));
    assert.ok('error' in parseHookEvent(null));
    // a link that is not GitHub's is dropped, not stored
    const event = parseHookEvent({ event: 'fix', feedbackId: 'fb_abc123', state: 'failed', repo: 'a/b', runUrl: 'https://evil.example/x' });
    assert.ok(!('error' in event) && !('runUrl' in event));
  });
});

describe('known issues', () => {
  const issue = (id: string, over: Partial<KnownIssue> = {}): KnownIssue => ({ issueId: id, itemId: 'skill/x', title: 'Render stops at 99%', status: 'open', feedbackIds: ['fb_1'], createdBy: 'admin-1', createdAt: '2026-11-10T00:00:00.000Z', ...over });
  const now = Date.parse('2026-11-16T00:00:00.000Z');

  it('shows open ones first, then those fixed in the last 30 days, without who wrote them', () => {
    const shown = shownIssues(
      [
        issue('ki_old', { status: 'fixed', fixedAt: '2026-09-01T00:00:00.000Z' }),
        issue('ki_fixed', { status: 'fixed', fixedAt: '2026-11-12T00:00:00.000Z', fixedIn: '2.0.1' }),
        issue('ki_a', { createdAt: '2026-11-01T00:00:00.000Z' }),
        issue('ki_b', { createdAt: '2026-11-14T00:00:00.000Z', note: 'Render at half size for now' }),
      ],
      now,
    );
    assert.deepEqual(shown.map(entry => entry.issueId), ['ki_b', 'ki_a', 'ki_fixed']);
    assert.deepEqual(Object.keys(shown[0]).sort(), ['createdAt', 'issueId', 'note', 'status', 'title']);
  });

  it('needs a title of sane length', () => {
    assert.deepEqual(parseKnownIssue({ title: '  Render   stops  ', note: ' Use half size ' }), { title: 'Render stops', note: 'Use half size' });
    assert.ok('error' in parseKnownIssue({ title: 'x' }));
    assert.ok('error' in parseKnownIssue({ title: 'x'.repeat(141) }));
    assert.ok('error' in parseKnownIssue({ title: 'Fine', note: 'x'.repeat(601) }));
  });
});

describe('feedback mails', () => {
  it('tells the writer their feedback shipped, with the version and how to get it', () => {
    const mail = feedbackShippedMail('ana@example.com', { item: 'Make lyrics video', said: 'The render stops\nat 99%', version: '2.0.1', url: 'https://mediamake.microfox.app/skills/make-lyrics-video' });
    assert.equal(mail.subject, 'Your feedback on Make lyrics video shipped');
    assert.match(mail.text, /"The render stops at 99%"/);
    assert.match(mail.text, /It is fixed in version 2\.0\.1\./);
    assert.match(mail.text, /say "update Make lyrics video" to Claude/);
  });

  it('carries an admin\'s answer, and cuts a long quote', () => {
    const mail = feedbackAnsweredMail('ana@example.com', { said: 'x'.repeat(500), answer: 'Try the new version.', url: 'https://mediamake.microfox.app/app' });
    assert.equal(mail.subject, 'An answer to your feedback');
    assert.match(mail.text, /Try the new version\./);
    assert.ok(mail.text.includes(`${'x'.repeat(199)}…`));
  });
});
