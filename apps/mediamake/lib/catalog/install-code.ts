import { Redis } from '@upstash/redis';
import { randomBytes } from 'crypto';

/**
 * Install codes let Claude fetch an install plan for someone without their
 * API key. Copying an install prompt while signed in mints one: it names one
 * person and one item, is only accepted by GET /api/catalog/install for that
 * item, and expires after INSTALL_CODE_SECONDS.
 */
export const INSTALL_CODE_PREFIX = 'mmi_';
export const INSTALL_CODE_SECONDS = 2 * 60 * 60;

interface InstallCode {
  clientId: string;
  itemId: string;
  createdAt: string;
}

function redis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

const keyFor = (code: string) => `catalog:install-code:${code}`;

export function isInstallCode(value: string | null | undefined): value is string {
  return !!value && value.startsWith(INSTALL_CODE_PREFIX);
}

export async function createInstallCode(clientId: string, itemId: string) {
  const code = INSTALL_CODE_PREFIX + randomBytes(18).toString('base64url');
  const record: InstallCode = { clientId, itemId, createdAt: new Date().toISOString() };
  await redis().set(keyFor(code), record, { ex: INSTALL_CODE_SECONDS });
  return { code, expiresAt: new Date(Date.now() + INSTALL_CODE_SECONDS * 1000).toISOString() };
}

/** The person an install code stands for, if it is live and was made for `itemId`. */
export async function clientIdForInstallCode(code: string, itemId: string): Promise<string | null> {
  if (!isInstallCode(code)) return null;
  const record = await redis().get<InstallCode>(keyFor(code));
  return record && record.itemId === itemId ? record.clientId : null;
}
