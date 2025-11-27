import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { WorkflowList } from '@/components/workflows/WorkflowList';

export default function WorkflowsPage() {
  return (
    <SidebarInset>
      <SiteHeader title="Workflows" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <WorkflowList />
      </div>
    </SidebarInset>
  );
}

