'use client';

import React, { useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { WikiTerm } from './types';
import { MermaidBlock } from './MermaidBlock';

// ─── Frontmatter stripper ─────────────────────────────────────────────────────
function stripFrontmatter(content: string): string {
  const match = content.match(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n?([\s\S]*)$/);
  return match ? (match[1] ?? '') : content;
}

// ─── [[wikilink]] preprocessor ────────────────────────────────────────────────
// Converts [[target]] and [[target|display]] in the markdown source to
// [display](wiki://fileId) before ReactMarkdown processes the string.
// Skips fenced code blocks (```...```) and inline code (`...`).

function processWikilinks(text: string, terms: WikiTerm[]): string {
  if (!terms.length) return text;
  // Split out fenced code blocks and inline code so we don't mangle them.
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]+`)/g);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part; // inside a code span/block — leave unchanged
      return part.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_, rawTarget, rawDisplay) => {
        const targetName = rawTarget.trim();
        const found = terms.find((wt) =>
          wt.allTerms.some((n) => n.toLowerCase() === targetName.toLowerCase()),
        );
        if (!found) {
          // No matching wiki term — keep original text
          return `[[${rawTarget}${rawDisplay ? `|${rawDisplay}` : ''}]]`;
        }
        const display = rawDisplay?.trim() ?? rawTarget.trim();
        return `[${display}](wiki://${found.fileId})`;
      });
    })
    .join('');
}

// ─── Wiki term linker ─────────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitByWikiTerms(
  text: string,
  termPairs: Array<{ pattern: string; wt: WikiTerm }>,
  combined: RegExp,
  onGoToDefinition: (fileId: string) => void,
  baseKey: string,
): React.ReactNode {
  if (!text || termPairs.length === 0) return text;
  combined.lastIndex = 0;
  if (!combined.test(text)) return text;

  combined.lastIndex = 0;
  const parts = text.split(combined);
  if (parts.length <= 1) return text;

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (i % 2 === 1) {
          const lower = part.toLowerCase();
          const found = termPairs.find((p) =>
            new RegExp(`^${p.pattern}$`, 'i').test(part),
          );
          if (found) {
            const isAlias = found.wt.term.toLowerCase() !== lower;
            return (
              <button
                key={`${baseKey}-${i}`}
                className={[
                  'wiki-preview-link',
                  'text-violet-400 underline decoration-dotted underline-offset-2',
                  'hover:text-violet-300 transition-colors cursor-pointer',
                  'bg-transparent border-0 p-0 font-[inherit] text-[inherit]',
                ].join(' ')}
                onClick={() => onGoToDefinition(found.wt.fileId)}
                title={
                  isAlias
                    ? `Wiki — ${found.wt.term} (alias: ${part})`
                    : `Wiki — ${found.wt.term}`
                }
              >
                {part}
              </button>
            );
          }
        }
        return <React.Fragment key={`${baseKey}-${i}`}>{part}</React.Fragment>;
      })}
    </>
  );
}

function walkChildren(
  node: React.ReactNode,
  linkify: (text: string, key: string) => React.ReactNode,
  key = '0',
): React.ReactNode {
  if (typeof node === 'string') return linkify(node, key);
  if (typeof node === 'number') return node;
  if (node === null || node === undefined || typeof node === 'boolean') return node;

  if (Array.isArray(node)) {
    return node.map((child, i) => (
      <React.Fragment key={i}>{walkChildren(child, linkify, `${key}-${i}`)}</React.Fragment>
    ));
  }

  if (React.isValidElement(node)) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    const elType = typeof el.type === 'string' ? el.type : '';
    if (['code', 'pre', 'a'].includes(elType)) return node;
    if (el.props.children == null) return node;
    return React.cloneElement(el, {
      children: walkChildren(el.props.children, linkify, key),
    });
  }

  return node;
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface Backlink {
  fileId: string;
  filePath: string;
  count: number;
}

interface MarkdownPreviewProps {
  content: string;
  wikiTerms?: WikiTerm[];
  onGoToDefinition?: (fileId: string) => void;
  /** Files that reference this wiki entry — shown at the bottom as a backlinks section. */
  backlinks?: Backlink[] | null;
}

function isDirectVideoFileUrl(href: string | undefined): boolean {
  if (!href) return false;
  const pathOnly = href.split('#')[0]?.split('?')[0] ?? '';
  return /\.(mp4|webm|ogg|mov|m4v)$/i.test(pathOnly);
}

