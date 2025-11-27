import { WorkflowEditor } from '@/components/workflows/WorkflowEditor';
import { SidebarInset } from '@/components/ui/sidebar';

interface WorkflowEditorPageProps {
  params: Promise<{
    workflowId: string;
  }>;
}

export default async function WorkflowEditorPage({
  params,
}: WorkflowEditorPageProps) {
  const { workflowId } = await params;

  return (
    <SidebarInset className="p-0 h-screen">
      <WorkflowEditor workflowId={workflowId} />
    </SidebarInset>
  );
}

