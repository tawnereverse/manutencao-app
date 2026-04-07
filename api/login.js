diff --git a/api/login.js b/api/login.js
index aeb6a04841b7078aee58c1d881ac72d2dcfd7732..8b93e351d97c2f1285f11b851920063a33e11833 100644
--- a/api/login.js
+++ b/api/login.js
@@ -1,38 +1,41 @@
+const { resolveSupabaseServerEnv, formatMissingServerEnvError } = require("./_supabaseEnv.js");
+
 module.exports = async (req, res) => {
   const method = String(req.method || "GET").toUpperCase();
   if (method !== "POST") {
     res.setHeader("Allow", "POST");
     return res.status(405).json({ error: "Metodo nao permitido." });
   }
 
-  const supabaseUrl = process.env.SUPABASE_URL;
-  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
+  const envConfig = resolveSupabaseServerEnv();
+  const supabaseUrl = envConfig.url;
+  const serviceRole = envConfig.serviceRoleKey;
 
-  if (!supabaseUrl || !serviceRole) {
+  if (!envConfig.ok) {
     return res.status(500).json({
-      error: "Variaveis de ambiente ausentes. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
+      error: formatMissingServerEnvError(envConfig.missing)
     });
   }
 
   try {
     const body = await parseBody(req);
     const user = clean(body.user);
     const pass = String(body.pass ?? "");
 
     if (!user || !pass) {
       return res.status(400).json({ error: "Informe usuario e senha." });
     }
 
     if (user === "admin" && pass === "123") {
       return res.status(200).json({
         ok: true,
         user: "admin",
         role: "admin",
         displayName: "Administrador"
       });
     }
 
     const url =
       `${supabaseUrl}/rest/v1/usuarios` +
       `?select=login,senha,nome,role` +
       `&login=eq.${encodeURIComponent(user)}` +

