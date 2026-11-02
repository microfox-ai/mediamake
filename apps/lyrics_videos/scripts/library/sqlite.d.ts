/**
 * node:sqlite (built into Node 22.5+) is missing from @types/node 20, which this app pins.
 * Only the part the library uses. Delete this file once @types/node ships its own.
 */
declare module 'node:sqlite' {
  type SQLValue = null | number | bigint | string | Uint8Array;
  type Row = Record<string, SQLValue>;
  class StatementSync {
    run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    get(...params: unknown[]): Row | undefined;
    all(...params: unknown[]): Row[];
  }
  class DatabaseSync {
    constructor(location: string, options?: { open?: boolean; readOnly?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
