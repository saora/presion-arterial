export function enableSwipeToggle(container: HTMLElement | null): void {
  if (!container) {
    return;
  }

  const radios = Array.from(
    container.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
  );

  if (radios.length !== 2) {
    return;
  }

  let touchStartX = 0;
  let touchStartY = 0;

  const updateVisualState = (): void => {
    const activeIndex = radios.findIndex((radio) => radio.checked);
    container.style.setProperty(
      "--active-index",
      String(activeIndex >= 0 ? activeIndex : 0),
    );
  };

  const selectOption = (direction: number): void => {
    const currentIndex = radios.findIndex((radio) => radio.checked);
    const nextIndex =
      (currentIndex + direction + radios.length) % radios.length;

    radios[nextIndex].checked = true;
    radios[nextIndex].dispatchEvent(
      new Event("change", { bubbles: true }),
    );
    updateVisualState();
  };

  radios.forEach((radio) => {
    radio.addEventListener("change", updateVisualState);
  });

  updateVisualState();

  container.addEventListener(
    "touchstart",
    (event: TouchEvent) => {
      const touch = event.changedTouches[0];

      if (!touch) {
        return;
      }

      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    },
    { passive: true },
  );

  container.addEventListener(
    "touchend",
    (event: TouchEvent) => {
      const touch = event.changedTouches[0];

      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) {
        return;
      }

      selectOption(deltaX < 0 ? 1 : -1);
    },
    { passive: true },
  );
}
