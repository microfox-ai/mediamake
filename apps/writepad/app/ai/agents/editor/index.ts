/**
 * Editor Agent — /editor
 *
 * Streaming AI writing assistant with full project awareness.
 * Mounted at /editor in the main AiRouter and reached via
 * POST /api/studio/chat/agent/editor → [...slug] → aiMainRouter.
 *
 * Architecture:
 *  - before('/') middleware fetches all project files from DB and parses
 *    the selected model + web-search flag from the request payload.
 *  - Four tool sub-agents (read-file, search-file, create-file, delete-file)
 *    are mounted as AiRouter instances and exposed via actAsTool so that
 *    the orchestrator can attach them to streamText with agentAsTool().
 *  - Main agent at '/' orchestrates via streamText, merges the stream into
 *    ctx.response, persists the chat and usage on finish.
 */

import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { AiRouter, type AiMiddleware } from '@microfox/ai-router';
import { z } from 'zod';
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
  type LanguageModel,
} from 'ai';
import dedent from 'dedent';
import { ObjectId } from 'mongodb';
import {
  chatSessionsCol,
  projectFilesCol,
  projectsCol,
  projectAgentsCol,
  hasAccess,
  canEditProject,
} from '@/lib/db/collections';
import { getModelDef, DEFAULT_MODEL_ID } from '@/lib/ai-models';
import { trackUsage } from '@/app/ai/lib/trackUsage';
import { getLocalAgentTemplate } from '@/lib/agent-templates';
import { readFileAgent } from './tools/readFile';
import { searchFileAgent } from './tools/searchFile';
import { createFileAgent } from './tools/createFile';
import { deleteFileAgent } from './tools/deleteFile';
import { autocompleteAgent } from './tools/autocomplete';
import { wordHelperAgent } from './tools/wordHelper';
import { webSearchAgent } from './tools/webSearch';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectFile {
  fileId: string;
  fileName: string;
  content: string;
  type?: 'file' | 'folder';
  parentId?: string | null;
}

interface ContextAttachment {
  id: string;
  fileId: string;
  fileName: string;
  startLine: number;
  endLine: number;
  content: string;
}

interface ResolvedAgent {
  id: string;
  name: string;
  prompt: string;
  kind: 'local' | 'project';
}

interface FlatNode {
  fileId: string;
  fileName: string;
  type?: 'file' | 'folder';
  parentId?: string | null;
}

