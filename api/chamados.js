module.exports = async (req, res) => {
  const method = String(req.method || "GET").toUpperCase();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 🔥 validação crítica
  if (!supabaseUrl || !serviceRole) {
    console.error("ENV ERROR:", { supabaseUrl, serviceRole });
    return res.status(500).json({
      error: "Erro de configuracao no servidor (SUPABASE)."
    });
  }

  try {
    if (method === "POST") return await createChamado(req, res, supabaseUrl, serviceRole);
    if (method === "GET") return await listChamados(res, supabaseUrl, serviceRole);
    if (method === "PATCH") return await updateChamado(req, res, supabaseUrl, serviceRole);

    return res.status(405).json({ error: "Metodo nao permitido." });

  } catch (error) {
    console.error("ERRO GERAL:", error);
    return res.status(500).json({
      error: error.message || "Erro interno."
    });
  }
};

// ================== CREATE ==================
async function createChamado(req, res, url, key) {
  const body = parseBody(req);

  const payload = {
    nome: clean(body.nome),
    email: clean(body.email),
    unidade: clean(body.unidade),
    setor: clean(body.setor),
    descricao: clean(body.descricao),
    prioridade: clean(body.prioridade) || "normal",
    status: "aberto"
  };

  // validação obrigatória
  if (!payload.nome || !payload.email || !payload.unidade || !payload.setor || !payload.descricao) {
    return res.status(400).json({ error: "Campos obrigatorios faltando." });
  }

  try {
    const response = await fetch(`${url}/rest/v1/chamados`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(payload)
    });

    const data = await safeJson(response);

    if (!response.ok) {
      console.error("SUPABASE INSERT ERROR:", data);
      return res.status(response.status).json({
        error: data?.message || data?.error || "Erro ao inserir chamado."
      });
    }

    const created = Array.isArray(data) ? data[0] : data;

    return res.status(201).json({
      ok: true,
      numero: created?.numero ?? created?.id ?? null
    });

  } catch (error) {
    console.error("CREATE ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}

// ================== LIST ==================
async function listChamados(res, url, key) {
  try {
    const response = await fetch(
      `${url}/rest/v1/chamados?select=*&order=created_at.desc.nullslast,id.desc`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`
        }
      }
    );

    const data = await safeJson(response);

    if (!response.ok) {
      console.error("SUPABASE LIST ERROR:", data);
      return res.status(response.status).json({
        error: data?.message || data?.error || "Erro ao listar chamados."
      });
    }

    return res.status(200).json({
      ok: true,
      data
    });

  } catch (error) {
    console.error("LIST ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}

// ================== UPDATE ==================
async function updateChamado(req, res, url, key) {
  const body = parseBody(req);
  const id = clean(body.id);

  if (!id) {
    return res.status(400).json({ error: "ID obrigatorio." });
  }

  const updatePayload = {};

  if (body.status !== undefined) updatePayload.status = clean(body.status);
  if (body.atendido_por !== undefined) updatePayload.atendido_por = clean(body.atendido_por);
  if (body.solucao !== undefined) updatePayload.solucao = clean(body.solucao);

  try {
    const response = await fetch(`${url}/rest/v1/chamados?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(updatePayload)
    });

    const data = await safeJson(response);

    if (!response.ok) {
      console.error("SUPABASE UPDATE ERROR:", data);
      return res.status(response.status).json({
        error: data?.message || data?.error || "Erro ao atualizar chamado."
      });
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error("UPDATE ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}

// ================== HELPERS ==================
function parseBody(req) {
  try {
    return typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body || {};
  } catch {
    return {};
  }
}

function clean(value) {
  return String(value || "").trim();
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}