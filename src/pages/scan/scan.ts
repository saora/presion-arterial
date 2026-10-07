import { cameraService } from "../../services/camera";
import { ocrService } from "../../services/ocr";
import type { BloodPressureRecord } from "../../types/blood-pressure";
import { saveBloodPressureRecord } from "../../services/api";
import {
  parseBloodPressureText,
  type ParsedBloodPressure,
} from "./blood-pressure-parser";
import scanTemplate from "./scan.html?raw";
import scanResultTemplate from "./scan-result.html?raw";

let scanInitialized = false;
let scanActive = false;
let captureInProgress = false;
let waitingForRetry = false;
let focusedFrames = 0;
let lastFocusCheck = 0;
let focusAnimationFrame: number | undefined;

const FOCUS_THRESHOLD = 8;
const REQUIRED_FOCUSED_FRAMES = 4;

export function renderScanPage(): string {
  return scanTemplate.replace(
    "{{SCAN_RESULT}}",
    scanResultTemplate,
  );
}

export function initializeScanPage(): void {
  const stopButton = document.getElementById(
    "stopCameraButton",
  ) as HTMLButtonElement | null;

  const video = document.getElementById(
    "cameraVideo",
  ) as HTMLVideoElement | null;

  const confirmButton = document.getElementById(
    "confirmScanButton",
  ) as HTMLButtonElement | null;

  const retryButton = document.getElementById(
    "retryScanButton",
  ) as HTMLButtonElement | null;

  if (!stopButton || !video || !confirmButton || !retryButton) {
    console.error("SCAN: camera elements not found");

    return;
  }

  stopButton.addEventListener("click", () => {
    stopCamera(stopButton);
  });

  ["scanSystolic", "scanDiastolic", "scanPulse"].forEach(
    (fieldId) => {
      const field = document.getElementById(
        fieldId,
      ) as HTMLInputElement | null;

      field?.addEventListener("input", () => {
        field.value = field.value
          .replace(/\D/g, "")
          .slice(0, 3);

        updateConfirmButtonState();
      });
    },
  );

  confirmButton.addEventListener(
    "click",
    confirmScanResult,
  );

  retryButton.addEventListener(
    "click",
    restartScanCapture,
  );

  updateConfirmButtonState();

  scanInitialized = true;

  console.log("SCAN: initialized");
}

export function setScanPageActive(active: boolean): void {
  if (!scanInitialized) {
    return;
  }

  const video = document.getElementById(
    "cameraVideo",
  ) as HTMLVideoElement | null;

  const stopButton = document.getElementById(
    "stopCameraButton",
  ) as HTMLButtonElement | null;

  if (!video || !stopButton) {
    return;
  }

  if (!active) {
    scanActive = false;
    stopCamera(stopButton);
    return;
  }

  if (scanActive) {
    return;
  }

  scanActive = true;
  captureInProgress = false;
  focusedFrames = 0;
  waitingForRetry = false;
  resetScanResult();
  void startCamera(video, stopButton);
}

async function startCamera(
  video: HTMLVideoElement,
  stopButton: HTMLButtonElement,
): Promise<void> {
  try {
    showMessage(
      "Solicitando acceso a la cámara...",
      "processing",
    );

    const stream = await cameraService.start();

    video.srcObject = stream;

    await video.play();

    stopButton.hidden = false;

    showMessage(
      "Enfocando la pantalla dentro del recuadro...",
      "focusing",
    );
    startFocusDetection(video);
  } catch (error) {
    console.error("SCAN: camera error", error);

    showMessage("No se pudo acceder a la cámara.");
  }
}

