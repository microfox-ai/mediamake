# Writepad — AI Context & Prompt Reference

This document describes exactly what is sent to the AI in each of Writepad's two AI pipelines: **editor chat** and **inline autocomplete**. Every field, condition, and limit is listed.

---

## 1. Editor Chat — `/api/studio/chat/agent/editor`

### Request body (sent by client on every message)

```typescript
{
  messages:      UIMessage[];        // full conversation history
  attachments?:  ContextAttachment[]; // user-pinned code excerpts
  files?:        ProjectFile[];       // ALL project files (files + folders)
  writepadRules?: string | null;      // content of .writepad/rules.md if it exists
  projectId?:    string;
  chatId?:       string;             // for server-side persistence in onFinish
}
```

Where `ProjectFile` is:
```typescript
{
  fileId:    string;
  fileName:  string;
  content:   string;        // current saved content (not draft)
  type?:     'file' | 'folder';
  parentId?: string | null;
}
```

And `ContextAttachment` is:
```typescript
{
  id:        string;
  fileId:    string;
  fileName:  string;
  startLine: number;
  endLine:   number;
  content:   string;   // the actual text of those lines
}
```

---

### System prompt assembly

The system prompt is built by concatenating these blocks **in order**:

```
[base identity]
[rulesBlock?]
[directoryTree?]
[mechanism instructions]
[xml format specs]
[rules list]
[attachmentBlock?]
[fileListNote?]
```

#### Block 1 — Base identity (always present)

```
You are an AI writing assistant inside Writepad, a creative writing IDE.
You have full awareness of the project and can read, edit, create, and delete any file.
```

#### Block 2 — `.writepad/rules.md` (conditional)

**Condition:** client finds a root-level folder named `.writepad` that contains a file named `rules.md`.

**Resolved on client** in `ChatSession.tsx`:
```typescript
const writepadFolder = files.find(
  (f) => f.type === 'folder' && f.fileName.toLowerCase() === '.writepad' && f.parentId === null,
);
const rulesFile = writepadFolder
  ? files.find(
      (f) => f.type === 'file' && f.fileName.toLowerCase() === 'rules.md' && f.parentId === writepadFolder.fileId,
    )
  : undefined;
```

**Injected as:**
```
## .WRITEPAD RULES (always follow these)
{full content of rules.md}
```

Use this file to give the AI project-specific instructions: style guide, character names, world-building rules, formatting conventions, etc.

#### Block 3 — Directory tree (conditional)

**Condition:** `files.length > 0`

**Format:** ASCII tree of all nodes (files and folders), built by `buildTreeString()`.

```
## PROJECT FILES
```
{tree}
```
```

**Tree example:**
```
├── chapter-01.md
├── chapter-02.md
├── scenes
│   ├── scene-01.md
│   └── scene-02.md
└── .writepad
    └── rules.md
```

The tree includes **all nodes** including folders. The AI uses this to understand structure before deciding where to create new files.

#### Block 4 — Mechanism instructions (always present)

Explains the two output modes and strictly separates them:

```
## TWO SEPARATE MECHANISMS — DO NOT MIX THEM

### 1. TOOL CALLS — for file/folder operations
Use the actual tool functions for these actions. Never output XML for these.
- create_file — create a new file or folder
- delete_file — delete a file or folder
- read_file   — read file content
- search_file — search within a file

### 2. XML EDIT BLOCKS — for modifying existing file content
Output these tags as literal text in your response.
They are parsed by the client to propose line-level edits to existing files only.
```

#### Block 5 — XML edit format specs (always present)

Exact schemas for the three XML edit types:

**Replace lines (edit):**
```xml
<edit fileId="FILE_ID" fileName="FILE_NAME" startLine="N" endLine="M" description="what and why">
replacement line 1
replacement line 2
</edit>
```

**Insert after line N (insert):**
```xml
<insert fileId="FILE_ID" fileName="FILE_NAME" afterLine="N" description="what and why">
new line 1
</insert>
```
- `afterLine="0"` means prepend (before line 1)

**Delete lines (delete):**
```xml
<delete fileId="FILE_ID" fileName="FILE_NAME" startLine="N" endLine="M" description="what and why"/>
```

