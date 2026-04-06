/**
 * POST /api/studio/chat/agent/editor
 *
 * Streaming AI writing assistant with full project awareness.
 *
 * Edit proposals are XML blocks in text (same approach as Cursor/Claude Code).
 * File operations (read, search, create, delete) are real async tools.
 *
 * Body: {
 *   messages:      UIMessage[]
 *   attachments:   ContextAttachment[]
 *   files:         ProjectFile[]          — all project files with current content
 *   writepadRules: string | null          — content of .writepad/rules.md if it exists
 * }
 */

import { google } from '@ai-sdk/google';
import { streamText, tool, jsonSchema, stepCountIs, convertToModelMessages, type UIMessage } from 'ai';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { projectFilesCol, chatSessionsCol } from '@/lib/db/collections';

export const maxDuration = 60;

interface ProjectFile {
  fileId: string;
  fileName: string;
  content: string;
  type?: 'file' | 'folder';
  parentId?: string | null;
}

// ── Directory tree builder ────────────────────────────────────────────────────

interface FlatNode {
  fileId: string;
  fileName: string;
  type?: 'file' | 'folder';
  parentId?: string | null;
}

/** Nested tree: children are full nodes so recursive `render` calls type-check. */
type TreeNode = FlatNode & { children: TreeNode[] };

