import {
  clearMessage,
  formatDate,
  friendlyRole,
  priorityLabel,
  sanitizeText,
  showMessage,
  statusLabel
} from "./ui.js";

const userNameElement = document.getElementById("user-name");
const userRoleElement = document.getElementById("user-role");
const logoutButton = document.getElementById("logout-btn");
const ticketsContainer = document.getElementById("admin-tickets");
const feedback = document.getElementById("admin-feedback");

init();

async function init() {
  if (localStorage.getItem("logado") !== "sim") {
    window.location.href = "./login.html";
    return;
  }

  const displayName = localStorage.getItem("displayName") || "Usuário";
  const role = localStorage.getItem("role") || "tecnico";

  userNameElement.textContent = displayName;
  userRoleElement.textContent = `Perfil: ${friendlyRole(role)}`;

  await loadTickets();
}

async function loadTickets() {
  clearMessage(feedback);

  const { response, body } = await requestChamados("GET");

  if (!response || !response.ok) {
    showMessage(feedback, "Erro ao carregar chamados", "error");
    return;
  }

  renderTickets(body.data || []);
}

function renderTickets(tickets) {
  ticketsContainer.innerHTML = "";

  tickets.forEach(ticket => {
    ticketsContainer.appendChild(createTicketCard(ticket));
  });
}

function createTicketCard(ticket) {
  const card = document.createElement("div");
  card.className = "ticket";

  const role = localStorage.getItem("role");
  const isAdmin = role === "admin";
  const isFinalizado = ticket.status === "finalizado";

  const statusText = ticket.atendido_por
    ? `${statusLabel(ticket.status)} por ${ticket.atendido_por}`
    : statusLabel(ticket.status);

  card.innerHTML = `
    <strong>#${ticket.numero}</strong>
    <p>${ticket.descricao}</p>
    <p><b>Solicitante:</b> ${ticket.nome}</p>
    <p><b>Status:</b> ${statusText}</p>
    <p><b>Prioridade:</b> ${priorityLabel(ticket.prioridade)}</p>
    <p><b>Abertura:</b> ${formatDate(ticket.created_at)}</p>

    ${ticket.solucao ? `<p style="margin-top:10px;"><b>Solução:</b><br>${ticket.solucao}</p>` : ""}
  `;

  // 🔒 BLOQUEIO: técnico não edita finalizado
  if (isFinalizado && !isAdmin) {
    return card;
  }

  const statusSelect = document.createElement("select");
  statusSelect.innerHTML = `
    <option value="aberto">Aberto</option>
    <option value="andamento">Em andamento</option>
    <option value="finalizado">Finalizado</option>
  `;
  statusSelect.value = ticket.status;

  const solutionBox = document.createElement("textarea");
  solutionBox.placeholder = "Descreva a solução...";
  solutionBox.value = ticket.solucao || "";
  solutionBox.style.display =
    ticket.status === "finalizado" ? "block" : "none";

  statusSelect.addEventListener("change", () => {
    solutionBox.style.display =
      statusSelect.value === "finalizado" ? "block" : "none";
  });

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Salvar";

  saveBtn.addEventListener("click", async () => {
    const payload = {
      status: statusSelect.value
    };

    const displayName = localStorage.getItem("displayName");

    if (
      statusSelect.value === "andamento" ||
      statusSelect.value === "finalizado"
    ) {
      payload.atendido_por = displayName;
    }

    if (statusSelect.value === "finalizado") {
      const solucao = sanitizeText(solutionBox.value);

      if (!solucao) {
        alert("Informe a solução.");
        return;
      }

      payload.solucao = solucao;
    }

    await updateTicket(ticket.id, payload);
  });

  card.append(statusSelect, solutionBox, saveBtn);

  return card;
}

async function updateTicket(id, payload) {
  clearMessage(feedback);

  const { response, body } = await requestChamados("PATCH", {
    id,
    ...payload
  });

  if (!response || !response.ok) {
    showMessage(feedback, body.error || "Erro ao atualizar", "error");
    return;
  }

  showMessage(feedback, "Atualizado com sucesso", "success");
  await loadTickets();
}

async function requestChamados(method, payload) {
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
}

function onLogout() {
  localStorage.clear();
  window.location.href = "./login.html";
}

logoutButton.addEventListener("click", onLogout);
