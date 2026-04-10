'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  content: string;
}

/** Direct file URLs (e.g. Mediamake CDN .mp4 links) — show inline player in preview. */
function isDirectVideoFileUrl(href: string | undefined): boolean {
  if (!href) return false;
  const pathOnly = href.split('#')[0]?.split('?')[0] ?? '';
  return /\.(mp4|webm|ogg|mov|m4v)$/i.test(pathOnly);
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
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
              <p className="mb-4 leading-7 text-foreground/75 text-[13px]">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="font-bold text-foreground">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic text-foreground/80">{children}</em>
            ),
            blockquote: ({ children }) => (
              <blockquote className="my-4 border-l-4 border-violet-500/50 pl-4 text-foreground/55 italic">
                {children}
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
            li: ({ children }) => <li className="leading-6">{children}</li>,
            hr: () => <hr className="my-6 border-border" />,
            code: ({ children, className }) => {
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
              <th className="px-3 py-2 text-left font-semibold text-foreground/80">{children}</th>
            ),
            td: ({ children }) => (
              <td className="border-b border-border/50 px-3 py-2">{children}</td>
            ),
            a: ({ children, href }) =>
              isDirectVideoFileUrl(href) ? (
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
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
