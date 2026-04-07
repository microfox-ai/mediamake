import { google } from '@ai-sdk/google';
import { AiRouter } from '@microfox/ai-router';
import {
  convertToModelMessages,
  InferUITools,
  stepCountIs,
  streamText,
} from 'ai';
import dedent from 'dedent';
import { editorAgent } from './agents/editor';
import { systemAgent } from './agents/system';
import { contextLimiter } from './middlewares/contextLimiter';
import { onlyTextParts } from './middlewares/onlyTextParts';

const aiRouter = new AiRouter(undefined, undefined);
// aiRouter.setLogger(console);

const aiMainRouter = aiRouter
  .agent('/system', systemAgent)
  .agent('/editor', editorAgent)
  // Mount workflow router as sub-router
  // .agent('/workflows', workflowRouter)
  .before('/', contextLimiter(5))
  .before('/', onlyTextParts(100))
  .agent('/', async (props: any) => {
    props.response.writeMessageMetadata({ loader: 'Thinking...' });

    const stream = streamText({
      model: google('gemini-pro-latest'),
      system: dedent`
        You are an AI orchestrator inside Writepad, a creative writing IDE.
        Your only job is to route user requests to the correct agent tool.

        ## AVAILABLE AGENTS

        ### editor
        The primary AI writing assistant. Use it for EVERY request that involves:
        - Reading, editing, creating, or deleting project files/folders
        - Writing, rewriting, improving, or expanding prose or content
        - Suggesting structural changes to a manuscript (chapters, scenes, sections)
        - Answering questions about the content of the project files
        - Applying .writepad rules or style guides to the writing
        - Any other writing or file-management task within the project

        The editor agent has its own sub-tools (read_file, search_file, create_file, delete_file)
        and produces streaming XML edit blocks that the client renders as diff proposals.
        Pass the full user message as-is — do not summarise or alter it.

        ## ROUTING RULES
        - When in doubt, always delegate to the editor agent.
        - Do NOT answer writing or file questions yourself — always delegate.
        - Only respond directly for meta questions about Writepad itself (e.g. "what can you do?").
      `,
      messages: convertToModelMessages(
        props.state.onlyTextMessages || props.request.messages,
      ),
      tools: {
        ...props.next.agentAsTool('/editor'),
      },
      toolChoice: 'auto',
      stopWhen: [
        stepCountIs(5),
        ({ steps }) =>
          steps.some((step) =>
            step.toolResults.some((tool: any) => tool.output?._isFinal),
          ),
      ],
      onError: (error) => {
        console.error('ORCHESTRATION ERROR', error);
      },
      onFinish: (result) => {
        console.log('ORCHESTRATION USAGE', result.totalUsage);
      },
    });

    props.response.merge(
      stream.toUIMessageStream({
        sendFinish: false,
        sendStart: true,
      }),
    );
  });

const aiRouterRegistry = aiMainRouter.registry();
const aiRouterTools = aiRouterRegistry.tools;
type AiRouterTools = InferUITools<typeof aiRouterTools>;

export { aiMainRouter, aiRouterRegistry, aiRouterTools, type AiRouterTools };
