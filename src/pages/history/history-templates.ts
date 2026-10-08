import type { BloodPressureRecord } from "../../types/blood-pressure";

/* =========================
   LOADING
   ========================= */

export function historyLoadingTemplate(): string {
  return `
    <div class="history-loading">
      Cargando mediciones...
    </div>
  `;
}

/* =========================
   ERROR
   ========================= */

export function historyErrorTemplate(): string {
  return `
    <div class="history-empty history-error">

      <div class="history-empty-icon" aria-hidden="true">
        !
      </div>

      <h3>
        No se pudieron cargar las mediciones
      </h3>

      <p>
        Ocurrió un problema al consultar tu historial.
      </p>

      <button
        type="button"
        id="retryHistoryButton"
        class="primary-button"
      >
        Intentar de nuevo
      </button>

    </div>
  `;
}

/* =========================
   EMPTY
   ========================= */

export function historyEmptyTemplate(): string {
  return `
    <div class="history-empty">

      <div
        class="history-empty-icon"
        aria-hidden="true"
      >
        +
      </div>

      <h3>
        No hay mediciones
      </h3>

      <p>
        No tienes mediciones registradas
        para este periodo.
      </p>

      <button
        type="button"
        id="goToRegisterButton"
        class="primary-button"
      >
        Registrar medición
      </button>

    </div>
  `;
}

/* =========================
   RECORD
   ========================= */

export function historyRecordTemplate(
  record: BloodPressureRecord,
  isLatest = false,
): string {
  const cardClass = `history-card ${isLatest ? "history-card-latest" : ""}`;
  const deleteButton = renderDeleteButton(record);
  const recordContent = `
    <div class="history-card-header">

      <div class="history-card-date-time">
        <span class="history-date">
          ${escapeHtml(formatDate(record.fecha))}
        </span>
      </div>

      <span class="history-time">
        ${renderTimeIcon(record.hora)}
        ${escapeHtml(formatTime(record.hora))}
      </span>
      <div class="history-arm ${getArmClass(record.brazo)}">
        ${escapeHtml(record.brazo)}
      </div>

    </div>


    <div class="history-measurement">

      <div class="history-pressure">

        <span class="history-pressure-value">
          ${record.sistolica} / ${record.diastolica}
        </span>

        <span class="history-pressure-unit">
          mmHg
        </span>

      </div>


      <div class="history-pulse">

        <span class="history-pulse-value">
          ${record.pulso}
        </span>

        <span class="history-pulse-unit">
          lpm
        </span>

      </div>

      ${deleteButton}

    </div>
  `;

  const optionalDetails = renderOptionalDetails(record);

  if (optionalDetails) {
    return `
      <details class="${cardClass}">

        <summary class="history-card-summary">
          ${recordContent}
        </summary>

        ${optionalDetails}

      </details>
    `;
  }

  return `
    <article class="${cardClass} history-card-no-details">
      ${recordContent}
    </article>
  `;
}

function renderDeleteButton(record: BloodPressureRecord): string {
  if (record.id === undefined) {
    return "";
  }

  return `
    <button
      type="button"
      class="history-delete-button"
      data-record-id="${record.id}"
      aria-label="Eliminar medición"
      title="Eliminar medición"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
      </svg>
    </button>
  `;
}

function getArmClass(arm: string): string {
  return arm.trim().toLowerCase() === "derecho"
    ? "history-arm-right"
    : "history-arm-left";
}

/* =========================
   OPTIONAL DETAILS
   ========================= */

function renderOptionalDetails(record: BloodPressureRecord): string {
  const notes: string[] = [];

  if (record.sintomas) {
    notes.push(`
      <div class="history-note">
        <span>Síntomas</span>
        <p>
          ${escapeHtml(record.sintomas)}
        </p>
      </div>
    `);
  }

  if (record.observaciones) {
    notes.push(`
      <div class="history-note">
        <span>Observaciones</span>
        <p>
          ${escapeHtml(record.observaciones)}
        </p>
      </div>
    `);
  }

  if (notes.length === 0) {
    return "";
  }

  return `
    <div class="history-notes">
      ${notes.join("")}
    </div>
  `;
}

/* =========================
   DATE
   ========================= */

function formatDate(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const today = new Date();

  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const dateStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  const differenceInDays = Math.round(
    (todayStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (differenceInDays === 0) {
    return "Hoy";
  }

  if (differenceInDays === 1) {
    return "Ayer";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
  }).format(date);
}

/* =========================
   TIME
   ========================= */

function formatTime(time: string): string {
  const [hoursString, minutes] = time.split(":");

  const hours = Number(hoursString);

  if (!Number.isFinite(hours) || !minutes) {
    return time;
  }

  const period = hours >= 12 ? "pm" : "am";

  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes} ${period}`;
}

function renderTimeIcon(time: string): string {
  const hours = Number(time.split(":")[0]);

  if (!Number.isInteger(hours) || hours < 0 || hours > 23) {
    return "";
  }

  const isDaytime = hours >= 6 && hours < 18;
  const icon = isDaytime
    ? '<path d="M3 17h18M5 17a7 7 0 0 1 14 0M12 2v3m-7.07.93 2.12 2.12m12.02-2.12-2.12 2.12"/>'
    : '<path d="M19 15.5A8.5 8.5 0 0 1 8.5 4.5M19 15.5A8.5 8.5 0 1 1 8.5 4.5"/>';
  const iconClass = isDaytime ? "history-time-icon-day" : "history-time-icon-night";

  return `
    <svg class="history-time-icon ${iconClass}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      ${icon}
    </svg>
  `;
}

/* =========================
   HTML ESCAPE
   ========================= */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
