import { ComingSoon } from '@/components/app-shell/app-page';
import { getAppViewer } from '@/lib/app-shell/viewer';
import { tierInfo } from '@/lib/memberships/tiers';

export const metadata = { title: 'Subscription · MediaMake' };

/** /app/subscription: the person's membership. For now, which one they hold. */
export default async function SubscriptionPage() {
  const { tier } = await getAppViewer();
  const info = tierInfo(tier);

  return (
    <ComingSoon
      title="Subscription"
      about="Subscription will show how you got your membership, what it opens, and how to reach the next one. There are no payments: a membership comes from contributing or from an admin."
    >
      <div className="rounded-xl border p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your membership</p>
        <p className="mt-1 text-2xl font-semibold">{info.label}</p>
      </div>
    </ComingSoon>
  );
}
