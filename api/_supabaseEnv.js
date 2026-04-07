diff --git a/api/_supabaseEnv.js b/api/_supabaseEnv.js
new file mode 100644
index 0000000000000000000000000000000000000000..c758b101aab059b113775d699d250e05c901de02
--- /dev/null
+++ b/api/_supabaseEnv.js
@@ -0,0 +1,97 @@
+function pick(...values) {
+  for (const value of values) {
+    if (typeof value === "string" && value.trim()) {
+      return value.trim();
+    }
+  }
+  return "";
+}
+
+function resolveSupabaseServerEnv(env = process.env) {
+  const urlFromEnv = pick(
+    env.SUPABASE_URL,
+    env.NEXT_PUBLIC_SUPABASE_URL,
+    env.PUBLIC_SUPABASE_URL
+  );
+  const anonKey = pick(
+    env.SUPABASE_ANON_KEY,
+    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
+    env.PUBLIC_SUPABASE_ANON_KEY
+  );
+  const serviceRoleKey = pick(
+    env.SUPABASE_SERVICE_ROLE_KEY,
+    env.SUPABASE_SERVICE_ROLE,
+    env.SUPABASE_SECRET_KEY
+  );
+
+  const url = urlFromEnv || extractSupabaseUrlFromJwt(anonKey);
+  const missing = [];
+  if (!url) missing.push("SUPABASE_URL");
+  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
+
+  return {
+    url,
+    anonKey,
+    serviceRoleKey,
+    ok: missing.length === 0,
+    missing
+  };
+}
+
+function extractSupabaseUrlFromJwt(token) {
+  if (!token || typeof token !== "string") {
+    return "";
+  }
+
+  const parts = token.split(".");
+  if (parts.length < 2) {
+    return "";
+  }
+
+  try {
+    const payload = JSON.parse(decodeBase64Url(parts[1]));
+    const iss = String(payload?.iss || "").trim();
+    if (!iss.startsWith("http")) {
+      return "";
+    }
+
+    try {
+      const parsed = new URL(iss);
+      return `${parsed.origin}`;
+    } catch {
+      return "";
+    }
+  } catch {
+    return "";
+  }
+}
+
+function decodeBase64Url(input) {
+  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
+  if (typeof Buffer !== "undefined") {
+    return Buffer.from(normalized, "base64").toString("utf8");
+  }
+
+  if (typeof atob === "function") {
+    return atob(normalized);
+  }
+
+  throw new Error("Nao foi possivel decodificar token JWT.");
+}
+
+function formatMissingServerEnvError(missing) {
+  const required = "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY";
+  if (!Array.isArray(missing) || !missing.length) {
+    return `Variaveis de ambiente ausentes. Configure ${required}.`;
+  }
+
+  return (
+    `Variaveis de ambiente ausentes: ${missing.join(", ")}. ` +
+    `Configure ${required} no projeto (aceita aliases como NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE).`
+  );
+}
+
+module.exports = {
+  resolveSupabaseServerEnv,
+  formatMissingServerEnvError
+};

