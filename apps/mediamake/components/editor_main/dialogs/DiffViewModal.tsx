"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  X, Search, ChevronUp, ChevronDown, ChevronRight,
  AlignJustify, Columns, FileCode2, Diff, WrapText,
  Copy, Check, UnfoldVertical, FoldVertical, ArrowUp, ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Core diff types ──────────────────────────────────────────────────────────

type DiffOp = "equal" | "add" | "remove";
interface RawLine { op: DiffOp; text: string; pair?: string; }
type CollapsedLine = { text: string; aNo: number; bNo: number };

type UnifiedRow =
  | { kind: "line"; op: DiffOp; text: string; aNo: number; bNo: number; pair?: string }
  | { kind: "collapsed"; startIdx: number; lines: CollapsedLine[] };

type SplitRow =
  | { kind: "equal"; text: string; aNo: number; bNo: number }
  | { kind: "change"; left: string | null; right: string | null; aNo: number | null; bNo: number | null }
  | { kind: "collapsed"; startIdx: number; lines: CollapsedLine[] };

type Layout = "unified" | "split";
type Scope = "sections" | "full";

// ─── Myers diff ───────────────────────────────────────────────────────────────

function myersDiff(a: string[], b: string[]): RawLine[] {
  const m = a.length, n = b.length, max = m + n;
  if (max === 0) return [];
  const v = new Array<number>(2 * max + 1).fill(0);
  const trace: Array<number[]> = [];
  outer: for (let d = 0; d <= max; d++) {
    trace.push([...v]);
    for (let k = -d; k <= d; k += 2) {
      const ki = k + max;
      let x: number;
      if (k === -d || (k !== d && v[ki - 1]! < v[ki + 1]!)) x = v[ki + 1]!;
      else x = v[ki - 1]! + 1;
      let y = x - k;
      while (x < m && y < n && a[x] === b[y]) { x++; y++; }
      v[ki] = x;
      if (x >= m && y >= n) { trace.push([...v]); break outer; }
    }
  }
  const ops: RawLine[] = [];
  let x = m, y = n;
  for (let d = trace.length - 1; d >= 0; d--) {
    const vd = trace[d]!;
    const k = x - y, ki = k + max;
    const prevK = k === -d || (k !== d && (vd[ki - 1] ?? 0) < (vd[ki + 1] ?? 0)) ? k + 1 : k - 1;
    const prevX = vd[prevK + max] ?? 0, prevY = prevX - prevK;
    while (x > prevX && y > prevY) { ops.unshift({ op: "equal", text: a[x - 1]! }); x--; y--; }
    if (d > 0) {
      if (x > prevX) { ops.unshift({ op: "remove", text: a[x - 1]! }); x--; }
      else if (y > prevY) { ops.unshift({ op: "add", text: b[y - 1]! }); y--; }
    }
  }
  return ops;
}

/** Pair the j-th remove with the j-th add inside each changed run, for word-level highlights. */
function attachPairs(raw: RawLine[]): RawLine[] {
  const out = raw.map(r => ({ ...r }));
  let i = 0;
  while (i < out.length) {
    if (out[i]!.op === "equal") { i++; continue; }
    const removes: number[] = [], adds: number[] = [];
    while (i < out.length && out[i]!.op !== "equal") {
      (out[i]!.op === "remove" ? removes : adds).push(i);
      i++;
    }
    const n = Math.min(removes.length, adds.length);
    for (let j = 0; j < n; j++) {
      out[removes[j]!]!.pair = out[adds[j]!]!.text;
      out[adds[j]!]!.pair = out[removes[j]!]!.text;
    }
  }
  return out;
}

// ─── Visible index set ────────────────────────────────────────────────────────

const CONTEXT = 3;

function visibleSet(raw: RawLine[]): Set<number> {
  const changed = new Set<number>();
  raw.forEach((r, i) => { if (r.op !== "equal") changed.add(i); });
  const vis = new Set<number>();
  for (const idx of changed) {
    for (let d = -CONTEXT; d <= CONTEXT; d++) {
      const t = idx + d;
      if (t >= 0 && t < raw.length) vis.add(t);
    }
  }
  return vis;
}

// ─── Unified rows ─────────────────────────────────────────────────────────────

