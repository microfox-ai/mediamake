import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { parseYouTubeId, youtubeEmbedUrl, youtubeUrl } from './video';

/**
 * An item's README: its store listing, the left side of its page and its
 * dialog, laid out as GitHub lays out a repo's README. It introduces the
 * item (a video first, its title, what it does, how to use it); how the item
 * works stays in its SKILL.md. docs/item-readme.md has the format.
 *
 * A skill's README.md is a file in its folder; an MCP's or an app's is on
 * its listing (ItemListing.readme). An item with none gets a default one
 * (defaultReadme): its video, its title, its summary and how to use it. The
 * page draws the header itself (the video, the title, the badges), so the
 * video and the title a README opens with are lifted out of its text here
 * and handed back.
 *
 * Raw HTML in the Markdown is dropped (remark-rehype leaves it out). A
 * YouTube link or an MP4 or WebM link alone on a line plays in place, as a
 * video dropped into a README does on GitHub. Pure but for nothing: no
 * network, so the pages, the dialog and the tests share it.
 */

export interface ReadmeVideo {
  /** A YouTube video, played in place. */
  youtubeId?: string;
  /** An MP4 or WebM clip, by its https link. */
  src?: string;
}

export interface ItemReadme {
  /** The README's text as HTML, without the video and the title it opens with. */
  html: string;
  /** The video it opens with, when it has one. */
  video?: ReadmeVideo;
  /** Its first heading, when it has one: the item's name as the listing writes it. */
  title?: string;
  /** True when nobody wrote it: it is the default, made from what MediaMake knows. */
  written: boolean;
}

/**
 * Where a README's relative links and pictures point: a folder on GitHub, or, for an item in a member's
 * space, each picture's address by its path (lib/space/item-readme). Without one they are dropped.
 */
export interface ReadmeBase {
  /** Links: `https://github.com/<repo>/blob/<branch>/<folder>/`. Empty: relative links are dropped. */
  links: string;
  /** Pictures and clips: `https://raw.githubusercontent.com/<repo>/<branch>/<folder>/`. */
  files: string;
  /** Pictures by their path in the item's folder (`shots/a.png` → its address), instead of `files`. */
  pictures?: Record<string, string>;
}

