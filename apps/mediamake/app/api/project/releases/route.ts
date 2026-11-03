import { bundleRoutes } from '@/lib/projectsync/bundles';

/**
 * /api/project/releases: a project's releases for ProjectSync (lib/projectsync). GET lists them or reads
 * one (with signed links to its files), POST adds one, PUT changes it or adds a version, DELETE moves
 * it to the project's trash. The project's role decides who may do what.
 */
const routes = bundleRoutes('release');

export const GET = routes.GET;
export const POST = routes.POST;
export const PUT = routes.PUT;
export const DELETE = routes.DELETE;