function buildUnifiedRows(raw: RawLine[]): UnifiedRow[] {
  const vis = visibleSet(raw);
  const rows: UnifiedRow[] = [];
  let aNo = 0, bNo = 0;
  let colStart = -1, colLines: CollapsedLine[] = [];

  const flush = () => {
    if (colLines.length > 0) {
      rows.push({ kind: "collapsed", startIdx: colStart, lines: colLines });
      colStart = -1; colLines = [];
    }
  };

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i]!;
    if (r.op !== "add") aNo++;
    if (r.op !== "remove") bNo++;
    if (vis.has(i)) {
      flush();
      rows.push({ kind: "line", op: r.op, text: r.text, aNo, bNo, pair: r.pair });
    } else {
      if (colLines.length === 0) colStart = i;
      colLines.push({ text: r.text, aNo, bNo });
    }
  }
  flush();
  return rows;
}

function flattenUnified(base: UnifiedRow[]): UnifiedRow[] {
  return base.flatMap((r): UnifiedRow[] =>
    r.kind === "collapsed"
      ? r.lines.map(l => ({ kind: "line" as const, op: "equal" as const, ...l }))
      : [r]
  );
}

function expandUnified(base: UnifiedRow[], exp: Set<number>): UnifiedRow[] {
  const out: UnifiedRow[] = [];
  for (const row of base) {
    if (row.kind === "collapsed" && exp.has(row.startIdx)) {
      for (const l of row.lines) out.push({ kind: "line", op: "equal", ...l });
    } else {
      out.push(row);
    }
  }
  return out;
}

// ─── Split rows ───────────────────────────────────────────────────────────────

function buildSplitRows(raw: RawLine[]): SplitRow[] {
  const vis = visibleSet(raw);
  const rows: SplitRow[] = [];
  let aNo = 0, bNo = 0, i = 0;
  let colStart = -1, colLines: CollapsedLine[] = [];

  const flush = () => {
    if (colLines.length > 0) {
      rows.push({ kind: "collapsed", startIdx: colStart, lines: colLines });
      colStart = -1; colLines = [];
    }
  };

  while (i < raw.length) {
    const r = raw[i]!;
    if (!vis.has(i)) {
      aNo++; bNo++;
      if (colLines.length === 0) colStart = i;
      colLines.push({ text: r.text, aNo, bNo });
      i++; continue;
    }
    flush();
    if (r.op === "equal") {
      aNo++; bNo++;
      rows.push({ kind: "equal", text: r.text, aNo, bNo });
      i++;
    } else {
      const removes: Array<{ text: string; aNo: number }> = [];
      const adds: Array<{ text: string; bNo: number }> = [];
      while (i < raw.length && raw[i]!.op !== "equal" && vis.has(i)) {
        const cur = raw[i]!;
        if (cur.op === "remove") { aNo++; removes.push({ text: cur.text, aNo }); }
        else { bNo++; adds.push({ text: cur.text, bNo }); }
        i++;
      }
      const len = Math.max(removes.length, adds.length);
      for (let j = 0; j < len; j++) {
        rows.push({
          kind: "change",
          left: removes[j]?.text ?? null, right: adds[j]?.text ?? null,
          aNo: removes[j]?.aNo ?? null, bNo: adds[j]?.bNo ?? null,
        });
      }
    }
  }
  flush();
  return rows;
}

function flattenSplit(base: SplitRow[]): SplitRow[] {
  return base.flatMap(r =>
    r.kind === "collapsed"
      ? r.lines.map(l => ({ kind: "equal" as const, text: l.text, aNo: l.aNo, bNo: l.bNo }))
      : [r]
  );
}

