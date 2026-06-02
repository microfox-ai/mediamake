import { AiRouterTools } from '@/app/ai';
import { isToolUIPart, UIMessage } from 'ai';
import { aiRouterRegistry } from '@/app/ai';
import type { QuotaError } from '@/components/quota-exhausted-dialog';

/**
 * Thrown by callAgent when the AI quota check rejects the call (403 / 429).
 * Catch this in UI to show the QuotaExhaustedDialog.
 */
export class QuotaExhaustedError extends Error {
  quotaError: QuotaError;
  constructor(quotaError: QuotaError, message?: string) {
    super(message ?? 'AI quota exhausted');
    this.name = 'QuotaExhaustedError';
    this.quotaError = quotaError;
  }
}

/**
 * Generic helper function to call any agent API endpoint
 * @param agentPath The agent path (e.g., 'youtube-metadata', 'transcription-meta')
 * @param params The parameters to send to the agent
 * @returns Promise with the agent response
 */
export async function callAgent(
  agentPath: string,
  params: Record<string, any>,
): Promise<any> {
  try {
    const response = await fetch(`/api/studio/chat/agent/${agentPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      // 403/429 with structured quotaError → throw a typed error so callers
      // can pop the QuotaExhaustedDialog instead of a generic toast.
      if (response.status === 403 || response.status === 429) {
        try {
          const json = await response.clone().json();
          if (json?.quotaError) {
            throw new QuotaExhaustedError(json.quotaError as QuotaError, json.message);
          }
        } catch (e) {
          if (e instanceof QuotaExhaustedError) throw e;
          // not JSON / no quotaError — fall through to generic error below
        }
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = (await response.json()) as UIMessage<any, any, any>[];
    console.log('result', result);
    if (result.length > 0) {
      const lastResult = result[result.length - 1];
      const outputParts = lastResult.parts.findLast(p =>
        p.type.startsWith('tool-'),
      );
      if (outputParts && isToolUIPart(outputParts)) {
        return outputParts.output as any;
      }
    }
    return result;
  } catch (error) {
    console.error(`Error calling agent ${agentPath}:`, error);
    throw error;
  }
}
