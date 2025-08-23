declare namespace NodeJS {
  interface ProcessEnv {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;

    GROQ_API_KEY: string;
  }
}
