/**
 * Thin HTTP client for the Mediamake Next.js API.
 *
 * Every route under /api/ is authenticated by the app's middleware with
 * `Authorization: Bearer <api key>`; the middleware resolves the key to a
 * clientId, so this client never sends a clientId itself.
 */

export interface MediamakeConfig {
  baseUrl: string;
  apiKey?: string;
  /** Per-request timeout. Transcription and renders can take minutes. */
  timeoutMs: number;
}

export class MediamakeApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'MediamakeApiError';
  }
}

export type Query = Record<
  string,
  string | number | boolean | undefined | null
>;

export function configFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): MediamakeConfig {
  const baseUrl = (env.MEDIAMAKE_API_URL || 'http://localhost:3000')
    .trim()
    .replace(/\/+$/, '');
  const apiKey = env.MEDIAMAKE_API_KEY?.trim() || undefined;
  const timeoutMs =
    Number(env.MEDIAMAKE_TIMEOUT_MS) > 0
      ? Number(env.MEDIAMAKE_TIMEOUT_MS)
      : 5 * 60 * 1000;
  return { baseUrl, apiKey, timeoutMs };
}

export class MediamakeClient {
  constructor(readonly config: MediamakeConfig) {}

  url(path: string, query?: Query): string {
    const url = new URL(
      path.startsWith('/') ? path : `/${path}`,
      `${this.config.baseUrl}/`,
    );
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    options: { query?: Query; body?: unknown; timeoutMs?: number } = {},
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.config.apiKey)
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    if (options.body !== undefined)
      headers['Content-Type'] = 'application/json';

    const res = await fetch(this.url(path, options.query), {
      method,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(options.timeoutMs ?? this.config.timeoutMs),
    });

    const text = await res.text();
    let data: unknown = text;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        // Non-JSON body (HTML error page, plain text). Keep the text.
      }
    } else {
      data = undefined;
    }

    if (!res.ok) {
      const detail =
        data && typeof data === 'object'
          ? ((data as any).error ??
            (data as any).message ??
            JSON.stringify(data))
          : String(data ?? res.statusText).slice(0, 500);
      throw new MediamakeApiError(
        `${method} ${path} failed (${res.status}): ${detail}`,
        res.status,
        data,
      );
    }
    return data as T;
  }

  get<T = any>(path: string, query?: Query) {
    return this.request<T>('GET', path, { query });
  }

  post<T = any>(
    path: string,
    body?: unknown,
    query?: Query,
    timeoutMs?: number,
  ) {
    return this.request<T>('POST', path, { body, query, timeoutMs });
  }

  put<T = any>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, { body });
  }
}
