import assert from 'node:assert/strict';

/**
 * An in-memory Redis that speaks Upstash's REST API, for tests: the client
 * calls fetch, so this replaces fetch for http://upstash.test and passes
 * everything else to `passthrough`. Covers what sign-in uses (hashes through
 * CrudHash, plain keys with an expiry, counters).
 */

type Value = string | Map<string, string>;

export function installFakeUpstash(passthrough: typeof fetch) {
  const db = new Map<string, Value>();
  const ttl = new Map<string, number>();

  function alive(key: string) {
    const until = ttl.get(key);
    if (until !== undefined && until <= Date.now()) {
      db.delete(key);
      ttl.delete(key);
    }
    return db.has(key);
  }

  const glob = (pattern: string) =>
    new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);

  const hash = (key: string) => (alive(key) ? (db.get(key) as Map<string, string>) : null);

  function hset(key: string, args: string[]) {
    const h = hash(key) ?? new Map<string, string>();
    db.set(key, h);
    for (let i = 0; i < args.length; i += 2) h.set(args[i], args[i + 1]);
    return args.length / 2;
  }

  function del(key: string) {
    if (!alive(key)) return false;
    db.delete(key);
    ttl.delete(key);
    return true;
  }

  function run([name, ...raw]: unknown[]): unknown {
    const args = raw.map(String);
    switch (String(name).toLowerCase()) {
      case 'hset':
        return hset(args[0], args.slice(1));
      case 'hgetall':
        return hash(args[0]) ? [...hash(args[0])!].flat() : [];
      case 'hget':
        return hash(args[0])?.get(args[1]) ?? null;
      case 'exists':
        return args.filter(alive).length;
      case 'del':
        return args.filter(del).length;
      case 'expire':
        if (!alive(args[0])) return 0;
        ttl.set(args[0], Date.now() + Number(args[1]) * 1000);
        return 1;
      case 'set': {
        db.set(args[0], args[1]);
        ttl.delete(args[0]);
        const ex = args.findIndex(a => a.toLowerCase() === 'ex');
        if (ex >= 0) ttl.set(args[0], Date.now() + Number(args[ex + 1]) * 1000);
        return 'OK';
      }
      case 'get':
        return alive(args[0]) ? (db.get(args[0]) as string) : null;
      case 'getdel': {
        const value = alive(args[0]) ? (db.get(args[0]) as string) : null;
        del(args[0]);
        return value;
      }
      case 'incr': {
        const next = (alive(args[0]) ? Number(db.get(args[0])) : 0) + 1;
        db.set(args[0], String(next));
        return next;
      }
      case 'scan': {
        const match = args.findIndex(a => a.toLowerCase() === 'match');
        const re = glob(match >= 0 ? args[match + 1] : '*');
        return ['0', [...db.keys()].filter(k => alive(k) && re.test(k))];
      }
      case 'eval': {
        // CrudHash.update: HSET only if the key exists.
        const [script, , key, ...argv] = args;
        assert.match(script, /EXISTS[\s\S]*HSET/);
        if (!alive(key)) return 0;
        hset(key, argv);
        return 1;
      }
      default:
        throw new Error(`fake upstash: ${String(name)} not implemented`);
    }
  }

  const encode = (v: unknown): unknown =>
    typeof v === 'string' ? (v === 'OK' ? v : Buffer.from(v).toString('base64')) : Array.isArray(v) ? v.map(encode) : v;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith('http://upstash.test')) return passthrough(input, init);
    const body = JSON.parse(String(init?.body));
    const base64 = new Headers(init?.headers).get('upstash-encoding') === 'base64';
    const reply = (result: unknown) => ({ result: base64 ? encode(result) : result });
    const out =
      url.endsWith('/pipeline') || url.endsWith('/multi-exec')
        ? (body as unknown[][]).map(c => reply(run(c)))
        : reply(run(body));
    return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;

  process.env.UPSTASH_REDIS_REST_URL = 'http://upstash.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test';

  return {
    hset,
    clear() {
      db.clear();
      ttl.clear();
    },
    keys: (pattern = '*') => [...db.keys()].filter(k => alive(k) && glob(pattern).test(k)),
    /** Makes every key with an expiry lapse, as if time had passed. */
    expireAll() {
      for (const key of [...ttl.keys()]) del(key);
    },
  };
}
