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

// 🔥 ADMIN
const adminUserCard = document.getElementById("admin-user-card");
const createUserForm = document.getElementById("create-user-form");
const createUserFeedback = document.getElementById("create-user-feedback");
const createUserButton = document.getElementById("create-user-btn");

// 🔥 IDs CORRETOS (DO SEU HTML ORIGINAL)
const newUserNameInput = document.getElementById("new-user-name");
const newUserEmailInput = document.getElementById("new-user-email");
const newUserPasswordInput = document.getElementById("new-user-password");
const newUserRoleInput = document.getElementById("new-user-role");

const filterButtons = document.querySelectorAll(".btn-filter");
const searchInput = document.getElementById("search-input");

let allTickets = [];
let currentFilter = "todos";

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

  // 🔥 ADMIN
  if (role === "admin") {
    adminUserCard.classList.remove("hidden");
    createUserForm.addEventListener("submit", onCreateUser);
  }

  // 🔥 FILTROS
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      renderTickets();
    });
  });

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
  renderTickets();
}

function renderTickets() {
  ticketsContainer.innerHTML = "";

  let filtered = [...allTickets];

  if (currentFilter !== "todos") {
    filtered = filtered.filter(t => t.status === currentFilter);
  }

  const search = (searchInput?.value || "").toLowerCase();
  if (search) {
    filtered = filtered.filter(t =>
      `${t.numero} ${t.descricao} ${t.nome}`
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

    ${ticket.solucao ? `<p><b>Solução:</b><br>${ticket.solucao}</p>` : ""}
  `;

  // 🔒 BLOQUEIO
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

// ================== UPDATE ==================
async function updateTicket(id, payload) {
  const { response } = await requestChamados("PATCH", {
    id,
    ...payload
  });

  if (!response || !response.ok) {
    showMessage(feedback, "Erro ao atualizar", "error");
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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fullName,
        login,
        password,
        role
      })
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
