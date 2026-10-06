import type { BloodPressureRecord } from '../types/blood-pressure';
import { getBloodPressureRecords } from '../services/api';

export function renderHistoryPage(): string {
  return `
    <section
      id="page-history"
      class="page"
      hidden
    >

      <div class="page-header">

        <h2>Historial</h2>

        <p>
          Consulta tus mediciones anteriores.
        </p>

      </div>

      <div
        id="historyContent"
        class="history-content"
      >
        <div class="history-loading">
          Cargando mediciones...
        </div>
      </div>

    </section>
  `;
}

export function initializeHistoryPage(): void {
  loadHistory();

  console.log(
    'HISTORY: initialized'
  );
}

async function loadHistory(): Promise<void> {
  const container =
    document.getElementById(
      'historyContent'
    );

  if (!container) {
    console.error(
      'HISTORY: #historyContent not found'
    );

    return;
  }

  try {

    container.innerHTML = `
      <div class="history-loading">
        Cargando mediciones...
      </div>
    `;

    const records =
      await getBloodPressureRecords();

    renderHistory(
      records
    );

  } catch (error) {

    console.error(
      'HISTORY: load error',
      error
    );

    container.innerHTML = `
      <div class="history-empty">

        <h3>
          No se pudo cargar el historial
        </h3>

        <p>
          Verifica tu conexión e intenta nuevamente.
        </p>

        <button
          type="button"
          id="retryHistoryButton"
          class="primary-button"
        >
          Reintentar
        </button>

      </div>
    `;

    const retryButton =
      document.getElementById(
        'retryHistoryButton'
      );

    retryButton?.addEventListener(
      'click',
      loadHistory
    );
  }
}

function renderHistory(
  records: BloodPressureRecord[]
): void {

  const container =
    document.getElementById(
      'historyContent'
    );

  if (!container) {
    return;
  }

  if (records.length === 0) {

    container.innerHTML = `
      <div class="history-empty">

        <h3>
          Sin mediciones
        </h3>

        <p>
          Cuando registres una medición,
          aparecerá aquí.
        </p>

      </div>
    `;

    return;
  }

  container.innerHTML =
    records
      .map(
        renderHistoryRecord
      )
      .join('');
}

function renderHistoryRecord(
  record: BloodPressureRecord
): string {

  return `
    <article class="history-card">

      <div class="history-card-header">

        <div>

          <div class="history-date">
            ${escapeHtml(record.fecha)}
          </div>

          <div class="history-time">
            ${escapeHtml(record.hora)}
          </div>

        </div>

        <div class="history-arm">
          ${escapeHtml(record.brazo)}
        </div>

      </div>

      <div class="history-measurement">

        <div class="history-pressure">

          <span class="history-pressure-value">
            ${escapeHtml(
              String(record.sistolica)
            )}/${escapeHtml(
              String(record.diastolica)
            )}
          </span>

          <span class="history-pressure-unit">
            mmHg
          </span>

        </div>

        <div class="history-pulse">

          <span class="history-pulse-value">
            ${escapeHtml(
              String(record.pulso)
            )}
          </span>

          <span class="history-pulse-unit">
            lpm
          </span>

        </div>

      </div>

      <div class="history-details">

        <div class="history-detail">
          <span>Posición</span>
          <strong>
            ${escapeHtml(record.posicion)}
          </strong>
        </div>

        <div class="history-detail">
          <span>Reposo</span>
          <strong>
            ${escapeHtml(
              String(record.reposo)
            )} min
          </strong>
        </div>

        <div class="history-detail">
          <span>Medicación</span>
          <strong>
            ${escapeHtml(record.medicacion)}
          </strong>
        </div>

      </div>

      ${renderOptionalDetails(record)}

    </article>
  `;
}

function renderOptionalDetails(
  record: BloodPressureRecord
): string {

  const symptoms =
    record.sintomas?.trim();

  const observations =
    record.observaciones?.trim();

  if (!symptoms && !observations) {
    return '';
  }

  return `
    <div class="history-notes">

      ${
        symptoms
          ? `
            <div class="history-note">
              <span>Síntomas</span>
              <p>
                ${escapeHtml(symptoms)}
              </p>
            </div>
          `
          : ''
      }

      ${
        observations
          ? `
            <div class="history-note">
              <span>Observaciones</span>
              <p>
                ${escapeHtml(observations)}
              </p>
            </div>
          `
          : ''
      }

    </div>
  `;
}

function escapeHtml(
  value: string
): string {

  return value
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}