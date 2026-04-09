import { ObjectId, type Collection } from 'mongodb';
import { getDb } from './mongodb';

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface DbProject {
  _id: ObjectId;
  name: string;
  description: string;
  /** e.g. 'screenplay' | 'novel' | 'short-story' | 'blog' | 'youtube' | 'other' */
  type: string;
  /** clientId of the owner (from session) */
  ownerId: string;
  members: Array<{ clientId: string; role: 'editor' | 'viewer' }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbProjectFile {
  _id: ObjectId;
  /** _id.toString() of the owning project */
  projectId: string;
  name: string;
  type: 'file' | 'folder';
  /** _id.toString() of the parent folder, or null for root level */
  parentId: string | null;
  /** Text content — empty string for folders */
  content: string;
  /** Staged draft content (null = no draft). AI edits land here; committed by saveFile. */
  draft: string | null;
  /** Sort order within the parent */
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbChatSession {
  _id: ObjectId;
  projectId: string;
  /** clientId of the user who owns this chat — each user has their own chat history */
  userId: string;
  title: string;
  /** AI SDK v5 UIMessage[] serialised as plain objects */
  messages: unknown[];
  messageMeta: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbProjectAgent {
  _id: ObjectId;
  projectId: string;
  name: string;
  prompt: string;
  /** Optional source template id when duplicated from local predefined agents */
  baseAgentId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Serialised (API-facing) shapes ──────────────────────────────────────────

export type ProjectDoc = Omit<DbProject, '_id'> & { id: string };
export type ProjectFileDoc = Omit<DbProjectFile, '_id'> & { id: string };
export type ChatSessionDoc = Omit<DbChatSession, '_id'> & { id: string };
export type ProjectAgentDoc = Omit<DbProjectAgent, '_id'> & { id: string };

// ─── Collection accessors ─────────────────────────────────────────────────────

export async function projectsCol(): Promise<Collection<DbProject>> {
  return (await getDb()).collection<DbProject>('projects');
}

export async function projectFilesCol(): Promise<Collection<DbProjectFile>> {
  return (await getDb()).collection<DbProjectFile>('project_files');
}

export async function chatSessionsCol(): Promise<Collection<DbChatSession>> {
  return (await getDb()).collection<DbChatSession>('project_chats');
}

export async function projectAgentsCol(): Promise<Collection<DbProjectAgent>> {
  return (await getDb()).collection<DbProjectAgent>('project_agents');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function toObjectId(id: string): ObjectId {
  return new ObjectId(id);
}

export function isValidId(id: string): boolean {
  return ObjectId.isValid(id);
}

/** Strip _id and expose it as `id: string`. */
export function serialize<T extends { _id: ObjectId }>(
  doc: T,
): Omit<T, '_id'> & { id: string } {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toHexString() } as Omit<T, '_id'> & { id: string };
}

/** Returns true if the clientId may read/write the project. */
export function hasAccess(project: DbProject, clientId: string): boolean {
  return (
    project.ownerId === clientId ||
    project.members.some((m) => m.clientId === clientId)
  );
}

/** Returns true if the clientId is the project owner. */
export function isOwner(project: DbProject, clientId: string): boolean {
  return project.ownerId === clientId;
}

export function getMemberRole(
  project: DbProject,
  clientId: string,
): 'owner' | 'editor' | 'viewer' | null {
  if (project.ownerId === clientId) return 'owner';
  const member = project.members.find((m) => m.clientId === clientId);
  return member ? member.role : null;
}

/** Returns true if caller can mutate project resources. */
export function canEditProject(project: DbProject, clientId: string): boolean {
  const role = getMemberRole(project, clientId);
  return role === 'owner' || role === 'editor';
}
