# Writepad — Architecture

## Overview

Writepad is a **Next.js 15 creative-writing IDE** structured as a three-column resizable layout:

```
┌──────────────────┬──────────────────────────┬──────────────────┐
│   File Explorer  │       Editor (CodeMirror) │   AI Chat Panel  │
│   (left panel)   │       (middle panel)      │   (right panel)  │
└──────────────────┴──────────────────────────┴──────────────────┘
```

Storage: **MongoDB** (projects, files, chat sessions). UI state (open tabs, active file, active chat) persists in **localStorage** per project.

---

## Directory Structure

```
apps/writepad/
├── app/
│   ├── api/
│   │   ├── editor/autocomplete/route.ts     ← inline ghost-text completion
│   │   ├── projects/[projectId]/
│   │   │   ├── route.ts                     ← project CRUD
│   │   │   ├── files/                       ← file CRUD
│   │   │   └── chats/                       ← chat session CRUD
│   │   └── studio/chat/agent/
│   │       ├── editor/route.ts              ← Writepad editor chat AI
│   │       └── [...slug]/route.ts           ← generic orchestration router
│   ├── projects/[projectId]/
│   │   ├── page.tsx                         ← main editor page (layout wiring)
│   │   └── _hooks/useProjectData.ts         ← all file/tab/draft state
│   └── layout.tsx
├── components/writepad/
│   ├── left/   FileExplorer, FileTree
│   ├── middle/ EditorPane, CodeMirrorEditor, MenuBar, DiffPane, InlineDiffView
│   └── right/  ChatPanel, ChatSession, ChatMessage, ChatSessionList, AIChangeBlock
└── docs/
    ├── ARCHITECTURE.md     ← this file
    └── AI_CONTEXT.md       ← full AI context / prompt documentation
```

---

## Core State: `useProjectData`

All file state lives here. Three tiers per file:

| Tier | Where | Lifecycle |
|------|-------|-----------|
| **Saved** | MongoDB | Committed via Save (Ctrl+S second press) |
| **Draft** | MongoDB (`draft` field) | AI edits auto-land here; manual "Save Draft" (Ctrl+S first press) |
| **Unsaved** | Memory only | Keystroke-by-keystroke editor content; lost on refresh |

Key computed sets exposed to the UI:
- `unsavedIds` — files where editor content ≠ draft/saved content
- `draftedIds` — files where draft ≠ null and draft ≠ saved content

Key methods:
- `updateContent(fileId, content)` — in-memory update on each keystroke
- `saveDraft(fileId)` — writes editor content as draft to DB
- `saveFile(fileId)` — commits editor content to saved, clears draft
- `applyAIDraftEdit(change)` — applies line-based AI edits to draft sequentially
- `revertFileDraft(fileId)` — sets draft back to saved content
- `refreshFiles()` — re-fetches all files from server (called after AI creates/deletes)
- `setFileDraft(fileId, content)` — directly sets draft content (inline diff decline)

---

## Editor: CodeMirror 6

Loaded via `next/dynamic` with `ssr: false` (requires DOM). Configured in `CodeMirrorEditor.tsx`.

**Extensions active:**
- `@codemirror/lang-markdown` + `@codemirror/language-data` — markdown with nested language fenced blocks
- `@uiw/codemirror-theme-vscode` — light/dark theme from prefs
- `EditorView.theme()` — applies font family, size, line-height to `.cm-content` / `.cm-gutters`
- `autocompletion` — markdown snippet completions + document word list
- `@codemirror/search` — integrated with `SearchReplaceBar`
- `ghostTextExtension` — inline completions from `/api/studio/chat/agent/editor/autocomplete`
- `Prec.highest(keymap)` — custom keybindings take priority over basic setup

**Custom keybindings:**

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd+S | Draft (first press) → Save (second press) |
| Ctrl/Cmd+F | Open search/replace bar |
| Ctrl/Cmd+L | Attach selection to chat |
| Alt+X | Toggle word wrap |
| Alt+↑ / Alt+↓ | Move line up / down |
| Ctrl+Wheel | Font size ±1 (clamped 11–20px) |

