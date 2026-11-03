import { redirect } from 'next/navigation';

/** The MCPs are listed on the homepage's MCPs tab; each one has its own page at /mcps/<slug>. */
export default function McpsPage() {
  redirect('/?tab=mcps');
}
