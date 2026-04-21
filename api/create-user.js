module.exports = async (req, res) => {
  const method = String(req.method || "GET").toUpperCase();

  if (method !== "POST") {
    return res.status(405).json({ error: "Metodo nao permitido" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    console.error("ENV ERROR CREATE USER");
    return res.status(500).json({
      error: "Erro de configuracao do servidor"
    });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    const nome = String(body.fullName || "").trim();
    const login = String(body.login || "").trim().toLowerCase();
    const senha = String(body.password || "").trim();
    const role = String(body.role || "tecnico").trim().toLowerCase();

    if (!nome || !login || !senha) {
      return res.status(400).json({
        error: "Nome, email e senha sao obrigatorios."
      });
    }

    // 🔥 monta payload correto pro banco
    const payload = {
      nome,
      login,
      senha,
      role
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/usuarios`, {
      method: "POST",
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(payload)
    });

    const data = await safeJson(response);

    if (!response.ok) {
      console.error("CREATE USER ERROR:", data);
      return res.status(response.status).json({
        error: data?.message || data?.error || "Erro ao criar usuario"
      });
    }

    return res.status(201).json({
      ok: true,
      message: "Usuario criado com sucesso"
    });

  } catch (error) {
    console.error("CREATE USER FATAL:", error);
    return res.status(500).json({
      error: error.message || "Erro interno"
    });
  }
};

// ================= HELPERS =================

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}