import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { CaptionsDocument } from '@/app/types/transcription';
import {
  downloadMergedTranscription,
  mergedTranscriptionFileName,
} from './captions-client';

const doc = {
  _id: 'cap-1',
  title: 'Hook Version',
  description: 'edited',
  captions: [{ id: 'line-1', text: 'Hello there' }],
  sourceTranscriptionId: 'tr-1',
  createdAt: new Date(0),
  updatedAt: new Date(0),
} as CaptionsDocument;

describe('merged transcription download', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete (globalThis as { document?: unknown }).document;
  });

  it('names the file from the transcription title', () => {
    assert.equal(
      mergedTranscriptionFileName({ title: 'My Song!' }, doc),
      'my-song-merged.json',
    );
  });

  it('downloads the source transcription with the caption lines merged in', async () => {
    const downloads: { filename: string; blob: Blob }[] = [];
    (globalThis as { document?: unknown }).document = {
      createElement: () => ({
        href: '',
        download: '',
        click: () => undefined,
      }),
      body: {
        appendChild: (link: { download: string; href: string }) => {
          const blob = blobs.get(link.href);
          if (blob) downloads.push({ filename: link.download, blob });
        },
        removeChild: () => undefined,
      },
    };
    const blobs = new Map<string, Blob>();
    globalThis.URL.createObjectURL = (blob: Blob) => {
      const url = `blob:${blobs.size}`;
      blobs.set(url, blob);
      return url;
    };
    globalThis.URL.revokeObjectURL = () => undefined;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      assert.equal(String(input), '/api/transcriptions/tr-1');
      return new Response(
        JSON.stringify({
          transcription: {
            _id: 'tr-1',
            title: 'My Song',
            audioUrl: 'https://example.com/song.mp3',
            captions: [{ id: 'old', text: 'old line' }],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    await downloadMergedTranscription(doc);

    assert.equal(downloads.length, 1);
    assert.equal(downloads[0]?.filename, 'my-song-merged.json');
    const saved = JSON.parse(await downloads[0]!.blob.text()) as {
      _id: string;
      audioUrl: string;
      description: string;
      captions: { text: string }[];
    };
    assert.equal(saved._id, 'tr-1');
    assert.equal(saved.audioUrl, 'https://example.com/song.mp3');
    assert.equal(saved.description, 'edited');
    assert.deepEqual(
      saved.captions.map(line => line.text),
      ['Hello there'],
    );
  });

  it('refuses a caption version with no source transcription', async () => {
    await assert.rejects(
      () => downloadMergedTranscription({ ...doc, sourceTranscriptionId: undefined }),
      /not linked to a transcription/,
    );
  });
});
