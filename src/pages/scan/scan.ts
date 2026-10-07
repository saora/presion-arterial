import { cameraService } from "../../services/camera";
import { ocrService } from "../../services/ocr";
import scanTemplate from "./scan.html?raw";

export function renderScanPage(): string {
  return scanTemplate;
}

export function initializeScanPage(): void {
  const startButton = document.getElementById(
    "startCameraButton",
  ) as HTMLButtonElement | null;

  const captureButton = document.getElementById(
    "captureButton",
  ) as HTMLButtonElement | null;

  const stopButton = document.getElementById(
    "stopCameraButton",
  ) as HTMLButtonElement | null;

  const video = document.getElementById(
    "cameraVideo",
  ) as HTMLVideoElement | null;

  if (!startButton || !captureButton || !stopButton || !video) {
    console.error("SCAN: camera elements not found");

    return;
  }

  startButton.addEventListener("click", () => {
    startCamera(video, startButton, captureButton, stopButton);
  });

  captureButton.addEventListener("click", () => {
    captureImage(video);
  });

  stopButton.addEventListener("click", () => {
    stopCamera(startButton, captureButton, stopButton);
  });

  console.log("SCAN: initialized");
}

async function startCamera(
  video: HTMLVideoElement,
  startButton: HTMLButtonElement,
  captureButton: HTMLButtonElement,
  stopButton: HTMLButtonElement,
): Promise<void> {
  try {
    showMessage("Solicitando acceso a la cámara...");

    const stream = await cameraService.start();

    video.srcObject = stream;

    await video.play();

    startButton.hidden = true;

    captureButton.hidden = false;

    stopButton.hidden = false;

    showMessage("Coloca la pantalla del baumanómetro dentro del marco.");
  } catch (error) {
    console.error("SCAN: camera error", error);

    showMessage("No se pudo acceder a la cámara.");
  }
}

async function captureImage(video: HTMLVideoElement): Promise<void> {
  try {
    showMessage("Procesando imagen...");

    const canvas = cameraService.capture(video);

    const preview = document.getElementById("capturePreview");

    const previewCanvas = document.getElementById(
      "captureCanvas",
    ) as HTMLCanvasElement | null;

    if (!preview || !previewCanvas) {
      return;
    }

    const context = previewCanvas.getContext("2d");

    if (!context) {
      return;
    }

    previewCanvas.width = canvas.width;

    previewCanvas.height = canvas.height;

    context.drawImage(canvas, 0, 0);

    preview.hidden = false;

    showMessage("Leyendo la pantalla...");

    const result = await ocrService.recognize(canvas);

    showOcrResult(result.text);

    showMessage("Lectura completada.");
  } catch (error) {
    console.error("SCAN: OCR error", error);

    showMessage("No se pudo leer la medición.");
  }
}

function showOcrResult(text: string): void {
  const container = document.getElementById("ocrResult");

  const textElement = document.getElementById("ocrText");

  if (!container || !textElement) {
    return;
  }

  textElement.textContent = text || "No se detectó texto.";

  container.hidden = false;
}

function stopCamera(
  startButton: HTMLButtonElement,
  captureButton: HTMLButtonElement,
  stopButton: HTMLButtonElement,
): void {
  cameraService.stop();

  const video = document.getElementById(
    "cameraVideo",
  ) as HTMLVideoElement | null;

  if (video) {
    video.srcObject = null;
  }

  startButton.hidden = false;

  captureButton.hidden = true;

  stopButton.hidden = true;

  showMessage("Cámara detenida.");
}

function showMessage(message: string): void {
  const element = document.getElementById("scanMessage");

  if (!element) {
    return;
  }

  element.textContent = message;
}
