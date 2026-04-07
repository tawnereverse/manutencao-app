diff --git a/api/_supabaseEnv.js b/api/_supabaseEnv.js
new file mode 100644
index 0000000000000000000000000000000000000000..1bb2fb5f90802f027fbde24f5310fc72cf3853cb
--- /dev/null
+++ b/api/_supabaseEnv.js
@@ -0,0 +1,51 @@
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
+  const url = pick(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_URL);
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

