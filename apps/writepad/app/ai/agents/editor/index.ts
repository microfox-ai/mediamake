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
  generateText,
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
import { getLocalAgentTemplate, LOCAL_AGENT_TEMPLATES } from '@/lib/agent-templates';
import { tool } from 'ai';
import { readFileAgent } from './tools/readFile';
import { searchFileAgent } from './tools/searchFile';
import { createFileAgent } from './tools/createFile';
import { deleteFileAgent } from './tools/deleteFile';
import { autocompleteAgent } from './tools/autocomplete';
import { wordHelperAgent } from './tools/wordHelper';
import { webSearchAgent } from './tools/webSearch';
import { getBranchSnapshot } from '@/app/api/projects/[projectId]/vcs/_lib';

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

interface MediaAttachmentPayload {
  id: string;
  mediaId: string;
  filePath: string;
  fileName: string;
  contentType: string;
  contentMimeType: string;
}

interface PastChatContext {
  title: string;
  messages: UIMessage[];
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

// ── Plan file helpers ─────────────────────────────────────────────────────────

function slugifyPlanTitle(text: string): string {
  const firstHeading = text.split('\n').find((l) => /^#{1,3}\s/.test(l.trim()));
  const firstLine = firstHeading ?? text.split('\n').find((l) => l.trim()) ?? 'plan';
  const clean = firstLine.replace(/^#+\s*/, '').replace(/[^a-zA-Z0-9\s-]/g, '').trim().slice(0, 40);
  return clean.toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-') || 'plan';
}

async function createPlanFileInDB(projectId: string, planText: string): Promise<void> {
  const col = await projectFilesCol();
  const now = new Date();

  let writepadFolder = await col.findOne({ projectId, name: '.writepad', type: 'folder', parentId: null });
  if (!writepadFolder) {
    const lastRoot = await col.findOne({ projectId, parentId: null }, { sort: { order: -1 } });
    const r = await col.insertOne({
      _id: new ObjectId(),
      projectId,
      name: '.writepad',
      type: 'folder',
      parentId: null,
      content: '',
      draft: null,
      order: lastRoot ? lastRoot.order + 1 : 0,
      createdAt: now,
      updatedAt: now,
    });
    writepadFolder = await col.findOne({ _id: r.insertedId });
    if (!writepadFolder) return;
  }

  const writepadId = writepadFolder._id.toHexString();

  let plansFolder = await col.findOne({ projectId, name: 'plans', type: 'folder', parentId: writepadId });
  if (!plansFolder) {
    const lastChild = await col.findOne({ projectId, parentId: writepadId }, { sort: { order: -1 } });
    const r = await col.insertOne({
      _id: new ObjectId(),
      projectId,
      name: 'plans',
      type: 'folder',
      parentId: writepadId,
      content: '',
      draft: null,
      order: lastChild ? lastChild.order + 1 : 0,
      createdAt: now,
      updatedAt: now,
    });
    plansFolder = await col.findOne({ _id: r.insertedId });
    if (!plansFolder) return;
  }

  const plansFolderId = plansFolder._id.toHexString();
  const slug = slugifyPlanTitle(planText);
  const ts = now.toISOString().slice(0, 19).replace('T', '-').replace(/:/g, '-');
  const fileName = `${slug}-${ts}.md`;

  const lastPlan = await col.findOne({ projectId, parentId: plansFolderId }, { sort: { order: -1 } });
  await col.insertOne({
    _id: new ObjectId(),
    projectId,
    name: fileName,
    type: 'file',
    parentId: plansFolderId,
    content: planText,
    draft: null,
    order: lastPlan ? lastPlan.order + 1 : 0,
    createdAt: now,
    updatedAt: now,
  });
}

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
    const chatMode: string =
      typeof req.chatMode === 'string' && ['ask', 'agent', 'auto', 'plan'].includes(req.chatMode)
        ? req.chatMode
        : 'agent';
    // For auto mode we need all available agents to pick from
    let allProjectAgentsForAuto: Array<{ id: string; name: string; prompt: string }> = [];

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

      // For auto mode: load all project agents for the selection step
      if (chatMode === 'auto') {
        const agentsCol = await projectAgentsCol();
        const dbAgents = await agentsCol.find({ projectId }).toArray();
        allProjectAgentsForAuto = dbAgents.map((a) => ({
          id: `project:${a._id.toHexString()}`,
          name: a.name,
          prompt: (a as { prompt?: string }).prompt ?? '',
        }));
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
    ctx.state.contextBranches = Array.isArray(req.contextBranches) ? req.contextBranches as string[] : [];
    ctx.state.chatMode = chatMode;
    ctx.state.allProjectAgentsForAuto = allProjectAgentsForAuto;

    // ── Media attachments ──────────────────────────────────────────────────
    ctx.state.mediaAttachments = Array.isArray(req.mediaAttachments) ? req.mediaAttachments as MediaAttachmentPayload[] : [];

    // ── Past chat context ──────────────────────────────────────────────────
    const chatContextIds: string[] = Array.isArray(req.chatContextIds) ? req.chatContextIds as string[] : [];
    const pastChatContexts: PastChatContext[] = [];
    if (chatContextIds.length > 0 && projectId && req.clientId) {
      const chatCol = await chatSessionsCol();
      for (const chatId of chatContextIds.slice(0, 5)) { // cap at 5 referenced chats
        if (!ObjectId.isValid(chatId)) continue;
        const chat = await chatCol.findOne({ _id: new ObjectId(chatId), projectId, userId: req.clientId });
        if (chat) {
          pastChatContexts.push({
            title: chat.title,
            messages: (chat.messages ?? []) as UIMessage[],
          });
        }
      }
    }
    ctx.state.pastChatContexts = pastChatContexts;

    // ── Plan files context ─────────────────────────────────────────────────
    // Inject .writepad/plans/*.md files so all agents always have plan context.
    const writepadFolderNode = files.find(
      (f) => f.type === 'folder' && f.fileName.toLowerCase() === '.writepad' && f.parentId == null,
    );
    const plansFolderNode = writepadFolderNode
      ? files.find(
          (f) => f.type === 'folder' && f.fileName.toLowerCase() === 'plans' && f.parentId === writepadFolderNode.fileId,
        )
      : undefined;
    const planFiles: ProjectFile[] = plansFolderNode
      ? files.filter((f) => f.type === 'file' && f.parentId === plansFolderNode.fileId).slice(-5)
      : [];
    ctx.state.planFiles = planFiles;

    // ── Wiki entries context (.writepad/wiki/*.md) ─────────────────────────
    const wikiFolderNode = writepadFolderNode
      ? files.find(
          (f) =>
            f.type === 'folder' &&
            f.fileName.toLowerCase() === 'wiki' &&
            f.parentId === writepadFolderNode.fileId,
        )
      : undefined;
    const wikiFiles: ProjectFile[] = wikiFolderNode
      ? files.filter(
          (f) =>
            f.type === 'file' &&
            f.parentId === wikiFolderNode.fileId &&
            f.fileName.toLowerCase().endsWith('.md'),
        )
      : [];
    ctx.state.wikiFiles = wikiFiles;

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
    const chatMode: string = ctx.state.chatMode ?? 'agent';
    const modelDef = getModelDef(modelId);
    const useWrappedWebSearch = webSearch && modelDef.provider === 'google';
    const debug = process.env.NODE_ENV !== 'production';
    const modelMessages = sanitizeMessagesForModel(messages, 6000);

    if (!canEdit) {
      throw new Error('Forbidden: view-only members cannot run chat agents.');
    }

    const mediaAttachments: MediaAttachmentPayload[] = ctx.state.mediaAttachments ?? [];
    const pastChatContexts: PastChatContext[] = ctx.state.pastChatContexts ?? [];
    const planFiles: ProjectFile[] = ctx.state.planFiles ?? [];
    const wikiFiles: ProjectFile[] = ctx.state.wikiFiles ?? [];

    if (debug) {
      console.log('[editor agent] incoming messages:', summarizeMessages(messages));
      console.log('[editor agent] model messages:', summarizeMessages(modelMessages));
      console.log('[editor agent] chatMode:', chatMode);
      console.log('[editor agent] media:', mediaAttachments.length, 'past chats:', pastChatContexts.length);
    }

    // ── Build shared system-prompt context blocks ─────────────────────────

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

    const contextBranches: string[] = ctx.state.contextBranches ?? [];
    const branchReadTool = contextBranches.length > 0
      ? {
          read_branch_file: tool({
            description: 'Read the content of a file from a specific VCS branch. Only usable for branches the user explicitly granted access to.',
            parameters: z.object({
              branchName: z.string().describe('The VCS branch name to read from'),
              filePath: z.string().describe('The file name (e.g. "chapter1.md") to read'),
            }),
            execute: async ({ branchName, filePath }) => {
              if (!contextBranches.includes(branchName)) {
                return { error: `Branch "${branchName}" is not in the accessible branches list.` };
              }
              if (!projectId) return { error: 'No project context.' };
              const snapshot = await getBranchSnapshot(projectId, branchName);
              for (const [, file] of snapshot.entries()) {
                if (file && file.name === filePath) {
                  return { found: true, branchName, fileName: file.name, content: file.content };
                }
              }
              const available = [...snapshot.entries()]
                .filter(([, f]) => f && f.type === 'file')
                .map(([, f]) => f!.name);
              return { found: false, available };
            },
          }),
        }
      : {};

    // ── Past chat context block ───────────────────────────────────────────
    const pastChatBlock = pastChatContexts.length > 0
      ? `\n\n## REFERENCED PAST CONVERSATIONS\nThe user has shared ${pastChatContexts.length} past chat(s) as context:\n\n${pastChatContexts.map((c) => {
          const msgs = (c.messages as UIMessage[]).slice(-30);
          const formatted = msgs.map((m) => {
            const textPart = m.parts?.find((p) => p.type === 'text');
            const text = (textPart as { type: 'text'; text: string } | undefined)?.text ?? '';
            return `${m.role === 'user' ? 'User' : 'Assistant'}: ${text.slice(0, 600)}`;
          }).join('\n');
          return `### Chat: "${c.title}"\n${formatted}`;
        }).join('\n\n')}`
      : '';

    // ── Active plan files block ───────────────────────────────────────────
    const planBlock = planFiles.length > 0
      ? `\n\n## ACTIVE PLANS (.writepad/plans/)\nThe following plan(s) were created by Plan mode. Use them as the authoritative task list for this project:\n\n${planFiles.map((f) => `### ${f.fileName}\n${f.content}`).join('\n\n---\n\n')}`
      : '';

