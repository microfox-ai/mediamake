'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Search, X, ChevronRight, ChevronDown, FileText,
  Regex, CaseSensitive, ArrowLeftRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { flattenFiles } from '@/components/writepad/utils';
import type { FileNode } from './types';

// ─── Glob matcher ─────────────────────────────────────────────────────────────

function globToRegex(pattern: string): RegExp | null {
  if (!pattern.trim()) return null;
  const parts = pattern
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) =>
      p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.'),
    );
  if (parts.length === 0) return null;
  return new RegExp(`^(${parts.join('|')})$`, 'i');
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchMatch {
  lineNumber: number;
  lineText: string;
  offset: number;      // character offset in full content
  matchStart: number;  // index within lineText
  matchEnd: number;
}

interface FileResult {
  fileId: string;
  fileName: string;
  matches: SearchMatch[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Apply replacements from last→first so earlier offsets stay valid. */
function applyReplacements(content: string, matches: SearchMatch[], replacement: string): string {
  const sorted = [...matches].sort((a, b) => b.offset - a.offset);
  let result = content;
  for (const m of sorted) {
    const len = m.matchEnd - m.matchStart;
    result = result.slice(0, m.offset) + replacement + result.slice(m.offset + len);
  }
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  files: FileNode[];
  onSelect: (fileId: string, offset: number, query: string) => void;
  onReplaceOne?: (fileId: string, newContent: string, offset: number, query: string) => void;
  onReplaceAll?: (replacements: { fileId: string; newContent: string }[]) => void;
}

export function GlobalSearch({ files, onSelect, onReplaceOne, onReplaceAll }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [includePattern, setIncludePattern] = useState('');
  const [excludePattern, setExcludePattern] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const allFiles = useMemo(() => flattenFiles(files), [files]);

  const results = useMemo<FileResult[]>(() => {
    if (!query.trim()) return [];

    const includeRe = globToRegex(includePattern);
    const excludeRe = globToRegex(excludePattern);

    let searchRe: RegExp;
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      searchRe = new RegExp(useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    } catch {
      return [];
    }

    const out: FileResult[] = [];

    for (const file of allFiles) {
      if (!file.content) continue;
      if (includeRe && !includeRe.test(file.name)) continue;
      if (excludeRe && excludeRe.test(file.name)) continue;

      const content = file.content;
      const lines = content.split('\n');
      const matches: SearchMatch[] = [];
      let charOffset = 0;

      for (let li = 0; li < lines.length; li++) {
        const lineText = lines[li];
        searchRe.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = searchRe.exec(lineText)) !== null) {
          matches.push({
            lineNumber: li + 1,
            lineText,
            offset: charOffset + m.index,
            matchStart: m.index,
            matchEnd: m.index + m[0].length,
          });
        }
        charOffset += lineText.length + 1; // +1 for \n
      }

      if (matches.length > 0) {
        out.push({ fileId: file.id, fileName: file.name, matches });
      }
    }

    return out;
  }, [query, useRegex, caseSensitive, includePattern, excludePattern, allFiles]);

  const totalMatches = results.reduce((s, r) => s + r.matches.length, 0);

  const toggleCollapse = useCallback((fileId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }, []);

  const handleReplaceOne = useCallback(
    (file: FileResult, match: SearchMatch) => {
      if (!onReplaceOne) return;
      const original = allFiles.find((f) => f.id === file.fileId)?.content ?? '';
      const newContent = applyReplacements(original, [match], replacement);
      onReplaceOne(file.fileId, newContent, match.offset, query);
    },
    [onReplaceOne, allFiles, replacement, query],
  );

  const handleReplaceInFile = useCallback(
    (file: FileResult) => {
      if (!onReplaceAll) return;
      const original = allFiles.find((f) => f.id === file.fileId)?.content ?? '';
      const newContent = applyReplacements(original, file.matches, replacement);
      onReplaceAll([{ fileId: file.fileId, newContent }]);
    },
    [onReplaceAll, allFiles, replacement],
  );

  const handleReplaceAllFiles = useCallback(() => {
    if (!onReplaceAll) return;
    const replacements = results.map((file) => {
      const original = allFiles.find((f) => f.id === file.fileId)?.content ?? '';
      return { fileId: file.fileId, newContent: applyReplacements(original, file.matches, replacement) };
    });
    onReplaceAll(replacements);
  }, [onReplaceAll, allFiles, results, replacement]);

