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
  const recordContent = `
    <div class="history-card-header">

      <div>
        <span class="history-date">
          ${escapeHtml(formatDate(record.fecha))}
        </span>

        <span class="history-time">
          · ${escapeHtml(formatTime(record.hora))}
        </span>
      </div>

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
    <article class="${cardClass}">
      ${recordContent}
    </article>
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

  const period = hours >= 12 ? "PM" : "AM";

  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes} ${period}`;
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