    // ── Wiki system description (always present) ─────────────────────────
    // Explains the local wiki structure so the AI knows how to read, write,
    // and reference wiki entries even when no wiki files exist yet.
    const wikiSystemBlock = `\n\n## LOCAL WIKI SYSTEM (.writepad/wiki/)
This project uses a built-in local wiki to define terms, characters, locations, concepts, and world-building elements.

**How it works:**
- Each file \`.writepad/wiki/{term-in-kebab-case}.md\` defines one term (e.g. \`quantum-drive.md\` → term "quantum drive").
- The term name is derived from the filename: lowercase, hyphens replaced with spaces.
- **Aliases** — additional names that also link to the same wiki entry — are declared in YAML frontmatter.
- Defined terms AND their aliases are automatically underlined in the editor and linked in the preview panel.
- Ctrl+click on an underlined term opens the wiki file. The hover tooltip shows the summary + alias/tag info.

**Correct entry format (with optional frontmatter):**
\`\`\`markdown
---
aliases: [Alternate Name, Another Alias]
tags: [character, location, concept]
---

# Term Name
One to three sentence summary. Self-contained; assume zero prior context. This becomes the hover tooltip.

## Details
Longer explanation, backstory, rules, or nuance.

## See Also
- related-term.md
\`\`\`

**Rules:**
- The summary MUST be the first paragraph after \`# Heading\` (no sub-heading above it).
- Aliases are matched case-insensitively as whole words everywhere in the project.
- Tags are displayed in the tooltip and in the Refs sidebar.
- Creating a wiki entry: call \`create_file\` with the **\`path\`** parameter = \`.writepad/wiki/{kebab-term}.md\` and \`initialContent\` = the full entry text. Always use \`path\` — never \`name\` + \`parentId\`.
- Editing an entry: call \`read_file\` first, then emit \`<edit>\` XML blocks.
- When writing or editing project files: treat wiki definitions as the authoritative meaning for those terms.`;