/** A relative link as a path in the item's folder (`./shots/a.png` → `shots/a.png`), or null when it climbs out. */
function folderPath(url: string): string | null {
  const parts: string[] = [];
  for (const part of decodeURI(url.replace(/[?#].*$/, '')).split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') return null;
    parts.push(part);
  }
  return parts.length ? parts.join('/') : null;
}

type HastNode = { type: string; tagName?: string; value?: string; properties?: Record<string, unknown>; children?: HastNode[] };

const CLIP = /^https:\/\/[^\s]+\.(mp4|webm)([?#][^\s]*)?$/i;

/** A README's Markdown without its frontmatter. */
export function readmeBody(markdown: string): string {
  return markdown.replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\n?/, '');
}

/** The video a link plays, or null: a YouTube link, or an https MP4 or WebM. */
export function videoOf(url: string): ReadmeVideo | null {
  const youtubeId = parseYouTubeId(url);
  if (youtubeId) return { youtubeId };
  return CLIP.test(url.trim()) ? { src: url.trim() } : null;
}

const textOf = (node: HastNode): string => (node.type === 'text' ? (node.value ?? '') : (node.children ?? []).map(textOf).join(''));
const isBlank = (node: HastNode) => node.type === 'text' && !(node.value ?? '').trim();

/** The video of a paragraph that is nothing but a link to one, written bare (its text is the link). */
function loneVideo(node: HastNode): ReadmeVideo | null {
  if (node.type !== 'element' || node.tagName !== 'p') return null;
  const parts = (node.children ?? []).filter(child => !isBlank(child));
  if (parts.length !== 1) return null;
  const [only] = parts;
  if (only.type === 'text') return videoOf(only.value ?? '');
  if (only.type !== 'element' || only.tagName !== 'a') return null;
  const href = String(only.properties?.href ?? '');
  const text = textOf(only).trim();
  return text === href || `https://${text}` === href ? videoOf(href) : null;
}

function player(video: ReadmeVideo): HastNode {
  const frame: HastNode = video.youtubeId
    ? {
        type: 'element',
        tagName: 'iframe',
        properties: {
          src: youtubeEmbedUrl(video.youtubeId),
          title: 'Video',
          loading: 'lazy',
          allow: 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
          referrerPolicy: 'strict-origin-when-cross-origin',
          allowFullScreen: true,
        },
        children: [],
      }
    : { type: 'element', tagName: 'video', properties: { src: video.src, controls: true, playsInline: true, preload: 'metadata' }, children: [] };
  return { type: 'element', tagName: 'div', properties: { className: ['readme-video'] }, children: [frame] };
}

function resolve(url: string, base: ReadmeBase | undefined, file: boolean): string | null {
  if (url.startsWith('#')) return url;
  if (/^(https?:|mailto:)/i.test(url)) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//') || !base) return null;
  try {
    if (file && base.pictures) {
      const at = folderPath(url);
      return at ? (base.pictures[at] ?? null) : null;
    }
    const root = file ? base.files : base.links;
    if (!root) return null;
    const resolved = new URL(url.replace(/^\/+/, ''), root).toString();
    // a link may not climb out of the item's folder
    return resolved.startsWith(root) ? resolved : null;
  } catch {
    return null;
  }
}

function fixLinks(node: HastNode, base: ReadmeBase | undefined) {
  if (node.type === 'element' && node.properties) {
    const attr = node.tagName === 'a' ? 'href' : node.tagName === 'img' ? 'src' : null;
    const value = attr ? node.properties[attr] : undefined;
    if (attr && typeof value === 'string') {
      const resolved = resolve(value, base, attr === 'src');
      if (resolved === null) delete node.properties[attr];
      else node.properties[attr] = resolved;
      if (attr === 'href' && resolved && /^https?:/.test(resolved)) {
        node.properties.target = '_blank';
        node.properties.rel = ['noreferrer'];
      }
      if (attr === 'src') node.properties.loading = 'lazy';
    }
  }
  node.children?.forEach(child => fixLinks(child, base));
}

/** A README's Markdown as the page shows it (see the top of this file). */
export async function renderReadme(markdown: string, base?: ReadmeBase, written = true): Promise<ItemReadme> {
  let video: ReadmeVideo | undefined;
  let title: string | undefined;
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(() => tree => {
      const root = tree as HastNode;
      const blocks = (root.children ?? []).filter(child => !isBlank(child));
      // what it opens with, in either order: a video, a title
      for (const block of blocks.slice(0, 2)) {
        const found = loneVideo(block);
        if (found && !video) {
          video = found;
          root.children = root.children!.filter(child => child !== block);
        } else if (block.type === 'element' && block.tagName === 'h1' && !title) {
          title = textOf(block).trim() || undefined;
          root.children = root.children!.filter(child => child !== block);
        } else break;
      }
      // every other video that stands alone plays in place
      const embed = (node: HastNode) => {
        node.children = node.children?.map(child => {
          const found = loneVideo(child);
          if (found) return player(found);
          embed(child);
          return child;
        });
      };
      embed(root);
      fixLinks(root, base);
    })
    .use(rehypeStringify)
    .process(readmeBody(markdown));
  return { html: String(file).trim(), ...(video && { video }), ...(title && { title }), written };
}

/** What a member says to Claude to run a skill: the first thing its description quotes after "Use when the user says", else its slash command. */
export function usePhrase(name: string, description?: string): string {
  const said = description?.match(/[Uu]se (?:it )?when the user says\s+["“]([^"”]{3,80})["”]/)?.[1];
  if (!said) return `/${name}`;
  // "make a lyric video from <folder>" is said as "make a lyric video"
  const plain = said
    .replace(/\s*<[^>]*>/g, '')
    .replace(/\s*…$/, '')
    .replace(/\s+(from|for|of|to|with|in|on|at)$/i, '')
    .trim();
  return plain || `/${name}`;
}

/** What the default README is written from. */
export interface ReadmeFacts {
  kind: 'skill' | 'mcp' | 'app';
  /** Its folder name, e.g. `make-my-intro`. */
  name: string;
  title: string;
  summary?: string;
  /** A skill's whole description, for what to say to Claude. */
  description?: string;
  /** Its intro video on YouTube. */
  youtubeId?: string;
  /** Where an app that runs in MediaMake opens. */
  open?: string;
  /** False for an item that is only its owner's: there is no install prompt to copy. */
  inStore?: boolean;
}

/**
 * The README of an item nobody wrote one for, in the format every README
 * follows: the video first, the title, what it does, how to use it.
 */
export function defaultReadme(facts: ReadmeFacts): string {
  const { kind, name, title, summary } = facts;
  const lines: string[] = [];
  if (facts.youtubeId) lines.push(youtubeUrl(facts.youtubeId), '');
  lines.push(`# ${title}`, '');
  if (summary) lines.push(summary, '');
  lines.push('## How to use', '');
  const install = facts.inStore === false ? 'Get it onto your computer with the command at the foot.' : 'Copy the install prompt and paste it into Claude. It sets everything up.';
  if (kind === 'skill') {
    lines.push(`1. ${install}`, `2. Say to Claude: **${usePhrase(name, facts.description)}**`, '3. Claude asks what it needs, then does the work with you.');
  } else if (kind === 'mcp') {
    lines.push(`1. ${install}`, '2. Start a new chat in Claude. Its tools are there.', '3. Ask for what you need in plain words, or run a skill that works with it.');
  } else if (facts.open) {
    lines.push(`1. Open it at [${facts.open}](${facts.open}). There is nothing to install.`, '2. Sign in with your MediaMake account when it asks.');
  } else {
    lines.push(`1. ${install}`, '2. Open it from Claude, or as its setup says.');
  }
  return `${lines.join('\n')}\n`;
}