function buildTreeString(files: FlatNode[]): string {
  const map = new Map<string, TreeNode>();
  for (const f of files) map.set(f.fileId, { ...f, children: [] });

  const roots: TreeNode[] = [];
  for (const f of files) {
    const node = map.get(f.fileId)!;
    if (f.parentId && map.has(f.parentId)) map.get(f.parentId)!.children.push(node);
    else roots.push(node);
  }

  function render(nodes: TreeNode[], prefix = ''): string {
    return nodes
      .map((n, i) => {
        const last = i === nodes.length - 1;
        const connector = last ? '└── ' : '├── ';
        const childPrefix = prefix + (last ? '    ' : '│   ');
        const line = prefix + connector + n.fileName;
        const childLines = n.children.length ? '\n' + render(n.children, childPrefix) : '';
        return line + childLines;
      })
      .join('\n');
  }

  return render(roots);
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    messages: UIMessage[];
    attachments?: Array<{ id: string; fileId: string; fileName: string; startLine: number; endLine: number; content: string }>;
    files?: ProjectFile[];
    writepadRules?: string | null;
    projectId?: string;
    chatId?: string;
  };

  const { messages = [], attachments = [], files = [], writepadRules, projectId, chatId } = body;
  const clientId = req.headers.get('x-client-id') ?? 'unknown';

  const fileMap = new Map(files.filter((f) => f.type !== 'folder').map((f) => [f.fileId, f]));

  // ── Build context blocks ────────────────────────────────────────────────────

  const directoryTree = files.length
    ? `\n\n## PROJECT FILES\n\`\`\`\n${buildTreeString(files)}\n\`\`\``
    : '';

  const rulesBlock = writepadRules
    ? `\n\n## .WRITEPAD RULES (always follow these)\n${writepadRules}`
    : '';

  const attachmentBlock = attachments.length
    ? `\n\n## ATTACHED EXCERPTS\n${attachments
        .map((a) => `fileId="${a.fileId}" file="${a.fileName}" lines ${a.startLine}–${a.endLine}\n\`\`\`\n${a.content}\n\`\`\``)
        .join('\n\n')}`
    : '';

  const fileListNote = files.length
    ? `\n\n## ALL FILES (use read_file to see content of any)\n${files.filter((f) => f.type !== 'folder').map((f) => `- fileId="${f.fileId}"  ${f.fileName}`).join('\n')}`
    : '';

  // ── Stream ──────────────────────────────────────────────────────────────────

  const result = streamText({
    model: google('gemini-pro-latest'),
    system: `You are an AI writing assistant inside Writepad, a creative writing IDE.
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
- Your own responses should also use Markdown formatting — headings, bullet points, bold, code blocks.${attachmentBlock}${fileListNote}`,

    messages: convertToModelMessages(messages),
    toolChoice: 'auto',
    maxOutputTokens: 4000,
    stopWhen: stepCountIs(8),

    onFinish: async ({ text, steps }) => {
      if (!chatId) return;
      try {
        const col = await chatSessionsCol();
        const now = new Date();

        // Rebuild UIMessage parts from all steps so tool widgets persist across reloads.
        // Each step may have tool calls (dynamic-tool parts) followed by text.
        const allParts: Array<Record<string, unknown>> = [];
        for (const step of steps) {
          for (const toolCall of step.toolCalls) {
            const toolResult = step.toolResults.find((r) => r.toolCallId === toolCall.toolCallId);
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

    tools: {
      read_file: tool({
        description: 'Read the full numbered content of a project file.',
        inputSchema: jsonSchema<{ fileId: string }>({
          type: 'object',
          properties: { fileId: { type: 'string', description: 'fileId of the file to read' } },
          required: ['fileId'],
        }),
        execute: async ({ fileId }) => {
          const file = fileMap.get(fileId);
          if (!file) return { error: `File not found: ${fileId}` };
          const numbered = file.content.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n');
          return { fileId, fileName: file.fileName, lineCount: file.content.split('\n').length, content: numbered };
        },
      }),

      search_file: tool({
        description: 'Search for text in a file. Returns matching lines with line numbers.',
        inputSchema: jsonSchema<{ fileId: string; query: string; caseSensitive?: boolean }>({
          type: 'object',
          properties: {
            fileId: { type: 'string' },
            query: { type: 'string', description: 'Text to search for' },
            caseSensitive: { type: 'boolean' },
          },
          required: ['fileId', 'query'],
        }),
        execute: async ({ fileId, query, caseSensitive = false }) => {
          const file = fileMap.get(fileId);
          if (!file) return { error: `File not found: ${fileId}` };
          const matches = file.content.split('\n')
            .map((line, i) => ({ lineNumber: i + 1, line }))
            .filter(({ line }) =>
              caseSensitive ? line.includes(query) : line.toLowerCase().includes(query.toLowerCase()),
            );
          return { fileId, fileName: file.fileName, query, matchCount: matches.length, matches };
        },
      }),

      create_file: tool({
        description: 'Create a new file or folder in the project. To create at root level omit parentId. To create inside a folder pass its fileId as parentId.',
        inputSchema: jsonSchema<{ name: string; type: 'file' | 'folder'; parentId?: string | null; initialContent?: string }>({
          type: 'object',
          properties: {
            name: { type: 'string', description: 'File or folder name (e.g. "chapter-02.md" or "scenes")' },
            type: { type: 'string', enum: ['file', 'folder'], description: '"file" for text files, "folder" for directories' },
            parentId: { type: 'string', description: 'fileId of the parent folder. Omit or leave empty to create at the project root.' },
            initialContent: { type: 'string', description: 'Initial text content for files. Use full Markdown by default.' },
          },
          required: ['name', 'type'],
        }),
        execute: async ({ name, type, parentId, initialContent = '' }) => {
          const resolvedParentId = parentId && parentId !== 'null' && parentId !== '' ? parentId : null;
          if (!projectId) return { error: 'projectId not provided' };
          try {
            const col = await projectFilesCol();
            const lastSibling = await col.findOne(
              { projectId, parentId: resolvedParentId },
              { sort: { order: -1 } },
            );
            const order = lastSibling ? lastSibling.order + 1 : 0;
            const now = new Date();
            const result = await col.insertOne({
              _id: new ObjectId(),
              projectId,
              name,
              type,
              parentId: resolvedParentId,
              content: type === 'file' ? initialContent : '',
              draft: null,
              order,
              createdAt: now,
              updatedAt: now,
            });
            return { success: true, fileId: result.insertedId.toHexString(), fileName: name, type, parentId: resolvedParentId };
          } catch (e) {
            return { error: String(e) };
          }
        },
      }),

      delete_file: tool({
        description: 'Delete a file or folder (and all its descendants) from the project.',
        inputSchema: jsonSchema<{ fileId: string }>({
          type: 'object',
          properties: { fileId: { type: 'string', description: 'fileId of the file or folder to delete' } },
          required: ['fileId'],
        }),
        execute: async ({ fileId }) => {
          if (!projectId) return { error: 'projectId not provided' };
          try {
            const col = await projectFilesCol();
            const file = await col.findOne({ _id: new ObjectId(fileId), projectId });
            if (!file) return { error: `File not found: ${fileId}` };

            const idsToDelete = [file._id];
            const queue = [fileId];
            while (queue.length) {
              const parentId = queue.shift()!;
              const children = await col.find({ projectId, parentId }).toArray();
              for (const child of children) {
                idsToDelete.push(child._id);
                if (child.type === 'folder') queue.push(child._id.toHexString());
              }
            }
            await col.deleteMany({ _id: { $in: idsToDelete } });
            return { success: true, fileName: file.name, deletedCount: idsToDelete.length };
          } catch (e) {
            return { error: String(e) };
          }
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
