import navigationTemplate from "./navigation.html?raw";

let pendingSaveConfirmation: (() => void | Promise<void>) | undefined;
let cancelSaveConfirmationAction: (() => void) | undefined;
let saveModalCloseTimeout: number | undefined;
let saveConfirmationInProgress = false;

export function renderNavigation(): string {
  return navigationTemplate;
}

export function initializeNavigation(
  onPageChange?: (page: string) => void,
): void {
  const navigationItems =
    document.querySelectorAll<HTMLButtonElement>(".nav-item");

  navigationItems.forEach((button) => {
    button.addEventListener("click", () => {
      const page = button.dataset.page;

      if (!page) {
        return;
      }

      if (page === "register" || page === "scan") {
        showRegisterChoiceModal();
        return;
      }

      showPage(page, onPageChange);
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-show-page]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const page = button.dataset.showPage;

        if (page) {
          showPage(page, onPageChange);
        }
      });
    });

  const modal = document.getElementById("registerChoiceModal");

  modal?.querySelectorAll<HTMLButtonElement>("[data-register-choice]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const choice = button.dataset.registerChoice;

        hideRegisterChoiceModal();

        if (choice === "manual") {
          showPage("register", onPageChange);
          return;
        }

        if (choice === "scan") {
          showPage("scan", onPageChange);
          return;
        }
      });
    });

  modal?.querySelectorAll<HTMLButtonElement>("[data-close-modal]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        hideRegisterChoiceModal();
      });
    });

  document
    .getElementById("confirmSaveRecord")
    ?.addEventListener("click", () => {
      void confirmSaveRecord();
    });

  document
    .getElementById("cancelSaveRecord")
    ?.addEventListener("click", cancelSaveConfirmation);

  document
    .querySelector<HTMLElement>("[data-close-save-modal]")
    ?.addEventListener("click", cancelSaveConfirmation);

  console.log("NAVIGATION: initialized");
}

export function showPage(
  page: string,
  onPageChange?: (page: string) => void,
): void {
  const pages = document.querySelectorAll<HTMLElement>(".page");

  const navigationItems =
    document.querySelectorAll<HTMLButtonElement>(".nav-item");

  updateBottomNavigation(page);

  pages.forEach((element) => {
    const isActive = element.id === `page-${page}`;

    element.hidden = !isActive;

    element.classList.toggle("active", isActive);
  });

  navigationItems.forEach((button) => {
    const isActive = button.dataset.page === page;

    button.classList.toggle("active", isActive);
  });

  console.log("NAVIGATION: page", page);

  onPageChange?.(page);
}

function showRegisterChoiceModal(): void {
  showAppModal("registerChoiceModal");
}

function hideRegisterChoiceModal(): void {
  hideAppModal("registerChoiceModal");
}

function updateBottomNavigation(page: string): void {
  const bottomNavigation =
    document.querySelector<HTMLElement>(".bottom-navigation");
  const hideBottomNavigation =
    page === "register" || page === "scan" || page === "profile";

  if (bottomNavigation) {
    bottomNavigation.hidden = hideBottomNavigation;
  }

  document.querySelector(".app")?.classList.toggle(
    "app-without-bottom-navigation",
    hideBottomNavigation,
  );
}

export function requestSaveConfirmation(
  onConfirm: () => void | Promise<void>,
  onCancel?: () => void,
): void {
  pendingSaveConfirmation = onConfirm;
  cancelSaveConfirmationAction = onCancel;
  saveConfirmationInProgress = false;
  resetSaveModalFeedback();
  showAppModal("saveRecordModal");
}

function cancelSaveConfirmation(): void {
  const feedback = document.getElementById("saveRecordFeedback");

  if (saveConfirmationInProgress && !feedback?.classList.contains("is-error")) {
    return;
  }

  const confirmButton = document.getElementById(
    "confirmSaveRecord",
  ) as HTMLButtonElement | null;

  if (confirmButton?.disabled) {
    return;
  }

  if (saveModalCloseTimeout !== undefined) {
    window.clearTimeout(saveModalCloseTimeout);
    saveModalCloseTimeout = undefined;
  }

  const onCancel = cancelSaveConfirmationAction;
  pendingSaveConfirmation = undefined;
  cancelSaveConfirmationAction = undefined;
  saveConfirmationInProgress = false;
  hideAppModal("saveRecordModal");
  onCancel?.();
}

