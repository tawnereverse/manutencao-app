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
const newUserNameInput = document.getElementById("new-user-name");
const newUserEmailInput = document.getElementById("new-user-email");
const newUserPasswordInput = document.getElementById("new-user-password");
const newUserRoleInput = document.getElementById("new-user-role");

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
  const storedRole = localStorage.getItem("role");
  const role = storedRole || (user === "admin" ? "admin" : "tecnico");

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
    showMessage(feedback, body.error || body.raw || "Falha ao consultar chamados.", "error");
    return;
  }

  state.tickets = body?.data || [];
  renderDashboard();
  renderTickets();
}

function renderDashboard() {
  const total = state.tickets.length;
  const aberto = state.tickets.filter((item) => item.status === "aberto").length;
  const andamento = state.tickets.filter((item) => item.status === "andamento").length;
  const finalizado = state.tickets.filter((item) => item.status === "finalizado").length;

  dashboardElement.innerHTML = "";
  dashboardElement.append(
    createDashboardCard("Total", total),
    createDashboardCard("Abertos", aberto),
    createDashboardCard("Em andamento", andamento),
    createDashboardCard("Finalizados", finalizado)
  );
}

function createDashboardCard(label, value) {
  const card = document.createElement("div");
  card.className = "dash-card";

  const title = document.createElement("p");
  title.className = "dash-label";
  title.textContent = label;

  const amount = document.createElement("p");
  amount.className = "dash-value";
  amount.textContent = String(value);

  card.append(title, amount);
  return card;
}

function renderTickets() {
  ticketsContainer.innerHTML = "";

  const filteredTickets = getFilteredTickets();
  if (!filteredTickets.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Nenhum chamado encontrado para os filtros aplicados.";
    ticketsContainer.appendChild(empty);
    return;
  }

  for (const ticket of filteredTickets) {
    ticketsContainer.appendChild(createTicketCard(ticket));
  }
}

function getFilteredTickets() {
  let output = [...state.tickets];

  if (state.filter !== "todos") {
    output = output.filter((ticket) => ticket.status === state.filter);
  }

  if (state.search) {
    output = output.filter((ticket) => {
      const searchable = `${ticket.numero} ${ticket.descricao} ${ticket.solicitante_nome || ""} ${ticket.solicitante_email || ""}`
        .toLowerCase()
        .trim();
      return searchable.includes(state.search);
    });
  }

  return output;
}

