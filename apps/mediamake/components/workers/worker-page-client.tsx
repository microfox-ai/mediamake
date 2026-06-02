"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset } from "@/components/ui/sidebar"
import {
  Play, Loader2, Clock, CheckCircle2, XCircle,
  Copy, Check, RefreshCw, ChevronDown, ChevronRight,
  History, ExternalLink, Zap, AlertCircle, Code2,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface JobRecord {
  jobId: string
  workerId: string
  status: "queued" | "running" | "completed" | "failed"
  input?: any
  output?: any
  error?: { message: string; stack?: string }
  metadata?: Record<string, any>
  createdAt?: string
  updatedAt?: string
  completedAt?: string
}

interface WorkerPageClientProps {
  workerId: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert kebab-case worker ID to a display label */
function workerLabel(id: string): string {
  return id
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function StatusBadge({ status }: { status: JobRecord["status"] }) {
  const cfg = {
    queued:    { label: "Queued",  icon: <Clock className="h-3 w-3" />,        cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    running:   { label: "Running", icon: <Loader2 className="h-3 w-3 animate-spin" />, cls: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    completed: { label: "Done",    icon: <CheckCircle2 className="h-3 w-3" />, cls: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    failed:    { label: "Failed",  icon: <XCircle className="h-3 w-3" />,      cls: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  }[status] ?? { label: status, icon: null, cls: "bg-muted text-muted-foreground" }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return ""
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(dateStr).toLocaleDateString()
}

function jobDuration(job: JobRecord): string {
  if (!job.createdAt) return ""
  const end = job.completedAt ?? job.updatedAt ?? job.createdAt
  const secs = Math.round((new Date(end).getTime() - new Date(job.createdAt).getTime()) / 1000)
  return secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`
}

// ─── Rich output renderer ─────────────────────────────────────────────────────

function OutputValue({ value, depth = 0 }: { value: any; depth?: number }) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [])

  if (value === null || value === undefined)
    return <span className="text-muted-foreground italic text-xs">null</span>
  if (typeof value === "boolean")
    return <Badge variant={value ? "default" : "secondary"} className="text-xs">{String(value)}</Badge>
  if (typeof value === "number")
    return <span className="font-mono text-sm text-blue-600 dark:text-blue-400">{value}</span>

  if (typeof value === "string") {
    const isUrl = value.startsWith("http://") || value.startsWith("https://")
    const isImage = isUrl && /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(value)
    const isVideo = isUrl && /\.(mp4|webm|mov)(\?|$)/i.test(value)
    const isAudio = isUrl && /\.(mp3|wav|ogg|aac|m4a)(\?|$)/i.test(value)

    return (
      <div className="group flex items-start gap-1.5 min-w-0">
        <div className="flex-1 min-w-0">
          {isImage && <img src={value} alt="" className="max-w-xs max-h-48 rounded-md object-cover mb-1 border" />}
          {isVideo && <video src={value} controls className="max-w-sm rounded-md mb-1 border" />}
          {isAudio && <audio src={value} controls className="w-full mb-1" />}
          {isUrl && !isImage && !isVideo && !isAudio ? (
            <a href={value} target="_blank" rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 underline break-all flex items-center gap-1 hover:opacity-80">
              {value.length > 90 ? value.slice(0, 90) + "…" : value}
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          ) : !isImage && !isVideo && !isAudio && (
            <pre className="text-sm break-all whitespace-pre-wrap font-mono bg-muted/30 rounded px-1.5 py-0.5">
              {value.length > 600 ? value.slice(0, 600) + "…" : value}
            </pre>
          )}
        </div>
        <button onClick={() => copy(value)}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 rounded hover:bg-muted">
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
        </button>
      </div>
    )
  }

  if (Array.isArray(value)) {
    return (
      <div className="space-y-1.5">
        {value.map((item, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <Badge variant="outline" className="text-xs flex-shrink-0 mt-0.5">{i + 1}</Badge>
            <div className="flex-1 min-w-0"><OutputValue value={item} depth={depth + 1} /></div>
          </div>
        ))}
      </div>
    )
  }

  if (typeof value === "object") {
    return (
      <div className="space-y-2">
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            <div className="text-xs font-medium text-muted-foreground mb-0.5 capitalize">
              {k.replace(/([A-Z])/g, " $1").trim()}
            </div>
            <div className="pl-2 border-l border-muted">
              <OutputValue value={v} depth={depth + 1} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return <span className="text-sm font-mono">{JSON.stringify(value)}</span>
}

function JobOutput({ output }: { output: any }) {
  const [copiedFull, setCopiedFull] = useState(false)
  if (!output) return <div className="text-center py-8 text-muted-foreground text-sm">No output</div>

  const copyFull = () => {
    navigator.clipboard.writeText(JSON.stringify(output, null, 2))
    setCopiedFull(true)
    setTimeout(() => setCopiedFull(false), 1500)
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button size="sm" variant="ghost" onClick={copyFull} className="h-7 text-xs gap-1">
          {copiedFull ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          Copy JSON
        </Button>
      </div>
      <div className="space-y-3">
        {typeof output === "object" && !Array.isArray(output) ? (
          Object.entries(output).map(([k, v]) => (
            <div key={k}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {k.replace(/([A-Z])/g, " $1").trim()}
              </div>
              <div className="bg-muted/30 rounded-md p-2">
                <OutputValue value={v} />
              </div>
            </div>
          ))
        ) : (
          <div className="bg-muted/30 rounded-md p-2"><OutputValue value={output} /></div>
        )}
      </div>
    </div>
  )
}

// ─── History item ─────────────────────────────────────────────────────────────

function JobHistoryItem({
  job, isActive, onSelect,
}: {
  job: JobRecord; isActive: boolean; onSelect: (job: JobRecord) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`border rounded-lg overflow-hidden transition-colors cursor-pointer ${isActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}>
      <div className="flex items-center gap-2 p-3" onClick={() => onSelect(job)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={job.status} />
            <code className="text-xs text-muted-foreground font-mono truncate max-w-[140px]">{job.jobId}</code>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{timeAgo(job.createdAt)}</span>
            {jobDuration(job) && <span>⏱ {jobDuration(job)}</span>}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
          className="p-1 rounded hover:bg-muted text-muted-foreground">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t p-3 space-y-3 text-xs">
          {job.input && (
            <div>
              <div className="font-semibold text-muted-foreground mb-1">Input</div>
              <pre className="bg-muted/40 rounded p-2 overflow-x-auto text-xs whitespace-pre-wrap">
                {JSON.stringify(job.input, null, 2)}
              </pre>
            </div>
          )}
          {job.output && (
            <div>
              <div className="font-semibold text-muted-foreground mb-1">Output</div>
              <JobOutput output={job.output} />
            </div>
          )}
          {job.error && (
            <div>
              <div className="font-semibold text-red-500 mb-1">Error</div>
              <pre className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded p-2 text-xs whitespace-pre-wrap">
                {job.error.message}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Schema-driven form ──────────────────────────────────────────────────────

const HIDDEN_FIELDS = new Set(['clientId', 'projectId'])

type JsonSchema = {
  type?: string | string[]
  properties?: Record<string, JsonSchema>
  required?: string[]
  enum?: any[]
  default?: any
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  description?: string
  items?: JsonSchema
  $defs?: Record<string, JsonSchema>
}

function fieldLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()
}

function resolveType(schema: JsonSchema): string {
  if (Array.isArray(schema.type)) return schema.type.find(t => t !== 'null') ?? 'string'
  return schema.type ?? 'string'
}

function SchemaField({
  name, schema, value, onChange,
}: {
  name: string
  schema: JsonSchema
  value: any
  onChange: (v: any) => void
}) {
  const type = resolveType(schema)
  const label = fieldLabel(name)

  if (schema.enum) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Select value={String(value ?? schema.default ?? '')} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {schema.enum.map((opt: any) => (
              <SelectItem key={String(opt)} value={String(opt)} className="text-xs">{String(opt)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  if (type === 'boolean') {
    return (
      <div className="flex items-center justify-between py-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Switch
          checked={Boolean(value ?? schema.default ?? false)}
          onCheckedChange={onChange}
          className="scale-75 origin-right"
        />
      </div>
    )
  }

  if (type === 'number' || type === 'integer') {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          {label}
          {schema.minimum !== undefined && schema.maximum !== undefined && (
            <span className="ml-1 text-muted-foreground/60">({schema.minimum}–{schema.maximum})</span>
          )}
        </Label>
        <Input
          type="number"
          value={value ?? schema.default ?? ''}
          min={schema.minimum}
          max={schema.maximum}
          step={type === 'integer' ? 1 : 0.01}
          onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          className="h-8 text-xs"
        />
      </div>
    )
  }

  if (type === 'array') {
    const arr: string[] = Array.isArray(value) ? value : []
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{label} <span className="text-muted-foreground/60">(comma-separated)</span></Label>
        <Input
          type="text"
          value={arr.join(', ')}
          onChange={e => onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
          className="h-8 text-xs"
        />
      </div>
    )
  }

  if (type === 'object' && schema.properties) {
    return (
      <div className="space-y-2 pl-2 border-l border-muted">
        <Label className="text-xs font-medium">{label}</Label>
        {Object.entries(schema.properties).map(([k, sub]) => (
          <SchemaField
            key={k}
            name={k}
            schema={sub}
            value={(value ?? {})[k] ?? sub.default}
            onChange={v => onChange({ ...(value ?? {}), [k]: v })}
          />
        ))}
      </div>
    )
  }

  // Default: text input
  const isMultiline = (schema.maxLength ?? 0) > 200 || name.toLowerCase().includes('prompt')
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {isMultiline ? (
        <Textarea
          value={value ?? schema.default ?? ''}
          onChange={e => onChange(e.target.value)}
          className="text-xs min-h-[80px] resize-none"
          rows={3}
        />
      ) : (
        <Input
          type="text"
          value={value ?? schema.default ?? ''}
          onChange={e => onChange(e.target.value)}
          className="h-8 text-xs"
        />
      )}
    </div>
  )
}

function SchemaForm({
  schema,
  values,
  onChange,
}: {
  schema: JsonSchema
  values: Record<string, any>
  onChange: (key: string, value: any) => void
}) {
  const props = schema.properties ?? {}
  const required = new Set(schema.required ?? [])
  const visible = Object.entries(props).filter(([k]) => !HIDDEN_FIELDS.has(k))

  if (visible.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No configurable inputs.</p>
  }

  return (
    <div className="space-y-3">
      {visible.map(([key, fieldSchema]) => (
        <div key={key}>
          <SchemaField
            name={key}
            schema={fieldSchema}
            value={values[key]}
            onChange={v => onChange(key, v)}
          />
          {required.has(key) && (
            <span className="text-[10px] text-destructive ml-0.5">required</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkerPageClient({ workerId }: WorkerPageClientProps) {
  // Schema-driven form state
  const [schema, setSchema] = useState<JsonSchema | null>(null)
  const [schemaLoading, setSchemaLoading] = useState(true)
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [jsonMode, setJsonMode] = useState(false)

  // JSON textarea fallback state (synced from form)
  const [inputJson, setInputJson] = useState("{}")
  const [jsonError, setJsonError] = useState<string | null>(null)

  const [activeJob, setActiveJob] = useState<JobRecord | null>(null)
  const [selectedHistoryJob, setSelectedHistoryJob] = useState<JobRecord | null>(null)
  const [history, setHistory] = useState<JobRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [isTriggering, setIsTriggering] = useState(false)
  const [tab, setTab] = useState<"run" | "history">("run")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch and initialise schema + form defaults
  useEffect(() => {
    setSchemaLoading(true)
    fetch(`/api/workflows/workers/${workerId}/schema`)
      .then(r => r.ok ? r.json() : null)
      .then((s: JsonSchema | null) => {
        if (!s?.properties) { setSchemaLoading(false); setSchema(null); return }
        setSchema(s)
        // Seed defaults
        const defaults: Record<string, any> = {}
        for (const [k, v] of Object.entries(s.properties ?? {})) {
          if (v.default !== undefined) defaults[k] = v.default
        }
        setFormValues(defaults)
        setInputJson(JSON.stringify(defaults, null, 2))
        setSchemaLoading(false)
      })
      .catch(() => { setSchemaLoading(false); setSchema(null) })
  }, [workerId])

  const handleFormChange = (key: string, value: any) => {
    setFormValues(prev => {
      const next = { ...prev, [key]: value }
      setInputJson(JSON.stringify(next, null, 2))
      return next
    })
  }

  // Validate JSON as user types
  const handleInputChange = (val: string) => {
    setInputJson(val)
    try {
      const parsed = JSON.parse(val)
      setFormValues(parsed)
      setJsonError(null)
    }
    catch { setJsonError("Invalid JSON") }
  }

  // ── Fetch history ──────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/workflows/workers/${workerId}/history`)
      if (res.ok) {
        const data = await res.json()
        setHistory(data.jobs ?? [])
      }
    } catch { /* ignore */ }
    finally { setHistoryLoading(false) }
  }, [workerId])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  // ── Poll active job ────────────────────────────────────────────────────────
  const pollJob = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/workflows/workers/${workerId}/${jobId}`)
      if (!res.ok) return
      const job: JobRecord = await res.json()
      setActiveJob(job)
      if (job.status === "completed" || job.status === "failed") {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        fetchHistory()
      }
    } catch { /* ignore */ }
  }, [workerId, fetchHistory])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  // ── Trigger ────────────────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    let parsedInput: any
    try { parsedInput = JSON.parse(inputJson) }
    catch { setJsonError("Fix JSON before running"); return }

    setIsTriggering(true)
    setActiveJob(null)
    setSelectedHistoryJob(null)
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }

    try {
      const res = await fetch(`/api/workflows/workers/${workerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: parsedInput }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }))
        setActiveJob({ jobId: "error", workerId, status: "failed",
          error: { message: err.error ?? "Failed to dispatch worker" },
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        return
      }

      const { jobId } = await res.json()
      setActiveJob({ jobId, workerId, status: "queued", input: parsedInput,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      setTab("run")

      await pollJob(jobId)
      pollRef.current = setInterval(() => pollJob(jobId), 4000)
    } catch (err: any) {
      setActiveJob({ jobId: "error", workerId, status: "failed",
        error: { message: err?.message ?? "Failed to dispatch worker" },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    } finally {
      setIsTriggering(false)
    }
  }, [workerId, inputJson, pollJob])

  const isPolling = !!pollRef.current
  const label = workerLabel(workerId)

  return (
    <SidebarInset>
      <SiteHeader title={label} />

      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

        {/* ── Left: Input panel ────────────────────────────────────────────── */}
        <div className="w-[320px] flex-shrink-0 border-r flex flex-col">
          <div className="p-3 border-b bg-muted/30 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-mono truncate">{workerId}</p>
            </div>
            <button
              onClick={() => setJsonMode(v => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              title={jsonMode ? "Switch to form" : "Switch to JSON"}
            >
              <Code2 className="h-3.5 w-3.5" />
              {jsonMode ? "Form" : "JSON"}
            </button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 flex flex-col gap-3">
              {schemaLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading schema…
                </div>
              )}

              {!schemaLoading && !jsonMode && schema && (
                <SchemaForm
                  schema={schema}
                  values={formValues}
                  onChange={handleFormChange}
                />
              )}

              {!schemaLoading && (jsonMode || !schema) && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Input JSON</span>
                    {jsonError && (
                      <span className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {jsonError}
                      </span>
                    )}
                  </div>
                  <Textarea
                    value={inputJson}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className={`font-mono text-xs resize-none min-h-[240px] ${jsonError ? "border-destructive" : ""}`}
                    placeholder='{ "prompt": "..." }'
                    spellCheck={false}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline" size="sm" className="text-xs"
                      onClick={() => {
                        try {
                          const parsed = JSON.parse(inputJson)
                          setInputJson(JSON.stringify(parsed, null, 2))
                          setJsonError(null)
                        } catch { setJsonError("Invalid JSON") }
                      }}
                    >Format</Button>
                    <Button
                      variant="outline" size="sm" className="text-xs"
                      onClick={() => { setInputJson("{}"); setFormValues({}); setJsonError(null) }}
                    >Clear</Button>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t bg-background">
            <Button
              className="w-full gap-2"
              onClick={handleRun}
              disabled={isTriggering || isPolling || !!jsonError}
            >
              {isTriggering ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Dispatching…</>
              ) : isPolling ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Running…</>
              ) : (
                <><Zap className="h-4 w-4" /> Run Worker</>
              )}
            </Button>
          </div>
        </div>

        {/* ── Right: Output + History ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex flex-col flex-1 overflow-hidden">
            <div className="border-b px-4 pt-2 bg-background flex items-center justify-between">
              <TabsList className="h-9">
                <TabsTrigger value="run" className="text-sm gap-1.5">
                  <Play className="h-3.5 w-3.5" /> Output
                </TabsTrigger>
                <TabsTrigger value="history" className="text-sm gap-1.5">
                  <History className="h-3.5 w-3.5" /> History
                  {history.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px] ml-1">{history.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {tab === "history" && (
                <Button variant="ghost" size="sm" onClick={fetchHistory} disabled={historyLoading} className="h-7 gap-1 text-xs">
                  <RefreshCw className={`h-3 w-3 ${historyLoading ? "animate-spin" : ""}`} /> Refresh
                </Button>
              )}
            </div>

            {/* Output tab ──────────────────────────────────────────────────── */}
            <TabsContent value="run" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {!activeJob && (
                    <div className="text-center py-16 text-muted-foreground">
                      <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Run the worker to see output here.</p>
                    </div>
                  )}

                  {activeJob && (
                    <>
                      {/* Status banner */}
                      <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                        activeJob.status === "completed" ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" :
                        activeJob.status === "failed"    ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800" :
                        "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                      }`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={activeJob.status} />
                            <code className="text-xs text-muted-foreground truncate">{activeJob.jobId}</code>
                          </div>
                          <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                            {activeJob.createdAt && <span>Started {timeAgo(activeJob.createdAt)}</span>}
                            {jobDuration(activeJob) && <span>⏱ {jobDuration(activeJob)}</span>}
                          </div>
                        </div>
                        {(activeJob.status === "queued" || activeJob.status === "running") && (
                          <span className="text-xs text-muted-foreground">Polling…</span>
                        )}
                      </div>

                      {/* Error */}
                      {activeJob.error && (
                        <Card className="border-red-200 dark:border-red-800">
                          <CardHeader className="pb-2 pt-3">
                            <CardTitle className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                              <XCircle className="h-4 w-4" /> Error
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pb-3">
                            <pre className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">
                              {activeJob.error.message}
                            </pre>
                          </CardContent>
                        </Card>
                      )}

                      {/* Output */}
                      {activeJob.output && (
                        <Card>
                          <CardHeader className="pb-2 pt-3">
                            <CardTitle className="text-sm flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 text-green-500" /> Result
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pb-3">
                            <JobOutput output={activeJob.output} />
                          </CardContent>
                        </Card>
                      )}

                      {/* Waiting */}
                      {(activeJob.status === "queued" || activeJob.status === "running") && !activeJob.output && (
                        <div className="text-center py-8">
                          <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground">
                            {activeJob.status === "queued" ? "Queued — waiting for worker to start…" : "Worker is processing…"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Polling every 4 seconds</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* History tab ─────────────────────────────────────────────────── */}
            <TabsContent value="history" className="flex-1 overflow-hidden m-0">
              <div className="flex h-full">

                {/* Job list */}
                <ScrollArea className="w-80 flex-shrink-0 border-r h-full">
                  <div className="p-3 space-y-2">
                    {historyLoading && history.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Loading…
                      </div>
                    )}
                    {!historyLoading && history.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No past runs yet
                      </div>
                    )}
                    {history.map((job) => (
                      <JobHistoryItem
                        key={job.jobId}
                        job={job}
                        isActive={selectedHistoryJob?.jobId === job.jobId}
                        onSelect={setSelectedHistoryJob}
                      />
                    ))}
                  </div>
                </ScrollArea>

                {/* Selected job detail */}
                <ScrollArea className="flex-1 h-full">
                  <div className="p-4">
                    {!selectedHistoryJob ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Select a run from the list to see details.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={selectedHistoryJob.status} />
                          <code className="text-xs text-muted-foreground">{selectedHistoryJob.jobId}</code>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {selectedHistoryJob.createdAt && new Date(selectedHistoryJob.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {selectedHistoryJob.input && (
                          <Card>
                            <CardHeader className="py-2 px-3">
                              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Input</CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pb-3">
                              <pre className="text-xs bg-muted/40 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(selectedHistoryJob.input, null, 2)}
                              </pre>
                            </CardContent>
                          </Card>
                        )}

                        {selectedHistoryJob.output && (
                          <Card>
                            <CardHeader className="py-2 px-3">
                              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Output</CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pb-3">
                              <JobOutput output={selectedHistoryJob.output} />
                            </CardContent>
                          </Card>
                        )}

                        {selectedHistoryJob.error && (
                          <Card className="border-red-200 dark:border-red-800">
                            <CardHeader className="py-2 px-3">
                              <CardTitle className="text-xs text-red-500 uppercase tracking-wide">Error</CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pb-3">
                              <pre className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">
                                {selectedHistoryJob.error.message}
                              </pre>
                            </CardContent>
                          </Card>
                        )}

                        <Button
                          variant="outline" size="sm" className="w-full gap-1.5 text-xs"
                          onClick={() => {
                            if (selectedHistoryJob.input) {
                              setFormValues(selectedHistoryJob.input)
                              setInputJson(JSON.stringify(selectedHistoryJob.input, null, 2))
                              setTab("run")
                              setSelectedHistoryJob(null)
                            }
                          }}
                        >
                          <RefreshCw className="h-3 w-3" /> Load Input & Re-run
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </SidebarInset>
  )
}
