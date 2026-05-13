/** Shared client-side comment type — serialised form of DbProjectComment. */
export interface ProjectComment {
  id: string;
  projectId: string;
  fileId: string;
  filePath: string;    // resolved from filePathMap on the server
  authorId: string;
  text: string;
  lineNumber: number;
  lineContent: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
  updatedAt: string;
}

export type CommentStatus = ProjectComment['status'];

export const COMMENT_STATUS_LABELS: Record<CommentStatus, string> = {
  open: 'Open',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};