type TreeNode = FlatNode & { children: TreeNode[] };

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildTreeString(files: FlatNode[]): string {
  const map = new Map<string, TreeNode>();
  for (const f of files) map.set(f.fileId, { ...f, children: [] });

  const roots: TreeNode[] = [];
  for (const f of files) {
    const node = map.get(f.fileId)!;
    if (f.parentId && map.has(f.parentId)) {
      map.get(f.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function render(nodes: TreeNode[], prefix = ''): string {
    return nodes
      .map((n, i) => {
        const last = i === nodes.length - 1;
        const connector = last ? '└── ' : '├── ';
        const childPrefix = prefix + (last ? '    ' : '│   ');
        const line = prefix + connector + n.fileName;
        const childLines = n.children.length
          ? '\n' + render(n.children, childPrefix)
          : '';
        return line + childLines;
      })
      .join('\n');
  }

  return render(roots);
}

/** Resolve the correct LanguageModel from a model ID string. */
function resolveModel(modelId: string): LanguageModel {
  const def = getModelDef(modelId);
  switch (def.provider) {
    case 'anthropic':
      return anthropic(def.modelName);
    case 'openai':
      return openai(def.modelName);
    default:
      return google(def.modelName);
  }
}

/** Build the web-search tool object for the given model (if enabled). */
function resolveWebSearchTools(
  modelId: string,
  webSearch: boolean,
): Record<string, unknown> {
  if (!webSearch) return {};
  const def = getModelDef(modelId);
  if (def.provider === 'google') return {};
  if (!def.supportsWebSearch) return {};

  switch (def.provider) {
    case 'anthropic':
      return { web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }) };
    case 'openai':
      return { web_search_preview: openai.tools.webSearch() };
    default:
      return {};
  }
}

/**
 * Keep model context text-only and bounded.
 * This route is called directly (/agent/editor), so root middlewares may not apply.
 */
function sanitizeMessagesForModel(
  messages: UIMessage[],
  maxAssistantTextChars = 6000,
): UIMessage[] {
  const totalAssistantChars = messages.reduce((sum, m) => {
    if (m.role !== 'assistant') return sum;
    return (
      sum +
      m.parts.reduce(
        (n, p) => n + (p.type === 'text' ? p.text.length : 0),
        0,
      )
    );
  }, 0);

  const truncateRatio =
    totalAssistantChars > maxAssistantTextChars
      ? maxAssistantTextChars / totalAssistantChars
      : 1;

  return messages.map((m) => ({
    ...m,
    parts: m.parts
      .filter((p) => p.type === 'text')
      .map((p) => ({
        type: 'text' as const,
        text:
          m.role === 'assistant'
            ? p.text.slice(0, Math.floor(p.text.length * truncateRatio))
            : p.text,
      })),
  }));
}

function summarizeMessages(messages: UIMessage[]): string {
  return messages
    .map((m, i) => {
      const textChars = m.parts.reduce(
        (n, p) => n + (p.type === 'text' ? p.text.length : 0),
        0,
      );
      const partTypes = Array.from(new Set(m.parts.map((p) => p.type))).join(',');
      return `#${i}:${m.role} parts=[${partTypes}] textChars=${textChars}`;
    })
    .join(' | ');
}

// ── Agent ─────────────────────────────────────────────────────────────────────

const aiRouter = new AiRouter();

export const editorAgent = aiRouter
  // ── Tool sub-agents (each is an AiRouter that actAsTool) ──────────────────
  .agent('/read-file', readFileAgent)
  .agent('/search-file', searchFileAgent)
  .agent('/create-file', createFileAgent)
  .agent('/delete-file', deleteFileAgent)
  .agent('/autocomplete', autocompleteAgent)
  .agent('/word', wordHelperAgent)
  .agent('/web-search', webSearchAgent)

  // ── Before middleware: fetch files from DB + parse model/webSearch ─────────
  .before('/', (async (ctx, next) => {
    const req = ctx.request as any;
    const projectId: string = req.projectId;

    // Fetch all project files from DB (no client-sent file content)
    let files: ProjectFile[] = [];
    let writepadRules: string | null = null;
    let canEdit = false;
    let resolvedAgent: ResolvedAgent | null = null;
    const selectedAgentId =
      typeof req.agentId === 'string' && req.agentId.trim().length > 0
        ? req.agentId.trim()
        : 'local:writing-assistant';

    if (projectId) {
      const projects = await projectsCol();
      const project = await projects.findOne({ _id: new ObjectId(projectId) });
      if (!project || !req.clientId || !hasAccess(project, req.clientId)) {
        throw new Error('Project not found');
      }
      canEdit = canEditProject(project, req.clientId);

      const col = await projectFilesCol();
      const dbFiles = await col.find({ projectId }).toArray();

      files = dbFiles.map((f) => ({
        fileId: f._id.toHexString(),
        fileName: f.name,
        content: f.content,
        type: f.type,
        parentId: f.parentId,
      }));

      // Find .writepad/rules.md in the fetched files
      const writepadFolder = files.find(
        (f) =>
          f.type === 'folder' &&
          f.fileName.toLowerCase() === '.writepad' &&
          f.parentId === null,
      );
      if (writepadFolder) {
        const rulesFile = files.find(
          (f) =>
            f.type === 'file' &&
            f.fileName.toLowerCase() === 'rules.md' &&
            f.parentId === writepadFolder.fileId,
        );
        writepadRules = rulesFile?.content ?? null;
      }

      if (selectedAgentId.startsWith('project:')) {
        const projectAgentId = selectedAgentId.slice('project:'.length);
        if (ObjectId.isValid(projectAgentId)) {
          const agentsCol = await projectAgentsCol();
          const projectAgent = await agentsCol.findOne({
            _id: new ObjectId(projectAgentId),
            projectId,
          });
          if (projectAgent) {
            resolvedAgent = {
              id: `project:${projectAgent._id.toHexString()}`,
              name: projectAgent.name,
              prompt:
                (projectAgent as { prompt?: string }).prompt ??
                `${(projectAgent as { systemPrompt?: string }).systemPrompt ?? ''}\n${(projectAgent as { context?: string }).context ?? ''}`.trim(),
              kind: 'project',
            };
          }
        }
      } else {
        const localId = selectedAgentId.startsWith('local:')
          ? selectedAgentId.slice('local:'.length)
          : selectedAgentId;
        const local = getLocalAgentTemplate(localId);
        if (local) {
          resolvedAgent = {
            id: `local:${local.id}`,
            name: local.name,
            prompt: local.prompt,
            kind: 'local',
          };
        }
      }
    }

    if (!resolvedAgent) {
      const fallback = getLocalAgentTemplate('writing-assistant');
      resolvedAgent = fallback
        ? {
            id: `local:${fallback.id}`,
            name: fallback.name,
            prompt: fallback.prompt,
            kind: 'local',
          }
        : {
            id: 'local:default',
            name: 'Default Agent',
            prompt: 'You are an AI writing assistant inside Writepad.',
            kind: 'local',
          };
    }

    // Build fileMap so read/search sub-agents can resolve fileId → content
    ctx.state.fileMap = new Map(
      files
        .filter((f) => f.type !== 'folder')
        .map((f) => [f.fileId, f]),
    );
    ctx.state.projectId = projectId;
    ctx.state.chatId = req.chatId;
    ctx.state.files = files;
    ctx.state.attachments = req.attachments ?? [];
    ctx.state.writepadRules = writepadRules;
    ctx.state.modelId = req.modelId ?? DEFAULT_MODEL_ID;
    ctx.state.clientId = req.clientId;
    ctx.state.webSearch = req.webSearch === true;
    ctx.state.canEditProject = canEdit;
    ctx.state.selectedAgent = resolvedAgent;

    return next();
  }) as AiMiddleware<any, any, any, any, any>)

  // ── Main orchestrator ──────────────────────────────────────────────────────
  .agent('/', async (ctx) => {
    const files: ProjectFile[] = ctx.state.files ?? [];
    const attachments: ContextAttachment[] = ctx.state.attachments ?? [];
    const writepadRules: string | null = ctx.state.writepadRules ?? null;
    const messages: UIMessage[] = ctx.request.messages ?? [];
    const isToolInvocation = messages.length === 0;
    const chatId: string | undefined = ctx.state.chatId;
    const projectId: string | undefined = ctx.state.projectId;
    const clientId: string | undefined = ctx.state.clientId;
    const modelId: string = ctx.state.modelId ?? DEFAULT_MODEL_ID;
    const webSearch: boolean = ctx.state.webSearch ?? false;
    const canEdit = ctx.state.canEditProject === true;
    const selectedAgent = ctx.state.selectedAgent as ResolvedAgent | undefined;
    const modelDef = getModelDef(modelId);
    const useWrappedWebSearch = webSearch && modelDef.provider === 'google';
    const debug = process.env.NODE_ENV !== 'production';
    const modelMessages = sanitizeMessagesForModel(messages, 6000);

    if (debug) {
      console.log(
        '[editor agent] incoming messages:',
        summarizeMessages(messages),
      );
      console.log(
        '[editor agent] model messages:',
        summarizeMessages(modelMessages),
      );
    }

    // ── Build system-prompt context blocks ────────────────────────────────

    const directoryTree = files.length
      ? `\n\n## PROJECT FILES\n\`\`\`\n${buildTreeString(files)}\n\`\`\``
      : '';

    const rulesBlock = writepadRules
      ? `\n\n## .WRITEPAD RULES (always follow these)\n${writepadRules}`
      : '';

    const attachmentBlock = attachments.length
      ? `\n\n## ATTACHED EXCERPTS\n${attachments
          .map(
            (a) =>
              `fileId="${a.fileId}" file="${a.fileName}" lines ${a.startLine}–${a.endLine}\n\`\`\`\n${a.content}\n\`\`\``,
          )
          .join('\n\n')}`
      : '';

    const fileListNote = files.length
      ? `\n\n## ALL FILES (use read_file to see content of any)\n${files
          .filter((f) => f.type !== 'folder')
          .map((f) => `- fileId="${f.fileId}"  ${f.fileName}`)
          .join('\n')}`
      : '';

    const webSearchNote = webSearch
      ? `\n\n## WEB SEARCH\nYou have access to a web search tool. Use it to look up current information when the user's request requires up-to-date knowledge beyond the project files.`
      : '';

    // ── Resolve model + tools ─────────────────────────────────────────────

    const model = resolveModel(modelId);
    const webSearchTools = resolveWebSearchTools(modelId, webSearch);

    // ── Stream ────────────────────────────────────────────────────────────

    const stream = streamText({
      model,
      system: dedent`
        ${selectedAgent?.prompt ?? 'You are an AI writing assistant inside Writepad.'}
        You have full awareness of the project and can read, edit, create, and delete any file.${rulesBlock}${directoryTree}${webSearchNote}

        ## TWO SEPARATE MECHANISMS — DO NOT MIX THEM

        ### 1. TOOL CALLS — for file/folder operations
        Use the actual tool functions for these actions. Never output XML for these.
        - **create_file** — create a new file or folder (you MUST call this as a tool, never write \`<create>\` XML)
        - **delete_file** — delete a file or folder (call as a tool, never write \`<delete_file>\` XML)
        - **read_file** — read file content (call as a tool). Pass \`topLines\` to read only the first N lines of large files.
        - **search_file** — grep-search within a file (call as a tool)

        ### 2. XML EDIT BLOCKS — for modifying existing file content
        Output these tags as literal text in your response. They are parsed by the client to propose line-level edits to existing files only.

        Replace lines startLine–endLine (1-indexed, inclusive):
        <edit fileId="FILE_ID" fileName="FILE_NAME" startLine="N" endLine="M" description="what and why">
        replacement line 1
        replacement line 2
        </edit>

        Insert after line N (afterLine="0" = prepend):
        <insert fileId="FILE_ID" fileName="FILE_NAME" afterLine="N" description="what and why">
        new line 1
        </insert>

        Delete lines N–M from an existing file:
        <delete fileId="FILE_ID" fileName="FILE_NAME" startLine="N" endLine="M" description="what and why"/>

        ## RULES
        - To CREATE a new file → call the \`create_file\` tool. Never write a \`<create>\` XML tag.
        - To DELETE a file → call the \`delete_file\` tool. Never write a \`<delete_file>\` XML tag.
        - To EDIT an existing file → use \`<edit>\`, \`<insert>\`, or \`<delete>\` XML blocks in your text.
        - Always emit actual XML edit blocks when modifying existing files — never just describe changes.
        - Use exact fileId values from the file list when writing edit blocks.
        - Line numbers in edit blocks are 1-indexed and inclusive.
        - Use \`read_file\` before editing if you need to see the current content.
        - When creating new files, always use proper Markdown formatting by default (headings, lists, bold/italic, code blocks, etc.) unless the user requests a different format.
        - Your own responses should also use Markdown formatting — headings, bullet points, bold, code blocks.${attachmentBlock}${fileListNote}
      `,
      messages: convertToModelMessages(modelMessages),
      tools: {
        ...ctx.next.agentAsTool('/read-file'),
        ...ctx.next.agentAsTool('/search-file'),
        ...ctx.next.agentAsTool('/create-file'),
        ...ctx.next.agentAsTool('/delete-file'),
        ...(useWrappedWebSearch ? ctx.next.agentAsTool('/web-search') : {}),
        ...webSearchTools,
      } as any,
      toolChoice: 'auto',
      maxOutputTokens: 4000,
      stopWhen: stepCountIs(8),

      onFinish: async ({ text, steps, usage }) => {
        if (debug) {
          const toolCalls = steps.reduce((n, s) => n + s.toolCalls.length, 0);
          console.log('[editor agent] finish', {
            textLength: text?.length ?? 0,
            stepCount: steps.length,
            toolCallCount: toolCalls,
            usage,
          });
        }

        // Track usage cost inline (no cron worker)
        trackUsage({ modelId, projectId, clientId, rawUsage: usage }).catch(
          (e) => console.error('[editor agent] Failed to track usage:', e),
        );

        if (!chatId) return;
        try {
          const col = await chatSessionsCol();
          const now = new Date();

          // Rebuild UIMessage parts from all steps so tool widgets persist
          // across reloads (same approach as the original editor route).
          const allParts: Array<Record<string, unknown>> = [];
          for (const step of steps) {
            for (const toolCall of step.toolCalls) {
              const toolResult = step.toolResults.find(
                (r) => r.toolCallId === toolCall.toolCallId,
              );
              if (toolResult) {
                allParts.push({
                  type: `tool-${toolCall.toolName}`,
                  toolCallId: toolCall.toolCallId,
                  state: 'output-available',
                  input: toolCall.input,
                  output: toolResult.output,
                });
              } else {
                allParts.push({
                  type: `tool-${toolCall.toolName}`,
                  toolCallId: toolCall.toolCallId,
                  state: 'output-error',
                  input: toolCall.input,
                  errorText: 'No result',
                });
              }
            }
            if (step.text) {
              allParts.push({ type: 'text', text: step.text });
            }
          }
          if (allParts.length === 0 && text) {
            allParts.push({ type: 'text', text });
          }

          const assistantMsg = {
            id: new ObjectId().toHexString(),
            role: 'assistant',
            content: text,
            parts: allParts,
            createdAt: now,
          };

          await col.updateOne(
            { _id: new ObjectId(chatId) },
            { $set: { messages: [...messages, assistantMsg], updatedAt: now } },
          );
        } catch (e) {
          console.error('[editor agent] Failed to persist chat:', e);
        }
      },
    });

    // Merge the streamText output into the AiRouter response stream
    if (!canEdit) {
      throw new Error('Forbidden: view-only members cannot run chat agents.');
    }

    ctx.response.merge(
      stream.toUIMessageStream({ sendFinish: true, sendStart: true }),
    );

    // Direct chat path streams to client; avoid consuming stream.text twice.
    if (isToolInvocation) {
      await stream.text;
      return { status: 'Editor response completed', _isFinal: true };
    }
    return;
  })

  // ── actAsTool: exposes editor as a composable tool for parent routers ─────
  .actAsTool('/', {
    id: 'editor',
    name: 'Writing Editor',
    description:
      'AI writing assistant with full project file awareness. Can read, search, create, and delete files. Proposes in-file edits as XML blocks that the user can accept or decline.',
    inputSchema: z.object({
      userRequest: z
        .string()
        .describe("The user's writing instruction or question"),
    }) as any,
    outputSchema: z.object({
      status: z.string().describe('Completion status of the editor response'),
    }) as any,
    metadata: { icon: '✍️', title: 'Writing Editor', hideUI: true },
  });
