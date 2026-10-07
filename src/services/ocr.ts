import { createWorker, PSM } from "tesseract.js";

export interface OcrResult {
  text: string;
}

class OcrServiceImpl {
  private worker:
    Awaited<ReturnType<typeof createWorker>> | null = null;

  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.worker = await createWorker("eng");

    await this.worker.setParameters({
      tessedit_char_whitelist: "0123456789/",
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });

    this.initialized = true;
  }

  async recognize(
    canvas: HTMLCanvasElement,
  ): Promise<OcrResult> {
    await this.initialize();

    if (!this.worker) {
      throw new Error(
        "El servicio OCR no está disponible.",
      );
    }

    const processedCanvas =
      preprocessCanvas(canvas);

    const result =
      await this.worker.recognize(
        processedCanvas,
      );

    const text =
      result.data.text.trim();

    console.log("OCR: raw text", text);

    return {
      text,
    };
  }

  async terminate(): Promise<void> {
    if (!this.worker) {
      return;
    }

    await this.worker.terminate();

    this.worker = null;
    this.initialized = false;
  }
}

function preprocessCanvas(
  source: HTMLCanvasElement,
): HTMLCanvasElement {
  const displayX = Math.round(
    source.width * 0.18,
  );

  const displayY = Math.round(
    source.height * 0.12,
  );

  const displayWidth = Math.round(
    source.width * 0.64,
  );

  const displayHeight = Math.round(
    source.height * 0.68,
  );

  const displayScale = 2;

  const canvas =
    document.createElement("canvas");

  canvas.width =
    displayWidth * displayScale;

  canvas.height =
    displayHeight * displayScale;

  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!context) {
    return source;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.drawImage(
    source,
    displayX,
    displayY,
    displayWidth,
    displayHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const imageData =
    context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );

  for (
    let index = 0;
    index < imageData.data.length;
    index += 4
  ) {
    const luminance =
      imageData.data[index] * 0.299 +
      imageData.data[index + 1] * 0.587 +
      imageData.data[index + 2] * 0.114;

    const value =
      luminance < 160 ? 0 : 255;

    imageData.data[index] = value;
    imageData.data[index + 1] = value;
    imageData.data[index + 2] = value;
    imageData.data[index + 3] = 255;
  }

  context.putImageData(
    imageData,
    0,
    0,
  );

  return canvas;
}

export const ocrService =
  new OcrServiceImpl();