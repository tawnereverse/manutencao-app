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
const dashboard = document.getElementById("dashboard");

// ADMIN
const adminUserCard = document.getElementById("admin-user-card");
const createUserForm = document.getElementById("create-user-form");
const createUserFeedback = document.getElementById("create-user-feedback");
const createUserButton = document.getElementById("create-user-btn");

// INPUTS USER
const newUserNameInput = document.getElementById("new-user-name");
const newUserEmailInput = document.getElementById("new-user-email");
const newUserPasswordInput = document.getElementById("new-user-password");
const newUserRoleInput = document.getElementById("new-user-role");

// BUSCA
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-btn");
const clearButton = document.getElementById("clear-search-btn");

// FILTRO
const filterButtons = document.querySelectorAll(".btn-filter");

let allTickets = [];
let currentFilter = "aberto";

init();

async function init() {
  if (localStorage.getItem("logado") !== "sim") {
    window.location.href = "./login.html";
    return;
  }

  const displayName = localStorage.getItem("displayName") || "UsuÃ¡rio";
  const role = localStorage.getItem("role") || "tecnico";

  userNameElement.textContent = displayName;
  userRoleElement.textContent = `Perfil: ${friendlyRole(role)}`;

  if (role === "admin") {
    adminUserCard.classList.remove("hidden");
    createUserForm.addEventListener("submit", onCreateUser);
    createUserButton.addEventListener("click", onCreateUser);
  }

  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      renderTickets();
    });
  });

  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      renderTickets();
    });
  }

  if (searchButton) {
    searchButton.addEventListener("click", (e) => {
      e.preventDefault();
      renderTickets();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      searchInput.value = "";
      renderTickets();
    });
  }

  await loadTickets();
}

// ================== CHAMADOS ==================
async function loadTickets() {
  const { response, body } = await requestChamados("GET");

  if (!response || !response.ok) {
    showMessage(feedback, "Erro ao carregar chamados", "error");
    return;
  }

  allTickets = body.data || [];
  renderDashboard();
  renderTickets();
}

function renderTickets() {
  ticketsContainer.innerHTML = "";

  let filtered = [...allTickets];

  filtered = filtered.filter(t => t.status === currentFilter);

  const search = String(searchInput?.value || "").toLowerCase().trim();

  if (search) {
    filtered = filtered.filter(t =>
      `${t.numero} ${t.descricao} ${ticketRequesterName(t)} ${ticketRequesterEmail(t)} ${t.data_termino_servico || ""}`
        .toLowerCase()
        .includes(search)
    );
  }

  if (!filtered.length) {
    ticketsContainer.innerHTML = "<p>Nenhum chamado encontrado.</p>";
    return;
  }

  filtered.forEach(ticket => {
    ticketsContainer.appendChild(createTicketCard(ticket));
  });
}

function renderDashboard() {
  if (!dashboard) {
    return;
  }

  const totalAbertos = allTickets.filter(ticket => ticket.status === "aberto").length;
  const totalAndamento = allTickets.filter(ticket => ticket.status === "andamento").length;
  const totalFinalizados = allTickets.filter(ticket => ticket.status === "finalizado").length;
  const totalVencidos = allTickets.filter(isTicketOverdue).length;

  dashboard.innerHTML = `
    <div class="dash-card">
      <p class="dash-label">Abertos</p>
      <p class="dash-value">${totalAbertos}</p>
    </div>
    <div class="dash-card">
      <p class="dash-label">Em andamento</p>
      <p class="dash-value">${totalAndamento}</p>
    </div>
    <div class="dash-card">
      <p class="dash-label">Finalizados</p>
      <p class="dash-value">${totalFinalizados}</p>
    </div>
    <div class="dash-card ${totalVencidos ? "overdue" : ""}">
      <p class="dash-label">Prazos vencidos</p>
      <p class="dash-value">${totalVencidos}</p>
    </div>
  `;
}

