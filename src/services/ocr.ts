import { createWorker } from 'tesseract.js';

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
        canvas
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

export const ocrService =
  new OcrServiceImpl();