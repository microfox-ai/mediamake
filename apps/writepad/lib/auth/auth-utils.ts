import { NextRequest } from 'next/server';

/**
 * Extracts client ID from request headers
 * Supports both Authorization: Bearer <token> and x-client-id headers
 * @param req - NextRequest object
 * @returns client ID string or null if not found
 */
export function getClientId(req: NextRequest): string | null {
  // Fallback to x-client-id for backward compatibility
  return req.headers.get('x-client-id');
}

/**
 * Validates that a client ID is present and returns it
 * @param req - NextRequest object
 * @returns client ID string
 * @throws Error if no client ID is found
 */
export function requireClientId(req: NextRequest): string {
  const clientId = getClientId(req);

  if (!clientId) {
    throw new Error('Client ID is required');
  }

  return clientId;
}
