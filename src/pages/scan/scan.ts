import { cameraService } from "../../services/camera";
import { groqVisionService } from "../../services/groq-vision";
import { ocrService } from "../../services/ocr";
import type { BloodPressureRecord } from "../../types/blood-pressure";
import { saveBloodPressureRecord } from "../../services/api";
import { enableSwipeToggle } from "../../utils/swipe-toggle";
import {
  hideAppModal,
  requestSaveConfirmation,
  showAppModal,
} from "../../components/navigation/navigation";
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
let scanSuccessModalTimeout: number | undefined;

const FOCUS_THRESHOLD = 8;
const REQUIRED_FOCUSED_FRAMES = 4;

export function renderScanPage(): string {
  return scanTemplate.replace(
    "{{SCAN_RESULT}}",
    scanResultTemplate,
  );
}

export function initializeScanPage(): void {
  const video = document.getElementById(
    "cameraVideo",
  ) as HTMLVideoElement | null;

  const confirmButton = document.getElementById(
    "confirmScanButton",
  ) as HTMLButtonElement | null;

  const retryButton = document.getElementById(
    "retryScanButton",
  ) as HTMLButtonElement | null;

  if (!video || !confirmButton || !retryButton) {
    console.error("SCAN: camera elements not found");

    return;
  }

  retryButton.disabled = true;
  document
    .querySelectorAll<HTMLElement>("[data-close-scan-success]")
    .forEach((element) => {
      element.addEventListener("click", closeScanSuccessModal);
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

  document.querySelectorAll<HTMLButtonElement>("[data-back-to-home]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelector<HTMLButtonElement>(
          '.nav-item[data-page="home"]',
        )?.click();
      });
    });

  enableSwipeToggle(document.querySelector(".scan-arm-toggle"));

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

  if (!video) {
    return;
  }

  if (!active) {
    scanActive = false;
    captureInProgress = false;
    closeScanSuccessModal();
    stopCamera();
    return;
  }

  if (scanActive) {
    return;
  }

  scanActive = true;
  captureInProgress = false;
  focusedFrames = 0;
  waitingForRetry = false;
  showLiveCameraPreview();
  resetScanResult();
  void startCamera(video);
}

