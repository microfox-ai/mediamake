import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShareViewer } from './ShareViewer';

interface PageProps {
  params: Promise<{ token: string }>;
}

async function fetchExportMeta(token: string) {
  const { projectExportsCol } = await import('@/lib/db/collections');
  const col = await projectExportsCol();
  const doc = await col.findOne({ shareToken: token });
  if (!doc || doc.expiresAt < new Date()) return null;
  return {
    format: doc.format,
    fileName: doc.fileName,
    projectName: doc.projectName,
    createdAt: doc.createdAt.toISOString(),
    expiresAt: doc.expiresAt.toISOString(),
    content: doc.format === 'pdf' ? doc.content : null,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const meta = await fetchExportMeta(token);
  if (!meta) return { title: 'Not Found — Writepad' };
  return {
    title: `${meta.projectName} — Writepad Export`,
    description: `Shared ${meta.format.toUpperCase()} export from Writepad`,
  };
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;
  const meta = await fetchExportMeta(token);
  if (!meta) notFound();

  return <ShareViewer token={token} meta={meta} />;
}
