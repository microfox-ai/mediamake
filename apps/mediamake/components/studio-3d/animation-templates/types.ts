import type { SceneObject, AnimationClip, EnvironmentPreset } from '../types'

export type TemplateCategory =
  | 'showcase'
  | 'music'
  | 'space'
  | 'organic'
  | 'physics'
  | 'sci-fi'
  | 'minimal'

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  showcase: 'Showcase',
  music:    'Music & VFX',
  space:    'Space',
  organic:  'Organic',
  physics:  'Physics & Motion',
  'sci-fi': 'Sci-Fi',
  minimal:  'Minimal',
}

export const CATEGORY_ORDER: TemplateCategory[] = [
  'showcase', 'music', 'space', 'sci-fi', 'organic', 'physics', 'minimal',
]

export interface TemplateSettings {
  background: string
  environment: EnvironmentPreset
  ambientIntensity: number
  directionalIntensity: number
  directionalPosition: [number, number, number]
  showGrid: boolean
  skyEnabled?: boolean
  skyPreset?: 'sunny' | 'cloudy' | 'rainy' | 'snowfall' | 'night'
}

export interface SceneTemplate {
  id: string
  name: string
  description: string
  emoji: string
  category: TemplateCategory
  objects: SceneObject[]
  clips: AnimationClip[]
  settings: TemplateSettings
}