    // ── Wiki index block ──────────────────────────────────────────────────
    // Lists only the term names + fileIds. The AI calls read_file when it
    // needs the full definition — avoids bloating the prompt with content
    // the model may never need.
    const wikiBlock = wikiFiles.length > 0
      ? `\n\n## PROJECT WIKI — ${wikiFiles.length} entr${wikiFiles.length !== 1 ? 'ies' : 'y'} (.writepad/wiki/)\nThe following terms are defined in this project's wiki. Use \`read_file\` with the fileId to read a specific entry when you need its full definition, aliases, or details:\n\n${wikiFiles
          .map((f) => `- fileId="${f.fileId}"  ${f.fileName.replace(/\.md$/i, '').replace(/-/g, ' ')}`)
          .join('\n')}`
      : '';

    // ── Media context block ───────────────────────────────────────────────
    const mediaContextBlock = mediaAttachments.length > 0
      ? `\n\n## ATTACHED MEDIA\nThe user has attached the following media files for analysis:\n${mediaAttachments.map((m) =>
          `- [${m.contentType}] ${m.fileName} — ${m.filePath}${m.contentMimeType ? ` (${m.contentMimeType})` : ''}`
        ).join('\n')}`
      : '';

    // ── Inject image parts into last user message (vision models) ─────────
    const imageAttachments = mediaAttachments.filter(
      (m) => m.contentType === 'image' && m.contentMimeType?.startsWith('image/') && m.filePath?.startsWith('http'),
    );