export function MarkdownPreview({ content, wikiTerms, onGoToDefinition, backlinks }: MarkdownPreviewProps) {
  // Strip YAML frontmatter, then convert [[wikilink]] syntax to markdown links
  const displayContent = useMemo(() => {
    const stripped = stripFrontmatter(content);
    return wikiTerms?.length ? processWikilinks(stripped, wikiTerms) : stripped;
  }, [content, wikiTerms]);

  const { termPairs, combined } = useMemo(() => {
    if (!wikiTerms?.length) return { termPairs: [], combined: /(?:)/ };
    const pairs: Array<{ pattern: string; wt: WikiTerm }> = [];
    for (const wt of wikiTerms) {
      for (const name of wt.allTerms) {
        if (name.trim()) pairs.push({ pattern: escapeRegex(name), wt });
      }
    }
    pairs.sort((a, b) => b.pattern.length - a.pattern.length);
    const re = new RegExp(`(\\b(?:${pairs.map((p) => p.pattern).join('|')})\\b)`, 'gi');
    return { termPairs: pairs, combined: re };
  }, [wikiTerms]);

  const hasWiki = termPairs.length > 0 && !!onGoToDefinition;

  const linkify = useCallback(
    (text: string, key: string): React.ReactNode => {
      if (!hasWiki || !onGoToDefinition) return text;
      return splitByWikiTerms(text, termPairs, combined, onGoToDefinition, key);
    },
    [hasWiki, termPairs, combined, onGoToDefinition],
  );

  const wikiChildren = useCallback(
    (children: React.ReactNode, key = 'r'): React.ReactNode =>
      hasWiki ? walkChildren(children, linkify, key) : children,
    [hasWiki, linkify],
  );

  return (
    <div className="h-full overflow-y-auto bg-background px-10 py-8">
      <div className="mx-auto max-w-3xl">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="mb-4 mt-8 text-2xl font-bold text-foreground first:mt-0 border-b border-border pb-2">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="mb-3 mt-7 text-xl font-semibold text-foreground/90">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="mb-2 mt-5 text-base font-semibold text-foreground/85">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="mb-4 leading-7 text-foreground/75 text-[13px]">{wikiChildren(children, 'p')}</p>
            ),
            strong: ({ children }) => (
              <strong className="font-bold text-foreground">{wikiChildren(children, 'strong')}</strong>
            ),
            em: ({ children }) => (
              <em className="italic text-foreground/80">{wikiChildren(children, 'em')}</em>
            ),
            blockquote: ({ children }) => (
              <blockquote className="my-4 border-l-4 border-violet-500/50 pl-4 text-foreground/55 italic">
                {wikiChildren(children, 'bq')}
              </blockquote>
            ),
            ul: ({ children }) => (
              <ul className="mb-4 ml-5 list-disc space-y-1 text-foreground/75 text-[13px] marker:text-violet-400/60">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-4 ml-5 list-decimal space-y-1 text-foreground/75 text-[13px] marker:text-violet-400/60">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="leading-6">{wikiChildren(children, 'li')}</li>
            ),
            hr: () => <hr className="my-6 border-border" />,
            code: ({ children, className }) => {
              // Mermaid diagrams — render as interactive SVG
              if (className === 'language-mermaid') {
                return <MermaidBlock code={String(children).trim()} />;
              }
              const isBlock = className?.includes('language-');
              if (isBlock) {
                return (
                  <pre className="my-4 overflow-x-auto rounded-md bg-muted p-4 text-[12px] font-mono text-foreground/80">
                    <code>{children}</code>
                  </pre>
                );
              }
              return (
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground/80">
                  {children}
                </code>
              );
            },
            table: ({ children }) => (
              <div className="my-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-[12px] text-foreground/70">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="border-b border-border bg-muted/50">{children}</thead>
            ),
            th: ({ children }) => (
              <th className="px-3 py-2 text-left font-semibold text-foreground/80">
                {wikiChildren(children, 'th')}
              </th>
            ),
            td: ({ children }) => (
              <td className="border-b border-border/50 px-3 py-2">
                {wikiChildren(children, 'td')}
              </td>
            ),
            a: ({ children, href }) =>
              // [[wikilink]] syntax — converted to wiki://fileId before rendering
              href?.startsWith('wiki://') ? (
                <button
                  className={[
                    'wiki-preview-link',
                    'text-violet-400 underline decoration-solid underline-offset-2',
                    'hover:text-violet-300 transition-colors cursor-pointer',
                    'bg-transparent border-0 p-0 font-[inherit] text-[inherit]',
                  ].join(' ')}
                  onClick={() => onGoToDefinition?.(href.slice('wiki://'.length))}
                  title="Wiki link — click to open"
                >
                  {children}
                </button>
              ) : isDirectVideoFileUrl(href) ? (
                <span className="my-4 block space-y-2">
                  <video
                    src={href}
                    controls
                    className="max-h-[min(70vh,560px)] w-full max-w-full rounded-md border border-border/60 bg-black"
                    preload="metadata"
                  />
                  <a
                    href={href}
                    className="inline-block text-[12px] text-violet-600 dark:text-violet-400 underline underline-offset-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                </span>
              ) : (
                <a
                  href={href}
                  className="text-violet-600 dark:text-violet-400 underline underline-offset-2 hover:text-violet-500 dark:hover:text-violet-300"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
            img: ({ src, alt }) =>
              isDirectVideoFileUrl(src) ? (
                <video
                  src={src}
                  controls
                  className="my-4 max-h-[min(70vh,560px)] w-full max-w-full rounded-md border border-border/60 bg-black"
                  preload="metadata"
                  title={alt ?? undefined}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- external CDN URLs from Mediamake / user markdown
                <img
                  src={src}
                  alt={alt ?? ''}
                  loading="lazy"
                  className="my-4 max-h-[min(70vh,560px)] w-auto max-w-full rounded-md border border-border/60 object-contain"
                />
              ),
          }}
        >
          {displayContent}
        </ReactMarkdown>

        {/* ── Backlinks section ─────────────────────────────────────────── */}
        {backlinks && backlinks.length > 0 && (
          <div className="mt-10 pt-6 border-t border-border/40">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              Referenced in
            </p>
            <div className="flex flex-col gap-0.5">
              {backlinks.map(({ fileId, filePath, count }) => (
                <button
                  key={fileId}
                  className="flex items-center justify-between gap-3 rounded px-2 py-1.5 text-left hover:bg-accent transition-colors group"
                  onClick={() => onGoToDefinition?.(fileId)}
                >
                  <span className="text-[12px] text-violet-400 truncate group-hover:text-violet-300 transition-colors">
                    {filePath}
                  </span>
                  <span className="shrink-0 rounded-full bg-violet-500/15 border border-violet-500/20 px-1.5 py-0.5 text-[9px] text-violet-400/80">
                    ×{count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
