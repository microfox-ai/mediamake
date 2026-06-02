'use client';

/**
 * ExportDialog — export project files as PDF, DOCX, or EPUB.
 *
 * Features:
 *  - Select which files to export (checkboxes)
 *  - Reorder the export list (up/down arrows)
 *  - Combine into one document OR export each file separately
 *  - Toggle file-name section headers (only relevant when combining)
 *  - Format: PDF (browser print dialog), DOCX (.doc), or EPUB (fflate zip)
 *  - Share button: stores export on server, copies a public link to clipboard
 *
 * EPUB uses fflate for client-side ZIP generation — no extra server needed
 * for the download path. For sharing, content is POSTed to the API and a
 * time-limited public URL is returned.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ChevronUp,
  ChevronDown,
  FileText,
  Download,
  Loader2,
  CheckSquare,
  Square,
  LayoutList,
  Files,
  Heading,
  Share2,
  Check,
  BookOpen,
} from 'lucide-react';
import type { ProjectFile } from '../right/types';
import { buildEpub, triggerEpubDownload } from '@/lib/epub';

// ── Types ─────────────────────────────────────────────────────────────────────

type ExportFormat = 'pdf' | 'docx' | 'epub';

interface ExportItem {
  fileId: string;
  path: string;    // full path e.g. "chapter1/intro.md"
  fileName: string;
  content: string;
}

export interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  getAllFiles: () => ProjectFile[];
  filePathMap: Record<string, string>;
  projectName: string;
  projectId: string;
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convert a markdown string to an HTML body fragment.
 *
 * Handles: fenced code blocks, inline code, headings (ATX), blockquotes,
 * bold / italic (*** ** * __ _), images, links, task lists, unordered &
 * ordered lists, horizontal rules, and paragraph wrapping.
 *
 * Mermaid fenced blocks (```mermaid) are replaced with a styled placeholder
 * since client-side SVG rendering is unavailable in a print window or EPUB.
 */
