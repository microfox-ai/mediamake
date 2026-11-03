import { bundleRoutes } from '@/lib/projectsync/bundles';

/** POST /api/project/releases/finish { projectId, id, version }: checks the files arrived, then makes it the latest version. */
export const POST = bundleRoutes('release').FINISH;
