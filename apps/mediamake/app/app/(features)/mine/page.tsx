import { ComingSoon } from '@/components/app-shell/app-page';

export const metadata = { title: 'Mine · MediaMake' };

/** /app/mine: what the person added, forked or made. */
export default function MinePage() {
  return (
    <ComingSoon
      title="Mine"
      about="Mine will hold what you added, forked or made:"
      points={['The items you installed', 'Your variants of skills', 'Your private items', 'The skills found on your computer']}
    />
  );
}
