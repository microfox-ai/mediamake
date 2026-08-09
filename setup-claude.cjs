const fs = require('fs');
const path = require('path');

console.log("===========================================");
console.log("⚙️ Updating Windows 11 AI Workspace (with Permissions)");
console.log("===========================================");

const claudeDir = '.claude';
const workflowDir = path.join(claudeDir, 'AI_WORKFLOW');

// 1. Create directories
if (!fs.existsSync(workflowDir)) {
    fs.mkdirSync(workflowDir, { recursive: true });
    console.log(`📁 Created directories inside ${workflowDir}...`);
}

// 2. File Contents
const claudeMd = `# AI Collaboration & Workflow Rules (Anti-Vibe Coder Protocol)

You are collaborating with an Intermediate Developer on a Windows 11 machine. We follow a strict "Anti-Vibe Coder" workflow to maximize token efficiency and maintain human engineering edge. Your goal is complex architectural orchestration and logic handling; you must actively engage the human operator for grunt work, validation, and safety blocks.

## Environment Architecture (Host System)
- **OS:** Windows 11 (Use PowerShell or Windows-compatible commands. Avoid Linux-only binaries unless running through a specific toolchain).
- **Installed runtimes/compilers:** Node.js, Python, Rust.

## Execution Guardrails (Critical Safety)
- **Code Review Flags:** If you write complex optimization tricks, implement architectural variations not explicitly requested, or touch destructive logic (e.g., data migrations, DB deletions, irreversible file drops), you **MUST** flag it for manual code review in the task list. Do not execute or merge until explicitly cleared.
- **Strict Git Protocol:** NEVER auto-commit or push changes to version control unless explicitly instructed. 
- **No AI Co-Authorship:** When instructed to commit, DO NOT add yourself as a co-developer or append "Co-authored-by: Claude" tags to the commit message unless explicitly requested. Keep the Git history clean.

## Reading State Before Every Message
At the beginning of every single message turn or new session, you must read the tracking files inside \`.claude/AI_WORKFLOW/\`:
1. **Check Task Progress:** Assume tasks marked with \`[x]\` are successfully completed.
2. **Process Feedbacks:** Read any \`[DEV_RESPONSE]:\` lines underneath tasks in \`DEV_TASKS.md\`. Treat these as direct instructions, corrections, or blocking questions before continuing your main line of work.
3. **Monitor Sub-Agents:** Read \`EASY_AI_TASKS.md\` to parse \`[x]\` accomplishments or \`[AI_RESPONSE]:\` blockers left by the smaller AI models.

## Division of Labor
When executing features or debugging, do not dump raw task checklists into the chat response. Write them into these hidden files:

1. **Write to \`.claude/AI_WORKFLOW/DEV_TASKS.md\` (For the Human Operator):**
   - **Search & Inspection:** Give the user the exact PowerShell \`Select-String\`, Windows \`findstr\`, or \`rg\` commands to run. Ask the human to locate and paste targeted files.
   - **Log Triage:** Ask the user to locate the crash line or isolated stack trace and paste just the narrow 20-line window.
   - **Manual Testing:** Instruct the user on specific UI interactions or edge cases to trigger manually.

2. **Write to \`.claude/AI_WORKFLOW/EASY_AI_TASKS.md\` (For Smaller AI / Cursor Free):**
   - Isolated components, basic CSS tweaks, or low-context boilerplate.
   - **Context Rule:** Because smaller AIs lack project-wide context, you **must** bundle the necessary snippets, precise file locations, and structural context directly inside this file when assigning a task. Do not assume it knows the rest of the codebase.

3. **Assign to Yourself (Claude Code - The Engine):**
   - Deep reasoning, high-level structural scaffolding, multi-file tracking, and core business logic.

## Context & Memory Management
- **Token Limit Warning:** Monitor conversation health. Once the active session context approaches ~500k tokens or signs of hallucination manifest, **PAUSE**.
- Warn the user explicitly to execute \`/compact\`.
- If a hard reset is needed, compile a definitive structural checkpoint into \`.claude/AI_WORKFLOW/SESSION_HANDOVER.md\` before stopping.

---

## Project Specific Rules
`;

const devTasks = `# Developer Manual Tasks

*Claude Code will write your low-overhead, token-saving execution steps here. Use \`[x]\` to check them off, and write questions or notes directly underneath using \`[DEV_RESPONSE]:\`.*

- [ ] Task 1: Initialize system context
  [DEV_RESPONSE]: Ready to begin on Windows 11.`;

