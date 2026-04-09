/**
 * Resolves the MongoDB database name for Writepad.
 *
 * 1. DATABASE_MONGODB_DB or MONGODB_DB if set
 * 2. Path segment in the connection URI (e.g. ...mongodb.net/writepad-dev)
 * 3. writepad-prod when NODE_ENV is production, otherwise writepad-dev
 */
export function parseDbNameFromMongoUri(uri: string): string | undefined {
  if (!uri?.trim()) return undefined;
  try {
    const withoutQuery = uri.split('?')[0] ?? '';
    const rest = withoutQuery.replace(/^mongodb(\+srv)?:\/\//i, '');
    const slash = rest.indexOf('/');
    if (slash === -1) return undefined;
    const segment = rest.slice(slash + 1).split('/')[0]?.trim();
    if (!segment) return undefined;
    return decodeURIComponent(segment);
  } catch {
    return undefined;
  }
}

export function resolveWritepadMongoDbName(connectionUri: string): string {
  const fromEnv =
    process.env.DATABASE_MONGODB_DB?.trim() ||
    process.env.MONGODB_DB?.trim();
  if (fromEnv) return fromEnv;

  const fromUri = parseDbNameFromMongoUri(connectionUri);
  if (fromUri) return fromUri;

  return process.env.NODE_ENV === 'production' ? 'writepad-prod' : 'writepad-dev';
}
