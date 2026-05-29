"use client"

import * as React from "react"
import { IconSearch } from "@tabler/icons-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRight, Loader2 } from "lucide-react"

// ─── Grouping ────────────────────────────────────────────────────────────────

type WorkerGroup = {
  label: string
  icon: string
  pattern: RegExp
}

const GROUPS: WorkerGroup[] = [
  {
    label: 'AI Video',
    icon: '🎬',
    pattern: /veo|kling|runway|luma|pika|minimax|wan[- ]|heygen|d-id|lipsync/i,
  },
  {
    label: 'AI Image',
    icon: '🖼️',
    pattern: /nanobanana|gemini.*image|flux|ideogram|stability[-_]image|magnific/i,
  },
  {
    label: 'Audio',
    icon: '🎵',
    pattern: /elevenlabs|udio|stability[-_]audio/i,
  },
  {
    label: 'Helpers',
    icon: '🔧',
    pattern: /pexels|creatomate/i,
  },
  {
    label: 'FFmpeg',
    icon: '⚙️',
    pattern: /ffmpeg|subtitle|media[-_]info|video[-_]split/i,
  },
]

function groupWorkers(ids: string[]): { group: WorkerGroup; workers: string[] }[] {
  const buckets = new Map<string, { group: WorkerGroup; workers: string[] }>()
  const ungrouped: string[] = []

  for (const id of ids) {
    const match = GROUPS.find((g) => g.pattern.test(id))
    if (match) {
      if (!buckets.has(match.label)) buckets.set(match.label, { group: match, workers: [] })
      buckets.get(match.label)!.workers.push(id)
    } else {
      ungrouped.push(id)
    }
  }

  // Preserve GROUPS order
  const result: { group: WorkerGroup; workers: string[] }[] = []
  for (const g of GROUPS) {
    const bucket = buckets.get(g.label)
    if (bucket && bucket.workers.length > 0) result.push(bucket)
  }
  if (ungrouped.length > 0) {
    result.push({ group: { label: 'Other', icon: '📦', pattern: /.*/ }, workers: ungrouped })
  }
  return result
}

/** Convert kebab-case worker ID to a display label: "google-veo" → "Google Veo" */
function workerLabel(id: string): string {
  return id
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NavWorkers() {
  const pathname = usePathname()
  const [workerIds, setWorkerIds] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Fetch worker list once on mount.
  // The upstream workers-config endpoint returns `workers` as an object map
  // keyed by worker id (e.g. `{ "sparkboard-index": {...}, "wan-video": {...} }`).
  // Some older responses returned a plain string array — accept either shape.
  React.useEffect(() => {
    let cancelled = false
    fetch('/api/workflows/workers-config')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const raw: unknown = data?.workers
        let ids: string[] = []
        if (Array.isArray(raw)) {
          ids = raw.filter((x): x is string => typeof x === 'string')
        } else if (raw && typeof raw === 'object') {
          ids = Object.keys(raw as Record<string, unknown>)
        }
        setWorkerIds(ids.slice().sort())
        setLoading(false)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load workers')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  // Filter by search
  const filteredIds = React.useMemo(() => {
    if (!searchQuery.trim()) return workerIds
    const q = searchQuery.toLowerCase()
    return workerIds.filter((id) => id.toLowerCase().includes(q))
  }, [workerIds, searchQuery])

  const grouped = React.useMemo(() => groupWorkers(filteredIds), [filteredIds])

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Workers</SidebarGroupLabel>

      <div className="px-2 pb-2">
        <div className="relative">
          <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/50 pointer-events-none" />
          <SidebarInput
            type="text"
            placeholder="Search workers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <SidebarMenu>
        {loading && (
          <SidebarMenuItem>
            <SidebarMenuButton disabled className="text-sidebar-foreground/50">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading…</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}

        {error && !loading && (
          <SidebarMenuItem>
            <span className="px-3 text-xs text-destructive">{error}</span>
          </SidebarMenuItem>
        )}

        {!loading && !error && grouped.length === 0 && (
          <SidebarMenuItem>
            <span className="px-3 text-xs text-muted-foreground">No workers found</span>
          </SidebarMenuItem>
        )}

        {grouped.map(({ group, workers }) => {
          const isAnyActive = workers.some((id) => pathname === `/workers/${id}`)

          return (
            <Collapsible
              key={group.label}
              asChild
              defaultOpen={isAnyActive || searchQuery.length > 0}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={group.label}>
                    <span className="text-base leading-none">{group.icon}</span>
                    <span>{group.label}</span>
                    <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <SidebarMenuSub>
                    {workers.map((id) => (
                      <SidebarMenuSubItem key={id}>
                        <SidebarMenuSubButton asChild isActive={pathname === `/workers/${id}`}>
                          <Link href={`/workers/${id}`}>
                            <span className="truncate">{workerLabel(id)}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
