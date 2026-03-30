const STATUS_LABELS = {
  aberto: "Aberto",
  andamento: "Em andamento",
  finalizado: "Finalizado"
};

const PRIORITY_LABELS = {
  normal: "Normal",
  urgente: "Urgente"
};

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? status;
}

export function priorityLabel(priority) {
  return PRIORITY_LABELS[priority] ?? priority;
}

export function statusChipClass(status) {
  if (status === "finalizado") {
    return "chip done";
  }
  if (status === "andamento") {
    return "chip progress";
  }
  return "chip open";
}

export function showMessage(element, text, type = "info") {
  if (!element) {
    return;
  }
  element.textContent = text;
  element.classList.remove("hidden", "info", "success", "error");
  element.classList.add(type);
}

export function clearMessage(element) {
  if (!element) {
    return;
  }
  element.textContent = "";
  element.classList.add("hidden");
  element.classList.remove("info", "success", "error");
}

export function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }
  const date = new Date(dateValue);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function friendlyRole(role) {
  if (role === "admin") {
    return "Administrador";
  }
  if (role === "tecnico") {
    return "Tecnico";
  }
  return "Solicitante";
}

export function isSupportRole(role) {
  return role === "admin" || role === "tecnico";
}

export function sanitizeText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}
