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
  const modal = document.getElementById("registerChoiceModal");

  if (!modal) {
    return;
  }

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
}

function hideRegisterChoiceModal(): void {
  const modal = document.getElementById("registerChoiceModal");

  if (!modal) {
    return;
  }

  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
}