async function confirmSaveRecord(): Promise<void> {
  const onConfirm = pendingSaveConfirmation;
  const confirmButton = document.getElementById(
    "confirmSaveRecord",
  ) as HTMLButtonElement | null;

  if (!onConfirm || !confirmButton || saveConfirmationInProgress) {
    return;
  }

  pendingSaveConfirmation = undefined;
  cancelSaveConfirmationAction = undefined;
  saveConfirmationInProgress = true;
  confirmButton.disabled = true;
  setSaveModalFeedback("loading", "Guardando medición...");

  try {
    await onConfirm();
    setSaveModalFeedback("success", "Medición guardada correctamente.");
    saveModalCloseTimeout = window.setTimeout(() => {
      saveModalCloseTimeout = undefined;
      saveConfirmationInProgress = false;
      hideAppModal("saveRecordModal");
      resetSaveModalFeedback();
      document.querySelector<HTMLButtonElement>(
        '.nav-item[data-page="home"]',
      )?.click();
    }, 1800);
  } catch (error) {
    console.error("NAVIGATION: confirmed save action failed", error);
    saveConfirmationInProgress = false;
    setSaveModalFeedback("error", "No se pudo guardar la medición.");

    const actions = document.getElementById("saveRecordActions");
    const cancelButton = document.getElementById("cancelSaveRecord");
    const confirmSaveButton = document.getElementById("confirmSaveRecord");

    if (actions) {
      actions.hidden = false;
    }
    if (cancelButton) {
      cancelButton.textContent = "Cerrar";
    }
    if (confirmSaveButton) {
      confirmSaveButton.hidden = true;
    }
  } finally {
    confirmButton.disabled = false;
  }
}

function setSaveModalFeedback(
  status: "loading" | "success" | "error",
  message: string,
): void {
  const title = document.getElementById("saveRecordTitle");
  const feedback = document.getElementById("saveRecordFeedback");
  const feedbackIcon = document.getElementById("saveRecordFeedbackIcon");
  const feedbackMessage = document.getElementById("saveRecordFeedbackMessage");
  const actions = document.getElementById("saveRecordActions");

  if (!title || !feedback || !feedbackIcon || !feedbackMessage || !actions) {
    console.error("NAVIGATION: save modal feedback elements not found");
    return;
  }

  title.hidden = true;
  feedback.hidden = false;
  feedback.className = `save-record-feedback is-${status}`;
  feedbackMessage.textContent = message;
  feedbackIcon.innerHTML = status === "success"
    ? '<svg viewBox="0 0 24 24"><path d="m5 12 4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : "";
  actions.hidden = status === "loading" || status === "success";
}

function resetSaveModalFeedback(): void {
  const title = document.getElementById("saveRecordTitle");
  const feedback = document.getElementById("saveRecordFeedback");
  const feedbackIcon = document.getElementById("saveRecordFeedbackIcon");
  const feedbackMessage = document.getElementById("saveRecordFeedbackMessage");
  const actions = document.getElementById("saveRecordActions");
  const cancelButton = document.getElementById("cancelSaveRecord");
  const confirmButton = document.getElementById(
    "confirmSaveRecord",
  ) as HTMLButtonElement | null;

  if (saveModalCloseTimeout !== undefined) {
    window.clearTimeout(saveModalCloseTimeout);
    saveModalCloseTimeout = undefined;
  }
  if (title) {
    title.hidden = false;
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
    confirmButton.hidden = false;
    confirmButton.disabled = false;
  }
}

export function showAppModal(modalId: string): void {
  const modal = document.getElementById(modalId);

  if (!modal) {
    return;
  }

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");

  const bottomNavigation =
    document.querySelector<HTMLElement>(".bottom-navigation");

  if (bottomNavigation) {
    bottomNavigation.hidden = true;
  }

  document.querySelector(".app")?.classList.add(
    "app-without-bottom-navigation",
    "register-choice-modal-open",
  );
}

export function hideAppModal(modalId: string): void {
  const modal = document.getElementById(modalId);

  if (!modal) {
    return;
  }

  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");

  const anotherModalIsOpen =
    document.querySelector(".register-choice-modal:not([hidden])") !== null;

  if (anotherModalIsOpen) {
    return;
  }

  const activePage = document.querySelector<HTMLElement>(".page.active");
  updateBottomNavigation(activePage?.id.replace(/^page-/, "") ?? "home");
  document.querySelector(".app")?.classList.remove("register-choice-modal-open");
}