function startFocusDetection(video: HTMLVideoElement): void {
  if (focusAnimationFrame !== undefined) {
    window.cancelAnimationFrame(focusAnimationFrame);
  }

  const frame = document.querySelector<HTMLElement>(
    ".camera-frame",
  );

  if (!frame) {
    return;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!context) {
    return;
  }

  canvas.width = 160;
  canvas.height = 120;
  focusedFrames = 0;
  lastFocusCheck = 0;

  const checkFocus = (timestamp: number): void => {
    if (!scanActive) {
      focusAnimationFrame = undefined;
      return;
    }

    focusAnimationFrame = window.requestAnimationFrame(checkFocus);

    if (
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return;
    }

    if (timestamp - lastFocusCheck < 120) {
      return;
    }

    lastFocusCheck = timestamp;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const sharpness = calculateSharpness(imageData);
    const focused = sharpness >= FOCUS_THRESHOLD;

    frame.classList.toggle("focused", focused);

    if (focused) {
      focusedFrames += 1;
    } else {
      focusedFrames = 0;
    }

    if (
      focusedFrames >= REQUIRED_FOCUSED_FRAMES &&
      !captureInProgress &&
      !waitingForRetry
    ) {
      console.log("SCAN: focus confirmed, starting OCR sequence");
      captureInProgress = true;
      void captureSequence(video);
    }
  };

  focusAnimationFrame = window.requestAnimationFrame(checkFocus);
}

function restartScanCapture(): void {
  const video = document.getElementById(
    "cameraVideo",
  ) as HTMLVideoElement | null;

  const stopButton = document.getElementById(
    "stopCameraButton",
  ) as HTMLButtonElement | null;

  if (!video || !stopButton) {
    return;
  }

  resetScanResult();
  focusedFrames = 0;
  captureInProgress = false;
  waitingForRetry = false;
  scanActive = true;

  if (!video.srcObject) {
    void startCamera(video, stopButton);
    return;
  }

  showMessage(
    "Enfocando la pantalla dentro del recuadro...",
    "focusing",
  );
  startFocusDetection(video);
}

function calculateSharpness(imageData: ImageData): number {
  const { data, width, height } = imageData;
  let differenceTotal = 0;
  let samples = 0;

  for (let y = 1; y < height; y += 2) {
    for (let x = 1; x < width; x += 2) {
      const index = (y * width + x) * 4;
      const previousIndex = (y * width + x - 1) * 4;

      const brightness =
        (data[index] + data[index + 1] + data[index + 2]) / 3;
      const previousBrightness =
        (data[previousIndex] +
          data[previousIndex + 1] +
          data[previousIndex + 2]) /
        3;

      differenceTotal += Math.abs(
        brightness - previousBrightness,
      );
      samples += 1;
    }
  }

  return samples > 0 ? differenceTotal / samples : 0;
}

async function captureSequence(video: HTMLVideoElement): Promise<void> {
  try {
    const readings: ParsedBloodPressure[] = [];

    for (let index = 0; index < 3; index += 1) {
      showMessage(
        `Leyendo la pantalla... ${index + 1}/3`,
        "processing",
      );

      const canvas = cameraService.capture(video);
      const result = await ocrService.recognize(canvas);
      const parsed = parseBloodPressureText(result.text);

      console.log("SCAN: OCR reading", index + 1, result.text);
      console.log("SCAN: parsed reading", index + 1, parsed);

      readings.push(parsed);
    }

    const consensus = findConsensus(readings);

    console.log("SCAN: OCR readings", readings);
    console.log("SCAN: OCR consensus", consensus);

    if (!consensus) {
      console.warn("SCAN: no OCR consensus after three readings");
      waitingForRetry = true;
      resetScanResult();
      showMessage(
        "No se pudo confirmar la lectura. Pulsa Intentar de nuevo.",
      );
      return;
    }

    showParsedScanResult(consensus);
    showMessage("Lectura confirmada. Revisa los valores.");
  } catch (error) {
    console.error("SCAN: OCR error", error);

    waitingForRetry = true;
    resetScanResult();
    showMessage("No se pudo leer la medición.");
  } finally {
    captureInProgress = false;
  }
}

function findConsensus(
  readings: ParsedBloodPressure[],
): ParsedBloodPressure | null {
  const counts = new Map<string, {
    reading: ParsedBloodPressure;
    count: number;
  }>();

  readings.forEach((reading) => {
    if (
      reading.sistolica === null ||
      reading.diastolica === null ||
      reading.pulso === null
    ) {
      return;
    }

    const key = [
      reading.sistolica,
      reading.diastolica,
      reading.pulso,
    ].join("/");
    const current = counts.get(key);

    counts.set(key, {
      reading,
      count: (current?.count ?? 0) + 1,
    });
  });

  for (const result of counts.values()) {
    if (result.count >= 2) {
      return result.reading;
    }
  }

  return null;
}

