// A stand-in API for recording an app: serves its web build and answers its API from a routes module
// with made-up data, keeping changes in memory for the session (a status set, a message sent).
//
//   node mock-server.mjs <web-build-dir> <port> <routes.mjs> [extra-static-dir]
//
// routes.mjs exports `handle(method, path, query, body, now)` and returns
//   - a value (sent as JSON; wrap it the way the app's API does), or
//   - [status, json] for an error, or
//   - undefined when it doesn't know the route (logged as "unhandled" and answered with {}).
// `now()` is the app's clock (pass CLOCK=<iso> in the environment), so new items get times that
// match the status bar. POST /__demo with { name, ...args } calls routes.demo[name](args): a
// teammate's reply arriving mid-take, say. Anything not found in the build falls back to the
// extra static dir (the product's public images), then to index.html (the app's routes).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [webDir, portArg, routesPath, extraDir] = process.argv.slice(2);
const ROOT = resolve(webDir);
const PORT = Number(portArg || 4545);
const routes = await import(pathToFileURL(resolve(routesPath)).href);
const CLOCK0 = process.env.CLOCK ? Date.parse(process.env.CLOCK) : Date.now();
const STARTED = Date.now();
const now = () => new Date(CLOCK0 + (Date.now() - STARTED));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.map': 'application/json', '.webp': 'image/webp' };

const readBody = async (req) => { let raw = ''; for await (const c of req) raw += c; try { return raw ? JSON.parse(raw) : {}; } catch { return {}; } };
const exists = async (f) => { try { return (await stat(f)).isFile(); } catch { return false; } };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/__demo' && req.method === 'POST') {
    const { name, ...args } = await readBody(req);
    await routes.demo?.[name]?.(args, now);
    res.end('ok');
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    const body = await readBody(req);
    let out = await routes.handle(req.method, url.pathname, url.searchParams, body, now);
    if (out === undefined) { console.log('[mock] unhandled', req.method, url.pathname, url.search); out = {}; }
    const [code, json] = Array.isArray(out) && typeof out[0] === 'number' ? out : [200, out];
    res.writeHead(code, { 'content-type': 'application/json' });
    res.end(JSON.stringify(json));
    return;
  }
  const path = decodeURIComponent(url.pathname);
  let file = join(ROOT, path);
  if (!(await exists(file))) {
    const extra = extraDir && join(resolve(extraDir), path);
    file = extra && (await exists(extra)) ? extra : join(ROOT, 'index.html');
  }
  try {
    const buf = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404); res.end(); }
}).listen(PORT, () => console.log(`mock API on http://localhost:${PORT}`));
