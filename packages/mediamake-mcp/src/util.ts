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

export interface ToolOptions {
  /**
   * The server runs on the user's machine and may read and write their files
   * (filePath, saveTo, folder arguments). False for the hosted /mcp endpoint,
   * which runs inside the Mediamake app and must never touch its own disk.
   */
  localFiles: boolean;
  /** Longest a tool may poll (render `wait`), for a host with a request time limit. */
  maxWaitSeconds?: number;
}

/**
 * Drops the arguments that name local files from a tool's input shape when
 * the server is hosted. The handler's types keep them as optional, which they
 * already are, and it rejects them anyway in case a client sends them.
 */
export function withoutLocalArgs<S extends Record<string, unknown>>(
  shape: S,
  keys: (keyof S)[],
  options: ToolOptions,
): S {
  if (options.localFiles) return shape;
  const copy = { ...shape };
  for (const key of keys) delete copy[key];
  return copy;
}

export function rejectLocalArgs(
  options: ToolOptions,
  args: Record<string, unknown>,
) {
  if (options.localFiles) return;
  const used = Object.keys(args).filter(key => args[key] !== undefined);
  if (used.length)
    throw new Error(
      `The hosted Mediamake connector can't read or write files on your computer (${used.join(', ')}). Pass a public https URL instead, or install the local Mediamake extension (.mcpb) for file access.`,
    );
}
