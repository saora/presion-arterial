import navigationTemplate from "./navigation.html?raw";

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

function updateBottomNavigation(page: string): void {
  const bottomNavigation =
    document.querySelector<HTMLElement>(".bottom-navigation");

  const hideBottomNavigation =
    page === "register" || page === "profile" || page === "scan";

  if (bottomNavigation) {
    bottomNavigation.hidden = hideBottomNavigation;
  }

  document.querySelector(".app")?.classList.toggle(
    "app-without-bottom-navigation",
    hideBottomNavigation,
  );
}

function showRegisterChoiceModal(): void {
  showAppModal("registerChoiceModal");
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
  const app = document.querySelector(".app");

  if (bottomNavigation) {
    bottomNavigation.hidden = true;
  }

  app?.classList.add(
    "app-without-bottom-navigation",
    "register-choice-modal-open",
  );
}

function hideRegisterChoiceModal(): void {
  hideAppModal("registerChoiceModal");
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