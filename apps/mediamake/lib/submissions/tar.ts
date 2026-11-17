import { gzipSync } from 'zlib';

/**
 * A .tar.gz from files held in memory: the package a submission is released
 * as, the same shape `npm run catalog -- release` uploads. Plain ustar, files
 * only (tar makes the folders as it unpacks), names up to 255 bytes through
 * the prefix field. No dependency, so the server can build one.
 */

export interface TarEntry {
  path: string;
  data: Buffer;
  /** 0o755 for a script that must run. */
  mode?: number;
}

function field(header: Buffer, value: string, offset: number, length: number) {
  header.write(value, offset, length, 'utf8');
}

const octal = (value: number, length: number) => value.toString(8).padStart(length - 1, '0') + '\0';

/** Splits a path into ustar's name (100 bytes) and prefix (155 bytes), at a slash. */
export function splitPath(path: string): { name: string; prefix: string } | null {
  if (Buffer.byteLength(path) <= 100) return { name: path, prefix: '' };
  for (let at = path.indexOf('/'); at >= 0; at = path.indexOf('/', at + 1)) {
    const prefix = path.slice(0, at);
    const name = path.slice(at + 1);
    if (Buffer.byteLength(prefix) <= 155 && Buffer.byteLength(name) <= 100 && name) return { name, prefix };
  }
  return null;
}

function header(entry: TarEntry, mtime: number): Buffer {
  const split = splitPath(entry.path);
  if (!split) throw new Error(`${entry.path} is too long a path for a package`);
  const block = Buffer.alloc(512);
  field(block, split.name, 0, 100);
  field(block, octal(entry.mode ?? 0o644, 8), 100, 8);
  field(block, octal(0, 8), 108, 8);
  field(block, octal(0, 8), 116, 8);
  field(block, octal(entry.data.length, 12), 124, 12);
  field(block, octal(mtime, 12), 136, 12);
  block.fill(' ', 148, 156); // the checksum is summed with its own field as spaces
  field(block, '0', 156, 1); // a regular file
  field(block, 'ustar\0', 257, 6);
  field(block, '00', 263, 2);
  field(block, split.prefix, 345, 155);
  let sum = 0;
  for (const byte of block) sum += byte;
  field(block, sum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
  return block;
}

/** The archive's bytes, before gzip. */
export function tar(entries: TarEntry[], at: Date = new Date()): Buffer {
  const mtime = Math.floor(at.getTime() / 1000);
  const blocks: Buffer[] = [];
  for (const entry of [...entries].sort((a, b) => a.path.localeCompare(b.path))) {
    blocks.push(header(entry, mtime), entry.data);
    const rest = entry.data.length % 512;
    if (rest) blocks.push(Buffer.alloc(512 - rest));
  }
  blocks.push(Buffer.alloc(1024));
  return Buffer.concat(blocks);
}

export const tarGz = (entries: TarEntry[], at?: Date): Buffer => gzipSync(tar(entries, at));
