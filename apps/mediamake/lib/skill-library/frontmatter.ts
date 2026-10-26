import type { Frontmatter } from './types';

const unquote = (v: string) => v.trim().replace(/^(['"])([\s\S]*)\1$/, '$2');

/**
 * name, description, version and one level of metadata from a SKILL.md, plus
 * the body. Values are single lines, or folded/literal blocks (`>` / `|`).
 */
export function parseSkillMd(text: string): { frontmatter: Frontmatter; body: string } {
  const src = text.replace(/\r\n/g, '\n');
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const frontmatter: Frontmatter = { metadata: {} };
  if (!m) return { frontmatter, body: src };
  const lines = m[1].split('\n');
  let inMeta = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const top = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    const sub = line.match(/^\s+([a-zA-Z_-]+):\s*(.*)$/);
    let key: string | null = null;
    let value = '';
    let meta = false;
    if (top) {
      inMeta = top[1] === 'metadata' && !top[2].trim();
      if (inMeta) continue;
      [key, value] = [top[1], top[2]];
    } else if (sub && inMeta) {
      [key, value, meta] = [sub[1], sub[2], true];
    } else continue;
    if (/^[>|][+-]?$/.test(value.trim())) {
      const block: string[] = [];
      const indent = meta ? 4 : 2;
      while (i + 1 < lines.length && (lines[i + 1].startsWith(' '.repeat(indent)) || !lines[i + 1].trim())) block.push(lines[++i].trim());
      value = value.trim().startsWith('>') ? block.join(' ').replace(/\s+/g, ' ') : block.join('\n');
    }
    value = unquote(value);
    if (meta) frontmatter.metadata[key] = value;
    else if (key === 'name' || key === 'description' || key === 'version') frontmatter[key] = value;
  }
  return { frontmatter, body: m[2] };
}
