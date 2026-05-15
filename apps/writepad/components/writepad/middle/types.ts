export interface OpenTab {
  fileId: string;
  name: string;
  /** Current editor text — unsaved keystrokes on top of draft. Lost on refresh if not drafted. */
  content: string;
  /** Last committed/saved state (from DB). Revert-to-saved goes here. */
  savedContent: string;
  /**
   * Staged state — AI edits land here automatically, manual "Save Draft" also lands here.
   * null means no draft (content === savedContent when clean).
   * Like git staging area: finalised by "Save" or abandoned by "Revert Draft".
   */
  draftContent: string | null;
}

export interface SelectionContext {
  /** File ID used for AI tool-call targeting. Undefined when from context menu. */
  fileId?: string;
  file: string;
  /** E.g. "12-18" */
  lines: string;
  startLine?: number;
  endLine?: number;
  text: string;
}

export interface DiffViewState {
  fileId: string;
  fileName: string;
  original: string;
  modified: string;
  /** When true, show all changed files (unsaved + drafted) in a file-list diff view. */
  showAll?: boolean;
  /** Override label for the left (original) pane. */
  originalLabel?: string;
  /** Override label for the right (modified) pane. */
  modifiedLabel?: string;
}

/**
 * A local-wiki entry stored in .writepad/wiki/{term}.md
 * Terms are underlined in the editor, have hover tooltips, and are injected
 * into AI context as a project glossary.
 *
 * Frontmatter format (optional):
 * ```yaml
 * ---
 * aliases: [Alternate Name, Another Alias]
 * tags: [character, location, concept]
 * ---
 * ```
 */
export interface WikiTerm {
  /** The fileId of the .writepad/wiki/{term}.md file */
  fileId: string;
  /** Primary term name derived from the filename (kebab-case → spaces) */
  term: string;
  /** Additional names from the frontmatter `aliases:` array */
  aliases: string[];
  /**
   * All names that should trigger a match: [term, ...aliases].
   * Used by both the editor decorator and the preview linker.
   */
  allTerms: string[];
  /** First ~220 chars of the wiki body (after frontmatter + heading) — shown in hover tooltip */
  summary: string;
  /** Full raw markdown content of the wiki file */
  content: string;
  /** Optional tags from frontmatter `tags:` array */
  tags: string[];
}

/**
 * A single "Find All References" result for a wiki term across project files.
 */
export interface RefResult {
  fileId: string;
  filePath: string;
  lineNumber: number;
  lineText: string;
}

/** Data for VS Code-style commit diff view in the middle panel. */
export interface VcsCommitViewData {
  commitId: string;
  commitMessage: string;
  /** ID of the parent commit — used to fetch "before" content per file. */
  parentCommitId: string | null;
  changes: Array<{
    id: string;
    fileId: string;
    changeType: 'add' | 'modify' | 'delete' | 'rename';
    snapshot: { name: string; content: string; type: string; parentId: string | null; order: number; fileId: string } | null;
    previousFileId: string | null;
  }>;
}
