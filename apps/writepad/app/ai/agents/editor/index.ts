/**
 * Editor Agent — /editor
 *
 * Streaming AI writing assistant with full project awareness.
 * Mounted at /editor in the main AiRouter and reached via
 * POST /api/studio/chat/agent/editor → [...slug] → aiMainRouter.
 *
 * Architecture:
 *  - before('/') middleware parses request payload into ctx.state
 *  - Four tool sub-agents (read-file, search-file, create-file, delete-file)
 *    are mounted as AiRouter instances and exposed via actAsTool so that
 *    the orchestrator can attach them to streamText with agentAsTool().
 *  - Main agent at '/' orchestrates via streamText, merges the stream into
 *    ctx.response, persists the chat on finish.
 */

import { google } from '@ai-sdk/google';
import { AiRouter, type AiMiddleware } from '@microfox/ai-router';
import { z } from 'zod';
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from 'ai';
import dedent from 'dedent';
import { ObjectId } from 'mongodb';
import { chatSessionsCol } from '@/lib/db/collections';
import { readFileAgent } from './tools/readFile';
import { searchFileAgent } from './tools/searchFile';
import { createFileAgent } from './tools/createFile';
import { deleteFileAgent } from './tools/deleteFile';

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

// ── Agent ─────────────────────────────────────────────────────────────────────

const aiRouter = new AiRouter();

export const editorAgent = aiRouter
  // ── Tool sub-agents (each is an AiRouter that actAsTool) ──────────────────
  .agent('/read-file', readFileAgent)
  .agent('/search-file', searchFileAgent)
  .agent('/create-file', createFileAgent)
  .agent('/delete-file', deleteFileAgent)

  // ── Before middleware: populate ctx.state from request payload ────────────
  .before('/', (async (ctx, next) => {
    const req = ctx.request as any;
    const files: ProjectFile[] = req.files ?? [];

    // Build fileMap so read/search sub-agents can resolve fileId → content
    ctx.state.fileMap = new Map(
      files
        .filter((f) => f.type !== 'folder')
        .map((f) => [f.fileId, f]),
    );
    ctx.state.projectId = req.projectId;
    ctx.state.chatId = req.chatId;
    ctx.state.files = files;
    ctx.state.attachments = req.attachments ?? [];
    ctx.state.writepadRules = req.writepadRules ?? null;

    return next();
  }) as AiMiddleware<any, any, any, any, any>)

  // ── Main orchestrator ──────────────────────────────────────────────────────
  .agent('/', async (ctx) => {
    ctx.response.writeMessageMetadata({ loader: 'Thinking...' });

    const files: ProjectFile[] = ctx.state.files ?? [];
    const attachments: ContextAttachment[] = ctx.state.attachments ?? [];
    const writepadRules: string | null = ctx.state.writepadRules ?? null;
    const messages: UIMessage[] = ctx.request.messages ?? [];
    const chatId: string | undefined = ctx.state.chatId;

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

    // ── Stream ────────────────────────────────────────────────────────────

    const stream = streamText({
      model: google('gemini-pro-latest'),
      system: dedent`
        You are an AI writing assistant inside Writepad, a creative writing IDE.
        You have full awareness of the project and can read, edit, create, and delete any file.${rulesBlock}${directoryTree}

        ## TWO SEPARATE MECHANISMS — DO NOT MIX THEM

        ### 1. TOOL CALLS — for file/folder operations
        Use the actual tool functions for these actions. Never output XML for these.
        - **create_file** — create a new file or folder (you MUST call this as a tool, never write \`<create>\` XML)
        - **delete_file** — delete a file or folder (call as a tool, never write \`<delete_file>\` XML)
        - **read_file** — read file content (call as a tool)
        - **search_file** — search within a file (call as a tool)

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
      messages: convertToModelMessages(messages),
      tools: {
        // Each sub-agent is attached as a real AI SDK tool via actAsTool.
        // The LLM calls these tools; the router dispatches to the sub-agent.
        ...ctx.next.agentAsTool('/read-file'),
        ...ctx.next.agentAsTool('/search-file'),
        ...ctx.next.agentAsTool('/create-file'),
        ...ctx.next.agentAsTool('/delete-file'),
      },
      toolChoice: 'auto',
      maxOutputTokens: 4000,
      stopWhen: stepCountIs(8),

      onFinish: async ({ text, steps }) => {
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
    ctx.response.merge(
      stream.toUIMessageStream({ sendFinish: false, sendStart: true }),
    );

    // Await completion so onFinish runs before this handler returns
    await stream.text;

    return { status: 'Editor response completed', _isFinal: true };
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