    function buildFinalMessages(baseMessages: UIMessage[]) {
      const converted = convertToModelMessages(baseMessages);
      if (imageAttachments.length === 0) return converted;
      // Find last user message index
      let lastUserIdx = -1;
      for (let i = converted.length - 1; i >= 0; i--) {
        if (converted[i].role === 'user') { lastUserIdx = i; break; }
      }
      if (lastUserIdx === -1) return converted;
      const msg = converted[lastUserIdx];
      const existingContent: unknown[] = typeof msg.content === 'string'
        ? [{ type: 'text', text: msg.content }]
        : [...(msg.content as unknown[])];
      const imageParts = imageAttachments.map((img) => ({
        type: 'image' as const,
        image: new URL(img.filePath),
        mimeType: img.contentMimeType as `image/${string}`,
      }));
      return [
        ...converted.slice(0, lastUserIdx),
        { ...msg, content: [...existingContent, ...imageParts] },
        ...converted.slice(lastUserIdx + 1),
      ];
    }

    const model = resolveModel(modelId);
    const webSearchTools = resolveWebSearchTools(modelId, webSearch);

    // ── Shared onFinish persistence ───────────────────────────────────────

    const makeOnFinish = (msgs: UIMessage[], { savePlanFile = false } = {}) =>
      async ({ text, steps, usage }: { text: string; steps: any[]; usage: any }) => {
        if (debug) {
          const toolCalls = steps.reduce((n: number, s: any) => n + s.toolCalls.length, 0);
          console.log('[editor agent] finish', { chatMode, textLength: text?.length ?? 0, stepCount: steps.length, toolCallCount: toolCalls, usage });
        }

        trackUsage({ modelId, projectId, clientId, rawUsage: usage }).catch(
          (e) => console.error('[editor agent] Failed to track usage:', e),
        );

        if (!chatId) return;
        try {
          const col = await chatSessionsCol();
          const now = new Date();

          const allParts: Array<Record<string, unknown>> = [];
          for (const step of steps) {
            for (const toolCall of step.toolCalls) {
              const toolResult = step.toolResults.find(
                (r: any) => r.toolCallId === toolCall.toolCallId,
              );
              if (toolResult) {
                allParts.push({ type: `tool-${toolCall.toolName}`, toolCallId: toolCall.toolCallId, state: 'output-available', input: toolCall.input, output: toolResult.output });
              } else {
                allParts.push({ type: `tool-${toolCall.toolName}`, toolCallId: toolCall.toolCallId, state: 'output-error', input: toolCall.input, errorText: 'No result' });
              }
            }
            if (step.text) allParts.push({ type: 'text', text: step.text });
          }
          if (allParts.length === 0 && text) allParts.push({ type: 'text', text });

          const assistantMsg = { id: new ObjectId().toHexString(), role: 'assistant', content: text, parts: allParts, createdAt: now };
          await col.updateOne({ _id: new ObjectId(chatId) }, { $set: { messages: [...msgs, assistantMsg], updatedAt: now } });
        } catch (e) {
          console.error('[editor agent] Failed to persist chat:', e);
        }

        if (savePlanFile && text && projectId) {
          try {
            await createPlanFileInDB(projectId, text);
            if (debug) console.log('[editor agent] plan file created in .writepad/plans/');
          } catch (e) {
            console.error('[editor agent] Failed to create plan file:', e);
          }
        }
      };

