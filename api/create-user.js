module.exports = async (req, res) => {
  const method = String(req.method || "GET").toUpperCase();
  if (method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo nao permitido." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    return res.status(500).json({
      error: "Variaveis de ambiente ausentes. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
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
          error: errorBody?.message || errorBody?.error || "Falha ao criar usuario."
        });
      }
    }

    if (!response.ok) {
      const errorBody = await safeJson(response);
      return res.status(response.status).json({
        error: errorBody?.message || errorBody?.error || "Falha ao criar usuario."
      });
    }

    return res.status(201).json({ ok: true, message: "Usuario criado com sucesso." });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro interno." });
  }
};

function insertUsuario(supabaseUrl, serviceRole, payload) {
  return fetch(`${supabaseUrl}/rest/v1/usuarios`, {
    method: "POST",
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(payload)
  });
}

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