const easyAiTasks = `# Small AI Execution Agent Rules
You are an isolated, high-efficiency assistant executing single, non-critical sub-tasks for this project. You have limited context. You must work strictly within the instructions provided below.

## Instructions:
1. Complete the assigned tasks using only the provided context blocks.
2. Once complete, update this file by changing \`[ ]\` to \`[x]\`.
3. If you run into a block, have a question, or need to output structural data back to the main architect AI (Claude), write it on a new line starting with \`[AI_RESPONSE]:\`.
# Small AI / Boilerplate Task Queue

## Open Tasks
- [ ] Task 1: Welcome configuration placeholder
  - **Target File:** None
  - **Context Provided:** Standby for structural tasks from Claude Code.`;

const claudeCommands = `# Claude Code Slash Commands Cheat Sheet

## Context & Cost Management
- \`/compact\` - Summarizes conversation history and drops unnecessary logs to free up context space. (Crucial for saving tokens).
- \`/cost\` - Shows how many tokens you've burned and the estimated session cost.
- \`/usage\` - Displays your Anthropic account plan limits.
- \`/context\` - Visualizes current context window usage as a color grid.

## Workflow & Navigation
- \`/plan\` - Analyzes the codebase and generates an architectural strategy *without* writing any code. Waits for approval.
- \`/rewind\` - Time-travel debugging. Reverts conversation history and physical code changes to a previous state.
- \`/resume\` - Continue a past conversation (e.g., \`/resume session-id\`).
- \`/clear\` - Wipes the current conversation memory to start fresh.

## Agents & Sub-tasks
- \`/agents\` - Opens the sub-agent management view to dispatch parallel background tasks.
- \`/tasks\` - Lists and manages background bash tasks.`;

const promptTemplates = `# Anti-Vibe Coder Prompt Architecture

Copy the fenced block under each heading into your AI session.

## 1. Feature Lifecycle Kickoff

\`\`\`text
I want to implement [Feature].
1. Provide a high-level architectural overview.
2. Fragment this feature into independent steps.
3. Populate \`.claude/AI_WORKFLOW/DEV_TASKS.md\` with my commands (search/logs/manual runs) and \`.claude/AI_WORKFLOW/EASY_AI_TASKS.md\` with standalone boilerplate tasks wrapped with the required context snippets.
4. Explicitly flag any risky or unverified logic rules for my manual approval. Let me know when the workflow files are updated.
\`\`\`

## 2. Reading State Handshake (Use when starting a fresh session)

\`\`\`text
Read our active logs in \`.claude/AI_WORKFLOW/\`. Process all checked items \`[x]\`. Evaluate my annotations under \`[DEV_RESPONSE]:\` and check \`EASY_AI_TASKS.md\` for any feedback under \`[AI_RESPONSE]:\` before continuing code generation.
\`\`\`

## 3. The Surgical Debugger (When you hit an error)

\`\`\`text
I am hitting a [Error Type/Message] in [File/Component]. I have isolated the stack trace below.
1. Analyze the trace and explain the likely root cause.
2. DO NOT write the full fix yet. Instead, give me the exact \`rg\` or \`Select-String\` command to run so I can fetch the specific lines of context you need.
3. Update \`DEV_TASKS.md\` with any manual state checks or DB queries I should perform to verify the data.
\`\`\`

## 4. The Edge Case Stress Test

\`\`\`text
We just finished implementing [Feature]. Before we move on, I want to harden it.
1. Identify 5 extreme edge cases, race conditions, or failure states for this logic.
2. Write the boilerplate unit test scaffolding for these into \`EASY_AI_TASKS.md\` for my smaller AI to execute.
3. Assign any complex structural fixes required to handle these edge cases to yourself. Let me know what data I need to manually mock in \`DEV_TASKS.md\`.
\`\`\`

## 5. The Deep Code Audit (Finding bugs & optimizations)

\`\`\`text
Review the implementation of [Component/Logic] pasted below. I want a highly critical audit.
1. Flag any potential memory leaks, algorithmic bottlenecks, or unhandled promise rejections.
2. If you find a severe issue, DO NOT fix it immediately. Explain the exploit/bug and ask me how I want to handle the state.
3. Queue any simple syntax cleanups or type strictness improvements into \`EASY_AI_TASKS.md\`.
\`\`\`

## 6. The Architectural Sounding Board (Brainstorming/Ideas)

\`\`\`text
I am planning to build [New Concept/Module]. DO NOT write any code yet.
1. Give me 3 different architectural approaches, highlighting the trade-offs of each regarding performance, token-efficiency, and our current stack.
2. Ask me up to 3 targeted questions about my data access patterns or scale requirements to help narrow this down.
\`\`\`

## 7. The Targeted Refactor

\`\`\`text
The code in [File] is getting messy and tightly coupled.
1. Analyze it and propose a refactor that isolates the pure logic from the side effects/UI.
2. If the refactor is large, break it down: give me the manual file-move/rename commands in \`DEV_TASKS.md\`, and assign the complex logic rewrites to yourself.
3. Wait for my approval before executing any code changes.
\`\`\`

## 8. The Context Discovery (Learning unfamiliar code)

\`\`\`text
I need to understand how the [Specific Concept/Service] interacts with the rest of the system.
1. Tell me exactly what \`rg\` or PowerShell search commands to run to map out these connections.
2. Once I paste the results back to you, build a mental model for me. Do not write new code, just explain the data flow and where the state lives.
\`\`\`

## 9. The Ralph Wiggum Execution Loop (Autonomous Tasking)

\`\`\`text
Implement the [Functionality] we agreed upon. Your goal is to make the command [pnpm test / cargo check / tsc] pass without errors. Stay in the loop, read your own diffs, and auto-correct until the command exits cleanly. If you get stuck in a loop for more than 3 attempts, PAUSE and update \`DEV_TASKS.md\` with your blocker.
\`\`\`

## 10. Feature Ideation (New product ideas)

\`\`\`text
I want fresh feature ideas for [App/Area].
1. Read \`IDEAS.md\` and \`FEATURES.md\` first. Do not repeat ideas already listed unless you are extending them in a meaningfully new way.
2. Propose 5–10 new ideas grouped by category. For each idea include: a short title, one-sentence value prop, rough effort (S/M/L), and whether it is mostly AI-assisted, algorithmic, or UI-only.
3. Call out 2–3 ideas that compose well with features we already have or are building.
4. Append your top picks to \`IDEAS.md\` under a dated \`## New Ideas (Fresh)\` subsection using the existing emoji/status format (💡 idea). DO NOT write any code yet.
5. Ask me which 1–2 ideas to promote into an implementation plan.
\`\`\``;