All line numbers are **1-indexed, inclusive**.

#### Block 6 — Rules list (always present)

```
## RULES
- To CREATE a new file → call the `create_file` tool. Never write a <create> XML tag.
- To DELETE a file → call the `delete_file` tool. Never write a <delete_file> XML tag.
- To EDIT an existing file → use <edit>, <insert>, or <delete> XML blocks in your text.
- Always emit actual XML edit blocks when modifying existing files — never just describe changes.
- Use exact fileId values from the file list when writing edit blocks.
- Line numbers in edit blocks are 1-indexed and inclusive.
- Use `read_file` before editing if you need to see the current content.
- When creating new files, always use proper Markdown formatting by default.
- Your own responses should also use Markdown formatting.
```

#### Block 7 — Attached excerpts (conditional)

**Condition:** user has attached one or more code/text selections (via Ctrl+L in the editor).

**Format:**
```
## ATTACHED EXCERPTS
fileId="abc123" file="chapter-01.md" lines 14–22
```
{exact content of lines 14–22}
```

fileId="xyz789" file="outline.md" lines 1–5
```
{exact content of lines 1–5}
```
```

Each attachment preserves the exact lines the user highlighted. The AI can use `fileId` to reference this file in edit blocks.

#### Block 8 — File index (conditional)

**Condition:** `files.length > 0`

**Includes only files** (folders excluded):

```
## ALL FILES (use read_file to see content of any)
- fileId="abc123"  chapter-01.md
- fileId="def456"  chapter-02.md
- fileId="ghi789"  outline.md
```

The AI uses `fileId` values from this list in XML edit blocks and tool calls. **Content is not included** here — the AI must call `read_file` to see it.

---

### Messages

```typescript
messages: convertToModelMessages(messages)
```

Full conversation history converted from AI SDK v5 `UIMessage[]` format to model messages. Includes all prior user and assistant turns.

**User message content** is built in `ChatSession.tsx` from `RichSegment[]`:
- Text segments → plain text
- Attachment segments → `[fileName:L{start}-{end}]` reference tags

---

### Tools (server-executed)

All tools run on the server during streaming. The AI can call them mid-response; each call counts as one step toward the 8-step limit.

#### `read_file`

```typescript
input:  { fileId: string }
output: {
  fileId:    string;
  fileName:  string;
  lineCount: number;
  content:   string;  // numbered: "1: line one\n2: line two\n..."
}
```

Returns the **full content** with **1-indexed line numbers** prepended to each line. The AI uses these numbers to write accurate `startLine`/`endLine` values in XML edit blocks.

**Source:** the `files` array sent in the request body — this is a **snapshot** of saved content at send time, not a live DB read.

#### `search_file`

```typescript
input: {
  fileId:        string;
  query:         string;
  caseSensitive?: boolean;  // default: false
}
output: {
  fileId:     string;
  fileName:   string;
  query:      string;
  matchCount: number;
  matches:    Array<{ lineNumber: number; line: string }>;
}
```

Returns matching lines with their line numbers.

#### `create_file`

```typescript
input: {
  name:            string;               // e.g. "chapter-03.md" or "scenes"
  type:            'file' | 'folder';
  parentId?:       string | null;        // omit for root level
  initialContent?: string;              // default: ''
}
output: {
  success:  boolean;
  fileId:   string;   // MongoDB ObjectId of new document
  fileName: string;
  type:     'file' | 'folder';
  parentId: string | null;
}
```

**Writes to MongoDB.** Inserts a new document into `projectFiles` collection. `order` is set to `lastSibling.order + 1` (appended after existing siblings).

`parentId` guard: `"null"` and `""` strings are treated as `null` (root level) to handle model quirks.

After the AI finishes, `refreshFiles()` is called on the client to pull the new file into the UI state.

#### `delete_file`

```typescript
input:  { fileId: string }
output: {
  success:      boolean;
  fileName:     string;
  deletedCount: number;  // includes all descendants if folder
}
```

**Writes to MongoDB.** Recursively collects all descendant IDs and calls `deleteMany`. `deletedCount` counts all deleted documents.

---

### Model parameters

