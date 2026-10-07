import navigationTemplate from "./navigation.html?raw";

export function renderNavigation(): string {
  return navigationTemplate;
}

export function initializeNavigation(): void {
  const navigationItems =
    document.querySelectorAll<HTMLButtonElement>(".nav-item");

  navigationItems.forEach((button) => {
    button.addEventListener("click", () => {
      const page = button.dataset.page;

      if (!page) {
        return;
      }

      showPage(page);
    });
  });

  console.log("NAVIGATION: initialized");
}

function showPage(page: string): void {
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
}