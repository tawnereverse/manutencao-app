const ALLOWED_ROLES = new Set(["solicitante", "tecnico", "admin"]);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo nao permitido." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return res.status(500).json({
      error:
        "Variaveis de ambiente ausentes. Configure SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY."
    });
  }

  try {
    const accessToken = readBearer(req.headers.authorization);
    if (!accessToken) {
      return res.status(401).json({ error: "Token de autenticacao ausente." });
    }

    const requester = await getRequesterUser(supabaseUrl, supabaseAnonKey, accessToken);
    if (!requester?.id) {
      return res.status(401).json({ error: "Token invalido." });
    }

    const requesterRole = await getRequesterRole(
      supabaseUrl,
      supabaseServiceRoleKey,
      requester.id
    );
    if (requesterRole !== "admin") {
      return res.status(403).json({ error: "Apenas administradores podem criar usuarios." });
    }

    const body = await parseBody(req);
    const fullName = clean(body.fullName);
    const email = clean(body.email).toLowerCase();
    const password = String(body.password ?? "");
    const role = clean(body.role);

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: "Parametros obrigatorios nao informados." });
    }

    if (!ALLOWED_ROLES.has(role)) {
      return res.status(400).json({ error: "Perfil invalido." });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "A senha deve ter no minimo 8 caracteres." });
    }

    const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      })
    });

    const createUserBody = await safeJson(createUserResponse);
    if (!createUserResponse.ok) {
      const message =
        createUserBody?.msg ||
        createUserBody?.error_description ||
        createUserBody?.error ||
        "Falha ao criar usuario no Supabase Auth.";
      return res.status(createUserResponse.status).json({ error: message });
    }

    const createdUserId = createUserBody?.id || createUserBody?.user?.id;
    if (!createdUserId) {
      return res.status(500).json({ error: "Usuario criado sem ID retornado." });
    }

    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify({
        id: createdUserId,
        full_name: fullName,
        role
      })
    });

    if (!profileResponse.ok) {
      const profileBody = await safeJson(profileResponse);
      const message = profileBody?.message || profileBody?.error || "Falha ao salvar profile.";
      return res.status(500).json({ error: message });
    }

    return res.status(201).json({ message: "Usuario criado com sucesso." });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro interno." });
  }
};

function readBearer(authorizationHeader = "") {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }
  return authorizationHeader.slice("Bearer ".length).trim() || null;
}

async function getRequesterUser(supabaseUrl, supabaseAnonKey, accessToken) {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok) {
    return null;
  }
  return safeJson(response);
}

async function getRequesterRole(supabaseUrl, serviceRoleKey, userId) {
  const profileUrl = `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(
    userId
  )}&select=role`;
  const response = await fetch(profileUrl, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    }
  });

  if (!response.ok) {
    return null;
  }

  const data = await safeJson(response);
  return data?.[0]?.role ?? null;
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
