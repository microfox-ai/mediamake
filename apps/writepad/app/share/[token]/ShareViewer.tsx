'use client';

import { useState } from 'react';
import { Download, Printer, FileText, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportMeta {
  format: 'pdf' | 'docx' | 'epub';
  fileName: string;
  projectName: string;
  createdAt: string;
  expiresAt: string;
  /** Only populated for pdf format — the full HTML document string. */
  content: string | null;
}

interface ShareViewerProps {
  token: string;
  meta: ExportMeta;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ShareViewer({ token, meta }: ShareViewerProps) {
  const [printing, setPrinting] = useState(false);
  const downloadUrl = `/api/share/${token}?dl=1`;

  function handlePrint() {
    if (!meta.content) return;
    setPrinting(true);
    const w = window.open('', '_blank', 'width=960,height=780');
    if (!w) {
      alert('Popup blocked — please allow popups and try again.');
      setPrinting(false);
      return;
    }
    w.document.write(meta.content);
    w.document.close();
    w.document.title = meta.projectName;
    w.setTimeout(() => {
      w.focus();
      w.print();
      setPrinting(false);
    }, 500);
  }

  const formatLabel =
    meta.format === 'pdf' ? 'PDF' : meta.format === 'docx' ? 'Word Document' : 'EPUB';

  const formatIcon =
    meta.format === 'epub' ? '📖' : meta.format === 'docx' ? '📄' : '🖨️';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header bar ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <span className="text-lg">{formatIcon}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {meta.projectName}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatLabel} export · shared {formatDate(meta.createdAt)} ·{' '}
              <span className="text-amber-500/80">expires {formatDate(meta.expiresAt)}</span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {meta.format === 'pdf' && meta.content && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrint}
                disabled={printing}
                className="gap-1.5 text-xs"
              >
                <Printer size={13} />
                Print / Save PDF
              </Button>
            )}
            <Button size="sm" asChild className="gap-1.5 text-xs">
              <a href={downloadUrl} download={meta.fileName}>
                <Download size={13} />
                Download {formatLabel}
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-3xl px-4 py-10">
        {meta.format === 'pdf' && meta.content ? (
          /* PDF: inline HTML preview in an iframe */
          <div className="overflow-hidden rounded-lg border border-border shadow-sm">
            <iframe
              srcDoc={meta.content}
              title={meta.projectName}
              className="h-[80vh] w-full bg-white"
              sandbox="allow-same-origin"
            />
          </div>
        ) : (
          /* EPUB / DOCX: download-only card */
          <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-muted/20 px-8 py-14 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-background text-4xl shadow-sm">
              {formatIcon}
            </div>

            <div className="space-y-1">
              <h1 className="text-lg font-semibold text-foreground">{meta.projectName}</h1>
              <p className="text-sm text-muted-foreground">{meta.fileName}</p>
            </div>

            <div className="flex flex-col gap-3 text-[11px] text-muted-foreground/70">
              <div className="flex items-center gap-1.5">
                <Clock size={11} />
                Expires {formatDate(meta.expiresAt)}
              </div>
              <div className="flex items-center gap-1.5">
                <FileText size={11} />
                {formatLabel} format — open with your e-reader or compatible app
              </div>
            </div>

            <Button size="default" asChild className="gap-2 px-6">
              <a href={downloadUrl} download={meta.fileName}>
                <Download size={15} />
                Download {formatLabel}
              </a>
            </Button>

            {meta.format === 'epub' && (
              <p className="max-w-xs text-[10px] text-muted-foreground/50">
                Open with Calibre, Apple Books, Kobo, Kindle (via Send to Kindle), or any EPUB-compatible reader.
              </p>
            )}
            {meta.format === 'docx' && (
              <p className="max-w-xs text-[10px] text-muted-foreground/50">
                Open with Microsoft Word, Google Docs, LibreOffice Writer, or any compatible word processor.
              </p>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="mt-8 border-t border-border/40 py-6 text-center">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <ExternalLink size={10} />
          Shared via Writepad
        </a>
      </footer>
    </div>
  );
}
