"use client"

import dynamic from 'next/dynamic'

const Studio3DPage = dynamic(
  () => import('@/components/studio-3d/studio-3d-page').then(m => m.Studio3DPage),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground animate-pulse">Loading 3D Studio…</span>
      </div>
    ),
  },
)

export function StudioLoader() {
  return <Studio3DPage />
}
