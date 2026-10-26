/**
 * The repo's SKILLS.md (written by `node tools/skills.mjs index`) as data for the /skills page:
 * the naming rules and, per category, every skill with its one-line summary. Every skill is public
 * now; `private` rows only appear in a SKILLS.md written before that.
 * The parser follows the generator's format; anything it doesn't recognise is skipped.
 */
import fs from 'node:fs';
import path from 'node:path';

export type SkillRow = {
  name: string;
  visibility: 'public' | 'private';
  summary: string;
  variantOf?: string;
  /** repo path of SKILL.md */
  file?: string;
};

export type SkillCategory = { id: string; about: string; skills: SkillRow[] };

export type SkillsIndex = {
  naming: { pattern: string; about: string }[];
  categories: SkillCategory[];
};

const unescape = (s: string) => s.replace(/\\\|/g, '|').trim();

export function parseSkillsMd(text: string): SkillsIndex {
  const naming: SkillsIndex['naming'] = [];
  const categories: SkillCategory[] = [];
  let section = '';
  let current: SkillCategory | undefined;
  for (const line of text.split('\n')) {
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      section = h2[1].trim();
      current = undefined;
      if (section !== 'Naming') categories.push((current = { id: section, about: '', skills: [] }));
      continue;
    }
    if (section === 'Naming') {
      const rule = line.match(/^- `([^`]+)`: (.+)$/);
      if (rule) naming.push({ pattern: rule[1], about: rule[2].trim() });
      continue;
    }
    if (!current) continue;
    const row = line.match(/^\| (.+?) \| (public|private) \| (.*) \|$/);
    if (row) {
      const [, cell, visibility, summary] = row;
      const name = cell.match(/`([a-z0-9-]+)`/)?.[1];
      if (!name) continue;
      current.skills.push({
        name,
        visibility: visibility as SkillRow['visibility'],
        summary: unescape(summary),
        variantOf: cell.match(/variant of `([a-z0-9-]+)`/)?.[1],
        file: cell.match(/\]\(([^)]+)\)/)?.[1],
      });
    } else if (line.trim() && !line.startsWith('|') && !current.about) current.about = line.trim();
  }
  return { naming, categories: categories.filter(c => c.skills.length) };
}

/** SKILLS.md from the repo root (the app runs from apps/mediamake), or null when it isn't there. */
export function readSkillsMd(): string | null {
  for (const dir of [path.resolve(process.cwd(), '../..'), process.cwd()]) {
    const file = path.join(dir, 'SKILLS.md');
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  }
  return null;
}
