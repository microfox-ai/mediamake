import { NextResponse } from 'next/server';
import { createSessionForClient, validateApiKey } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const { clientId, clientKey } = await request.json();

    const apiKeyInfo = await validateApiKey(clientKey, clientId);
    if (!apiKeyInfo) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 },
      );
    }

    await createSessionForClient(apiKeyInfo.clientId);
    return NextResponse.json({ message: 'Logged in successfully' });
  } catch {
    return NextResponse.json(
      { message: 'An internal error occurred' },
      { status: 500 },
    );
  }
}
