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

      showPage(page, onPageChange);
    });
  });

  console.log("NAVIGATION: initialized");
}

function showPage(
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