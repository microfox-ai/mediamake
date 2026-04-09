'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Renders assistant chat text with GitHub-flavored markdown (bold, lists, headings, etc.). */
export function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="w-full min-w-0 text-[12px] leading-relaxed text-foreground/85 [&>*:first-child]:mt-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-2 mt-4 border-b border-border/60 pb-1.5 text-base font-bold text-foreground first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 text-[13px] font-semibold text-foreground/95 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-3 text-[12px] font-semibold text-foreground/90 first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-1 mt-2 text-[12px] font-medium text-foreground/85 first:mt-0">{children}</h4>
          ),
          p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-violet-500/40 pl-3 text-foreground/70 italic">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 ml-4 list-disc space-y-1 marker:text-violet-400/70 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 ml-4 list-decimal space-y-1 marker:text-violet-400/70 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed [&>p]:mb-1 [&>p]:last:mb-0">{children}</li>,
          hr: () => <hr className="my-3 border-border/70" />,
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return (
                <pre className="my-2 overflow-x-auto rounded-md border border-border/50 bg-muted/50 p-2.5 font-mono text-[11px] text-foreground/80">
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code className="rounded bg-muted/80 px-1 py-0.5 font-mono text-[11px] text-foreground/85">
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto rounded-md border border-border/50">
              <table className="min-w-full border-collapse text-[11px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-border bg-muted/40">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-2 py-1.5 text-left font-semibold text-foreground/90">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-t border-border/40 px-2 py-1.5 align-top text-foreground/75">{children}</td>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-violet-600 underline underline-offset-2 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
