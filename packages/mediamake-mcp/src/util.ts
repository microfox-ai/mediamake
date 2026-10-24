import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/** MCP result carrying JSON. Pretty-printed so Claude can read it directly. */
export function json(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

export function errorResult(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return { isError: true, content: [{ type: 'text', text: message }] };
}

/** Wraps a tool handler so a thrown error becomes an MCP error result instead of a protocol error. */
export function safe<A>(handler: (args: A) => Promise<CallToolResult>) {
  return async (args: A): Promise<CallToolResult> => {
    try {
      return await handler(args);
    } catch (error) {
      return errorResult(error);
    }
  };
}

export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

const MIME_BY_EXTENSION: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  json: 'application/json',
  pdf: 'application/pdf',
  txt: 'text/plain',
};

export function mimeFromName(name: string): string | undefined {
  const ext = name.split('?')[0].split('.').pop()?.toLowerCase();
  return ext ? MIME_BY_EXTENSION[ext] : undefined;
}

export function contentTypeFromMime(
  mime: string,
): 'image' | 'video' | 'audio' | 'document' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'document';
}
