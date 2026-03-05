import jwt from 'jsonwebtoken';

const key =
  process.env.SPARKBOARD_API_KEY ?? process.env.STOCKSEARCH_API_KEY ?? '';

function decrypt(secret: string): string | null {
  try {
    const decoded = jwt.verify(secret, key);
    if (typeof decoded === 'string') return decoded;
    if (decoded && typeof decoded === 'object' && 'text' in decoded) {
      return String((decoded as { text: string }).text);
    }
    return null;
  } catch {
    return null;
  }
}

export async function webhookFetch(
  url: string,
  secret: string,
  body: unknown,
): Promise<unknown> {
  try {
    const token = decrypt(secret);
    if (!token) {
      console.error('webhookFetch: failed to decrypt secret');
      return null;
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(
        `Webhook failed: ${response.status} ${response.statusText}`,
      );
    }
    return response.json();
  } catch (error) {
    console.error('webhookFetch error:', error);
    return null;
  }
}

export function encryptWebhookSecret(text: string): string | null {
  try {
    return jwt.sign({ text }, key, { expiresIn: '2d' });
  } catch {
    return null;
  }
}
