import { clearMessage, sanitizeText, showMessage } from "./ui.js";

const ticketForm = document.getElementById("ticket-form");
const submitTicketButton = document.getElementById("submit-ticket-btn");
const feedback = document.getElementById("ticket-feedback");

const nomeInput = document.getElementById("nome");
const emailInput = document.getElementById("email");
const unidadeInput = document.getElementById("unidade");
const setorInput = document.getElementById("setor");
const descricaoInput = document.getElementById("descricao");
const prioridadeInput = document.getElementById("prioridade");

ticketForm.addEventListener("submit", onSubmitTicket);

async function onSubmitTicket(event) {
  event.preventDefault();
  clearMessage(feedback);

  const payload = {
    nome: sanitizeText(nomeInput.value),
    email: String(emailInput.value || "").trim().toLowerCase(),
    unidade: unidadeInput.value,
    setor: sanitizeText(setorInput.value),
    descricao: sanitizeText(descricaoInput.value),
    prioridade: prioridadeInput.value
  };

  if (
    !payload.nome ||
    !payload.email ||
    !payload.unidade ||
    !payload.setor ||
    !payload.descricao ||
    !payload.prioridade
  ) {
    showMessage(feedback, "Preencha todos os campos obrigatorios.", "error");
    return;
  }

  submitTicketButton.disabled = true;
  submitTicketButton.textContent = "Enviando...";

  try {
    const response = await fetch("/api/chamados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const body = await safeJson(response);
    if (!response.ok) {
      throw new Error(body?.error || "Falha ao abrir chamado.");
    }

    showMessage(
      feedback,
      `Chamado #${body?.numero ?? "-"} aberto com sucesso. Guarde esse numero.`,
      "success"
    );
    ticketForm.reset();
  } catch (error) {
    showMessage(feedback, error.message, "error");
  } finally {
    submitTicketButton.disabled = false;
    submitTicketButton.textContent = "Enviar chamado";
  }
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
