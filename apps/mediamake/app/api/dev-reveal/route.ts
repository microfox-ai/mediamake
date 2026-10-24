import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Shows a file or folder in the OS file manager (Finder on macOS), for the public
 * /image-revision page. Development only: the dev server runs on the user's own
 * computer, so this is "the computer reveals its own file". It only reveals
 * (never opens or runs anything), and only existing paths under the home folder.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') return Response.json({ message: 'Not found' }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { path?: unknown };
  const target = typeof body.path === 'string' ? path.resolve(body.path) : '';
  const home = os.homedir();
  if (!target || !path.isAbsolute(String(body.path)) || target.includes('\0') || !(target === home || target.startsWith(home + path.sep))) {
    return Response.json({ message: 'Pass an absolute path inside your home folder' }, { status: 400 });
  }
  if (!fs.existsSync(target)) return Response.json({ message: `No such file or folder: ${target}` }, { status: 404 });

  const [cmd, args] =
    process.platform === 'darwin'
      ? ['open', ['-R', target]] // reveal and select it in Finder
      : process.platform === 'win32'
        ? ['explorer', [`/select,${target}`]]
        : ['xdg-open', [fs.statSync(target).isDirectory() ? target : path.dirname(target)]];
  const error = await new Promise<Error | null>(resolve => execFile(cmd, args, err => resolve(err)));
  // explorer exits 1 even when it worked
  if (error && process.platform !== 'win32') return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ revealed: target });
}
