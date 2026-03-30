module.exports = async (req, res) => {
  const method = String(req.method || "GET").toUpperCase();
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    return res.status(500).json({
      error: "Variaveis de ambiente ausentes. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
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
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`
      }
    }
  );

  let body = await safeJson(response);
  if (!response.ok && isUnknownColumn(body)) {
    response = await fetch(`${supabaseUrl}/rest/v1/chamados?select=*&limit=300`, {
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`
      }
    });
    body = await safeJson(response);
  }

  if (!response.ok) {
    return res.status(response.status).json({
      error: body?.message || body?.error || "Falha ao consultar chamados."
    });
  }

  const data = Array.isArray(body) ? body.map(normalizeChamado) : [];
  return res.status(200).json({ ok: true, data });
}

async function createChamado(req, res, supabaseUrl, serviceRole) {
  const payload = await parseBody(req);
  const nome = clean(payload.nome);
  const email = clean(payload.email).toLowerCase();
  const unidade = clean(payload.unidade);
  const setor = clean(payload.setor);
  const descricao = clean(payload.descricao);
  const prioridade = normalizePriority(payload.prioridade);

  if (!nome || !email || !unidade || !setor || !descricao) {
    return res.status(400).json({ error: "Campos obrigatorios ausentes." });
  }

  let insertPayload = {
    solicitante_nome: nome,
    solicitante_email: email,
    unidade,
    setor,
    descricao,
    prioridade,
    status: "aberto"
  };

  let response = await restInsert(supabaseUrl, serviceRole, "chamados", insertPayload);
  let body = await safeJson(response);

  if (!response.ok && requiresUserId(body)) {
    const fallbackUserId = await getFallbackUserId(supabaseUrl, serviceRole);
    if (fallbackUserId) {
      response = await restInsert(supabaseUrl, serviceRole, "chamados", {
        ...insertPayload,
        user_id: fallbackUserId
      });
      body = await safeJson(response);
    }
  }

  if (!response.ok && isUnknownColumn(body)) {
    insertPayload = {
      nome,
      unidade,
      setor,
      descricao,
      prioridade: prioridade === "urgente" ? "Urgente" : "Normal",
      status: "Aberto"
    };
    response = await restInsert(supabaseUrl, serviceRole, "chamados", insertPayload);
    body = await safeJson(response);
  }

  if (!response.ok) {
    return res.status(response.status).json({
      error: body?.message || body?.error || "Falha ao abrir chamado."
    });
  }

  const created = Array.isArray(body) ? body[0] : body;
  return res.status(201).json({
    ok: true,
    numero: created?.numero ?? null
  });
}

async function updateChamado(req, res, supabaseUrl, serviceRole) {
  const payload = await parseBody(req);
  const id = clean(payload.id);
  if (!id) {
    return res.status(400).json({ error: "ID do chamado e obrigatorio." });
  }

  const updatePayload = {};
  if (payload.status !== undefined) {
    updatePayload.status = normalizeStatus(payload.status);
  }
  if (payload.atendido_por !== undefined) {
    updatePayload.atendido_por = clean(payload.atendido_por) || null;
  }
  if (payload.solucao !== undefined) {
    updatePayload.solucao = clean(payload.solucao) || null;
  }

  const baseUrl = `${supabaseUrl}/rest/v1/chamados`;
  const query = `?id=eq.${encodeURIComponent(id)}`;
  let response = await fetch(`${baseUrl}${query}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(updatePayload)
  });

  let body = await safeJson(response);

  if (!response.ok && body?.code === "22P02") {
    const fallbackQuery = `?id=eq.${Number(id) || 0}`;
    response = await fetch(`${baseUrl}${fallbackQuery}`, {
      method: "PATCH",
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(updatePayload)
    });
    body = await safeJson(response);
  }

  if (!response.ok) {
    return res.status(response.status).json({
      error: body?.message || body?.error || "Falha ao atualizar chamado."
    });
  }

  return res.status(200).json({ ok: true });
}

function restInsert(supabaseUrl, serviceRole, table, payload) {
  return fetch(`${supabaseUrl}/rest/v1/${table}`, {
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

function isUnknownColumn(errorBody) {
  const details = String(
    errorBody?.message || errorBody?.details || errorBody?.error || ""
  ).toLowerCase();
  return details.includes("column");
}

function requiresUserId(errorBody) {
  const details = String(
    errorBody?.message || errorBody?.details || errorBody?.error || ""
  ).toLowerCase();
  return details.includes("user_id") && (details.includes("null") || details.includes("required"));
}

function normalizeChamado(row) {
  const status = normalizeStatus(row.status || "aberto");
  const prioridade = normalizePriority(row.prioridade || "normal");
  return {
    ...row,
    solicitante_nome: row.solicitante_nome || row.nome || "Solicitante",
    solicitante_email: row.solicitante_email || row.email || "",
    status,
    prioridade
  };
}

function normalizeStatus(value) {
  const text = clean(value).toLowerCase();
  if (text === "andamento" || text === "em andamento") {
    return "andamento";
  }
  if (text === "finalizado" || text === "finalizada") {
    return "finalizado";
  }
  return "aberto";
}

function normalizePriority(value) {
  const text = clean(value).toLowerCase();
  if (text === "urgente") {
    return "urgente";
  }
  return "normal";
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

async function getFallbackUserId(supabaseUrl, serviceRole) {
  const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`
    }
  });

  if (!response.ok) {
    return null;
  }

  const data = await safeJson(response);
  return Array.isArray(data) && data[0]?.id ? data[0].id : null;
}
