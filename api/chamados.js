module.exports = async (req, res) => {
  const method = String(req.method || "GET").toUpperCase();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // validação
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
    prioridade: "normal",
    status: "aberto"
  };

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

  console.log("BODY RECEBIDO:", body); // 🔥 debug

  const id = clean(body.id);

  if (!id) {
    return res.status(400).json({ error: "ID obrigatorio." });
  }

  const updatePayload = {};

  if (body.status !== undefined) {
    updatePayload.status = clean(body.status);
  }

  if (body.prioridade !== undefined) {
    const prioridade = cleanPriority(body.prioridade);
    if (!prioridade) {
      return res.status(400).json({
        error: "Prioridade invalida."
      });
    }
    updatePayload.prioridade = prioridade;
  }

  if (body.atendido_por !== undefined) {
    updatePayload.atendido_por = clean(body.atendido_por);
  }

  if (body.solucao !== undefined) {
    updatePayload.solucao = clean(body.solucao);
  }

  if (body.data_termino_servico !== undefined) {
    const dataTermino = cleanDate(body.data_termino_servico);
    if (dataTermino === false) {
      return res.status(400).json({
        error: "Data de termino do servico invalida."
      });
    }
    updatePayload.data_termino_servico = dataTermino;
  }

  console.log("PAYLOAD FINAL:", updatePayload); // 🔥 debug

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

    console.log("UPDATE OK:", data); // 🔥 debug

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

function cleanPriority(value) {
  const priority = clean(value).toLowerCase();
  return ["normal", "urgente"].includes(priority) ? priority : null;
}

function cleanDate(value) {
  const text = clean(value);
  if (!text) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return false;
  }

  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const isValid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return isValid ? text : false;
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
