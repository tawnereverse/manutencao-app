diff --git a/api/health.js b/api/health.js
index 05a9603be3b62f584564ac99141864774d59c5c6..dfd8377e84d6ce7be97cc1b99e6f2a7f8a666dbe 100644
--- a/api/health.js
+++ b/api/health.js
@@ -1,7 +1,16 @@
+const { resolveSupabaseServerEnv } = require("./_supabaseEnv.js");
+
 module.exports = async (_req, res) => {
+  const envConfig = resolveSupabaseServerEnv();
   return res.status(200).json({
     ok: true,
     service: "manutencao-api",
-    now: new Date().toISOString()
+    now: new Date().toISOString(),
+    supabase: {
+      configured: envConfig.ok,
+      missing: envConfig.missing,
+      hasAnonKey: Boolean(envConfig.anonKey),
+      hasServiceRoleKey: Boolean(envConfig.serviceRoleKey)
+    }
   });
 };

