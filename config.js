const runtimeConfig = window.__APP_CONFIG__ ?? {};

export const SUPABASE_URL =
  runtimeConfig.SUPABASE_URL ?? "https://kmxmyjvxncteacojmbaj.supabase.co";

export const SUPABASE_ANON_KEY =
  runtimeConfig.SUPABASE_ANON_KEY ?? "sb_publishable_OuujR_q1W9R1q9-MJuHPIg_a89r7Y9J";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Configuracao Supabase ausente. Defina SUPABASE_URL e SUPABASE_ANON_KEY."
  );
}
