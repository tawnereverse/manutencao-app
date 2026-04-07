diff --git a/api/login.js b/api/login.js
index aeb6a04841b7078aee58c1d881ac72d2dcfd7732..703e0126851c87c5ac3b2d9d3ee7b19b3a1f5864 100644
--- a/api/login.js
+++ b/api/login.js
@@ -1,91 +1,110 @@
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
       `&senha=eq.${encodeURIComponent(pass)}` +
       `&limit=1`;
 
-    const response = await fetch(url, {
+    const response = await supabaseFetch(url, {
       headers: {
         apikey: serviceRole,
         Authorization: `Bearer ${serviceRole}`
       }
     });
 
     const data = await safeJson(response);
     if (!response.ok) {
       const message = data?.message || data?.error || "Falha ao validar login.";
       return res.status(response.status).json({ error: message });
     }
 
     const account = Array.isArray(data) ? data[0] : null;
     if (!account) {
       return res.status(401).json({ error: "Login invalido." });
     }
 
     return res.status(200).json({
       ok: true,
       user: account.login || user,
       role: account.role || "tecnico",
       displayName: account.nome || account.login || user
     });
   } catch (error) {
     return res.status(500).json({ error: error.message || "Erro interno." });
   }
 };
 
 async function parseBody(req) {
   if (typeof req.body === "object" && req.body !== null) {
     return req.body;
   }
   if (typeof req.body === "string" && req.body.trim()) {
     return JSON.parse(req.body);
   }
   return {};
 }
 
 async function safeJson(response) {
   try {
     return await response.json();
   } catch {
     return null;
   }
 }
 
 function clean(value) {
   return String(value ?? "").trim();
 }
+
+async function supabaseFetch(url, options) {
+  const controller = new AbortController();
+  const timer = setTimeout(() => controller.abort(), 8000);
+
+  try {
+    return await fetch(url, { ...options, signal: controller.signal });
+  } catch (error) {
+    if (error?.name === "AbortError") {
+      throw new Error("Tempo limite ao validar login no Supabase.");
+    }
+    throw error;
+  } finally {
+    clearTimeout(timer);
+  }
+}

