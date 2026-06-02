/**
 * epub.ts — EPUB 3 generator that runs entirely in the browser.
 *
 * Produces a valid EPUB 3.0 ZIP blob using fflate. The mimetype entry is
 * always stored uncompressed and placed first, as required by the EPUB spec.
 *
 * Usage:
 *   const blob = buildEpub({ title, author, chapters });
 *   triggerDownload(blob, 'my-book.epub');
 */

import { zipSync, type Zippable } from 'fflate';

// ─── Public API ───────────────────────────────────────────────────────────────

export interface EpubChapter {
  /** Title shown in the TOC */
  title: string;
  /** HTML *body* fragment — must be valid XHTML (self-closing tags, no bare &) */
  bodyHtml: string;
  /** Stable slug used for file names, e.g. "chapter-01" */
  id: string;
}

export interface EpubOptions {
  title: string;
  author?: string;
  language?: string;
  chapters: EpubChapter[];
  /** Optional cover image as a data-URI or blob URL */
  coverImageSrc?: string;
}

/**
 * Build an EPUB 3 blob from the provided options.
 * Returns a Uint8Array that can be wrapped in a Blob for download.
 */
export function buildEpub(opts: EpubOptions): Uint8Array {
  const { title, author = 'Unknown', language = 'en', chapters } = opts;

  // Stable book UUID
  const bookId = generateUuid();

  const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

  // ── Content files ──────────────────────────────────────────────────────────

  const chapterFiles: Record<string, [Uint8Array, { level: 0 | 9 }]> = {};
  for (const ch of chapters) {
    chapterFiles[`OEBPS/${ch.id}.xhtml`] = [enc(buildChapterXhtml(ch, title)), { level: 9 }];
  }

  // ── Nav TOC points ─────────────────────────────────────────────────────────

  const navPoints = chapters
    .map(
      (ch, i) =>
        `      <li><a href="${xmlEsc(ch.id)}.xhtml">${xmlEsc(ch.title || `Chapter ${i + 1}`)}</a></li>`,
    )
    .join('\n');

  // ── Assemble ZIP entries ───────────────────────────────────────────────────

  const zip: Zippable = {
    // mimetype MUST be uncompressed and MUST be the first entry
    mimetype: [enc('application/epub+zip'), { level: 0 }],

    'META-INF/container.xml': [enc(CONTAINER_XML), { level: 9 }],

    'OEBPS/content.opf': [
      enc(buildContentOpf({ bookId, title, author, language, chapters })),
      { level: 9 },
    ],

    'OEBPS/nav.xhtml': [enc(buildNavXhtml(title, navPoints)), { level: 9 }],

    'OEBPS/style.css': [enc(EPUB_CSS), { level: 9 }],

    ...chapterFiles,
  };

  return zipSync(zip);
}

/** Download a Uint8Array as a file. */
export function triggerEpubDownload(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes], { type: 'application/epub+zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function xmlEsc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─── Static XML fragments ─────────────────────────────────────────────────────

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

const EPUB_CSS = `
/* EPUB base styles */
body {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1em;
  line-height: 1.7;
  color: #1a1a1a;
  margin: 1em 2em;
}
h1 { font-size: 1.8em; font-weight: 700; margin: 1.4em 0 0.4em; border-bottom: 2px solid #444; padding-bottom: 0.2em; }
h2 { font-size: 1.35em; font-weight: 700; margin: 1.2em 0 0.35em; border-bottom: 1px solid #bbb; padding-bottom: 0.15em; }
h3 { font-size: 1.1em; font-weight: 700; margin: 1em 0 0.3em; }
h4, h5, h6 { font-size: 1em; font-weight: 700; margin: 0.9em 0 0.25em; }
p { margin: 0 0 0.8em; orphans: 2; widows: 2; }
a { color: #4444cc; }
strong { font-weight: 700; }
em { font-style: italic; }
code {
  font-family: "Courier New", Courier, monospace;
  font-size: 0.85em;
  background: #f2f2f2;
  padding: 1px 3px;
}
pre {
  font-family: "Courier New", Courier, monospace;
  font-size: 0.82em;
  background: #f6f6f6;
  border: 1px solid #ddd;
  padding: 0.8em 1em;
  margin: 1em 0;
  white-space: pre-wrap;
  word-break: break-all;
}
pre code { background: none; padding: 0; }
blockquote {
  border-left: 3px solid #9966cc;
  margin: 1em 0;
  padding: 0.3em 1em;
  color: #555;
  font-style: italic;
}
blockquote p { margin: 0; }
ul, ol { padding-left: 1.6em; margin: 0.5em 0 0.8em; }
li { margin: 0.2em 0; }
hr { border: none; border-top: 1px solid #ccc; margin: 1.6em 0; }
img { max-width: 100%; height: auto; display: block; margin: 0.7em 0; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.9em; }
th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
th { background: #f0f0f0; font-weight: 700; }
.chapter-title-page { text-align: center; margin-top: 3em; }
`;

// ─── Document builders ────────────────────────────────────────────────────────

interface OpfOptions {
  bookId: string;
  title: string;
  author: string;
  language: string;
  chapters: EpubChapter[];
}

function buildContentOpf({ bookId, title, author, language, chapters }: OpfOptions): string {
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

  const manifestItems = [
    `    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `    <item id="css" href="style.css" media-type="text/css"/>`,
    ...chapters.map(
      (ch) =>
        `    <item id="${xmlEsc(ch.id)}" href="${xmlEsc(ch.id)}.xhtml" media-type="application/xhtml+xml"/>`,
    ),
  ].join('\n');

  const spineItems = chapters
    .map((ch) => `    <itemref idref="${xmlEsc(ch.id)}"/>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf"
  unique-identifier="book-id" xml:lang="${xmlEsc(language)}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">urn:uuid:${bookId}</dc:identifier>
    <dc:title>${xmlEsc(title)}</dc:title>
    <dc:creator>${xmlEsc(author)}</dc:creator>
    <dc:language>${xmlEsc(language)}</dc:language>
    <dc:date>${now}</dc:date>
    <meta property="dcterms:modified">${now}</meta>
  </metadata>
  <manifest>
${manifestItems}
  </manifest>
  <spine>
${spineItems}
  </spine>
</package>`;
}

function buildNavXhtml(title: string, navPoints: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
  xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${xmlEsc(title)}</title>
  <link rel="stylesheet" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Contents</h1>
    <ol>
${navPoints}
    </ol>
  </nav>
</body>
</html>`;
}

function buildChapterXhtml(ch: EpubChapter, bookTitle: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${xmlEsc(ch.title || bookTitle)}</title>
  <link rel="stylesheet" href="style.css"/>
</head>
<body>
${ch.bodyHtml}
</body>
</html>`;
}
