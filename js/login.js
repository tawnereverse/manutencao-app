import { clearMessage, showMessage } from "./ui.js";

const form = document.getElementById("login-form");
const loginButton = document.getElementById("login-btn");
const feedback = document.getElementById("login-feedback");
const userInput = document.getElementById("user");
const passInput = document.getElementById("pass");

if (localStorage.getItem("logado") === "sim") {
  window.location.href = "./admin.html";
}

form.addEventListener("submit", onSubmit);

async function onSubmit(event) {
  event.preventDefault();
  clearMessage(feedback);

  const user = String(userInput.value || "").trim();
  const pass = String(passInput.value || "");

  if (!user || !pass) {
    showMessage(feedback, "Informe usuario e senha.", "error");
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Entrando...";

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, pass })
    });

    const body = await parseApiBody(response);
    if (!response.ok || !body?.ok) {
      throw new Error(body.error || body.raw || "Login invalido.");
    }

    localStorage.setItem("logado", "sim");
    localStorage.setItem("usuario", body.user || user);
    localStorage.setItem("role", body.role || "tecnico");
    localStorage.setItem("displayName", body.displayName || user);

    window.location.href = "./admin.html";
  } catch (error) {
    showMessage(feedback, error.message, "error");
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Entrar";
  }
}

async function parseApiBody(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 240) };
  }
}
