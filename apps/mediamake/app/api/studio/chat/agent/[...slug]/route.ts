import { aiMainRouter } from '@/app/ai';
import { getClientId } from '@/lib/auth-utils';
import { UIMessage } from 'ai';
import { NextRequest } from 'next/server';

export const maxDuration = 600;

export async function GET(req: NextRequest) {
  //const body = req.body;
  const agentFullPath = req.nextUrl.href.split('/api/studio/chat/agent')[1];
  const agentPath = agentFullPath.includes('?')
    ? agentFullPath.split('?')[0]
    : agentFullPath;

  const searchParams = req.nextUrl.searchParams;
  const params: any = {};
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }

  //const revalidatePath = lastMessage?.metadata?.revalidatePath;

  const response = await aiMainRouter.toAwaitResponse(agentPath, {
    request: {
      messages: [],
      params,
      //loadedRevalidatePath: agentPath,
    },
  });

  return response;
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const clientId = getClientId(req);

  const agentFullPath = req.nextUrl.href.split('/api/studio/chat/agent')[1];
  const agentPath = agentFullPath.includes('?')
    ? agentFullPath.split('?')[0]
    : agentFullPath;

  const searchParams = req.nextUrl.searchParams;
  const params: any = {};
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }

  const { messages, ...restOfBody } = body;

  return await aiMainRouter.toAwaitResponse(agentPath, {
    request: {
      ...body,
      clientId: clientId,
      messages: messages ?? [],
      params: {
        ...params,
        ...restOfBody,
      },
    },
  });
}