async function startCamera(video: HTMLVideoElement): Promise<void> {
  try {
    showMessage(
      "Activando cámara...",
      "processing",
    );

    const stream = await cameraService.start();

    if (!scanActive) {
      cameraService.stop();
      return;
    }

    video.srcObject = stream;

    await video.play();

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

  const retryButton = document.getElementById(
    "retryScanButton",
  ) as HTMLButtonElement | null;

  if (!video || !retryButton || retryButton.disabled || !waitingForRetry) {
    return;
  }

  retryButton.disabled = true;
  resetScanResult();
  showLiveCameraPreview();
  focusedFrames = 0;
  captureInProgress = false;
  waitingForRetry = false;
  scanActive = true;

  if (!video.srcObject) {
    void startCamera(video);
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
  let imageCaptured = false;

  try {
    const photo = cameraService.capture(video);
    imageCaptured = true;

    showCapturedPhoto(photo);
    stopCameraStream();

    let consensus: ParsedBloodPressure | null;

    if (groqVisionService.isConfigured) {
      showMessage("Enviando imagen a Groq para reconocerla...", "processing");
      consensus = await groqVisionService.recognize(photo);
      const readingText =
        `SYS ${consensus.sistolica} / DIA ${consensus.diastolica} / PULSE ${consensus.pulso}`;
      updateOcrDebug(1, readingText);
      console.log("SCAN: Groq reading", consensus);
    } else {
      const readings: ParsedBloodPressure[] = [];

      for (let index = 0; index < 3; index += 1) {
        showMessage(
          `Leyendo la pantalla localmente... ${index + 1}/3`,
          "processing",
        );

        const result = await ocrService.recognize(photo);
        const parsed = parseBloodPressureText(result.text);

        updateOcrDebug(index + 1, result.text);

        console.log("SCAN: OCR reading", index + 1, result.text);
        console.log("SCAN: parsed reading", index + 1, parsed);

        readings.push(parsed);
      }

      consensus = findConsensus(readings);
    }

    console.log("SCAN: OCR consensus", consensus);

    if (!scanActive) {
      return;
    }

    if (!consensus) {
      console.warn("SCAN: no OCR consensus after three readings");
      waitingForRetry = true;
      setRetryButtonEnabled(true);
      resetScanResult();
      showMessage(
        "No se pudo confirmar la lectura. Pulsa Intentar de nuevo.",
      );
      return;
    }

    showParsedScanResult(consensus);
    showMessage("Revisa los valores y confirma el registro.");
    showScanSuccessModal(consensus);
  } catch (error) {
    if (!scanActive) {
      return;
    }

    console.error("SCAN: OCR error", error);

    if (!imageCaptured) {
      showMessage(
        error instanceof Error
          ? error.message
          : "No se pudo capturar la imagen.",
      );
      return;
    }

    waitingForRetry = true;
    setRetryButtonEnabled(true);
    resetScanResult();
    showMessage(
      error instanceof Error
        ? error.message
        : "No se pudo leer la medición.",
    );
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
  setRetryButtonEnabled(true);
  updateConfirmButtonState();
}

function setRetryButtonEnabled(enabled: boolean): void {
  const retryButton = document.getElementById(
    "retryScanButton",
  ) as HTMLButtonElement | null;

  if (retryButton) {
    retryButton.disabled = !enabled;
  }
}

function showScanSuccessModal(reading: ParsedBloodPressure): void {
  const systolic = document.getElementById("scanSuccessSystolic");
  const diastolic = document.getElementById("scanSuccessDiastolic");
  const pulse = document.getElementById("scanSuccessPulse");

  if (!systolic || !diastolic || !pulse) {
    console.error("SCAN: success modal values not found");
    return;
  }

  systolic.textContent = String(reading.sistolica);
  diastolic.textContent = String(reading.diastolica);
  pulse.textContent = String(reading.pulso);
  showAppModal("scanSuccessModal");
  scanSuccessModalTimeout = window.setTimeout(
    closeScanSuccessModal,
    3000,
  );
}

function closeScanSuccessModal(): void {
  if (scanSuccessModalTimeout !== undefined) {
    window.clearTimeout(scanSuccessModalTimeout);
    scanSuccessModalTimeout = undefined;
  }

  hideAppModal("scanSuccessModal");
}

function updateOcrDebug(
  readingNumber: number,
  text: string,
): void {
  const element = document.getElementById("scanOcrDebug");

  if (!element) {
    return;
  }

  const currentText =
    element.textContent === "Esperando lectura..."
      ? ""
      : `${element.textContent}\n`;

  element.textContent =
    `${currentText}Lectura ${readingNumber}/3:\n${text || "(sin texto)"}`;
}

function showCapturedPhoto(
  source: HTMLCanvasElement,
): void {
  const canvas = document.getElementById(
    "scanCapturedCanvas",
  ) as HTMLCanvasElement | null;

  const video = document.getElementById(
    "cameraVideo",
  ) as HTMLVideoElement | null;
  const frame = document.querySelector<HTMLElement>(".camera-frame");

  if (!canvas || !video || !frame) {
    console.error("SCAN: captured image preview elements not found");
    return;
  }

  canvas.width = source.width;
  canvas.height = source.height;

  const context = canvas.getContext("2d");

  if (!context) {
    console.error("SCAN: captured image canvas context not available");
    return;
  }

  context.drawImage(source, 0, 0);
  video.hidden = true;
  frame.hidden = true;
  canvas.hidden = false;
}

function showLiveCameraPreview(): void {
  const video = document.getElementById(
    "cameraVideo",
  ) as HTMLVideoElement | null;
  const frame = document.querySelector<HTMLElement>(".camera-frame");
  const canvas = document.getElementById(
    "scanCapturedCanvas",
  ) as HTMLCanvasElement | null;

  if (!video || !frame || !canvas) {
    console.error("SCAN: camera preview elements not found");
    return;
  }

  video.hidden = false;
  frame.hidden = false;
  canvas.hidden = true;
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

  requestSaveConfirmation(
    () => saveScanRecord(record, confirmButton),
    resetScanResult,
  );
}

async function saveScanRecord(
  record: BloodPressureRecord,
  confirmButton: HTMLButtonElement,
): Promise<void> {
  confirmButton.disabled = true;

  try {
    await saveBloodPressureRecord(record);
    resetScanResult();
  } catch (error) {
    console.error("SCAN: save error", error);
    throw error;
  } finally {
    updateConfirmButtonState();
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

  const debugElement = document.getElementById(
    "scanOcrDebug",
  );

  if (debugElement) {
    debugElement.textContent = "Esperando lectura...";
  }

  updateConfirmButtonState();
}

function stopCameraStream(): void {
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

  document.querySelector(".camera-frame")?.classList.remove("focused");
}

function stopCamera(): void {
  stopCameraStream();
  showLiveCameraPreview();
  resetScanResult();
  setRetryButtonEnabled(false);
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
