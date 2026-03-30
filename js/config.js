const runtimeConfig = window.__APP_CONFIG__ ?? {};

export const SUPABASE_URL = runtimeConfig.SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = runtimeConfig.SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Configuracao Supabase ausente. Defina SUPABASE_URL e SUPABASE_ANON_KEY."
  );
}
