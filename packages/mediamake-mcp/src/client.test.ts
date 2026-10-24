import { describe, expect, it } from 'vitest';
import { configFromEnv } from './client';

describe('configFromEnv', () => {
  it('reads the URL and key, trimming a trailing slash', () => {
    const c = configFromEnv({
      MEDIAMAKE_API_URL: 'https://mm.example/ ',
      MEDIAMAKE_API_KEY: ' k ',
    });
    expect(c.baseUrl).toBe('https://mm.example');
    expect(c.apiKey).toBe('k');
  });

  it('treats unfilled .mcpb placeholders as unset', () => {
    const c = configFromEnv({
      MEDIAMAKE_API_URL: '${user_config.api_url}',
      MEDIAMAKE_API_KEY: '${user_config.api_key}',
    });
    expect(c.baseUrl).toBe('http://localhost:3000');
    expect(c.apiKey).toBeUndefined();
  });
});
