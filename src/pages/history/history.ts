import type { BloodPressureRecord } from "../../types/blood-pressure";
import {
  deleteBloodPressureRecord,
  getBloodPressureRecords,
} from "../../services/api";
import historyTemplate from "./history.html?raw";

import {
  historyLoadingTemplate,
  historyErrorTemplate,
  historyEmptyTemplate,
  historyRecordTemplate,
} from "./history-templates";
import { hideAppModal, showAppModal } from "../../components/navigation/navigation";


type HistoryPeriod =
  | "all"
  | "day"
  | "week"
  | "month";


let allRecords: BloodPressureRecord[] = [];

let currentPeriod: HistoryPeriod = "all";
let pendingDeleteId: number | undefined;
let deleteModalCloseTimeout: number | undefined;
let deleteConfirmationLocked = false;


/* =========================
   RENDER PAGE
   ========================= */

export function renderHistoryPage(): string {
  return historyTemplate;
}


/* =========================
   INITIALIZE
   ========================= */

export function initializeHistoryPage(): void {
  initializeHistoryFilters();
  initializeDeleteConfirmationModal();

  loadHistory();

  console.log("HISTORY: initialized");
}

export function refreshHistoryPage(): void {
  void loadHistory();
}


/* =========================
   LOAD HISTORY
   ========================= */

async function loadHistory(): Promise<void> {
  const container = document.getElementById(
    "historyContent",
  );

  if (!container) {
    console.error(
      "HISTORY: #historyContent not found",
    );

    return;
  }

  try {
    container.innerHTML =
      historyLoadingTemplate();

    const records =
      await getBloodPressureRecords();

    allRecords = sortRecords(records);

    renderHistory();

  } catch (error) {
    console.error(
      "HISTORY: load error",
      error,
    );

    container.innerHTML =
      historyErrorTemplate();

    const retryButton =
      document.getElementById(
        "retryHistoryButton",
      );

    retryButton?.addEventListener(
      "click",
      loadHistory,
    );
  }
}


/* =========================
   FILTERS
   ========================= */

function initializeHistoryFilters(): void {
  const filterButtons =
    document.querySelectorAll<HTMLButtonElement>(
      ".history-filter",
    );

  filterButtons.forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        const period =
          button.dataset.period as
            | HistoryPeriod
            | undefined;

        if (!period) {
          return;
        }

        currentPeriod = period;

        updateActiveFilter(button);

        renderHistory();
      },
    );
  });
}


function updateActiveFilter(
  activeButton: HTMLButtonElement,
): void {
  const filterButtons =
    document.querySelectorAll<HTMLButtonElement>(
      ".history-filter",
    );

  filterButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button === activeButton,
    );
  });
}


/* =========================
   RENDER HISTORY
   ========================= */

function renderHistory(): void {
  const container = document.getElementById(
    "historyContent",
  );

  if (!container) {
    return;
  }

  container.classList.add("history-animation-enabled");

  const filteredRecords =
    filterRecords(
      allRecords,
      currentPeriod,
    );

  if (filteredRecords.length === 0) {
    container.innerHTML =
      historyEmptyTemplate();

    initializeRegisterNavigation();

    return;
  }

  container.innerHTML =
    filteredRecords
      .map((record, index) =>
        historyRecordTemplate(
          record,
          index === 0,
        ),
      )
      .join("");

  initializeDeleteButtons();
}

function initializeDeleteButtons(): void {
  const deleteButtons =
    document.querySelectorAll<HTMLButtonElement>(
      ".history-delete-button",
    );

  deleteButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      event.preventDefault();

      const id = Number(button.dataset.recordId);

      if (!Number.isInteger(id)) {
        return;
      }

      pendingDeleteId = id;
      resetDeleteModalFeedback();
      showAppModal("deleteRecordModal");
    });
  });

}

function initializeDeleteConfirmationModal(): void {
  document
    .getElementById("cancelDeleteRecord")
    ?.addEventListener("click", closeDeleteConfirmation);

  document
    .querySelector<HTMLElement>("[data-close-delete-modal]")
    ?.addEventListener("click", closeDeleteConfirmation);

  document
    .getElementById("confirmDeleteRecord")
    ?.addEventListener("click", () => {
      void confirmDeleteRecord();
    });
}

function closeDeleteConfirmation(): void {
  if (deleteConfirmationLocked) {
    return;
  }

  if (deleteModalCloseTimeout !== undefined) {
    window.clearTimeout(deleteModalCloseTimeout);
    deleteModalCloseTimeout = undefined;
  }

  pendingDeleteId = undefined;
  hideAppModal("deleteRecordModal");
}

async function confirmDeleteRecord(): Promise<void> {
  const id = pendingDeleteId;
  const confirmButton = document.getElementById(
    "confirmDeleteRecord",
  ) as HTMLButtonElement | null;

  if (id === undefined || !confirmButton || deleteConfirmationLocked) {
    return;
  }

  deleteConfirmationLocked = true;
  confirmButton.disabled = true;
  setDeleteModalFeedback("loading", "Eliminando registro...");

  try {
    await deleteBloodPressureRecord(id);
    setDeleteModalFeedback("success", "Registro eliminado de manera exitosa");
    deleteModalCloseTimeout = window.setTimeout(() => {
      deleteModalCloseTimeout = undefined;
      deleteConfirmationLocked = false;
      pendingDeleteId = undefined;
      hideAppModal("deleteRecordModal");
      resetDeleteModalFeedback();
      void loadHistory();
    }, 1800);
  } catch (error) {
    console.error("HISTORY: delete error", error);
    deleteConfirmationLocked = false;
    setDeleteModalFeedback("error", "No se pudo eliminar el registro.");
    const cancelButton = document.getElementById(
      "cancelDeleteRecord",
    ) as HTMLButtonElement | null;
    const retryButton = document.getElementById(
      "confirmDeleteRecord",
    ) as HTMLButtonElement | null;

    if (cancelButton) {
      cancelButton.textContent = "Cerrar";
    }
    if (retryButton) {
      retryButton.textContent = "Reintentar";
    }
  } finally {
    confirmButton.disabled = false;
  }
}