function markdownToHtmlBody(md: string, forEpub = false): string {
  let s = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Strip YAML frontmatter
  s = s.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n?/, '');

  // ── 1. Extract fenced code blocks ─────────────────────────────────────────
  const codeBlocks: string[] = [];
  s = s.replace(/```([^\n]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const i = codeBlocks.length;
    const langTrimmed = lang.trim().toLowerCase();

    if (langTrimmed === 'mermaid') {
      // Mermaid: render a descriptive placeholder
      const placeholder = forEpub
        ? `<div class="mermaid-placeholder"><p><em>[Diagram — view in Writepad]</em></p><pre>${esc(code)}</pre></div>`
        : `<div style="border:1px solid #9966cc33;border-radius:6px;padding:12px 16px;margin:1em 0;background:#f9f5ff;color:#555;font-size:.85em"><p style="margin:0 0 6px;font-weight:600;color:#7c3aed;font-size:.78em;text-transform:uppercase;letter-spacing:.08em">Diagram (Mermaid)</p><pre style="margin:0;font-size:.8em;background:none;border:none;padding:0;color:#444">${esc(code)}</pre></div>`;
      codeBlocks.push(placeholder);
    } else {
      const langAttr = langTrimmed ? ` class="language-${esc(langTrimmed)}"` : '';
      codeBlocks.push(`<pre><code${langAttr}>${esc(code)}</code></pre>`);
    }
    return `\x01${i}\x01`;
  });

  // ── 2. Extract inline code ─────────────────────────────────────────────────
  const inlineCodes: string[] = [];
  s = s.replace(/`([^`\n]+)`/g, (_, c) => {
    const i = inlineCodes.length;
    inlineCodes.push(`<code>${esc(c)}</code>`);
    return `\x02${i}\x02`;
  });

  // ── 3. Escape remaining HTML chars ────────────────────────────────────────
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ── 4. Block elements ─────────────────────────────────────────────────────

  // Horizontal rules
  s = s.replace(/^[ \t]*(?:[-*_][ \t]*){3,}$/gm, '<hr/>');

  // ATX headings
  s = s.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
  s = s.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
  s = s.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  s = s.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Blockquotes
  s = s.replace(/^&gt; (.+)$/gm, '<blockquote><p>$1</p></blockquote>');

  // ── 5. Inline elements ────────────────────────────────────────────────────

  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__(.+?)__/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  s = s.replace(/_([^_\n]+)_/g, '<em>$1</em>');

  // Images (before links)
  s = s.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" style="max-width:100%;height:auto;"/>',
  );
  // Links — strip wiki:// hrefs
  s = s.replace(/\[([^\]]+)\]\(wiki:\/\/[^)]+\)/g, '$1');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // ── 6. Lists ──────────────────────────────────────────────────────────────

  s = s.replace(/^[-*+] \[x\] (.+)$/gim, '<li class="task-done">&#x2705;&nbsp;$1</li>');
  s = s.replace(/^[-*+] \[ \] (.+)$/gm,  '<li class="task-open">&#x25A1;&nbsp;$1</li>');
  s = s.replace(/^[-*+] (.+)$/gm, '<li>$1</li>');
  s = s.replace(/^\d+\. (.+)$/gm, '<OLI>$1</OLI>');
  s = s.replace(/((?:<li(?:[^>]*)>[^\n]*<\/li>\n?)+)/g, '<ul>$1</ul>');
  s = s.replace(/((?:<OLI>[^\n]*<\/OLI>\n?)+)/g, (m) =>
    '<ol>' + m.replace(/<OLI>/g, '<li>').replace(/<\/OLI>/g, '</li>') + '</ol>',
  );

  // ── 7. Paragraphs ─────────────────────────────────────────────────────────
  const BLOCK_TAG = /^<(?:h[1-6]|ul|ol|pre|hr|blockquote|table|figure|div)\b/;

  s = s
    .split(/\n{2,}/)
    .map((part) => {
      const t = part.trim();
      if (!t) return '';
      if (BLOCK_TAG.test(t)) return t;
      if (/^\x01\d+\x01$/.test(t)) return t;
      return `<p>${t.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');

  // ── 8. Restore code placeholders ──────────────────────────────────────────
  s = s.replace(/\x02(\d+)\x02/g, (_, i) => inlineCodes[+i] ?? '');
  s = s.replace(/\x01(\d+)\x01/g, (_, i) => codeBlocks[+i] ?? '');

  return s;
}

// ── Stylesheets ───────────────────────────────────────────────────────────────

const PDF_CSS = `
*, *::before, *::after { box-sizing: border-box; }
@page { margin: 2cm; }
body {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 12pt;
  line-height: 1.75;
  color: #1a1a1a;
  max-width: 820px;
  margin: 0 auto;
  padding: 24px;
}
h1 { font-size: 2em; font-weight: 700; border-bottom: 2px solid #444; padding-bottom: .25em; margin: 1.6em 0 .5em; }
h2 { font-size: 1.45em; font-weight: 700; border-bottom: 1px solid #bbb; padding-bottom: .2em; margin: 1.4em 0 .4em; }
h3 { font-size: 1.15em; font-weight: 700; margin: 1.2em 0 .3em; }
h4, h5, h6 { font-size: 1em; font-weight: 700; margin: 1em 0 .25em; }
p { margin: 0 0 .85em; }
a { color: #0066cc; }
strong { font-weight: 700; }
em { font-style: italic; }
code { font-family: 'Courier New', Courier, monospace; font-size: 0.86em; background: #f2f2f2; border: 1px solid #ddd; padding: 1px 4px; border-radius: 3px; }
pre { font-family: 'Courier New', Courier, monospace; font-size: 0.84em; line-height: 1.5; background: #f6f6f6; border: 1px solid #ddd; border-radius: 4px; padding: 12px 16px; margin: 1em 0; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
pre code { background: none; border: none; padding: 0; border-radius: 0; }
blockquote { border-left: 4px solid #9966cc; margin: 1em 0; padding: .4em 1em; color: #555; font-style: italic; }
blockquote p { margin: 0; }
ul, ol { padding-left: 1.75em; margin: .5em 0 .85em; }
li { margin: .25em 0; line-height: 1.65; }
.task-done { list-style: none; margin-left: -1em; }
.task-open { list-style: none; margin-left: -1em; }
hr { border: none; border-top: 1px solid #ccc; margin: 2em 0; }
img { max-width: 100%; height: auto; display: block; margin: .75em 0; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: .92em; }
th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; vertical-align: top; }
th { background: #f0f0f0; font-weight: 700; }
tr:nth-child(even) td { background: #fafafa; }
.export-section { page-break-before: always; }
.export-section:first-child { page-break-before: avoid; }
.export-section-title { font-size: .72em; font-family: 'Helvetica Neue', Arial, sans-serif; text-transform: uppercase; letter-spacing: .12em; color: #999; margin-bottom: 1.6em; border-bottom: 1px solid #e8e8e8; padding-bottom: .4em; }
`;

const WORD_CSS = `
@page Section1 { margin: 1in; mso-header-margin: .5in; mso-footer-margin: .5in; mso-paper-source: 0; }
div.Section1 { page: Section1; }
body { font-family: Calibri, Arial, sans-serif; font-size: 11.0pt; line-height: 1.5; color: #1A1A1A; margin: 0; }
h1 { mso-style-name: "Heading 1"; font-family: "Calibri Light", Calibri, Arial, sans-serif; font-size: 18.0pt; font-weight: bold; color: #2C3E50; border-bottom: 2px solid #2C3E50; padding-bottom: 3pt; margin-top: 18pt; margin-bottom: 6pt; }
h2 { mso-style-name: "Heading 2"; font-family: "Calibri Light", Calibri, Arial, sans-serif; font-size: 14.0pt; font-weight: bold; color: #2980B9; border-bottom: 1px solid #C5D9F1; padding-bottom: 2pt; margin-top: 14pt; margin-bottom: 4pt; }
h3 { mso-style-name: "Heading 3"; font-size: 12.5pt; font-weight: bold; color: #27AE60; margin-top: 12pt; margin-bottom: 3pt; }
h4 { mso-style-name: "Heading 4"; font-size: 11.5pt; font-weight: bold; color: #8E44AD; margin-top: 10pt; margin-bottom: 2pt; }
h5, h6 { font-size: 11.0pt; font-weight: bold; color: #555555; margin-top: 9pt; margin-bottom: 2pt; }
p { font-size: 11.0pt; line-height: 1.5; margin-top: 0; margin-bottom: 6pt; mso-line-height-rule: exactly; }
a { color: #0563C1; text-decoration: underline; }
strong { font-weight: bold; }
em { font-style: italic; }
code { font-family: "Courier New", Courier, monospace; font-size: 9.5pt; background: #F2F2F2; border: 1px solid #CCCCCC; padding: 1px 3px; mso-highlight: #F2F2F2; }
pre { font-family: "Courier New", Courier, monospace; font-size: 9.5pt; line-height: 1.4; background: #F5F5F5; border: 1px solid #CCCCCC; padding: 8pt 10pt; margin: 6pt 0 8pt; white-space: pre-wrap; word-break: break-all; }
pre code { background: none; border: none; padding: 0; }
blockquote { margin: 6pt 0 6pt 18pt; padding: 4pt 8pt; border-left: 3pt solid #7B68EE; color: #555555; font-style: italic; mso-element: para-border-div; }
blockquote p { margin: 0; }
ul, ol { margin-top: 3pt; margin-bottom: 6pt; padding-left: 18pt; }
li { margin-top: 1pt; margin-bottom: 1pt; line-height: 1.5; font-size: 11.0pt; }
.task-done { list-style: none; margin-left: -12pt; color: #27AE60; }
.task-open { list-style: none; margin-left: -12pt; color: #555555; }
hr { border: none; border-top: 1px solid #CCCCCC; margin: 10pt 0; mso-element: para-border-div; }
img { max-width: 100%; height: auto; display: block; margin: 6pt 0; }
table { border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 10.5pt; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
th, td { border: 1px solid #AAAAAA; padding: 4pt 7pt; text-align: left; vertical-align: top; }
th { background: #E7E6E6; font-weight: bold; mso-highlight: #E7E6E6; }
tr:nth-child(even) td { background: #F9F9F9; mso-highlight: #F9F9F9; }
.export-section { page-break-before: always; mso-break-type: page-break; }
.export-section:first-child { page-break-before: avoid; }
.export-section-title { font-size: 8.0pt; font-family: Calibri, Arial, sans-serif; text-transform: uppercase; letter-spacing: .08em; color: #888888; margin-top: 0; margin-bottom: 10pt; border-bottom: 1px solid #DDDDDD; padding-bottom: 3pt; }
`;

// ── Document builders ──────────────────────────────────────────────────────────

function buildHtmlDocument(title: string, body: string, format: 'pdf' | 'docx'): string {
  const forWord = format === 'docx';
  const css = forWord ? WORD_CSS : PDF_CSS;
  const wordAttrs = forWord
    ? ' xmlns:o="urn:schemas-microsoft-com:office:office"' +
      ' xmlns:w="urn:schemas-microsoft-com:office:word"' +
      ' xmlns="http://www.w3.org/TR/REC-html40"'
    : '';
  const wordConditional = forWord
    ? `<!--[if gte mso 9]><xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml><![endif]-->`
    : '';
  const bodyWrapper = forWord ? `<div class="Section1">\n${body}\n</div>` : body;
  return `<!DOCTYPE html>
<html${wordAttrs}>
<head>
  <meta charset="utf-8"/>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
  <title>${esc(title)}</title>
  ${wordConditional}
  <style type="text/css">${css}</style>
</head>
<body>
${bodyWrapper}
</body>
</html>`;
}

interface BuildBodyOptions {
  combine: boolean;
  showFileHeaders: boolean;
  forEpub?: boolean;
}

function buildBodyContent(selectedItems: ExportItem[], { combine, showFileHeaders, forEpub = false }: BuildBodyOptions): string {
  if (!combine) {
    const item = selectedItems[0];
    if (!item) return '';
    return markdownToHtmlBody(item.content, forEpub);
  }
  return selectedItems
    .map((item) => {
      const body = markdownToHtmlBody(item.content, forEpub);
      const headerHtml =
        showFileHeaders && selectedItems.length > 1
          ? `<p class="export-section-title">${esc(item.path)}</p>`
          : '';
      return `<div class="export-section">${headerHtml}${body}</div>`;
    })
    .join('\n');
}

// ── Export triggers ────────────────────────────────────────────────────────────

function triggerPdfPrint(html: string, title: string) {
  const w = window.open('', '_blank', 'width=960,height=780');
  if (!w) {
    alert('Popup blocked. Please allow popups for this site to export as PDF.');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.document.title = title;
  w.setTimeout(() => { w.focus(); w.print(); }, 450);
}

function triggerDocxDownload(html: string, fileName: string) {
  const blob = new Blob(['﻿' + html], {
    type: 'application/vnd.ms-word;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_');
}

/** POST export content to the server and return the share URL. */
async function createShareLink(
  projectId: string,
  format: ExportFormat,
  content: string,
  fileName: string,
): Promise<string> {
  const res = await fetch(`/api/projects/${projectId}/exports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, content, fileName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to create share link');
  }
  const data = (await res.json()) as { shareUrl: string };
  return data.shareUrl;
}

// ── ExportDialog ──────────────────────────────────────────────────────────────

export function ExportDialog({
  open,
  onClose,
  getAllFiles,
  filePathMap,
  projectName,
  projectId,
}: ExportDialogProps) {
  const allExportable = useMemo(() => {
    if (!open) return [];
    return getAllFiles()
      .filter((f) => {
        if (f.type !== 'file') return false;
        const path = filePathMap[f.fileId] ?? f.fileName;
        return !path.toLowerCase().startsWith('.writepad/');
      })
      .map<ExportItem>((f) => ({
        fileId: f.fileId,
        path: filePathMap[f.fileId] ?? f.fileName,
        fileName: f.fileName,
        content: f.content,
      }));
  }, [open, getAllFiles, filePathMap]);

  const [orderedItems, setOrderedItems] = useState<ExportItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [combine, setCombine] = useState(true);
  const [showFileHeaders, setShowFileHeaders] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setOrderedItems(allExportable);
      setSelectedIds(new Set(allExportable.map((f) => f.fileId)));
      setExporting(false);
      setSharing(false);
      setShareUrl(null);
      setCopied(false);
    }
  }, [open, allExportable]);

  const selectedItems = useMemo(
    () => orderedItems.filter((f) => selectedIds.has(f.fileId)),
    [orderedItems, selectedIds],
  );

  const allSelected = selectedItems.length === orderedItems.length && orderedItems.length > 0;
  const noneSelected = selectedItems.length === 0;
  const showHeadersToggleVisible = combine && selectedItems.length >= 2;

  const toggleAll = useCallback(() => {
    setSelectedIds(
      allSelected ? new Set() : new Set(orderedItems.map((f) => f.fileId)),
    );
  }, [allSelected, orderedItems]);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const moveItem = useCallback((idx: number, dir: -1 | 1) => {
    setOrderedItems((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target]!, next[idx]!];
      return next;
    });
  }, []);

  const handleExport = useCallback(async () => {
    if (selectedItems.length === 0) return;
    setExporting(true);
    setShareUrl(null);

    try {
      const baseName = sanitizeFileName(projectName || 'export');

      if (format === 'epub') {
        const chapters = selectedItems.map((item, i) => ({
          id: `ch${String(i + 1).padStart(3, '0')}`,
          title: item.path,
          bodyHtml: markdownToHtmlBody(item.content, true),
        }));
        const bytes = buildEpub({ title: projectName || 'Export', chapters });
        triggerEpubDownload(bytes, `${baseName}.epub`);
        return;
      }

      if (combine) {
        const body = buildBodyContent(selectedItems, { combine, showFileHeaders });
        const title = projectName || 'Export';
        const html = buildHtmlDocument(title, body, format as 'pdf' | 'docx');
        if (format === 'pdf') {
          triggerPdfPrint(html, title);
        } else {
          triggerDocxDownload(html, `${baseName}.doc`);
        }
      } else {
        for (let i = 0; i < selectedItems.length; i++) {
          const item = selectedItems[i]!;
          const body = buildBodyContent([item], { combine: false, showFileHeaders });
          const title = item.path;
          const html = buildHtmlDocument(title, body, format as 'pdf' | 'docx');
          const safeFile = sanitizeFileName(item.fileName.replace(/\.md$/i, ''));

          if (format === 'pdf') {
            triggerPdfPrint(html, title);
            if (i < selectedItems.length - 1) await new Promise((r) => setTimeout(r, 650));
          } else {
            triggerDocxDownload(html, `${safeFile}.doc`);
            if (i < selectedItems.length - 1) await new Promise((r) => setTimeout(r, 130));
          }
        }
      }
    } finally {
      setExporting(false);
    }
  }, [selectedItems, combine, showFileHeaders, format, projectName]);

  const handleShare = useCallback(async () => {
    if (selectedItems.length === 0) return;
    setSharing(true);
    setShareUrl(null);
    setCopied(false);

    try {
      // Always combine for share links
      const itemsToShare = combine ? selectedItems : selectedItems;
      const baseName = sanitizeFileName(projectName || 'export');
      const ext = format === 'docx' ? 'doc' : format;
      const fileName = `${baseName}.${ext}`;

      let content: string;

      if (format === 'epub') {
        const chapters = itemsToShare.map((item, i) => ({
          id: `ch${String(i + 1).padStart(3, '0')}`,
          title: item.path,
          bodyHtml: markdownToHtmlBody(item.content, true),
        }));
        const bytes = buildEpub({ title: projectName || 'Export', chapters });
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
        content = btoa(binary);
      } else {
        const body = buildBodyContent(itemsToShare, { combine: true, showFileHeaders, forEpub: false });
        const title = projectName || 'Export';
        content = buildHtmlDocument(title, body, format as 'pdf' | 'docx');
      }

      const url = await createShareLink(projectId, format, content, fileName);
      setShareUrl(url);

      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch {
        // clipboard may be denied — still show the URL
      }
    } catch (err) {
      alert(`Failed to create share link: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSharing(false);
    }
  }, [selectedItems, combine, showFileHeaders, format, projectName, projectId]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download size={16} className="text-primary" />
            Export Files
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">

          {/* ── Format ────────────────────────────────────────────────── */}
          <Section label="Format">
            <div className="flex gap-2 flex-wrap">
              <ToggleButton
                active={format === 'pdf'}
                onClick={() => { setFormat('pdf'); setShareUrl(null); }}
                icon={<FileText size={12} />}
                label="PDF"
              />
              <ToggleButton
                active={format === 'docx'}
                onClick={() => { setFormat('docx'); setShareUrl(null); }}
                icon={<FileText size={12} />}
                label="DOCX"
              />
              <ToggleButton
                active={format === 'epub'}
                onClick={() => { setFormat('epub'); setShareUrl(null); }}
                icon={<BookOpen size={12} />}
                label="EPUB"
              />
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground/60">
              {format === 'pdf'
                ? 'Opens a print dialog — choose "Save as PDF" in your browser.'
                : format === 'docx'
                ? 'Downloads a .doc file that opens in Microsoft Word and Google Docs.'
                : 'Downloads an EPUB 3 file — works with Kindle, Apple Books, Kobo, Calibre, and more.'}
            </p>
          </Section>

          {/* ── Clubbing (hidden for EPUB since it always combines) ────ー */}
          {format !== 'epub' && (
            <Section label="Clubbing">
              <div className="flex gap-2 flex-wrap">
                <ToggleButton
                  active={combine}
                  onClick={() => setCombine(true)}
                  icon={<LayoutList size={12} />}
                  label="Combined document"
                />
                <ToggleButton
                  active={!combine}
                  onClick={() => setCombine(false)}
                  icon={<Files size={12} />}
                  label="Separate files"
                />
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground/60">
                {combine
                  ? 'All selected files merged into one document in the order below.'
                  : 'Each file exported individually. Order determines download sequence.'}
              </p>

              {showHeadersToggleVisible && (
                <label className="mt-2.5 flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2 transition-colors hover:bg-muted/40 select-none">
                  <Heading size={12} className="shrink-0 text-muted-foreground/60" />
                  <span className="flex-1 text-[11px] text-foreground/70">
                    Show file name headers between sections
                  </span>
                  <input
                    type="checkbox"
                    checked={showFileHeaders}
                    onChange={(e) => setShowFileHeaders(e.target.checked)}
                    className="h-3.5 w-3.5 accent-primary cursor-pointer"
                  />
                </label>
              )}
            </Section>
          )}

          {/* ── File list ─────────────────────────────────────────────── */}
          <Section
            label={
              <>
                Files
                {selectedItems.length > 0 && (
                  <span className="ml-1.5 font-normal normal-case text-muted-foreground/50">
                    ({selectedItems.length} selected)
                  </span>
                )}
              </>
            }
            action={
              <button
                onClick={toggleAll}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {allSelected ? <CheckSquare size={10} /> : <Square size={10} />}
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            }
          >
            {orderedItems.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground/50">
                No files in this project yet.
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto rounded-md border border-border">
                {orderedItems.map((item, idx) => {
                  const isSelected = selectedIds.has(item.fileId);
                  const orderNum = (combine || format === 'epub') && isSelected
                    ? selectedItems.indexOf(item) + 1
                    : null;
                  return (
                    <div
                      key={item.fileId}
                      className={cn(
                        'flex items-center gap-2 border-b border-border/40 px-2.5 py-2 last:border-b-0 transition-colors',
                        isSelected ? 'bg-background' : 'bg-muted/15',
                      )}
                    >
                      <button
                        onClick={() => toggleItem(item.fileId)}
                        className={cn(
                          'shrink-0 transition-colors',
                          isSelected
                            ? 'text-primary'
                            : 'text-muted-foreground/25 hover:text-muted-foreground',
                        )}
                        title={isSelected ? 'Deselect' : 'Select'}
                      >
                        {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'truncate text-[11px]',
                            isSelected
                              ? 'text-foreground/80'
                              : 'text-muted-foreground/35 line-through',
                          )}
                          title={item.path}
                        >
                          {item.path}
                        </p>
                      </div>

                      {orderNum !== null && (
                        <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-primary">
                          {orderNum}
                        </span>
                      )}

                      <div className="flex shrink-0 flex-col gap-0.5">
                        <button
                          onClick={() => moveItem(idx, -1)}
                          disabled={idx === 0}
                          className="rounded p-0.5 text-muted-foreground/35 hover:text-foreground transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          onClick={() => moveItem(idx, 1)}
                          disabled={idx === orderedItems.length - 1}
                          className="rounded p-0.5 text-muted-foreground/35 hover:text-foreground transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* ── Share URL display ─────────────────────────────────────── */}
          {shareUrl && (
            <div className="rounded-md border border-violet-500/20 bg-violet-500/5 px-3 py-2.5">
              <p className="mb-1 text-[10px] font-medium text-violet-400">Share link created</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 rounded bg-background/50 px-2 py-1 text-[11px] text-foreground/80 font-mono border border-border/50 outline-none"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 3000);
                  }}
                  className="shrink-0 rounded border border-border/60 bg-background px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? <Check size={11} className="text-green-400" /> : 'Copy'}
                </button>
              </div>
              <p className="mt-1 text-[9px] text-muted-foreground/50">
                Link expires in 30 days. Anyone with the link can view and download.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onClose} disabled={exporting || sharing}>
            Cancel
          </Button>

          {/* Share button */}
          <Button
            variant="outline"
            onClick={handleShare}
            disabled={noneSelected || exporting || sharing}
            className="gap-1.5"
          >
            {sharing ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Sharing…
              </>
            ) : copied ? (
              <>
                <Check size={13} className="text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Share2 size={13} />
                Share link
              </>
            )}
          </Button>

          {/* Download button */}
          <Button onClick={handleExport} disabled={noneSelected || exporting || sharing}>
            {exporting ? (
              <>
                <Loader2 size={13} className="animate-spin mr-1.5" />
                Exporting…
              </>
            ) : (
              <>
                <Download size={13} className="mr-1.5" />
                Export{selectedItems.length > 0
                  ? ` ${selectedItems.length} file${selectedItems.length !== 1 ? 's' : ''}`
                  : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Small shared sub-components ───────────────────────────────────────────────

function Section({
  label,
  action,
  children,
}: {
  label: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
