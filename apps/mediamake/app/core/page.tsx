import { redirect } from 'next/navigation';

/** /core on its own opens the media page (Core is deprecated; projects are in the app, /app/projects). */
export default function CorePage() {
  redirect('/core/media');
}
