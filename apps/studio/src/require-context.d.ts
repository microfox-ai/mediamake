// Webpack's require.context, used by Root.tsx to discover projects.
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
    ): RequireContext;
  }
}