  return (
    <div className="flex h-full flex-col bg-card select-none">
      {/* Inputs */}
      <div className="shrink-0 border-b border-border px-2 py-2 space-y-1.5">
        {/* Search row */}
        <div className="flex items-center gap-1">
          {/* Toggle replace */}
          <button
            onClick={() => setShowReplace((x) => !x)}
            title="Toggle Replace"
            className="shrink-0 rounded p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            {showReplace ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>
          <div className="flex flex-1 items-center gap-1 rounded bg-muted px-2 py-1.5">
            <Search size={11} className="shrink-0 text-muted-foreground/40" />
            <input
              type="text"
              placeholder="Search in files..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/40 outline-none"
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-muted-foreground/50 hover:text-foreground">
                <X size={10} />
              </button>
            )}
            <button
              onClick={() => setCaseSensitive((x) => !x)}
              title="Match case"
              className={cn('rounded px-1 transition-colors', caseSensitive ? 'text-violet-400' : 'text-muted-foreground/50 hover:text-foreground')}
            >
              <CaseSensitive size={12} />
            </button>
            <button
              onClick={() => setUseRegex((x) => !x)}
              title="Use regex"
              className={cn('rounded px-1 transition-colors', useRegex ? 'text-violet-400' : 'text-muted-foreground/50 hover:text-foreground')}
            >
              <Regex size={12} />
            </button>
          </div>
        </div>

        {/* Replace row */}
        {showReplace && (
          <div className="flex items-center gap-1 pl-[18px]">
            <div className="flex flex-1 items-center gap-1 rounded bg-muted px-2 py-1.5">
              <ArrowLeftRight size={11} className="shrink-0 text-muted-foreground/40" />
              <input
                type="text"
                placeholder="Replace..."
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                className="flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/40 outline-none"
              />
              {replacement && (
                <button onClick={() => setReplacement('')} className="text-muted-foreground/50 hover:text-foreground">
                  <X size={10} />
                </button>
              )}
            </div>
            {results.length > 0 && (
              <button
                onClick={handleReplaceAllFiles}
                title="Replace All"
                className="shrink-0 whitespace-nowrap rounded bg-violet-600/20 px-1.5 py-1 text-[9px] text-violet-400 hover:bg-violet-600/35 transition-colors"
              >
                All
              </button>
            )}
          </div>
        )}

        {/* Include / exclude patterns */}
        <input
          type="text"
          placeholder="Include files (e.g. *.md, *.ts)"
          value={includePattern}
          onChange={(e) => setIncludePattern(e.target.value)}
          className="w-full rounded bg-muted/60 px-2 py-1 text-[10px] text-foreground/60 placeholder:text-muted-foreground/40 outline-none focus:bg-muted"
        />
        <input
          type="text"
          placeholder="Exclude files (e.g. *.log)"
          value={excludePattern}
          onChange={(e) => setExcludePattern(e.target.value)}
          className="w-full rounded bg-muted/60 px-2 py-1 text-[10px] text-foreground/60 placeholder:text-muted-foreground/40 outline-none focus:bg-muted"
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {query.trim() && (
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground">
            {results.length === 0
              ? 'No results'
              : `${totalMatches} result${totalMatches !== 1 ? 's' : ''} in ${results.length} file${results.length !== 1 ? 's' : ''}`}
          </div>
        )}

        {results.map((file) => {
          const isCollapsed = collapsed.has(file.fileId);
          return (
            <div key={file.fileId}>
              {/* File header */}
              <div className="group/file flex w-full items-center gap-1.5 px-2 py-1 hover:bg-accent transition-colors">
                <button
                  onClick={() => toggleCollapse(file.fileId)}
                  className="flex flex-1 items-center gap-1.5 text-left"
                >
                  <span className="shrink-0 text-muted-foreground/30">
                    {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                  </span>
                  <FileText size={11} className="shrink-0 text-sky-600/60 dark:text-sky-400/60" />
                  <span className="flex-1 truncate text-[11px] text-foreground/80 font-medium">{file.fileName}</span>
                  <span className="shrink-0 rounded bg-violet-500/15 px-1 text-[9px] text-violet-600 dark:text-violet-400">
                    {file.matches.length}
                  </span>
                </button>
                {showReplace && (
                  <button
                    onClick={() => handleReplaceInFile(file)}
                    title="Replace all in file"
                    className="shrink-0 rounded px-1 py-0.5 text-[9px] text-muted-foreground/50 opacity-0 group-hover/file:opacity-100 hover:bg-violet-600/20 hover:text-violet-400 transition-all"
                  >
                    <ArrowLeftRight size={10} />
                  </button>
                )}
              </div>

              {/* Match lines */}
              {!isCollapsed &&
                file.matches.map((match, mi) => (
                  <div key={mi} className="group/match flex items-start hover:bg-accent transition-colors">
                    <button
                      onClick={() => onSelect(file.fileId, match.offset, query)}
                      className="flex flex-1 items-start gap-2 py-0.5 pl-8 pr-2 text-left"
                    >
                      <span className="shrink-0 w-7 text-right text-[9px] text-muted-foreground/40 group-hover/match:text-muted-foreground font-mono pt-px">
                        {match.lineNumber}
                      </span>
                      <span className="flex-1 truncate text-[10px] font-mono leading-5">
                        <span className="text-foreground/40">{match.lineText.slice(0, match.matchStart)}</span>
                        <mark className="rounded bg-yellow-400/20 text-yellow-700 dark:text-yellow-200/80 not-italic">{match.lineText.slice(match.matchStart, match.matchEnd)}</mark>
                        <span className="text-foreground/40">{match.lineText.slice(match.matchEnd, match.matchEnd + 60)}</span>
                      </span>
                    </button>
                    {showReplace && (
                      <button
                        onClick={() => handleReplaceOne(file, match)}
                        title="Replace this match"
                        className="mr-2 mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground/50 opacity-0 group-hover/match:opacity-100 hover:bg-violet-600/20 hover:text-violet-400 transition-all"
                      >
                        <ArrowLeftRight size={10} />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
