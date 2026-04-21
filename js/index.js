async function requestChamados(method, payload) {
  try {
    const response = await fetch("/api/chamados", {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined
    });

    const text = await response.text();

    let body = {};
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }

    return { response, body };

  } catch (error) {
    return {
      response: null,
      body: { error: error.message }
    };
  }
}