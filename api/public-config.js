diff --git a/api/public-config.js b/api/public-config.js
index d690ddc9f9d38e6f25df4bcab75358dd353145ed..ab81964e01dd2ea174aa2278f2d54028599ac28e 100644
--- a/api/public-config.js
+++ b/api/public-config.js
@@ -1,14 +1,17 @@
+const { resolveSupabaseServerEnv } = require("./_supabaseEnv.js");
+
 module.exports = async (_req, res) => {
-  const url = process.env.SUPABASE_URL || "";
-  const anonKey = process.env.SUPABASE_ANON_KEY || "";
+  const envConfig = resolveSupabaseServerEnv();
+  const url = envConfig.url || "";
+  const anonKey = envConfig.anonKey || "";
 
   res.setHeader("Content-Type", "application/javascript; charset=utf-8");
   res.setHeader("Cache-Control", "no-store, max-age=0");
 
   res.status(200).send(
     `window.__APP_CONFIG__ = ${JSON.stringify({
       SUPABASE_URL: url,
       SUPABASE_ANON_KEY: anonKey
     })};`
   );
 };

