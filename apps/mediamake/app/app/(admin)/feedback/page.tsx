import { AppPage } from '@/components/app-shell/app-page';
import { AdminFeedback } from '@/components/feedback/admin-feedback';

export const metadata = { title: 'Feedback · MediaMake' };

/** /app/feedback: what members sent, sorted by Claude, for admins (the (admin) layout sends everyone else away). */
export default function FeedbackPage() {
  return (
    <AppPage title="Feedback">
      <AdminFeedback />
    </AppPage>
  );
}