function createTicketCard(ticket) {
  const card = document.createElement("article");
  card.className = "ticket";

  const head = document.createElement("div");
  head.className = "ticket-head";

  const number = document.createElement("p");
  number.className = "ticket-number";
  number.textContent = `#${ticket.numero ?? ticket.id ?? "-"}`;

  const status = document.createElement("span");
  status.className = statusChipClass(ticket.status || "aberto");
  status.textContent = statusLabel(ticket.status || "aberto");

  head.append(number, status);

  const description = document.createElement("p");
  description.className = "ticket-description";
  description.textContent = ticket.descricao || "-";

  const meta = document.createElement("div");
  meta.className = "ticket-meta";
  meta.append(
    metaItem(`Solicitante: ${ticket.solicitante_nome || ticket.nome || "-"}`),
    metaItem(`Email: ${ticket.solicitante_email || "-"}`),
    metaItem(`Unidade: ${ticket.unidade || "-"}`),
    metaItem(`Setor: ${ticket.setor || "-"}`),
    metaItem(`Prioridade: ${priorityLabel(ticket.prioridade || "normal")}`),
    metaItem(`Abertura: ${formatDate(ticket.created_at)}`)
  );

  const actions = document.createElement("div");
  actions.className = "ticket-actions";

  const row = document.createElement("div");
  row.className = "ticket-actions-row";

  const statusSelect = document.createElement("select");
  statusSelect.append(
    createOption("aberto", "Aberto"),
    createOption("andamento", "Em andamento"),
    createOption("finalizado", "Finalizado")
  );
  statusSelect.value = ticket.status || "aberto";

  const saveStatusButton = document.createElement("button");
  saveStatusButton.type = "button";
  saveStatusButton.className = "btn-secondary";
  saveStatusButton.textContent = "Salvar status";

  row.append(statusSelect, saveStatusButton);
  actions.appendChild(row);

  const finalizeBox = document.createElement("div");
  finalizeBox.className = "finalize-box hidden";

  const attendedField = document.createElement("label");
  attendedField.className = "field";
  const attendedLabel = document.createElement("span");
  attendedLabel.textContent = "Atendido por";
  const attendedInput = document.createElement("input");
  attendedInput.maxLength = 80;
  attendedInput.placeholder = "Nome do responsavel";
  attendedInput.value = ticket.atendido_por ?? "";
  attendedField.append(attendedLabel, attendedInput);

  const solutionField = document.createElement("label");
  solutionField.className = "field";
  const solutionLabel = document.createElement("span");
  solutionLabel.textContent = "Solucao";
  const solutionInput = document.createElement("textarea");
  solutionInput.maxLength = 1000;
  solutionInput.placeholder = "Descreva a solucao aplicada";
  solutionInput.value = ticket.solucao ?? "";
  solutionField.append(solutionLabel, solutionInput);

  const finalizeButton = document.createElement("button");
  finalizeButton.type = "button";
  finalizeButton.textContent = "Concluir chamado";

  finalizeBox.append(attendedField, solutionField, finalizeButton);
  actions.appendChild(finalizeBox);

  if (statusSelect.value === "finalizado") {
    finalizeBox.classList.remove("hidden");
    actions.appendChild(createNotifyBox(ticket));
  }

  saveStatusButton.addEventListener("click", async () => {
    const nextStatus = statusSelect.value;
    if (nextStatus === "finalizado") {
      finalizeBox.classList.remove("hidden");
      return;
    }

    await updateTicket(ticket.id, {
      status: nextStatus,
      atendido_por: null,
      solucao: null
    });
  });

  finalizeButton.addEventListener("click", async () => {
    const attendedBy = sanitizeText(attendedInput.value);
    const solution = sanitizeText(solutionInput.value);
    if (!attendedBy || !solution) {
      showMessage(feedback, "Para finalizar, preencha responsavel e solucao.", "error");
      return;
    }

    await updateTicket(ticket.id, {
      status: "finalizado",
      atendido_por: attendedBy,
      solucao: solution
    });
  });

  card.append(head, description, meta, actions);
  return card;
}

function createNotifyBox(ticket) {
  const notifyBox = document.createElement("div");
  notifyBox.className = "notify-box";

  const title = document.createElement("p");
  title.className = "muted";
  title.textContent = "Notificar solicitante";

  const row = document.createElement("div");
  row.className = "ticket-actions-row";

  const emailLink = document.createElement("a");
  emailLink.className = "as-button btn-secondary";
  emailLink.target = "_blank";
  emailLink.rel = "noopener noreferrer";
  emailLink.textContent = "Abrir email";
  emailLink.href = buildMailto(ticket);

  const whatsappLink = document.createElement("a");
  whatsappLink.className = "as-button btn-secondary";
  whatsappLink.target = "_blank";
  whatsappLink.rel = "noopener noreferrer";
  whatsappLink.textContent = "Compartilhar no WhatsApp";
  whatsappLink.href = buildWhatsAppShare(ticket);

  const downloadButton = document.createElement("button");
  downloadButton.type = "button";
  downloadButton.className = "btn-secondary";
  downloadButton.textContent = "Baixar resumo (.txt)";
  downloadButton.addEventListener("click", () => downloadTicketSummary(ticket));

  row.append(emailLink, whatsappLink, downloadButton);
  notifyBox.append(title, row);
  return notifyBox;
}

