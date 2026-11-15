/**
 * Pages that were in Core and are now in the app. next.config.ts redirects
 * `/core/<from>` (and the older `/<from>`) to `/app/<to>`, sub-pages and
 * query included. No imports: next.config.ts reads this file.
 */
export const MOVED_FROM_CORE = [
  'releases',
  'mediamake-mcp',
  'billing',
  'api-keys',
  'devices',
  'projects',
] as const;
