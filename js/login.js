import { getMyProfile } from "./auth.js";
import { supabase } from "./supabaseClient.js";
import { clearMessage, showMessage } from "./ui.js";

const form = document.getElementById("login-form");
const loginButton = document.getElementById("login-btn");
const feedback = document.getElementById("login-feedback");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

init();
form.addEventListener("submit", onSubmit);

async function init() {
  try {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await redirectByRole(data.user.id);
    }
  } catch (error) {
    showMessage(feedback, `Erro ao validar sessao: ${error.message}`, "error");
  }
}

async function onSubmit(event) {
  event.preventDefault();
  clearMessage(feedback);

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage(feedback, "Preencha e-mail e senha.", "error");
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Entrando...";

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error("Nao foi possivel obter os dados do usuario.");
    }

    await redirectByRole(data.user.id);
  } catch (error) {
    showMessage(feedback, error.message, "error");
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Entrar";
  }
}

async function redirectByRole(userId) {
  const profile = await getMyProfile(userId);
  if (profile?.role === "admin" || profile?.role === "tecnico") {
    window.location.href = "./admin.html";
    return;
  }
  window.location.href = "./index.html";
}