function expandSplit(base: SplitRow[], exp: Set<number>): SplitRow[] {
  const out: SplitRow[] = [];
  for (const row of base) {
    if (row.kind === "collapsed" && exp.has(row.startIdx)) {
      for (const l of row.lines) out.push({ kind: "equal", text: l.text, aNo: l.aNo, bNo: l.bNo });
    } else {
      out.push(row);
    }
  }
  return out;
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

function toLines(v: unknown): string[] {
  if (v === null || v === undefined) return [];
  if (typeof v === "string") return v.split("\n");
  try { return JSON.stringify(v, null, 2).split("\n"); } catch { return [String(v)]; }
}

function toJson(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countMatches(text: string, query: string): number {
  if (!query) return 0;
  try { return (text.match(new RegExp(escapeRegex(query), "gi")) ?? []).length; }
  catch { return 0; }
}

/** Longest common prefix/suffix lengths between two strings (non-overlapping). */
function commonAffix(a: string, b: string): [number, number] {
  const min = Math.min(a.length, b.length);
  let p = 0;
  while (p < min && a[p] === b[p]) p++;
  let s = 0;
  while (s < min - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  return [p, s];
}

// ─── Highlighted code text ────────────────────────────────────────────────────

const MARK_BASE = "rounded-[2px] bg-yellow-400/70 text-black";
const MARK_ACTIVE = "bg-orange-400 text-black ring-1 ring-orange-200";

function HighlightText({ text, query, startIdx, activeIdx }: {
  text: string; query: string; startIdx?: number; activeIdx?: number;
}) {
  if (!query || !text) return <>{text || " "}</>;
  try {
    const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));
    if (parts.length === 1) return <>{text}</>;
    let k = 0;
    return (
      <>
        {parts.map((p, i) => {
          if (p.toLowerCase() === query.toLowerCase()) {
            const g = startIdx != null ? startIdx + k : undefined;
            k++;
            return (
              <mark
                key={i}
                id={g != null ? `dvm-match-${g}` : undefined}
                className={cn(MARK_BASE, g != null && g === activeIdx && MARK_ACTIVE)}
              >
                {p}
              </mark>
            );
          }
          return p || null;
        })}
      </>
    );
  } catch { return <>{text || " "}</>; }
}

/** Renders code text: search highlighting when a query is active, otherwise
 *  word-level diff highlighting against the paired line. */
function CodeText({ text, query, pair, kind, matchStart, activeIdx }: {
  text: string; query: string; pair?: string | null; kind?: "add" | "remove";
  matchStart?: number; activeIdx?: number;
}) {
  if (query) return <HighlightText text={text} query={query} startIdx={matchStart} activeIdx={activeIdx} />;
  if (pair != null && kind && text) {
    const [p, s] = commonAffix(text, pair);
    if (p + s > 0) {
      const core = text.slice(p, text.length - s);
      if (core) {
        return (
          <>
            {text.slice(0, p)}
            <span className={cn("rounded-[2px]", kind === "add" ? "bg-emerald-400/25" : "bg-red-400/25")}>{core}</span>
            {text.slice(text.length - s)}
          </>
        );
      }
    }
  }
  return <>{text || " "}</>;
}

// ─── Shared cell styles ───────────────────────────────────────────────────────

const numCls = "w-10 min-w-[2.5rem] align-top text-right pr-2 pl-1 select-none text-[10px] leading-5 text-muted-foreground/40 bg-muted/20 border-r border-border/30 font-mono";
const codeBase = "px-2 align-top text-[11px] leading-5 font-mono";
const codeWs = (wrap: boolean) => (wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre");

// ─── Collapsed row ────────────────────────────────────────────────────────────

function CollapsedRow({ count, onExpand, colSpan }: { count: number; onExpand: () => void; colSpan: number }) {
  return (
    <tr className="cursor-pointer" onClick={onExpand}>
      <td colSpan={colSpan} className="p-0">
        <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono bg-sky-500/[0.07] text-sky-300/80 hover:bg-sky-500/[0.15] border-y border-sky-500/10 transition-colors">
          <UnfoldVertical className="h-3 w-3" />
          Expand {count} unchanged line{count !== 1 ? "s" : ""}
        </div>
      </td>
    </tr>
  );
}

// ─── Unified table ────────────────────────────────────────────────────────────

function UnifiedTable({ rows, query, wrap, matchStart, activeIdx, onExpand, containerCls }: {
  rows: UnifiedRow[]; query: string; wrap: boolean;
  matchStart: number; activeIdx: number;
  onExpand: (startIdx: number) => void; containerCls?: string;
}) {
  // Per-row global match offsets (only needed while searching)
  const offsets = useMemo(() => {
    if (!query) return null;
    let acc = 0;
    return rows.map(r => { const o = acc; if (r.kind === "line") acc += countMatches(r.text, query); return o; });
  }, [rows, query]);

  return (
    <div className={cn("overflow-auto", containerCls ?? "max-h-96")}>
      <table className={cn("w-full border-collapse", wrap && "table-fixed")}>
        {wrap && (
          <colgroup>
            <col style={{ width: "2.5rem" }} />
            <col style={{ width: "2.5rem" }} />
            <col style={{ width: "1.25rem" }} />
            <col />
          </colgroup>
        )}
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={4} className="px-3 py-2 text-[11px] text-muted-foreground/50 font-mono">empty</td></tr>
          )}
          {rows.map((row, ri) => {
            if (row.kind === "collapsed") {
              return <CollapsedRow key={ri} count={row.lines.length} colSpan={4} onExpand={() => onExpand(row.startIdx)} />;
            }
            const prev = ri > 0 ? rows[ri - 1] : undefined;
            const blockStart = row.op !== "equal" && (!prev || prev.kind !== "line" || prev.op === "equal");
            const bg = row.op === "add" ? "bg-emerald-500/[0.08]" : row.op === "remove" ? "bg-red-500/[0.08]" : "";
            const txt = row.op === "add" ? "text-emerald-300" : row.op === "remove" ? "text-red-300" : "text-foreground/70";
            const prefix = row.op === "add" ? "+" : row.op === "remove" ? "−" : " ";
            return (
              <tr key={ri} data-diff-block={blockStart ? "" : undefined} className={bg}>
                <td className={numCls}>{row.op !== "add" ? row.aNo : ""}</td>
                <td className={numCls}>{row.op !== "remove" ? row.bNo : ""}</td>
                <td className={cn("w-5 min-w-[1.25rem] align-top px-1 text-center select-none font-bold text-[11px] leading-5 font-mono", txt)}>{prefix}</td>
                <td className={cn(codeBase, codeWs(wrap), txt)}>
                  <CodeText
                    text={row.text}
                    query={query}
                    pair={row.pair}
                    kind={row.op === "equal" ? undefined : row.op}
                    matchStart={matchStart + (offsets?.[ri] ?? 0)}
                    activeIdx={activeIdx}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Split table ──────────────────────────────────────────────────────────────

function SplitTable({ rows, query, wrap, matchStart, activeIdx, onExpand, containerCls }: {
  rows: SplitRow[]; query: string; wrap: boolean;
  matchStart: number; activeIdx: number;
  onExpand: (startIdx: number) => void; containerCls?: string;
}) {
  // Per-row global match offsets — equal rows count once (navigable on the left side only)
  const offsets = useMemo(() => {
    if (!query) return null;
    let acc = 0;
    return rows.map(r => {
      if (r.kind === "equal") { const o = { l: acc, r: acc }; acc += countMatches(r.text, query); return o; }
      if (r.kind === "change") {
        const lc = r.left != null ? countMatches(r.left, query) : 0;
        const o = { l: acc, r: acc + lc };
        acc += lc + (r.right != null ? countMatches(r.right, query) : 0);
        return o;
      }
      return { l: acc, r: acc };
    });
  }, [rows, query]);

  return (
    <div className={cn("overflow-auto", containerCls ?? "max-h-96")}>
      <table
        className={cn("w-full border-collapse", wrap && "table-fixed")}
        style={!wrap ? { minWidth: 560 } : undefined}
      >
        <colgroup>
          <col style={{ width: "2.5rem" }} />
          <col />
          <col style={{ width: "2.5rem" }} />
          <col />
        </colgroup>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={4} className="px-3 py-2 text-[11px] text-muted-foreground/50 font-mono">empty</td></tr>
          )}
          {rows.map((row, ri) => {
            if (row.kind === "collapsed") {
              return <CollapsedRow key={ri} count={row.lines.length} colSpan={4} onExpand={() => onExpand(row.startIdx)} />;
            }
            if (row.kind === "equal") {
              return (
                <tr key={ri}>
                  <td className={numCls}>{row.aNo}</td>
                  <td className={cn(codeBase, codeWs(wrap), "text-foreground/70 border-r border-border/30")}>
                    <CodeText text={row.text} query={query} matchStart={matchStart + (offsets?.[ri]?.l ?? 0)} activeIdx={activeIdx} />
                  </td>
                  <td className={numCls}>{row.bNo}</td>
                  <td className={cn(codeBase, codeWs(wrap), "text-foreground/70")}>
                    {/* passive highlight — same matches are navigable on the left */}
                    <CodeText text={row.text} query={query} />
                  </td>
                </tr>
              );
            }
            const blockStart = ri === 0 || rows[ri - 1]!.kind !== "change";
            return (
              <tr key={ri} data-diff-block={blockStart ? "" : undefined}>
                <td className={numCls}>{row.aNo ?? ""}</td>
                <td className={cn(codeBase, codeWs(wrap), "border-r border-border/30", row.left !== null && "bg-red-500/[0.08] text-red-300")}>
                  {row.left !== null
                    ? <CodeText text={row.left} query={query} pair={row.right} kind="remove" matchStart={matchStart + (offsets?.[ri]?.l ?? 0)} activeIdx={activeIdx} />
                    : " "}
                </td>
                <td className={numCls}>{row.bNo ?? ""}</td>
                <td className={cn(codeBase, codeWs(wrap), row.right !== null && "bg-emerald-500/[0.08] text-emerald-300")}>
                  {row.right !== null
                    ? <CodeText text={row.right} query={query} pair={row.left} kind="add" matchStart={matchStart + (offsets?.[ri]?.r ?? 0)} activeIdx={activeIdx} />
                    : " "}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyBtn({ value, label }: { value: unknown; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      title={`Copy "${label}" state as JSON`}
      onClick={(e) => {
        e.stopPropagation();
        try {
          navigator.clipboard?.writeText(toJson(value));
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch { /* clipboard unavailable */ }
      }}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-colors shrink-0"
    >
      {done ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
      {label}
    </button>
  );
}

// ─── Diff section ─────────────────────────────────────────────────────────────

function DiffSectionView({ section, raw, layout, showAll, query, wrap, matchStart, activeIdx, fill }: {
  section: DiffSection; raw: RawLine[]; layout: Layout;
  showAll: boolean; query: string; wrap: boolean;
  matchStart: number; activeIdx: number;
  /** Full mode: fill the modal height instead of capping at max-h */
  fill?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [exp, setExp] = useState<Set<number>>(new Set());
  const expand = (startIdx: number) => setExp(s => new Set(s).add(startIdx));

  // Auto-open while searching so matches aren't hidden
  useEffect(() => { if (query) setOpen(true); }, [query]);

  const forceAll = showAll || query.length > 0;

  const uBase = useMemo(() => (layout === "unified" ? buildUnifiedRows(raw) : null), [raw, layout]);
  const sBase = useMemo(() => (layout === "split" ? buildSplitRows(raw) : null), [raw, layout]);
  const uRows = useMemo(() => (uBase ? (forceAll ? flattenUnified(uBase) : expandUnified(uBase, exp)) : null), [uBase, forceAll, exp]);
  const sRows = useMemo(() => (sBase ? (forceAll ? flattenSplit(sBase) : expandSplit(sBase, exp)) : null), [sBase, forceAll, exp]);

  const added = useMemo(() => raw.filter(r => r.op === "add").length, [raw]);
  const removed = useMemo(() => raw.filter(r => r.op === "remove").length, [raw]);
  const matchCount = useMemo(
    () => (query ? raw.reduce((s, r) => s + countMatches(r.text, query), 0) : 0),
    [raw, query]
  );

  const containerCls = fill ? "flex-1 min-h-0" : undefined;

  return (
    <div className={cn(
      "rounded-md border border-border/60 overflow-hidden bg-card/40",
      fill && "flex flex-col flex-1 min-h-0"
    )}>
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-2 px-2.5 py-1.5 bg-muted/40 select-none shrink-0",
          open && "border-b border-border/40",
          !fill && "cursor-pointer hover:bg-muted/60 transition-colors"
        )}
        onClick={() => !fill && setOpen(o => !o)}
      >
        {!fill && (
          <ChevronRight className={cn("h-3 w-3 text-muted-foreground transition-transform shrink-0", open && "rotate-90")} />
        )}
        <span className="text-[11px] font-medium text-foreground/80 font-mono flex-1 truncate min-w-0">
          {section.title}
        </span>
        {query && matchCount > 0 && (
          <span className="text-[10px] text-yellow-400/80 shrink-0 tabular-nums">
            {matchCount} match{matchCount !== 1 ? "es" : ""}
          </span>
        )}
        <CopyBtn value={section.before} label="before" />
        <CopyBtn value={section.after} label="after" />
        {(added > 0 || removed > 0) ? (
          <span className="text-[10px] shrink-0 flex items-center gap-1 font-mono tabular-nums">
            {removed > 0 && <span className="text-red-400">−{removed}</span>}
            {added > 0 && <span className="text-emerald-400">+{added}</span>}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/50 shrink-0">no changes</span>
        )}
      </div>

      {/* Split column labels */}
      {open && layout === "split" && (
        <div className="grid grid-cols-2 divide-x divide-border/40 border-b border-border/40 bg-muted/20 shrink-0">
          <div className="px-3 py-0.5 text-[10px] font-medium text-muted-foreground/60">Before</div>
          <div className="px-3 py-0.5 text-[10px] font-medium text-muted-foreground/60">After</div>
        </div>
      )}

      {/* Body */}
      {open && (layout === "unified"
        ? <UnifiedTable rows={uRows!} query={query} wrap={wrap} matchStart={matchStart} activeIdx={activeIdx} onExpand={expand} containerCls={containerCls} />
        : <SplitTable rows={sRows!} query={query} wrap={wrap} matchStart={matchStart} activeIdx={activeIdx} onExpand={expand} containerCls={containerCls} />
      )}
    </div>
  );
}

// ─── Toolbar widgets ──────────────────────────────────────────────────────────

function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void;
  options: Array<{ value: T; label: string; icon: React.ReactNode; title?: string }>;
}) {
  return (
    <div className="flex items-center rounded-md bg-muted/60 p-0.5 shrink-0">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex items-center gap-1 rounded-[5px] px-2 py-1 text-[11px] transition-colors",
            value === o.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

function ToolBtn({ active, onClick, title, children }: {
  active?: boolean; onClick: () => void; title?: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-7 items-center gap-1 rounded-md px-2 text-[11px] transition-colors shrink-0",
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
      )}
    >
      {children}
    </button>
  );
}

const navBtnCls = "rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0";
const dividerCls = "h-4 w-px bg-border/60 mx-1 shrink-0";
const kbdCls = "rounded border border-border/60 bg-muted/40 px-1 py-px font-mono text-[9px]";

// ─── Public API ───────────────────────────────────────────────────────────────

export interface DiffSection {
  title: string;
  before: unknown;
  after: unknown;
}

export interface DiffViewModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  sections: DiffSection[];
  /** When provided, enables the Full mode — complete before/after snapshot diff. */
  snapshotDiff?: { before: unknown; after: unknown };
}

export function DiffViewModal({ open, onClose, title, sections, snapshotDiff }: DiffViewModalProps) {
  const [layout, setLayout] = useState<Layout>("split");
  const [scope, setScope] = useState<Scope>("sections");
  const [showAll, setShowAll] = useState(false);
  const [resetKey, setResetKey] = useState(0); // bumped to re-collapse expanded blocks
  const [wrap, setWrap] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const blockIdxRef = useRef(-1);

  // Debounce the search query so big diffs don't re-render per keystroke
  useEffect(() => {
    const t = setTimeout(() => setQuery(queryInput), 150);
    return () => clearTimeout(t);
  }, [queryInput]);

  useEffect(() => {
    if (searchOpen) { searchRef.current?.focus(); searchRef.current?.select(); }
    else { setQueryInput(""); setQuery(""); }
  }, [searchOpen]);

  useEffect(() => { setActiveIdx(0); }, [query, layout, scope]);
  useEffect(() => { blockIdxRef.current = -1; }, [layout, scope]);

  const sectionDiffs = useMemo(
    () => sections.map(s => ({
      section: s,
      raw: attachPairs(myersDiff(toLines(s.before), toLines(s.after))),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sections]
  );

  // Computed lazily — only when Full mode is actually opened
  const fullDiff = useMemo(() => {
    if (scope !== "full" || !snapshotDiff) return null;
    return [{
      section: { title: "Complete snapshot", before: snapshotDiff.before, after: snapshotDiff.after },
      raw: attachPairs(myersDiff(toLines(snapshotDiff.before), toLines(snapshotDiff.after))),
    }];
  }, [scope, snapshotDiff]);

  const isFull = scope === "full" && !!fullDiff;
  const activeDiffs = isFull ? fullDiff! : sectionDiffs;

  // Global match offsets per section + total
  const matchData = useMemo(() => {
    if (!query) return null;
    let acc = 0;
    const starts = activeDiffs.map(d => {
      const start = acc;
      acc += d.raw.reduce((s, r) => s + countMatches(r.text, query), 0);
      return start;
    });
    return { starts, total: acc };
  }, [activeDiffs, query]);
  const totalMatches = matchData?.total ?? 0;

  useEffect(() => {
    if (activeIdx >= totalMatches && totalMatches > 0) setActiveIdx(0);
  }, [totalMatches, activeIdx]);

  // Scroll active match into view
  useEffect(() => {
    if (!query || totalMatches === 0) return;
    const id = requestAnimationFrame(() => {
      document.getElementById(`dvm-match-${activeIdx}`)?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(id);
  }, [activeIdx, query, totalMatches, layout, scope]);

  const gotoMatch = (dir: 1 | -1) => {
    if (totalMatches === 0) return;
    setActiveIdx(i => (i + dir + totalMatches) % totalMatches);
  };

  // Change-block navigation — DOM-order based, so it respects collapsed sections
  const gotoBlock = (dir: 1 | -1) => {
    const nodes = contentRef.current?.querySelectorAll<HTMLElement>("[data-diff-block]");
    if (!nodes || nodes.length === 0) return;
    blockIdxRef.current = ((blockIdxRef.current + dir) % nodes.length + nodes.length) % nodes.length;
    const el = nodes[blockIdxRef.current]!;
    el.scrollIntoView({ block: "center" });
    const flash = ["outline", "outline-2", "outline-primary/60", "-outline-offset-2"];
    el.classList.add(...flash);
    setTimeout(() => el.classList.remove(...flash), 800);
  };

  const totalBlocks = useMemo(() => activeDiffs.reduce((sum, d) => {
    let c = 0, run = false;
    for (const r of d.raw) {
      if (r.op !== "equal") { if (!run) { c++; run = true; } }
      else run = false;
    }
    return sum + c;
  }, 0), [activeDiffs]);

  const totals = useMemo(() => {
    let add = 0, rem = 0;
    for (const d of activeDiffs) for (const r of d.raw) {
      if (r.op === "add") add++;
      else if (r.op === "remove") rem++;
    }
    return { add, rem };
  }, [activeDiffs]);

  const toggleShowAll = () => {
    if (showAll) {
      setShowAll(false);
      setResetKey(k => k + 1); // remount sections to re-collapse individually expanded blocks
    } else {
      setShowAll(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
      e.preventDefault();
      if (searchOpen) { searchRef.current?.focus(); searchRef.current?.select(); }
      else setSearchOpen(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[96vw] min-w-[900px] max-w-[1400px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="shrink-0 space-y-0 gap-0 border-b">
          {/* Title row */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
            <DialogTitle className="text-sm font-medium flex-1 min-w-0 truncate">{title}</DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Toolbar row */}
          <div className="flex items-center gap-1.5 px-4 pb-2 flex-wrap">
            <Segmented
              value={layout}
              onChange={setLayout}
              options={[
                { value: "unified", label: "Unified", icon: <AlignJustify className="h-3 w-3" /> },
                { value: "split", label: "Split", icon: <Columns className="h-3 w-3" /> },
              ]}
            />
            {snapshotDiff && (
              <Segmented
                value={scope}
                onChange={setScope}
                options={[
                  { value: "sections", label: "Changes", icon: <Diff className="h-3 w-3" />, title: "Per-field changed sections" },
                  { value: "full", label: "Full", icon: <FileCode2 className="h-3 w-3" />, title: "Complete before/after snapshot" },
                ]}
              />
            )}

            <div className={dividerCls} />

            <ToolBtn
              active={showAll}
              onClick={toggleShowAll}
              title={showAll ? "Collapse unchanged lines back to context" : "Expand all unchanged lines"}
            >
              {showAll ? <FoldVertical className="h-3 w-3" /> : <UnfoldVertical className="h-3 w-3" />}
              {showAll ? "Collapse all" : "Expand all"}
            </ToolBtn>
            <ToolBtn active={wrap} onClick={() => setWrap(w => !w)} title="Toggle word wrap for long lines">
              <WrapText className="h-3 w-3" /> Wrap
            </ToolBtn>

            <div className={dividerCls} />

            {/* Change-block navigation */}
            <div className="flex items-center gap-0.5 shrink-0">
              <ToolBtn onClick={() => gotoBlock(-1)} title="Previous change"><ArrowUp className="h-3 w-3" /></ToolBtn>
              <ToolBtn onClick={() => gotoBlock(1)} title="Next change"><ArrowDown className="h-3 w-3" /></ToolBtn>
              <span className="px-1 text-[10px] text-muted-foreground/60 tabular-nums">
                {totalBlocks} change{totalBlocks !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="ml-auto" />

            {/* Search */}
            {searchOpen ? (
              <div className="flex items-center gap-1 h-7 rounded-md border border-border/60 bg-muted/30 px-2 shrink-0">
                <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                <input
                  ref={searchRef}
                  value={queryInput}
                  onChange={e => setQueryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setSearchOpen(false); }
                    else if (e.key === "Enter") { e.preventDefault(); gotoMatch(e.shiftKey ? -1 : 1); }
                  }}
                  placeholder="Search in diff…"
                  className="w-40 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/40"
                />
                <span className="min-w-[4ch] text-center text-[10px] text-muted-foreground/60 tabular-nums shrink-0">
                  {query ? (totalMatches > 0 ? `${activeIdx + 1}/${totalMatches}` : "0/0") : ""}
                </span>
                <button type="button" className={navBtnCls} disabled={totalMatches === 0} onClick={() => gotoMatch(-1)} title="Previous match (Shift+Enter)">
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button type="button" className={navBtnCls} disabled={totalMatches === 0} onClick={() => gotoMatch(1)} title="Next match (Enter)">
                  <ChevronDown className="h-3 w-3" />
                </button>
                <button type="button" className={navBtnCls} onClick={() => setSearchOpen(false)} title="Close search (Esc)">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <ToolBtn onClick={() => setSearchOpen(true)} title="Search in diff (Ctrl+F)">
                <Search className="h-3 w-3" /> Search
              </ToolBtn>
            )}
          </div>
        </DialogHeader>

        {/* Content */}
        {isFull ? (
          <div ref={contentRef} className="flex flex-col flex-1 min-h-0 p-3">
            <DiffSectionView
              key={`full-${resetKey}`}
              fill
              section={fullDiff![0]!.section}
              raw={fullDiff![0]!.raw}
              layout={layout}
              showAll={showAll}
              query={query}
              wrap={wrap}
              matchStart={0}
              activeIdx={activeIdx}
            />
          </div>
        ) : activeDiffs.length === 0 ? (
          <div ref={contentRef} className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No diff data available.</p>
          </div>
        ) : (
          <div ref={contentRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            {activeDiffs.map((d, i) => (
              <DiffSectionView
                key={`${i}-${resetKey}`}
                section={d.section}
                raw={d.raw}
                layout={layout}
                showAll={showAll}
                query={query}
                wrap={wrap}
                matchStart={matchData?.starts[i] ?? 0}
                activeIdx={activeIdx}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 flex items-center gap-3 border-t px-4 py-1.5 text-[10px] text-muted-foreground/70">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-[3px] bg-red-400/70" />
            {totals.rem} removed
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-[3px] bg-emerald-400/70" />
            {totals.add} added
          </span>
          <span className="hidden md:flex items-center gap-1.5 ml-auto">
            <kbd className={kbdCls}>Ctrl+F</kbd> search
            <span className="text-muted-foreground/40">·</span>
            <kbd className={kbdCls}>Enter</kbd> next match
            <span className="text-muted-foreground/40">·</span>
            <kbd className={kbdCls}>Esc</kbd> close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
