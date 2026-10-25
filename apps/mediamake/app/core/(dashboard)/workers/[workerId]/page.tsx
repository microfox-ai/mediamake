import { WorkerPageClient } from "@/components/workers/worker-page-client"

interface WorkerPageProps {
  params: Promise<{ workerId: string }>
}

export default async function WorkerPage({ params }: WorkerPageProps) {
  const { workerId } = await params
  return <WorkerPageClient workerId={workerId} />
}

export async function generateMetadata({ params }: WorkerPageProps) {
  const { workerId } = await params
  const label = workerId
    .split(/[-_]/)
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return { title: `${label} — Mediamake` }
}
