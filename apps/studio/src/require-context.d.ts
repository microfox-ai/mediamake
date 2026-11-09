// Webpack's require.context, used by Root.tsx to discover projects ('lazy' mode: Studio, which loads a
// project when its composition is opened; then calling the context returns a Promise of the module).
declare namespace NodeJS {
  interface RequireContext {
    keys(): string[];
    <T = any>(id: string): T;
  }
  interface Require {
    context(
      directory: string,
      useSubdirectories: boolean,
      regExp: RegExp,
      mode?: 'sync' | 'eager' | 'weak' | 'lazy' | 'lazy-once',
    ): RequireContext;
  }
}
