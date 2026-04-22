import {
  clearMessage,
  formatDate,
  friendlyRole,
  priorityLabel,
  sanitizeText,
  showMessage,
  statusChipClass,
  statusLabel
} from "./ui.js";

const userNameElement = document.getElementById("user-name");
const userRoleElement = document.getElementById("user-role");
const logoutButton = document.getElementById("logout-btn");
const dashboardElement = document.getElementById("dashboard");
const ticketsContainer = document.getElementById("admin-tickets");
const feedback = document.getElementById("admin-feedback");

const filterButtons = document.querySelectorAll(".btn-filter");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const clearSearchButton = document.getElementById("clear-search-btn");

const adminUserCard = document.getElementById("admin-user-card");
const createUserForm = document.getElementById("create-user-form");
const createUserFeedback = document.getElementById("create-user-feedback");
const createUserButton = document.getElementById("create-user-btn");

const state = {
  tickets: [],
  filter: "todos",
  search: ""
};

logoutButton.addEventListener("click", onLogout);
searchForm.addEventListener("submit", onSearch);
clearSearchButton.addEventListener("click", onClearSearch);

for (const button of filterButtons) {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
}

init();

async function init() {
  if (localStorage.getItem("logado") !== "sim") {
    window.location.href = "./login.html";
    return;
  }

  const user = localStorage.getItem("usuario") || "usuario";
  const displayName = localStorage.getItem("displayName") || user;
  const role = localStorage.getItem("role") || "tecnico";

  userNameElement.textContent = displayName;
  userRoleElement.textContent = `Perfil: ${friendlyRole(role)}`;

  if (role === "admin") {
    adminUserCard.classList.remove("hidden");
    createUserForm.addEventListener("submit", onCreateUser);
  }

  await loadTickets();
}

async function loadTickets() {
  clearMessage(feedback);
  ticketsContainer.innerHTML = "";

  const { response, body } = await requestChamados("GET");

  if (!response || !response.ok) {
    showMessage(feedback, body.error || "Erro ao carregar chamados.", "error");
    return;
  }

  state.tickets = body?.data || [];
  renderDashboard();
  renderTickets();
}

function renderDashboard() {
  const total = state.tickets.length;
  const aberto = state.tickets.filter(t => t.status === "aberto").length;
  const andamento = state.tickets.filter(t => t.status === "andamento").length;
  const finalizado = state.tickets.filter(t => t.status === "finalizado").length;

  dashboardElement.innerHTML = `
    <div class="dash-card"><p>Total</p><strong>${total}</strong></div>
    <div class="dash-card"><p>Abertos</p><strong>${aberto}</strong></div>
    <div class="dash-card"><p>Andamento</p><strong>${andamento}</strong></div>
    <div class="dash-card"><p>Finalizados</p><strong>${finalizado}</strong></div>
  `;
}

function renderTickets() {
  ticketsContainer.innerHTML = "";

  const list = getFilteredTickets();

  if (!list.length) {
    ticketsContainer.innerHTML = "<p>Nenhum chamado encontrado.</p>";
    return;
  }

  for (const ticket of list) {
    ticketsContainer.appendChild(createTicketCard(ticket));
  }
}

function getFilteredTickets() {
  let output = [...state.tickets];

  if (state.filter !== "todos") {
    output = output.filter(t => t.status === state.filter);
  }

  if (state.search) {
    output = output.filter(t =>
      `${t.numero} ${t.descricao} ${t.nome}`.toLowerCase().includes(state.search)
    );
  }

  return output;
}

function createTicketCard(ticket) {
  const card = document.createElement("div");
  card.className = "ticket";

  const displayStatus =
    ticket.atendido_por
      ? `${statusLabel(ticket.status)} por ${ticket.atendido_por}`
      : statusLabel(ticket.status);

  card.innerHTML = `
    <strong>#${ticket.numero || ticket.id}</strong>
    <p>${ticket.descricao}</p>
    <p><b>Solicitante:</b> ${ticket.nome}</p>
    <p><b>Status:</b> ${displayStatus}</p>
    <p><b>Prioridade:</b> ${priorityLabel(ticket.prioridade)}</p>
    <p><b>Abertura:</b> ${formatDate(ticket.created_at)}</p>
  `;

  const statusSelect = document.createElement("select");
  statusSelect.innerHTML = `
    <option value="aberto">Aberto</option>
    <option value="andamento">Em andamento</option>
    <option value="finalizado">Finalizado</option>
  `;
  statusSelect.value = ticket.status;

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Salvar";

  const solutionBox = document.createElement("textarea");
  solutionBox.placeholder = "Descreva a solução...";
  solutionBox.style.display = ticket.status === "finalizado" ? "block" : "none";

  statusSelect.addEventListener("change", () => {
    solutionBox.style.display =
      statusSelect.value === "finalizado" ? "block" : "none";
  });

  saveBtn.addEventListener("click", async () => {
    const payload = {
      status: statusSelect.value
    };

    if (statusSelect.value === "finalizado") {
      payload.solucao = sanitizeText(solutionBox.value);
      if (!payload.solucao) {
        alert("Informe a solução.");
        return;
      }
    }

    await updateTicket(ticket.id, payload);
  });

  card.append(statusSelect, solutionBox, saveBtn);

  return card;
}

// 🔥 AQUI ESTÁ A MÁGICA
async function updateTicket(id, payload) {
  clearMessage(feedback);

  const displayName = localStorage.getItem("displayName") || "Tecnico";

  if (payload.status === "andamento" || payload.status === "finalizado") {
    payload.atendido_por = displayName;
  }

  const { response, body } = await requestChamados("PATCH", {
    id,
    ...payload
  });

  if (!response || !response.ok) {
    showMessage(feedback, body.error || "Erro ao atualizar.", "error");
    return;
  }

  showMessage(feedback, "Atualizado com sucesso.", "success");
  await loadTickets();
}

function setFilter(filter) {
  state.filter = filter;
  renderTickets();
}

function onSearch(e) {
  e.preventDefault();
  state.search = searchInput.value.toLowerCase();
  renderTickets();
}

function onClearSearch() {
  searchInput.value = "";
  state.search = "";
  renderTickets();
}

function onLogout() {
  localStorage.clear();
  window.location.href = "./login.html";
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