function setDeleteModalFeedback(
  status: "loading" | "success" | "error",
  message: string,
): void {
  const title = document.getElementById("deleteRecordTitle");
  const description = document.getElementById("deleteRecordDescription");
  const feedback = document.getElementById("deleteRecordFeedback");
  const feedbackIcon = document.getElementById("deleteRecordFeedbackIcon");
  const feedbackMessage = document.getElementById(
    "deleteRecordFeedbackMessage",
  );
  const actions = document.getElementById("deleteRecordActions");

  if (
    !title || !description || !feedback || !feedbackIcon ||
    !feedbackMessage || !actions
  ) {
    console.error("HISTORY: delete modal feedback elements not found");
    return;
  }

  title.hidden = true;
  description.hidden = true;
  feedback.hidden = false;
  feedback.className = `save-record-feedback is-${status}`;
  feedbackMessage.textContent = message;
  feedbackIcon.innerHTML = status === "success"
    ? '<svg viewBox="0 0 24 24"><path d="m5 12 4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : "";
  actions.hidden = status === "loading" || status === "success";
}

function resetDeleteModalFeedback(): void {
  const title = document.getElementById("deleteRecordTitle");
  const description = document.getElementById("deleteRecordDescription");
  const feedback = document.getElementById("deleteRecordFeedback");
  const feedbackIcon = document.getElementById("deleteRecordFeedbackIcon");
  const feedbackMessage = document.getElementById(
    "deleteRecordFeedbackMessage",
  );
  const actions = document.getElementById("deleteRecordActions");
  const cancelButton = document.getElementById(
    "cancelDeleteRecord",
  ) as HTMLButtonElement | null;
  const confirmButton = document.getElementById(
    "confirmDeleteRecord",
  ) as HTMLButtonElement | null;

  deleteConfirmationLocked = false;

  if (deleteModalCloseTimeout !== undefined) {
    window.clearTimeout(deleteModalCloseTimeout);
    deleteModalCloseTimeout = undefined;
  }
  if (title) {
    title.hidden = false;
  }
  if (description) {
    description.hidden = false;
  }
  if (feedback) {
    feedback.hidden = true;
    feedback.className = "save-record-feedback";
  }
  feedbackIcon?.replaceChildren();
  if (feedbackMessage) {
    feedbackMessage.textContent = "";
  }
  if (actions) {
    actions.hidden = false;
  }
  if (cancelButton) {
    cancelButton.textContent = "Cancelar";
  }
  if (confirmButton) {
    confirmButton.textContent = "Aceptar";
    confirmButton.disabled = false;
  }
}


/* =========================
   EMPTY STATE NAVIGATION
   ========================= */

function initializeRegisterNavigation(): void {
  const registerButton =
    document.getElementById(
      "goToRegisterButton",
    );

  if (!registerButton) {
    return;
  }

  registerButton.addEventListener(
    "click",
    () => {
      const navigationButton =
        document.querySelector<HTMLButtonElement>(
          '.nav-item[data-page="register"]',
        );

      navigationButton?.click();
    },
  );
}


/* =========================
   FILTER RECORDS
   ========================= */

function filterRecords(
  records: BloodPressureRecord[],
  period: HistoryPeriod,
): BloodPressureRecord[] {
  if (period === "all") {
    return records;
  }

  const now = new Date();

  const startDate = new Date(now);

  if (period === "day") {
    startDate.setDate(
      now.getDate() - 1,
    );
  }

  if (period === "week") {
    startDate.setDate(
      now.getDate() - 7,
    );
  }

  if (period === "month") {
    return records.filter((record) => {
      const recordDate = getRecordDate(record);

      return recordDate.getFullYear() === now.getFullYear() &&
        recordDate.getMonth() === now.getMonth();
    });
  }

  return records.filter((record) => {
    const recordDate =
      getRecordDate(record);

    return recordDate >= startDate;
  });
}


/* =========================
   SORT RECORDS
   ========================= */

function sortRecords(
  records: BloodPressureRecord[],
): BloodPressureRecord[] {
  return [...records].sort(
    (a, b) => {
      const dateA =
        getRecordDate(a);

      const dateB =
        getRecordDate(b);

      return (
        dateB.getTime() -
        dateA.getTime()
      );
    },
  );
}


/* =========================
   RECORD DATE
   ========================= */

function getRecordDate(
  record: BloodPressureRecord,
): Date {
  const [hours = "0", minutes = "0"] =
    record.hora.split(":");

  const normalizedTime = [
    hours.padStart(2, "0"),
    minutes.padStart(2, "0"),
  ].join(":");

  const date = new Date(
    `${record.fecha}T${normalizedTime}:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return new Date(0);
  }

  return date;
}
