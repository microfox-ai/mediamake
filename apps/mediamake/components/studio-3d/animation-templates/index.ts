export * from './types'
export * as Helpers from './helpers'

import type { SceneTemplate, TemplateCategory } from './types'
import { CATEGORY_ORDER, CATEGORY_LABELS } from './types'

// ── Templates ────────────────────────────────────────────────────────────────

import {
  COSMIC_DANCE, NEON_PULSE, FLOAT_DRIFT, GEO_SPIN, EMPTY_STAGE,
} from './_showcase'
import { SOLAR_SYSTEM }     from './solar-system'
import { MUSIC_VISUALIZER } from './music-visualizer'
import { DNA_HELIX }        from './dna-helix'
import { GALAXY_SPIRAL }    from './galaxy-spiral'
import { DOMINO_CASCADE }   from './domino-cascade'
import { ENDLESS_TUNNEL }   from './endless-tunnel'

// Re-export each template by name so they're individually importable.
export {
  COSMIC_DANCE, NEON_PULSE, FLOAT_DRIFT, GEO_SPIN, EMPTY_STAGE,
  SOLAR_SYSTEM, MUSIC_VISUALIZER, DNA_HELIX, GALAXY_SPIRAL,
  DOMINO_CASCADE, ENDLESS_TUNNEL,
}

export const ALL_TEMPLATES: SceneTemplate[] = [
  // Showcase
  COSMIC_DANCE, NEON_PULSE, FLOAT_DRIFT, GEO_SPIN,
  // Music
  MUSIC_VISUALIZER,
  // Space
  SOLAR_SYSTEM, GALAXY_SPIRAL,
  // Sci-fi
  ENDLESS_TUNNEL,
  // Organic
  DNA_HELIX,
  // Physics
  DOMINO_CASCADE,
  // Minimal
  EMPTY_STAGE,
]

export const DEFAULT_TEMPLATE = COSMIC_DANCE

// ── Grouped accessors ─────────────────────────────────────────────────────────

export interface TemplateGroup {
  category: TemplateCategory
  label: string
  templates: SceneTemplate[]
}

export function getTemplateGroups(): TemplateGroup[] {
  const byCat = new Map<TemplateCategory, SceneTemplate[]>()
  for (const t of ALL_TEMPLATES) {
    const list = byCat.get(t.category) ?? []
    list.push(t)
    byCat.set(t.category, list)
  }
  return CATEGORY_ORDER
    .map(cat => ({ category: cat, label: CATEGORY_LABELS[cat], templates: byCat.get(cat) ?? [] }))
    .filter(g => g.templates.length > 0)
}
