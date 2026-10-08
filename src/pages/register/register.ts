import type { BloodPressureRecord } from "../../types/blood-pressure";
import { saveBloodPressureRecord } from "../../services/api";
import { enableSwipeToggle } from "../../utils/swipe-toggle";
import { requestSaveConfirmation } from "../../components/navigation/navigation";
import registerTemplate from "./register.html?raw";

let dateTimeInterval: number | undefined;

export function renderRegisterPage(): string {
  return registerTemplate;
}

export function populateRegisterMeasurement(
  sistolica: number,
  diastolica: number,
  pulso: number,
): void {
  setInputValue("sistolica", sistolica);
  setInputValue("diastolica", diastolica);
  setInputValue("pulso", pulso);

  const form = document.getElementById(
    "bloodPressureForm",
  ) as HTMLFormElement | null;
  const saveButton = document.getElementById(
    "saveButton",
  ) as HTMLButtonElement | null;

  if (form && saveButton) {
    updateSaveButtonState(form, saveButton);
  }
}

function setInputValue(id: string, value: number): void {
  const input = document.getElementById(
    id,
  ) as HTMLInputElement | null;

  if (input) {
    input.value = String(value);
  }
}

export function initializeRegisterPage(): void {
  const form = document.getElementById(
    "bloodPressureForm",
  ) as HTMLFormElement | null;

  const saveButton = document.getElementById(
    "saveButton",
  ) as HTMLButtonElement | null;

  if (!form || !saveButton) {
    console.error("REGISTER: form elements not found");

    return;
  }

  initializeDateTime();

  window.clearInterval(dateTimeInterval);
  dateTimeInterval = window.setInterval(
    initializeDateTime,
    1000,
  );

  initializeInputConstraints();

  initializeExtraDetailsToggle();

  document.querySelectorAll<HTMLButtonElement>("[data-back-to-home]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelector<HTMLButtonElement>(
          '.nav-item[data-page="home"]',
        )?.click();
      });
    });

  enableSwipeToggle(document.querySelector(".arm-toggle"));

  updateSaveButtonState(form, saveButton);

  form.addEventListener("input", () => {
    updateSaveButtonState(form, saveButton);
  });

  form.addEventListener("change", () => {
    updateSaveButtonState(form, saveButton);
  });

  form.addEventListener("submit", handleFormSubmit);

  console.log("REGISTER: initialized");
}

function initializeExtraDetailsToggle(): void {
  const toggleButton = document.getElementById(
    "toggleExtraDetailsButton",
  ) as HTMLButtonElement | null;

  const extraDetails = document.getElementById(
    "extraDetails",
  ) as HTMLDivElement | null;

  if (!toggleButton || !extraDetails) {
    return;
  }

  const updateToggleState = (): void => {
    const isExpanded = !extraDetails.hidden;

    toggleButton.textContent = isExpanded ? "−" : "+";
    toggleButton.setAttribute("aria-expanded", String(isExpanded));
    toggleButton.classList.toggle("is-open", isExpanded);
    toggleButton.setAttribute(
      "aria-label",
      isExpanded ? "Ocultar detalles adicionales" : "Mostrar más detalles",
    );
  };

  toggleButton.addEventListener("click", () => {
    extraDetails.hidden = !extraDetails.hidden;
    updateToggleState();
  });

  updateToggleState();
}

function initializeInputConstraints(): void {
  const numericFields = [
    "sistolica",
    "diastolica",
    "pulso",
  ];

  numericFields.forEach((fieldId) => {
    const field = document.getElementById(
      fieldId,
    ) as HTMLInputElement | null;

    field?.addEventListener("input", () => {
      field.value = field.value
        .replace(/\D/g, "")
        .slice(0, 3);
    });
  });

  const symptoms = document.getElementById(
    "sintomas",
  ) as HTMLInputElement | null;

  symptoms?.addEventListener("input", () => {
    symptoms.value = symptoms.value
      .replace(/[^\p{L}\s]/gu, "")
      .slice(0, 25);
  });

  const observations = document.getElementById(
    "observaciones",
  ) as HTMLTextAreaElement | null;

  const observationsCounter = document.getElementById(
    "observacionesCounter",
  );

  const updateObservationsCounter = (): void => {
    if (!observations || !observationsCounter) {
      return;
    }

    observationsCounter.textContent =
      `${String(observations.value.length).padStart(2, "0")}/100`;
  };

  observations?.addEventListener(
    "input",
    updateObservationsCounter,
  );

  updateObservationsCounter();
}