const settingsLocalJson = `{
  "permissions": {
    "allow": [
      "Bash(grep *)",
      "Bash(find *)",
      "Bash(rg *)",
      "Bash(ls *)",
      "Bash(cat *)",
      "PowerShell(Get-ChildItem *)",
      "PowerShell(Get-Content *)",
      "PowerShell(Select-String *)",
      "PowerShell(Test-Path *)",
      "Bash(findstr *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git branch)",
      "Bash(git show *)",
      "PowerShell(git status)",
      "PowerShell(git diff *)",
      "Bash(*tsc --noEmit*)",
      "PowerShell(*tsc --noEmit*)",
      "Bash(npm run lint)",
      "Bash(pnpm lint)",
      "Bash(cargo check)",
      "Read(C:/Vishwajeet/work/**)",
      "Read(C:/Vishwajeet/projects/**)"
    ]
  }
}`;

// 3. Write files to disk
const files = {
    'claude.md': claudeMd,
    'settings.local.json': settingsLocalJson,
    'AI_WORKFLOW/DEV_TASKS.md': devTasks,
    'AI_WORKFLOW/EASY_AI_TASKS.md': easyAiTasks,
    'AI_WORKFLOW/CLAUDE_COMMANDS.md': claudeCommands,
    'AI_WORKFLOW/PROMPT_TEMPLATES.md': promptTemplates
};

for (const [filepath, content] of Object.entries(files)) {
    const fullPath = path.join(claudeDir, filepath);
    fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
    console.log(`📝 Updated ${fullPath}`);
}

// 4. Update .gitignore
const gitignorePath = '.gitignore';
const ignoreLine = '.claude/';

if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    if (!content.includes(ignoreLine)) {
        fs.appendFileSync(gitignorePath, `\n# Private AI configuration frameworks\n${ignoreLine}\n`);
        console.log("🔒 Added .claude/ to your .gitignore file.");
    } else {
        console.log("✅ .claude/ is already ignored in your .gitignore file.");
    }
} else {
    fs.writeFileSync(gitignorePath, `# Private AI configuration frameworks\n${ignoreLine}\n`, 'utf8');
    console.log("🔒 Created a new .gitignore file and added .claude/.");
}

console.log("===========================================");
console.log("🎉 Workspace updated! settings.local.json is now active.");
console.log("===========================================");