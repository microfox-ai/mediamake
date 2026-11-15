import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { daysParam, parseAppOpen, parseLocalSkills, parseRuns, summarizeRuns } from './usage';
import { parseFeedback } from '../feedback/feedback';

const NOW = Date.parse('2026-11-15T12:00:00.000Z');

describe('skill run reports', () => {
  it('keeps a name and a time, and drops everything else a report carries', () => {
    const parsed = parseRuns(
      { runs: [{ skill: 'make-lyrics-video', at: '2026-11-15T10:00:00+05:30', args: 'projects/secret', cwd: '/Users/me', session: 's1', skillHash: 'abc' }] },
      NOW,
    );
    assert.deepEqual(parsed, { runs: [{ skill: 'make-lyrics-video', at: '2026-11-15T04:30:00.000Z' }], dropped: 0 });
  });

  it('takes one run without the list, a plugin skill, and a leading slash', () => {
    assert.deepEqual(parseRuns({ skill: '/anthropic-skills:pdf', at: '2026-11-15T11:00:00Z' }, NOW), {
      runs: [{ skill: 'anthropic-skills:pdf', at: '2026-11-15T11:00:00.000Z' }],
      dropped: 0,
    });
    // no time: now
    assert.deepEqual(parseRuns({ runs: [{ skill: 'x' }] }, NOW), { runs: [{ skill: 'x', at: '2026-11-15T12:00:00.000Z' }], dropped: 0 });
  });

  it('drops names that are not skill names, and times that make no sense', () => {
    const parsed = parseRuns(
      {
        runs: [
          { skill: '/Users/me/skills/x', at: '2026-11-15T10:00:00Z' },
          { skill: 'has spaces', at: '2026-11-15T10:00:00Z' },
          { skill: 'future', at: '2027-01-01T00:00:00Z' },
          { skill: 'ancient', at: '2020-01-01T00:00:00Z' },
          { skill: 'nonsense', at: 'yesterday' },
          { skill: 42, at: '2026-11-15T10:00:00Z' },
          null,
          { skill: 'ok', at: '2026-11-15T10:00:00Z' },
          { skill: 'ok', at: '2026-11-15T10:00:00Z' },
        ],
      },
      NOW,
    );
    assert.deepEqual(parsed, { runs: [{ skill: 'ok', at: '2026-11-15T10:00:00.000Z' }], dropped: 7 });
  });

  it('refuses a body that is not a report, or too long a one', () => {
    assert.ok('error' in parseRuns(null, NOW));
    assert.ok('error' in parseRuns({ runs: 'x' }, NOW));
    assert.ok('error' in parseRuns({ runs: Array.from({ length: 201 }, () => ({ skill: 'x' })) }, NOW));
  });

  it('adds runs up per skill, most used first', () => {
    assert.deepEqual(
      summarizeRuns([
        { skill: 'a', at: '2026-11-01T00:00:00.000Z' },
        { skill: 'b', at: '2026-11-03T00:00:00.000Z' },
        { skill: 'a', at: '2026-11-02T00:00:00.000Z' },
        { skill: 'c', at: '2026-11-04T00:00:00.000Z' },
      ]),
      [
        { skill: 'a', runs: 2, lastAt: '2026-11-02T00:00:00.000Z' },
        { skill: 'c', runs: 1, lastAt: '2026-11-04T00:00:00.000Z' },
        { skill: 'b', runs: 1, lastAt: '2026-11-03T00:00:00.000Z' },
      ],
    );
  });

  it('reads days from a query', () => {
    assert.deepEqual([daysParam(null), daysParam('7'), daysParam('0'), daysParam('9999'), daysParam('x')], [90, 7, 90, 400, 90]);
  });
});

describe('local skill reports', () => {
  it('keeps names and versions only, sorted, the last of a name winning', () => {
    const parsed = parseLocalSkills({
      device: 'MacBook Pro (M3)',
      skills: [
        { name: 'pack-brand-kit', version: '1.2.0', path: '/Users/me/.claude/skills/pack-brand-kit', description: 'x' },
        { name: 'my-own' },
        { name: 'a-skill', version: 'sha:0123abcd' },
        { name: 'a-skill', version: '2.0.0' },
        { name: 'odd-version', version: '/Users/me/v1' },
        { name: '../escape', version: '1' },
      ],
    });
    assert.deepEqual(parsed, {
      device: 'MacBook Pro (M3)',
      skills: [{ name: 'a-skill', version: '2.0.0' }, { name: 'my-own' }, { name: 'odd-version' }, { name: 'pack-brand-kit', version: '1.2.0' }],
    });
  });

  it('names the device when the report does not, and refuses what is not a list', () => {
    assert.deepEqual(parseLocalSkills({ skills: [] }), { device: 'computer', skills: [] });
    assert.deepEqual((parseLocalSkills({ device: '<script>/etc', skills: [] }) as { device: string }).device, 'scriptetc');
    assert.ok('error' in parseLocalSkills({ skills: 'all' }));
    assert.ok('error' in parseLocalSkills(null));
  });
});

describe('feedback', () => {
  it('takes words, with the item and version they are about', () => {
    assert.deepEqual(parseFeedback({ text: '  The render step crashes  ', itemId: 'skill/make-lyrics-video', version: '2.0.0', source: 'mm-use', clientId: 'someone-else' }), {
      text: 'The render step crashes',
      itemId: 'skill/make-lyrics-video',
      version: '2.0.0',
      source: 'mm-use',
    });
    assert.deepEqual(parseFeedback({ text: 'Love it' }), { text: 'Love it', source: 'api' });
  });

  it('refuses no words, too many, and an id that is not a catalog id', () => {
    assert.ok('error' in parseFeedback({ text: ' ' }));
    assert.ok('error' in parseFeedback({ text: 'x'.repeat(4001) }));
    assert.ok('error' in parseFeedback({ text: 'fine', itemId: 'pack-brand-kit' }));
    assert.ok('error' in parseFeedback(null));
  });
});

describe('apps opened from the app', () => {
  it('keeps the app id and the server time, and nothing else', () => {
    assert.deepEqual(parseAppOpen({ app: 'app/skill-library', at: '2020-01-01T00:00:00Z', page: '/library?folder=/Users/me' }, NOW), { app: 'app/skill-library', at: '2026-11-15T12:00:00.000Z' });
  });

  it('refuses anything that is not an app id', () => {
    for (const app of ['skill/make-lyrics-video', '/library', 'app/../x', 'https://example.com', '', undefined]) assert.ok('error' in parseAppOpen({ app }, NOW));
  });
});
