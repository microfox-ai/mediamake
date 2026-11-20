import { Fragment } from 'react';
import type { AuthorShown } from '@/lib/catalog/authors';
import { cn } from '@/lib/utils';

/** An item's authors, as its page names them: a GitHub login (linked) or a display name, never an email. */
export function AuthorsLine({ authors, label = true, className }: { authors: AuthorShown[]; label?: boolean; className?: string }) {
  if (authors.length === 0) return null;
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      {label && (authors.length === 1 ? 'Author: ' : 'Authors: ')}
      {authors.map((author, i) => (
        <Fragment key={`${author.name}-${i}`}>
          {i > 0 && ', '}
          {author.github ? (
            <a href={`https://github.com/${author.github}`} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:underline">
              {author.name}
            </a>
          ) : (
            <span className="font-medium text-foreground">{author.name}</span>
          )}
        </Fragment>
      ))}
    </p>
  );
}
