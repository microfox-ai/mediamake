import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ObjectId } from 'mongodb';
import { copyForClaude, formatSettings, refFromInput } from './index';
import { decodeCursor, encodeCursor, listFilter, mergeTakes, parsePatch, parsePreset, parseTake, takeUpdate, toGeneration, type GenerationDoc } from './db';

/** Run: npx tsx --test lib/generations/generations.test.ts */

const REF = '0b8f9c7e-1d2a-4c3b-9e8f-7a6b5c4d3e2f';
const HASH = 'ab'.repeat(32);
const NOW = '2026-11-02T10:00:00.000Z';

function take(raw: Record<string, unknown>) {
  const parsed = parseTake(raw);
  assert.ok(parsed.ok, parsed.ok ? '' : parsed.error);
  return parsed.value;
}

describe('parseTake', () => {
  it('keeps only the fields a take carries, defaulting the tool to suno', () => {
    const t = take({ ref: ` ${REF} `, title: '  Midnight Rain ', lyrics: '', duration: 0, credits: 10 });
    assert.equal(t.tool, 'suno');
    assert.equal(t.ref, REF);
    assert.deepEqual(t.set, { title: 'Midnight Rain', credits: 10 });
  });

  it('merges settings and workspace by key and normalises dates and hashes', () => {
    const t = take({
      ref: REF,
      settings: { weirdness: 55, vocalGender: 'female', voice: '', bad: { nested: 1 }, 'not ok': 1 },
      workspace: { id: 'ws1', name: 'Anime Music Zone' },
      sourceItem: HASH.toUpperCase(),
      createdAt: '2026-11-01T09:30:00Z',
    });
    assert.deepEqual(t.set, {
      'settings.weirdness': 55,
      'settings.vocalGender': 'female',
      'workspace.id': 'ws1',
      'workspace.name': 'Anime Music Zone',
      sourceItem: HASH,
    });
    assert.equal(t.createdAt, '2026-11-01T09:30:00.000Z');
  });

  it('rejects what would be stored wrong', () => {
    assert.equal(parseTake({}).ok, false);
    assert.equal(parseTake({ ref: REF, kind: 'mashup' }).ok, false);
    assert.equal(parseTake({ ref: REF, status: 'done' }).ok, false);
    assert.equal(parseTake({ ref: REF, audioUrl: 'javascript:alert(1)' }).ok, false);
    assert.equal(parseTake({ ref: REF, sourceItem: 'abc' }).ok, false);
    assert.equal(parseTake({ ref: REF, duration: -1 }).ok, false);
    assert.equal(parseTake({ ref: REF, tool: 'Su no' }).ok, false);
  });

  it('merges a take repeated in one batch, later fields winning', () => {
    const merged = mergeTakes([
      take({ ref: REF, title: 'A', status: 'generating' }),
      take({ ref: 'other', title: 'B' }),
      take({ ref: REF, audioUrl: 'https://cdn1.suno.ai/x.mp3', status: 'complete' }),
    ]);
    assert.equal(merged.length, 2);
    assert.deepEqual(merged[0].set, { title: 'A', audioUrl: 'https://cdn1.suno.ai/x.mp3' });
    assert.equal(merged[0].status, 'complete');
  });
});

describe('takeUpdate', () => {
  const ctx = { projectId: 'p1', clientId: 'c1', now: NOW };
  const upsert = (...args: Parameters<typeof takeUpdate>) =>
    takeUpdate(...args) as { $set: Record<string, unknown>; $setOnInsert: Record<string, unknown> };

  it('starts a new take unrated, with no notes, as a queued create', () => {
    const update = upsert(take({ ref: REF, title: 'A' }), ctx);
    assert.deepEqual(update.$set, { title: 'A', clientId: 'c1', updatedAt: NOW });
    assert.deepEqual(update.$setOnInsert, {
      projectId: 'p1',
      createdBy: 'c1',
      createdAt: NOW,
      rating: null,
      notes: [],
      usedIn: [],
      libraryItem: null,
      kind: 'create',
      status: 'queued',
    });
  });

  it('never sets rating, notes or usedIn on a save, and never moves status back', () => {
    const update = upsert(take({ ref: REF, status: 'generating', kind: 'cover' }), { ...ctx, existingStatus: 'complete' });
    for (const key of ['rating', 'notes', 'usedIn', 'libraryItem', 'status']) assert.ok(!(key in update.$set), key);
    assert.equal(update.$set.kind, 'cover');
    assert.ok(!('kind' in update.$setOnInsert));
  });

  it('marks a new take with audio and no status complete', () => {
    const update = upsert(take({ ref: REF, audioUrl: 'https://cdn1.suno.ai/x.mp3' }), ctx);
    assert.equal(update.$setOnInsert.status, 'complete');
  });
});

