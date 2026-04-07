diff --git a/api/create-user.js b/api/create-user.js
index bb4ccbaaf6f8a5f9fb97025183aff27cd116dc00..06b4d23b9be91b8c57365d2c191edd27fe2ed711 100644
--- a/api/create-user.js
+++ b/api/create-user.js
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
     const login = clean(body.login);
     const senha = String(body.password ?? "").trim();
     const nome = clean(body.fullName);
     const role = clean(body.role) || "tecnico";
 
     if (!login || !senha) {
       return res.status(400).json({ error: "Login e senha sao obrigatorios." });
     }
 
     const primaryPayload = { login, senha, nome, role };
     let response = await insertUsuario(supabaseUrl, serviceRole, primaryPayload);
 
     if (!response.ok) {
       const errorBody = await safeJson(response);
       const details = String(errorBody?.message || errorBody?.error || "");
       const unknownColumn = details.toLowerCase().includes("column");
       if (unknownColumn) {
         response = await insertUsuario(supabaseUrl, serviceRole, { login, senha });
       } else {
         return res.status(response.status).json({