| Parameter | Value |
|-----------|-------|
| Model | `gemini-pro-latest` |
| Max output tokens | 4,000 |
| Max steps | 8 (via `stopWhen: stepCountIs(8)`) |
| Tool choice | `auto` |
| Temperature | (model default) |

---

### Server-side persistence (`onFinish`)

After streaming completes, `onFinish` is called with `{ text, steps }`.

Parts are reconstructed from `steps` in order:

```
for each step:
  for each toolCall in step.toolCalls:
    → push { type: 'tool-{toolName}', state: 'output-available'|'output-error', input, output }
  if step.text:
    → push { type: 'text', text: step.text }
```

The assembled `assistantMsg` (with full parts) is appended to the chat session in MongoDB via `updateOne`. This ensures tool widgets (`ToolWidget` in `ChatMessage.tsx`) survive page reload.

---

### File content priority

`getAllFiles()` resolves each file's content with this priority before sending:

```
unsaved editor content  (file is open in a tab with uncommitted keystrokes)
  → draft content       (staged AI/manual draft saved to DB)
    → saved content     (committed to DB)
```

So the AI always sees the **most current version** of every file, including in-progress unsaved edits in open tabs and any staged drafts in closed ones. It never sees stale committed content when newer content exists.

### What the AI does NOT receive

- File content proactively — it receives only the file index (name + fileId); it must call `read_file` to see the actual text of any specific file
- The user's editor cursor position or selection (attachments are explicit only — user must press Ctrl+L to attach a selection)

---

## 2. Inline Autocomplete — `/api/studio/chat/agent/editor/autocomplete`

### Request body

```typescript
{
  prefix:    string;  // text before cursor, truncated to last 2,000 chars
  suffix:    string;  // text after cursor, truncated to first 500 chars
  fileName?: string;  // unused in prompt, kept for future use
}
```

**Minimum:** if `prefix.trim().length < 8`, the server returns `{ completion: '' }` immediately — no model call.

---

### Prompt

Simple fill-in-the-middle — the AI decides everything (spacing, newlines, word completion, continuation style):

```
You are a creative writing assistant. Continue the text exactly where the author left off.

The text before the cursor:
{prefix}
[CURSOR]
The text after the cursor:
{suffix}

Write only the completion that fits between [CURSOR] and the text after. You decide:
- Whether to continue on the same line or start a new line
- Whether to complete a partial word, finish the sentence, or write more
- Spacing, punctuation, and line breaks — match the author's style exactly

Output only the raw completion text. No explanations, no labels, no code fences.
```

The `[CURSOR]` marker is the only structural hint. No cursor-position detection, no markdown heuristics, no format rules — the model matches the author's style from context alone.

---

### Model parameters

| Parameter | Value |
|-----------|-------|
| Model | `gemini-flash-latest` |
| Max output tokens | 120 |
| Temperature | 0.2 |
| Streaming | No (`generateText`) |

---

### Post-processing

The completion is cleaned before returning:

```typescript
text
  .replace(/^```[\w]*\n?/, '')   // strip leading code fence (e.g. ```markdown)
  .replace(/\n?```$/, '')         // strip trailing code fence
  .trimEnd()                      // strip trailing whitespace only
                                  // leading newlines preserved (needed for "start new line" completions)
```

---

## Summary comparison

| | Editor Chat | Autocomplete |
|---|---|---|
| Model | `gemini-pro-latest` | `gemini-flash-latest` |
| Mode | Streaming (`streamText`) | Non-streaming (`generateText`) |
| Max tokens | 4,000 | 150 |
| Temperature | default | 0.7 |
| Context: history | Full conversation | None |
| Context: file content | On-demand via `read_file` tool | None |
| Context: directory tree | Yes (all files + folders) | None |
| Context: cursor position | No | No (AI decides from surrounding text) |
| Context: rules file | Yes (`.writepad/rules.md`) | No |
| Context: attachments | Yes (user-pinned excerpts) | No |
| Tool use | Yes (4 tools, up to 8 steps) | No |
| Output format | Text + XML blocks + tool calls | Raw completion text |
| Persisted | Yes (MongoDB, with parts) | No |