function showParsedScanResult(
  parsed: ParsedBloodPressure,
): void {
  const container = document.getElementById("scanResult");

  if (!container) {
    return;
  }

  setInputValue("scanSystolic", parsed.sistolica);
  setInputValue("scanDiastolic", parsed.diastolica);
  setInputValue("scanPulse", parsed.pulso);

  container.hidden = false;
  waitingForRetry = true;
  updateConfirmButtonState();
}

function setInputValue(
  id: string,
  value: number | null,
): void {
  const input = document.getElementById(
    id,
  ) as HTMLInputElement | null;

  if (input) {
    input.value = value === null ? "" : String(value);
  }
}

function updateConfirmButtonState(): void {
  const confirmButton = document.getElementById(
    "confirmScanButton",
  ) as HTMLButtonElement | null;

  if (!confirmButton) {
    return;
  }

  const complete = [
    "scanSystolic",
    "scanDiastolic",
    "scanPulse",
  ].every((id) => {
    const input = document.getElementById(
      id,
    ) as HTMLInputElement | null;

    return Boolean(
      input?.value &&
      input.validity.valid,
    );
  });

  confirmButton.classList.toggle(
    "primary-button",
    complete,
  );
  confirmButton.classList.toggle(
    "secondary-button",
    !complete,
  );
  confirmButton.disabled = !complete;
}

async function confirmScanResult(): Promise<void> {
  const inputs = [
    "scanSystolic",
    "scanDiastolic",
    "scanPulse",
  ].map((id) => {
    return document.getElementById(
      id,
    ) as HTMLInputElement | null;
  });

  if (
    inputs.some(
      (input) =>
        !input?.value ||
        !input.validity.valid,
    )
  ) {
    showMessage("Completa los tres valores para confirmar.");
    return;
  }

  const confirmButton = document.getElementById(
    "confirmScanButton",
  ) as HTMLButtonElement | null;

  if (!confirmButton) {
    return;
  }

  const values = inputs.map((input) => Number(input?.value));
  const selectedArm = document.querySelector<HTMLInputElement>(
    'input[name="scanArm"]:checked',
  )?.value ?? "Izquierdo";

  const record: BloodPressureRecord = {
    fecha: getCurrentDate(),
    hora: getCurrentTime(),
    sistolica: values[0],
    diastolica: values[1],
    pulso: values[2],
    brazo: selectedArm,
    posicion: "",
    reposo: 0,
    sintomas: "",
    observaciones: "",
  };

  confirmButton.disabled = true;
  showMessage("Guardando medición...");

  try {
    await saveBloodPressureRecord(record);
    resetScanResult();
    showMessage("Medición guardada correctamente.");
  } catch (error) {
    console.error("SCAN: save error", error);
    showMessage("No se pudo guardar la medición.");
  } finally {
    confirmButton.disabled = false;
  }
}

function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentTime(): string {
  return new Date().toTimeString().substring(0, 5);
}


function resetScanResult(): void {
  const container = document.getElementById("scanResult");

  if (container) {
    container.hidden = false;
  }

  setInputValue("scanSystolic", null);
  setInputValue("scanDiastolic", null);
  setInputValue("scanPulse", null);
  updateConfirmButtonState();
}

function stopCamera(stopButton: HTMLButtonElement): void {
  scanActive = false;

  if (focusAnimationFrame !== undefined) {
    window.cancelAnimationFrame(focusAnimationFrame);
    focusAnimationFrame = undefined;
  }

  cameraService.stop();

  const video = document.getElementById(
    "cameraVideo",
  ) as HTMLVideoElement | null;

  if (video) {
    video.srcObject = null;
  }

  resetScanResult();

  stopButton.hidden = true;

  document.querySelector(".camera-frame")?.classList.remove(
    "focused",
  );

  showMessage("Cámara detenida.");
}

function showMessage(
  message: string,
  status: "idle" | "focusing" | "processing" = "idle",
): void {
  const element = document.getElementById("scanMessage");

  if (!element) {
    return;
  }

  element.textContent = message;
  element.dataset.status = status;
}
