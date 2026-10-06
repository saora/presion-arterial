export function renderNavigation(): string {
  return `
    <nav class="bottom-navigation">

      <button
        type="button"
        class="nav-item active"
        data-page="register"
      >
        <span class="nav-icon">＋</span>
        <span>Registrar</span>
      </button>


      <button
        type="button"
        class="nav-item"
        data-page="scan"
      >
        <span class="nav-icon">◉</span>
        <span>Escanear</span>
      </button>


      <button
        type="button"
        class="nav-item"
        data-page="history"
      >
        <span class="nav-icon">☰</span>
        <span>Historial</span>
      </button>

    </nav>
  `;
}


export function initializeNavigation(): void {

  const navigationItems =
    document.querySelectorAll<HTMLButtonElement>(
      '.nav-item'
    );


  navigationItems.forEach(
    (button) => {

      button.addEventListener(
        'click',
        () => {

          const page =
            button.dataset.page;


          if (!page) {
            return;
          }


          showPage(page);

        }
      );

    }
  );


  console.log(
    'NAVIGATION: initialized'
  );
}


function showPage(
  page: string
): void {

  const pages =
    document.querySelectorAll<HTMLElement>(
      '.page'
    );


  const navigationItems =
    document.querySelectorAll<HTMLButtonElement>(
      '.nav-item'
    );


  pages.forEach(
    (element) => {

      const isActive =
        element.id ===
        `page-${page}`;


      element.hidden =
        !isActive;


      element.classList.toggle(
        'active',
        isActive
      );

    }
  );


  navigationItems.forEach(
    (button) => {

      const isActive =
        button.dataset.page === page;


      button.classList.toggle(
        'active',
        isActive
      );

    }
  );


  console.log(
    'NAVIGATION: page',
    page
  );
}