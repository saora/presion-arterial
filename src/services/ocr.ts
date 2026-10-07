import { createWorker, PSM } from 'tesseract.js';

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

    this.worker =
      await createWorker('eng');

    await this.worker.setParameters({
      tessedit_char_whitelist: '0123456789/',
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK
    });

    this.initialized =
      true;
  }

  async recognize(
    canvas: HTMLCanvasElement
  ): Promise<OcrResult> {

    await this.initialize();

    if (!this.worker) {
      throw new Error(
        'El servicio OCR no está disponible.'
      );
    }

    const result =
      await this.worker.recognize(
        preprocessCanvas(canvas)
      );

    return {
      text:
        result.data.text.trim()
    };
  }

  async terminate(): Promise<void> {

    if (!this.worker) {
      return;
    }

    await this.worker.terminate();

    this.worker =
      null;

    this.initialized =
      false;
  }
}

function preprocessCanvas(
  source: HTMLCanvasElement
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');

  canvas.width = source.width;
  canvas.height = source.height;

  const context = canvas.getContext('2d', {
    willReadFrequently: true
  });
  const sourceContext = source.getContext('2d', {
    willReadFrequently: true
  });

  if (!context || !sourceContext) {
    return source;
  }

  const imageData = sourceContext.getImageData(
    0,
    0,
    source.width,
    source.height
  );

  for (let index = 0; index < imageData.data.length; index += 4) {
    const luminance =
      imageData.data[index] * 0.299 +
      imageData.data[index + 1] * 0.587 +
      imageData.data[index + 2] * 0.114;

    const value = luminance < 160 ? 0 : 255;

    imageData.data[index] = value;
    imageData.data[index + 1] = value;
    imageData.data[index + 2] = value;
    imageData.data[index + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);

  return canvas;
}

export const ocrService =
  new OcrServiceImpl();