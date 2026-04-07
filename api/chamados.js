diff --git a/api/chamados.js b/api/chamados.js
index d4e3ee41140a6f89bbaf2c29d5403bd9a6171b61..3a6f29a05af31d0c398b46ec9e5203ef2979773d 100644
--- a/api/chamados.js
+++ b/api/chamados.js
@@ -1,33 +1,36 @@
+const { resolveSupabaseServerEnv, formatMissingServerEnvError } = require("./_supabaseEnv.js");
+
 module.exports = async (req, res) => {
   const method = String(req.method || "GET").toUpperCase();
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
     if (method === "GET") {
       return await listChamados(req, res, supabaseUrl, serviceRole);
     }
     if (method === "POST") {
       return await createChamado(req, res, supabaseUrl, serviceRole);
     }
     if (method === "PATCH") {
       return await updateChamado(req, res, supabaseUrl, serviceRole);
     }
 
     res.setHeader("Allow", "GET, POST, PATCH");
     return res.status(405).json({ error: "Metodo nao permitido." });
   } catch (error) {
     return res.status(500).json({ error: error.message || "Erro interno." });
   }
 };
 
 async function listChamados(_req, res, supabaseUrl, serviceRole) {
   let response = await fetch(
     `${supabaseUrl}/rest/v1/chamados?select=*&order=created_at.desc.nullslast,numero.desc.nullslast&limit=300`,
     {

