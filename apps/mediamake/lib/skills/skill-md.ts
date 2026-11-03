import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import type { RegistrySkill } from '@/lib/library/types';
import { SKILLS_GITHUB, skillRawUrl } from './registry';

/**
 * A skill's SKILL.md as HTML for its page (/skills/<name>), read from GitHub's main branch so the
 * page shows what installs, not what this build was made with. Raw HTML in the file is dropped
 * (remark-rehype leaves it out), and relative links and images point at the skill's folder on
 * GitHub. Null when GitHub can't be reached: the page still has the registry's description.
 */
export async function skillMarkdownHtml(skill: RegistrySkill): Promise<string | null> {
  let text: string;
  try {
    const res = await fetch(skillRawUrl(skill), { next: { revalidate: 300 } });
    if (!res.ok) return null;
    text = await res.text();
  } catch {
    return null;
  }
  const body = text.replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\n?/, '');
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(() => tree => fixLinks(tree as HastNode, skill))
    .use(rehypeStringify)
    .process(body);
  return String(file);
}

type HastNode = { type: string; tagName?: string; properties?: Record<string, unknown>; children?: HastNode[] };

/** Relative links to the skill's folder on GitHub, external ones in a new tab, anything else (javascript:) dropped. */
function fixLinks(node: HastNode, skill: RegistrySkill) {
  if (node.type === 'element' && node.properties) {
    const attr = node.tagName === 'a' ? 'href' : node.tagName === 'img' ? 'src' : null;
    const value = attr ? node.properties[attr] : undefined;
    if (attr && typeof value === 'string') {
      const resolved = resolve(value, skill, attr === 'src');
      if (resolved === null) delete node.properties[attr];
      else node.properties[attr] = resolved;
      if (attr === 'href' && resolved && /^https?:/.test(resolved)) {
        node.properties.target = '_blank';
        node.properties.rel = ['noreferrer'];
      }
    }
  }
  node.children?.forEach(child => fixLinks(child, skill));
}

function resolve(url: string, skill: RegistrySkill, raw: boolean): string | null {
  if (url.startsWith('#')) return url;
  if (/^(https?:|mailto:)/i.test(url)) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return null;
  const root = raw ? 'https://raw.githubusercontent.com/microfox-ai/mediamake/main/' : `${SKILLS_GITHUB}/blob/main/`;
  // a path from the repo's root, or from the skill's folder
  const base = url.startsWith('/') ? root : `${root}${skill.path}/`;
  if (url.startsWith('/')) url = url.slice(1);
  try {
    return new URL(url, base).toString();
  } catch {
    return null;
  }
}
