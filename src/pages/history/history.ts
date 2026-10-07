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


type HistoryPeriod =
  | "all"
  | "day"
  | "week"
  | "month";


let allRecords: BloodPressureRecord[] = [];

let currentPeriod: HistoryPeriod = "all";


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

      const id = Number(button.dataset.recordId);

      if (!Number.isInteger(id)) {
        return;
      }

      const confirmed = window.confirm(
        "¿Eliminar esta medición?",
      );

      if (!confirmed) {
        return;
      }

      button.disabled = true;

      try {
        await deleteBloodPressureRecord(id);
        await loadHistory();
      } catch (error) {
        console.error(
          "HISTORY: delete error",
          error,
        );

        button.disabled = false;

        window.alert(
          "No se pudo eliminar la medición.",
        );
      }
    });
  });
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
    startDate.setMonth(
      now.getMonth() - 1,
    );
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
  const date = new Date(
    `${record.fecha}T${record.hora}`,
  );

  if (Number.isNaN(date.getTime())) {
    return new Date(0);
  }

  return date;
}

