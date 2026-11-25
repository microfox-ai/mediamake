// A file's text, for the code that inlines it in a page (the painted-cartoon kit: src/painted/page.ts).
// scripts/workspace-webpack.ts gives every `?raw` import this type of module (rawText).
declare module '*?raw' {
  const text: string;
  export default text;
}
