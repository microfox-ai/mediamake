import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';
import { MediamakeClient } from './client';
import { createServer } from './server';

async function connect(localFiles: boolean) {
  const server = createServer(
    new MediamakeClient({ baseUrl: 'http://mm.test', timeoutMs: 1000 }),
    { localFiles },
  );
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0' });
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

describe('createServer', () => {
  it('offers local file arguments on the local server', async () => {
    const { tools } = await (await connect(true)).listTools();
    const byName = Object.fromEntries(tools.map(t => [t.name, t]));
    expect(byName.upload_brand_kit).toBeDefined();
    expect(byName.upload_media.inputSchema.properties).toHaveProperty(
      'filePath',
    );
    expect(byName.transcribe.inputSchema.properties).toHaveProperty('saveTo');
  });

  it('leaves out every local file argument when hosted', async () => {
    const client = await connect(false);
    const { tools } = await client.listTools();
    const byName = Object.fromEntries(tools.map(t => [t.name, t]));
    expect(byName.upload_brand_kit).toBeUndefined();
    expect(byName.upload_media.inputSchema.properties).not.toHaveProperty(
      'filePath',
    );
    expect(byName.transcribe.inputSchema.properties).not.toHaveProperty(
      'filePath',
    );
    expect(byName.transcribe.inputSchema.properties).not.toHaveProperty(
      'saveTo',
    );
    expect(byName.get_transcription.inputSchema.properties).not.toHaveProperty(
      'saveTo',
    );
    expect(byName.list_projects).toBeDefined();
  });
});
