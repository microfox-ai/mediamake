'use client';

import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { TimelinePreview } from '@/components/dev/timeline-preview';

export default function DevPreviewPage() {
  return (
    <SidebarInset>
      <SiteHeader title="Preview" />
      <div className="flex flex-1 flex-col pt-4">
        <TimelinePreview />
      </div>
    </SidebarInset>
  );
}
