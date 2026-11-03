import { bundleRoutes } from '@/lib/projectsync/bundles';

/** POST /api/project/productions/finish { projectId, id, version }: checks the files arrived, then makes it the latest version. */
export const POST = bundleRoutes('production').FINISH;
