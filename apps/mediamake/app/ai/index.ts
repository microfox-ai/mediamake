// @ts-nocheck

import { google } from '@ai-sdk/google';
import { AiRouter } from '@microfox/ai-router';
import {
  convertToModelMessages,
  InferUITools,
  stepCountIs,
  streamText,
} from 'ai';
import dedent from 'dedent';
import { braveResearchAgent } from './agents/braveResearch';
import { summarizeAgent } from './agents/summarize';
import { systemAgent } from './agents/system';
import { youtubeAgent } from './agents/metadata/youtubeAgent';
import { conceptAgent } from './agents/metadata/conceptAgent';
import { musicStitchAgent } from './agents/video/shorts/musicStitch';
import { contextLimiter } from './middlewares/contextLimiter';
import { onlyTextParts } from './middlewares/onlyTextParts';
import { chatRestoreLocal } from '../api/studio/chat/sessions/chatSessionLocal';
import transcriptionFixerAgent from './agents/words/transcriptionFixer';
import autofixOrchestrator from './agents/autofix';
import { scriptMetaOrchestor } from './agents/scriptMeta';
import {
  midjourneyOrchestrator,
  midjourneyPromptingAgent,
} from './agents/midjourney';
import { videoGenerationOrchestrator } from './agents/video';
import { audioAnalysisAgent } from './agents/analysis/audioAnlysisAgent';
import { audioTechnicalAnalysisAgent } from './agents/analysis/audioTechnicalAnalysis';
import { midjourneySimpleAgent } from './agents/midjourney/simple';
import { zoneInternalOrchestrator } from './agents/zone';
import { presetPromptsOrchestrator } from './agents/presetPrompts';

const aiRouter = new AiRouter();
//aiRouter.setLogger(console);

const aiMainRouter = aiRouter
  .agent('/system', systemAgent)
  .agent('/summarize', summarizeAgent)
  .agent('/research', braveResearchAgent)
  .agent('/transcription-fixer', transcriptionFixerAgent)
  .agent('/autofix', autofixOrchestrator)
  .agent('/youtube-metadata', youtubeAgent)
  .agent('/concept-generation', conceptAgent)
  .agent('/video/shorts/music-stitch', musicStitchAgent)
  .agent('/video', videoGenerationOrchestrator)
  .agent('/zone-internal', zoneInternalOrchestrator)
  .agent('/midjourney', midjourneyOrchestrator)
  .agent('/script-meta', scriptMetaOrchestor)
  .agent('/audio-analysis', audioAnalysisAgent)
  .agent('/preset-prompts', presetPromptsOrchestrator)
  .agent('/audio-technical-analysis', audioTechnicalAnalysisAgent)
  .use('/', contextLimiter(5))
  .use('/', onlyTextParts(100))
  .agent('/', async props => {
    // Ai decides what to do based on the last message & user intent.
    props.response.writeMessageMetadata({
      loader: 'Deciding...',
    });
    console.log('REQUEST MESSAGES', props.request.messages.length);
    const stream = streamText({
      model: google('gemini-2.5-pro'),
      system: dedent`
          You are a helpful assistant that can use the following tools to help the user
          Use the summary tool to summarise the research.
          If you do research or websearch, always follow it up with calling the summary tool.
          Use the transcription metadata tool to analyze sentence-split transcripts for lyricography.
        `,
      messages: convertToModelMessages(
        props.state.onlyTextMessages || props.request.messages,
      ),
      tools: {
        ...props.next.agentAsTool('/research'),
        ...props.next.agentAsTool('/summarize'),
        ...props.next.agentAsTool('/transcription-meta'),
        ...props.next.agentAsTool('/youtube-metadata'),
        ...props.next.agentAsTool('/concept-generation'),
        ...props.next.agentAsTool('/music-stitch'),
        ...props.next.agentAsTool('/audio-analysis'),
      },
      toolChoice: 'auto',
      stopWhen: [
        stepCountIs(10),
        ({ steps }) =>
          steps.some(step =>
            step.toolResults.some(
              tool => tool.toolName === 'summarizeResearch',
            ),
          ),
      ],
      onError: error => {
        console.error('ORCHESTRATION ERROR', error);
      },
      onFinish: result => {
        console.log('ORCHESTRATION USAGE', result.totalUsage);
      },
    });
    props.response.merge(
      stream.toUIMessageStream({
        sendFinish: false,
        sendStart: false,
      }),
    );
  });

// console.log('--------REGISTRY--------');
// console.log(aiMainRouter.registry());
const aiRouterRegistry = aiMainRouter.registry();
const aiRouterTools = aiRouterRegistry.tools;
type AiRouterTools = InferUITools<typeof aiRouterTools>;
// console.log('--------REGISTRY--------');

export { aiMainRouter, aiRouterRegistry };

export { aiRouterTools, type AiRouterTools };

//http://localhost:3000/api/studio/chat/agent/research/brave?query=Herohonda&deep=false&count=3