    // ── ASK mode: conversational only, no tools ───────────────────────────

    if (chatMode === 'ask') {
      const selectedAgent = ctx.state.selectedAgent as ResolvedAgent | undefined;
      const stream = streamText({
        model,
        system: dedent`
          ${selectedAgent?.prompt ?? 'You are a helpful AI writing assistant inside Writepad.'}
          ${rulesBlock}

          ## ASK MODE
          You are in Ask mode. Respond conversationally and helpfully.
          - Do NOT propose file edits, create files, or use any tools.
          - Do NOT output XML edit blocks (<edit>, <insert>, <delete>).
          - Provide clear, thoughtful answers, explanations, or suggestions.
          - Use Markdown formatting in your replies.${attachmentBlock}${planBlock}${wikiSystemBlock}${wikiBlock}${pastChatBlock}${mediaContextBlock}
        `,
        messages: buildFinalMessages(modelMessages),
        maxOutputTokens: 4000,
        onFinish: makeOnFinish(messages),
      });

      ctx.response.merge(stream.toUIMessageStream({ sendFinish: true, sendStart: true }));
      if (isToolInvocation) { await stream.text; return { status: 'Ask response completed', _isFinal: true }; }
      return;
    }

    // ── PLAN mode: structured planning, read-only tools ───────────────────

    if (chatMode === 'plan') {
      const selectedAgent = ctx.state.selectedAgent as ResolvedAgent | undefined;
      const webSearchNote = webSearch
        ? `\n\n## WEB SEARCH\nYou may use web search to research context for the plan.`
        : '';
      const branchAccessNote = contextBranches.length > 0
        ? `\n\n## BRANCH ACCESS\nYou can read files from these branches to inform your plan: ${contextBranches.map((b) => `"${b}"`).join(', ')}.`
        : '';

      const stream = streamText({
        model,
        system: dedent`
          ${selectedAgent?.prompt ?? 'You are a helpful AI writing assistant inside Writepad.'}
          ${rulesBlock}${directoryTree}${webSearchNote}${branchAccessNote}

          ## PLAN MODE
          You are in Plan mode. Your job is to create a clear, actionable plan — NOT to make any changes yet.

          **Output format:**
          - Start with a brief summary of the goal (1-2 sentences).
          - Then produce a numbered step-by-step plan.
          - Each step should be a concrete action: "Create file X", "Edit section Y in file Z", "Add chapter about W", etc.
          - Format steps as a Markdown task list: \`- [ ] Step description\`
          - Group related steps under Markdown headings if the plan is complex.
          - End with any open questions or decisions the user should make before execution.

          **Rules:**
          - Do NOT output XML edit blocks (<edit>, <insert>, <delete>).
          - Do NOT create or modify any files — plan only.
          - You MAY use read_file and search_file to understand the current state of the project before planning.
          - Keep the plan specific, not vague. Each step should be actionable by the Agent mode.${attachmentBlock}${fileListNote}${planBlock}${wikiSystemBlock}${wikiBlock}${pastChatBlock}${mediaContextBlock}
        `,
        messages: buildFinalMessages(modelMessages),
        tools: {
          ...ctx.next.agentAsTool('/read-file'),
          ...ctx.next.agentAsTool('/search-file'),
          ...(useWrappedWebSearch ? ctx.next.agentAsTool('/web-search') : {}),
          ...webSearchTools,
          ...branchReadTool,
        } as any,
        toolChoice: 'auto',
        maxOutputTokens: 4000,
        stopWhen: stepCountIs(4),
        onFinish: makeOnFinish(messages, { savePlanFile: true }),
      });

      ctx.response.merge(stream.toUIMessageStream({ sendFinish: true, sendStart: true }));
      if (isToolInvocation) { await stream.text; return { status: 'Plan completed', _isFinal: true }; }
      return;
    }

    // ── AUTO mode: pick the best agent, then run full agent tools ─────────

    let selectedAgent = ctx.state.selectedAgent as ResolvedAgent | undefined;

