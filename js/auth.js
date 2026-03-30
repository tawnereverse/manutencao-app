import { supabase } from "./supabaseClient.js";

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session ?? null;
}

export async function requireUser(redirectTo = "./login.html") {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    window.location.href = redirectTo;
    return null;
  }
  return data.user;
}

export async function getMyProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data ?? null;
}

export async function signOutAndRedirect(redirectTo = "./login.html") {
  await supabase.auth.signOut();
  window.location.href = redirectTo;
}
