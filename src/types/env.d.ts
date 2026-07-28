// Minimal ambient declaration so `import.meta.env` type-checks under CRA/tsc
// before Task 8 migrates the build to Vite and adds `src/vite-env.d.ts`
// (which will supersede this file with Vite's own client types).
export {};

declare global {
  interface ImportMetaEnv {
    readonly VITE_SPOTIFY_CLIENT_ID?: string;
    readonly VITE_GROQ_API_KEY?: string;
    readonly [key: string]: string | boolean | undefined;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