    if (chatMode === 'auto') {
      const allProjectAgentsForAuto: Array<{ id: string; name: string; prompt: string }> =
        ctx.state.allProjectAgentsForAuto ?? [];
      const localAgentsList = LOCAL_AGENT_TEMPLATES.map((a) => ({
        id: `local:${a.id}`,
        name: a.name,
        description: a.description,
      }));
      const projectAgentsList = allProjectAgentsForAuto.map((a) => ({
        id: a.id,
        name: a.name,
        description: '(custom project agent)',
      }));
      const allAgents = [...localAgentsList, ...projectAgentsList];

      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
      const userRequest = lastUserMsg?.parts.find((p: any) => p.type === 'text')?.text ?? '';

      if (userRequest && allAgents.length > 0) {
        try {
          const agentListText = allAgents
            .map((a, i) => `${i + 1}. id="${a.id}" name="${a.name}" — ${a.description}`)
            .join('\n');

          const { text: pickedId } = await generateText({
            model,
            system: 'You are an agent selector. Given a user request and a list of agents, reply with ONLY the id of the most suitable agent — nothing else. No explanation, no quotes, just the id string.',
            prompt: `User request: "${userRequest}"\n\nAvailable agents:\n${agentListText}\n\nPick the best agent id:`,
            maxOutputTokens: 60,
          });

          const cleanedId = pickedId.trim().replace(/^["']|["']$/g, '');
          const match = allAgents.find((a) => a.id === cleanedId);
          if (match) {
            // Resolve the matched agent to a full ResolvedAgent
            if (cleanedId.startsWith('project:')) {
              const found = allProjectAgentsForAuto.find((a) => a.id === cleanedId);
              if (found) {
                selectedAgent = { id: found.id, name: found.name, prompt: found.prompt, kind: 'project' };
              }
            } else {
              const localId = cleanedId.startsWith('local:') ? cleanedId.slice('local:'.length) : cleanedId;
              const tmpl = getLocalAgentTemplate(localId);
              if (tmpl) selectedAgent = { id: `local:${tmpl.id}`, name: tmpl.name, prompt: tmpl.prompt, kind: 'local' };
            }
            if (debug) console.log('[editor agent] auto-selected agent:', selectedAgent?.id);
          }
        } catch (e) {
          console.error('[editor agent] Auto agent selection failed, using default:', e);
        }
      }
    }

    // ── AGENT mode (and AUTO after agent resolution): full tools ──────────

    const webSearchNote = webSearch
      ? `\n\n## WEB SEARCH\nYou have access to a web search tool. Use it to look up current information when the user's request requires up-to-date knowledge beyond the project files.`
      : '';
    const branchAccessNote = contextBranches.length > 0
      ? `\n\n## ADDITIONAL BRANCH ACCESS\nThe user has granted you read access to these VCS branches: ${contextBranches.map((b) => `"${b}"`).join(', ')}. Use the \`read_branch_file\` tool to read files from those branches by their file name.`
      : '';

    const modeLabel = chatMode === 'auto'
      ? `\n\n## AUTO MODE\nYou were automatically selected as the best agent for this request. Proceed with full capability.`
      : '';

    const stream = streamText({
      model,
      system: dedent`
        ${selectedAgent?.prompt ?? 'You are an AI writing assistant inside Writepad.'}
        You have full awareness of the project and can read, edit, create, and delete any file.${rulesBlock}${directoryTree}${webSearchNote}${branchAccessNote}${modeLabel}

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
        - Your own responses should also use Markdown formatting — headings, bullet points, bold, code blocks.${attachmentBlock}${fileListNote}${planBlock}${wikiSystemBlock}${wikiBlock}${pastChatBlock}${mediaContextBlock}
      `,
      messages: buildFinalMessages(modelMessages),
      tools: {
        ...ctx.next.agentAsTool('/read-file'),
        ...ctx.next.agentAsTool('/search-file'),
        ...ctx.next.agentAsTool('/create-file'),
        ...ctx.next.agentAsTool('/delete-file'),
        ...(useWrappedWebSearch ? ctx.next.agentAsTool('/web-search') : {}),
        ...webSearchTools,
        ...branchReadTool,
      } as any,
      toolChoice: 'auto',
      maxOutputTokens: 4000,
      stopWhen: stepCountIs(8),
      onFinish: makeOnFinish(messages),
    });

    ctx.response.merge(stream.toUIMessageStream({ sendFinish: true, sendStart: true }));
    if (isToolInvocation) { await stream.text; return { status: 'Editor response completed', _isFinal: true }; }
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
