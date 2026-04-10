import { ObjectId } from 'mongodb';
import type { DbProjectFile } from './db/collections';

interface BoilerplateOptions {
  projectId: string;
  name: string;
  description: string;
  type: string;
}

// ── Type-specific rules ───────────────────────────────────────────────────────

const TYPE_RULES: Record<string, string> = {
  screenplay: `## Format
- Follow standard screenplay format: scene headings in ALL CAPS, action lines present-tense, dialogue centred.
- Scene headings: INT./EXT. LOCATION - DAY/NIGHT
- Keep action lines tight — no camera directions unless essential.
- Characters introduced in action lines should be in ALL CAPS on first appearance.

## Tone & Style
- Write visually; describe only what can be seen or heard on screen.
- Avoid adverbs in dialogue directions — trust the dialogue itself.
- One page ≈ one minute of screen time.`,

  novel: `## Format
- Use third-person limited or first-person point of view — stay consistent.
- Chapter files named: \`chapter-01.md\`, \`chapter-02.md\`, etc.
- Scene breaks within chapters: use \`---\` on its own line.

## Tone & Style
- Show, don't tell — anchor emotion in concrete detail and action.
- Vary sentence length to control pacing.
- Dialogue attribution: prefer "said" over elaborate synonyms.`,

  'short-story': `## Format
- A single file per story, or split into acts if > 5,000 words.
- No chapter headings unless the story has distinct named sections.

## Tone & Style
- Economy is everything — every sentence must earn its place.
- The ending should recontextualise what came before.
- Aim for one central image or metaphor that holds the story together.`,

  blog: `## Format
- Each post in its own file: \`posts/slug-title.md\`.
- Start with an H1 title, then a one-paragraph hook.
- Use H2 for major sections, H3 sparingly.
- End with a clear call to action or takeaway.

## Tone & Style
- Write for scanners: bold key points, use short paragraphs.
- Active voice, second person ("you") unless the topic demands otherwise.
- Aim for 8th-grade reading level for broad reach.`,

  youtube: `## Format
- Each script in: \`scripts/ep-NNN-slug.md\`.
- Structure: Hook → Context → Main content → CTA → Outro.
- Include [B-ROLL], [GRAPHIC], and [CUT TO] cues in square brackets.
- For B-roll stills, use the editor toolbar **Media** (Mediamake library) to insert images; each line carries the CDN URL and Mediamake asset id in the image title.

## Tone & Style
- Conversational and energetic — write how you speak, not how you write.
- Hook must land within the first 30 seconds; start with the payoff.
- Keep sentences short; read aloud before finalising.`,

  other: `## Format
- Organise files in logical folders for your project structure.
- Use Markdown for all text files.

## Tone & Style
- Define your own conventions here and the AI will follow them.`,
};

// ── Main content file per type ────────────────────────────────────────────────

function mainFile(name: string, description: string, type: string): { fileName: string; content: string } {
  const desc = description || 'No description yet.';

  switch (type) {
    case 'screenplay':
      return {
        fileName: 'script.md',
        content: `# ${name}

*${desc}*

---

FADE IN:

INT. LOCATION - DAY

<!-- Begin your story here. -->

FADE OUT.
`,
      };

    case 'novel':
      return {
        fileName: 'chapter-01.md',
        content: `# ${name}

## Chapter 1

*${desc}*

---

<!-- Begin your story here. -->
`,
      };

    case 'short-story':
      return {
        fileName: 'story.md',
        content: `# ${name}

*${desc}*

---

<!-- Begin your story here. -->
`,
      };

    case 'blog':
      return {
        fileName: 'first-post.md',
        content: `# ${name}

*${desc}*

---

## Introduction

<!-- Write your opening hook here. -->

## Main Point

<!-- Develop your argument or story. -->

## Conclusion

<!-- Takeaway or call to action. -->
`,
      };

    case 'youtube':
      return {
        fileName: 'ep-001.md',
        content: `# ${name} — Episode 1

*${desc}*

---

## Hook (0:00–0:30)

<!-- Start with the payoff or a provocative question. -->

## Context (0:30–1:30)

<!-- Why should the viewer care? Set up the problem. -->

## Main Content (1:30–8:00)

<!-- Your core value delivery. -->

## Call to Action (8:00–8:30)

<!-- Subscribe, comment, link in description. -->

## Outro (8:30–9:00)

<!-- Sign-off and tease the next episode. -->
`,
      };

    default:
      return {
        fileName: 'notes.md',
        content: `# ${name}

*${desc}*

---

<!-- Start writing here. -->
`,
      };
  }
}

// ── Public builder ────────────────────────────────────────────────────────────

/**
 * Returns a set of DbProjectFile documents (with pre-generated _ids) ready for
 * insertMany. Called immediately after project creation.
 */
export function buildBoilerplate(opts: BoilerplateOptions): DbProjectFile[] {
  const { projectId, name, description, type } = opts;
  const now = new Date();

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ');
  const desc = description || 'No description provided.';

  // Pre-generate the .writepad folder _id so rules.md can reference it.
  const writepadFolderId = new ObjectId();

  const rulesContent = `# Project Rules for "${name}"

## About This Project
**Type:** ${typeLabel}
**Summary:** ${desc}

## AI Guidelines
The AI writing assistant always reads this file and follows these rules when editing or generating content for this project.

${TYPE_RULES[type] ?? TYPE_RULES.other}

## Custom Rules
<!-- Add your own rules below. The AI will always read and follow this file. -->
`;

  const { fileName, content } = mainFile(name, description, type);

  return [
    // 1. .writepad folder (root, order 0)
    {
      _id: writepadFolderId,
      projectId,
      name: '.writepad',
      type: 'folder',
      parentId: null,
      content: '',
      draft: null,
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    // 2. .writepad/rules.md
    {
      _id: new ObjectId(),
      projectId,
      name: 'rules.md',
      type: 'file',
      parentId: writepadFolderId.toHexString(),
      content: rulesContent,
      draft: null,
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    // 3. Main content file (root, order 1)
    {
      _id: new ObjectId(),
      projectId,
      name: fileName,
      type: 'file',
      parentId: null,
      content,
      draft: null,
      order: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];
}
