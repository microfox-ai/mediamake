/** MCP tool hints: reads, writes that change nothing irreversibly, and moves to the trash. */
export const READ = { readOnlyHint: true, openWorldHint: true } as const;
export const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;
export const DELETE = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true } as const;
