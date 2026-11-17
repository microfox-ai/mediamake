import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

type HastNode = { type: string; tagName?: string; properties?: Record<string, unknown>; children?: HastNode[] };

/**
 * A space's README.md as HTML for its Code tab, under the file list as GitHub shows it. Raw HTML in the
 * file is dropped (remark-rehype leaves it out, with the "What's here" markers), and relative links and
 * pictures point at the file on GitHub (`<repo>/blob/<branch>/…`; pictures through `raw/`, which opens
 * for the people the private repo is shared with). Anything that isn't http(s), mailto or a page anchor
 * is dropped.
 */
export async function readmeHtml(markdown: string, repoUrl: string | undefined, branch = 'main'): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(() => tree => fixLinks(tree as HastNode, repoUrl, branch))
    .use(rehypeStringify)
    .process(markdown.replace(/\r\n/g, '\n'));
  return String(file);
}

function fixLinks(node: HastNode, repoUrl: string | undefined, branch: string) {
  if (node.type === 'element' && node.properties) {
    const attr = node.tagName === 'a' ? 'href' : node.tagName === 'img' ? 'src' : null;
    const value = attr ? node.properties[attr] : undefined;
    if (attr && typeof value === 'string') {
      const resolved = resolve(value, repoUrl, branch, attr === 'src');
      if (resolved === null) delete node.properties[attr];
      else node.properties[attr] = resolved;
      if (attr === 'href' && resolved && /^https?:/.test(resolved)) {
        node.properties.target = '_blank';
        node.properties.rel = ['noreferrer'];
      }
    }
  }
  node.children?.forEach(child => fixLinks(child, repoUrl, branch));
}

/** A link as the page should have it, or null to drop it. */
export function resolve(url: string, repoUrl: string | undefined, branch: string, picture = false): string | null {
  if (url.startsWith('#')) return url;
  if (/^(https?:|mailto:)/i.test(url)) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) return null;
  if (!repoUrl) return null;
  const root = `${repoUrl}/${picture ? 'raw' : 'blob'}/${encodeURIComponent(branch)}/`;
  try {
    const resolved = new URL(url.replace(/^\/+/, ''), root).toString();
    // a link may not climb out of the repo
    return resolved.startsWith(`${repoUrl}/`) ? resolved : null;
  } catch {
    return null;
  }
}

/** What the README says the space is: its first paragraph after the title, as plain text. */
export function readmeAbout(markdown: string): string | undefined {
  const paragraph: string[] = [];
  for (const raw of markdown.replace(/\r\n/g, '\n').replace(/<!--[\s\S]*?-->/g, '').split('\n')) {
    const line = raw.trim();
    if (!line) {
      if (paragraph.length) break;
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      if (paragraph.length) break;
      if (/^#\s/.test(line)) continue;
      return undefined;
    }
    if (/^([-*+]|\d+\.)\s|^[|>`<]/.test(line)) {
      if (paragraph.length) break;
      return undefined;
    }
    paragraph.push(line);
  }
  const text = paragraph
    .join(' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return undefined;
  return text.length > 300 ? `${text.slice(0, 297).trimEnd()}…` : text;
}