function createTicketCard(ticket) {
  const card = document.createElement("div");
  const role = localStorage.getItem("role");
  const isAdmin = role === "admin";
  const isFinalizado = ticket.status === "finalizado";
  const isOverdue = isTicketOverdue(ticket);
  const requesterName = ticketRequesterName(ticket);
  const requesterEmail = ticketRequesterEmail(ticket);
  const dueDateText = formatDateOnly(ticket.data_termino_servico);

  card.className = isOverdue ? "ticket ticket-overdue" : "ticket";

  const statusText = ticket.atendido_por
    ? `${statusLabel(ticket.status)} por ${ticket.atendido_por}`
    : statusLabel(ticket.status);

  card.innerHTML = `
    <strong>#${escapeHtml(ticket.numero ?? "-")}</strong>
    ${isOverdue ? `<p class="deadline-alert"><b>Alerta:</b> prazo vencido em ${escapeHtml(dueDateText)}</p>` : ""}
    <p><b>Problema:</b> ${escapeHtml(ticket.descricao || "-")}</p>
    <p><b>Solicitante:</b> ${escapeHtml(requesterName)}</p>
    <p><b>Email:</b> ${escapeHtml(requesterEmail)}</p>
    <p><b>Status:</b> ${escapeHtml(statusText)}</p>
    <p><b>Prioridade:</b> <span class="${priorityBadgeClass(ticket.prioridade)}">${escapeHtml(priorityLabel(ticket.prioridade))}</span></p>
    <p><b>Abertura:</b> ${escapeHtml(formatDate(ticket.created_at))}</p>
    <p><b>Termino do servico:</b> ${escapeHtml(dueDateText)}</p>
    ${ticket.solucao ? `<p><b>Solucao:</b><br>${escapeHtml(ticket.solucao)}</p>` : ""}
  `;

  if (isFinalizado && !isAdmin) {
    addShareButtons(card, ticket);
    return card;
  }

  const statusSelect = document.createElement("select");
  statusSelect.innerHTML = `
    <option value="aberto">Aberto</option>
    <option value="andamento">Em andamento</option>
    <option value="finalizado">Finalizado</option>
  `;
  statusSelect.value = ticket.status;

  const priorityField = document.createElement("label");
  priorityField.className = "field priority-field";

  const priorityLabelElement = document.createElement("span");
  priorityLabelElement.textContent = "Prioridade";

  const prioritySelect = document.createElement("select");
  prioritySelect.innerHTML = `
    <option value="normal">Normal</option>
    <option value="urgente">Urgente</option>
  `;
  prioritySelect.value = ["normal", "urgente"].includes(ticket.prioridade)
    ? ticket.prioridade
    : "normal";

  priorityField.append(priorityLabelElement, prioritySelect);

  const deadlineField = document.createElement("label");
  deadlineField.className = "field deadline-field";

  const deadlineLabel = document.createElement("span");
  deadlineLabel.textContent = "Data de termino do servico";

  const deadlineInput = document.createElement("input");
  deadlineInput.type = "date";
  deadlineInput.value = normalizeDateInput(ticket.data_termino_servico);

  deadlineField.append(deadlineLabel, deadlineInput);

  const solutionBox = document.createElement("textarea");
  solutionBox.placeholder = "Descreva a solucao...";
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
      status: statusSelect.value,
      prioridade: prioritySelect.value,
      data_termino_servico: deadlineInput.value || null
    };

    const displayName = localStorage.getItem("displayName");

    if (["andamento", "finalizado"].includes(statusSelect.value)) {
      payload.atendido_por = displayName;
    }

    if (statusSelect.value === "finalizado") {
      const solucao = sanitizeText(solutionBox.value);
      if (!solucao) {
        alert("Informe a solucao.");
        return;
      }
      payload.solucao = solucao;
    }

    await updateTicket(ticket.id, payload);
  });

  card.append(statusSelect, priorityField, deadlineField, solutionBox, saveBtn);

  if (ticket.status === "finalizado") {
    addShareButtons(card, ticket);
  }

  return card;
}

function addShareButtons(card, ticket) {
  const shareBox = document.createElement("div");
  shareBox.style.marginTop = "10px";
  shareBox.className = "ticket-actions-row";

  const requesterEmail = ticketRequesterEmail(ticket);
  const dueDateText = formatDateOnly(ticket.data_termino_servico);

  const message = `
Chamado #${ticket.numero}
Problema: ${ticket.descricao}
Status: Finalizado por ${ticket.atendido_por}
Termino do servico: ${dueDateText}
Solucao: ${ticket.solucao || "-"}
`;

  const whatsappBtn = document.createElement("button");
  whatsappBtn.textContent = "WhatsApp";
  whatsappBtn.onclick = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const emailBtn = document.createElement("button");
  emailBtn.textContent = "Email";
  emailBtn.onclick = () => {
    const subject = `Chamado #${ticket.numero} finalizado`;
    window.location.href =
      `mailto:${requesterEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  };

  shareBox.appendChild(whatsappBtn);
  shareBox.appendChild(emailBtn);

  card.appendChild(shareBox);
}

function isTicketOverdue(ticket) {
  if (!ticket?.data_termino_servico || ticket.status === "finalizado") {
    return false;
  }

  const deadline = parseDateOnly(ticket.data_termino_servico);
  if (!deadline) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return deadline < today;
}

function parseDateOnly(value) {
  const dateText = normalizeDateInput(value);
  if (!dateText) {
    return null;
  }

  const [year, month, day] = dateText.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function normalizeDateInput(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) {
    return match[0];
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function formatDateOnly(value) {
  const date = parseDateOnly(value);
  if (!date) {
    return "-";
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function ticketRequesterName(ticket) {
  return ticket?.nome || ticket?.solicitante_nome || "Solicitante";
}

function ticketRequesterEmail(ticket) {
  return ticket?.email || ticket?.solicitante_email || "-";
}

function priorityBadgeClass(priority) {
  return priority === "urgente"
    ? "priority-badge priority-urgent"
    : "priority-badge priority-normal";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ================== UPDATE ==================
async function updateTicket(id, payload) {
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

// ================== CRIAR USUARIO ==================
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

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error || "Erro ao criar usuario.");
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

// ================== REQUEST ==================
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
  } catch {}

  return { response, body };
}

// ================== LOGOUT ==================
logoutButton.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "./login.html";
});

