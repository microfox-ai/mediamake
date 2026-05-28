import { NextRequest } from 'next/server';

/**
 * Returns the list of admin client IDs from the ADMIN_CLIENT_IDS env var.
 * Set in .env:  ADMIN_CLIENT_IDS=id1,id2,id3
 */
export function getAdminClientIds(): string[] {
  return (process.env.ADMIN_CLIENT_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAdmin(clientId: string | null | undefined): boolean {
  if (!clientId) return false;
  return getAdminClientIds().includes(clientId);
}

/** Reads x-client-id header and checks if it's an admin. */
export function isAdminRequest(req: NextRequest): boolean {
  return isAdmin(req.headers.get('x-client-id'));
}

/** Throws a structured error if the request is not from an admin. */
export function requireAdmin(req: NextRequest): string {
  const clientId = req.headers.get('x-client-id');
  if (!isAdmin(clientId)) {
    throw Object.assign(new Error('Admin access required'), { status: 403 });
  }
  return clientId!;
}