describe('parsePatch', () => {
  it('replaces rating, appends a note and adds usedIn', () => {
    const parsed = parsePatch({ rating: 'keeper', note: ' Great hook ', usedIn: 'gojo-honoured-one' }, 'c1', NOW);
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.value, {
      $push: { notes: { at: NOW, by: 'c1', text: 'Great hook' } },
      $addToSet: { usedIn: { $each: ['gojo-honoured-one'] } },
      $set: { rating: 'keeper', updatedAt: NOW },
    });
  });

  it('clears rating and libraryItem with null', () => {
    const parsed = parsePatch({ rating: null, libraryItem: null }, 'c1', NOW);
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.value, { $set: { rating: null, libraryItem: null, updatedAt: NOW } });
  });

  it('rejects bad values and empty bodies', () => {
    assert.equal(parsePatch({ rating: 'great' }, 'c1', NOW).ok, false);
    assert.equal(parsePatch({ usedIn: ['has space'] }, 'c1', NOW).ok, false);
    assert.equal(parsePatch({ libraryItem: 'abc' }, 'c1', NOW).ok, false);
    assert.equal(parsePatch({ note: '   ' }, 'c1', NOW).ok, false);
    assert.equal(parsePatch({}, 'c1', NOW).ok, false);
  });
});

describe('listFilter', () => {
  const filter = (query: string) => listFilter('p1', new URLSearchParams(query));

  it('filters by rating lists, unrated included', () => {
    const f = filter('rating=keeper,unrated&model=chirp-v5&kind=cover,extend&tool=Suno');
    assert.ok(f.ok);
    assert.deepEqual(f.value, {
      projectId: 'p1',
      tool: 'suno',
      rating: { $in: ['keeper', null] },
      kind: { $in: ['cover', 'extend'] },
      model: { $in: ['chirp-v5'] },
    });
  });

  it('searches words with the text index, and a song link by ref', () => {
    const words = filter('q=dark lofi');
    assert.ok(words.ok);
    assert.deepEqual(words.value.$text, { $search: 'dark lofi' });
    const link = filter(`q=${encodeURIComponent(`https://suno.com/song/${REF}?sh=1`)}`);
    assert.ok(link.ok);
    assert.deepEqual(link.value.$and, [{ $or: [{ ref: REF }, { parentRef: REF }] }]);
  });

  it('pages with a cursor it handed out, and refuses others', () => {
    const _id = new ObjectId();
    const cursor = encodeCursor({ createdAt: NOW, _id });
    assert.deepEqual(decodeCursor(cursor), { createdAt: NOW, id: _id });
    const f = filter(`cursor=${cursor}`);
    assert.ok(f.ok);
    assert.deepEqual(f.value.$and, [{ $or: [{ createdAt: { $lt: NOW } }, { createdAt: NOW, _id: { $lt: _id } }] }]);
    assert.equal(filter('cursor=nope').ok, false);
    assert.equal(filter('rating=great').ok, false);
    assert.equal(filter('kind=mashup').ok, false);
  });
});

describe('presets', () => {
  it('needs a name and keeps only valid settings', () => {
    assert.equal(parsePreset({ styles: 'lofi' }).ok, false);
    const parsed = parsePreset({ name: ' Dark lofi ', styles: 'lofi, rain', settings: { weirdness: 40, x: null } });
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.value, { id: undefined, name: 'Dark lofi', tool: 'suno', styles: 'lofi, rain', excludeStyles: '', settings: { weirdness: 40 } });
  });
});

describe('copyForClaude', () => {
  const doc: GenerationDoc = {
    _id: new ObjectId(),
    projectId: 'p1',
    clientId: 'c1',
    tool: 'suno',
    ref: REF,
    kind: 'create',
    title: 'Midnight Rain',
    styles: 'dark lofi, rain, piano',
    excludeStyles: 'drums',
    lyrics: '[Verse]\nRain on the glass',
    model: 'v5',
    settings: { voice: 'Aria', weirdness: 50, vocalGender: 'female' },
    status: 'complete',
    rating: 'keeper',
    notes: [],
    usedIn: [],
    libraryItem: null,
    createdBy: 'c1',
    createdAt: NOW,
    updatedAt: NOW,
  };

  it('lists the take, the channel, then the ask', () => {
    assert.equal(
      copyForClaude(toGeneration(doc), 'Anime Music Zone'),
      [
        'Title: Midnight Rain',
        `Link: https://suno.com/song/${REF}`,
        'Model: v5',
        'Settings: vocal gender female, weirdness 50, voice Aria',
        'Styles: dark lofi, rain, piano',
        'Exclude styles: drums',
        'Lyrics:',
        '[Verse]\nRain on the glass',
        'Channel: Anime Music Zone',
        '',
        'Ask Claude: make 3 covers of this in <style>',
      ].join('\n'),
    );
  });

  it('says instrumental instead of lyrics', () => {
    const text = copyForClaude(toGeneration({ ...doc, instrumental: true, lyrics: '' }), 'AMZ');
    assert.match(text, /Lyrics: none \(instrumental\)/);
  });
});

describe('helpers', () => {
  it('reads a song id from a link', () => {
    assert.equal(refFromInput(`https://suno.com/song/${REF}?sh=abc`), REF);
    assert.equal(refFromInput(' abc '), 'abc');
  });

  it('formats the named settings first', () => {
    assert.equal(formatSettings({ bpm: 90, styleInfluence: 70 }), 'style influence 70, bpm 90');
  });
});
