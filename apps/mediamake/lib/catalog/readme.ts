import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { itemPagePath } from './paths';
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
 * video dropped into a README does on GitHub. A run of two or more pictures
 * (one per line, or one paragraph each) is a grid of example outputs, each
 * captioned with its alt text (`div.readme-gallery`). Another skill, MCP or app
 * is linked by its name (itemLinks): `[[make-lyrics-video]]`, `[[mcp/browse-hack]]`,
 * `[the remix skill](skill:make-video-music-remix)` or `mcp/browse-hack` in code,
 * each a link to that item's page. Pure but for nothing: no
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

/** A picture as a README writes it: an image, or an image wrapped in a link. */
function pictureOf(node: HastNode): HastNode | null {
  if (node.type !== 'element') return null;
  if (node.tagName === 'img') return node;
  if (node.tagName !== 'a') return null;
  const inside = (node.children ?? []).filter(child => !isBlank(child));
  return inside.length === 1 && inside[0].type === 'element' && inside[0].tagName === 'img' ? node : null;
}

/** The pictures of a paragraph that holds nothing else (line breaks aside), or null. */
function picturesOf(node: HastNode): HastNode[] | null {
  if (node.type !== 'element' || node.tagName !== 'p') return null;
  const parts = (node.children ?? []).filter(child => !isBlank(child) && !(child.type === 'element' && child.tagName === 'br'));
  const pictures = parts.map(pictureOf);
  return parts.length && pictures.every(Boolean) ? (pictures as HastNode[]) : null;
}

/** One tile of a gallery: the picture (in its link), captioned with its alt text when it has one. */
function figure(picture: HastNode): HastNode {
  const img = picture.tagName === 'img' ? picture : (picture.children ?? []).find(child => child.type === 'element' && child.tagName === 'img');
  const alt = String(img?.properties?.alt ?? '').trim();
  return {
    type: 'element',
    tagName: 'figure',
    properties: {},
    children: [picture, ...(alt ? [{ type: 'element', tagName: 'figcaption', properties: {}, children: [{ type: 'text', value: alt }] }] : [])],
  };
}

/**
 * A run of pictures as a grid of example outputs, like a store listing's screenshots: one paragraph
 * of nothing but pictures, or paragraphs of one picture each, one after another. Two or more make a
 * `div.readme-gallery` of captioned tiles; a lone picture stays as it is.
 */
function galleries(parent: HastNode) {
  const children = parent.children ?? [];
  const out: HastNode[] = [];
  let run: HastNode[] = [];
  let runNodes: HastNode[] = [];
  const close = () => {
    if (run.length >= 2) out.push({ type: 'element', tagName: 'div', properties: { className: ['readme-gallery'] }, children: run.map(figure) });
    else out.push(...runNodes);
    run = [];
    runNodes = [];
  };
  for (const child of children) {
    const pictures = picturesOf(child);
    if (pictures) {
      run.push(...pictures);
      runNodes.push(child);
      continue;
    }
    // the blank lines between the paragraphs of a run stay in it
    if (isBlank(child) && run.length) {
      runNodes.push(child);
      continue;
    }
    close();
    if (child.type === 'element') galleries(child);
    out.push(child);
  }
  close();
  parent.children = out;
}

/* ---------- links to other items ---------- */

const SLUG = '[a-z0-9][a-z0-9-]{0,63}';
const ITEM_HREF = new RegExp(`^(skill|mcp|app)[:/](${SLUG})$`);
const ITEM_PAGE = new RegExp(`^/(skills|mcps|apps)/${SLUG}(#[\\w-]*)?$`);
const ITEM_CODE = new RegExp(`^(skill|mcp|app)/(${SLUG})$`);
const WIKI = new RegExp(`\\[\\[(?:(skill|mcp|app)/)?(${SLUG})(?:\\|([^\\]\\n]{1,120}))?\\]\\]`, 'g');

/** The page of the item a link names (`skill:make-my-intro`, `mcp/browse-hack`, `/skills/make-my-intro`), or null. */
export function itemHref(url: string): string | null {
  const named = url.match(ITEM_HREF);
  if (named) return itemPagePath(`${named[1]}/${named[2]}`);
  return ITEM_PAGE.test(url) ? url : null;
}

const itemAnchor = (id: string, children: HastNode[]): HastNode => ({
  type: 'element',
  tagName: 'a',
  properties: { href: itemPagePath(id), className: ['readme-item'], dataItem: id },
  children,
});

/**
 * Other items named in the text become links to their pages: `[[name]]` is a skill, `[[mcp/name]]` an
 * MCP, `[[app/name]]` an app (`[[name|words]]` shows the words), and a kind and a name in code
 * (`mcp/browse-hack`) links as it is. Nothing inside a link or a code block is touched.
 */
function itemLinks(parent: HastNode) {
  if (parent.type === 'element' && (parent.tagName === 'a' || parent.tagName === 'pre')) return;
  parent.children = parent.children?.flatMap((child): HastNode[] => {
    if (child.type === 'element' && child.tagName === 'code') {
      const named = textOf(child).trim().match(ITEM_CODE);
      return named ? [itemAnchor(`${named[1]}/${named[2]}`, [child])] : [child];
    }
    if (child.type !== 'text' || !child.value?.includes('[[')) {
      itemLinks(child);
      return [child];
    }
    const out: HastNode[] = [];
    let at = 0;
    for (const found of child.value.matchAll(WIKI)) {
      const [whole, kind = 'skill', name, words] = found;
      if (found.index > at) out.push({ type: 'text', value: child.value.slice(at, found.index) });
      out.push(itemAnchor(`${kind}/${name}`, [{ type: 'text', value: words?.trim() || name }]));
      at = found.index + whole.length;
    }
    if (at < child.value.length) out.push({ type: 'text', value: child.value.slice(at) });
    return out;
  });
}

function resolve(url: string, base: ReadmeBase | undefined, file: boolean): string | null {
  if (url.startsWith('#')) return url;
  // another item, by its name or its page
  if (!file && itemHref(url)) return itemHref(url);
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
      if (attr === 'href' && resolved && value !== resolved && itemHref(value)) node.properties.className = ['readme-item'];
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
      // a run of pictures is a grid of example outputs
      galleries(root);
      fixLinks(root, base);
      // after the links are fixed: the ones made here are already where they go
      itemLinks(root);
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

/** Its README as the release page's editor opens it. */
export interface ReadmeSource {
  /** What is written: a repo skill's README.md, or the README on its listing (empty when it has none). */
  text: string;
  /** file: a repo skill's README.md, edited in the repo (editUrl); listing: written here; default: none yet, the default shows. */
  source: 'file' | 'listing' | 'default';
  editUrl?: string;
  /** Where a README.md's relative links and pictures point, for the preview. */
  base?: ReadmeBase;
  /** A repo skill that also has a README saved on its listing, which wins over its file. */
  override?: boolean;
  /** The default README, shown while none is written. */
  defaultText?: string;
}