function initializeDateTime(): void {
  const fecha = document.getElementById(
    "fecha",
  ) as HTMLInputElement | null;

  const hora = document.getElementById(
    "hora",
  ) as HTMLInputElement | null;

  if (!fecha || !hora) {
    console.error("REGISTER: date/time fields not found");

    return;
  }

  const now = new Date();

const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, "0");
const day = String(now.getDate()).padStart(2, "0");

fecha.value = `${year}-${month}-${day}`;

hora.value = now.toTimeString().substring(0, 5);
}

function updateSaveButtonState(
  form: HTMLFormElement,
  saveButton: HTMLButtonElement,
): void {
  saveButton.disabled = !form.checkValidity();
}

async function handleFormSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();

  const form = event.currentTarget as HTMLFormElement;

  const saveButton = document.getElementById(
    "saveButton",
  ) as HTMLButtonElement | null;

  if (!saveButton) {
    return;
  }

  if (!form.checkValidity()) {
    updateSaveButtonState(form, saveButton);

    form.reportValidity();

    return;
  }

  const formData = new FormData(form);

  const record = buildRecord(formData);

  console.log("REGISTER: record", record);

  requestSaveConfirmation(
    () => saveRegisterRecord(record, form, saveButton),
    () => resetRegisterForm(form, saveButton),
  );
}

async function saveRegisterRecord(
  record: BloodPressureRecord,
  form: HTMLFormElement,
  saveButton: HTMLButtonElement,
): Promise<void> {
  try {
    saveButton.disabled = true;
    await saveBloodPressureRecord(record);
  } catch (error) {
    console.error("REGISTER: save error", error);
    throw error;
  } finally {
    updateSaveButtonState(form, saveButton);
  }

  resetRegisterForm(form, saveButton);
}

function resetRegisterForm(
  form: HTMLFormElement,
  saveButton: HTMLButtonElement,
): void {
  form.reset();

  const extraDetails = document.getElementById("extraDetails");
  const extraDetailsButton = document.getElementById(
    "toggleExtraDetailsButton",
  );

  if (extraDetails) {
    extraDetails.hidden = true;
  }
  if (extraDetailsButton) {
    extraDetailsButton.textContent = "+";
    extraDetailsButton.setAttribute("aria-expanded", "false");
    extraDetailsButton.setAttribute("aria-label", "Mostrar más detalles");
    extraDetailsButton.classList.remove("is-open");
  }

  initializeDateTime();
  updateSaveButtonState(form, saveButton);
}

function buildRecord(formData: FormData): BloodPressureRecord {
  return {
    fecha: getStringValue(formData, "fecha"),
    hora: getStringValue(formData, "hora"),
    sistolica: getNumberValue(formData, "sistolica"),
    diastolica: getNumberValue(formData, "diastolica"),
    pulso: getNumberValue(formData, "pulso"),
    brazo: getStringValue(formData, "brazo"),
    posicion: "",
    reposo: 0,
    sintomas: getStringValue(formData, "sintomas"),
    observaciones: getStringValue(formData, "observaciones"),
  };
}

function getStringValue(
  formData: FormData,
  fieldName: string,
): string {
  const value = formData.get(fieldName);

  return value?.toString().trim() ?? "";
}

function getNumberValue(
  formData: FormData,
  fieldName: string,
): number {
  const value = formData.get(fieldName);

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}
