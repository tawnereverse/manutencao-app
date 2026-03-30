import { getMyProfile, requireUser, signOutAndRedirect } from "./auth.js";
import { supabase } from "./supabaseClient.js";
import {
  clearMessage,
  friendlyRole,
  isSupportRole,
  sanitizeText,
  showMessage
} from "./ui.js";

const userNameElement = document.getElementById("user-name");
const userRoleElement = document.getElementById("user-role");
const goPanelButton = document.getElementById("go-panel");
const logoutButton = document.getElementById("logout-btn");
const ticketForm = document.getElementById("ticket-form");
const submitTicketButton = document.getElementById("submit-ticket-btn");
const feedback = document.getElementById("ticket-feedback");

const nomeInput = document.getElementById("nome");
const emailInput = document.getElementById("email");
const unidadeInput = document.getElementById("unidade");
const setorInput = document.getElementById("setor");
const descricaoInput = document.getElementById("descricao");
const prioridadeInput = document.getElementById("prioridade");

let currentUser = null;
let currentProfile = null;

logoutButton.addEventListener("click", () => signOutAndRedirect("./login.html"));
goPanelButton.addEventListener("click", () => {
  window.location.href = "./admin.html";
});
ticketForm.addEventListener("submit", onSubmitTicket);

init();

async function init() {
  try {
    currentUser = await requireUser("./login.html");
    if (!currentUser) {
      return;
    }

    currentProfile = await getMyProfile(currentUser.id);
    const displayName =
      currentProfile?.full_name ||
      currentUser.user_metadata?.full_name ||
      currentUser.email;
    const role = currentProfile?.role ?? "solicitante";

    userNameElement.textContent = displayName;
    userRoleElement.textContent = `Perfil: ${friendlyRole(role)}`;

    if (isSupportRole(role)) {
      goPanelButton.classList.remove("hidden");
    }
    nomeInput.value = currentProfile?.full_name || currentUser.user_metadata?.full_name || "";
    emailInput.value = currentUser.email || "";
  } catch (error) {
    showMessage(feedback, `Erro ao carregar tela: ${error.message}`, "error");
  }
}

async function onSubmitTicket(event) {
  event.preventDefault();
  clearMessage(feedback);

  const nome = sanitizeText(nomeInput.value);
  const email = String(emailInput.value ?? "").trim().toLowerCase();
  const unidade = unidadeInput.value;
  const setor = sanitizeText(setorInput.value);
  const descricao = sanitizeText(descricaoInput.value);
  const prioridade = prioridadeInput.value;

  if (!nome || !email || !unidade || !setor || !descricao || !prioridade) {
    showMessage(feedback, "Preencha todos os campos obrigatorios.", "error");
    return;
  }

  submitTicketButton.disabled = true;
  submitTicketButton.textContent = "Enviando...";

  try {
    const payload = {
      user_id: currentUser.id,
      solicitante_nome: nome,
      solicitante_email: email,
      unidade,
      setor,
      descricao,
      prioridade,
      status: "aberto"
    };

    const { data, error } = await supabase
      .from("chamados")
      .insert([payload])
      .select("numero")
      .single();

    if (error) {
      throw error;
    }

    showMessage(
      feedback,
      `Chamado #${data.numero} aberto com sucesso. Guarde esse numero para acompanhamento.`,
      "success"
    );
    ticketForm.reset();
    nomeInput.value = currentProfile?.full_name || currentUser.user_metadata?.full_name || "";
    emailInput.value = currentUser.email || "";
  } catch (error) {
    showMessage(feedback, `Falha ao abrir chamado: ${error.message}`, "error");
  } finally {
    submitTicketButton.disabled = false;
    submitTicketButton.textContent = "Enviar chamado";
  }
}
