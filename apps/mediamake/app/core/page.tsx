import { redirect } from 'next/navigation';

/** /core on its own opens the projects list. */
export default function CorePage() {
  redirect('/core/projects');
}
