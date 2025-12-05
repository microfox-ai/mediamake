import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { loadTranscription } from './middlewares/loadTranscription';
import spellingFixerAgent from './fixers/spellingFixer';
import wordBoundaryFixerAgent from './fixers/wordBoundaryFixer';
import sentenceStructureFixerAgent from './fixers/sentenceStructureFixer';
import punctuationFixerAgent from './fixers/punctuationFixer';
import timingOptimizerAgent from './fixers/timingOptimizer';
import contextualFixerAgent from './fixers/contextualFixer';

const aiRouter = new AiRouter();

/**
 * Autofix Orchestrator
 * Coordinates multiple specialized autofix agents
 */
export const autofixOrchestrator = aiRouter
  .before('/', async (ctx, next) => {
    ctx.response.writeMessageMetadata({
      loader: 'Orchestrating autofix agents...',
    });
    return next();
  })
  .before('/', loadTranscription)
  .agent('/spelling', spellingFixerAgent)
  .agent('/word-boundary', wordBoundaryFixerAgent)
  .agent('/sentence-structure', sentenceStructureFixerAgent)
  .agent('/punctuation', punctuationFixerAgent)
  .agent('/timing', timingOptimizerAgent)
  .agent('/contextual', contextualFixerAgent)
  .agent('/', async ctx => {
    try {
      console.log('AUTOFIX ORCHESTRATOR: Starting...');
      ctx.response.writeMessageMetadata({
        loader: 'Running comprehensive autofix...',
      });

      const {
        transcriptionId,
        userRequest,
        userWrittenTranscription,
        agents = ['spelling', 'word-boundary', 'punctuation'],
        applyToDatabase = false,
      } = ctx.request.params as {
        transcriptionId: string;
        userRequest?: string;
        userWrittenTranscription?: string;
        agents?: string[];
        applyToDatabase?: boolean;
      };

      // If user provided written transcription, use contextual fixer
      if (userWrittenTranscription) {
        console.log('AUTOFIX ORCHESTRATOR: Using contextual fixer');
        return ctx.next.callAgent('/contextual', {
          transcriptionId,
          userRequest,
          userWrittenTranscription,
          applyToDatabase,
        });
      }

      // Smart agent selection based on user request
      let agentsToRun = agents;
      if (userRequest) {
        const request = userRequest.toLowerCase();
        agentsToRun = [];

        if (
          request.includes('spell') ||
          request.includes('typo') ||
          request.includes('mistake')
        ) {
          agentsToRun.push('spelling');
        }
        if (
          request.includes('word') ||
          request.includes('boundary') ||
          request.includes('merge') ||
          request.includes('split')
        ) {
          agentsToRun.push('word-boundary');
        }
        if (
          request.includes('sentence') ||
          request.includes('structure') ||
          request.includes('long') ||
          request.includes('short')
        ) {
          agentsToRun.push('sentence-structure');
        }
        if (
          request.includes('punctuation') ||
          request.includes('comma') ||
          request.includes('period') ||
          request.includes('question')
        ) {
          agentsToRun.push('punctuation');
        }
        if (
          request.includes('timing') ||
          request.includes('sync') ||
          request.includes('gap')
        ) {
          agentsToRun.push('timing');
        }

        // If no specific agents detected, run common ones
        if (agentsToRun.length === 0) {
          agentsToRun = ['spelling', 'word-boundary', 'punctuation'];
        }
      }

      console.log('AUTOFIX ORCHESTRATOR: Running agents:', agentsToRun);

      // Run selected agents in sequence
      // Note: Running in sequence ensures each fix builds on the previous
      let currentTranscription = ctx.state.transcription;
      let allChanges: any[] = [];
      let allUsage: any[] = [];

      for (const agentName of agentsToRun) {
        try {
          const agentPath = `/${agentName}`;
          console.log(`AUTOFIX ORCHESTRATOR: Running agent ${agentPath}...`);

          const response = await ctx.next.callAgent(agentPath, {
            transcriptionId,
            userRequest,
            applyToDatabase: false, // Don't apply individually
          });

          // Handle both wrapped and direct responses
          const result = (response as any).ok
            ? (response as any).data
            : response;

          if (
            result &&
            result.success &&
            result.changes &&
            result.changes.length > 0
          ) {
            // Update current transcription with fixes
            currentTranscription = result.transcription;
            allChanges.push({
              agent: agentName,
              changes: result.changes,
              confidence: result.confidence,
              summary: result.summary,
            });
            if (result.usage) {
              allUsage.push(result.usage);
            }

            // Update context state for next agent
            ctx.state.transcription = currentTranscription;
            ctx.state.captions = currentTranscription.captions;
          }
        } catch (error) {
          console.warn(
            `AUTOFIX ORCHESTRATOR: Agent ${agentName} failed:`,
            error,
          );
          // Continue with other agents even if one fails
        }
      }

      // Apply final result to database if requested
      if (applyToDatabase && allChanges.length > 0) {
        const { saveTranscriptionFix } = await import('./helpers');
        await saveTranscriptionFix(
          transcriptionId,
          currentTranscription.captions,
          allChanges,
          'Autofix Orchestrator',
          userRequest,
          userWrittenTranscription,
        );
      }

      console.log(
        'AUTOFIX ORCHESTRATOR: Completed -',
        allChanges.length,
        'agent(s) made changes',
      );

      return {
        success: true,
        appliedToDatabase: applyToDatabase,
        transcription: currentTranscription,
        changes: allChanges,
        agentsRun: agentsToRun,
        confidence: 0.9,
        usage: allUsage,
        summary: `Ran ${agentsToRun.length} autofix agent${agentsToRun.length !== 1 ? 's' : ''}: ${agentsToRun.join(', ')}`,
      };
    } catch (error) {
      console.error('Autofix orchestrator error:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'autofixOrchestrator',
    name: 'Autofix Orchestrator',
    description:
      'Comprehensive transcription autofix using multiple specialized agents. Automatically selects and runs appropriate fixers based on your needs.',
    inputSchema: z.object({
      transcriptionId: z.string().describe('Transcription ID to fix'),
      userRequest: z
        .string()
        .optional()
        .describe(
          'Specific requests (e.g., "fix spelling and punctuation"). Used to select appropriate agents.',
        ),
      userWrittenTranscription: z
        .string()
        .optional()
        .describe(
          'Your written version - if provided, uses contextual fixer for best results',
        ),
      agents: z
        .array(
          z.enum([
            'spelling',
            'word-boundary',
            'sentence-structure',
            'punctuation',
            'timing',
          ]),
        )
        .optional()
        .default(['spelling', 'word-boundary', 'punctuation'])
        .describe(
          'Specific agents to run (default: spelling, word-boundary, punctuation)',
        ),
      applyToDatabase: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to save changes to database immediately'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      appliedToDatabase: z.boolean(),
      transcription: z.any(),
      changes: z.array(z.any()),
      agentsRun: z.array(z.string()),
      confidence: z.number().min(0).max(1),
      summary: z.string(),
    }),
    metadata: {
      icon: '🔧',
      title: 'Autofix Orchestrator',
      description: 'Run multiple autofix agents',
      category: 'transcription',
      tags: [
        'transcription',
        'autofix',
        'transcription-autofix',
        'orchestrator',
      ],
      hideUI: false,
    },
  });

export default autofixOrchestrator;