All callbacks inside the keymap read through stable refs (not captured in the closure) to avoid stale closure bugs.

---

## AI: Two Separate Pipelines

### 1. Writepad Editor Chat

**Path:** `ChatSession.tsx` → `DefaultChatTransport` → `POST /api/studio/chat/agent/editor`

- Model: `gemini-pro-latest`
- Streaming: `streamText` → `toUIMessageStreamResponse()`
- Max tokens: 4,000 output
- Max steps: 8 (multi-turn tool use)
- Tool choice: `auto`

The full context assembly and prompt structure is documented in [AI_CONTEXT.md](./AI_CONTEXT.md).

**AI edits flow:**
1. AI emits `<edit>`, `<insert>`, or `<delete>` XML blocks in its text response
2. `ChatMessage.tsx` parses these via `parseEdits()` regex
3. `AIChangeBlock` auto-applies each change to file draft on mount via `applyAIDraftEdit()`
4. User can Revert individual changes (restores draft to saved)
5. Inline diff view (`InlineDiffView`) shows per-hunk Accept / Decline UI

**Tool call widgets:**
- Each tool call (`create_file`, `delete_file`, `read_file`, `search_file`) renders a `ToolWidget` in the chat
- Part type during streaming: `tool-${toolName}` (e.g. `tool-create_file`)
- Persisted in MongoDB as the same format so widgets survive page reload

### 2. Generic Studio Agent Router

**Path:** `POST /api/studio/chat/agent/[...slug]` → `aiMainRouter` (from `app/ai/index.ts`)

This is a **separate stack** from the editor chat. Used for orchestrated research/think/summarize. The Writepad editor does not use this router.

Sub-agents: `thinker`, `summarize`, `braveResearch`, `system`.

---

### 2. Autocomplete

**Path:** `ghostTextExtension` in CodeMirrorEditor → `POST /api/studio/chat/agent/editor/autocomplete`

- Model: `gemini-flash-latest`
- Max tokens: 120
- Temperature: 0.2
- Non-streaming (`generateText`)

Full prompt structure documented in [AI_CONTEXT.md](./AI_CONTEXT.md).

---

## Chat Session Lifecycle

```
createNewSession()      → POST /api/projects/{id}/chats → adds to sessions + openTabIds
sendMessage()           → streams to /api/studio/chat/agent/editor
onFinish (server)       → rebuilds parts from steps → updateOne chat in MongoDB
handleMessagesUpdate()  → PUT /api/projects/{id}/chats/{chatId} (messageMeta + title)
closeTab()              → removes from openTabIds (session preserved in history)
deleteSession()         → DELETE /api/projects/{id}/chats/{chatId} (permanent)
switchToSession(id)     → adds to openTabIds + sets active
```

Sessions load lazily: only the active session's messages are fetched on open; all other sessions show in history with titles only.

---

## Project Settings

Stored on the `project` document in MongoDB. Editable via `MenuBar` → Project Settings dialog:

| Field | Type |
|-------|------|
| name | string |
| description | textarea |
| genre | string |
| status | enum: Draft / In Progress / Review / Complete / Archived |
| tags | comma-separated string → array |

---

## File State Badges (File Explorer)

| Badge | Condition |
|-------|-----------|
| Amber "unsaved" | File is in `unsavedIds` (keystrokes not saved) |
| Violet "draft" | File is in `draftedIds` (staged changes, not committed) |
| Both | File appears in `changedFiles` combining both sets |

---

## Diff Review UI

When a file has draft changes (`draftContent !== null`), EditorPane shows a violet "Review AI Changes" banner. Clicking it opens `InlineDiffView`:

- LCS diff algorithm computes `RawLine[]` (unchanged / added / removed)
- Lines grouped into `Hunk[]` with 3 lines of context before each hunk
- Per-hunk **Accept** (keeps draft for that range) and **Decline** (splices saved lines back in)
- Bulk "Accept All" / "Decline All" buttons
- "All changes reviewed" screen when no pending hunks remain
