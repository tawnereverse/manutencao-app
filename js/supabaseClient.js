import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";

if (!window.supabase || typeof window.supabase.createClient !== "function") {
  throw new Error(
    "SDK do Supabase nao carregou. Verifique o script https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2."
  );
}

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
