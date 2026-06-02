import * as THREE from 'three'
import type { ProceduralTextureConfig } from './types'

// Module-level registries — survive React re-renders
export const paintCanvasRegistry = new Map<string, HTMLCanvasElement>()
export const paintTextureRegistry = new Map<string, THREE.CanvasTexture>()

export function getOrCreatePaintCanvas(
  objectId: string,
  existingDataUrl?: string,
): HTMLCanvasElement {
  if (paintCanvasRegistry.has(objectId)) return paintCanvasRegistry.get(objectId)!
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 512, 512)
  if (existingDataUrl) {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      const tex = paintTextureRegistry.get(objectId)
      if (tex) tex.needsUpdate = true
    }
    img.src = existingDataUrl
  }
  paintCanvasRegistry.set(objectId, canvas)
  return canvas
}

export function getOrCreatePaintTexture(objectId: string): THREE.CanvasTexture {
  if (paintTextureRegistry.has(objectId)) return paintTextureRegistry.get(objectId)!
  const canvas = getOrCreatePaintCanvas(objectId)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  paintTextureRegistry.set(objectId, tex)
  return tex
}

export function savePaintToDataUrl(objectId: string): string | null {
  const canvas = paintCanvasRegistry.get(objectId)
  return canvas ? canvas.toDataURL('image/png') : null
}

export function clearPaintCanvas(objectId: string) {
  const canvas = paintCanvasRegistry.get(objectId)
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 512, 512)
  const tex = paintTextureRegistry.get(objectId)
  if (tex) tex.needsUpdate = true
}

// ─── Procedural texture generation ───────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace('#', ''), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function generateProceduralTexture(config: ProceduralTextureConfig): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  if (config.type === 'checker') {
    const cellSize = Math.max(4, Math.floor(size / (config.scale * 8)))
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = ((Math.floor(x / cellSize) + Math.floor(y / cellSize)) % 2 === 0)
          ? config.color1 : config.color2
        ctx.fillRect(x, y, 1, 1)
      }
    }
  } else if (config.type === 'gradient') {
    const grad = ctx.createLinearGradient(0, 0, size, size)
    grad.addColorStop(0, config.color1)
    grad.addColorStop(1, config.color2)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
  } else {
    const c1 = hexToRgb(config.color1)
    const c2 = hexToRgb(config.color2)
    const imgData = ctx.createImageData(size, size)
    for (let i = 0; i < size * size; i++) {
      const n = Math.random()
      imgData.data[i * 4]     = Math.round(c1.r + n * (c2.r - c1.r))
      imgData.data[i * 4 + 1] = Math.round(c1.g + n * (c2.g - c1.g))
      imgData.data[i * 4 + 2] = Math.round(c1.b + n * (c2.b - c1.b))
      imgData.data[i * 4 + 3] = 255
    }
    ctx.putImageData(imgData, 0, 0)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
}
