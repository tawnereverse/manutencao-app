module.exports = async (req, res) => {
  const method = String(req.method || "GET").toUpperCase();

  if (method !== "POST") {
    return res.status(405).json({ error: "Metodo nao permitido" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    const user = String(body.user || "").trim();
    const pass = String(body.pass || "");

    if (!user || !pass) {
      return res.status(400).json({ error: "Informe usuario e senha." });
    }

    // 🔥 LOGIN FIXO (NUNCA FALHA)
    if (user === "admin" && pass === "123") {
      return res.status(200).json({
        ok: true,
        user: "admin",
        role: "admin",
        displayName: "Administrador"
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRole) {
      console.error("ENV ERROR LOGIN");
      return res.status(500).json({ error: "Erro de configuracao" });
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/usuarios?login=eq.${encodeURIComponent(user)}&senha=eq.${encodeURIComponent(pass)}&limit=1`,
      {
        headers: {
          apikey: serviceRole,
          Authorization: `Bearer ${serviceRole}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("LOGIN ERROR:", data);
      return res.status(500).json({ error: "Erro ao consultar usuarios" });
    }

    if (!data.length) {
      return res.status(401).json({ error: "Login invalido" });
    }

    const account = data[0];

    return res.status(200).json({
      ok: true,
      user: account.login,
      role: account.role || "tecnico",
      displayName: account.nome || account.login
    });

  } catch (error) {
    console.error("LOGIN FATAL:", error);
    return res.status(500).json({ error: error.message });
  }
};