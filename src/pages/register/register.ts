import type { BloodPressureRecord } from "../../types/blood-pressure";
import { saveBloodPressureRecord } from "../../services/api";
import registerTemplate from "./register.html?raw";

let dateTimeInterval: number | undefined;

export function renderRegisterPage(): string {
  return registerTemplate;
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

  try {
    saveButton.disabled = true;

    showMessage("Guardando medición...");

    await saveBloodPressureRecord(record);

    showMessage("Medición guardada correctamente.");

    form.reset();

    initializeDateTime();

    updateSaveButtonState(form, saveButton);
  } catch (error) {
    console.error("REGISTER: save error", error);

    showMessage("No se pudo guardar la medición.");

    updateSaveButtonState(form, saveButton);
  }
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

function showMessage(message: string): void {
  const element = document.getElementById("formMessage");

  if (!element) {
    return;
  }

  element.textContent = message;

  window.setTimeout(() => {
    element.textContent = "";
  }, 3000);
}