function buildMailto(ticket) {
  const subject = `Chamado #${ticket.numero} finalizado`;
  const lines = buildTicketSummaryLines(ticket);
  const body = lines.join("\n");
  const email = String(ticket.solicitante_email || "").trim();
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

function buildWhatsAppShare(ticket) {
  const text = buildTicketSummaryLines(ticket).join("\n");
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function buildTicketSummaryLines(ticket) {
  return [
    `Ola ${ticket.solicitante_nome || ticket.nome || ""},`,
    "",
    `Seu chamado #${ticket.numero || "-"} foi finalizado.`,
    `Email do solicitante: ${ticket.solicitante_email || "-"}`,
    `Descricao: ${ticket.descricao || "-"}`,
    `Solucao: ${ticket.solucao || "-"}`,
    `Atendido por: ${ticket.atendido_por || "-"}`,
    "",
    "Atenciosamente,"
  ];
}

function downloadTicketSummary(ticket) {
  const content = buildTicketSummaryLines(ticket).join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const fileName = `chamado-${ticket.numero || "sem-numero"}.txt`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function updateTicket(id, payload) {
  clearMessage(feedback);
  const { response, body } = await requestChamados("PATCH", { id, ...payload });

  if (!response || !response.ok) {
    showMessage(feedback, body.error || body.raw || "Falha ao atualizar chamado.", "error");
    return;
  }

  showMessage(feedback, "Chamado atualizado com sucesso.", "success");
  await loadTickets();
}

function metaItem(text) {
  const element = document.createElement("span");
  element.textContent = text;
  return element;
}

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function setFilter(filter) {
  state.filter = filter;
  for (const button of filterButtons) {
    button.classList.toggle("active", button.dataset.filter === filter);
  }
  renderTickets();
}

function onSearch(event) {
  event.preventDefault();
  state.search = sanitizeText(searchInput.value).toLowerCase();
  renderTickets();
}

function onClearSearch() {
  searchInput.value = "";
  state.search = "";
  renderTickets();
}

async function onCreateUser(event) {
  event.preventDefault();
  clearMessage(createUserFeedback);

  const fullName = sanitizeText(newUserNameInput.value);
  const login = sanitizeText(newUserEmailInput.value).toLowerCase();
  const password = newUserPasswordInput.value;
  const role = newUserRoleInput.value;

  if (!fullName || !login || !password || !role) {
    showMessage(createUserFeedback, "Preencha todos os campos.", "error");
    return;
  }

  createUserButton.disabled = true;
  createUserButton.textContent = "Criando...";

  try {
    const response = await fetch("/api/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, login, password, role })
    });

    const body = await parseApiBody(response);
    if (!response.ok) {
      throw new Error(body.error || body.raw || "Erro ao criar usuario.");
    }

    showMessage(createUserFeedback, "Usuario criado com sucesso.", "success");
    createUserForm.reset();
  } catch (error) {
    showMessage(createUserFeedback, error.message, "error");
  } finally {
    createUserButton.disabled = false;
    createUserButton.textContent = "Criar usuario";
  }
}

function onLogout() {
  localStorage.removeItem("logado");
  localStorage.removeItem("usuario");
  localStorage.removeItem("role");
  localStorage.removeItem("displayName");
  window.location.href = "./login.html";
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

async function requestChamados(method, payload) {
  const endpoints = [
    "/api/chamados",
    "/api/chamados.js",
    "/api/tickets",
    "/api/tickets.js"
  ];
  let lastBody = { error: "Nenhum endpoint respondeu." };
  let lastResponse = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined
      });
      const body = await parseApiBody(response);
      if (response.ok || response.status !== 404) {
        return { response, body };
      }
      lastBody = body;
      lastResponse = response;
    } catch (error) {
      lastBody = { error: error.message || "Falha de rede." };
      lastResponse = null;
    }
  }

  return { response: lastResponse, body: lastBody };
}
