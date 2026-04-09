import { aiMainRouter } from '@/app/ai';
import { getClientId } from '@/lib/auth/auth-utils';
import { NextRequest } from 'next/server';

export const maxDuration = 300;

function unwrapToolOutput(payload: unknown): unknown | undefined {
  if (!Array.isArray(payload)) return undefined;
  const messages = payload as Array<{ parts?: Array<Record<string, unknown>> }>;
  for (let i = messages.length - 1; i >= 0; i--) {
    const parts = messages[i]?.parts;
    if (!Array.isArray(parts)) continue;
    for (let j = parts.length - 1; j >= 0; j--) {
      const part = parts[j];
      const type = part?.type;
      const state = part?.state;
      if (
        typeof type === 'string' &&
        type.startsWith('tool-') &&
        state === 'output-available' &&
        'output' in part
      ) {
        return part.output;
      }
    }
  }
  return undefined;
}

export async function GET(req: NextRequest) {
  const agentFullPath = req.nextUrl.href.split('/api/studio/chat/agent')[1];
  const agentPath = agentFullPath.includes('?')
    ? agentFullPath.split('?')[0]
    : agentFullPath;

  const searchParams = req.nextUrl.searchParams;
  const params: any = {};
  searchParams.entries().forEach(([key, value]) => {
    params[key] = value;
  });
  const response = await aiMainRouter.toAwaitResponse(agentPath, {
    request: {
      messages: [],
      params,
    },
  });

  return response;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const clientId = getClientId(req);

  const agentFullPath = req.nextUrl.href.split('/api/studio/chat/agent')[1];
  const agentPath = agentFullPath.includes('?')
    ? agentFullPath.split('?')[0]
    : agentFullPath;

  const searchParams = req.nextUrl.searchParams;
  const paramsFromQuery: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    paramsFromQuery[key] = value;
  }

  const bodyParams =
    typeof body.params === 'object' && body.params !== null
      ? (body.params as Record<string, unknown>)
      : {};
  const topLevelParams = Object.fromEntries(
    Object.entries(body).filter(([key]) => key !== 'messages' && key !== 'params'),
  );

  const requestPayload = {
    ...body,
    clientId,
    messages: Array.isArray(body.messages) ? body.messages : [],
    params: {
      ...topLevelParams,
      ...bodyParams,
      ...paramsFromQuery,
    },
  };

  const isEditorChatPath = agentPath === '/editor';
  const forceStream = searchParams.get('stream') === 'true';
  const useStreaming = isEditorChatPath || forceStream;

  if (useStreaming) {
    return aiMainRouter.handle(agentPath, {
      request: requestPayload,
    });
  }

  const response = await aiMainRouter.toAwaitResponse(agentPath, {
    request: {
      ...requestPayload,
    },
  });

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return response;

  try {
    const payload = await response.clone().json();
    const unwrapped = unwrapToolOutput(payload);
    if (unwrapped !== undefined) {
      return new Response(JSON.stringify(unwrapped), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    // passthrough
  }

  return response;
}
