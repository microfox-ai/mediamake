import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MediamakeClient } from '../../../mediamake-mcp/src/client.js';
import { json, safe } from '../../../mediamake-mcp/src/util.js';
import { READ, WRITE } from './annotations.js';

type Role = 'owner' | 'editor' | 'viewer';

/** What a project role may do: every tool follows it. */
const CAN: Record<Role, { read: boolean; write: boolean; delete: boolean }> = {
  owner: { read: true, write: true, delete: true },
  editor: { read: true, write: true, delete: false },
  viewer: { read: true, write: false, delete: false },
};

function roleOf(project: { isOwned?: boolean; sharedRole?: Role }): Role {
  return project.isOwned ? 'owner' : (project.sharedRole ?? 'viewer');
}

/** A list's total, or why it couldn't be read (e.g. a public account). */
async function count(client: MediamakeClient, path: string, projectId: string) {
  try {
    return (await client.get(path, { projectId, limit: 1 })).total as number;
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export function registerProjectTools(server: McpServer, client: MediamakeClient) {
  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description: 'List your MediaMake projects (channels or brands), owned or shared with you, with your role on each: owner (everything), editor (read and upload, no deleting) or viewer (read only).',
      inputSchema: { search: z.string().optional(), tag: z.string().optional(), page: z.number().int().min(1).default(1), limit: z.number().int().min(1).max(100).default(50) },
      annotations: READ,
    },
    safe(async args => {
      // the route pages its answer only with a search or tag; otherwise it is the whole list
      const data = await client.get('/api/project', args);
      const list = Array.isArray(data) ? data : data.projects;
      return json({
        ...(Array.isArray(data) ? { total: list.length } : { pagination: data.pagination }),
        projects: list.map((p: { id: string; displayName: string; tags: string[]; isOwned?: boolean; sharedRole?: Role; updatedAt: string; brandKit?: unknown }) => ({
          id: p.id,
          name: p.displayName,
          tags: p.tags,
          role: roleOf(p),
          updatedAt: p.updatedAt,
          ...(p.brandKit ? { brandKit: p.brandKit } : {}),
        })),
      });
    }),
  );

  server.registerTool(
    'get_project',
    {
      title: 'Get project',
      description: 'One project: your role and what it lets you do, its brand kit summary, and how many productions, releases and media files it holds.',
      inputSchema: { projectId: z.string() },
      annotations: READ,
    },
    safe(async ({ projectId }) => {
      const project = await client.get('/api/project', { id: projectId });
      const role = roleOf(project);
      const [productions, releases, media] = await Promise.all([
        count(client, '/api/project/productions', projectId),
        count(client, '/api/project/releases', projectId),
        count(client, '/api/project/media', projectId),
      ]);
      return json({ ...project, role, can: CAN[role], counts: { productions, releases, media } });
    }),
  );

  server.registerTool(
    'create_project',
    {
      title: 'Create project',
      description: 'Create a project (a channel or brand). You own it: you can share it from MediaMake.',
      inputSchema: { displayName: z.string().min(1), tags: z.array(z.string()).optional() },
      annotations: WRITE,
    },
    safe(async ({ displayName, tags }) => json(await client.post('/api/project', { displayName, tags }))),
  );

  server.registerTool(
    'update_project',
    {
      title: 'Update project',
      description: "Rename a project or change its tags. Owners and editors can.",
      inputSchema: { projectId: z.string(), displayName: z.string().min(1).optional(), tags: z.array(z.string()).optional() },
      annotations: { ...WRITE, idempotentHint: true },
    },
    safe(async ({ projectId, displayName, tags }) => {
      if (displayName === undefined && tags === undefined) throw new Error('Give displayName and/or tags');
      const name = displayName ?? (await client.get('/api/project', { id: projectId })).displayName;
      return json(await client.put('/api/project', { id: projectId, displayName: name, tags }));
    }),
  );
}
